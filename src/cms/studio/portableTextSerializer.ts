/**
 * Science of Gifts — Portable Text & Inline Citation (`[cite:cit_id]`) Adapter
 *
 * Bridges Sanity Studio's rich-text Portable Text editor with Science of Gifts'
 * existing deterministic citation parser (`src/utils/citationNavigation.ts`) and
 * article renderer (`src/components/ArticleReaderView.tsx`).
 *
 * Editors can either:
 * 1. Write structured paragraphs containing `[cite:cit_id]` markers directly, OR
 * 2. Write in Sanity Portable Text blocks and attach `citationAnnotation` marks
 *    referencing a `researchCitation` document.
 *
 * During repository normalization, `serializePortableTextToParagraphs()` converts
 * Portable Text blocks + `citationAnnotation` marks into the exact `string[]`
 * with `[cite:cit_id]` tokens expected by `ArticleReaderView.tsx` and `citationNavigation.ts`,
 * ensuring zero breaking changes to citation numbering (`[1]`, `[2]`) or popovers.
 */

export interface PortableTextMarkDef {
  _key: string;
  _type: 'citationAnnotation' | 'link' | string;
  citationId?: string;
  citation?: {
    _type?: 'reference';
    _ref?: string;
    citationId?: string;
    id?: string;
  };
  href?: string;
}

export interface PortableTextSpan {
  _key?: string;
  _type: 'span';
  text: string;
  marks?: string[];
}

export interface PortableTextBlock {
  _key?: string;
  _type: 'block';
  style?: 'normal' | 'h3' | 'blockquote';
  children: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
}

/**
 * Resolves the canonical citation ID (`cit_*`) from a Portable Text `citationAnnotation` markDef.
 */
function resolveCitationIdFromMarkDef(markDef: PortableTextMarkDef): string | null {
  if (markDef._type !== 'citationAnnotation') {
    return null;
  }
  const raw =
    markDef.citationId ||
    markDef.citation?.citationId ||
    markDef.citation?.id ||
    markDef.citation?._ref ||
    '';
  const cleaned = raw.trim().replace(/^drafts\./, '');
  return cleaned.startsWith('cit_') ? cleaned : null;
}

/**
 * Converts an array of Sanity Portable Text blocks into the canonical `string[]`
 * paragraph format used by `ArticleSection.paragraphs`, injecting `[cite:cit_id]`
 * markers wherever a `citationAnnotation` mark was applied in Studio.
 */
export function serializePortableTextToParagraphs(
  blocks: PortableTextBlock[] | undefined | null
): string[] {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return [];
  }

  const paragraphs: string[] = [];

  for (const block of blocks) {
    if (!block || block._type !== 'block' || !Array.isArray(block.children)) {
      continue;
    }

    const markDefsByKey = new Map<string, PortableTextMarkDef>();
    for (const def of block.markDefs ?? []) {
      if (def && def._key) {
        markDefsByKey.set(def._key, def);
      }
    }

    let line = '';
    for (const span of block.children) {
      if (!span || typeof span.text !== 'string') continue;
      let spanText = span.text;

      if (Array.isArray(span.marks) && span.marks.length > 0) {
        for (const markKey of span.marks) {
          const markDef = markDefsByKey.get(markKey);
          if (markDef) {
            const citId = resolveCitationIdFromMarkDef(markDef);
            if (citId && !spanText.includes(`[cite:${citId}]`)) {
              spanText = `${spanText} [cite:${citId}]`;
            }
          }
        }
      }

      line += spanText;
    }

    const normalized = line.replace(/\s+\[cite:/g, ' [cite:').trim();
    if (normalized.length > 0) {
      paragraphs.push(normalized);
    }
  }

  return paragraphs;
}

/**
 * Converts existing `string[]` paragraphs (containing inline `[cite:cit_id]` tokens)
 * into Sanity Portable Text blocks with structured `citationAnnotation` markDefs
 * so migrated articles can be edited seamlessly in Sanity Studio.
 */
export function convertParagraphsToPortableTextBlocks(
  paragraphs: string[] | undefined | null
): PortableTextBlock[] {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    return [];
  }

  const INLINE_CITE_SPLIT_REGEX = /(\[cite:[a-zA-Z0-9_]+\])/g;
  const SINGLE_CITE_MATCH = /^\[cite:([a-zA-Z0-9_]+)\]$/;

  return paragraphs.map((paragraph, blockIndex): PortableTextBlock => {
    const tokens = paragraph.split(INLINE_CITE_SPLIT_REGEX).filter(Boolean);
    const children: PortableTextSpan[] = [];
    const markDefs: PortableTextMarkDef[] = [];

    tokens.forEach((token, tokenIndex) => {
      const match = token.match(SINGLE_CITE_MATCH);
      if (match) {
        const citationId = match[1];
        const markKey = `cite_${blockIndex}_${tokenIndex}`;
        markDefs.push({
          _key: markKey,
          _type: 'citationAnnotation',
          citationId,
          citation: {
            _type: 'reference',
            _ref: citationId,
          },
        });
        // Attach the citation mark to the immediately preceding text span if one exists,
        // or create a zero-loss citation carrier span.
        const prevSpan = children[children.length - 1];
        if (prevSpan) {
          prevSpan.marks = [...(prevSpan.marks ?? []), markKey];
        } else {
          children.push({
            _key: `span_${blockIndex}_${tokenIndex}`,
            _type: 'span',
            text: '',
            marks: [markKey],
          });
        }
      } else {
        children.push({
          _key: `span_${blockIndex}_${tokenIndex}`,
          _type: 'span',
          text: token,
          marks: [],
        });
      }
    });

    return {
      _key: `block_${blockIndex}`,
      _type: 'block',
      style: 'normal',
      children,
      markDefs,
    };
  });
}
