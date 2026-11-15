/**
 * Science of Gifts — Portable Text & Inline Citation / Rich-Text Serializer
 *
 * Bridges Sanity Studio's structured Portable Text (`block` arrays with `h2`, `h3`,
 * `blockquote`, `strong`, `em`, `link` annotations, `citationAnnotation` marks,
 * `editorialImage` blocks, and `articleCallout` blocks) and the Astro frontend's
 * `ArticleSection` / paragraph representation.
 *
 * Ensures zero regression in existing `ArticleReaderView` citation navigation,
 * popover cards, and `citationNavigation.test.tsx` occurrence keys while adding
 * full rich-text editing (H2/H3, paragraphs, bold, italic, links, images with
 * captions & alt text, citations, and callouts).
 */

import type { ArticleCallout, ArticleSection } from '../../types/content';

export interface PortableTextSpan {
  _type: 'span';
  _key: string;
  text: string;
  marks: string[];
}

export interface PortableTextCitationMarkDef {
  _key: string;
  _type: 'citationAnnotation';
  citationRef?: {
    _type: 'reference';
    _ref: string;
  };
  citationId?: string;
}

export interface PortableTextLinkMarkDef {
  _key: string;
  _type: 'link';
  href: string;
}

export type PortableTextMarkDef =
  | PortableTextCitationMarkDef
  | PortableTextLinkMarkDef
  | Record<string, any>;

export interface PortableTextBlock {
  _type: 'block';
  _key: string;
  style: 'normal' | 'h2' | 'h3' | 'blockquote';
  children: PortableTextSpan[];
  markDefs: PortableTextMarkDef[];
}

export interface PortableTextEditorialImageBlock {
  _type: 'editorialImage';
  _key: string;
  url?: string;
  externalUrl?: string;
  alt: string;
  caption?: string;
  asset?: Record<string, any>;
  isSampleAsset?: boolean;
}

export interface PortableTextCalloutBlock {
  _type: 'articleCallout';
  _key: string;
  kicker?: string;
  title: string;
  body: string;
  tone?: 'mint' | 'blue' | 'butter' | 'sand';
}

export type PortableTextNode =
  | PortableTextBlock
  | PortableTextEditorialImageBlock
  | PortableTextCalloutBlock
  | Record<string, any>;

const CITATION_REGEX = /\[cite:([a-zA-Z0-9_-]+)\]/g;

/**
 * Parses inline markdown/citation tokens in a text segment:
 * - `[cite:cit_id]`
 * - `[link text](https://... or /...)`
 * - `**bold text**`
 * - `*italic text*`
 */
