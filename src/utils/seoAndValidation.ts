import {
  ARTICLES,
  AUTHORS,
  CITATIONS,
  GIFT_GUIDES,
  PRODUCTS,
} from '../data/catalog';
import { Article, GiftGuide, ValidationIssue } from '../types/content';

const SITE_ORIGIN = 'https://scienceofgifts.com';

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

export function buildArticleJsonLd(article: Article) {
  const author = AUTHORS[article.authorId];
  const citations = article.citationIds
    .map((id) => CITATIONS[id])
    .filter(Boolean)
    .map((c) => `${c.authors} (${c.year}). ${c.title}. ${c.publication}.`);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.seo.seoTitle,
    alternativeHeadline: article.title,
    description: article.seo.metaDescription,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    mainEntityOfPage: `${SITE_ORIGIN}${article.seo.canonicalPath}`,
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
  };
}

export function buildGiftGuideJsonLd(guide: GiftGuide) {
  const author = AUTHORS[guide.authorId];
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
          const product = PRODUCTS[rec.productId];
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

export function validateCatalogIntegrity(): {
  passed: boolean;
  checkedEntities: number;
  canonicalProductsCount: number;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  const seenRoutes = new Set<string>();

  const products = Object.values(PRODUCTS);
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

  for (const guide of GIFT_GUIDES) {
    if (seenRoutes.has(guide.seo.canonicalPath)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_ROUTE',
        entityId: guide.id,
        message: `Duplicate canonical path: ${guide.seo.canonicalPath}`,
      });
    }
    seenRoutes.add(guide.seo.canonicalPath);

    if (!PRODUCTS[guide.editorsPick.productId]) {
      issues.push({
        severity: 'error',
        code: 'BROKEN_PRODUCT_REF',
        entityId: guide.id,
        message: `Editor's Pick references non-existent canonical product ID: ${guide.editorsPick.productId}`,
      });
    }

    for (const qp of guide.quickPicks) {
      if (!PRODUCTS[qp.productId]) {
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
        if (!PRODUCTS[rec.productId]) {
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

  for (const article of ARTICLES) {
    if (seenRoutes.has(article.seo.canonicalPath)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_ROUTE',
        entityId: article.id,
        message: `Duplicate canonical path: ${article.seo.canonicalPath}`,
      });
    }
    seenRoutes.add(article.seo.canonicalPath);
  }

  return {
    passed: issues.filter((i) => i.severity === 'error').length === 0,
    checkedEntities:
      products.length + GIFT_GUIDES.length + ARTICLES.length + Object.keys(CITATIONS).length,
    canonicalProductsCount: products.length,
    issues,
  };
}
