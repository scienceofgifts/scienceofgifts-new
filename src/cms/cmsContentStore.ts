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
} from '../types/content';
import {
  CatalogDataOverride,
  validateCatalogIntegrity,
} from '../utils/seoAndValidation';
import { resolveSanityImageUrlFromAssetRef } from './productInterchangeSchema';

export interface SiteBrandingDimensions {
  width: number;
  height: number;
  aspectRatio?: number;
}

export interface SiteBrandingConfig {
  logoUrl?: string;
  logoAlt: string;
  logoDesktopHeight: number;
  logoMobileHeight: number;
  logoMimeType?: string;
  logoDimensions?: SiteBrandingDimensions;
}

export interface SiteSettingsDocument {
  id: 'site_settings_singleton';
  siteName: string;
  siteOrigin: string;
  defaultAffiliateDisclosure: string;
  branding: SiteBrandingConfig;
}

const DEFAULT_SITE_NAME = 'Science of Gifts';
const DEFAULT_SITE_ORIGIN = 'https://www.scienceofgifts.com';
const DEFAULT_AFFILIATE_DISCLOSURE =
  'Science of Gifts is reader-supported. When you buy through links on our site, we may earn an affiliate commission at no extra cost to you.';
const DEFAULT_LOGO_DESKTOP_HEIGHT = 32;
const DEFAULT_LOGO_MOBILE_HEIGHT = 26;

function clampBrandingHeight(
  raw: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(raw)));
}

function sanitizeBrandingLogoUrl(rawUrl: unknown): string | undefined {
  if (typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('https://') || trimmed.startsWith('/assets/')) {
    return trimmed;
  }
  return undefined;
}

/**
 * Local normalized CMS document store mirroring Sanity's reference-based architecture.
 *
 * Key architectural invariant:
 * - Canonical `Product`, `ResearchCitation`, and `Author` records are stored once by ID.
 * - `GiftGuide` and `Article` records store ONLY reference IDs (`productId`, `citationIds`, `authorId`)
 *   plus guide-specific or article-specific framing (`awardLabel`, `customEditorialNote`, `idealFor`,
 *   `goodToKnow`, `editorialContext`).
 * - Updating a canonical `Product`'s title, price, or image in the store immediately propagates
 *   to every referencing `GiftGuide` and `Article` without duplicating product data.
 */
export class LocalCMSContentStore {
  private readonly baselineProducts: Record<string, Product>;
  private readonly baselineArticles: Article[];
  private products: Record<string, Product>;
  private citations: Record<string, ResearchCitation>;
  private authors: Record<string, Author>;
  private guides: Map<string, GiftGuide>;
  private articles: Map<string, Article>;
  private siteSettings: SiteSettingsDocument;

  constructor(seedFromDefaultCatalog = true) {
    this.baselineProducts = seedFromDefaultCatalog
      ? structuredClone(PRODUCTS)
      : {};
    this.baselineArticles = seedFromDefaultCatalog
      ? structuredClone(ARTICLES)
      : [];
    this.products = structuredClone(this.baselineProducts);
    this.citations = seedFromDefaultCatalog ? structuredClone(CITATIONS) : {};
    this.authors = seedFromDefaultCatalog ? structuredClone(AUTHORS) : {};
    this.guides = new Map(
      seedFromDefaultCatalog
        ? structuredClone(GIFT_GUIDES).map((g) => [g.id, g])
        : []
    );
    this.articles = new Map(
      this.baselineArticles.map((a) => [a.id, structuredClone(a)])
    );
    this.siteSettings = {
      id: 'site_settings_singleton',
      siteName: DEFAULT_SITE_NAME,
      siteOrigin: DEFAULT_SITE_ORIGIN,
      defaultAffiliateDisclosure: DEFAULT_AFFILIATE_DISCLOSURE,
      branding: {
        logoAlt: DEFAULT_SITE_NAME,
        logoDesktopHeight: DEFAULT_LOGO_DESKTOP_HEIGHT,
        logoMobileHeight: DEFAULT_LOGO_MOBILE_HEIGHT,
      },
    };
  }

