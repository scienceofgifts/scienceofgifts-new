import { RECIPIENT_SPOTLIGHTS } from '../data/catalog';
import {
  Article,
  Author,
  GiftGuide,
  Product,
  RecipientSpotlight,
  ResearchCitation,
} from '../types/content';
import { CatalogDataOverride } from '../utils/seoAndValidation';
import { LocalCMSContentStore, SiteSettingsDocument } from './cmsContentStore';

/**
 * Clean CMS Data-Access Boundary (`contentRepository`)
 *
 * All Astro pages (`src/pages/**`) and interactive islands consume data through this
 * repository boundary rather than importing static arrays from `src/data/catalog.ts`.
 *
 * Phase 1 (Current): Reads from `LocalCMSContentStore` seeded with the verified development dataset.
 * Phase 2 (Future Sanity Cutover): Swaps implementation to execute `GROQ_QUERIES` via `@sanity/client`
 * without modifying any Astro route or React island component signatures.
 */
const defaultStore = new LocalCMSContentStore(true);

export const contentRepository = {
  getStore(): LocalCMSContentStore {
    return defaultStore;
  },

  getCatalogSnapshot(): CatalogDataOverride {
    return defaultStore.getCatalogSnapshot();
  },

  getSiteSettings(): SiteSettingsDocument {
    return defaultStore.getSiteSettings();
  },

  getAllProducts(): Product[] {
    const snapshot = defaultStore.getCatalogSnapshot();
    return Object.values(snapshot.products ?? {});
  },

  getProductsMap(): Record<string, Product> {
    const snapshot = defaultStore.getCatalogSnapshot();
    return snapshot.products ?? {};
  },

  getProductById(productId: string): Product | undefined {
    return defaultStore.getProductById(productId);
  },

  getProductBySlug(slug: string): Product | undefined {
    return this.getAllProducts().find((p) => p.slug === slug);
  },

  getAllGiftGuides(): GiftGuide[] {
    const snapshot = defaultStore.getCatalogSnapshot();
    return snapshot.guides ?? [];
  },

  getGiftGuideBySlug(slug: string): GiftGuide | undefined {
    return defaultStore.getGiftGuideBySlug(slug);
  },

  getAllArticles(): Article[] {
    const snapshot = defaultStore.getCatalogSnapshot();
    return snapshot.articles ?? [];
  },

  getArticleBySlug(slug: string): Article | undefined {
    return defaultStore.getArticleBySlug(slug);
  },

  getAuthorById(authorId: string): Author | undefined {
    const snapshot = defaultStore.getCatalogSnapshot();
    return snapshot.authors?.[authorId];
  },

  getAuthorsMap(): Record<string, Author> {
    const snapshot = defaultStore.getCatalogSnapshot();
    return snapshot.authors ?? {};
  },

  getCitationsMap(): Record<string, ResearchCitation> {
    const snapshot = defaultStore.getCatalogSnapshot();
    return snapshot.citations ?? {};
  },

  getRecipientSpotlights(): RecipientSpotlight[] {
    return structuredClone(RECIPIENT_SPOTLIGHTS);
  },

  getGuidesFeaturingProduct(productId: string): GiftGuide[] {
    return this.getAllGiftGuides().filter(
      (g) =>
        g.editorsPick.productId === productId ||
        g.quickPicks.some((qp) => qp.productId === productId) ||
        g.sections.some((s) =>
          s.recommendations.some((r) => r.productId === productId)
        )
    );
  },

  getArticlesFeaturingProduct(productId: string): Article[] {
    return this.getAllArticles().filter((a) =>
      a.sections.some(
        (s) =>
          (s.contextualProducts?.productIds ?? []).includes(productId) ||
          (s.recommendedProductIds ?? []).includes(productId)
      )
    );
  },
};
