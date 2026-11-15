/**
 * Science of Gifts — Bidirectional Sanity <-> Astro Article Document Mapper
 *
 * Maps between Sanity Content Lake `article` documents (both `drafts.art_*` and
 * published `art_*`) and the Astro frontend's `Article` interface (`src/types/content.ts`).
 *
 * Supports:
 * - Native Portable Text rich-text body (`bodyPortableText` and `sections[].portableTextBody`)
 *   with H2/H3 headings, paragraphs, bold, italic, links, inline images with captions & alt text,
 *   research citation annotations, and editorial callouts.
 * - Backward-compatible section paragraphs (`sections[].paragraphs`).
 * - Automatic extraction of inline `[cite:cit_id]` and `citationAnnotation` references into
 *   `citationIds` so numbered superscript badges and the Research Bibliography stay in sync.
 */

import type {
  Article,
  ArticleCallout,
  ArticleSection,
  ArticleTopicId,
  OccasionType,
  RecipientType,
} from '../../types/content';
import { AUTHORS, CITATIONS, GIFT_GUIDES } from '../../data/catalog';
import {
  extractSectionContentFromPortableText,
  fullBodyPortableTextToSections,
  paragraphsToPortableText,
  resolveEditorialImageUrl,
  sectionsToFullBodyPortableText,
} from './portableTextSerializer';

const DEFAULT_HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1400&q=80';
const DEFAULT_AUTHOR_ID = Object.keys(AUTHORS)[0] || 'author_elena_rostova';