  /**
   * Synchronizes the singleton `siteSettings` (including custom Branding logo & sizing)
   * from the strictly published Sanity Content Lake `siteSettings` document.
   * When `rawSiteSettings` is `null` or `logo` is removed, cleanly resets back to defaults.
   */
  public applyPublishedSanitySiteSettings(
    rawSiteSettings: Record<string, any> | null | undefined,
    sanityEnv?: { projectId?: string; dataset?: string }
  ): SiteSettingsDocument {
    if (!rawSiteSettings || typeof rawSiteSettings !== 'object') {
      this.siteSettings = {
        id: 'site_settings_singleton',
        siteName: DEFAULT_SITE_NAME,
        siteOrigin: DEFAULT_SITE_ORIGIN,
        defaultAffiliateDisclosure: DEFAULT_AFFILIATE_DISCLOSURE,
        branding: {
          logoAlt: DEFAULT_SITE_NAME,
          logoDesktopHeight: DEFAULT_LOGO_DESKTOP_HEIGHT,
          logoMobileHeight: DEFAULT_LOGO_MOBILE_HEIGHT,
        },
      };
      return this.getSiteSettings();
    }

    const siteName =
      typeof rawSiteSettings.siteName === 'string' && rawSiteSettings.siteName.trim()
        ? rawSiteSettings.siteName.trim()
        : DEFAULT_SITE_NAME;
    const siteOrigin =
      typeof rawSiteSettings.siteOrigin === 'string' &&
      rawSiteSettings.siteOrigin.trim().startsWith('https://')
        ? rawSiteSettings.siteOrigin.trim()
        : DEFAULT_SITE_ORIGIN;
    const defaultAffiliateDisclosure =
      typeof rawSiteSettings.defaultAffiliateDisclosure === 'string' &&
      rawSiteSettings.defaultAffiliateDisclosure.trim()
        ? rawSiteSettings.defaultAffiliateDisclosure.trim()
        : DEFAULT_AFFILIATE_DISCLOSURE;

    const rawLogo =
      rawSiteSettings.logo && typeof rawSiteSettings.logo === 'object'
        ? rawSiteSettings.logo
        : null;
    const assetRef =
      typeof rawLogo?.asset?._ref === 'string'
        ? rawLogo.asset._ref.trim()
        : typeof rawLogo?.asset?.asset?._ref === 'string'
        ? rawLogo.asset.asset._ref.trim()
        : undefined;
    const expandedLogoUrl =
      sanitizeBrandingLogoUrl(rawSiteSettings.logoUrl) ||
      sanitizeBrandingLogoUrl(rawLogo?.asset?.url) ||
      sanitizeBrandingLogoUrl(rawLogo?.url);
    const resolvedLogoUrl =
      expandedLogoUrl ||
      (assetRef
        ? sanitizeBrandingLogoUrl(
            resolveSanityImageUrlFromAssetRef(assetRef, sanityEnv)
          )
        : undefined);

    const rawDims =
      rawSiteSettings.logoDimensions &&
      typeof rawSiteSettings.logoDimensions === 'object'
        ? rawSiteSettings.logoDimensions
        : rawLogo?.asset?.metadata?.dimensions &&
          typeof rawLogo.asset.metadata.dimensions === 'object'
        ? rawLogo.asset.metadata.dimensions
        : null;
    const logoDimensions: SiteBrandingDimensions | undefined =
      resolvedLogoUrl &&
      rawDims &&
      typeof rawDims.width === 'number' &&
      rawDims.width > 0 &&
      typeof rawDims.height === 'number' &&
      rawDims.height > 0
        ? {
            width: Math.round(rawDims.width),
            height: Math.round(rawDims.height),
            aspectRatio:
              typeof rawDims.aspectRatio === 'number' && rawDims.aspectRatio > 0
                ? rawDims.aspectRatio
                : rawDims.width / rawDims.height,
          }
        : undefined;

    const logoMimeType =
      resolvedLogoUrl && typeof rawSiteSettings.logoMimeType === 'string'
        ? rawSiteSettings.logoMimeType.trim()
        : resolvedLogoUrl && typeof rawLogo?.asset?.mimeType === 'string'
        ? rawLogo.asset.mimeType.trim()
        : undefined;

    const logoAlt =
      typeof rawSiteSettings.logoAlt === 'string' && rawSiteSettings.logoAlt.trim()
        ? rawSiteSettings.logoAlt.trim()
        : siteName;

    this.siteSettings = {
      id: 'site_settings_singleton',
      siteName,
      siteOrigin,
      defaultAffiliateDisclosure,
      branding: {
        logoUrl: resolvedLogoUrl,
        logoAlt,
        logoDesktopHeight: clampBrandingHeight(
          rawSiteSettings.logoDesktopHeight,
          18,
          56,
          DEFAULT_LOGO_DESKTOP_HEIGHT
        ),
        logoMobileHeight: clampBrandingHeight(
          rawSiteSettings.logoMobileHeight,
          16,
          44,
          DEFAULT_LOGO_MOBILE_HEIGHT
        ),
        logoMimeType,
        logoDimensions,
      },
    };
    return this.getSiteSettings();
  }

