/**
 * Site-Wide Editorial & Product Search Engine
 *
 * Provides a lightweight, static search index builder and fast client-side
 * search ranking engine across:
 *   1. Gift Guides (`type: 'guide'`)
 *   2. Stories / Editorial Articles (`type: 'article'`)
 *   3. Products (`type: 'product'`)
 *   4. Categories & Discovery Hubs (`type: 'category'`)
 *
 * Architectural & Publication Safety Rules:
 * - Never includes `status === 'draft'` guides, articles, or products.
 * - In strict public mode (`includeDevSampleProducts: false`), sample/placeholder
 *   products (`isPlaceholderLink === true` or `isSampleProduct === true`) and
 *   unready editorial hubs are excluded from search results.
 * - In development preview mode (`includeDevSampleProducts: true`), sample preview
 *   products and preview hubs are indexed with `isSamplePreview: true` so search
 *   can be tested end-to-end during development while clearly labeled.
 * - Prioritizes title matches over subtitle, category, taxonomy/keyword, and
 *   description matches.
 * - Separate from the Gift Finder recommendation engine (`/gift-finder/`).
 */

import { contentRepository } from '../cms/contentRepository';
import {
  CatalogDataOverride,
  evaluateEditorialHubReadiness,
  evaluateProductCommerceReadiness,
} from './seoAndValidation';

export type SiteSearchItemType = 'guide' | 'article' | 'product' | 'category';

export interface SiteSearchItem {
  id: string;
  type: SiteSearchItemType;
  title: string;
  subtitle: string;
  description: string;
  url: string;
  categoryLabel: string;
  keywords: string[];
  imageUrl?: string;
  imageAlt?: string;
  price?: number;
  currency?: string;
  vendor?: string;
  readTimeMinutes?: number;
  picksCount?: number;
  featured?: boolean;
  /**
   * True when the item is a development sample preview product or preview hub
   * that is excluded in strict public production mode.
   */
  isSamplePreview?: boolean;
}

export interface SiteSearchScoredItem extends SiteSearchItem {
  score: number;
  matchedInTitle: boolean;
}

export interface SiteSearchGroupedResults {
  query: string;
  normalizedQuery: string;
  totalCount: number;
  guides: SiteSearchScoredItem[];
  articles: SiteSearchScoredItem[];
  products: SiteSearchScoredItem[];
  categories: SiteSearchScoredItem[];
  totalGuides: number;
  totalArticles: number;
  totalProducts: number;
  totalCategories: number;
}

export interface BuildSiteSearchIndexOptions {
  catalog?: CatalogDataOverride;
  /**
   * When false (strict public production mode), excludes sample/placeholder products
   * (`isPlaceholderLink === true` or `isSampleProduct === true`).
   * When true (development preview mode), includes non-draft sample products with
   * `isSamplePreview: true` so product search can be tested safely.
   */
  includeDevSampleProducts?: boolean;
  /**
   * When true, includes development preview Editorial Discovery Hubs (`Gifts for Him`,
   * `Gifts for Her`) marked with `isSamplePreview: true` if not yet publication-ready.
   * When false (strict public mode), only includes hubs that pass `evaluateEditorialHubReadiness`.
   */
  includeDevEditorialHubs?: boolean;
}

export interface QuerySiteSearchOptions {
  /**
   * Whether to include items flagged `isSamplePreview: true` in the returned results.
   * Defaults to `true` in development preview, and can be set to `false` to enforce
   * strict public production filtering on a shared index payload.
   */
  includeSampleProducts?: boolean;
  /**
   * Maximum items returned per content-type group. Defaults to 6.
   */
  limitPerGroup?: number;
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'this',
  'to',
  'with',
]);

/**
 * Normalizes a search string into lowercase alphanumeric text with single spaces.
 */
export function normalizeSearchText(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9$]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Tokenizes a normalized search string into distinct search terms.
 */
export function tokenizeSearchQuery(rawQuery: string): {
  normalizedQuery: string;
  tokens: string[];
} {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) {
    return { normalizedQuery: '', tokens: [] };
  }
  const rawTokens = normalizedQuery.split(' ').filter(Boolean);
  const nonStopTokens = rawTokens.filter(
    (token) => token.length > 1 && !STOP_WORDS.has(token)
  );
  const tokens =
    nonStopTokens.length > 0
      ? Array.from(new Set(nonStopTokens))
      : Array.from(new Set(rawTokens));
  return { normalizedQuery, tokens };
}

/**
 * Builds the compact, serializable site-wide search index from the content repository
 * or a provided catalog snapshot.
 */
