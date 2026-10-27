import { Article, ResearchCitation } from '../types/content';
import { CITATIONS } from '../data/catalog';

export const STICKY_HEADER_SCROLL_OFFSET_PX = 104;

export interface CitationOccurrence {
  citationId: string;
  citationNumber: number;
  occurrenceIndex: number; // 1-based index among occurrences of this citationId
  occurrenceSuffix: string; // 'a', 'b', 'c', ...
  markerId: string; // e.g. 'cite-ref-cit_flynn_adams_2009-1'
  targetRefId: string; // e.g. 'ref-cit_flynn_adams_2009'
  tokenKey: string; // e.g. 'sec:the-price-illusion:p:0:t:0'
  sectionId: string;
  expandableAdviceId?: string;
}

export interface ArticleCitationMap {
  /** 1-based bibliography number for each valid citation ID in article.citationIds */
  citationIndexMap: Record<string, number>;
  /** All valid inline occurrences in reading order */
  occurrences: CitationOccurrence[];
  /** Occurrences grouped by citationId */
  occurrencesByCitationId: Record<string, CitationOccurrence[]>;
  /** Lookup by deterministic tokenKey */
  occurrenceByTokenKey: Record<string, CitationOccurrence>;
  /** Lookup by markerId */
  occurrenceByMarkerId: Record<string, CitationOccurrence>;
}

const INLINE_TOKEN_REGEX = /\[cite:([a-zA-Z0-9_]+)\]/g;

function indexToLetterSuffix(indexOneBased: number): string {
  // 1 -> 'a', 2 -> 'b', etc.
  const code = ((indexOneBased - 1) % 26) + 97;
  return String.fromCharCode(code);
}

/**
 * Scans an Article in exact reading order and builds deterministic IDs
 * for every inline citation marker and its corresponding bibliography entry.
 */
export function buildArticleCitationMap(
  article: Article,
  citationsRegistry: Record<string, ResearchCitation> = CITATIONS
): ArticleCitationMap {
  const citationIndexMap: Record<string, number> = {};
  const occurrences: CitationOccurrence[] = [];
  const occurrencesByCitationId: Record<string, CitationOccurrence[]> = {};
  const occurrenceByTokenKey: Record<string, CitationOccurrence> = {};
  const occurrenceByMarkerId: Record<string, CitationOccurrence> = {};

  // Only index citations that actually exist in the registry
  let validBibNumber = 1;
  for (const citId of article.citationIds) {
    if (citationsRegistry[citId] && !citationIndexMap[citId]) {
      citationIndexMap[citId] = validBibNumber++;
      occurrencesByCitationId[citId] = [];
    }
  }

  const recordTokensInText = (
    text: string,
    blockKey: string,
    sectionId: string,
    expandableAdviceId?: string
  ) => {
    let tokenIdx = 0;
    let match: RegExpExecArray | null;
    const regex = new RegExp(INLINE_TOKEN_REGEX.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      const citId = match[1];
      const currentTokenIdx = tokenIdx++;
      const tokenKey = `${blockKey}:t:${currentTokenIdx}`;

      // Gracefully ignore missing/unlisted citations
      const citationNumber = citationIndexMap[citId];
      if (!citationNumber || !citationsRegistry[citId]) {
        continue;
      }

      const listForCit = occurrencesByCitationId[citId] ?? [];
      const occurrenceIndex = listForCit.length + 1;
      const occurrenceSuffix = indexToLetterSuffix(occurrenceIndex);
      const markerId = `cite-ref-${citId}-${occurrenceIndex}`;
      const targetRefId = `ref-${citId}`;

      const occurrence: CitationOccurrence = {
        citationId: citId,
        citationNumber,
        occurrenceIndex,
        occurrenceSuffix,
        markerId,
        targetRefId,
        tokenKey,
        sectionId,
        expandableAdviceId,
      };

      listForCit.push(occurrence);
      occurrencesByCitationId[citId] = listForCit;
      occurrences.push(occurrence);
      occurrenceByTokenKey[tokenKey] = occurrence;
      occurrenceByMarkerId[markerId] = occurrence;
    }
  };

  for (const section of article.sections) {
    section.paragraphs.forEach((p, pIdx) => {
      recordTokensInText(p, `sec:${section.id}:p:${pIdx}`, section.id);
    });

    for (const sub of section.subSections ?? []) {
      sub.paragraphs.forEach((sp, spIdx) => {
        recordTokensInText(
          sp,
          `sec:${section.id}:sub:${sub.id}:p:${spIdx}`,
          section.id
        );
      });
      if (sub.bulletList) {
        sub.bulletList.items.forEach((li, liIdx) => {
          recordTokensInText(
            li,
            `sec:${section.id}:sub:${sub.id}:li:${liIdx}`,
            section.id
          );
        });
      }
    }

    if (section.expandableAdvice) {
      const adviceId = section.expandableAdvice.id;
      section.expandableAdvice.items.forEach((item, itemIdx) => {
        recordTokensInText(
          item.detail,
          `sec:${section.id}:advice:${adviceId}:item:${itemIdx}`,
          section.id,
          adviceId
        );
      });
    }
  }

  return {
    citationIndexMap,
    occurrences,
    occurrencesByCitationId,
    occurrenceByTokenKey,
    occurrenceByMarkerId,
  };
}

