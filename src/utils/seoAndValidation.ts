import {
  ARTICLES,
  AUTHORS,
  CITATIONS,
  GIFT_GUIDES,
  PRODUCTS,
} from '../data/catalog';
import {
  Article,
  Author,
  ContentPublishStatus,
  DirectoryOrCategorySEOEntry,
  EditorialHubConfig,
  GiftGuide,
  PlannedRedirectMapping,
  Product,
  ResearchCitation,
  RobotsIndexingDirective,
  SEOConfig,
  ValidationIssue,
} from '../types/content';
import { validateProductImagesForProduct } from './productImageDelivery';

export interface CatalogDataOverride {
  products?: Record<string, Product>;
  citations?: Record<string, ResearchCitation>;
  authors?: Record<string, Author>;
  guides?: GiftGuide[];
  articles?: Article[];
}

export const SITE_ORIGIN = 'https://www.scienceofgifts.com';
export const SITE_NAME = 'Science of Gifts';
export const ALLOWED_CANONICAL_HOSTS = [
  'www.scienceofgifts.com',
  'scienceofgifts.com',
] as const;
export const DEFAULT_OG_IMAGE_URL =
  'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1400&q=80';

/**
 * Recorded redirect mappings for legacy production URLs (/gifts-for-men/ and /gifts-for-women/)
 * to be applied when the planned editorial hubs (/gifts-for-him/ and /gifts-for-her/) launch.
 * Kept as a recorded launch specification (`applyOnLaunchOnly: true`) so existing live URLs
 * are documented and protected against silent migration breakage without prematurely redirecting now.
 */
export const PLANNED_LAUNCH_REDIRECT_MAPPINGS: PlannedRedirectMapping[] = [
  {
    fromPath: '/gifts-for-men/',
    toPath: '/gifts-for-him/',
    statusCode: 301,
    applyOnLaunchOnly: true,
    reason:
      'Preserve existing live production URL /gifts-for-men/ when launching the /gifts-for-him/ editorial hub.',
  },
  {
    fromPath: '/gifts-for-women/',
    toPath: '/gifts-for-her/',
    statusCode: 301,
    applyOnLaunchOnly: true,
    reason:
      'Preserve existing live production URL /gifts-for-women/ when launching the /gifts-for-her/ editorial hub.',
  },
];

export interface ProductCommerceReadiness {
  isSampleOrPlaceholderProduct: boolean;
  hasVerifiedMerchantUrl: boolean;
  hasVerifiedPrice: boolean;
  hasVerifiedInventoryAvailability: boolean;
  canEmitStructuredOffer: boolean;
  canIndexProductPage: boolean;
  reasons: string[];
}

/**
 * Evaluates whether a Product record represents a development sample/placeholder or a
 * verified production product, and determines whether it is eligible for search indexing
 * and Schema.org Offer structured data.
 */
export function evaluateProductCommerceReadiness(
  product: Product
): ProductCommerceReadiness {
  const reasons: string[] = [];
  const rawUrl = (product.purchaseUrl || '').trim();
  const isHttpsUrl = rawUrl.startsWith('https://');
  const isExampleOrDevPlaceholderUrl =
    /^https?:\/\/(www\.)?example\.(com|org|net)\b/i.test(rawUrl) ||
    rawUrl.includes('/dev-placeholder/');
  const isPlaceholderUrl =
    !isHttpsUrl ||
    Boolean(product.isPlaceholderLink) ||
    isExampleOrDevPlaceholderUrl;

  const isSampleVendor = /^sample\s+maker\b/i.test(
    (product.vendor || '').trim()
  );
  const isSampleOrPlaceholderProduct = Boolean(
    product.isSampleProduct || isPlaceholderUrl || isSampleVendor
  );

  if (product.isSampleProduct) {
    reasons.push('Product is marked isSampleProduct = true.');
  }
  if (product.isPlaceholderLink || isExampleOrDevPlaceholderUrl) {
    reasons.push(
      'Product uses a development placeholder purchase URL (isPlaceholderLink / example.com / /dev-placeholder/).'
    );
  }
  if (isSampleVendor) {
    reasons.push('Product vendor is a development "Sample Maker" label.');
  }

  const hasVerifiedMerchantUrl = !isPlaceholderUrl;
  const hasVerifiedPrice =
    !isSampleOrPlaceholderProduct &&
    typeof product.price === 'number' &&
    Number.isFinite(product.price) &&
    product.price > 0 &&
    product.priceVerified !== false;

  if (!hasVerifiedPrice && !isSampleOrPlaceholderProduct) {
    reasons.push('Product price is missing or explicitly marked unverified.');
  }

  // Never assert Schema.org InStock/OutOfStock from sample catalog booleans;
  // require explicit inventoryVerified === true on a non-sample product.
  const hasVerifiedInventoryAvailability =
    !isSampleOrPlaceholderProduct &&
    product.inventoryVerified === true &&
    typeof product.inStock === 'boolean';

  const canEmitStructuredOffer =
    !isSampleOrPlaceholderProduct && hasVerifiedMerchantUrl && hasVerifiedPrice;

  const canIndexProductPage =
    product.status !== 'draft' &&
    canEmitStructuredOffer &&
    product.seo?.noindex !== true &&
    product.seo?.indexing !== 'noindex,follow';

  return {
    isSampleOrPlaceholderProduct,
    hasVerifiedMerchantUrl,
    hasVerifiedPrice,
    hasVerifiedInventoryAvailability,
    canEmitStructuredOffer,
    canIndexProductPage,
    reasons,
  };
}

const INLINE_CITE_REGEX = /\[cite:([a-zA-Z0-9_]+)\]/g;

export function extractInlineCitationIds(text: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(INLINE_CITE_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

export function stripInlineCitationTokens(text: string): string {
  return text.replace(INLINE_CITE_REGEX, '');
}

/**
 * Normalizes an internal canonical path so that:
 * - Query strings and hash fragments are stripped (preventing filter/search duplicate URLs)
 * - Cross-domain URLs (e.g., shop.scienceofgifts.com or external merchants) are rejected
 * - Leading and trailing slashes follow the site's static directory convention (`/path/to/page/`, `/` for root)
 */
export function normalizeCanonicalPath(
  rawPathOrUrl: string | undefined | null,
  fallbackPath = '/'
): {
  canonicalPath: string;
  rejectedCrossDomainOverride: boolean;
} {
  const cleanFallback = ensureNormalizedPathname(fallbackPath || '/');
  if (!rawPathOrUrl || !rawPathOrUrl.trim()) {
    return {
      canonicalPath: cleanFallback,
      rejectedCrossDomainOverride: false,
    };
  }

  const trimmed = rawPathOrUrl.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (
        !ALLOWED_CANONICAL_HOSTS.includes(
          host as (typeof ALLOWED_CANONICAL_HOSTS)[number]
        )
      ) {
        return {
          canonicalPath: cleanFallback,
          rejectedCrossDomainOverride: true,
        };
      }
      return {
        canonicalPath: ensureNormalizedPathname(parsed.pathname),
        rejectedCrossDomainOverride: false,
      };
    } catch {
      return {
        canonicalPath: cleanFallback,
        rejectedCrossDomainOverride: true,
      };
    }
  }

  if (trimmed.startsWith('//')) {
    return {
      canonicalPath: cleanFallback,
      rejectedCrossDomainOverride: true,
    };
  }

  // Strip query parameters and fragments
  const withoutHash = trimmed.split('#')[0] || '/';
  const pathnameOnly = withoutHash.split('?')[0] || '/';

  return {
    canonicalPath: ensureNormalizedPathname(pathnameOnly),
    rejectedCrossDomainOverride: false,
  };
}

function ensureNormalizedPathname(pathname: string): string {
  let clean = pathname.trim();
  if (!clean.startsWith('/')) {
    clean = `/${clean}`;
  }
  clean = clean.replace(/\/{2,}/g, '/');
  if (clean === '/') {
    return '/';
  }
  // Preserve explicit file extensions such as .xml or .txt
  if (/\.[a-z0-9]{2,5}$/i.test(clean)) {
    return clean;
  }
  if (!clean.endsWith('/')) {
    clean = `${clean}/`;
  }
  return clean;
}

