import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowDownRight,
  ArrowUpLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ExternalLink,
  Heart,
  Sparkles,
  Check,
  Share2,
  X,
} from 'lucide-react';
import {
  Article,
  ArticleCallout,
  ArticleContextualProducts,
  ArticleExpandableAdvice,
  GiftGuide,
  Product,
  ResearchCitation,
} from '../types/content';
import { ARTICLES, AUTHORS, CITATIONS, GIFT_GUIDES, PRODUCTS } from '../data/catalog';
import {
  CatalogDataOverride,
  calculateArticleReadingTime,
  calculateArticleWordCount,
} from '../utils/seoAndValidation';
import {
  ArticleCitationMap,
  CitationOccurrence,
  STICKY_HEADER_SCROLL_OFFSET_PX,
  buildArticleCitationMap,
  calculateCitationPopoverPosition,
  resolveReferenceTargetId,
  resolveReturnMarkerTarget,
  scrollElementIntoViewWithOffset,
} from '../utils/citationNavigation';
import { PhotoImage } from './ObjectIllustrations';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface ArticleReaderViewProps {
  article: Article;
  savedProductIds: string[];
  onToggleSave: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onSelectGuide: (slug: string) => void;
  onSelectArticle: (slug: string) => void;
  onBackHome: () => void;
  catalog?: CatalogDataOverride;
}

interface InlineCitationProps {
  citationId: string;
  citationNumber: number;
  citation: ResearchCitation;
  markerId: string;
  targetRefId: string;
  isReturnHighlighted?: boolean;
  onJumpToReference: (citationId: string, markerId: string) => void;
}

export const InlineCitationMarker: React.FC<InlineCitationProps> = ({
  citationId,
  citationNumber,
  citation,
  markerId,
  targetRefId,
  isReturnHighlighted = false,
  onJumpToReference,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'above' | 'below'>('above');
  const [isHeightConstrained, setIsHeightConstrained] = useState(false);

  const containerRef = useRef<HTMLSpanElement>(null);
  const markerRef = useRef<HTMLAnchorElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const lastPointerTypeRef = useRef<string>('');
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = () => {
    clearCloseTimer();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimer();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const handleFocus = () => {
    clearCloseTimer();
    setIsOpen(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (
      containerRef.current &&
      e.relatedTarget &&
      containerRef.current.contains(e.relatedTarget as Node)
    ) {
      return;
    }
    setIsOpen(false);
  };

  const updatePopoverPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const markerEl = markerRef.current;
    const popoverEl = popoverRef.current;
    if (!markerEl || !popoverEl) return;

    const markerRect = markerEl.getBoundingClientRect();
    const desiredWidth = window.innerWidth >= 768 ? 384 : 320;
    const maxAllowedWidth = Math.max(220, window.innerWidth - 32);
    const targetWidth = Math.round(Math.min(desiredWidth, maxAllowedWidth));

    // Apply target width and unconstrained height before measuring natural scrollHeight
    popoverEl.style.width = `${targetWidth}px`;
    popoverEl.style.maxHeight = 'none';

    const naturalHeight = Math.max(
      popoverEl.scrollHeight,
      popoverEl.getBoundingClientRect().height,
      140
    );

    const headerEl = document.querySelector('header');
    const stickyHeaderBottom = headerEl
      ? Math.max(0, Math.min(120, headerEl.getBoundingClientRect().bottom))
      : 64;

    const pos = calculateCitationPopoverPosition(
      markerRect,
      { width: targetWidth, height: naturalHeight },
      {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        stickyHeaderBottom,
      }
    );

    if (pos.shouldClose) {
      setIsOpen(false);
      return;
    }

    popoverEl.style.top = `${pos.top}px`;
    popoverEl.style.left = `${pos.left}px`;
    popoverEl.style.width = `${pos.width}px`;
    popoverEl.style.maxHeight = `${pos.maxHeight}px`;

    setPlacement(pos.placement);
    setIsHeightConstrained(pos.isHeightConstrained);
  }, []);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;

    updatePopoverPosition();

    const handleViewportChange = () => {
      updatePopoverPosition();
    };

    window.addEventListener('scroll', handleViewportChange, {
      passive: true,
      capture: true,
    });
    window.addEventListener('resize', handleViewportChange, { passive: true });
    const visualVp = window.visualViewport;
    visualVp?.addEventListener('resize', handleViewportChange);
    visualVp?.addEventListener('scroll', handleViewportChange);

    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
      visualVp?.removeEventListener('resize', handleViewportChange);
      visualVp?.removeEventListener('scroll', handleViewportChange);
    };
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        markerRef.current?.focus({ preventScroll: true });
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const popoverId = `cite-popover-${markerId}`;

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`relative inline-block align-baseline mx-0.5 ${
        isReturnHighlighted ? 'ring-2 ring-[#1B3D5F] rounded-md' : ''
      }`}
    >
      <a
        ref={markerRef}
        id={markerId}
        href={`#${targetRefId}`}
        onPointerDown={(e) => {
          lastPointerTypeRef.current = e.pointerType;
        }}
        onClick={(e) => {
          e.preventDefault();
          clearCloseTimer();
          // On touch devices without hover, first tap opens the summary popover;
          // tapping again or clicking on desktop/keyboard navigates to the bibliography.
          if (lastPointerTypeRef.current === 'touch' && !isOpen) {
            setIsOpen(true);
            return;
          }
          setIsOpen(false);
          onJumpToReference(citationId, markerId);
        }}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? popoverId : undefined}
        aria-label={`Citation ${citationNumber}: ${citation.authors} (${citation.year}) — ${citation.title}. Jump to reference in bibliography.`}
        className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-mono font-semibold text-[#1B3D5F] bg-[#EBF3FE] hover:bg-[#99BFF9]/50 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-[#1B3D5F] no-underline scroll-mt-28"
      >
        [{citationNumber}]
      </a>

      {isOpen && (
        <span
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          data-placement={placement}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label={`Research citation ${citationNumber} summary`}
          className={`fixed z-50 p-4 rounded-2xl bg-[#1B3D5F] text-[#FAF7F2] shadow-xl text-left font-sans text-xs leading-relaxed block transition-none motion-reduce:transition-none ${
            isHeightConstrained
              ? 'overflow-y-auto overscroll-contain'
              : 'overflow-y-visible'
          }`}
        >
          <span className="flex items-start justify-between gap-2 mb-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#C3F3DF]">
              Reference [{citationNumber}] · {citation.year}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                markerRef.current?.focus({ preventScroll: true });
              }}
              aria-label="Close citation popover"
              className="p-1 rounded-full text-[#99BFF9] hover:text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>

          <span className="block font-serif font-semibold text-sm text-white leading-snug mb-1">
            {citation.title}
          </span>

          <span className="block text-[11px] text-[#99BFF9] mb-2.5">
            {citation.authors} ({citation.year}) · <em>{citation.publication}</em>
          </span>

          <span className="block p-2.5 rounded-xl bg-white/10 text-[#FAF7F2]/95 mb-2">
            <strong className="text-[#C3F3DF] font-semibold">Finding: </strong>
            {citation.keyFinding}
          </span>

          {citation.limitations && (
            <span className="block text-[11px] text-[#99BFF9]/95 mb-3">
              <strong className="text-white font-semibold">Scope & Limitations: </strong>
              {citation.limitations}
            </span>
          )}

          <span className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/15">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onJumpToReference(citationId, markerId);
              }}
              className="inline-flex items-center gap-1 font-semibold text-[#C3F3DF] hover:underline focus-visible:outline-2 focus-visible:outline-white"
            >
              <span>Full reference below</span>
              <ArrowDownRight className="w-3.5 h-3.5" />
            </button>

            <a
              href={citation.doiOrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-white hover:text-[#C3F3DF] underline focus-visible:outline-2 focus-visible:outline-white"
            >
              <span>Original study (DOI)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </span>
        </span>
      )}
    </span>
  );
};

