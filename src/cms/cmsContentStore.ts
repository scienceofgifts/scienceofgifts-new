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

export interface SiteSettingsDocument {
  id: 'site_settings_singleton';
  siteName: string;
  siteOrigin: string;
  defaultAffiliateDisclosure: string;
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
  private products: Record<string, Product>;
  private citations: Record<string, ResearchCitation>;
  private authors: Record<string, Author>;
  private guides: Map<string, GiftGuide>;
  private articles: Map<string, Article>;
  private siteSettings: SiteSettingsDocument;

  constructor(seedFromDefaultCatalog = true) {
    this.products = seedFromDefaultCatalog ? structuredClone(PRODUCTS) : {};
    this.citations = seedFromDefaultCatalog ? structuredClone(CITATIONS) : {};
    this.authors = seedFromDefaultCatalog ? structuredClone(AUTHORS) : {};
    this.guides = new Map(
      seedFromDefaultCatalog
        ? structuredClone(GIFT_GUIDES).map((g) => [g.id, g])
        : []
    );
    this.articles = new Map(
      seedFromDefaultCatalog
        ? structuredClone(ARTICLES).map((a) => [a.id, a])
        : []
    );
    this.siteSettings = {
      id: 'site_settings_singleton',
      siteName: 'Science of Gifts',
      siteOrigin: 'https://scienceofgifts.com',
      defaultAffiliateDisclosure:
        'Science of Gifts is reader-supported. When you buy through links on our site, we may earn an affiliate commission at no extra cost to you.',
    };
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