export function buildSiteSearchIndex(
  options?: BuildSiteSearchIndexOptions
): SiteSearchItem[] {
  const includeDevSampleProducts = options?.includeDevSampleProducts ?? false;
  const includeDevEditorialHubs =
    options?.includeDevEditorialHubs ?? includeDevSampleProducts;

  const catalog: CatalogDataOverride =
    options?.catalog ??
    contentRepository.getCatalogSnapshot({ includeDrafts: false });

  const items: SiteSearchItem[] = [];

  // 1. Published Gift Guides (never include drafts)
  for (const guide of catalog.guides ?? []) {
    if (guide.status === 'draft') continue;
    if (guide.seo?.noindex) continue;

    const allGuideRecs = (guide.sections ?? []).flatMap(
      (section) => section.recommendations ?? []
    );
    const guideProductKeywords: string[] = [];
    for (const rec of allGuideRecs) {
      const prod = catalog.products?.[rec.productId];
      if (prod && prod.status !== 'draft') {
        guideProductKeywords.push(
          prod.title,
          prod.productType,
          ...(prod.interests ?? [])
        );
      }
    }

    const introDesc =
      guide.curationSummary ||
      guide.introParagraphs?.[0] ||
      guide.subtitle ||
      '';

    items.push({
      id: `guide:${guide.id}`,
      type: 'guide',
      title: guide.title,
      subtitle: guide.subtitle,
      description: introDesc.slice(0, 180),
      url: `/gift-guides/${guide.slug}/`,
      categoryLabel: guide.category || 'Gift Guide',
      keywords: Array.from(
        new Set([
          guide.category,
          ...(guide.recipients ?? []),
          ...(guide.occasions ?? []),
          ...(guide.interests ?? []),
          ...(guide.topics ?? []),
          ...guideProductKeywords,
        ])
      ).filter(Boolean),
      imageUrl: guide.heroImageUrl,
      imageAlt: guide.heroImageAlt,
      readTimeMinutes: guide.readTimeMinutes,
      picksCount: allGuideRecs.length,
      featured: guide.featured,
      isSamplePreview: false,
    });
  }

  // 2. Published Stories / Editorial Articles (never include drafts)
  for (const article of catalog.articles ?? []) {
    if (article.status === 'draft') continue;
    if (article.seo?.noindex) continue;

    items.push({
      id: `article:${article.id}`,
      type: 'article',
      title: article.title,
      subtitle: article.subtitle,
      description:
        article.executiveSummary?.[0] ??
        article.subtitle ??
        'Research-informed story on thoughtful gift giving.',
      url: `/articles/${article.slug}/`,
      categoryLabel: article.category || 'Story',
      keywords: Array.from(
        new Set([
          article.category,
          ...(article.topics ?? []),
          ...(article.recipients ?? []),
          ...(article.occasions ?? []),
          ...(article.executiveSummary ?? []),
        ])
      ).filter(Boolean),
      imageUrl: article.heroImageUrl,
      imageAlt: article.heroAlt,
      readTimeMinutes: article.readTimeMinutes,
      featured: article.featured,
      isSamplePreview: false,
    });
  }

  // 3. Categories, Topic Archives, and Editorial Discovery Hubs
  const guidesDirData = contentRepository.getGiftGuidesDirectoryData();
  const articlesDirData = contentRepository.getArticlesDirectoryData();

  for (const recCat of guidesDirData.recipientDiscovery) {
    items.push({
      id: `category:recipient:${recCat.slug}`,
      type: 'category',
      title: `Gifts for ${recCat.label}`,
      subtitle: recCat.description,
      description: `Recipient category archive with ${recCat.matchingGuides.length} curated ${
        recCat.matchingGuides.length === 1 ? 'guide' : 'guides'
      }.`,
      url: recCat.archiveHref,
      categoryLabel: 'Recipient Category',
      keywords: [
        recCat.label,
        recCat.recipient,
        'recipient',
        'gift guides',
        ...recCat.matchingGuides.map((g) => g.guide.title),
      ],
      isSamplePreview: false,
    });
  }

  for (const intCat of guidesDirData.interestDiscovery) {
    items.push({
      id: `category:interest:${intCat.slug}`,
      type: 'category',
      title: `${intCat.interest} Gifts & Guides`,
      subtitle: intCat.description,
      description: `Interest category archive for ${intCat.interest.toLowerCase()}.`,
      url: intCat.archiveHref,
      categoryLabel: 'Interest Category',
      keywords: [
        intCat.interest,
        intCat.slug,
        'interest',
        'hobby',
        'gift guides',
      ],
      isSamplePreview: false,
    });
  }

  for (const occCat of guidesDirData.occasionDiscovery) {
    items.push({
      id: `category:occasion:${occCat.slug}`,
      type: 'category',
      title: `${occCat.label} Gift Guides`,
      subtitle: occCat.description,
      description: `Occasion category archive for ${occCat.label.toLowerCase()} gifting.`,
      url: occCat.archiveHref,
      categoryLabel: 'Occasion Category',
      keywords: [
        occCat.label,
        occCat.occasion,
        'occasion',
        'celebration',
        'gift guides',
      ],
      isSamplePreview: false,
    });
  }

  for (const topicCat of articlesDirData.topicDiscovery) {
    items.push({
      id: `category:topic:${topicCat.slug}`,
      type: 'category',
      title: `${topicCat.label} Stories`,
      subtitle: topicCat.description,
      description: `Editorial stories and behavioral research on ${topicCat.label.toLowerCase()}.`,
      url: topicCat.archiveHref,
      categoryLabel: 'Story Topic',
      keywords: [
        topicCat.label,
        topicCat.id,
        'stories',
        'research',
        'psychology',
      ],
      isSamplePreview: false,
    });
  }

  // Editorial Discovery Hubs (Gifts for Him / Gifts for Her)
  const allHubs = contentRepository.getAllEditorialHubs({
    includeDrafts: true,
  });
  for (const hub of allHubs) {
    const readiness = evaluateEditorialHubReadiness(hub, catalog);
    const isPubliclyReady = readiness.isReadyToPublish && readiness.isIndexable;

    if (!isPubliclyReady && !includeDevEditorialHubs) {
      continue;
    }

    const hubLeadDesc =
      hub.introParagraphs?.[0] ??
      hub.editorialLeadParagraphs?.[0] ??
      hub.subtitle;

    items.push({
      id: `category:hub:${hub.slug}`,
      type: 'category',
      title: hub.title,
      subtitle: hub.subtitle,
      description: hubLeadDesc,
      url: hub.routePath,
      categoryLabel: 'Editorial Discovery Hub',
      keywords: Array.from(
        new Set([
          hub.title,
          hub.slug.replace(/-/g, ' '),
          ...hub.relationshipPathways.map((r) => r.label),
          ...hub.relationshipPathways
            .map((r) => r.shortLabel)
            .filter((s): s is string => Boolean(s)),
          ...(hub.interestSlugs ?? []).map((s) => s.replace(/-/g, ' ')),
        ])
      ),
      imageUrl: hub.heroImage?.url,
      imageAlt: hub.heroImage?.alt,
      isSamplePreview: !isPubliclyReady,
    });
  }

  // 4. Products (never include drafts; gate sample/placeholder products in public mode)
  const productsMap = catalog.products ?? {};
  for (const product of Object.values(productsMap)) {
    if (!product || product.status === 'draft') continue;
    if (product.seo?.noindex) continue;

    const readiness = evaluateProductCommerceReadiness(product);
    if (readiness.isSampleOrPlaceholderProduct && !includeDevSampleProducts) {
      continue;
    }

    const cleanVendor = (product.vendor || '')
      .replace(/^Sample Maker:\s*/i, '')
      .trim();

    items.push({
      id: `product:${product.id}`,
      type: 'product',
      title: product.title,
      subtitle: product.subtitle,
      description:
        product.bestForSummary || product.whyToGiveIt || product.subtitle,
      url: `/products/${product.slug}/`,
      categoryLabel: product.productType || cleanVendor || 'Product Profile',
      keywords: Array.from(
        new Set([
          cleanVendor,
          product.productType,
          product.calloutTag ?? '',
          ...(product.interests ?? []),
          ...(product.recipients ?? []),
          ...(product.occasions ?? []),
          ...(product.personalityTraits ?? []),
        ])
      ).filter(Boolean),
      imageUrl: product.images?.[0]?.url,
      imageAlt: product.images?.[0]?.alt || product.title,
      price: product.price,
      currency: product.currency,
      vendor: cleanVendor,
      isSamplePreview: readiness.isSampleOrPlaceholderProduct,
    });
  }

  return items;
}