export function resolveCanonicalUrl(
  pathOrOverride?: string | null,
  fallbackPath = '/',
  siteOrigin = SITE_ORIGIN
): {
  canonicalPath: string;
  canonicalUrl: string;
  rejectedCrossDomainOverride: boolean;
} {
  const { canonicalPath, rejectedCrossDomainOverride } = normalizeCanonicalPath(
    pathOrOverride,
    fallbackPath
  );
  const normalizedOrigin = siteOrigin.replace(/\/+$/, '');
  return {
    canonicalPath,
    canonicalUrl: `${normalizedOrigin}${canonicalPath}`,
    rejectedCrossDomainOverride,
  };
}

/**
 * Generates a clean, accurate default SEO title from the visible on-page title
 * without automatically injecting the current year or unverified item counts,
 * and without duplicating "| Science of Gifts" if the brand name is already present.
 */
export function buildDefaultSeoTitle(
  onPageTitle: string,
  options?: {
    vendor?: string;
    contentType?:
      | 'guide'
      | 'article'
      | 'product'
      | 'directory'
      | 'category'
      | 'page';
    siteName?: string;
  }
): string {
  const siteName = options?.siteName ?? SITE_NAME;
  const cleanTitle = stripInlineCitationTokens(onPageTitle || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanTitle) {
    return siteName;
  }

  const lowerTitle = cleanTitle.toLowerCase();
  const lowerSite = siteName.toLowerCase();
  if (lowerTitle.includes(lowerSite)) {
    return cleanTitle;
  }

  if (options?.contentType === 'product' && options.vendor) {
    const cleanVendor = options.vendor.trim();
    const includesVendor =
      cleanVendor.length > 0 &&
      lowerTitle.includes(cleanVendor.toLowerCase());
    const baseProductTitle = includesVendor
      ? `${cleanTitle} — Gift Review`
      : `${cleanTitle} by ${cleanVendor} — Gift Review`;
    return `${baseProductTitle} | ${siteName}`;
  }

  return `${cleanTitle} | ${siteName}`;
}

/**
 * Generates a clean default meta description from existing summary or introductory copy
 * without cutting sentences mid-word or fabricating product claims.
 */
export function buildDefaultMetaDescription(
  summarySource?: string | null,
  fallbackText?: string
): string {
  const raw = stripInlineCitationTokens(
    (summarySource && summarySource.trim()) || fallbackText || ''
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw) {
    return 'Discover thoughtful gift guides, behavioral gifting stories, and curated objects from Science of Gifts.';
  }

  if (raw.length <= 165) {
    return raw;
  }

  // Prefer whole sentences that fit within 165 characters
  const sentences = raw.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    let accumulated = '';
    for (const sentence of sentences) {
      const candidate = accumulated
        ? `${accumulated} ${sentence.trim()}`
        : sentence.trim();
      if (candidate.length <= 165) {
        accumulated = candidate;
      } else {
        break;
      }
    }
    if (accumulated.length >= 65) {
      return accumulated;
    }
  }

  // Fallback: trim cleanly at the last word boundary before 160 chars
  const slice = raw.slice(0, 160);
  const lastSpace = slice.lastIndexOf(' ');
  const wordSafe = lastSpace > 80 ? slice.slice(0, lastSpace) : slice;
  return `${wordSafe.replace(/[,;:\-–—\s]+$/, '')}…`;
}

/**
 * Returns non-blocking editorial length guidance warnings for SEO titles and meta descriptions.
 * Never blocks saving or rendering.
 */
export function evaluateSeoLengthGuidance(
  seoTitle: string,
  metaDescription: string
): string[] {
  const warnings: string[] = [];
  const titleLen = seoTitle.trim().length;
  const descLen = metaDescription.trim().length;

  if (titleLen > 0 && titleLen < 25) {
    warnings.push(
      `SEO title is ${titleLen} characters (recommended 35–65 characters for fuller search result context).`
    );
  } else if (titleLen > 75) {
    warnings.push(
      `SEO title is ${titleLen} characters (titles over ~65–70 characters may be truncated in search results).`
    );
  }

  if (descLen > 0 && descLen < 60) {
    warnings.push(
      `Meta description is ${descLen} characters (recommended 110–160 characters for descriptive search snippets).`
    );
  } else if (descLen > 175) {
    warnings.push(
      `Meta description is ${descLen} characters (descriptions over ~160–165 characters may be truncated in search snippets).`
    );
  }

  return warnings;
}

export interface ResolvePageSeoInput {
  /** Visible on-page H1 heading. Changing seoTitle never mutates this value. */
  onPageTitle: string;
  /** Visible subtitle, dek, or introductory summary used for fallback metaDescription. */
  subtitleOrSummary?: string;
  /** Optional explicit SEO configuration from the content record or category entry. */
  seo?: Partial<SEOConfig>;
  /** Default canonical path for this route when no valid custom canonicalPath is set. */
  defaultCanonicalPath: string;
  /** Default OpenGraph type ('website' | 'article' | 'product'). */
  defaultOgType?: 'website' | 'article' | 'product';
  /** Default OpenGraph image URL (e.g. guide/article hero image or product primary image). */
  defaultOgImage?: string;
  /** Content classification for intelligent default title formatting. */
  contentType?:
    | 'guide'
    | 'article'
    | 'product'
    | 'directory'
    | 'category'
    | 'page';
  /** Maker / brand name when contentType === 'product'. */
  vendor?: string;
  /** Optional product record when contentType === 'product' to enforce sample/placeholder non-indexing. */
  product?: Product;
  /** Whether a product record is a development sample or has unverified commerce data. */
  isSampleOrUnverifiedProduct?: boolean;
  /** Publication status ('published' | 'draft'). Draft pages automatically resolve to noindex. */
  status?: ContentPublishStatus;
  /** Explicit page-level noindex flag (e.g. /dev/theme-lab/). */
  forceNoindex?: boolean;
  /** Whether URL query parameters for search/filtering are active. */
  hasSearchOrFilterParams?: boolean;
  /** Optional site origin override. */
  siteOrigin?: string;
}

export interface ResolvedPageSeoMetadata {
  /** Visible on-page H1 heading (strictly decoupled from seoTitle). */
  onPageTitle: string;
  /** Resolved HTML <title> tag value. */
  seoTitle: string;
  /** Resolved <meta name="description"> value. */
  metaDescription: string;
  /** Normalized canonical path (always starts and ends with '/', strips query strings). */
  canonicalPath: string;
  /** Full canonical URL (siteOrigin + canonicalPath). */
  canonicalUrl: string;
  /** Resolved OpenGraph title (uses custom ogTitle if provided, else seoTitle). */
  ogTitle: string;
  /** Resolved OpenGraph description (uses custom ogDescription if provided, else metaDescription). */
  ogDescription: string;
  /** Resolved OpenGraph image URL. */
  ogImage: string;
  /** Resolved OpenGraph type. */
  ogType: 'website' | 'article' | 'product';
  /** Twitter card type ('summary_large_image'). */
  twitterCard: 'summary_large_image';
  /** Resolved robots directive string for <meta name="robots">. */
  robots: 'index, follow' | 'noindex, follow';
  /** Normalized indexing token ('index,follow' | 'noindex,follow'). */
  indexing: RobotsIndexingDirective;
  /** Boolean flag indicating whether the page is marked noindex. */
  noindex: boolean;
  /** Whether noindex was applied because the page is a development sample/placeholder product preview. */
  isSampleProductPreview: boolean;
  /** Publication status ('published' | 'draft'). */
  status: ContentPublishStatus;
  /** Whether a cross-domain canonical override was blocked. */
  rejectedCrossDomainOverride: boolean;
  /** Non-blocking editorial guidance warnings. */
  warnings: string[];
}