interface RichTextWithCitationsProps {
  text: string;
  blockKey?: string;
  citationIndexMap: Record<string, number>;
  occurrenceByTokenKey?: Record<string, CitationOccurrence>;
  highlightedMarkerId?: string | null;
  onJumpToReference: (citationId: string, markerId: string) => void;
  citationsMap?: Record<string, ResearchCitation>;
}

export const RichTextWithCitations: React.FC<RichTextWithCitationsProps> = ({
  text,
  blockKey,
  citationIndexMap,
  occurrenceByTokenKey,
  highlightedMarkerId,
  onJumpToReference,
  citationsMap = CITATIONS,
}) => {
  const parts = text.split(/(\[cite:[a-zA-Z0-9_]+\])/g);
  let tokenCounter = 0;

  return (
    <>
      {parts.map((part, idx) => {
        const match = part.match(/^\[cite:([a-zA-Z0-9_]+)\]$/);
        if (match) {
          const citId = match[1];
          const currentTokenIdx = tokenCounter++;
          const citation = citationsMap[citId];
          const num = citationIndexMap[citId];
          if (citation && num) {
            const tokenKey = blockKey ? `${blockKey}:t:${currentTokenIdx}` : undefined;
            const occurrence =
              tokenKey && occurrenceByTokenKey
                ? occurrenceByTokenKey[tokenKey]
                : undefined;
            const markerId =
              occurrence?.markerId ?? `cite-ref-${citId}-${currentTokenIdx + 1}`;
            const targetRefId = occurrence?.targetRefId ?? `ref-${citId}`;

            return (
              <InlineCitationMarker
                key={markerId}
                citationId={citId}
                citationNumber={num}
                citation={citation}
                markerId={markerId}
                targetRefId={targetRefId}
                isReturnHighlighted={highlightedMarkerId === markerId}
                onJumpToReference={onJumpToReference}
              />
            );
          }
          // Missing or unlisted reference handled gracefully
          return null;
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
};

export const ArticleCalloutBlock: React.FC<{ callout: ArticleCallout }> = ({
  callout,
}) => {
  const bgClass =
    callout.tone === 'mint'
      ? 'bg-[#E8F8F0]'
      : callout.tone === 'butter'
      ? 'bg-[#FFF4D6]'
      : callout.tone === 'blue'
      ? 'bg-[#EBF3FE]'
      : 'bg-[#F5F4F0] border border-[#1B3D5F]/10';

  return (
    <aside
      aria-label={callout.title}
      className={`my-8 p-6 md:p-7 rounded-3xl ${bgClass} space-y-2`}
    >
      {callout.kicker && (
        <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D]">
          {callout.kicker}
        </div>
      )}
      <h3 className="text-xl font-serif font-semibold text-[#1B3D5F]">
        {callout.title}
      </h3>
      <p className="text-sm md:text-base text-[#1B3D5F]/90 leading-relaxed">
        {callout.body}
      </p>
    </aside>
  );
};

export const ArticleExpandableAdviceBlock: React.FC<{
  sectionId: string;
  advice: ArticleExpandableAdvice;
  isExpanded: boolean;
  onToggle: () => void;
  citationIndexMap: Record<string, number>;
  occurrenceByTokenKey: Record<string, CitationOccurrence>;
  highlightedMarkerId: string | null;
  onJumpToReference: (citationId: string, markerId: string) => void;
  citationsMap?: Record<string, ResearchCitation>;
}> = ({
  sectionId,
  advice,
  isExpanded,
  onToggle,
  citationIndexMap,
  occurrenceByTokenKey,
  highlightedMarkerId,
  onJumpToReference,
  citationsMap = CITATIONS,
}) => {
  const panelId = `expandable-advice-${advice.id}`;

  return (
    <div className="my-8 rounded-3xl bg-[#F5F4F0] border border-[#1B3D5F]/10 p-6 md:p-7 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Practical Reader Guide</span>
          </div>
          <h3 className="text-xl font-serif font-semibold text-[#1B3D5F]">
            {advice.title}
          </h3>
          <p className="text-xs md:text-sm text-[#28537D] leading-relaxed">
            {advice.summaryPreview}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          className="px-4 py-2.5 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#28537D] transition-colors whitespace-nowrap shrink-0 self-start sm:self-center focus-visible:outline-2 focus-visible:outline-[#28537D]"
        >
          <span>{isExpanded ? 'Hide Practical Guide' : 'Explore Examples'}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div
          id={panelId}
          role="region"
          aria-label={advice.title}
          className="mt-6 pt-6 border-t border-[#1B3D5F]/12 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {advice.items.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white border border-[#1B3D5F]/8 space-y-1.5"
            >
              <h4 className="text-sm font-serif font-semibold text-[#1B3D5F]">
                {item.label}
              </h4>
              <p className="text-xs text-[#1B3D5F]/85 leading-relaxed">
                <RichTextWithCitations
                  text={item.detail}
                  blockKey={`sec:${sectionId}:advice:${advice.id}:item:${idx}`}
                  citationIndexMap={citationIndexMap}
                  occurrenceByTokenKey={occurrenceByTokenKey}
                  highlightedMarkerId={highlightedMarkerId}
                  onJumpToReference={onJumpToReference}
                  citationsMap={citationsMap}
                />
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ArticleContextualProductsBlock: React.FC<{
  block: ArticleContextualProducts;
  savedProductIds: string[];
  onToggleSave: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  productsMap?: Record<string, Product>;
}> = ({
  block,
  savedProductIds,
  onToggleSave,
  onSelectProduct,
  productsMap = PRODUCTS,
}) => {
  const products = block.productIds
    .map((id) => productsMap[id])
    .filter((p): p is Product => Boolean(p));

  if (products.length === 0) return null;

  return (
    <aside
      aria-label={block.heading}
      className="my-10 p-6 md:p-8 rounded-3xl bg-[#EBF3FE]/65 space-y-5"
    >
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D]">
          Related Gift Ideas From Our Catalog
        </div>
        <h3 className="text-xl font-serif font-semibold text-[#1B3D5F]">
          {block.heading}
        </h3>
        <p className="text-xs text-[#28537D] leading-relaxed">
          {block.editorialContext}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {products.map((product) => {
          const isSaved = savedProductIds.includes(product.id);
          const primaryImage = product.images?.[0];

          return (
            <div
              key={product.id}
              className="p-4 rounded-2xl bg-[#FAF7F2] flex flex-col justify-between gap-4 shadow-2xs"
            >
              <div className="flex items-start gap-4">
                <div
                  onClick={() => onSelectProduct(product)}
                  className="w-24 h-24 rounded-xl overflow-hidden bg-[#F3ECE1] shrink-0 cursor-pointer group"
                >
                  <PhotoImage
                    src={primaryImage?.url}
                    alt={primaryImage?.alt || product.title}
                    fallbackColor={primaryImage?.fallbackColor}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#28537D] truncate">
                      {product.vendor}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleSave(product.id)}
                      aria-pressed={isSaved}
                      aria-label={
                        isSaved
                          ? `Remove ${product.title} from Saved Gifts`
                          : `Bookmark ${product.title}`
                      }
                      className="p-1.5 rounded-full text-[#1B3D5F] hover:bg-[#1B3D5F]/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#1B3D5F]"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isSaved ? 'fill-[#F2846B] text-[#F2846B]' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <h4 className="text-base font-serif font-semibold text-[#1B3D5F] leading-snug">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="text-left hover:underline focus-visible:outline-2 focus-visible:outline-[#28537D]"
                    >
                      {product.title}
                    </button>
                  </h4>

                  <p className="text-xs text-[#1B3D5F]/80 leading-relaxed line-clamp-2">
                    {product.whyToGiveIt}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1B3D5F]/10 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#1B3D5F] tabular-nums">
                  ${product.price} {product.currency}
                </span>

                <a
                  href={product.purchaseUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectProduct(product);
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline focus-visible:outline-2 focus-visible:outline-[#28537D]"
                >
                  <span>
                    {product.isPlaceholderLink
                      ? 'Sample Link & Details'
                      : 'View Details'}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export const ArticleReaderView: React.FC<ArticleReaderViewProps> = ({
  article,
  savedProductIds,
  onToggleSave,
  onSelectProduct,
  onSelectGuide,
  onSelectArticle,
  onBackHome,
  catalog,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<string>(
    article.sections[0]?.id ?? 'the-short-version'
  );
  const [highlightedCitationId, setHighlightedCitationId] = useState<string | null>(
    null
  );
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(
    null
  );
  const [lastClickedMarkerByCitationId, setLastClickedMarkerByCitationId] =
    useState<Record<string, string>>({});
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Default first practical advice block open so readers immediately see interactive utility
  const [expandedAdvice, setExpandedAdvice] = useState<Record<string, boolean>>({
    'advice-relationship-playbook': true,
    'advice-five-questions': false,
  });

  const productsMap = catalog?.products ?? PRODUCTS;
  const citationsMap = catalog?.citations ?? CITATIONS;
  const authorsMap = catalog?.authors ?? AUTHORS;
  const guidesList = catalog?.guides ?? GIFT_GUIDES;
  const articlesList = catalog?.articles ?? ARTICLES;

  const author = authorsMap[article.authorId];
  const calculatedReadMinutes = calculateArticleReadingTime(article);
  const wordCount = calculateArticleWordCount(article);

  // Build deterministic citation occurrence map across the article
  const citationMap: ArticleCitationMap = React.useMemo(
    () => buildArticleCitationMap(article, citationsMap),
    [article, citationsMap]
  );
  const { citationIndexMap, occurrenceByTokenKey } = citationMap;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveSectionId(article.sections[0]?.id ?? 'the-short-version');
    setHighlightedCitationId(null);
    setHighlightedMarkerId(null);
    setLastClickedMarkerByCitationId({});
  }, [article.id]);

  // Reading progress & active Table of Contents section tracking
  useEffect(() => {
    const trackedIds = [
      'the-short-version',
      ...article.sections.map((s) => s.id),
      ...(article.comparisonTable ? ['empirical-comparison'] : []),
      'academic-citations',
    ];

    const handleScroll = () => {
      const totalScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll <= 0) {
        setScrollProgress(100);
      } else {
        const current = Math.min(
          100,
          Math.max(0, (window.scrollY / totalScroll) * 100)
        );
        setScrollProgress(current);
      }

      const scrollPosition = window.scrollY + 180;
      for (let i = trackedIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(trackedIds[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSectionId(trackedIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article]);

  const jumpToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      scrollElementIntoViewWithOffset(el, STICKY_HEADER_SCROLL_OFFSET_PX);
      setActiveSectionId(sectionId);
    }
  };

  const jumpToReference = (citationId: string, sourceMarkerId?: string): boolean => {
    const targetRefId = resolveReferenceTargetId(citationId, citationMap, citationsMap);
    if (!targetRefId) {
      return false;
    }

    const el = document.getElementById(targetRefId);
    if (!el) {
      return false;
    }

    if (sourceMarkerId) {
      setLastClickedMarkerByCitationId((prev) => ({
        ...prev,
        [citationId]: sourceMarkerId,
      }));
    }

    scrollElementIntoViewWithOffset(el, STICKY_HEADER_SCROLL_OFFSET_PX);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${targetRefId}`);
    }

    setHighlightedCitationId(citationId);
    setTimeout(() => {
      setHighlightedCitationId((prev) => (prev === citationId ? null : prev));
    }, 2800);

    return true;
  };

  const jumpBackToCitation = (
    citationId: string,
    explicitMarkerId?: string
  ): boolean => {
    const targetOccurrence = explicitMarkerId
      ? citationMap.occurrenceByMarkerId[explicitMarkerId] ?? null
      : resolveReturnMarkerTarget(
          citationId,
          citationMap,
          lastClickedMarkerByCitationId
        );

    if (!targetOccurrence) {
      return false;
    }

    const { markerId, expandableAdviceId } = targetOccurrence;

    const performScrollToMarker = () => {
      const markerEl = document.getElementById(markerId);
      if (!markerEl) return false;

      scrollElementIntoViewWithOffset(markerEl, STICKY_HEADER_SCROLL_OFFSET_PX);
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', `#${markerId}`);
      }
      markerEl.focus({ preventScroll: true });
      setHighlightedMarkerId(markerId);
      setTimeout(() => {
        setHighlightedMarkerId((prev) => (prev === markerId ? null : prev));
      }, 2800);
      return true;
    };

    if (expandableAdviceId && !expandedAdvice[expandableAdviceId]) {
      setExpandedAdvice((prev) => ({
        ...prev,
        [expandableAdviceId]: true,
      }));
      setTimeout(() => {
        performScrollToMarker();
      }, 40);
      return true;
    }

    return performScrollToMarker();
  };

  const handleShareCopy = async () => {
    const shareUrl = `${window.location.origin}${article.seo.canonicalPath}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    }
  };

  const relatedGuides = (article.relatedGuideIds ?? [])
    .map((id) => guidesList.find((g) => g.id === id))
    .filter((g): g is GiftGuide => Boolean(g));

  const relatedArticles = (article.relatedArticleIds ?? [])
    .map((id) => articlesList.find((a) => a.id === id))
    .filter((a): a is Article => Boolean(a));

  return (
    <article className="min-h-screen bg-[#FAF8F3] text-[#1B3D5F]">
      {/* Discreet Reading Progress Bar (Respects prefers-reduced-motion) */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 z-40 h-1 bg-[#1B3D5F]/10 pointer-events-none"
      >
        <div
          className="h-full bg-[#28537D] origin-left transition-transform duration-150 motion-reduce:transition-none"
          style={{ transform: `scaleX(${scrollProgress / 100})` }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* ===================================================================
            A. ARTICLE HEADER: Breadcrumb, Category, H1, Dek, Author, Hero
           =================================================================== */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1B3D5F]/10"
        >
          <ol className="flex items-center gap-2 text-xs text-[#28537D]">
            <li>
              <button
                type="button"
                onClick={onBackHome}
                className="inline-flex items-center gap-1.5 font-semibold text-[#1B3D5F] hover:underline focus-visible:outline-2 focus-visible:outline-[#28537D] whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <button
                type="button"
                onClick={onBackHome}
                className="hover:underline focus-visible:outline-2 focus-visible:outline-[#28537D]"
              >
                Stories
              </button>
            </li>
            <li aria-hidden="true">/</li>
            <li
              aria-current="page"
              className="text-[#1B3D5F] font-medium truncate max-w-xs"
            >
              {article.category}
            </li>
          </ol>

          <div className="flex items-center gap-4 text-xs text-[#28537D]">
            <span className="tabular-nums">
              {calculatedReadMinutes} min read ({wordCount.toLocaleString()} words)
            </span>
            <button
              type="button"
              onClick={handleShareCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F4F0] border border-[#1B3D5F]/12 text-[#1B3D5F] font-semibold hover:bg-[#E8F8F0] transition-colors focus-visible:outline-2 focus-visible:outline-[#1B3D5F]"
            >
              {copiedShareLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#1B3D5F]" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Story</span>
                </>
              )}
            </button>
          </div>
        </nav>

        {/* Prominent Editorial Masthead */}
        <header className="max-w-3xl mb-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[#28537D]">
            <span>{article.category}</span>
            <span aria-hidden="true">·</span>
            <span>Published {article.publishedAt}</span>
            {article.updatedAt && article.updatedAt !== article.publishedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>Updated {article.updatedAt}</span>
              </>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-[#1B3D5F] leading-[1.12] text-balance">
            {article.title}
          </h1>

          <p className="text-lg md:text-xl text-[#28537D] leading-relaxed">
            {article.subtitle}
          </p>

          {author && (
            <div className="flex items-center gap-3.5 pt-3">
              <PhotoImage
                src={author.avatarUrl}
                alt={author.name}
                className="w-11 h-11 rounded-full object-cover shrink-0"
              />
              <div className="text-xs text-[#28537D]">
                <div>
                  <span className="font-semibold text-[#1B3D5F]">
                    By {author.name}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>{author.role}</span>
                </div>
                <div className="text-[#28537D]/85 mt-0.5">
                  {calculatedReadMinutes} minute read · {article.citationIds.length} peer-reviewed studies cited
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Hero Photography Figure */}
        <figure className="mb-12">
          <div className="aspect-16/9 w-full max-h-[480px] rounded-3xl overflow-hidden bg-[#F3ECE1]">
            <PhotoImage
              src={article.heroImageUrl}
              alt={article.heroAlt}
              className="w-full h-full object-cover"
            />
          </div>
          <figcaption className="text-xs font-serif italic text-[#28537D] mt-3 px-1">
            {article.heroCaption}
          </figcaption>
        </figure>

        {/* Mobile Compact Table of Contents (Non-sticky, unobtrusive) */}
        <nav
          aria-label="Article sections mobile navigation"
          className="lg:hidden mb-10 p-5 rounded-2xl bg-[#F5F4F0] border border-[#1B3D5F]/10 space-y-2.5"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
            In This Essay
          </div>
          <div className="flex flex-wrap gap-2">
            {article.sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => jumpToSection(sec.id)}
                className="px-3 py-1.5 rounded-full bg-white border border-[#1B3D5F]/10 text-xs font-semibold text-[#1B3D5F] hover:bg-[#1B3D5F] hover:text-white transition-colors"
              >
                {sec.shortNavTitle || sec.heading}
              </button>
            ))}
            <button
              type="button"
              onClick={() => jumpToSection('academic-citations')}
              className="px-3 py-1.5 rounded-full bg-white border border-[#1B3D5F]/10 text-xs font-semibold text-[#1B3D5F] hover:bg-[#1B3D5F] hover:text-white transition-colors"
            >
              References ({article.citationIds.length})
            </button>
          </div>
        </nav>

        {/* ===================================================================
            MAIN 2-COLUMN EDITORIAL LAYOUT (Sticky TOC Rail + Reading Column)
           =================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* C. TABLE OF CONTENTS (Desktop Sticky Rail) */}
          <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-24 space-y-5">
            <nav
              aria-label="Table of contents"
              className="p-6 rounded-3xl bg-[#F5F4F0] border border-[#1B3D5F]/10 space-y-4"
            >
              <div className="text-xs uppercase tracking-widest font-semibold text-[#28537D]">
                In This Story
              </div>

              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToSection('the-short-version')}
                    className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors ${
                      activeSectionId === 'the-short-version'
                        ? 'bg-[#1B3D5F] text-white font-semibold'
                        : 'text-[#1B3D5F] hover:bg-white/60'
                    }`}
                  >
                    {article.summaryTitle || 'The Short Version'}
                  </button>
                </li>

                {article.sections.map((sec) => (
                  <li key={sec.id}>
                    <button
                      type="button"
                      onClick={() => jumpToSection(sec.id)}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg leading-snug transition-colors ${
                        activeSectionId === sec.id
                          ? 'bg-[#1B3D5F] text-white font-semibold'
                          : 'text-[#1B3D5F] hover:bg-white/60'
                      }`}
                    >
                      {sec.heading}
                    </button>
                  </li>
                ))}

                {article.comparisonTable && (
                  <li>
                    <button
                      type="button"
                      onClick={() => jumpToSection('empirical-comparison')}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg leading-snug transition-colors ${
                        activeSectionId === 'empirical-comparison'
                          ? 'bg-[#1B3D5F] text-white font-semibold'
                          : 'text-[#1B3D5F] hover:bg-white/60'
                      }`}
                    >
                      Price vs. Thoughtfulness Table
                    </button>
                  </li>
                )}

                <li className="pt-2 border-t border-[#1B3D5F]/10">
                  <button
                    type="button"
                    onClick={() => jumpToSection('academic-citations')}
                    className={`w-full text-left py-1.5 px-2.5 rounded-lg leading-snug transition-colors ${
                      activeSectionId === 'academic-citations'
                        ? 'bg-[#1B3D5F] text-white font-semibold'
                        : 'text-[#1B3D5F] hover:bg-white/60'
                    }`}
                  >
                    References & Studies ({article.citationIds.length})
                  </button>
                </li>
              </ul>
            </nav>

            <div className="p-5 rounded-3xl bg-[#E5F5EE] border border-[#D9DFE2] text-xs space-y-1.5">
              <div className="font-semibold text-[#1B3D5F]">
                Interactive Citations
              </div>
              <p className="text-[#294B68] leading-relaxed">
                Select any numbered citation marker like <span className="font-mono font-semibold text-[#1B3D5F]">[1]</span> in the essay to inspect the study summary and limitations, or scroll to the full reference list below.
              </p>
            </div>
          </aside>

          {/* D. MAIN ARTICLE BODY (Comfortable 65ch Reading Measure) */}
          <div className="lg:col-span-9 space-y-12">
            {/* B. ARTICLE SUMMARY ("The Short Version") */}
            <section
              id="the-short-version"
              aria-labelledby="heading-short-version"
              className="p-6 md:p-8 rounded-3xl bg-[#E8F8F0] max-w-2xl scroll-mt-24"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[#1B3D5F] mb-3">
                <BookOpen className="w-4 h-4 text-[#28537D]" />
                <h2 id="heading-short-version">
                  {article.summaryTitle || 'The Short Version'}
                </h2>
              </div>
              <ul className="space-y-3 text-sm md:text-base text-[#1B3D5F] leading-relaxed">
                {article.executiveSummary.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="font-serif italic font-semibold text-[#28537D] mt-0.5"
                    >
                      {idx + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Narrative Essay Sections */}
            {article.sections.map((section, sIdx) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`h2-${section.id}`}
                className="space-y-6 scroll-mt-24"
              >
                <div className="max-w-2xl space-y-5">
                  <h2
                    id={`h2-${section.id}`}
                    className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F] leading-snug"
                  >
                    {section.heading}
                  </h2>

                  {section.paragraphs.map((p, pIdx) => (
                    <p
                      key={pIdx}
                      className={`text-base md:text-[1.0625rem] text-[#1B3D5F]/90 leading-[1.8] ${
                        sIdx === 0 && pIdx === 0
                          ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-[#1B3D5F]'
                          : ''
                      }`}
                    >
                      <RichTextWithCitations
                        text={p}
                        blockKey={`sec:${section.id}:p:${pIdx}`}
                        citationIndexMap={citationIndexMap}
                        occurrenceByTokenKey={occurrenceByTokenKey}
                        highlightedMarkerId={highlightedMarkerId}
                        onJumpToReference={jumpToReference}
                        citationsMap={citationsMap}
                      />
                    </p>
                  ))}

                  {/* H3 Subsections */}
                  {section.subSections &&
                    section.subSections.map((sub) => (
                      <div key={sub.id} id={sub.id} className="pt-3 space-y-4">
                        <h3 className="text-xl font-serif font-semibold text-[#1B3D5F]">
                          {sub.subheading}
                        </h3>
                        {sub.paragraphs.map((sp, spIdx) => (
                          <p
                            key={spIdx}
                            className="text-base md:text-[1.0625rem] text-[#1B3D5F]/90 leading-[1.8]"
                          >
                            <RichTextWithCitations
                              text={sp}
                              blockKey={`sec:${section.id}:sub:${sub.id}:p:${spIdx}`}
                              citationIndexMap={citationIndexMap}
                              occurrenceByTokenKey={occurrenceByTokenKey}
                              highlightedMarkerId={highlightedMarkerId}
                              onJumpToReference={jumpToReference}
                              citationsMap={citationsMap}
                            />
                          </p>
                        ))}
                        {sub.bulletList && (
                          <div className="pl-1 space-y-2.5">
                            {sub.bulletList.intro && (
                              <p className="text-sm font-semibold text-[#28537D]">
                                {sub.bulletList.intro}
                              </p>
                            )}
                            <ul className="space-y-2 text-sm md:text-base text-[#1B3D5F]/90 leading-relaxed">
                              {sub.bulletList.items.map((li, liIdx) => (
                                <li
                                  key={liIdx}
                                  className="flex items-start gap-2.5"
                                >
                                  <span
                                    aria-hidden="true"
                                    className="text-[#28537D] font-bold mt-0.5"
                                  >
                                    ·
                                  </span>
                                  <span>
                                    <RichTextWithCitations
                                      text={li}
                                      blockKey={`sec:${section.id}:sub:${sub.id}:li:${liIdx}`}
                                      citationIndexMap={citationIndexMap}
                                      occurrenceByTokenKey={occurrenceByTokenKey}
                                      highlightedMarkerId={highlightedMarkerId}
                                      onJumpToReference={jumpToReference}
                                      citationsMap={citationsMap}
                                    />
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}

                  {/* Pull Quote */}
                  {section.pullQuote && (
                    <blockquote className="my-8 py-6 border-y border-[#1B3D5F]/15">
                      <p className="text-xl md:text-2xl font-serif italic text-[#1B3D5F] leading-snug mb-2">
                        “{section.pullQuote.text}”
                      </p>
                      <footer className="text-xs uppercase tracking-wider font-semibold text-[#28537D]">
                        — {section.pullQuote.attribution}
                      </footer>
                    </blockquote>
                  )}

                  {/* Editorial Callout Block */}
                  {section.callout && (
                    <ArticleCalloutBlock callout={section.callout} />
                  )}
                </div>

                {/* E. EXPANDABLE PRACTICAL ADVICE */}
                {section.expandableAdvice && (
                  <ArticleExpandableAdviceBlock
                    sectionId={section.id}
                    advice={section.expandableAdvice}
                    isExpanded={Boolean(
                      expandedAdvice[section.expandableAdvice.id]
                    )}
                    onToggle={() =>
                      setExpandedAdvice((prev) => ({
                        ...prev,
                        [section.expandableAdvice!.id]:
                          !prev[section.expandableAdvice!.id],
                      }))
                    }
                    citationIndexMap={citationIndexMap}
                    occurrenceByTokenKey={occurrenceByTokenKey}
                    highlightedMarkerId={highlightedMarkerId}
                    onJumpToReference={jumpToReference}
                    citationsMap={citationsMap}
                  />
                )}

                {/* F. CONTEXTUAL PRODUCT RECOMMENDATIONS */}
                {section.contextualProducts && (
                  <ArticleContextualProductsBlock
                    block={section.contextualProducts}
                    savedProductIds={savedProductIds}
                    onToggleSave={onToggleSave}
                    onSelectProduct={onSelectProduct}
                    productsMap={productsMap}
                  />
                )}
              </section>
            ))}

            {/* Comparison Table */}
            {article.comparisonTable && (
              <section
                id="empirical-comparison"
                aria-labelledby="heading-comparison-table"
                className="pt-2 scroll-mt-24"
              >
                <div className="rounded-3xl bg-[#F5F4F0] border border-[#1B3D5F]/10 p-6 md:p-8 space-y-4">
                  <div>
                    <h2
                      id="heading-comparison-table"
                      className="font-serif font-semibold text-xl md:text-2xl text-[#1B3D5F]"
                    >
                      {article.comparisonTable.title}
                    </h2>
                    <p className="text-xs text-[#28537D] mt-1">
                      {article.comparisonTable.caption}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="border-b border-[#1B3D5F]/15 text-[#28537D] text-xs uppercase tracking-wider">
                          {article.comparisonTable.headers.map((h, i) => (
                            <th key={i} className="py-3.5 px-4 font-semibold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1B3D5F]/10">
                        {article.comparisonTable.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td className="py-3.5 px-4 font-semibold text-[#1B3D5F]">
                              {row.dimension}
                            </td>
                            <td className="py-3.5 px-4 text-[#28537D]">
                              {row.noveltyGift}
                            </td>
                            <td className="py-3.5 px-4 text-[#1B3D5F] font-medium">
                              {row.ritualObject}
                            </td>
                            <td className="py-3.5 px-4 text-[#28537D]">
                              {row.empiricalEffect}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* ===============================================================
                G. RESEARCH CITATIONS AND COMPLETE REFERENCE LIST
               =============================================================== */}
            <section
              id="academic-citations"
              aria-labelledby="heading-references"
              className="pt-10 border-t border-[#D9DFE2] space-y-6 scroll-mt-24"
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#405B70]">
                  Bibliography & Research Sources
                </div>
                <h2
                  id="heading-references"
                  className="text-2xl font-serif font-semibold text-[#1B3D5F]"
                >
                  References & Empirical Literature
                </h2>
                <p className="text-xs text-[#294B68] leading-relaxed">
                  All studies cited in this article are real, peer-reviewed publications in social and consumer psychology. Summaries distinguish the original study findings from our editorial examples.
                </p>
              </div>

              <ol className="space-y-4 text-xs text-[#294B68]">
                {article.citationIds.map((citId) => {
                  const cit = citationsMap[citId];
                  const num = citationIndexMap[citId];
                  if (!cit || !num) return null;
                  const isHighlighted = highlightedCitationId === cit.id;
                  const occurrencesForCit =
                    citationMap.occurrencesByCitationId[cit.id] ?? [];
                  const primaryReturnTarget = resolveReturnMarkerTarget(
                    cit.id,
                    citationMap,
                    lastClickedMarkerByCitationId
                  );

                  return (
                    <li
                      key={cit.id}
                      id={`ref-${cit.id}`}
                      className={`p-5 md:p-6 rounded-2xl transition-colors scroll-mt-28 ${
                        isHighlighted
                          ? 'bg-[#E5F5EE] border border-[#1B3D5F] ring-2 ring-[#1B3D5F]'
                          : 'bg-[#FFFFFF] border border-[#D9DFE2]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {primaryReturnTarget ? (
                            <a
                              href={`#${primaryReturnTarget.markerId}`}
                              onClick={(e) => {
                                e.preventDefault();
                                jumpBackToCitation(
                                  cit.id,
                                  primaryReturnTarget.markerId
                                );
                              }}
                              aria-label={`Return to citation [${num}] in article text`}
                              className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-mono font-semibold text-[#1B3D5F] bg-[#E5F5EE] border border-[#405B70] hover:bg-[#1B3D5F] hover:text-[#FFFFFF] hover:border-[#1B3D5F] rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-[#1B3D5F] no-underline"
                            >
                              [{num}]
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-mono font-semibold text-[#1B3D5F] bg-[#E5F5EE] rounded-md">
                              [{num}]
                            </span>
                          )}
                          <span className="font-mono font-semibold text-[#1B3D5F]">
                            {cit.authors} ({cit.year})
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-[#405B70]">
                          {cit.verificationStatus === 'verified-doi'
                            ? 'Verified Peer-Reviewed Source'
                            : 'Sample Citation Fixture'}
                        </span>
                      </div>

                      <h3 className="text-sm font-serif font-semibold text-[#1B3D5F] mb-1">
                        {cit.title}
                      </h3>

                      <div className="italic text-[#405B70] mb-3">
                        {cit.publication}
                      </div>

                      <div className="space-y-2 text-[#294B68] leading-relaxed mb-3">
                        <p>
                          <strong className="font-semibold text-[#1B3D5F]">
                            Study Finding:{' '}
                          </strong>
                          {cit.keyFinding}
                        </p>
                        {cit.limitations && (
                          <p className="text-[#294B68]">
                            <strong className="font-semibold text-[#1B3D5F]">
                              Context & Limitations:{' '}
                            </strong>
                            {cit.limitations}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D9DFE2]">
                        <a
                          href={cit.doiOrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#294B68] underline focus-visible:outline-2 focus-visible:outline-[#1B3D5F]"
                        >
                          <span>Original Research ({cit.doiOrUrl})</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        {primaryReturnTarget && (
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={`#${primaryReturnTarget.markerId}`}
                              onClick={(e) => {
                                e.preventDefault();
                                jumpBackToCitation(
                                  cit.id,
                                  primaryReturnTarget.markerId
                                );
                              }}
                              className="inline-flex items-center gap-1 font-semibold text-[#294B68] hover:text-[#1B3D5F] hover:underline focus-visible:outline-2 focus-visible:outline-[#1B3D5F]"
                            >
                              <ArrowUpLeft className="w-3.5 h-3.5" />
                              <span>Back to citation in text</span>
                            </a>

                            {occurrencesForCit.length > 1 && (
                              <span
                                aria-label={`All occurrences of citation ${num} in text`}
                                className="inline-flex items-center gap-1.5 text-[11px]"
                              >
                                <span className="text-[#405B70]" aria-hidden="true">·</span>
                                {occurrencesForCit.map((occ) => (
                                  <a
                                    key={occ.markerId}
                                    href={`#${occ.markerId}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      jumpBackToCitation(cit.id, occ.markerId);
                                    }}
                                    aria-label={`Jump to citation ${num} occurrence ${occ.occurrenceSuffix}`}
                                    className={`px-1.5 py-0.5 rounded font-mono transition-colors focus-visible:outline-2 focus-visible:outline-[#1B3D5F] no-underline ${
                                      primaryReturnTarget.markerId === occ.markerId
                                        ? 'bg-[#1B3D5F] text-[#FFFFFF] border border-[#1B3D5F] font-semibold'
                                        : 'bg-[#E5F5EE] text-[#1B3D5F] border border-[#405B70] hover:bg-[#1B3D5F] hover:text-[#FFFFFF] hover:border-[#1B3D5F]'
                                    }`}
                                  >
                                    {num}
                                    {occ.occurrenceSuffix}
                                  </a>
                                ))}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* ===============================================================
                H. RESTRAINED AUTHOR BIO & RELATED CONTENT
               =============================================================== */}
            {author && (
              <aside
                aria-label="About the author"
                className="p-6 rounded-3xl bg-[#F5F4F0] border border-[#1B3D5F]/10 flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-2xl"
              >
                <PhotoImage
                  src={author.avatarUrl}
                  alt={author.name}
                  className="w-14 h-14 rounded-full object-cover shrink-0"
                />
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-sm text-[#1B3D5F]">
                    Written by {author.name}
                  </div>
                  <div className="text-[#28537D] font-medium">{author.role}</div>
                  <p className="text-[#1B3D5F]/85 leading-relaxed">
                    {author.bio}
                  </p>
                </div>
              </aside>
            )}

            {/* Related Gift Guides & Companion Stories */}
            <section
              aria-labelledby="heading-related-reading"
              className="pt-8 border-t border-[#1B3D5F]/12 space-y-6"
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D] mb-1">
                  Continue Exploring
                </div>
                <h2
                  id="heading-related-reading"
                  className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F]"
                >
                  Related Gift Guides & Next Reading
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedGuides.map((guide) => (
                  <article
                    key={guide.id}
                    className="rounded-3xl bg-[#E8F8F0] p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div
                        onClick={() => onSelectGuide(guide.slug)}
                        className="aspect-16/10 rounded-2xl overflow-hidden bg-white cursor-pointer group"
                      >
                        <PhotoImage
                          src={guide.heroImageUrl}
                          alt={guide.heroImageAlt}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                        Gift Guide · {guide.readTimeMinutes} min read
                      </div>
                      <h3 className="text-lg font-serif font-semibold text-[#1B3D5F] leading-snug">
                        <button
                          type="button"
                          onClick={() => onSelectGuide(guide.slug)}
                          className="text-left hover:underline"
                        >
                          {guide.title}
                        </button>
                      </h3>
                      <p className="text-xs text-[#1B3D5F]/80 leading-relaxed line-clamp-3">
                        {guide.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectGuide(guide.slug)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3D5F] hover:text-[#28537D]"
                    >
                      <span>Explore Gift Guide</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </article>
                ))}

                {relatedArticles.map((relArt) => (
                  <article
                    key={relArt.id}
                    className="rounded-3xl bg-[#FFF4D6] p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div
                        onClick={() => onSelectArticle(relArt.slug)}
                        className="aspect-16/10 rounded-2xl overflow-hidden bg-white cursor-pointer group"
                      >
                        <PhotoImage
                          src={relArt.heroImageUrl}
                          alt={relArt.heroAlt}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                        Next Story · {relArt.category}
                      </div>
                      <h3 className="text-lg font-serif font-semibold text-[#1B3D5F] leading-snug">
                        <button
                          type="button"
                          onClick={() => onSelectArticle(relArt.slug)}
                          className="text-left hover:underline"
                        >
                          {relArt.title}
                        </button>
                      </h3>
                      <p className="text-xs text-[#1B3D5F]/80 leading-relaxed line-clamp-3">
                        {relArt.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectArticle(relArt.slug)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3D5F] hover:text-[#28537D]"
                    >
                      <span>Read Story</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
};
