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
  GiftGuide,
  Product,
  ResearchCitation,
  ValidationIssue,
} from '../types/content';

export interface CatalogDataOverride {
  products?: Record<string, Product>;
  citations?: Record<string, ResearchCitation>;
  authors?: Record<string, Author>;
  guides?: GiftGuide[];
  articles?: Article[];
}

const SITE_ORIGIN = 'https://scienceofgifts.com';

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
    name: 'Science of Gifts',
    url: SITE_ORIGIN,
    description:
      'An editorial gift-discovery destination combining behavioral research, curated gift guides, and interactive product discovery.',
    publisher: {
      '@type': 'Organization',
      name: 'Science of Gifts',
      url: SITE_ORIGIN,
    },
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
            item: `${SITE_ORIGIN}/articles`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: article.title,
            item: `${SITE_ORIGIN}${article.seo.canonicalPath}`,
          },
        ],
      },
      {
        '@type': 'Article',
        headline: article.title,
        name: article.seo.seoTitle,
        description: article.seo.metaDescription,
        articleSection: article.category,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt ?? article.publishedAt,
        wordCount,
        timeRequired: `PT${readMinutes}M`,
        mainEntityOfPage: `${SITE_ORIGIN}${article.seo.canonicalPath}`,
        image: article.heroImageUrl,
        author: {
          '@type': 'Person',
          name: author?.name ?? 'Science of Gifts Editorial',
          jobTitle: author?.role,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Science of Gifts',
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
  const allRecs = guide.sections.flatMap((s) => s.recommendations);

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
            item: `${SITE_ORIGIN}/guides`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: guide.title,
            item: `${SITE_ORIGIN}${guide.seo.canonicalPath}`,
          },
        ],
      },
      {
        '@type': 'ItemList',
        name: guide.title,
        description: guide.seo.metaDescription,
        url: `${SITE_ORIGIN}${guide.seo.canonicalPath}`,
        numberOfItems: allRecs.length,
        author: {
          '@type': 'Person',
          name: author?.name ?? 'Science of Gifts Editorial',
        },
        itemListElement: allRecs.map((rec, index) => {
          const product = productsMap[rec.productId];
          return {
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Product',
              '@id': `${SITE_ORIGIN}/products/${product?.slug ?? rec.productId}`,
              name: product?.title,
              description: rec.customEditorialNote || product?.subtitle,
              offers: {
                '@type': 'Offer',
                price: product?.price,
                priceCurrency: product?.currency ?? 'USD',
                url: product?.purchaseUrl,
              },
            },
          };
        }),
      },
    ],
  };
}

export function syncHeadSeoMetadata(config: {
  title: string;
  description: string;
  canonicalPath: string;
  ogType: 'website' | 'article';
}) {
  if (typeof document === 'undefined') return;
  document.title = config.title;

  const setMeta = (selector: string, attr: string, value: string) => {
    const el = document.querySelector(selector);
    if (el) {
      el.setAttribute(attr, value);
    }
  };

  setMeta('meta[name="description"]', 'content', config.description);
  setMeta('meta[property="og:title"]', 'content', config.title);
  setMeta('meta[property="og:description"]', 'content', config.description);
  setMeta('meta[property="og:type"]', 'content', config.ogType);
  setMeta('meta[name="twitter:title"]', 'content', config.title);
  setMeta('meta[name="twitter:description"]', 'content', config.description);
  setMeta(
    'link[rel="canonical"]',
    'href',
    `${SITE_ORIGIN}${config.canonicalPath}`
  );
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