export function resolvePageSeoMetadata(
  input: ResolvePageSeoInput
): ResolvedPageSeoMetadata {
  const siteOrigin = input.siteOrigin ?? SITE_ORIGIN;
  const status: ContentPublishStatus =
    input.status ?? input.product?.status ?? 'published';

  const customSeoTitle = input.seo?.seoTitle?.trim();
  const seoTitle =
    customSeoTitle && customSeoTitle.length > 0
      ? customSeoTitle
      : buildDefaultSeoTitle(input.onPageTitle, {
          vendor: input.vendor ?? input.product?.vendor,
          contentType: input.contentType,
        });

  const customMetaDesc = input.seo?.metaDescription?.trim();
  const metaDescription =
    customMetaDesc && customMetaDesc.length > 0
      ? customMetaDesc
      : buildDefaultMetaDescription(
          input.subtitleOrSummary,
          input.onPageTitle
        );

  const { canonicalPath, canonicalUrl, rejectedCrossDomainOverride } =
    resolveCanonicalUrl(
      input.seo?.canonicalPath,
      input.defaultCanonicalPath,
      siteOrigin
    );

  const ogTitle = input.seo?.ogTitle?.trim() || seoTitle;
  const ogDescription = input.seo?.ogDescription?.trim() || metaDescription;
  const ogImage =
    input.seo?.ogImage?.trim() ||
    input.defaultOgImage?.trim() ||
    DEFAULT_OG_IMAGE_URL;
  const ogType = input.seo?.ogType || input.defaultOgType || 'website';

  const productReadiness = input.product
    ? evaluateProductCommerceReadiness(input.product)
    : undefined;
  const isSampleProductPreview = Boolean(
    input.isSampleOrUnverifiedProduct ||
      productReadiness?.isSampleOrPlaceholderProduct ||
      (input.contentType === 'product' &&
        /^sample\s+maker\b/i.test((input.vendor || '').trim()))
  );

  const noindex = Boolean(
    input.forceNoindex ||
      status === 'draft' ||
      isSampleProductPreview ||
      (productReadiness && !productReadiness.canIndexProductPage) ||
      input.seo?.noindex === true ||
      input.seo?.indexing === 'noindex,follow' ||
      input.hasSearchOrFilterParams
  );

  const robots: 'index, follow' | 'noindex, follow' = noindex
    ? 'noindex, follow'
    : 'index, follow';
  const indexing: RobotsIndexingDirective = noindex
    ? 'noindex,follow'
    : 'index,follow';

  const warnings = evaluateSeoLengthGuidance(seoTitle, metaDescription);
  if (rejectedCrossDomainOverride) {
    warnings.push(
      `Rejected cross-domain canonical override "${input.seo?.canonicalPath}"; fell back to "${canonicalPath}".`
    );
  }

  return {
    onPageTitle: input.onPageTitle,
    seoTitle,
    metaDescription,
    canonicalPath,
    canonicalUrl,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    twitterCard: 'summary_large_image',
    robots,
    indexing,
    noindex,
    isSampleProductPreview,
    status,
    rejectedCrossDomainOverride,
    warnings,
  };
}

export function calculateArticleWordCount(article: Article): number {
  const chunks: string[] = [
    article.title,
    article.subtitle,
    ...article.executiveSummary,
  ];

  for (const sec of article.sections) {
    chunks.push(sec.heading, ...sec.paragraphs);
    if (sec.pullQuote) {
      chunks.push(sec.pullQuote.text, sec.pullQuote.attribution);
    }
    if (sec.callout) {
      chunks.push(sec.callout.title, sec.callout.body);
    }
    if (sec.expandableNote) {
      chunks.push(sec.expandableNote.title, sec.expandableNote.methodologyDetail);
    }
    if (sec.expandableAdvice) {
      chunks.push(
        sec.expandableAdvice.title,
        sec.expandableAdvice.summaryPreview,
        ...sec.expandableAdvice.items.map((i) => `${i.label} ${i.detail}`)
      );
    }
    for (const sub of sec.subSections ?? []) {
      chunks.push(sub.subheading, ...sub.paragraphs);
      if (sub.bulletList) {
        if (sub.bulletList.intro) chunks.push(sub.bulletList.intro);
        chunks.push(...sub.bulletList.items);
      }
    }
  }

  if (article.comparisonTable) {
    chunks.push(
      article.comparisonTable.title,
      article.comparisonTable.caption,
      ...article.comparisonTable.rows.map(
        (r) => `${r.dimension} ${r.noveltyGift} ${r.ritualObject} ${r.empiricalEffect}`
      )
    );
  }

  const cleanText = stripInlineCitationTokens(chunks.join(' '));
  const words = cleanText
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.length;
}

export function calculateArticleReadingTime(article: Article): number {
  const words = calculateArticleWordCount(article);
  return Math.max(1, Math.ceil(words / 210));
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_ORIGIN,
    description:
      'An editorial gift-discovery destination combining behavioral research, curated gift guides, and interactive product discovery.',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        description:
          'Science of Gifts is an editorial gift publication combining behavioral psychology research with tactile, lasting gift curation.',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        publisher: {
          '@id': `${SITE_ORIGIN}/#organization`,
        },
      },
    ],
  };
}

export function buildArticleJsonLd(
  article: Article,
  catalog?: CatalogDataOverride
) {
  const authorsMap = catalog?.authors ?? AUTHORS;
  const citationsMap = catalog?.citations ?? CITATIONS;
  const author = authorsMap[article.authorId];
  const wordCount = calculateArticleWordCount(article);
  const readMinutes = calculateArticleReadingTime(article);

  const canonicalPath =
    article.seo?.canonicalPath || `/articles/${article.slug}/`;
  const seoTitle =
    article.seo?.seoTitle?.trim() ||
    buildDefaultSeoTitle(article.title, { contentType: 'article' });
  const metaDescription =
    article.seo?.metaDescription?.trim() ||
    buildDefaultMetaDescription(article.subtitle, article.title);

  const citations = article.citationIds
    .map((id) => citationsMap[id])
    .filter(Boolean)
    .map((c) => ({
      '@type': 'ScholarlyArticle',
      headline: c.title,
      author: c.authors,
      datePublished: String(c.year),
      isPartOf: c.publication,
      url: c.doiOrUrl,
    }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Stories',
            item: `${SITE_ORIGIN}/articles/`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: article.title,
            item: `${SITE_ORIGIN}${canonicalPath}`,
          },
        ],
      },
      {
        '@type': 'Article',
        headline: article.title,
        name: seoTitle,
        description: metaDescription,
        articleSection: article.category,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt ?? article.publishedAt,
        wordCount,
        timeRequired: `PT${readMinutes}M`,
        mainEntityOfPage: `${SITE_ORIGIN}${canonicalPath}`,
        image: article.heroImageUrl,
        author: {
          '@type': 'Person',
          name: author?.name ?? 'Science of Gifts Editorial',
          jobTitle: author?.role,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_ORIGIN,
        },
        citation: citations,
      },
    ],
  };
}