/**
 * Validates and resolves the target bibliography reference DOM ID for a citation.
 * Returns null if the citation is missing from the registry or not listed in the article.
 */
export function resolveReferenceTargetId(
  citationId: string,
  citationMap: ArticleCitationMap,
  citationsRegistry: Record<string, ResearchCitation> = CITATIONS
): string | null {
  if (!citationId || !citationsRegistry[citationId]) {
    return null;
  }
  if (!citationMap.citationIndexMap[citationId]) {
    return null;
  }
  return `ref-${citationId}`;
}

/**
 * Resolves which inline citation marker ID a bibliography entry should return to.
 * Prefers the most recently clicked occurrence of that citation if valid; otherwise
 * falls back to the first occurrence in the article.
 */
export function resolveReturnMarkerTarget(
  citationId: string,
  citationMap: ArticleCitationMap,
  lastClickedMarkerByCitationId: Record<string, string> = {}
): CitationOccurrence | null {
  const occurrences = citationMap.occurrencesByCitationId[citationId];
  if (!occurrences || occurrences.length === 0) {
    return null;
  }

  const preferredMarkerId = lastClickedMarkerByCitationId[citationId];
  if (preferredMarkerId) {
    const found = occurrences.find((o) => o.markerId === preferredMarkerId);
    if (found) {
      return found;
    }
  }

  return occurrences[0];
}

/**
 * Scrolls to a target element while accounting for the sticky header height
 * so the target heading/element is never obscured.
 */
export function scrollElementIntoViewWithOffset(
  element: HTMLElement | null,
  offsetPx: number = STICKY_HEADER_SCROLL_OFFSET_PX
): boolean {
  if (!element || typeof window === 'undefined') {
    return false;
  }

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

  const rect = element.getBoundingClientRect();
  const absoluteTop = window.scrollY + rect.top;
  const targetTop = Math.max(0, absoluteTop - offsetPx);

  window.scrollTo({
    top: targetTop,
    behavior,
  });

  return true;
}

export interface RectLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface PopoverSizeLike {
  width: number;
  height: number;
}

export interface PopoverViewportMetrics {
  viewportWidth: number;
  viewportHeight: number;
  stickyHeaderBottom?: number;
  horizontalMargin?: number;
  verticalMargin?: number;
  markerGap?: number;
}

export interface CitationPopoverPositionResult {
  /** True if the citation marker has scrolled out of the visible viewport area */
  shouldClose: boolean;
  /** Vertical placement relative to the citation marker */
  placement: 'above' | 'below';
  /** Fixed top position in viewport pixels */
  top: number;
  /** Fixed left position in viewport pixels */
  left: number;
  /** Clamped popover width in pixels */
  width: number;
  /** Maximum height in pixels to stay within viewport boundaries */
  maxHeight: number;
  /** True when neither above nor below had full room and height is constrained */
  isHeightConstrained: boolean;
}

export const POPOVER_HORIZONTAL_MARGIN_PX = 16;
export const POPOVER_VERTICAL_MARGIN_PX = 16;
export const POPOVER_MARKER_GAP_PX = 10;
export const POPOVER_MIN_HEIGHT_PX = 120;