const INLINE_TOKEN_REGEX =
  /(\[cite:([a-zA-Z0-9_-]+)\])|(\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;

function parseTextIntoSpansAndMarkDefs(
  rawText: string,
  blockIdx: number
): {
  children: PortableTextSpan[];
  markDefs: PortableTextMarkDef[];
} {
  const children: PortableTextSpan[] = [];
  const markDefs: PortableTextMarkDef[] = [];
  let spanIdx = 0;

  // First check if the paragraph is a simple `[cite:...]` string with no markdown formatting
  // so existing unit tests expecting exact span attachment continue to work identically.
  const hasMarkdownTokens =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)|\*\*[^*]+\*\*|\*[^*]+\*/.test(
      rawText
    );

  if (!hasMarkdownTokens) {
    const parts = rawText.split(CITATION_REGEX);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        const textSegment = parts[i];
        if (textSegment.length > 0 || parts.length === 1) {
          children.push({
            _type: 'span',
            _key: `span_${blockIdx}_${spanIdx++}`,
            text: textSegment,
            marks: [],
          });
        }
      } else {
        const citationId = parts[i];
        const markKey = `cite_${blockIdx}_${spanIdx}`;
        markDefs.push({
          _key: markKey,
          _type: 'citationAnnotation',
          citationRef: {
            _type: 'reference',
            _ref: citationId,
          },
          citationId,
        });

        const prevSpan = children[children.length - 1];
        if (prevSpan && prevSpan.marks.length === 0 && prevSpan.text.length > 0) {
          prevSpan.marks = [markKey];
        } else {
          children.push({
            _type: 'span',
            _key: `span_${blockIdx}_${spanIdx++}`,
            text: `[${citationId}]`,
            marks: [markKey],
          });
        }
      }
    }
    return { children, markDefs };
  }

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(INLINE_TOKEN_REGEX.source, 'g');

  while ((match = regex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      const plain = rawText.slice(lastIndex, match.index);
      if (plain.length > 0) {
        children.push({
          _type: 'span',
          _key: `span_${blockIdx}_${spanIdx++}`,
          text: plain,
          marks: [],
        });
      }
    }

    if (match[1] && match[2]) {
      // [cite:cit_id]
      const citationId = match[2];
      const markKey = `cite_${blockIdx}_${spanIdx}`;
      markDefs.push({
        _key: markKey,
        _type: 'citationAnnotation',
        citationRef: {
          _type: 'reference',
          _ref: citationId,
        },
        citationId,
      });
      const prevSpan = children[children.length - 1];
      if (prevSpan && prevSpan.marks.length === 0 && prevSpan.text.length > 0) {
        prevSpan.marks = [markKey];
      } else {
        children.push({
          _type: 'span',
          _key: `span_${blockIdx}_${spanIdx++}`,
          text: `[${citationId}]`,
          marks: [markKey],
        });
      }
    } else if (match[3] && match[4] && match[5]) {
      // [label](href)
      const label = match[4];
      const href = match[5];
      const linkKey = `link_${blockIdx}_${spanIdx}`;
      markDefs.push({
        _key: linkKey,
        _type: 'link',
        href,
      });
      children.push({
        _type: 'span',
        _key: `span_${blockIdx}_${spanIdx++}`,
        text: label,
        marks: [linkKey],
      });
    } else if (match[6] && match[7]) {
      // **bold**
      children.push({
        _type: 'span',
        _key: `span_${blockIdx}_${spanIdx++}`,
        text: match[7],
        marks: ['strong'],
      });
    } else if (match[8] && match[9]) {
      // *italic*
      children.push({
        _type: 'span',
        _key: `span_${blockIdx}_${spanIdx++}`,
        text: match[9],
        marks: ['em'],
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < rawText.length) {
    const tail = rawText.slice(lastIndex);
    if (tail.length > 0) {
      children.push({
        _type: 'span',
        _key: `span_${blockIdx}_${spanIdx++}`,
        text: tail,
        marks: [],
      });
    }
  }

  if (children.length === 0) {
    children.push({
      _type: 'span',
      _key: `span_${blockIdx}_0`,
      text: rawText,
      marks: [],
    });
  }

  return { children, markDefs };
}

/**
 * Converts an array of paragraph strings (potentially containing `[cite:cit_id]`,
 * `**bold**`, `*italic*`, `[label](url)`, `### Subheading`, or `> Blockquote`)
 * into Sanity Portable Text blocks.
 */
export function paragraphsToPortableText(
  paragraphs: string[],
  options?: {
    images?: Array<{ id?: string; url: string; alt: string; caption?: string }>;
    callout?: ArticleCallout;
  }
): PortableTextNode[] {
  const nodes: PortableTextNode[] = paragraphs.map((paragraph, blockIdx) => {
    let style: 'normal' | 'h2' | 'h3' | 'blockquote' = 'normal';
    let cleanText = paragraph;

    if (cleanText.startsWith('## ')) {
      style = 'h2';
      cleanText = cleanText.slice(3).trim();
    } else if (cleanText.startsWith('### ')) {
      style = 'h3';
      cleanText = cleanText.slice(4).trim();
    } else if (cleanText.startsWith('> ')) {
      style = 'blockquote';
      cleanText = cleanText.slice(2).trim();
    }

    const { children, markDefs } = parseTextIntoSpansAndMarkDefs(
      cleanText,
      blockIdx
    );

    return {
      _type: 'block',
      _key: `block_${blockIdx}`,
      style,
      children,
      markDefs,
    };
  });

  if (Array.isArray(options?.images)) {
    options!.images.forEach((img, idx) => {
      if (!img?.url) return;
      nodes.push({
        _type: 'editorialImage',
        _key: img.id || `img_${idx}`,
        url: img.url,
        externalUrl: img.url,
        alt: img.alt || 'Editorial illustration',
        caption: img.caption || undefined,
      });
    });
  }

  if (options?.callout && options.callout.title && options.callout.body) {
    nodes.push({
      _type: 'articleCallout',
      _key: `callout_${nodes.length}`,
      kicker: options.callout.kicker,
      title: options.callout.title,
      body: options.callout.body,
      tone: options.callout.tone || 'sand',
    });
  }

  return nodes;
}

/**
 * Serializes a single Portable Text `block` back into a string with inline
 * `[cite:cit_id]`, `**bold**`, `*italic*`, and `[label](href)` tokens.
 */
export function serializePortableTextBlockToText(
  block: PortableTextBlock | Record<string, any>
): string {
  const markDefs: PortableTextMarkDef[] = Array.isArray(block.markDefs)
    ? block.markDefs
    : [];
  const markDefsByKey = new Map(markDefs.map((m: any) => [m._key, m]));
  let paragraph = '';

  const children: PortableTextSpan[] = Array.isArray(block.children)
    ? block.children
    : [];

  for (const child of children) {
    const marks = Array.isArray(child.marks) ? child.marks : [];
    const citationMarks = marks
      .map((mKey) => markDefsByKey.get(mKey))
      .filter(
        (m): m is PortableTextCitationMarkDef =>
          Boolean(m && m._type === 'citationAnnotation')
      );
    const linkMark = marks
      .map((mKey) => markDefsByKey.get(mKey))
      .find((m): m is PortableTextLinkMarkDef => Boolean(m && m._type === 'link' && m.href));

    const isBold = marks.includes('strong');
    const isItalic = marks.includes('em');

    const rawSpanText = String(child.text ?? '');
    const isSyntheticAnchor = /^\[cit_[a-zA-Z0-9_-]+\]$/.test(rawSpanText);

    let formattedText = isSyntheticAnchor ? '' : rawSpanText;

    if (formattedText) {
      if (isBold && isItalic) {
        formattedText = `***${formattedText}***`;
      } else if (isBold) {
        formattedText = `**${formattedText}**`;
      } else if (isItalic) {
        formattedText = `*${formattedText}*`;
      }

      if (linkMark && linkMark.href) {
        formattedText = `[${formattedText}](${linkMark.href})`;
      }
    }

    paragraph += formattedText;

    for (const cMark of citationMarks) {
      const refId =
        cMark.citationRef?._ref ||
        cMark.citationId ||
        '';
      if (refId) {
        paragraph += `[cite:${refId}]`;
      }
    }
  }

  if (block.style === 'h3' && paragraph.trim()) {
    return `### ${paragraph.trim()}`;
  }
  if (block.style === 'blockquote' && paragraph.trim()) {
    return `> ${paragraph.trim()}`;
  }
  return paragraph;
}

/**
 * Serializes Sanity Portable Text blocks back into paragraph strings with inline
 * `[cite:cit_id]`, `**bold**`, `*italic*`, and `[label](href)` markers.
 */
export function portableTextToParagraphs(
  blocks: Array<PortableTextNode | PortableTextBlock>
): string[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((b) => b && b._type === 'block')
    .map((block) => serializePortableTextBlockToText(block as PortableTextBlock))
    .filter((p) => p.trim().length > 0);
}

/**
 * Resolves an image URL from a Sanity `editorialImage` object or asset reference.
 */
export function resolveEditorialImageUrl(img: Record<string, any> | undefined | null): string {
  if (!img || typeof img !== 'object') return '';
  if (typeof img.url === 'string' && img.url.trim()) return img.url.trim();
  if (typeof img.externalUrl === 'string' && img.externalUrl.trim()) {
    return img.externalUrl.trim();
  }
  const ref =
    img.sanityAssetId ||
    img.asset?.asset?._ref ||
    img.asset?._ref ||
    '';
  if (typeof ref === 'string' && ref.startsWith('image-')) {
    const match = ref.match(/^image-([a-zA-Z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/);
    if (match) {
      return `https://cdn.sanity.io/images/c1y2qdje/production/${match[1]}-${match[2]}.${match[3]}`;
    }
  }
  return '';
}

/**
 * Extracts paragraphs, inline images (`editorialImage`), and callouts (`articleCallout`)
 * from a section's `portableTextBody`.
 */
export function extractSectionContentFromPortableText(
  nodes: PortableTextNode[] | undefined | null
): {
  paragraphs: string[];
  images: Array<{ id?: string; url: string; alt: string; caption?: string }>;
  callout?: ArticleCallout;
} {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { paragraphs: [], images: [] };
  }

  const paragraphs: string[] = [];
  const images: Array<{ id?: string; url: string; alt: string; caption?: string }> = [];
  let callout: ArticleCallout | undefined;

  nodes.forEach((rawNode, idx) => {
    if (!rawNode || typeof rawNode !== 'object') return;
    const node = rawNode as Record<string, any>;
    if (node._type === 'block') {
      const text = serializePortableTextBlockToText(node as PortableTextBlock);
      if (text.trim()) {
        paragraphs.push(text);
      }
    } else if (node._type === 'editorialImage' || node._type === 'image') {
      const url = resolveEditorialImageUrl(node);
      if (url) {
        images.push({
          id: node._key || `img_${idx}`,
          url,
          alt: String(node.alt || 'Editorial illustration').trim(),
          caption: typeof node.caption === 'string' && node.caption.trim() ? node.caption.trim() : undefined,
        });
      }
    } else if (node._type === 'articleCallout') {
      if (node.title && node.body) {
        callout = {
          kicker: typeof node.kicker === 'string' ? node.kicker : undefined,
          title: String(node.title),
          body: String(node.body),
          tone:
            node.tone === 'mint' ||
            node.tone === 'blue' ||
            node.tone === 'butter' ||
            node.tone === 'sand'
              ? node.tone
              : 'sand',
        };
      }
    }
  });

  return { paragraphs, images, callout };
}

/**
 * Converts an array of `ArticleSection`s into a single unified Portable Text document
 * (`bodyPortableText`) where each section begins with an `h2` block followed by optional
 * `h3` subheading, body blocks, inline `editorialImage` blocks, and `articleCallout` blocks.
 */
export function sectionsToFullBodyPortableText(
  sections: ArticleSection[]
): PortableTextNode[] {
  if (!Array.isArray(sections) || sections.length === 0) return [];
  const nodes: PortableTextNode[] = [];
  let keyCounter = 0;

  for (const section of sections) {
    if (section.heading && section.heading.trim()) {
      nodes.push({
        _type: 'block',
        _key: `${section.id || 'sec'}_h2_${keyCounter++}`,
        style: 'h2',
        children: [
          {
            _type: 'span',
            _key: `span_h2_${keyCounter}`,
            text: section.heading.trim(),
            marks: [],
          },
        ],
        markDefs: [],
      });
    }

    if (section.subheading && section.subheading.trim()) {
      nodes.push({
        _type: 'block',
        _key: `${section.id || 'sec'}_h3_${keyCounter++}`,
        style: 'h3',
        children: [
          {
            _type: 'span',
            _key: `span_h3_${keyCounter}`,
            text: section.subheading.trim(),
            marks: [],
          },
        ],
        markDefs: [],
      });
    }

    if (
      Array.isArray(section.portableTextBody) &&
      section.portableTextBody.length > 0
    ) {
      for (const rawPtNode of section.portableTextBody) {
        const ptNode = rawPtNode as Record<string, any>;
        // Avoid duplicating an h2 if it matches the section heading
        if (ptNode._type === 'block' && ptNode.style === 'h2') {
          const h2Text = serializePortableTextBlockToText(ptNode as PortableTextBlock).trim();
          if (h2Text === (section.heading || '').trim()) {
            continue;
          }
        }
        nodes.push({
          ...ptNode,
          _key: ptNode._key || `node_${keyCounter++}`,
        });
      }
    } else {
      const sectionNodes = paragraphsToPortableText(section.paragraphs || [], {
        images: section.images,
        callout: section.callout,
      });
      for (const sn of sectionNodes) {
        nodes.push({
          ...sn,
          _key: `${section.id || 'sec'}_${sn._key || keyCounter++}`,
        });
      }
    }

    // If section had subSections from legacy schema, include them too
    if (Array.isArray(section.subSections)) {
      for (const sub of section.subSections) {
        if (sub.subheading) {
          nodes.push({
            _type: 'block',
            _key: `${sub.id || 'sub'}_h3_${keyCounter++}`,
            style: 'h3',
            children: [
              {
                _type: 'span',
                _key: `span_sub_${keyCounter}`,
                text: sub.subheading,
                marks: [],
              },
            ],
            markDefs: [],
          });
        }
        const subParas = paragraphsToPortableText(sub.paragraphs || []);
        for (const sp of subParas) {
          nodes.push({
            ...sp,
            _key: `${sub.id || 'sub'}_${sp._key || keyCounter++}`,
          });
        }
      }
    }
  }

  return nodes;
}

/**
 * Converts a unified `bodyPortableText` array (split by `h2` headings) into structured
 * `ArticleSection[]`, preserving existing section IDs and contextual product metadata
 * whenever possible.
 */
export function fullBodyPortableTextToSections(
  nodes: PortableTextNode[],
  existingSections?: Array<Record<string, any>>
): ArticleSection[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];

  const rawGroups: Array<{
    heading: string;
    nodes: PortableTextNode[];
  }> = [];

  let currentGroup: { heading: string; nodes: PortableTextNode[] } | null = null;

  for (const rawNode of nodes) {
    if (!rawNode || typeof rawNode !== 'object') continue;
    const node = rawNode as Record<string, any>;
    if (node._type === 'block' && node.style === 'h2') {
      const h2Text = serializePortableTextBlockToText(
        node as PortableTextBlock
      ).trim();
      currentGroup = {
        heading: h2Text || 'Section',
        nodes: [],
      };
      rawGroups.push(currentGroup);
    } else {
      if (!currentGroup) {
        currentGroup = {
          heading: 'Introduction',
          nodes: [],
        };
        rawGroups.push(currentGroup);
      }
      currentGroup.nodes.push(rawNode);
    }
  }

  return rawGroups
    .map((group, idx) => {
      const existingMatch = Array.isArray(existingSections)
        ? existingSections.find(
            (s) =>
              s &&
              typeof s.heading === 'string' &&
              s.heading.trim().toLowerCase() === group.heading.trim().toLowerCase()
          ) ?? existingSections[idx]
        : undefined;

      const slugHeading = group.heading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 36);

      const sectionId =
        (existingMatch?.id && String(existingMatch.id).trim()) ||
        `sec_${idx + 1}_${slugHeading || 'section'}`;

      let subheading: string | undefined = existingMatch?.subheading;
      const bodyNodes = [...group.nodes];
      const firstBodyNode = bodyNodes[0] as Record<string, any> | undefined;
      if (
        firstBodyNode &&
        firstBodyNode._type === 'block' &&
        firstBodyNode.style === 'h3'
      ) {
        subheading = serializePortableTextBlockToText(
          firstBodyNode as PortableTextBlock
        )
          .replace(/^###\s*/, '')
          .trim();
        bodyNodes.shift();
      }

      const extracted = extractSectionContentFromPortableText(bodyNodes);

      return {
        id: sectionId,
        shortNavTitle: existingMatch?.shortNavTitle,
        heading: group.heading,
        subheading,
        paragraphs:
          extracted.paragraphs.length > 0
            ? extracted.paragraphs
            : ['Section content in progress.'],
        portableTextBody: bodyNodes,
        images:
          extracted.images.length > 0
            ? extracted.images
            : existingMatch?.images,
        callout: extracted.callout ?? existingMatch?.callout,
        subSections: existingMatch?.subSections,
        pullQuote: existingMatch?.pullQuote,
        expandableNote: existingMatch?.expandableNote,
        expandableAdvice: existingMatch?.expandableAdvice,
        contextualProducts: existingMatch?.contextualProducts,
      };
    })
    .filter((s) => s.heading.trim().length > 0 || s.paragraphs.length > 0);
}

export const convertParagraphsToPortableTextBlocks = paragraphsToPortableText;
export const serializePortableTextToParagraphs = portableTextToParagraphs;