  /**
   * Merges published Sanity Content Lake products over the local reference baseline.
   * Published Sanity products authoritatively override any matching local catalog
   * product by canonical `id` or `slug` with zero duplicates, while drafts are never included.
   */
  public applyPublishedSanityProducts(sanityProducts: Product[]): void {
    const merged: Record<string, Product> = structuredClone(this.baselineProducts);
    for (const sanityProduct of sanityProducts) {
      if (
        !sanityProduct ||
        !sanityProduct.id ||
        sanityProduct.status === 'draft'
      ) {
        continue;
      }
      for (const [existingKey, existingProd] of Object.entries(merged)) {
        if (
          existingProd.id === sanityProduct.id ||
          (sanityProduct.slug && existingProd.slug === sanityProduct.slug)
        ) {
          delete merged[existingKey];
        }
      }
      merged[sanityProduct.id] = structuredClone(sanityProduct);
    }
    this.products = merged;
  }

  /**
   * Merges published Sanity Content Lake articles over the local reference baseline.
   * Published Sanity articles authoritatively override any matching baseline article
   * by canonical `id` or `slug`, while drafts (`status === 'draft'`) are strictly excluded.
   */
  public applyPublishedSanityArticles(sanityArticles: Article[]): void {
    const merged = new Map<string, Article>(
      this.baselineArticles.map((a) => [a.id, structuredClone(a)])
    );
    for (const sanityArticle of sanityArticles) {
      if (
        !sanityArticle ||
        !sanityArticle.id ||
        sanityArticle.status === 'draft'
      ) {
        continue;
      }
      for (const [existingKey, existingArt] of Array.from(merged.entries())) {
        if (
          existingArt.id === sanityArticle.id ||
          (sanityArticle.slug && existingArt.slug === sanityArticle.slug)
        ) {
          merged.delete(existingKey);
        }
      }
      merged.set(sanityArticle.id, structuredClone(sanityArticle));
    }
    this.articles = merged;
  }

  public upsertProduct(product: Product): Product {
    if (!product.id || !product.id.startsWith('prod_')) {
      throw new Error(
        `Invalid canonical product ID "${product.id}". Must start with "prod_".`
      );
    }
    this.products[product.id] = structuredClone(product);
    return this.products[product.id];
  }