/**
 * Scores a single search item against a normalized query and its tokens.
 * Strictly prioritizes title matches over subtitle, category, keyword, and description matches.
 */
function scoreSearchItem(
  item: SiteSearchItem,
  normalizedQuery: string,
  tokens: string[]
): { score: number; matchedInTitle: boolean } {
  const normTitle = normalizeSearchText(item.title);
  const normSubtitle = normalizeSearchText(item.subtitle);
  const normCategory = normalizeSearchText(item.categoryLabel);
  const normVendor = normalizeSearchText(item.vendor ?? '');
  const normKeywords = normalizeSearchText(item.keywords.join(' '));
  const normDescription = normalizeSearchText(item.description);

  const titleWords = normTitle.split(' ').filter(Boolean);

  let score = 0;
  let matchedInTitle = false;

  // Phrase-level boosts in Title
  if (normTitle === normalizedQuery) {
    score += 1200;
    matchedInTitle = true;
  } else if (normTitle.startsWith(normalizedQuery)) {
    score += 750;
    matchedInTitle = true;
  } else if (normTitle.includes(normalizedQuery)) {
    score += 520;
    matchedInTitle = true;
  }

  // Phrase-level boosts in Secondary fields
  if (
    normCategory.includes(normalizedQuery) ||
    normVendor.includes(normalizedQuery)
  ) {
    score += 140;
  }
  if (normSubtitle.includes(normalizedQuery)) {
    score += 110;
  }
  if (normKeywords.includes(normalizedQuery)) {
    score += 95;
  }
  if (normDescription.includes(normalizedQuery)) {
    score += 45;
  }

  // Per-token evaluation
  let matchedTokensCount = 0;

  for (const token of tokens) {
    let tokenMatched = false;

    // 1. Check Title (Highest Priority)
    if (titleWords.includes(token)) {
      score += 220;
      matchedInTitle = true;
      tokenMatched = true;
    } else if (titleWords.some((w) => w.startsWith(token))) {
      score += 160;
      matchedInTitle = true;
      tokenMatched = true;
    } else if (normTitle.includes(token)) {
      score += 105;
      matchedInTitle = true;
      tokenMatched = true;
    }

    // 2. Check Category / Vendor
    if (normCategory.includes(token) || normVendor.includes(token)) {
      score += 55;
      tokenMatched = true;
    }

    // 3. Check Subtitle
    if (normSubtitle.includes(token)) {
      score += 45;
      tokenMatched = true;
    }

    // 4. Check Keywords / Taxonomy
    if (normKeywords.includes(token)) {
      score += 40;
      tokenMatched = true;
    }

    // 5. Check Description
    if (normDescription.includes(token)) {
      score += 20;
      tokenMatched = true;
    }

    if (tokenMatched) {
      matchedTokensCount += 1;
    }
  }

  // Require all search tokens to match at least one field on the item
  if (matchedTokensCount < tokens.length) {
    return { score: 0, matchedInTitle: false };
  }

  // Slight editorial boost for featured guides/articles when scores are otherwise tied
  if (item.featured) {
    score += 5;
  }

  return { score, matchedInTitle };
}