export function buildGiftGuideJsonLd(
  guide: GiftGuide,
  catalog?: CatalogDataOverride
) {
  const authorsMap = catalog?.authors ?? AUTHORS;
  const productsMap = catalog?.products ?? PRODUCTS;
  const author = authorsMap[guide.authorId];
  const allRecs = guide.sections
    .flatMap((s) => s.recommendations)
    .filter((rec) => {
      const prod = productsMap[rec.productId];
      return !prod || prod.status !== 'draft';
    });

  const canonicalPath =
    guide.seo?.canonicalPath || `/gift-guides/${guide.slug}/`;
  const seoTitle =
    guide.seo?.seoTitle?.trim() ||
    buildDefaultSeoTitle(guide.title, { contentType: 'guide' });
  const metaDescription =
    guide.seo?.metaDescription?.trim() ||
    buildDefaultMetaDescription(guide.subtitle, guide.title);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Gift Guides',
            item: `${SITE_ORIGIN}/gift-guides/`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: guide.title,
            item: `${SITE_ORIGIN}${canonicalPath}`,
          },
        ],
      },
      {
        '@type': 'ItemList',
        name: guide.title,
        description: metaDescription,
        url: `${SITE_ORIGIN}${canonicalPath}`,
        numberOfItems: allRecs.length,
        author: {
          '@type': 'Person',
          name: author?.name ?? 'Science of Gifts Editorial',
        },
        itemListElement: allRecs.map((rec, index) => {
          const product = productsMap[rec.productId];
          const commerce = product
            ? evaluateProductCommerceReadiness(product)
            : undefined;
          const cleanVendor =
            product?.vendor && !/^sample\s+maker\b/i.test(product.vendor.trim())
              ? product.vendor
              : undefined;

          return {
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Product',
              '@id': `${SITE_ORIGIN}/products/${product?.slug ?? rec.productId}/`,
              name: product?.title,
              description: rec.customEditorialNote || product?.subtitle,
              brand: cleanVendor
                ? {
                    '@type': 'Brand',
                    name: cleanVendor,
                  }
                : undefined,
              offers:
                product && commerce?.canEmitStructuredOffer
                  ? {
                      '@type': 'Offer',
                      price: product.price,
                      priceCurrency: product.currency ?? 'USD',
                      availability: commerce.hasVerifiedInventoryAvailability
                        ? product.inStock
                          ? 'https://schema.org/InStock'
                          : 'https://schema.org/OutOfStock'
                        : undefined,
                      url: product.purchaseUrl,
                      seller: {
                        '@type': 'Organization',
                        name:
                          product.commerceProvider === 'fourthwall'
                            ? 'Science of Gifts Shop'
                            : product.vendor,
                      },
                    }
                  : undefined,
            },
          };
        }),
      },
      {
        '@type': 'Article',
        headline: guide.title,
        name: seoTitle,
        description: metaDescription,
        articleSection: guide.category,
        datePublished: guide.publishedAt,
        dateModified: guide.updatedAt || guide.publishedAt,
        mainEntityOfPage: `${SITE_ORIGIN}${canonicalPath}`,
        image: guide.heroImageUrl,
        author: {
          '@type': 'Person',
          name: author?.name ?? 'Science of Gifts Editorial',
          jobTitle: author?.role,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_ORIGIN,
        },
      },
    ] as const,
  };
}

export function buildProductJsonLd(
  product: Product,
  parentGuide?: GiftGuide,
  hasGuideAppearances = true
) {
  const commerce = evaluateProductCommerceReadiness(product);
  const resolvedSeo = resolvePageSeoMetadata({
    onPageTitle: product.title,
    subtitleOrSummary: `${product.subtitle} ${product.whyToGiveIt}`,
    seo: product.seo,
    defaultCanonicalPath: `/products/${product.slug}/`,
    defaultOgType: 'product',
    defaultOgImage: product.images[0]?.url,
    contentType: 'product',
    vendor: product.vendor,
    product,
    status: product.status,
  });

  const breadcrumbItems = parentGuide
    ? [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_ORIGIN}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Gift Guides',
          item: `${SITE_ORIGIN}/gift-guides/`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: parentGuide.title,
          item: `${SITE_ORIGIN}/gift-guides/${parentGuide.slug}/`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: product.title,
          item: resolvedSeo.canonicalUrl,
        },
      ]
    : hasGuideAppearances
    ? [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_ORIGIN}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Gift Guides',
          item: `${SITE_ORIGIN}/gift-guides/`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.title,
          item: resolvedSeo.canonicalUrl,
        },
      ]
    : [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_ORIGIN}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Gift Finder',
          item: `${SITE_ORIGIN}/gift-finder/`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.title,
          item: resolvedSeo.canonicalUrl,
        },
      ];

  const isOwnedFourthwallMerch = product.commerceProvider === 'fourthwall';
  const cleanBrandName = !/^sample\s+maker\b/i.test(product.vendor.trim())
    ? product.vendor
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems,
      },
      {
        '@type': 'Product',
        '@id': resolvedSeo.canonicalUrl,
        name: product.title,
        description: product.whyToGiveIt,
        image: product.images.map((img) => img.url),
        brand: cleanBrandName
          ? {
              '@type': 'Brand',
              name: cleanBrandName,
            }
          : undefined,
        category: product.productType,
        offers: commerce.canEmitStructuredOffer
          ? {
              '@type': 'Offer',
              price: product.price,
              priceCurrency: product.currency,
              availability: commerce.hasVerifiedInventoryAvailability
                ? product.inStock
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock'
                : undefined,
              url: product.purchaseUrl,
              seller: {
                '@type': 'Organization',
                name: isOwnedFourthwallMerch
                  ? 'Science of Gifts Shop'
                  : product.vendor,
              },
            }
          : undefined,
      },
    ] as const,
  };
}

export function buildGiftGuidesDirectoryJsonLd(
  guides: GiftGuide[],
  seoOverride?: Partial<SEOConfig>
) {
  const resolvedSeo = resolvePageSeoMetadata({
    onPageTitle: 'Gift Guides',
    subtitleOrSummary:
      'Thoughtful ideas for the people in your life, organized by what they love, who they are, and the occasions worth celebrating.',
    seo: {
      seoTitle:
        'Gift Guides — Curated Ideas by Recipient, Interest & Occasion | Science of Gifts',
      metaDescription:
        'Explore Science of Gifts editorial gift guides organized by recipient, interest, occasion, and budget ($18 to $150+).',
      canonicalPath: '/gift-guides/',
      ogType: 'website',
      schemaType: 'CollectionPage',
      ...seoOverride,
    },
    defaultCanonicalPath: '/gift-guides/',
    defaultOgType: 'website',
    contentType: 'directory',
  });

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Gift Guides',
            item: resolvedSeo.canonicalUrl,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': resolvedSeo.canonicalUrl,
        name: resolvedSeo.seoTitle,
        description: resolvedSeo.metaDescription,
        url: resolvedSeo.canonicalUrl,
        mainEntity: {
          '@type': 'ItemList',
          name: 'Science of Gifts Editorial Gift Guides',
          numberOfItems: guides.length,
          itemListElement: guides.map((guide, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            url: `${SITE_ORIGIN}/gift-guides/${guide.slug}/`,
            name: guide.title,
            description: guide.subtitle,
          })),
        },
      },
    ],
  };
}

export function buildArticlesDirectoryJsonLd(
  articles: Article[],
  seoOverride?: Partial<SEOConfig>
) {
  const resolvedSeo = resolvePageSeoMetadata({
    onPageTitle: 'Stories',
    subtitleOrSummary:
      'Curious observations, useful advice, and the psychology behind why we give, choose, and remember gifts.',
    seo: {
      seoTitle:
        'Stories — The Psychology & Etiquette of Thoughtful Giving | Science of Gifts',
      metaDescription:
        'Read behavioral psychology essays, modern hosting etiquette, and practical frameworks for choosing meaningful gifts on Science of Gifts.',
      canonicalPath: '/articles/',
      ogType: 'website',
      schemaType: 'CollectionPage',
      ...seoOverride,
    },
    defaultCanonicalPath: '/articles/',
    defaultOgType: 'website',
    contentType: 'directory',
  });

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Stories',
            item: resolvedSeo.canonicalUrl,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': resolvedSeo.canonicalUrl,
        name: resolvedSeo.seoTitle,
        description: resolvedSeo.metaDescription,
        url: resolvedSeo.canonicalUrl,
        mainEntity: {
          '@type': 'ItemList',
          name: 'Science of Gifts Editorial Stories & Essays',
          numberOfItems: articles.length,
          itemListElement: articles.map((article, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            url: `${SITE_ORIGIN}/articles/${article.slug}/`,
            name: article.title,
            description: article.subtitle,
          })),
        },
      },
    ],
  };
}

export interface CategoryArchiveJsonLdInput {
  archiveTitle: string;
  archiveDescription: string;
  canonicalPath: string;
  parentDirectoryLabel: 'Gift Guides' | 'Stories';
  parentDirectoryPath: '/gift-guides/' | '/articles/';
  items: Array<{
    name: string;
    url: string;
    description?: string;
  }>;
}