  public updateCanonicalProduct(
    productId: string,
    patch: Partial<Omit<Product, 'id'>>
  ): Product {
    const existing = this.products[productId];
    if (!existing) {
      throw new Error(`Canonical product "${productId}" does not exist.`);
    }
    const updated: Product = {
      ...existing,
      ...structuredClone(patch),
      id: existing.id,
    };
    this.products[productId] = updated;
    return updated;
  }

  public getProductById(productId: string): Product | undefined {
    return this.products[productId];
  }

  public upsertCitation(citation: ResearchCitation): ResearchCitation {
    if (!citation.id || !citation.id.startsWith('cit_')) {
      throw new Error(
        `Invalid citation ID "${citation.id}". Must start with "cit_".`
      );
    }
    this.citations[citation.id] = structuredClone(citation);
    return this.citations[citation.id];
  }

  public upsertAuthor(author: Author): Author {
    this.authors[author.id] = structuredClone(author);
    return this.authors[author.id];
  }

  public upsertGiftGuide(guide: GiftGuide): GiftGuide {
    // Verify all referenced canonical products exist before storing
    const referencedProductIds = new Set<string>([
      guide.editorsPick.productId,
      ...guide.quickPicks.map((q) => q.productId),
      ...guide.sections.flatMap((s) => s.recommendations.map((r) => r.productId)),
      ...(guide.recipientPathways?.flatMap((p) => p.recommendedProductIds ?? []) ?? []),
      ...(guide.comparison?.rows.map((r) => r.productId) ?? []),
      ...(guide.faqs?.map((f) => f.relatedProductId).filter((id): id is string => Boolean(id)) ?? []),
    ]);
    for (const pid of referencedProductIds) {
      if (!this.products[pid]) {
        throw new Error(
          `GiftGuide "${guide.id}" references unknown canonical product "${pid}".`
        );
      }
    }
    if (!this.authors[guide.authorId]) {
      throw new Error(
        `GiftGuide "${guide.id}" references unknown author "${guide.authorId}".`
      );
    }
    const copy = structuredClone(guide);
    this.guides.set(copy.id, copy);
    return copy;
  }

  public getGiftGuideBySlug(slug: string): GiftGuide | undefined {
    for (const guide of this.guides.values()) {
      if (guide.slug === slug) return guide;
    }
    return undefined;
  }

  public upsertArticle(article: Article): Article {
    if (!this.authors[article.authorId]) {
      throw new Error(
        `Article "${article.id}" references unknown author "${article.authorId}".`
      );
    }
    for (const cid of article.citationIds) {
      if (!this.citations[cid]) {
        throw new Error(
          `Article "${article.id}" references unknown citation "${cid}".`
        );
      }
    }
    for (const sec of article.sections) {
      for (const pid of sec.contextualProducts?.productIds ?? []) {
        if (!this.products[pid]) {
          throw new Error(
            `Article "${article.id}" section "${sec.id}" references unknown canonical product "${pid}".`
          );
        }
      }
    }
    const copy = structuredClone(article);
    this.articles.set(copy.id, copy);
    return copy;
  }

  public getArticleBySlug(slug: string): Article | undefined {
    for (const article of this.articles.values()) {
      if (article.slug === slug) return article;
    }
    return undefined;
  }

  public getSiteSettings(): SiteSettingsDocument {
    return structuredClone(this.siteSettings);
  }

  public updateSiteSettings(
    patch: Partial<Omit<SiteSettingsDocument, 'id'>>
  ): SiteSettingsDocument {
    this.siteSettings = {
      ...this.siteSettings,
      ...structuredClone(patch),
      id: 'site_settings_singleton',
    };
    return this.getSiteSettings();
  }

  public getCatalogSnapshot(): CatalogDataOverride {
    return {
      products: { ...this.products },
      citations: { ...this.citations },
      authors: { ...this.authors },
      guides: Array.from(this.guides.values()),
      articles: Array.from(this.articles.values()),
    };
  }

  public validateIntegrity() {
    return validateCatalogIntegrity(this.getCatalogSnapshot());
  }
}
