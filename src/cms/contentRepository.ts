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

  getProductGuideAppearances(productId: string): Array<{
    guide: GiftGuide;
    isEditorsPick: boolean;
    awardLabel?: string;
    sectionTitle?: string;
    sectionId?: string;
    editorialHeadline?: string;
    whyWeChoseIt?: string;
    bestFor?: string;
    considerations?: string;
  }> {
    const guides = this.getGuidesFeaturingProduct(productId);
    return guides.map((guide) => {
      const isEditorsPick = guide.editorsPick.productId === productId;
      const quickPick = guide.quickPicks.find((qp) => qp.productId === productId);
      let matchedSectionTitle: string | undefined;
      let matchedSectionId: string | undefined;
      let matchedRec: GiftGuide['sections'][number]['recommendations'][number] | undefined;

      for (const sec of guide.sections) {
        const rec = sec.recommendations.find((r) => r.productId === productId);
        if (rec) {
          matchedSectionTitle = sec.title;
          matchedSectionId = sec.id;
          matchedRec = rec;
          break;
        }
      }

      return {
        guide,
        isEditorsPick,
        awardLabel:
          (isEditorsPick ? guide.editorsPick.awardLabel : undefined) ??
          matchedRec?.awardLabel ??
          quickPick?.label,
        sectionTitle: isEditorsPick ? 'Featured Editor’s Pick' : matchedSectionTitle,
        sectionId: isEditorsPick ? 'editors-pick' : matchedSectionId ?? 'quick-picks',
        editorialHeadline: isEditorsPick
          ? guide.editorsPick.editorialHeadline
          : matchedRec?.editorialHook,
        whyWeChoseIt: isEditorsPick
          ? guide.editorsPick.whyItStoodOut
          : matchedRec?.whyWeChoseIt ?? quickPick?.reason,
        bestFor: isEditorsPick
          ? guide.editorsPick.whoItFitsBest
          : matchedRec?.whoItsBestFor ?? quickPick?.bestFor,
        considerations: isEditorsPick
          ? guide.editorsPick.practicalNotes
          : matchedRec?.keepInMind,
      };
    });
  },

  getSimilarProductComparisons(product: Product): Array<{
    product: Product;
    comparisonAngle: string;
    summary: string;
  }> {
    const productsMap = this.getProductsMap();
    if (product.similarGiftComparisons && product.similarGiftComparisons.length > 0) {
      return product.similarGiftComparisons
        .map((item) => {
          const target = productsMap[item.productId];
          if (!target || target.id === product.id) return null;
          return {
            product: target,
            comparisonAngle: item.comparisonAngle,
            summary: item.summary,
          };
        })
        .filter((x): x is { product: Product; comparisonAngle: string; summary: string } => Boolean(x));
    }

    // Fallback comparative recommendations based on genuine catalog relationships
    const candidates = Object.values(productsMap).filter((p) => p.id !== product.id);
    const scored = candidates
      .map((candidate) => {
        const sharedRecipients = candidate.recipients.filter((r) =>
          product.recipients.includes(r)
        ).length;
        const sharedOccasions = candidate.occasions.filter((o) =>
          product.occasions.includes(o)
        ).length;
        return {
          candidate,
          score: sharedRecipients * 2 + sharedOccasions,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return scored.map(({ candidate }) => {
      const priceDiff = candidate.price - product.price;
      const comparisonAngle =
        priceDiff < -5
          ? `Lower-Budget Alternative ($${candidate.price})`
          : priceDiff > 15
          ? `Higher-Budget Upgrade ($${candidate.price})`
          : `${candidate.productType} Alternative ($${candidate.price})`;
      return {
        product: candidate,
        comparisonAngle,
        summary: `${candidate.whyToGiveIt}`,
      };
    });
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