export function buildCategoryArchiveJsonLd(input: CategoryArchiveJsonLdInput) {
  const { canonicalUrl } = resolveCanonicalUrl(
    input.canonicalPath,
    input.canonicalPath
  );
  const parentUrl = `${SITE_ORIGIN}${input.parentDirectoryPath}`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: input.parentDirectoryLabel,
            item: parentUrl,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: input.archiveTitle,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': canonicalUrl,
        name: input.archiveTitle,
        description: input.archiveDescription,
        url: canonicalUrl,
        mainEntity: {
          '@type': 'ItemList',
          name: input.archiveTitle,
          numberOfItems: input.items.length,
          itemListElement: input.items.map((item, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: item.name,
            url: item.url.startsWith('http')
              ? item.url
              : `${SITE_ORIGIN}${item.url}`,
            description: item.description,
          })),
        },
      },
    ],
  };
}

export function syncHeadSeoMetadata(config: {
  title: string;
  description: string;
  canonicalPath: string;
  ogType: 'website' | 'article' | 'product';
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
}) {
  if (typeof document === 'undefined') return;
  document.title = config.title;

  const setMeta = (selector: string, attr: string, value: string) => {
    const el = document.querySelector(selector);
    if (el) {
      el.setAttribute(attr, value);
    }
  };

  const { canonicalUrl } = resolveCanonicalUrl(
    config.canonicalPath,
    config.canonicalPath
  );
  const resolvedOgTitle = config.ogTitle?.trim() || config.title;
  const resolvedOgDescription =
    config.ogDescription?.trim() || config.description;

  setMeta('meta[name="description"]', 'content', config.description);
  setMeta('meta[property="og:title"]', 'content', resolvedOgTitle);
  setMeta('meta[property="og:description"]', 'content', resolvedOgDescription);
  setMeta('meta[property="og:type"]', 'content', config.ogType);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
  setMeta('meta[name="twitter:title"]', 'content', resolvedOgTitle);
  setMeta('meta[name="twitter:description"]', 'content', resolvedOgDescription);
  setMeta(
    'meta[name="robots"]',
    'content',
    config.noindex ? 'noindex, follow' : 'index, follow'
  );
  setMeta('link[rel="canonical"]', 'href', canonicalUrl);
}

export function evaluateEditorialHubReadiness(
  hub: EditorialHubConfig,
  catalog?: CatalogDataOverride
): {
  isReadyToPublish: boolean;
  isIndexable: boolean;
  publishedGuidesCount: number;
  publishedProductsCount: number;
  legacyUrlPreservationConfigured: boolean;
  plannedRedirectMappings: PlannedRedirectMapping[];
  missingRequirements: string[];
} {
  const productsMap = catalog?.products ?? PRODUCTS;
  const guidesList = catalog?.guides ?? GIFT_GUIDES;
  const missingRequirements: string[] = [];

  const publishedGuidesCount = hub.curatedGuideIds.filter((gid) => {
    const g = guidesList.find((item) => item.id === gid);
    return Boolean(g && g.status !== 'draft');
  }).length;

  const publishedProductsCount = hub.featuredProductIds.filter((pid) => {
    const p = productsMap[pid];
    return Boolean(p && p.status !== 'draft');
  }).length;

  const legacyPaths = hub.legacyProductionPaths ?? [];
  const plannedRedirects = hub.plannedRedirectMappings ?? [];
  let legacyUrlPreservationConfigured = true;
  for (const legacyPath of legacyPaths) {
    const normLegacy = normalizeCanonicalPath(legacyPath, legacyPath).canonicalPath;
    const normTarget = normalizeCanonicalPath(hub.routePath, hub.routePath).canonicalPath;
    if (normLegacy === normTarget) continue;
    const hasRedirect = plannedRedirects.some(
      (r) =>
        normalizeCanonicalPath(r.fromPath, r.fromPath).canonicalPath ===
          normLegacy &&
        normalizeCanonicalPath(r.toPath, r.toPath).canonicalPath === normTarget
    );
    if (!hasRedirect) {
      legacyUrlPreservationConfigured = false;
      missingRequirements.push(
        `Editorial hub "${hub.slug}" is missing a launch redirect mapping for existing production URL "${normLegacy}" -> "${normTarget}".`
      );
    }
  }

  if (hub.status !== 'published') {
    missingRequirements.push(
      `Editorial hub "${hub.slug}" status is "${hub.status}" (must be "published" before public indexing).`
    );
  }
  if (publishedGuidesCount < hub.minimumRequiredGuides) {
    missingRequirements.push(
      `Editorial hub "${hub.slug}" has ${publishedGuidesCount} published guides (requires at least ${hub.minimumRequiredGuides}).`
    );
  }
  if (publishedProductsCount < hub.minimumRequiredProducts) {
    missingRequirements.push(
      `Editorial hub "${hub.slug}" has ${publishedProductsCount} featured products (requires at least ${hub.minimumRequiredProducts}).`
    );
  }
  if (!hub.relationshipPathways.length) {
    missingRequirements.push(
      `Editorial hub "${hub.slug}" requires at least 1 relationship discovery pathway.`
    );
  }
  if (!hub.budgetBrackets.length) {
    missingRequirements.push(
      `Editorial hub "${hub.slug}" requires at least 1 budget bracket.`
    );
  }
  if (!hub.buyingAdvice.length) {
    missingRequirements.push(
      `Editorial hub "${hub.slug}" requires editorial buying advice.`
    );
  }

  const isReadyToPublish = missingRequirements.length === 0;
  const isIndexable =
    isReadyToPublish &&
    hub.seo.noindex !== true &&
    hub.seo.indexing !== 'noindex,follow';

  return {
    isReadyToPublish,
    isIndexable,
    publishedGuidesCount,
    publishedProductsCount,
    legacyUrlPreservationConfigured,
    plannedRedirectMappings: plannedRedirects,
    missingRequirements,
  };
}

export interface SitemapUrlEntry {
  loc: string;
  canonicalPath: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: string;
  pageType:
    | 'home'
    | 'directory'
    | 'guide'
    | 'article'
    | 'product'
    | 'category-archive'
    | 'editorial-hub'
    | 'supporting-page';
}

export interface BuildXmlSitemapOptions {
  catalog?: CatalogDataOverride;
  categoryEntries?: DirectoryOrCategorySEOEntry[];
  editorialHubs?: EditorialHubConfig[];
  siteOrigin?: string;
}