/**
 * Computes viewport-aware fixed coordinates for a research citation popover:
 * 1. Prefers opening above the marker when sufficient space exists above (accounting for sticky header).
 * 2. Automatically flips below the marker when space above is insufficient and space below fits.
 * 3. When neither side has full room, picks the side with more space and constrains maxHeight (scrollable).
 * 4. Clamps horizontal position within [horizontalMargin, viewportWidth - horizontalMargin - width].
 * 5. Signals shouldClose = true if the citation marker has scrolled out of the visible viewport.
 */
export function calculateCitationPopoverPosition(
  markerRect: RectLike,
  popoverSize: PopoverSizeLike,
  metrics: PopoverViewportMetrics
): CitationPopoverPositionResult {
  const horizontalMargin =
    metrics.horizontalMargin ?? POPOVER_HORIZONTAL_MARGIN_PX;
  const verticalMargin = metrics.verticalMargin ?? POPOVER_VERTICAL_MARGIN_PX;
  const markerGap = metrics.markerGap ?? POPOVER_MARKER_GAP_PX;
  const stickyHeaderBottom = Math.max(0, metrics.stickyHeaderBottom ?? 64);

  const topSafeBoundary = Math.max(verticalMargin, stickyHeaderBottom + 8);
  const bottomSafeBoundary = Math.max(
    topSafeBoundary + POPOVER_MIN_HEIGHT_PX,
    metrics.viewportHeight - verticalMargin
  );

  // If the citation marker itself has scrolled out of the visible viewport area, close the popover
  if (
    markerRect.bottom <= stickyHeaderBottom ||
    markerRect.top >= metrics.viewportHeight ||
    markerRect.right <= 0 ||
    markerRect.left >= metrics.viewportWidth
  ) {
    return {
      shouldClose: true,
      placement: 'above',
      top: 0,
      left: horizontalMargin,
      width: 0,
      maxHeight: 0,
      isHeightConstrained: false,
    };
  }

  // Horizontal width and clamping within [horizontalMargin, viewportWidth - horizontalMargin]
  const maxAllowedWidth = Math.max(
    220,
    metrics.viewportWidth - horizontalMargin * 2
  );
  const width = Math.round(Math.min(popoverSize.width, maxAllowedWidth));

  const markerCenterX = markerRect.left + markerRect.width / 2;
  const idealLeft = markerCenterX - width / 2;
  const minLeft = horizontalMargin;
  const maxLeft = Math.max(
    horizontalMargin,
    metrics.viewportWidth - horizontalMargin - width
  );
  const left = Math.round(Math.min(Math.max(idealLeft, minLeft), maxLeft));

  // Vertical space calculation
  const naturalHeight = Math.max(80, popoverSize.height);
  const spaceAbove = markerRect.top - markerGap - topSafeBoundary;
  const spaceBelow = bottomSafeBoundary - (markerRect.bottom + markerGap);

  // 1. Prefer above when sufficient space is available
  if (spaceAbove >= naturalHeight) {
    return {
      shouldClose: false,
      placement: 'above',
      top: Math.round(markerRect.top - markerGap - naturalHeight),
      left,
      width,
      maxHeight: Math.floor(spaceAbove),
      isHeightConstrained: false,
    };
  }

  // 2. Otherwise flip below when sufficient space is available below
  if (spaceBelow >= naturalHeight) {
    return {
      shouldClose: false,
      placement: 'below',
      top: Math.round(markerRect.bottom + markerGap),
      left,
      width,
      maxHeight: Math.floor(spaceBelow),
      isHeightConstrained: false,
    };
  }

  // 3. Neither side has enough room for the full height: pick the side with more space and constrain height
  const placement: 'above' | 'below' =
    spaceAbove >= spaceBelow ? 'above' : 'below';
  const chosenSpace = placement === 'above' ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(POPOVER_MIN_HEIGHT_PX, Math.floor(chosenSpace));
  const renderedHeight = Math.min(naturalHeight, maxHeight);

  const top =
    placement === 'above'
      ? Math.round(Math.max(topSafeBoundary, markerRect.top - markerGap - renderedHeight))
      : Math.round(
          Math.min(
            bottomSafeBoundary - renderedHeight,
            markerRect.bottom + markerGap
          )
        );

  return {
    shouldClose: false,
    placement,
    top,
    left,
    width,
    maxHeight,
    isHeightConstrained: true,
  };
}