function slugifyKebab(input: string): string {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function extractInlineCitationIdsFromText(text: string): string[] {
  const found: string[] = [];
  const regex = /\[cite:([a-zA-Z0-9_-]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[1]) found.push(m[1]);
  }
  return found;
}

/**
 * Normalizes a Sanity `article` document (draft or published) so both `sections`
 * (with `portableTextBody` and `paragraphs`) and `bodyPortableText` are populated
 * and backward-compatible with older articles and schema validation rules.
 */
export function normalizeSanityArticleDocumentBackwardCompatible(
  rawDoc: Record<string, any>
): Record<string, any> & {
  _id: string;
  _type: 'article';
  status: 'draft' | 'published';
} {
  const rawId = typeof rawDoc._id === 'string' ? rawDoc._id.trim() : '';
  const canonicalId = (
    typeof rawDoc.id === 'string' && rawDoc.id.trim().startsWith('art_')
      ? rawDoc.id.trim()
      : rawId.replace(/^drafts\./, '')
  ).replace(/^drafts\./, '');

  const validCanonicalId = /^art_[a-z0-9_]+$/.test(canonicalId)
    ? canonicalId
    : `art_${slugifyKebab(canonicalId || rawDoc.title || 'story').replace(/-/g, '_') || 'editorial_story'}`;

  const isDraftId = rawId.startsWith('drafts.');
  const status: 'draft' | 'published' =
    isDraftId || rawDoc.status !== 'published' ? 'draft' : 'published';

  const title =
    typeof rawDoc.title === 'string' && rawDoc.title.trim().length > 0
      ? rawDoc.title.trim()
      : 'Untitled Editorial Story';

  const rawSlugStr =
    typeof rawDoc.slug === 'string'
      ? rawDoc.slug.trim()
      : typeof rawDoc.slug?.current === 'string'
      ? rawDoc.slug.current.trim()
      : '';
  const resolvedSlug =
    slugifyKebab(rawSlugStr) ||
    slugifyKebab(title) ||
    validCanonicalId.replace(/^art_/, '').replace(/_/g, '-');

  const subtitle =
    typeof rawDoc.subtitle === 'string' && rawDoc.subtitle.trim().length > 0
      ? rawDoc.subtitle.trim()
      : 'An evidence-based editorial exploration of thoughtful gift-giving, everyday rituals, and human connection.';

  const category =
    typeof rawDoc.category === 'string' && rawDoc.category.trim()
      ? rawDoc.category.trim()
      : 'Gift-Giving Psychology';

  const topics: ArticleTopicId[] =
    Array.isArray(rawDoc.topics) && rawDoc.topics.length > 0
      ? rawDoc.topics.filter((t: any) => typeof t === 'string' && t.trim())
      : ['gift-giving-psychology'];

  const authorRefId =
    typeof rawDoc.author === 'string'
      ? rawDoc.author.trim()
      : typeof rawDoc.author?._ref === 'string'
      ? rawDoc.author._ref.trim()
      : typeof rawDoc.authorId === 'string'
      ? rawDoc.authorId.trim()
      : DEFAULT_AUTHOR_ID;

  const validAuthorId = AUTHORS[authorRefId] ? authorRefId : DEFAULT_AUTHOR_ID;

  const publishedAt =
    typeof rawDoc.publishedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(rawDoc.publishedAt.trim())
      ? rawDoc.publishedAt.trim().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  // Hero Image normalization
  const rawHero = rawDoc.heroImage;
  const heroUrl =
    resolveEditorialImageUrl(rawHero) ||
    (typeof rawDoc.heroImageUrl === 'string' && rawDoc.heroImageUrl.trim()
      ? rawDoc.heroImageUrl.trim()
      : DEFAULT_HERO_IMAGE_URL);
  const heroAlt =
    (typeof rawHero?.alt === 'string' && rawHero.alt.trim()) ||
    (typeof rawDoc.heroAlt === 'string' && rawDoc.heroAlt.trim()) ||
    `${title} editorial hero photograph`;
  const heroCaption =
    (typeof rawHero?.caption === 'string' && rawHero.caption.trim()) ||
    (typeof rawDoc.heroCaption === 'string' && rawDoc.heroCaption.trim()) ||
    'Thoughtful gifts succeed when they honor shared habits and everyday utility.';

  const heroImage = {
    ...(rawHero && typeof rawHero === 'object' ? rawHero : {}),
    _type: 'editorialImage',
    url: heroUrl,
    externalUrl: heroUrl.startsWith('https://') ? heroUrl : undefined,
    alt: heroAlt,
    caption: heroCaption,
    isSampleAsset: Boolean(rawHero?.isSampleAsset),
  };

  // Executive Summary normalization
  const rawSummary = Array.isArray(rawDoc.executiveSummary)
    ? rawDoc.executiveSummary
        .map((item: any) => String(item ?? '').trim())
        .filter(Boolean)
    : [];
  const executiveSummary =
    rawSummary.length >= 2
      ? rawSummary
      : rawSummary.length === 1
      ? [
          rawSummary[0],
          'Choosing gifts grounded in daily routines and shared history consistently outperforms generic novelty items.',
        ]
      : [
          'Behavioral research shows givers often optimize for the moment of unwrapping, while recipients value long-term everyday utility.',
          'Specificity, low recipient burden, and quiet craftsmanship turn an ordinary object into a lasting gesture.',
        ];

  // Sections & Portable Text synchronization:
  // If `sections` exist, normalize each section's `portableTextBody` and `paragraphs`.
  // If `sections` are empty/missing but `bodyPortableText` has blocks, derive `sections` from `bodyPortableText`.
  let rawSections: Array<Record<string, any>> = Array.isArray(rawDoc.sections)
    ? rawDoc.sections
    : [];

  if (
    rawSections.length === 0 &&
    Array.isArray(rawDoc.bodyPortableText) &&
    rawDoc.bodyPortableText.length > 0
  ) {
    rawSections = fullBodyPortableTextToSections(rawDoc.bodyPortableText);
  }

  const normalizedSections: Array<Record<string, any>> = rawSections.map(
    (sec: Record<string, any>, idx: number) => {
      const heading =
        typeof sec?.heading === 'string' && sec.heading.trim().length >= 3
          ? sec.heading.trim()
          : `Section ${idx + 1}: Core Insight`;
      const slugHeading = slugifyKebab(heading).slice(0, 36) || `part-${idx + 1}`;
      const secId =
        typeof sec?.id === 'string' && sec.id.trim()
          ? sec.id.trim()
          : `sec_${idx + 1}_${slugHeading}`;
      const secKey =
        typeof sec?._key === 'string' && sec._key.trim()
          ? sec._key.trim()
          : secId;

      const hasPtBody =
        Array.isArray(sec?.portableTextBody) && sec.portableTextBody.length > 0;
      const isNativePtEdited =
        hasPtBody &&
        sec.portableTextBody.some(
          (node: any) =>
            typeof node?._key === 'string' &&
            !node._key.startsWith('block_') &&
            !node._key.startsWith('img_') &&
            !node._key.startsWith('callout_')
        );

      const extractedFromPt = hasPtBody
        ? extractSectionContentFromPortableText(sec.portableTextBody)
        : { paragraphs: [], images: [], callout: undefined };

      const rawParas = Array.isArray(sec?.paragraphs)
        ? sec.paragraphs
            .map((p: any) => String(p ?? '').trim())
            .filter(Boolean)
        : [];

      const resolvedParagraphs =
        isNativePtEdited && extractedFromPt.paragraphs.length > 0
          ? extractedFromPt.paragraphs
          : rawParas.length > 0
          ? rawParas
          : extractedFromPt.paragraphs.length > 0
          ? extractedFromPt.paragraphs
          : [
              'Explore how thoughtful gift selection balances everyday practicality with personal connection.',
            ];

      const explicitImages = Array.isArray(sec?.images)
        ? sec.images
            .map((img: any, imgIdx: number) => {
              const url = resolveEditorialImageUrl(img);
              if (!url) return null;
              return {
                _type: 'editorialImage',
                _key: img._key || img.id || `sec_${idx}_img_${imgIdx}`,
                id: img.id || img._key || `sec_${idx}_img_${imgIdx}`,
                url,
                externalUrl: url.startsWith('https://') ? url : undefined,
                alt:
                  typeof img.alt === 'string' && img.alt.trim()
                    ? img.alt.trim()
                    : `${heading} illustration`,
                caption:
                  typeof img.caption === 'string' && img.caption.trim()
                    ? img.caption.trim()
                    : undefined,
              };
            })
            .filter(Boolean)
        : [];

      // Merge inline Portable Text images with explicit section images (avoiding duplicate URLs)
      const mergedImages = [...explicitImages];
      for (const ptImg of extractedFromPt.images) {
        if (!mergedImages.some((m: any) => m.url === ptImg.url)) {
          mergedImages.push({
            _type: 'editorialImage',
            _key: ptImg.id || `pt_img_${mergedImages.length}`,
            id: ptImg.id || `pt_img_${mergedImages.length}`,
            url: ptImg.url,
            externalUrl: ptImg.url.startsWith('https://') ? ptImg.url : undefined,
            alt: ptImg.alt || `${heading} illustration`,
            caption: ptImg.caption,
          });
        }
      }

      const rawCallout = sec?.callout ?? extractedFromPt.callout;
      const rawKicker =
        typeof rawCallout?.kicker === 'string' && rawCallout.kicker.trim()
          ? rawCallout.kicker.trim()
          : typeof rawCallout?.label === 'string' && rawCallout.label.trim()
          ? rawCallout.label.trim()
          : undefined;

      const normalizedCallout =
        rawCallout &&
        typeof rawCallout === 'object' &&
        typeof rawCallout.title === 'string' &&
        rawCallout.title.trim() &&
        typeof rawCallout.body === 'string' &&
        rawCallout.body.trim()
          ? {
              _type: 'articleCallout',
              kicker: rawKicker,
              title: rawCallout.title.trim(),
              body: rawCallout.body.trim(),
              tone:
                rawCallout.tone === 'mint' ||
                rawCallout.tone === 'blue' ||
                rawCallout.tone === 'butter' ||
                rawCallout.tone === 'sand'
                  ? rawCallout.tone
                  : 'sand',
            }
          : undefined;

      const resolvedPtBody = isNativePtEdited
        ? sec.portableTextBody
        : paragraphsToPortableText(resolvedParagraphs, {
            images: mergedImages as any,
            callout: normalizedCallout,
          });

      return {
        ...sec,
        _type: 'articleContentSection',
        _key: secKey,
        id: secId,
        heading,
        subheading:
          typeof sec?.subheading === 'string' && sec.subheading.trim()
            ? sec.subheading.trim()
            : undefined,
        paragraphs: resolvedParagraphs,
        portableTextBody: resolvedPtBody,
        ...(mergedImages.length > 0 ? { images: mergedImages } : {}),
        ...(normalizedCallout ? { callout: normalizedCallout } : {}),
      };
    }
  );

  const finalSections =
    normalizedSections.length > 0
      ? normalizedSections
      : [
          {
            _type: 'articleContentSection',
            _key: 'sec_1_introduction',
            id: 'sec_1_introduction',
            heading: 'Why Thoughtful Gifting Matters',
            paragraphs: [
              'Gifts are more than physical exchanges; they are quiet signals of how closely we pay attention to the people in our lives.',
            ],
            portableTextBody: paragraphsToPortableText([
              'Gifts are more than physical exchanges; they are quiet signals of how closely we pay attention to the people in our lives.',
            ]),
          },
        ];

  const syncedBodyPortableText =
    Array.isArray(rawDoc.bodyPortableText) && rawDoc.bodyPortableText.length > 0
      ? rawDoc.bodyPortableText
      : sectionsToFullBodyPortableText(finalSections as unknown as ArticleSection[]);

  // Collect citations from explicit array + inline [cite:...] markers
  const citationIdSet = new Set<string>();
  if (Array.isArray(rawDoc.citations)) {
    for (const c of rawDoc.citations) {
      const refId =
        typeof c === 'string'
          ? c.trim()
          : typeof c?._ref === 'string'
          ? c._ref.trim()
          : '';
      if (refId && CITATIONS[refId]) {
        citationIdSet.add(refId);
      }
    }
  }
  if (Array.isArray(rawDoc.citationIds)) {
    for (const cid of rawDoc.citationIds) {
      if (typeof cid === 'string' && CITATIONS[cid.trim()]) {
        citationIdSet.add(cid.trim());
      }
    }
  }
  for (const sec of finalSections) {
    for (const p of sec.paragraphs || []) {
      for (const inlineCid of extractInlineCitationIdsFromText(p)) {
        if (CITATIONS[inlineCid]) {
          citationIdSet.add(inlineCid);
        }
      }
    }
  }

  const normalizedCitations = Array.from(citationIdSet).map((cid, idx) => ({
    _type: 'reference',
    _key: `cit_ref_${idx}_${cid}`,
    _ref: cid,
    _weak: true,
  }));

  // Normalize relatedGuides
  const guideIdSet = new Set<string>();
  const validGuideIds = new Set(GIFT_GUIDES.map((g) => g.id));
  if (Array.isArray(rawDoc.relatedGuides)) {
    for (const g of rawDoc.relatedGuides) {
      const gid =
        typeof g === 'string'
          ? g.trim()
          : typeof g?._ref === 'string'
          ? g._ref.trim()
          : '';
      if (gid && validGuideIds.has(gid)) {
        guideIdSet.add(gid);
      }
    }
  }
  if (Array.isArray(rawDoc.relatedGuideIds)) {
    for (const gid of rawDoc.relatedGuideIds) {
      if (typeof gid === 'string' && validGuideIds.has(gid.trim())) {
        guideIdSet.add(gid.trim());
      }
    }
  }
  const normalizedRelatedGuides = Array.from(guideIdSet)
    .slice(0, 6)
    .map((gid, idx) => ({
      _type: 'reference',
      _key: `guide_ref_${idx}_${gid}`,
      _ref: gid,
      _weak: true,
    }));

  // Normalize SEO metadata
  const rawSeo = rawDoc.seo && typeof rawDoc.seo === 'object' ? rawDoc.seo : {};
  const defaultSeoTitle = `${title} | Science of Gifts`.slice(0, 110);
  const seoTitle =
    typeof rawSeo.seoTitle === 'string' && rawSeo.seoTitle.trim().length >= 10
      ? rawSeo.seoTitle.trim().slice(0, 110)
      : defaultSeoTitle.length >= 10
      ? defaultSeoTitle
      : `${title} — Editorial Story | Science of Gifts`;

  const defaultMetaDesc = subtitle.slice(0, 220);
  const metaDescription =
    typeof rawSeo.metaDescription === 'string' &&
    rawSeo.metaDescription.trim().length >= 25
      ? rawSeo.metaDescription.trim().slice(0, 220)
      : defaultMetaDesc.length >= 25
      ? defaultMetaDesc
      : `${subtitle} Read the complete research-backed guide on Science of Gifts.`.slice(
          0,
          220
        );

  const rawCanonical =
    typeof rawSeo.canonicalPath === 'string' ? rawSeo.canonicalPath.trim() : '';
  const canonicalPath = rawCanonical.startsWith('/')
    ? rawCanonical.endsWith('/')
      ? rawCanonical
      : `${rawCanonical}/`
    : `/articles/${resolvedSlug}/`;

  const seo = {
    ...rawSeo,
    _type: 'seoMetadata',
    seoTitle,
    metaDescription,
    canonicalPath,
    ogTitle:
      typeof rawSeo.ogTitle === 'string' && rawSeo.ogTitle.trim()
        ? rawSeo.ogTitle.trim()
        : seoTitle,
    ogDescription:
      typeof rawSeo.ogDescription === 'string' && rawSeo.ogDescription.trim()
        ? rawSeo.ogDescription.trim()
        : metaDescription,
    ogImage:
      typeof rawSeo.ogImage === 'string' && rawSeo.ogImage.trim().startsWith('https://')
        ? rawSeo.ogImage.trim()
        : heroUrl.startsWith('https://')
        ? heroUrl
        : undefined,
    ogType: 'article' as const,
    schemaType: 'Article' as const,
    indexing:
      status === 'published' && rawSeo.indexing !== 'noindex,follow'
        ? 'index,follow'
        : 'noindex,follow',
    noindex: status !== 'published' || Boolean(rawSeo.noindex),
  };

  // Normalize optional pullQuote
  const pullQuote =
    rawDoc.pullQuote &&
    typeof rawDoc.pullQuote === 'object' &&
    typeof rawDoc.pullQuote.text === 'string' &&
    rawDoc.pullQuote.text.trim().length >= 15
      ? {
          _type: 'articlePullQuote',
          text: rawDoc.pullQuote.text.trim().slice(0, 320),
          attribution:
            typeof rawDoc.pullQuote.attribution === 'string'
              ? rawDoc.pullQuote.attribution.trim().slice(0, 120)
              : undefined,
        }
      : undefined;

  return {
    ...rawDoc,
    _id: rawId || `drafts.${validCanonicalId}`,
    _type: 'article',
    id: validCanonicalId,
    title,
    subtitle,
    slug: {
      _type: 'slug',
      current: resolvedSlug,
    },
    status,
    featured: Boolean(rawDoc.featured),
    category,
    topics,
    recipients: Array.isArray(rawDoc.recipients) ? rawDoc.recipients : [],
    occasions: Array.isArray(rawDoc.occasions) ? rawDoc.occasions : [],
    author: {
      _type: 'reference',
      _ref: validAuthorId,
      _weak: true,
    },
    publishedAt,
    updatedAt:
      typeof rawDoc.updatedAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}/.test(rawDoc.updatedAt.trim())
        ? rawDoc.updatedAt.trim().slice(0, 10)
        : undefined,
    heroImage,
    executiveSummary,
    ...(pullQuote ? { pullQuote } : {}),
    bodyPortableText: syncedBodyPortableText,
    sections: finalSections,
    citations: normalizedCitations,
    relatedGuides: normalizedRelatedGuides,
    seo,
  };
}