export function buildXmlSitemapEntries(
  options?: BuildXmlSitemapOptions
): SitemapUrlEntry[] {
  const siteOrigin = (options?.siteOrigin ?? SITE_ORIGIN).replace(/\/+$/, '');
  const productsMap = options?.catalog?.products ?? PRODUCTS;
  const guidesList = options?.catalog?.guides ?? GIFT_GUIDES;
  const articlesList = options?.catalog?.articles ?? ARTICLES;

  const entries: SitemapUrlEntry[] = [];
  const seenPaths = new Set<string>();

  const addEntry = (
    rawPath: string,
    pageType: SitemapUrlEntry['pageType'],
    meta?: {
      lastmod?: string;
      changefreq?: SitemapUrlEntry['changefreq'];
      priority?: string;
      noindex?: boolean;
      status?: ContentPublishStatus;
    }
  ) => {
    if (meta?.status === 'draft' || meta?.noindex) {
      return;
    }
    const { canonicalPath, rejectedCrossDomainOverride } =
      normalizeCanonicalPath(rawPath, rawPath);
    if (rejectedCrossDomainOverride) {
      return;
    }
    // Never include dev routes or query-string URLs in sitemap
    if (canonicalPath.startsWith('/dev/') || rawPath.includes('?')) {
      return;
    }
    if (seenPaths.has(canonicalPath)) {
      return;
    }
    seenPaths.add(canonicalPath);
    entries.push({
      loc: `${siteOrigin}${canonicalPath}`,
      canonicalPath,
      lastmod: meta?.lastmod,
      changefreq: meta?.changefreq,
      priority: meta?.priority,
      pageType,
    });
  };

  // 1. Primary static directories & homepage
  addEntry('/', 'home', { changefreq: 'weekly', priority: '1.0' });
  addEntry('/gift-guides/', 'directory', {
    changefreq: 'weekly',
    priority: '0.9',
  });
  addEntry('/articles/', 'directory', {
    changefreq: 'weekly',
    priority: '0.9',
  });
  addEntry('/gift-finder/', 'directory', {
    changefreq: 'weekly',
    priority: '0.9',
  });

  // 2. Published Gift Guides
  for (const guide of guidesList) {
    const resolved = resolvePageSeoMetadata({
      onPageTitle: guide.title,
      subtitleOrSummary: guide.subtitle,
      seo: guide.seo,
      defaultCanonicalPath: `/gift-guides/${guide.slug}/`,
      defaultOgType: 'article',
      contentType: 'guide',
      status: guide.status,
      siteOrigin,
    });
    addEntry(resolved.canonicalPath, 'guide', {
      lastmod: guide.updatedAt || guide.publishedAt,
      changefreq: 'monthly',
      priority: '0.9',
      noindex: resolved.noindex,
      status: guide.status,
    });
  }

  // 3. Published Articles
  for (const article of articlesList) {
    const resolved = resolvePageSeoMetadata({
      onPageTitle: article.title,
      subtitleOrSummary: article.subtitle,
      seo: article.seo,
      defaultCanonicalPath: `/articles/${article.slug}/`,
      defaultOgType: 'article',
      contentType: 'article',
      status: article.status,
      siteOrigin,
    });
    addEntry(resolved.canonicalPath, 'article', {
      lastmod: article.updatedAt || article.publishedAt,
      changefreq: 'monthly',
      priority: '0.8',
      noindex: resolved.noindex,
      status: article.status,
    });
  }

  // 4. Category Archives (Recipients, Interests, Occasions, Story Topics)
  const defaultCategoryPaths: string[] = [
    '/gift-guides/recipients/parents/',
    '/gift-guides/recipients/partners/',
    '/gift-guides/recipients/friends/',
    '/gift-guides/recipients/hosts/',
    '/gift-guides/recipients/coworkers/',
    '/gift-guides/recipients/kids/',
    '/gift-guides/interests/coffee-and-tea/',
    '/gift-guides/interests/cooking-and-hosting/',
    '/gift-guides/interests/cozy-home/',
    '/gift-guides/interests/reading-and-writing/',
    '/gift-guides/interests/gardening-and-nature/',
    '/gift-guides/interests/games-and-gatherings/',
    '/gift-guides/occasions/birthday/',
    '/gift-guides/occasions/housewarming/',
    '/gift-guides/occasions/anniversary/',
    '/gift-guides/occasions/thank-you/',
    '/gift-guides/occasions/holidays/',
    '/gift-guides/occasions/just-because/',
    '/articles/topics/gift-giving-psychology/',
    '/articles/topics/relationships/',
    '/articles/topics/decision-making/',
    '/articles/topics/gift-etiquette/',
    '/articles/topics/culture/',
    '/articles/topics/practical-gifting-advice/',
  ];

  if (options?.categoryEntries && options.categoryEntries.length > 0) {
    for (const cat of options.categoryEntries) {
      const resolved = resolvePageSeoMetadata({
        onPageTitle: cat.title,
        subtitleOrSummary: cat.subtitle,
        seo: cat.seo,
        defaultCanonicalPath: cat.routePath,
        contentType: 'category',
        status: cat.status,
        siteOrigin,
      });
      addEntry(resolved.canonicalPath, 'category-archive', {
        changefreq: 'weekly',
        priority: '0.8',
        noindex: resolved.noindex,
        status: cat.status,
      });
    }
  } else {
    for (const catPath of defaultCategoryPaths) {
      addEntry(catPath, 'category-archive', {
        changefreq: 'weekly',
        priority: '0.8',
      });
    }
  }

  // 5. Editorial Hubs (only included when ready to publish + published + indexable)
  for (const hub of options?.editorialHubs ?? []) {
    const readiness = evaluateEditorialHubReadiness(hub, options?.catalog);
    if (readiness.isIndexable) {
      const resolved = resolvePageSeoMetadata({
        onPageTitle: hub.title,
        subtitleOrSummary: hub.subtitle,
        seo: hub.seo,
        defaultCanonicalPath: hub.routePath,
        contentType: 'directory',
        status: hub.status,
        siteOrigin,
      });
      addEntry(resolved.canonicalPath, 'editorial-hub', {
        changefreq: 'weekly',
        priority: '0.85',
        noindex: resolved.noindex,
        status: hub.status,
      });
    }
  }

  // 6. All Published & Verified Canonical Product Profiles (excludes draft and sample/placeholder products)
  for (const product of Object.values(productsMap)) {
    const commerce = evaluateProductCommerceReadiness(product);
    if (!commerce.canIndexProductPage) {
      continue;
    }
    const resolved = resolvePageSeoMetadata({
      onPageTitle: product.title,
      subtitleOrSummary: product.subtitle,
      seo: product.seo,
      defaultCanonicalPath: `/products/${product.slug}/`,
      defaultOgType: 'product',
      contentType: 'product',
      vendor: product.vendor,
      product,
      status: product.status,
      siteOrigin,
    });
    addEntry(resolved.canonicalPath, 'product', {
      changefreq: 'monthly',
      priority: '0.7',
      noindex: resolved.noindex,
      status: product.status,
    });
  }

  // 7. Supporting Publication Pages
  const supportingPaths = [
    '/about/',
    '/editorial-policy/',
    '/affiliate-disclosure/',
    '/contact/',
    '/privacy-policy/',
    '/terms-of-use/',
    '/site-map/',
  ];
  for (const supportPath of supportingPaths) {
    addEntry(supportPath, 'supporting-page', {
      changefreq: 'monthly',
      priority: '0.5',
    });
  }

  return entries;
}