/**
 * Searches the site-wide index and returns results grouped by content type:
 * - Gift Guides
 * - Stories
 * - Products
 * - Categories
 */
export function querySiteSearchIndex(
  index: SiteSearchItem[],
  rawQuery: string,
  options?: QuerySiteSearchOptions
): SiteSearchGroupedResults {
  const { normalizedQuery, tokens } = tokenizeSearchQuery(rawQuery);
  const includeSampleProducts = options?.includeSampleProducts ?? true;
  const limitPerGroup = options?.limitPerGroup ?? 6;

  if (!normalizedQuery || tokens.length === 0) {
    return {
      query: rawQuery,
      normalizedQuery: '',
      totalCount: 0,
      guides: [],
      articles: [],
      products: [],
      categories: [],
      totalGuides: 0,
      totalArticles: 0,
      totalProducts: 0,
      totalCategories: 0,
    };
  }

  const guides: SiteSearchScoredItem[] = [];
  const articles: SiteSearchScoredItem[] = [];
  const products: SiteSearchScoredItem[] = [];
  const categories: SiteSearchScoredItem[] = [];

  for (const item of index) {
    if (!includeSampleProducts && item.isSamplePreview) {
      continue;
    }

    const { score, matchedInTitle } = scoreSearchItem(
      item,
      normalizedQuery,
      tokens
    );
    if (score <= 0) continue;

    const scoredItem: SiteSearchScoredItem = {
      ...item,
      score,
      matchedInTitle,
    };

    if (item.type === 'guide') {
      guides.push(scoredItem);
    } else if (item.type === 'article') {
      articles.push(scoredItem);
    } else if (item.type === 'product') {
      products.push(scoredItem);
    } else if (item.type === 'category') {
      categories.push(scoredItem);
    }
  }

  const sortByScoreAndTitle = (
    a: SiteSearchScoredItem,
    b: SiteSearchScoredItem
  ) => {
    if (a.matchedInTitle !== b.matchedInTitle) {
      return a.matchedInTitle ? -1 : 1;
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.title.localeCompare(b.title);
  };

  guides.sort(sortByScoreAndTitle);
  articles.sort(sortByScoreAndTitle);
  products.sort(sortByScoreAndTitle);
  categories.sort(sortByScoreAndTitle);

  const totalGuides = guides.length;
  const totalArticles = articles.length;
  const totalProducts = products.length;
  const totalCategories = categories.length;

  return {
    query: rawQuery,
    normalizedQuery,
    totalCount: totalGuides + totalArticles + totalProducts + totalCategories,
    guides: guides.slice(0, limitPerGroup),
    articles: articles.slice(0, limitPerGroup),
    products: products.slice(0, limitPerGroup),
    categories: categories.slice(0, limitPerGroup),
    totalGuides,
    totalArticles,
    totalProducts,
    totalCategories,
  };
}