/**
 * Converts a Sanity `article` document (draft or published) into an Astro `Article`
 * object ready for `ArticleReaderView`, `/articles/[slug]/`, and `/articles/`.
 */
export function mapSanityArticleToAstroArticle(
  rawDoc: Record<string, any>
): Article {
  const normalized = normalizeSanityArticleDocumentBackwardCompatible(rawDoc);
  const canonicalId = normalized.id;
  const slug = normalized.slug?.current || slugifyKebab(normalized.title);

  const authorId =
    normalized.author?._ref && AUTHORS[normalized.author._ref]
      ? normalized.author._ref
      : DEFAULT_AUTHOR_ID;

  const sections: ArticleSection[] = (normalized.sections || []).map(
    (sec: Record<string, any>, idx: number) => {
      const contextualProducts =
        sec.contextualProducts &&
        typeof sec.contextualProducts === 'object' &&
        Array.isArray(sec.contextualProducts.products || sec.contextualProducts.productIds)
          ? {
              heading:
                sec.contextualProducts.heading || 'Featured Gift Examples',
              editorialContext:
                sec.contextualProducts.editorialContext ||
                'Selected from our canonical catalog to illustrate this insight.',
              productIds: (
                sec.contextualProducts.products ||
                sec.contextualProducts.productIds ||
                []
              )
                .map((p: any) =>
                  typeof p === 'string' ? p : p?._ref || ''
                )
                .filter(Boolean),
            }
          : undefined;

      const callout: ArticleCallout | undefined =
        sec.callout && sec.callout.title && sec.callout.body
          ? {
              kicker: sec.callout.kicker,
              title: sec.callout.title,
              body: sec.callout.body,
              tone: sec.callout.tone || 'sand',
            }
          : undefined;

      const images = Array.isArray(sec.images)
        ? sec.images
            .map((img: any) => {
              const url = resolveEditorialImageUrl(img);
              if (!url) return null;
              return {
                id: img.id || img._key,
                url,
                alt: String(img.alt || sec.heading || 'Article illustration'),
                caption:
                  typeof img.caption === 'string' && img.caption.trim()
                    ? img.caption.trim()
                    : undefined,
              };
            })
            .filter(
              (
                item: any
              ): item is {
                id?: string;
                url: string;
                alt: string;
                caption?: string;
              } => Boolean(item)
            )
        : undefined;

      return {
        id: sec.id || `sec_${idx + 1}`,
        shortNavTitle: sec.shortNavTitle,
        heading: sec.heading || `Section ${idx + 1}`,
        subheading: sec.subheading,
        paragraphs: Array.isArray(sec.paragraphs) ? sec.paragraphs : [],
        portableTextBody: Array.isArray(sec.portableTextBody)
          ? sec.portableTextBody
          : undefined,
        ...(images && images.length > 0 ? { images } : {}),
        ...(callout ? { callout } : {}),
        ...(contextualProducts && contextualProducts.productIds.length > 0
          ? { contextualProducts }
          : {}),
        ...(sec.subSections ? { subSections: sec.subSections } : {}),
        ...(sec.pullQuote ? { pullQuote: sec.pullQuote } : {}),
        ...(sec.expandableNote ? { expandableNote: sec.expandableNote } : {}),
        ...(sec.expandableAdvice
          ? { expandableAdvice: sec.expandableAdvice }
          : {}),
      };
    }
  );

  const citationIds: string[] = (normalized.citations || [])
    .map((c: any) => (typeof c === 'string' ? c : c?._ref || ''))
    .filter((cid: string) => Boolean(cid && CITATIONS[cid]));

  const relatedGuideIds: string[] = (normalized.relatedGuides || [])
    .map((g: any) => (typeof g === 'string' ? g : g?._ref || ''))
    .filter(Boolean);

  return {
    id: canonicalId,
    slug,
    title: normalized.title,
    subtitle: normalized.subtitle,
    status: normalized.status,
    seo: {
      seoTitle: normalized.seo.seoTitle,
      metaDescription: normalized.seo.metaDescription,
      canonicalPath: normalized.seo.canonicalPath,
      ogTitle: normalized.seo.ogTitle,
      ogDescription: normalized.seo.ogDescription,
      ogImage: normalized.seo.ogImage,
      ogType: 'article',
      schemaType: 'Article',
      indexing: normalized.seo.indexing,
      noindex: normalized.seo.noindex,
    },
    category: normalized.category,
    featured: Boolean(normalized.featured),
    topics: normalized.topics as ArticleTopicId[],
    recipients: (normalized.recipients || []) as RecipientType[],
    occasions: (normalized.occasions || []) as OccasionType[],
    publishedAt: normalized.publishedAt,
    updatedAt: normalized.updatedAt,
    readTimeMinutes:
      typeof normalized.readTimeMinutes === 'number'
        ? normalized.readTimeMinutes
        : undefined,
    authorId,
    heroImageUrl: normalized.heroImage.url,
    heroAlt: normalized.heroImage.alt,
    heroCaption: normalized.heroImage.caption || '',
    executiveSummary: normalized.executiveSummary,
    sections,
    bodyPortableText: normalized.bodyPortableText,
    ...(normalized.pullQuote ? { pullQuote: normalized.pullQuote } : {}),
    citationIds,
    relatedGuideIds:
      relatedGuideIds.length > 0
        ? relatedGuideIds
        : [GIFT_GUIDES[0]?.id || 'guide_little_things_2026'],
  };
}