export function generateXmlSitemap(options?: BuildXmlSitemapOptions): string {
  const entries = buildXmlSitemapEntries(options);
  const urlBlocks = entries.map((entry) => {
    const lines = [`  <url>`, `    <loc>${escapeXml(entry.loc)}</loc>`];
    if (entry.lastmod) {
      lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    }
    if (entry.changefreq) {
      lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }
    if (entry.priority) {
      lines.push(`    <priority>${entry.priority}</priority>`);
    }
    lines.push(`  </url>`);
    return lines.join('\n');
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urlBlocks,
    `</urlset>`,
    ``,
  ].join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateRobotsTxt(options?: {
  allowIndexing?: boolean;
  siteOrigin?: string;
}): string {
  const allowIndexing = options?.allowIndexing ?? true;
  const siteOrigin = (options?.siteOrigin ?? SITE_ORIGIN).replace(/\/+$/, '');

  if (!allowIndexing) {
    return [
      '# Non-production / preview environment: indexing disabled',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /dev/',
    'Disallow: /api/',
    '',
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    '',
  ].join('\n');
}

export interface ValidateSeoSafetyOptions {
  catalog?: CatalogDataOverride;
  categoryEntries?: DirectoryOrCategorySEOEntry[];
  editorialHubs?: EditorialHubConfig[];
  /** Simulate an accidental global noindex override for testing safety guardrails */
  simulateGlobalNoindexOverride?: boolean;
  /** Routes where noindex is explicitly expected and permitted */
  allowedNoindexPaths?: string[];
}

/**
 * Automated SEO & Indexing Safety Guardrail:
 * - Detects accidental site-wide noindex defaults or unexpected noindex on core public routes
 * - Detects cross-domain canonicalization attempts (e.g., canonicalizing to shop.scienceofgifts.com)
 * - Detects duplicate canonical URLs or missing titles/descriptions across public pages
 */
export function validateSeoAndIndexingSafety(
  options?: ValidateSeoSafetyOptions
): {
  passed: boolean;
  checkedPublicRoutes: number;
  indexablePublicRoutes: number;
  noindexPublicRoutes: number;
  samplePreviewProductsNoindexCount: number;
  issues: ValidationIssue[];
} {
  const productsMap = options?.catalog?.products ?? PRODUCTS;
  const guidesList = options?.catalog?.guides ?? GIFT_GUIDES;
  const articlesList = options?.catalog?.articles ?? ARTICLES;
  const allowedNoindex = new Set(
    (options?.allowedNoindexPaths ?? ['/dev/theme-lab/']).map(
      (p) => normalizeCanonicalPath(p, p).canonicalPath
    )
  );

  const issues: ValidationIssue[] = [];
  const seenCanonicals = new Map<string, string>();
  let checkedPublicRoutes = 0;
  let indexablePublicRoutes = 0;
  let noindexPublicRoutes = 0;
  let samplePreviewProductsNoindexCount = 0;

  const inspectRoute = (
    entityId: string,
    resolved: ResolvedPageSeoMetadata,
    isCorePublicRoute: boolean
  ) => {
    if (resolved.status === 'draft') {
      return;
    }

    if (resolved.isSampleProductPreview && !options?.simulateGlobalNoindexOverride) {
      samplePreviewProductsNoindexCount += 1;
      if (!resolved.noindex) {
        issues.push({
          severity: 'error',
          code: 'SAMPLE_PRODUCT_INDEXABLE_IN_PRODUCTION',
          entityId,
          message: `Sample or placeholder product "${entityId}" (${resolved.canonicalPath}) resolved as indexable; sample products must be noindex.`,
        });
      }
      return;
    }

    checkedPublicRoutes += 1;

    const effectiveNoindex = Boolean(
      options?.simulateGlobalNoindexOverride || resolved.noindex
    );

    if (effectiveNoindex) {
      noindexPublicRoutes += 1;
      if (
        isCorePublicRoute &&
        !allowedNoindex.has(resolved.canonicalPath) &&
        !options?.simulateGlobalNoindexOverride
      ) {
        issues.push({
          severity: 'error',
          code: 'UNEXPECTED_PUBLIC_ROUTE_NOINDEX',
          entityId,
          message: `Public production route "${resolved.canonicalPath}" (${entityId}) is unexpectedly marked noindex.`,
        });
      }
    } else {
      indexablePublicRoutes += 1;
    }

    if (resolved.rejectedCrossDomainOverride) {
      issues.push({
        severity: 'error',
        code: 'CROSS_DOMAIN_CANONICAL_REJECTED',
        entityId,
        message: `Entity "${entityId}" attempted a cross-domain canonical URL override; canonical URLs must stay on ${SITE_ORIGIN}.`,
      });
    }

    if (!resolved.seoTitle.trim()) {
      issues.push({
        severity: 'error',
        code: 'MISSING_SEO_TITLE',
        entityId,
        message: `Entity "${entityId}" resolved to an empty SEO title.`,
      });
    }

    if (!resolved.metaDescription.trim()) {
      issues.push({
        severity: 'error',
        code: 'MISSING_META_DESCRIPTION',
        entityId,
        message: `Entity "${entityId}" resolved to an empty meta description.`,
      });
    }

    const existingOwner = seenCanonicals.get(resolved.canonicalUrl);
    if (existingOwner && existingOwner !== entityId) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_CANONICAL_URL',
        entityId,
        message: `Duplicate canonical URL "${resolved.canonicalUrl}" shared by "${existingOwner}" and "${entityId}".`,
      });
    } else {
      seenCanonicals.set(resolved.canonicalUrl, entityId);
    }
  };

  // Core routes
  inspectRoute(
    'route_home',
    resolvePageSeoMetadata({
      onPageTitle: 'Science of Gifts — Editorial Gift Guides & Memorable Finds',
      subtitleOrSummary:
        'Discover thoughtful gifts backed by behavioral psychology, tactile craftsmanship, and rigorous hands-on testing from Science of Gifts.',
      defaultCanonicalPath: '/',
      contentType: 'page',
    }),
    true
  );

  inspectRoute(
    'route_gift_guides_directory',
    resolvePageSeoMetadata({
      onPageTitle: 'Gift Guides',
      subtitleOrSummary:
        'Thoughtful ideas for the people in your life, organized by what they love, who they are, and the occasions worth celebrating.',
      defaultCanonicalPath: '/gift-guides/',
      contentType: 'directory',
    }),
    true
  );

  inspectRoute(
    'route_articles_directory',
    resolvePageSeoMetadata({
      onPageTitle: 'Stories',
      subtitleOrSummary:
        'Curious observations, useful advice, and the psychology behind why we give, choose, and remember gifts.',
      defaultCanonicalPath: '/articles/',
      contentType: 'directory',
    }),
    true
  );

  inspectRoute(
    'route_gift_finder',
    resolvePageSeoMetadata({
      onPageTitle: 'Interactive Gift Finder',
      subtitleOrSummary:
        'Filter our canonical catalog by recipient, relationship, budget tier, occasion, and personality archetype.',
      defaultCanonicalPath: '/gift-finder/',
      contentType: 'directory',
    }),
    true
  );

  for (const guide of guidesList) {
    if (guide.status === 'draft') continue;
    inspectRoute(
      guide.id,
      resolvePageSeoMetadata({
        onPageTitle: guide.title,
        subtitleOrSummary: guide.subtitle,
        seo: guide.seo,
        defaultCanonicalPath: `/gift-guides/${guide.slug}/`,
        defaultOgType: 'article',
        defaultOgImage: guide.heroImageUrl,
        contentType: 'guide',
        status: guide.status,
      }),
      true
    );
  }

  for (const article of articlesList) {
    if (article.status === 'draft') continue;
    inspectRoute(
      article.id,
      resolvePageSeoMetadata({
        onPageTitle: article.title,
        subtitleOrSummary: article.subtitle,
        seo: article.seo,
        defaultCanonicalPath: `/articles/${article.slug}/`,
        defaultOgType: 'article',
        defaultOgImage: article.heroImageUrl,
        contentType: 'article',
        status: article.status,
      }),
      true
    );
  }

  for (const product of Object.values(productsMap)) {
    if (product.status === 'draft') continue;
    inspectRoute(
      product.id,
      resolvePageSeoMetadata({
        onPageTitle: product.title,
        subtitleOrSummary: product.subtitle,
        seo: product.seo,
        defaultCanonicalPath: `/products/${product.slug}/`,
        defaultOgType: 'product',
        defaultOgImage: product.images[0]?.url,
        contentType: 'product',
        vendor: product.vendor,
        product,
        status: product.status,
      }),
      true
    );
  }

  for (const cat of options?.categoryEntries ?? []) {
    if (cat.status === 'draft') continue;
    inspectRoute(
      `category_${cat.routePath}`,
      resolvePageSeoMetadata({
        onPageTitle: cat.title,
        subtitleOrSummary: cat.subtitle,
        seo: cat.seo,
        defaultCanonicalPath: cat.routePath,
        contentType: 'category',
        status: cat.status,
      }),
      true
    );
  }

  // Global noindex catastrophe detection
  if (
    checkedPublicRoutes > 0 &&
    (noindexPublicRoutes === checkedPublicRoutes ||
      noindexPublicRoutes / checkedPublicRoutes >= 0.8)
  ) {
    issues.push({
      severity: 'error',
      code: 'GLOBAL_NOINDEX_DEFAULT_DETECTED',
      entityId: 'site_wide_indexing_guardrail',
      message: `Critical SEO Guardrail Failure: ${noindexPublicRoutes} of ${checkedPublicRoutes} public production routes are marked noindex. This indicates an accidental site-wide noindex configuration.`,
    });
  }

  return {
    passed: issues.filter((i) => i.severity === 'error').length === 0,
    checkedPublicRoutes,
    indexablePublicRoutes,
    noindexPublicRoutes,
    samplePreviewProductsNoindexCount,
    issues,
  };
}

export function validateCatalogIntegrity(catalog?: CatalogDataOverride): {
  passed: boolean;
  checkedEntities: number;
  canonicalProductsCount: number;
  issues: ValidationIssue[];
} {
  const productsMap = catalog?.products ?? PRODUCTS;
  const citationsMap = catalog?.citations ?? CITATIONS;
  const guidesList = catalog?.guides ?? GIFT_GUIDES;
  const articlesList = catalog?.articles ?? ARTICLES;

  const issues: ValidationIssue[] = [];
  const seenRoutes = new Set<string>();

  const products = Object.values(productsMap);
  for (const prod of products) {
    const route = `/products/${prod.slug}`;
    if (seenRoutes.has(route)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_ROUTE',
        entityId: prod.id,
        message: `Duplicate product route detected: ${route}`,
      });
    }
    seenRoutes.add(route);

    if (!prod.images.length || prod.images.some((img) => !img.alt.trim())) {
      issues.push({
        severity: 'error',
        code: 'MISSING_IMAGE_ALT',
        entityId: prod.id,
        message: `Product ${prod.id} is missing required accessible image alt text.`,
      });
    }

    const imageIssues = validateProductImagesForProduct(prod, {
      strictProduction: false,
    });
    for (const imgIssue of imageIssues) {
      if (imgIssue.code === 'MISSING_IMAGE_ALT') continue; // Already pushed above
      issues.push({
        severity: imgIssue.severity,
        code: imgIssue.code,
        entityId: prod.id,
        message: imgIssue.message,
      });
    }

    if (!prod.purchaseUrl.startsWith('https://')) {
      issues.push({
        severity: 'error',
        code: 'INVALID_PURCHASE_URL',
        entityId: prod.id,
        message: `Product ${prod.id} has an invalid purchase URL.`,
      });
    }
  }

  for (const guide of guidesList) {
    if (seenRoutes.has(guide.seo.canonicalPath)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_ROUTE',
        entityId: guide.id,
        message: `Duplicate canonical path: ${guide.seo.canonicalPath}`,
      });
    }
    seenRoutes.add(guide.seo.canonicalPath);

    if (!productsMap[guide.editorsPick.productId]) {
      issues.push({
        severity: 'error',
        code: 'BROKEN_PRODUCT_REF',
        entityId: guide.id,
        message: `Editor's Pick references non-existent canonical product ID: ${guide.editorsPick.productId}`,
      });
    }

    for (const qp of guide.quickPicks) {
      if (!productsMap[qp.productId]) {
        issues.push({
          severity: 'error',
          code: 'BROKEN_PRODUCT_REF',
          entityId: guide.id,
          message: `QuickPick references non-existent canonical product ID: ${qp.productId}`,
        });
      }
    }

    for (const sec of guide.sections) {
      for (const rec of sec.recommendations) {
        if (!productsMap[rec.productId]) {
          issues.push({
            severity: 'error',
            code: 'BROKEN_PRODUCT_REF',
            entityId: guide.id,
            message: `Section ${sec.id} references non-existent canonical product ID: ${rec.productId}`,
          });
        }
      }
    }

    for (const pathway of guide.recipientPathways ?? []) {
      for (const pid of pathway.recommendedProductIds ?? []) {
        if (!productsMap[pid]) {
          issues.push({
            severity: 'error',
            code: 'BROKEN_PRODUCT_REF',
            entityId: guide.id,
            message: `RecipientPathway ${pathway.id} references non-existent canonical product ID: ${pid}`,
          });
        }
      }
    }

    for (const row of guide.comparison?.rows ?? []) {
      if (!productsMap[row.productId]) {
        issues.push({
          severity: 'error',
          code: 'BROKEN_PRODUCT_REF',
          entityId: guide.id,
          message: `Comparison row references non-existent canonical product ID: ${row.productId}`,
        });
      }
    }

    for (const faq of guide.faqs ?? []) {
      if (faq.relatedProductId && !productsMap[faq.relatedProductId]) {
        issues.push({
          severity: 'error',
          code: 'BROKEN_PRODUCT_REF',
          entityId: guide.id,
          message: `FAQ ${faq.id} references non-existent canonical product ID: ${faq.relatedProductId}`,
        });
      }
    }
  }

  for (const article of articlesList) {
    if (seenRoutes.has(article.seo.canonicalPath)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_ROUTE',
        entityId: article.id,
        message: `Duplicate canonical path: ${article.seo.canonicalPath}`,
      });
    }
    seenRoutes.add(article.seo.canonicalPath);

    if (!article.heroAlt.trim()) {
      issues.push({
        severity: 'error',
        code: 'MISSING_IMAGE_ALT',
        entityId: article.id,
        message: `Article ${article.id} is missing hero alt text.`,
      });
    }

    // Validate article citationIds list
    for (const citId of article.citationIds) {
      if (!citationsMap[citId]) {
        issues.push({
          severity: 'error',
          code: 'BROKEN_CITATION_REF',
          entityId: article.id,
          message: `Article ${article.id} references non-existent citation ID: ${citId}`,
        });
      }
    }

    // Validate inline [cite:...] tokens across all sections, subsections, and expandable advice
    const textBlocks: string[] = [];
    for (const sec of article.sections) {
      textBlocks.push(...sec.paragraphs);
      for (const sub of sec.subSections ?? []) {
        textBlocks.push(...sub.paragraphs);
        if (sub.bulletList) {
          textBlocks.push(...sub.bulletList.items);
        }
      }
      if (sec.expandableAdvice) {
        textBlocks.push(...sec.expandableAdvice.items.map((i) => i.detail));
      }
      for (const pid of sec.contextualProducts?.productIds ?? []) {
        if (!productsMap[pid]) {
          issues.push({
            severity: 'error',
            code: 'BROKEN_PRODUCT_REF',
            entityId: article.id,
            message: `Article section ${sec.id} contextualProducts references missing product ID: ${pid}`,
          });
        }
      }
      for (const pid of sec.recommendedProductIds ?? []) {
        if (!productsMap[pid]) {
          issues.push({
            severity: 'error',
            code: 'BROKEN_PRODUCT_REF',
            entityId: article.id,
            message: `Article section ${sec.id} references missing product ID: ${pid}`,
          });
        }
      }
    }

    const inlineCitIds = textBlocks.flatMap((t) => extractInlineCitationIds(t));
    for (const inlineId of inlineCitIds) {
      if (!citationsMap[inlineId]) {
        issues.push({
          severity: 'error',
          code: 'INVALID_INLINE_CITATION_TARGET',
          entityId: article.id,
          message: `Inline citation [cite:${inlineId}] does not exist in CITATIONS.`,
        });
      } else if (!article.citationIds.includes(inlineId)) {
        issues.push({
          severity: 'error',
          code: 'UNLISTED_INLINE_CITATION',
          entityId: article.id,
          message: `Inline citation [cite:${inlineId}] is missing from article.citationIds bibliography.`,
        });
      }
    }

    // Validate related routes
    for (const relGuideId of article.relatedGuideIds ?? []) {
      if (!guidesList.some((g) => g.id === relGuideId)) {
        issues.push({
          severity: 'error',
          code: 'BROKEN_RELATED_GUIDE_REF',
          entityId: article.id,
          message: `Article ${article.id} references unknown related guide ID: ${relGuideId}`,
        });
      }
    }
    for (const relArtId of article.relatedArticleIds ?? []) {
      if (!articlesList.some((a) => a.id === relArtId)) {
        issues.push({
          severity: 'error',
          code: 'BROKEN_RELATED_ARTICLE_REF',
          entityId: article.id,
          message: `Article ${article.id} references unknown related article ID: ${relArtId}`,
        });
      }
    }
  }

  return {
    passed: issues.filter((i) => i.severity === 'error').length === 0,
    checkedEntities:
      products.length +
      guidesList.length +
      articlesList.length +
      Object.keys(citationsMap).length,
    canonicalProductsCount: products.length,
    issues,
  };
}