/**
 * Converts a local Astro `Article` into a Sanity `article` draft document (`drafts.<id>`).
 */
export function convertLocalArticleToSanityDraft(
  article: Article
): Record<string, any> & {
  _id: string;
  _type: 'article';
  status: 'draft';
} {
  const canonicalId = article.id.replace(/^drafts\./, '');
  const normalized = normalizeSanityArticleDocumentBackwardCompatible({
    _id: `drafts.${canonicalId}`,
    _type: 'article',
    id: canonicalId,
    title: article.title,
    subtitle: article.subtitle,
    slug: { _type: 'slug', current: article.slug },
    status: 'draft',
    featured: Boolean(article.featured),
    category: article.category,
    topics: article.topics || ['gift-giving-psychology'],
    recipients: article.recipients || [],
    occasions: article.occasions || [],
    author: { _type: 'reference', _ref: article.authorId, _weak: true },
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    readTimeMinutes: article.readTimeMinutes,
    heroImage: {
      _type: 'editorialImage',
      url: article.heroImageUrl,
      externalUrl: article.heroImageUrl,
      alt: article.heroAlt,
      caption: article.heroCaption,
    },
    executiveSummary: article.executiveSummary,
    pullQuote: article.pullQuote
      ? {
          _type: 'articlePullQuote',
          text: article.pullQuote.text,
          attribution: article.pullQuote.attribution,
        }
      : undefined,
    sections: article.sections.map((sec) => ({
      _type: 'articleContentSection',
      _key: sec.id,
      id: sec.id,
      heading: sec.heading,
      subheading: sec.subheading,
      paragraphs: sec.paragraphs,
      portableTextBody:
        sec.portableTextBody && sec.portableTextBody.length > 0
          ? sec.portableTextBody
          : paragraphsToPortableText(sec.paragraphs, {
              images: sec.images,
              callout: sec.callout,
            }),
      images: sec.images,
      callout: sec.callout,
      contextualProducts: sec.contextualProducts
        ? {
            _type: 'articleContextualProductGroup',
            heading: sec.contextualProducts.heading,
            editorialContext: sec.contextualProducts.editorialContext,
            products: sec.contextualProducts.productIds.map((pid, idx) => ({
              _type: 'reference',
              _key: `prod_ref_${idx}_${pid}`,
              _ref: pid,
              _weak: true,
            })),
          }
        : undefined,
    })),
    citations: article.citationIds.map((cid, idx) => ({
      _type: 'reference',
      _key: `cit_ref_${idx}_${cid}`,
      _ref: cid,
      _weak: true,
    })),
    relatedGuides: (article.relatedGuideIds || []).map((gid, idx) => ({
      _type: 'reference',
      _key: `guide_ref_${idx}_${gid}`,
      _ref: gid,
      _weak: true,
    })),
    seo: article.seo,
  });

  return {
    ...normalized,
    status: 'draft',
  };
}
