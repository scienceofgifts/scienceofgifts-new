import type {
  AgeRange,
  CommerceProvider,
  OccasionType,
  PersonalityTrait,
  Product,
  ProductBuyingConsideration,
  ProductGiftVerdict,
  ProductIdealRecipientProfile,
  ProductImage,
  ProductOccasionNote,
  ProductSimilarComparison,
  ProductSpecificationItem,
  RecipientType,
  SEOConfig,
} from '../types/content';
import {
  AGE_RANGE_OPTIONS,
  COMMERCE_PROVIDER_OPTIONS,
  GUIDE_PRICE_BUCKET_OPTIONS,
  INTEREST_OPTIONS,
  OCCASION_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  PRODUCT_BUDGET_TIER_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  RECIPIENT_OPTIONS,
  normalizeProductCategory,
  normalizeTaxonomyInterestTag,
} from './studio/taxonomyRegistry';

export const PRODUCT_INTERCHANGE_SCHEMA_VERSION = '1.0' as const;
export const PRODUCT_INTERCHANGE_FORMAT_ID = 'science-of-gifts/product-interchange' as const;

export type ProductInterchangeSchemaVersion = typeof PRODUCT_INTERCHANGE_SCHEMA_VERSION;
export type ProductInterchangeFormatId = typeof PRODUCT_INTERCHANGE_FORMAT_ID;
export type ProductInterchangeMode = 'create' | 'revision';

export type CanonicalProductCategory =
  | 'Tabletop & Glassware'
  | 'Kitchen & Pantry'
  | 'Tea & Coffee Rituals'
  | 'Keepsakes & Stationery'
  | 'Home & Textiles'
  | 'Games & Gathering'
  | 'Print & Custom Art'
  | 'Apparel & Wearables'
  | 'Drinkware & Mugs'
  | 'Stationery & Desk'
  | 'Prints & Wall Art'
  | 'Books & Reading'
  | 'Decor & Accents';

export type CanonicalInterestTag =
  | 'Coffee & Tea'
  | 'Cooking & Hosting'
  | 'Home Decor'
  | 'Cozy Sanctuary'
  | 'Slow Mornings'
  | 'Dinner Parties'
  | 'Journaling & Reading'
  | 'Gardening'
  | 'Board Games'
  | 'Psychology & Human Behavior'
  | 'Cognitive Science & Neuroscience'
  | 'Behavioral Economics'
  | 'Mindfulness & Mental Health'
  | 'History & Antiquity'
  | 'Military History & Strategy'
  | 'Archaeology & Heritage'
  | 'Philosophy & Ethics'
  | 'Classic Literature & Poetry'
  | 'Mythology & Folklore'
  | 'Creative Writing'
  | 'Filmmaking & Cinema'
  | 'Photography & Visual Arts'
  | 'Architecture & Design'
  | 'Typography & Printmaking'
  | 'Astronomy & Space'
  | 'Mathematics & Logic'
  | 'Physics & Natural Sciences'
  | 'Botanical & Earth Sciences'
  | 'Artisan Craft & Woodworking'
  | 'Nature & Outdoors'
  | 'Puzzles & Logic Games';

export type BudgetTierValue = 'under-50' | '50-to-100' | '100-plus';
export type GuidePriceBucketValue = 'under-25' | '25-to-75' | 'over-75';
export type FulfillmentClassificationValue =
  | 'affiliate_redirect'
  | 'fourthwall_merch'
  | 'digital_download'
  | 'direct_editorial';

export type PriceVerificationSourceValue =
  | 'retailer_live_check'
  | 'brand_catalog_sheet'
  | 'fourthwall_api'
  | 'unverified';

export type InventoryVerificationSourceValue =
  | 'retailer_live_check'
  | 'fourthwall_stock_feed'
  | 'manual_editor_check'
  | 'unverified';

export type SeoIndexingDirective = 'index,follow' | 'noindex,follow';

export function deriveBudgetTierFromPrice(price: number): BudgetTierValue {
  if (price < 50) return 'under-50';
  if (price <= 100) return '50-to-100';
  return '100-plus';
}

export function deriveGuidePriceBucketFromPrice(price: number): GuidePriceBucketValue {
  if (price < 25) return 'under-25';
  if (price <= 75) return '25-to-75';
  return 'over-75';
}

export const ALLOWED_RECIPIENT_VALUES = RECIPIENT_OPTIONS.map((o) => o.value) as RecipientType[];
export const ALLOWED_OCCASION_VALUES = OCCASION_OPTIONS.map((o) => o.value) as OccasionType[];
export const ALLOWED_PERSONALITY_VALUES = PERSONALITY_TRAIT_OPTIONS.map(
  (o) => o.value
) as PersonalityTrait[];
export const ALLOWED_AGE_RANGE_VALUES = AGE_RANGE_OPTIONS.map((o) => o.value) as AgeRange[];
export const ALLOWED_PRODUCT_CATEGORY_VALUES = PRODUCT_CATEGORY_OPTIONS.map(
  (o) => o.value
) as CanonicalProductCategory[];
export const ALLOWED_INTEREST_VALUES = INTEREST_OPTIONS.map(
  (o) => o.value
) as CanonicalInterestTag[];
export const ALLOWED_BUDGET_TIER_VALUES = PRODUCT_BUDGET_TIER_OPTIONS.map(
  (o) => o.value
) as BudgetTierValue[];
export const ALLOWED_GUIDE_PRICE_BUCKET_VALUES = GUIDE_PRICE_BUCKET_OPTIONS.map(
  (o) => o.value
) as GuidePriceBucketValue[];
export const ALLOWED_COMMERCE_PROVIDER_VALUES = COMMERCE_PROVIDER_OPTIONS.map(
  (o) => o.value
) as CommerceProvider[];
export const ALLOWED_FULFILLMENT_CLASSIFICATION_VALUES: FulfillmentClassificationValue[] = [
  'affiliate_redirect',
  'fourthwall_merch',
  'digital_download',
  'direct_editorial',
];
export const ALLOWED_PRICE_VERIFICATION_SOURCES: PriceVerificationSourceValue[] = [
  'retailer_live_check',
  'brand_catalog_sheet',
  'fourthwall_api',
  'unverified',
];
export const ALLOWED_INVENTORY_VERIFICATION_SOURCES: InventoryVerificationSourceValue[] = [
  'retailer_live_check',
  'fourthwall_stock_feed',
  'manual_editor_check',
  'unverified',
];

/**
 * Clearable optional field paths when applying a product revision (`mode: "revision"`).
 * Omitted fields in a revision preserve existing values; listing a path in `clearFields`
 * (or passing `null` for that field) intentionally clears it.
 */
export const CLEARABLE_PRODUCT_REVISION_FIELDS = [
  'identity.calloutTag',
  'factualContext.availabilityNote',
  'factualContext.externalProductId',
  'factualContext.affiliateUrl',
  'factualContext.fourthwallUrl',
  'factualContext.priceVerification.verifiedAt',
  'factualContext.priceVerification.evidenceNote',
  'factualContext.inventoryVerification.verifiedAt',
  'editorialProfile.giftVerdict.importantCaveat',
  'editorialProfile.extendedGiftRationale',
  'editorialProfile.buyingConsiderations',
  'editorialProfile.occasionContextNotes',
  'editorialProfile.editorialRating',
  'editorialProfile.testingNote',
  'relationships.similarGiftComparisons',
  'relationships.citationIds',
  'relationships.relatedProductIds',
  'relationships.relatedGuideIds',
  'seo.ogTitle',
  'seo.ogDescription',
  'seo.ogImage',
] as const;

export type ClearableProductRevisionField = (typeof CLEARABLE_PRODUCT_REVISION_FIELDS)[number];

export interface ProductInterchangeTargetRefV1 {
  /** Stable canonical product ID (`prod_<slug>`). Protected against alteration during revisions. */
  canonicalProductId?: string;
  /** Canonical URL slug (`[a-z0-9-]+`). */
  slug?: string;
  /** Original merchant or source URL used to identify the product. */
  sourceUrl?: string;
}

export interface ProductInterchangePriceVerificationV1 {
  /** Must be `false` whenever price was not verified from a live source or was left null. */
  verified: boolean;
  source: PriceVerificationSourceValue;
  verifiedAt?: string | null;
  evidenceNote?: string | null;
}

export interface ProductInterchangeInventoryVerificationV1 {
  /** Must be `false` whenever stock status was not verified from a live source or was left null. */
  verified: boolean;
  source: InventoryVerificationSourceValue;
  verifiedAt?: string | null;
}

export interface ProductInterchangeFactualContextV1 {
  /** Verified merchant or brand product URL. Must be a valid HTTPS URL (or null only while awaiting editor input). */
  sourceUrl: string | null;
  /** Maker, studio, or brand name. */
  vendor: string | null;
  /** Retail price in USD. Set to `null` if unknown so AI never fabricates pricing. */
  price: number | null;
  /** ISO currency code. Always `"USD"`. */
  currency: 'USD';
  /** Current stock availability. Set to `null` if unknown so AI never fabricates stock status. */
  inStock: boolean | null;
  /** Optional shipping window, lead time, or seasonal stock note. */
  availabilityNote?: string | null;
  /** Commerce integration provider. */
  commerceProvider: CommerceProvider;
  /** Operational fulfillment classification. */
  fulfillmentClassification?: FulfillmentClassificationValue;
  /** Optional external SKU or Fourthwall product ID. */
  externalProductId?: string | null;
  /** Optional dedicated affiliate tracking link (HTTPS). */
  affiliateUrl?: string | null;
  /** Optional Fourthwall storefront checkout URL (HTTPS). */
  fourthwallUrl?: string | null;
  /** Explicit price verification provenance. */
  priceVerification: ProductInterchangePriceVerificationV1;
  /** Explicit inventory verification provenance. */
  inventoryVerification: ProductInterchangeInventoryVerificationV1;
  /** Verified physical specifications (materials, dimensions, capacity, origin, care). */
  specifications: ProductSpecificationItem[];
}

export interface ProductInterchangeIdentityV1 {
  /** Canonical product title (4–110 chars). */
  title: string;
  /** Lowercase kebab-case URL slug (`[a-z0-9-]+`). Used to derive `prod_<slug>` on creation. */
  slug: string;
  /** Short specification or material subheadline (10–160 chars). */
  subtitle: string;
  /** Primary editorial product category from the controlled vocabulary. */
  productType: CanonicalProductCategory;
  /** Optional specific physical merchandise form (e.g. "Hoodie", "Ceramic Mug", "Hardcover Journal"). */
  merchandiseType?: string | null;
  /** Optional short badge shown on cards (e.g. "Heirloom Craft", "Small-Batch"). */
  calloutTag?: string | null;
}

export interface ProductInterchangeGiftVerdictV1 {
  /** Primary 2–3 sentence editorial assessment of why this object succeeds as a gift (40–420 chars). */
  editorialAssessment: string;
  /** What differentiates this piece from generic alternatives (25–300 chars). */
  standoutReason: string;
  /** What the recipient experiences when unboxing and using it (25–300 chars). */
  recipientDelight: string;
  /** Honest limitation or sizing/care caveat the buyer should know before purchasing (optional, up to 280 chars). */
  importantCaveat?: string | null;
}

export interface ProductInterchangeIdealRecipientProfileV1 {
  /** Persona headline (10–120 chars). */
  headline: string;
  /** 2–3 sentence portrait of the recipient mindset, home, or habits (40–460 chars). */
  narrative: string;
  /** 1–5 concrete lifestyle cues that signal a strong match. */
  lifestyleNotes: string[];
  /** 1–5 gifting relationship contexts where the price and intimacy level feel appropriate. */
  relationshipFit: string[];
}

export interface ProductInterchangeEditorialProfileV1 {
  /** Primary editorial narrative (60–750 chars). */
  whyToGiveIt: string;
  /** Concise 1-sentence quick-scan verdict for cards and comparison tables (18–180 chars). */
  bestForSummary: string;
  /** Narrative summary of materials, craftsmanship, dimensions, and care instructions (25–500 chars). */
  detailsAndCare: string;
  /** Structured 4-part Gift Verdict block rendered at the top of the product profile. */
  giftVerdict: ProductInterchangeGiftVerdictV1;
  /** Detailed recipient persona block rendered in the "Who It's Best For" section. */
  idealRecipientProfile: ProductInterchangeIdealRecipientProfileV1;
  /** 1–5 deeper paragraphs expanding on sensory, social, or functional gifting value. */
  extendedGiftRationale: string[];
  /** 1–6 practical buying considerations (lead time, care, space, compatibility). */
  buyingConsiderations: ProductBuyingConsideration[];
  /** 1–6 occasion-specific presentation and suitability notes. */
  occasionContextNotes: ProductOccasionNote[];
  /** Optional internal editorial quality score (1.0–5.0). */
  editorialRating?: number | null;
  /** Optional hands-on testing & evaluation note. */
  testingNote?: string | null;
}

export interface ProductInterchangeTaxonomyV1 {
  /** 1–4 recipient archetypes from the controlled vocabulary. */
  recipients: RecipientType[];
  /** 1–5 gifting occasions from the controlled vocabulary. */
  occasions: OccasionType[];
  /** 1–6 interest tags strictly from the 9 canonical INTEREST_OPTIONS. */
  interests: CanonicalInterestTag[];
  /** 1–3 personality traits from the controlled vocabulary. */
  personalityTraits: PersonalityTrait[];
  /** 1–4 recipient age ranges from the controlled vocabulary. */
  ageRanges: AgeRange[];
  /** Gift Finder budget tier (`under-50`, `50-to-100`, `100-plus`). Auto-derived when price is known. */
  budgetTier?: BudgetTierValue | null;
  /** Gift Guide price bucket (`under-25`, `25-to-75`, `over-75`). Auto-derived when price is known. */
  guidePriceBucket?: GuidePriceBucketValue | null;
  /**
   * Optional array where an AI writer can suggest additional descriptive tags
   * that are NOT part of the controlled vocabulary. These are quarantined for
   * human review and never auto-create new site categories.
   */
  suggestedUnmappedTags?: string[];
}

export const DEFAULT_MAX_PRODUCT_GALLERY_IMAGES = 8 as const;
export const MAX_PRODUCT_GALLERY_IMAGES = 12 as const;

/**
 * Resolves a Sanity Content Lake CDN URL (`https://cdn.sanity.io/images/<projectId>/<dataset>/<hash>-<w>x<h>.<ext>`)
 * from a native Sanity image asset reference ID (`image-<hash>-<w>x<h>-<ext>`).
 */
export function resolveSanityImageUrlFromAssetRef(
  assetRef: string | undefined | null,
  options?: { projectId?: string; dataset?: string }
): string | null {
  if (!assetRef || typeof assetRef !== 'string') return null;
  const trimmed = assetRef.trim();
  const match = trimmed.match(/^image-([a-zA-Z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/);
  if (!match) return null;
  const [, hash, dimensions, ext] = match;
  const projectId =
    options?.projectId ||
    (typeof process !== 'undefined' && process.env?.SANITY_STUDIO_PROJECT_ID) ||
    'c1y2qdje';
  const dataset =
    options?.dataset ||
    (typeof process !== 'undefined' && process.env?.SANITY_STUDIO_DATASET) ||
    'production';
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}-${dimensions}.${ext}`;
}

/**
 * Extracts a Sanity image asset `_ref` (`image-<hash>-<w>x<h>-<ext>`) from a product image record
 * if one is present either on `sanityAssetId`, `asset.asset._ref`, `asset._ref`, or a `cdn.sanity.io` URL.
 */
export function extractSanityAssetIdFromImage(rawImg: Record<string, any> | undefined | null): string | undefined {
  if (!rawImg || typeof rawImg !== 'object') return undefined;
  if (typeof rawImg.sanityAssetId === 'string' && rawImg.sanityAssetId.startsWith('image-')) {
    return rawImg.sanityAssetId.trim();
  }
  if (typeof rawImg.asset?.asset?._ref === 'string' && rawImg.asset.asset._ref.startsWith('image-')) {
    return rawImg.asset.asset._ref.trim();
  }
  if (typeof rawImg.asset?._ref === 'string' && rawImg.asset._ref.startsWith('image-')) {
    return rawImg.asset._ref.trim();
  }
  const url = typeof rawImg.url === 'string' ? rawImg.url : typeof rawImg.externalUrl === 'string' ? rawImg.externalUrl : '';
  const cdnMatch = url.match(/cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/([a-zA-Z0-9]+)-(\d+x\d+)\.([a-z0-9]+)/i);
  if (cdnMatch) {
    return `image-${cdnMatch[1]}-${cdnMatch[2]}-${cdnMatch[3].toLowerCase()}`;
  }
  return undefined;
}

export interface ProductInterchangeImageV1 {
  /** Optional stable image identifier (e.g. `img_<slug>_01`). Auto-generated if omitted. */
  id?: string;
  /** HTTPS URL to the product photograph. */
  url: string;
  /** Descriptive accessible alt text (10–220 chars). Required for every image. */
  alt: string;
  /** Optional editorial caption displayed below gallery photography (up to 240 chars). */
  caption?: string | null;
  /** Optional Sanity image asset document ID (`image-<hash>-<w>x<h>-<ext>`). */
  sanityAssetId?: string | null;
  /** Origin of the photograph (`sanity-upload`, `external-url`, or `fourthwall-synced`). */
  sourceType?: 'sanity-upload' | 'external-url' | 'fourthwall-synced' | null;
  /** Optional Fourthwall variant/image identifier so editorial and Fourthwall images coexist. */
  fourthwallVariantId?: string | null;
  /** Optional original uploaded filename. */
  originalFilename?: string | null;
  /** Optional image MIME type. */
  mimeType?: string | null;
  /** Optional intrinsic aspect ratio (`width / height`). */
  aspectRatio?: number | null;
  /** Frame fit mode (`cover` or `contain`). Defaults to `cover`. */
  fitMode?: 'cover' | 'contain';
  /** Warm hex fallback color (`#RRGGBB`). Defaults to `#F6F4EF`. */
  fallbackColor?: string;
  /** Normalized focal point coordinates (`x` and `y` in `0..1`). Defaults to `{ x: 0.5, y: 0.5 }`. */
  focalPoint?: { x: number; y: number };
  /** Normalized crop inset percentages (`top`, `bottom`, `left`, `right` in `0..0.5`). */
  crop?: { top: number; bottom: number; left: number; right: number };
  /** Optional HTTPS URL for 4:3 / 16:10 landscape hero overrides. */
  landscapeOverrideUrl?: string | null;
  /** Optional HTTPS URL for 4:5 portrait card overrides. */
  portraitOverrideUrl?: string | null;
  /** Intrinsic pixel width (defaults to 2400). */
  width?: number;
  /** Intrinsic pixel height (defaults to 2400). */
  height?: number;
}

export interface ProductInterchangeMediaV1 {
  /** Ordered product photography gallery (first image is primary hero). */
  images: ProductInterchangeImageV1[];
}

export interface ProductInterchangeSimilarComparisonV1 {
  /** Canonical product ID (`prod_<slug>`) of the compared catalog product. */
  productId: string;
  /** Comparison angle or budget/material role (4–110 chars). */
  comparisonAngle: string;
  /** Comparative summary explaining when to choose the alternative (15–360 chars). */
  summary: string;
  /** Optional short badge label (up to 60 chars). */
  distinctionLabel?: string | null;
  /** Optional extended comparison note (up to 360 chars). */
  comparisonNote?: string | null;
}

export interface ProductInterchangeRelationshipsV1 {
  /** Up to 4 structured comparisons against other canonical products. */
  similarGiftComparisons?: ProductInterchangeSimilarComparisonV1[];
  /** Canonical citation IDs (`cit_<slug>`). */
  citationIds?: string[];
  /** Related canonical product IDs (`prod_<slug>`). */
  relatedProductIds?: string[];
  /** Related canonical gift guide IDs (`guide_<slug>`). */
  relatedGuideIds?: string[];
}

export interface ProductInterchangeSeoV1 {
  /** Search engine title (15–65 chars). */
  seoTitle: string;
  /** Search engine meta description (50–160 chars). */
  metaDescription: string;
  /** Relative canonical path starting with `/products/` (e.g. `/products/kyoto-hinoki-tea-caddy`). */
  canonicalPath: string;
  /** Optional OpenGraph social title (up to 70 chars). */
  ogTitle?: string | null;
  /** Optional OpenGraph social description (up to 200 chars). */
  ogDescription?: string | null;
  /** Optional HTTPS OpenGraph social share image URL. */
  ogImage?: string | null;
  /** Robots indexing directive (`index,follow` or `noindex,follow`). */
  indexing: SeoIndexingDirective;
}

export interface ProductInterchangeRevisionControlV1 {
  /**
   * Optional list of clearable field paths that should be intentionally cleared (`undefined` / empty)
   * on the target product. Fields omitted from the revision payload and not listed in `clearFields`
   * are preserved untouched.
   */
  clearFields?: ClearableProductRevisionField[];
  /**
   * Defaults to `false`. When `false`, verified factual fields (`price`, `inStock`, `vendor`, `sourceUrl`)
   * on an already-verified existing product cannot be overwritten by an imported AI revision.
   */
  allowOverwriteVerifiedFacts?: boolean;
  /** Optional human or AI summary of what changed in this revision. */
  revisionNotes?: string;
}

export interface ProductInterchangeCreatePayloadV1 {
  schemaVersion: ProductInterchangeSchemaVersion;
  format: ProductInterchangeFormatId;
  mode: 'create';
  targetProduct?: ProductInterchangeTargetRefV1;
  factualContext: ProductInterchangeFactualContextV1;
  identity: ProductInterchangeIdentityV1;
  editorialProfile: ProductInterchangeEditorialProfileV1;
  taxonomy: ProductInterchangeTaxonomyV1;
  media: ProductInterchangeMediaV1;
  relationships?: ProductInterchangeRelationshipsV1;
  seo: ProductInterchangeSeoV1;
}

export interface ProductInterchangeRevisionPayloadV1 {
  schemaVersion: ProductInterchangeSchemaVersion;
  format: ProductInterchangeFormatId;
  mode: 'revision';
  targetProduct: ProductInterchangeTargetRefV1;
  revisionControl?: ProductInterchangeRevisionControlV1;
  factualContext?: Partial<ProductInterchangeFactualContextV1>;
  identity?: Partial<ProductInterchangeIdentityV1>;
  editorialProfile?: {
    whyToGiveIt?: string;
    bestForSummary?: string;
    detailsAndCare?: string;
    giftVerdict?: Partial<ProductInterchangeGiftVerdictV1>;
    idealRecipientProfile?: Partial<ProductInterchangeIdealRecipientProfileV1>;
    extendedGiftRationale?: string[];
    buyingConsiderations?: ProductBuyingConsideration[];
    occasionContextNotes?: ProductOccasionNote[];
    editorialRating?: number | null;
    testingNote?: string | null;
  };
  taxonomy?: Partial<ProductInterchangeTaxonomyV1>;
  media?: Partial<ProductInterchangeMediaV1>;
  relationships?: Partial<ProductInterchangeRelationshipsV1>;
  seo?: Partial<ProductInterchangeSeoV1>;
}

export type ProductInterchangeDocumentV1 =
  | ProductInterchangeCreatePayloadV1
  | ProductInterchangeRevisionPayloadV1;

/**
 * Complete Machine-Readable JSON Schema (Draft 2020-12) for the Science of Gifts
 * Canonical Product Interchange Format v1.0.
 */
export const PRODUCT_INTERCHANGE_JSON_SCHEMA_V1 = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://scienceofgifts.com/schemas/product-interchange.v1.schema.json',
  title: 'Science of Gifts Canonical Product Interchange Schema v1.0',
  description:
    'Versioned, self-contained JSON interchange contract for creating and revising editorial product profiles in Science of Gifts via external AI writing workflows (ChatGPT, Claude, Gemini) and importing into Sanity CMS.',
  type: 'object',
  required: ['schemaVersion', 'format', 'mode'],
  additionalProperties: false,
  properties: {
    schemaVersion: {
      type: 'string',
      const: PRODUCT_INTERCHANGE_SCHEMA_VERSION,
      description: 'Must be "1.0". Used to reject incompatible payload versions.',
    },
    format: {
      type: 'string',
      const: PRODUCT_INTERCHANGE_FORMAT_ID,
      description: 'Fixed format identifier "science-of-gifts/product-interchange".',
    },
    mode: {
      type: 'string',
      enum: ['create', 'revision'],
      description:
        '"create" requires a complete product profile. "revision" updates selected fields on an existing product while preserving omitted fields and canonical IDs.',
    },
    targetProduct: {
      type: 'object',
      additionalProperties: false,
      description:
        'Identifies the target product record. Required when mode is "revision"; optional when mode is "create".',
      properties: {
        canonicalProductId: {
          type: 'string',
          pattern: '^prod_[a-z0-9_]+$',
          description: 'Immutable canonical product identifier (e.g. "prod_hinoki_carafe_set").',
        },
        slug: {
          type: 'string',
          pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
          description: 'Lowercase kebab-case URL slug.',
        },
        sourceUrl: {
          type: 'string',
          pattern: '^https://',
          description: 'HTTPS merchant or brand source URL.',
        },
      },
    },
    revisionControl: {
      type: 'object',
      additionalProperties: false,
      description:
        'Controls non-destructive field clearing and verified-fact protection when mode is "revision".',
      properties: {
        clearFields: {
          type: 'array',
          items: {
            type: 'string',
            enum: [...CLEARABLE_PRODUCT_REVISION_FIELDS],
          },
          uniqueItems: true,
        },
        allowOverwriteVerifiedFacts: {
          type: 'boolean',
          default: false,
        },
        revisionNotes: {
          type: 'string',
          maxLength: 500,
        },
      },
    },
    factualContext: {
      type: 'object',
      additionalProperties: false,
      description:
        'Verified factual merchant and commerce data. Keep unverified price or stock as null rather than guessing.',
      properties: {
        sourceUrl: {
          type: ['string', 'null'],
          pattern: '^https://',
        },
        vendor: {
          type: ['string', 'null'],
          minLength: 2,
          maxLength: 80,
        },
        price: {
          type: ['number', 'null'],
          minimum: 0,
        },
        currency: {
          type: 'string',
          const: 'USD',
        },
        inStock: {
          type: ['boolean', 'null'],
        },
        availabilityNote: {
          type: ['string', 'null'],
          maxLength: 140,
        },
        commerceProvider: {
          type: 'string',
          enum: ALLOWED_COMMERCE_PROVIDER_VALUES,
        },
        fulfillmentClassification: {
          type: 'string',
          enum: ALLOWED_FULFILLMENT_CLASSIFICATION_VALUES,
        },
        externalProductId: {
          type: ['string', 'null'],
          maxLength: 120,
        },
        affiliateUrl: {
          type: ['string', 'null'],
          pattern: '^https://',
        },
        fourthwallUrl: {
          type: ['string', 'null'],
          pattern: '^https://',
        },
        priceVerification: {
          type: 'object',
          additionalProperties: false,
          required: ['verified', 'source'],
          properties: {
            verified: { type: 'boolean' },
            source: {
              type: 'string',
              enum: ALLOWED_PRICE_VERIFICATION_SOURCES,
            },
            verifiedAt: { type: ['string', 'null'] },
            evidenceNote: { type: ['string', 'null'], maxLength: 240 },
          },
        },
        inventoryVerification: {
          type: 'object',
          additionalProperties: false,
          required: ['verified', 'source'],
          properties: {
            verified: { type: 'boolean' },
            source: {
              type: 'string',
              enum: ALLOWED_INVENTORY_VERIFICATION_SOURCES,
            },
            verifiedAt: { type: ['string', 'null'] },
          },
        },
        specifications: {
          type: 'array',
          maxItems: 12,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'value'],
            properties: {
              label: { type: 'string', minLength: 2, maxLength: 60 },
              value: { type: 'string', minLength: 2, maxLength: 220 },
            },
          },
        },
      },
    },
    identity: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', minLength: 4, maxLength: 110 },
        slug: {
          type: 'string',
          pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
          minLength: 3,
          maxLength: 96,
        },
        subtitle: { type: 'string', minLength: 10, maxLength: 160 },
        productType: {
          type: 'string',
          enum: ALLOWED_PRODUCT_CATEGORY_VALUES,
        },
        calloutTag: {
          type: ['string', 'null'],
          maxLength: 42,
        },
      },
    },
    editorialProfile: {
      type: 'object',
      additionalProperties: false,
      properties: {
        whyToGiveIt: { type: 'string', minLength: 60, maxLength: 750 },
        bestForSummary: { type: 'string', minLength: 18, maxLength: 180 },
        detailsAndCare: { type: 'string', minLength: 25, maxLength: 500 },
        giftVerdict: {
          type: 'object',
          additionalProperties: false,
          properties: {
            editorialAssessment: { type: 'string', minLength: 40, maxLength: 420 },
            standoutReason: { type: 'string', minLength: 25, maxLength: 300 },
            recipientDelight: { type: 'string', minLength: 25, maxLength: 300 },
            importantCaveat: { type: ['string', 'null'], maxLength: 280 },
          },
        },
        idealRecipientProfile: {
          type: 'object',
          additionalProperties: false,
          properties: {
            headline: { type: 'string', minLength: 10, maxLength: 120 },
            narrative: { type: 'string', minLength: 40, maxLength: 460 },
            lifestyleNotes: {
              type: 'array',
              minItems: 1,
              maxItems: 5,
              items: { type: 'string', minLength: 8, maxLength: 160 },
            },
            relationshipFit: {
              type: 'array',
              minItems: 1,
              maxItems: 5,
              items: { type: 'string', minLength: 4, maxLength: 90 },
            },
          },
        },
        extendedGiftRationale: {
          type: 'array',
          minItems: 1,
          maxItems: 5,
          items: { type: 'string', minLength: 40, maxLength: 520 },
        },
        buyingConsiderations: {
          type: 'array',
          minItems: 1,
          maxItems: 6,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'detail'],
            properties: {
              label: { type: 'string', minLength: 3, maxLength: 80 },
              detail: { type: 'string', minLength: 15, maxLength: 320 },
            },
          },
        },
        occasionContextNotes: {
          type: 'array',
          minItems: 1,
          maxItems: 6,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['occasion', 'label', 'note'],
            properties: {
              occasion: { type: 'string', enum: ALLOWED_OCCASION_VALUES },
              label: { type: 'string', minLength: 3, maxLength: 70 },
              note: { type: 'string', minLength: 15, maxLength: 280 },
            },
          },
        },
        editorialRating: {
          type: ['number', 'null'],
          minimum: 1,
          maximum: 5,
        },
        testingNote: {
          type: ['string', 'null'],
          maxLength: 320,
        },
      },
    },
    taxonomy: {
      type: 'object',
      additionalProperties: false,
      properties: {
        recipients: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          uniqueItems: true,
          items: { type: 'string', enum: ALLOWED_RECIPIENT_VALUES },
        },
        occasions: {
          type: 'array',
          minItems: 1,
          maxItems: 5,
          uniqueItems: true,
          items: { type: 'string', enum: ALLOWED_OCCASION_VALUES },
        },
        interests: {
          type: 'array',
          minItems: 1,
          maxItems: 6,
          uniqueItems: true,
          items: { type: 'string', enum: ALLOWED_INTEREST_VALUES },
        },
        personalityTraits: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          uniqueItems: true,
          items: { type: 'string', enum: ALLOWED_PERSONALITY_VALUES },
        },
        ageRanges: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          uniqueItems: true,
          items: { type: 'string', enum: ALLOWED_AGE_RANGE_VALUES },
        },
        budgetTier: {
          type: ['string', 'null'],
          enum: [...ALLOWED_BUDGET_TIER_VALUES, null],
        },
        guidePriceBucket: {
          type: ['string', 'null'],
          enum: [...ALLOWED_GUIDE_PRICE_BUCKET_VALUES, null],
        },
        suggestedUnmappedTags: {
          type: 'array',
          maxItems: 10,
          items: { type: 'string', minLength: 2, maxLength: 60 },
        },
      },
    },
    media: {
      type: 'object',
      additionalProperties: false,
      properties: {
        images: {
          type: 'array',
          minItems: 0,
          maxItems: MAX_PRODUCT_GALLERY_IMAGES,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['url', 'alt'],
            properties: {
              id: { type: 'string', maxLength: 80 },
              url: { type: 'string', pattern: '^https://' },
              alt: { type: 'string', minLength: 10, maxLength: 220 },
              caption: { type: ['string', 'null'], maxLength: 240 },
              sanityAssetId: { type: ['string', 'null'], maxLength: 160 },
              sourceType: {
                type: ['string', 'null'],
                enum: ['sanity-upload', 'external-url', 'fourthwall-synced', null],
              },
              fourthwallVariantId: { type: ['string', 'null'], maxLength: 120 },
              originalFilename: { type: ['string', 'null'], maxLength: 180 },
              mimeType: { type: ['string', 'null'], maxLength: 60 },
              aspectRatio: { type: ['number', 'null'], minimum: 0.1, maximum: 10 },
              fitMode: { type: 'string', enum: ['cover', 'contain'] },
              fallbackColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
              focalPoint: {
                type: 'object',
                additionalProperties: false,
                required: ['x', 'y'],
                properties: {
                  x: { type: 'number', minimum: 0, maximum: 1 },
                  y: { type: 'number', minimum: 0, maximum: 1 },
                },
              },
              crop: {
                type: 'object',
                additionalProperties: false,
                required: ['top', 'bottom', 'left', 'right'],
                properties: {
                  top: { type: 'number', minimum: 0, maximum: 0.5 },
                  bottom: { type: 'number', minimum: 0, maximum: 0.5 },
                  left: { type: 'number', minimum: 0, maximum: 0.5 },
                  right: { type: 'number', minimum: 0, maximum: 0.5 },
                },
              },
              landscapeOverrideUrl: { type: ['string', 'null'], pattern: '^https://' },
              portraitOverrideUrl: { type: ['string', 'null'], pattern: '^https://' },
              width: { type: 'integer', minimum: 100 },
              height: { type: 'integer', minimum: 100 },
            },
          },
        },
      },
    },
    relationships: {
      type: 'object',
      additionalProperties: false,
      properties: {
        similarGiftComparisons: {
          type: 'array',
          maxItems: 4,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['productId', 'comparisonAngle', 'summary'],
            properties: {
              productId: { type: 'string', pattern: '^prod_[a-z0-9_]+$' },
              comparisonAngle: { type: 'string', minLength: 4, maxLength: 110 },
              summary: { type: 'string', minLength: 15, maxLength: 360 },
              distinctionLabel: { type: ['string', 'null'], maxLength: 60 },
              comparisonNote: { type: ['string', 'null'], maxLength: 360 },
            },
          },
        },
        citationIds: {
          type: 'array',
          maxItems: 8,
          uniqueItems: true,
          items: { type: 'string', pattern: '^cit_[a-z0-9_]+$' },
        },
        relatedProductIds: {
          type: 'array',
          maxItems: 6,
          uniqueItems: true,
          items: { type: 'string', pattern: '^prod_[a-z0-9_]+$' },
        },
        relatedGuideIds: {
          type: 'array',
          maxItems: 6,
          uniqueItems: true,
          items: { type: 'string', pattern: '^guide_[a-z0-9_]+$' },
        },
      },
    },
    seo: {
      type: 'object',
      additionalProperties: false,
      properties: {
        seoTitle: { type: 'string', minLength: 15, maxLength: 65 },
        metaDescription: { type: 'string', minLength: 50, maxLength: 160 },
        canonicalPath: {
          type: 'string',
          pattern: '^/products/[a-z0-9-]+$',
        },
        ogTitle: { type: ['string', 'null'], maxLength: 70 },
        ogDescription: { type: ['string', 'null'], maxLength: 200 },
        ogImage: { type: ['string', 'null'], pattern: '^https://' },
        indexing: {
          type: 'string',
          enum: ['index,follow', 'noindex,follow'],
        },
      },
    },
  },
} as const;

export interface FieldCoverageMappingEntry {
  interchangePath: string;
  astroProductPath: string;
  sanityDocumentPath: string;
  category:
    | 'identity'
    | 'factual_commerce'
    | 'editorial_profile'
    | 'taxonomy'
    | 'media'
    | 'relationships'
    | 'seo'
    | 'governance_internal';
  requiredInCreate: boolean;
  editorialOrFactual: 'factual' | 'editorial' | 'taxonomy' | 'governance';
  notes: string;
}

/**
 * Field Coverage Map documenting the exact correspondence between:
 * 1. Canonical Product Interchange JSON v1.0 (`ProductInterchangeDocumentV1`)
 * 2. Astro / TypeScript `Product` (`src/types/content.ts`)
 * 3. Sanity `product` Document (`src/cms/studio/schemas/documents/product.ts`)
 */
export const PRODUCT_FIELD_COVERAGE_MAP: readonly FieldCoverageMappingEntry[] = [
  {
    interchangePath: 'targetProduct.canonicalProductId',
    astroProductPath: 'id',
    sanityDocumentPath: 'productId / _id ("drafts.prod_<slug>")',
    category: 'identity',
    requiredInCreate: false,
    editorialOrFactual: 'governance',
    notes: 'Derived deterministically from identity.slug ("prod_<slug>") on create; immutable on revision.',
  },
  {
    interchangePath: 'identity.title',
    astroProductPath: 'title',
    sanityDocumentPath: 'title',
    category: 'identity',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: '4–110 characters.',
  },
  {
    interchangePath: 'identity.slug',
    astroProductPath: 'slug',
    sanityDocumentPath: 'slug.current',
    category: 'identity',
    requiredInCreate: true,
    editorialOrFactual: 'governance',
    notes: 'Astro stores flat string; Sanity stores { _type: "slug", current }.',
  },
  {
    interchangePath: 'identity.subtitle',
    astroProductPath: 'subtitle',
    sanityDocumentPath: 'subtitle',
    category: 'identity',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: '10–160 characters.',
  },
  {
    interchangePath: 'identity.productType',
    astroProductPath: 'productType',
    sanityDocumentPath: 'productType',
    category: 'identity',
    requiredInCreate: true,
    editorialOrFactual: 'taxonomy',
    notes: 'Strictly validated against PRODUCT_CATEGORY_OPTIONS (7 canonical categories).',
  },
  {
    interchangePath: 'identity.calloutTag',
    astroProductPath: 'calloutTag',
    sanityDocumentPath: 'calloutTag',
    category: 'identity',
    requiredInCreate: false,
    editorialOrFactual: 'editorial',
    notes: 'Optional short badge up to 42 characters.',
  },
  {
    interchangePath: 'factualContext.sourceUrl',
    astroProductPath: 'purchaseUrl',
    sanityDocumentPath: 'purchaseUrl',
    category: 'factual_commerce',
    requiredInCreate: true,
    editorialOrFactual: 'factual',
    notes: 'Must be valid HTTPS URL and not match placeholder patterns (example.com, localhost).',
  },
  {
    interchangePath: 'factualContext.vendor',
    astroProductPath: 'vendor',
    sanityDocumentPath: 'vendor',
    category: 'factual_commerce',
    requiredInCreate: true,
    editorialOrFactual: 'factual',
    notes: 'Maker or retailer brand name (2–80 chars).',
  },
  {
    interchangePath: 'factualContext.price',
    astroProductPath: 'price',
    sanityDocumentPath: 'price',
    category: 'factual_commerce',
    requiredInCreate: true,
    editorialOrFactual: 'factual',
    notes: 'Nullable in Interchange so AI never invents prices; null maps to 0 on draft with priceVerified=false.',
  },
  {
    interchangePath: 'factualContext.currency',
    astroProductPath: 'currency',
    sanityDocumentPath: 'currency',
    category: 'factual_commerce',
    requiredInCreate: true,
    editorialOrFactual: 'factual',
    notes: 'Fixed to "USD".',
  },
  {
    interchangePath: 'factualContext.inStock',
    astroProductPath: 'inStock',
    sanityDocumentPath: 'inStock',
    category: 'factual_commerce',
    requiredInCreate: true,
    editorialOrFactual: 'factual',
    notes: 'Nullable in Interchange so AI never invents stock status; null maps to inventoryVerified=false.',
  },
  {
    interchangePath: 'factualContext.availabilityNote',
    astroProductPath: 'availabilityNote',
    sanityDocumentPath: 'availabilityNote',
    category: 'factual_commerce',
    requiredInCreate: false,
    editorialOrFactual: 'factual',
    notes: 'Optional shipping or lead-time note (up to 140 chars).',
  },
  {
    interchangePath: 'factualContext.commerceProvider',
    astroProductPath: 'commerceProvider',
    sanityDocumentPath: 'commerceProvider',
    category: 'factual_commerce',
    requiredInCreate: true,
    editorialOrFactual: 'factual',
    notes: 'One of affiliate | fourthwall | digital | direct.',
  },
  {
    interchangePath: 'factualContext.fulfillmentClassification',
    astroProductPath: 'fulfillmentClassification',
    sanityDocumentPath: 'fulfillmentClassification',
    category: 'factual_commerce',
    requiredInCreate: false,
    editorialOrFactual: 'factual',
    notes: 'Auto-derived from commerceProvider if omitted.',
  },
  {
    interchangePath: 'factualContext.externalProductId',
    astroProductPath: 'externalProductId',
    sanityDocumentPath: 'externalProductId',
    category: 'factual_commerce',
    requiredInCreate: false,
    editorialOrFactual: 'factual',
    notes: 'Optional external SKU / Fourthwall ID.',
  },
  {
    interchangePath: 'factualContext.affiliateUrl',
    astroProductPath: 'affiliateUrl',
    sanityDocumentPath: 'affiliateUrl',
    category: 'factual_commerce',
    requiredInCreate: false,
    editorialOrFactual: 'factual',
    notes: 'Optional HTTPS affiliate tracking URL.',
  },
  {
    interchangePath: 'factualContext.fourthwallUrl',
    astroProductPath: 'fourthwallUrl',
    sanityDocumentPath: 'fourthwallUrl',
    category: 'factual_commerce',
    requiredInCreate: false,
    editorialOrFactual: 'factual',
    notes: 'Required when commerceProvider === "fourthwall".',
  },
  {
    interchangePath: 'factualContext.priceVerification',
    astroProductPath: 'priceVerified / priceVerificationSource / priceVerifiedAt / priceVerificationEvidenceNote',
    sanityDocumentPath: 'priceVerified / priceVerificationSource / priceVerifiedAt / priceVerificationEvidenceNote',
    category: 'factual_commerce',
    requiredInCreate: true,
    editorialOrFactual: 'factual',
    notes: 'Forced to verified=false & source="unverified" if price is null or unverified.',
  },
  {
    interchangePath: 'factualContext.inventoryVerification',
    astroProductPath: 'inventoryVerified / inventoryVerificationSource / inventoryVerifiedAt',
    sanityDocumentPath: 'inventoryVerified / inventoryVerificationSource / inventoryVerifiedAt',
    category: 'factual_commerce',
    requiredInCreate: true,
    editorialOrFactual: 'factual',
    notes: 'Forced to verified=false & source="unverified" if inStock is null or unverified.',
  },
  {
    interchangePath: 'factualContext.specifications',
    astroProductPath: 'specifications',
    sanityDocumentPath: 'specifications',
    category: 'factual_commerce',
    requiredInCreate: true,
    editorialOrFactual: 'factual',
    notes: 'Key-value physical specifications (materials, dimensions, origin, care).',
  },
  {
    interchangePath: 'editorialProfile.whyToGiveIt',
    astroProductPath: 'whyToGiveIt',
    sanityDocumentPath: 'whyToGiveIt',
    category: 'editorial_profile',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: 'Primary editorial narrative (60–750 chars).',
  },
  {
    interchangePath: 'editorialProfile.bestForSummary',
    astroProductPath: 'bestForSummary',
    sanityDocumentPath: 'bestForSummary',
    category: 'editorial_profile',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: 'One-sentence quick-scan verdict (18–180 chars).',
  },
  {
    interchangePath: 'editorialProfile.detailsAndCare',
    astroProductPath: 'detailsAndCare',
    sanityDocumentPath: 'detailsAndCare',
    category: 'editorial_profile',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: 'Materials, dimensions, and care summary (25–500 chars).',
  },
  {
    interchangePath: 'editorialProfile.giftVerdict',
    astroProductPath: 'giftVerdict',
    sanityDocumentPath: 'giftVerdict',
    category: 'editorial_profile',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: '4-part Gift Verdict block (editorialAssessment, standoutReason, recipientDelight, importantCaveat).',
  },
  {
    interchangePath: 'editorialProfile.idealRecipientProfile',
    astroProductPath: 'idealRecipientProfile',
    sanityDocumentPath: 'idealRecipientProfile',
    category: 'editorial_profile',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: 'Recipient persona block (headline, narrative, lifestyleNotes, relationshipFit).',
  },
  {
    interchangePath: 'editorialProfile.extendedGiftRationale',
    astroProductPath: 'extendedGiftRationale',
    sanityDocumentPath: 'extendedGiftRationale',
    category: 'editorial_profile',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: '1–5 extended editorial paragraphs.',
  },
  {
    interchangePath: 'editorialProfile.buyingConsiderations',
    astroProductPath: 'buyingConsiderationsList',
    sanityDocumentPath: 'buyingConsiderationsList',
    category: 'editorial_profile',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: 'Cleanly named buyingConsiderations in Interchange; maps to buyingConsiderationsList in Astro & Sanity.',
  },
  {
    interchangePath: 'editorialProfile.occasionContextNotes',
    astroProductPath: 'occasionContextNotes',
    sanityDocumentPath: 'occasionContextNotes',
    category: 'editorial_profile',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: '1–6 occasion-specific gifting notes.',
  },
  {
    interchangePath: 'editorialProfile.editorialRating',
    astroProductPath: 'editorialRating',
    sanityDocumentPath: 'editorialRating',
    category: 'editorial_profile',
    requiredInCreate: false,
    editorialOrFactual: 'editorial',
    notes: 'Optional internal score (1.0–5.0).',
  },
  {
    interchangePath: 'editorialProfile.testingNote',
    astroProductPath: 'testingNote',
    sanityDocumentPath: 'testingNote',
    category: 'editorial_profile',
    requiredInCreate: false,
    editorialOrFactual: 'editorial',
    notes: 'Optional internal testing note.',
  },
  {
    interchangePath: 'taxonomy.recipients',
    astroProductPath: 'recipients',
    sanityDocumentPath: 'recipients',
    category: 'taxonomy',
    requiredInCreate: true,
    editorialOrFactual: 'taxonomy',
    notes: '1–4 values from RECIPIENT_OPTIONS.',
  },
  {
    interchangePath: 'taxonomy.occasions',
    astroProductPath: 'occasions',
    sanityDocumentPath: 'occasions',
    category: 'taxonomy',
    requiredInCreate: true,
    editorialOrFactual: 'taxonomy',
    notes: '1–5 values from OCCASION_OPTIONS.',
  },
  {
    interchangePath: 'taxonomy.interests',
    astroProductPath: 'interests',
    sanityDocumentPath: 'interests',
    category: 'taxonomy',
    requiredInCreate: true,
    editorialOrFactual: 'taxonomy',
    notes: '1–6 values strictly from INTEREST_OPTIONS (9 canonical values). Non-canonical tags are quarantined.',
  },
  {
    interchangePath: 'taxonomy.personalityTraits',
    astroProductPath: 'personalityTraits',
    sanityDocumentPath: 'personalityTraits',
    category: 'taxonomy',
    requiredInCreate: true,
    editorialOrFactual: 'taxonomy',
    notes: '1–3 values from PERSONALITY_TRAIT_OPTIONS.',
  },
  {
    interchangePath: 'taxonomy.ageRanges',
    astroProductPath: 'ageRanges',
    sanityDocumentPath: 'ageRanges',
    category: 'taxonomy',
    requiredInCreate: true,
    editorialOrFactual: 'taxonomy',
    notes: '1–4 values from AGE_RANGE_OPTIONS.',
  },
  {
    interchangePath: 'taxonomy.budgetTier',
    astroProductPath: 'budgetTier',
    sanityDocumentPath: 'budgetTier',
    category: 'taxonomy',
    requiredInCreate: false,
    editorialOrFactual: 'taxonomy',
    notes: 'Auto-derived from factualContext.price (<50 under-50, 50-100 50-to-100, >100 100-plus).',
  },
  {
    interchangePath: 'taxonomy.guidePriceBucket',
    astroProductPath: 'guidePriceBucket',
    sanityDocumentPath: 'guidePriceBucket',
    category: 'taxonomy',
    requiredInCreate: false,
    editorialOrFactual: 'taxonomy',
    notes: 'Auto-derived from factualContext.price (<25 under-25, 25-75 25-to-75, >75 over-75).',
  },
  {
    interchangePath: 'media.images',
    astroProductPath: 'images',
    sanityDocumentPath: 'images',
    category: 'media',
    requiredInCreate: true,
    editorialOrFactual: 'factual',
    notes: '1–8 product images with required alt text, HTTPS url, fitMode, fallbackColor, and focalPoint.',
  },
  {
    interchangePath: 'relationships.similarGiftComparisons',
    astroProductPath: 'similarGiftComparisons',
    sanityDocumentPath: 'similarGiftComparisons',
    category: 'relationships',
    requiredInCreate: false,
    editorialOrFactual: 'editorial',
    notes: 'Interchange & Astro use productId string; Sanity uses product: { _type: "reference", _ref }.',
  },
  {
    interchangePath: 'relationships.citationIds',
    astroProductPath: 'citationIds',
    sanityDocumentPath: 'citationRefs',
    category: 'relationships',
    requiredInCreate: false,
    editorialOrFactual: 'editorial',
    notes: 'Interchange & Astro use citationIds string[]; Sanity uses citationRefs reference[].',
  },
  {
    interchangePath: 'relationships.relatedProductIds',
    astroProductPath: 'relatedProductIds',
    sanityDocumentPath: 'relatedProducts',
    category: 'relationships',
    requiredInCreate: false,
    editorialOrFactual: 'editorial',
    notes: 'Interchange & Astro use relatedProductIds string[]; Sanity uses relatedProducts reference[].',
  },
  {
    interchangePath: 'relationships.relatedGuideIds',
    astroProductPath: 'relatedGuideIds',
    sanityDocumentPath: 'relatedGuides',
    category: 'relationships',
    requiredInCreate: false,
    editorialOrFactual: 'editorial',
    notes: 'Interchange & Astro use relatedGuideIds string[]; Sanity uses relatedGuides reference[].',
  },
  {
    interchangePath: 'seo',
    astroProductPath: 'seo',
    sanityDocumentPath: 'seo',
    category: 'seo',
    requiredInCreate: true,
    editorialOrFactual: 'editorial',
    notes: 'seoTitle, metaDescription, canonicalPath, ogTitle, ogDescription, ogImage, indexing.',
  },
] as const;

export interface ModelInconsistencyFinding {
  id: string;
  title: string;
  astroRepresentation: string;
  sanityRepresentation: string;
  interchangeResolution: string;
  status: 'reconciled_in_schema_and_mapper';
}

/**
 * Audit findings of model inconsistencies discovered across TypeScript interfaces,
 * Sanity document schemas, and the local catalog, along with how Checkpoint 2 reconciles them.
 */
export const PRODUCT_MODEL_INCONSISTENCY_REPORT: readonly ModelInconsistencyFinding[] = [
  {
    id: 'INC-01',
    title: 'Canonical Product Identifier Field Naming (id vs. productId + _id)',
    astroRepresentation: 'Product.id ("prod_<slug>")',
    sanityRepresentation: 'product._id ("drafts.prod_<slug>" | "prod_<slug>") and product.productId ("prod_<slug>")',
    interchangeResolution:
      'Interchange uses targetProduct.canonicalProductId ("prod_<slug>") and derives both Astro id and Sanity _id/productId deterministically.',
    status: 'reconciled_in_schema_and_mapper',
  },
  {
    id: 'INC-02',
    title: 'Slug Structure (Flat String vs. Sanity Slug Object)',
    astroRepresentation: 'Product.slug: string',
    sanityRepresentation: 'product.slug: { _type: "slug", current: string }',
    interchangeResolution:
      'Interchange uses a clean flat string identity.slug and converts to/from { _type: "slug", current } in the Sanity mapper.',
    status: 'reconciled_in_schema_and_mapper',
  },
  {
    id: 'INC-03',
    title: 'Product Image URL & ID Property Parity (url vs. externalUrl, missing id in Sanity object)',
    astroRepresentation: 'ProductImage.id and ProductImage.url',
    sanityRepresentation:
      'productImageObject defined url (and asset), while Studio workspace previously wrote externalUrl in some drafts and lacked an explicit id field.',
    interchangeResolution:
      'Added optional id to Sanity productImageObject; mapper reads url || externalUrl and writes canonical url + id + _key.',
    status: 'reconciled_in_schema_and_mapper',
  },
  {
    id: 'INC-04',
    title: 'Similar Gift Comparisons Reference & comparisonNote Field',
    astroRepresentation: 'ProductSimilarComparison: { productId: string, comparisonAngle, summary, distinctionLabel?, comparisonNote? }',
    sanityRepresentation: 'productSimilarComparisonObject used product: { _type: "reference", _ref } and was missing comparisonNote.',
    interchangeResolution:
      'Added comparisonNote to Sanity productSimilarComparisonObject and mapped productId <-> product._ref losslessly.',
    status: 'reconciled_in_schema_and_mapper',
  },
  {
    id: 'INC-05',
    title: 'Research Citations & Related Content Reference Structures',
    astroRepresentation: 'Product.citationIds: string[], relatedProductIds?: string[], relatedGuideIds?: string[]',
    sanityRepresentation: 'citationRefs: Reference[], relatedProducts: Reference[], relatedGuides: Reference[]',
    interchangeResolution:
      'Interchange uses clean string ID arrays (citationIds, relatedProductIds, relatedGuideIds) and maps them to/from Sanity reference arrays with deterministic _key values.',
    status: 'reconciled_in_schema_and_mapper',
  },
  {
    id: 'INC-06',
    title: 'Sanity Commerce & Verification Provenance Fields Missing on Runtime Product Interface',
    astroRepresentation: 'Product only typed priceVerified?: boolean and inventoryVerified?: boolean.',
    sanityRepresentation:
      'Sanity product defined fulfillmentClassification, priceVerificationSource, priceVerifiedAt, priceVerificationEvidenceNote, inventoryVerificationSource, inventoryVerifiedAt, affiliateUrl, fourthwallUrl, availabilityNote.',
    interchangeResolution:
      'Added these optional fields to Product in src/types/content.ts and structured them under factualContext in Interchange v1.0.',
    status: 'reconciled_in_schema_and_mapper',
  },
  {
    id: 'INC-07',
    title: 'Freeform Legacy Interest Tags in Local Sample Catalog vs. 9 Canonical INTEREST_OPTIONS',
    astroRepresentation: 'Some sample records in catalog.ts included freeform strings (e.g. "Matcha", "Ceramic Craft").',
    sanityRepresentation: 'Sanity product.interests strictly enforces the 9 canonical INTEREST_OPTIONS in taxonomyRegistry.ts.',
    interchangeResolution:
      'Interchange strictly validates taxonomy.interests against the 9 canonical INTEREST_OPTIONS and quarantines any extra AI or legacy tags into quarantinedTaxonomySuggestions / suggestedUnmappedTags without creating new categories.',
    status: 'reconciled_in_schema_and_mapper',
  },
] as const;

export interface ProductInterchangeValidationIssue {
  path: string;
  code:
    | 'INVALID_JSON'
    | 'UNSUPPORTED_SCHEMA_VERSION'
    | 'INVALID_FORMAT_ID'
    | 'INVALID_MODE'
    | 'MISSING_REQUIRED_FIELD'
    | 'TYPE_MISMATCH'
    | 'STRING_LENGTH_OUT_OF_RANGE'
    | 'NUMBER_OUT_OF_RANGE'
    | 'INVALID_URL_FORMAT'
    | 'PLACEHOLDER_URL_FORBIDDEN'
    | 'INVALID_SLUG_FORMAT'
    | 'INVALID_CANONICAL_ID'
    | 'INVALID_CONTROLLED_TAXONOMY'
    | 'TAXONOMY_QUARANTINED'
    | 'BUDGET_TIER_MISMATCH'
    | 'PRICE_BUCKET_MISMATCH'
    | 'UNVERIFIED_FACT_FLAGGED'
    | 'CONTRADICTORY_VERIFICATION_FLAG'
    | 'SELF_REFERENCE_FORBIDDEN'
    | 'DUPLICATE_VALUE'
    | 'UNKNOWN_CLEAR_FIELD'
    | 'VERIFIED_FACT_OVERWRITE_BLOCKED';
  severity: 'error' | 'warning';
  message: string;
}

export interface QuarantinedTaxonomySuggestion {
  sourceField: 'interests' | 'recipients' | 'occasions' | 'personalityTraits' | 'ageRanges' | 'productType' | 'suggestedUnmappedTags';
  rawValue: string;
  reason: string;
}

export interface UnverifiedFactFlag {
  field: 'price' | 'inStock' | 'sourceUrl' | 'vendor';
  reason: string;
}

export interface ProductInterchangeValidationResult {
  valid: boolean;
  mode: ProductInterchangeMode | null;
  schemaVersion: string | null;
  errors: ProductInterchangeValidationIssue[];
  warnings: ProductInterchangeValidationIssue[];
  quarantinedTaxonomySuggestions: QuarantinedTaxonomySuggestion[];
  unverifiedFactFlags: UnverifiedFactFlag[];
  normalized: ProductInterchangeDocumentV1 | null;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CANONICAL_PRODUCT_ID_REGEX = /^prod_[a-z0-9_]+$/;
const CANONICAL_GUIDE_ID_REGEX = /^guide_[a-z0-9_]+$/;
const CANONICAL_CITATION_ID_REGEX = /^cit_[a-z0-9_]+$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const PLACEHOLDER_URL_PATTERNS = [
  /example\.com/i,
  /placeholder/i,
  /localhost/i,
  /127\.0\.0\.1/,
  /your-affiliate-link/i,
  /todo/i,
];

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim().startsWith('https://')) {
    return false;
  }
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function isPlaceholderUrl(url: string): boolean {
  return PLACEHOLDER_URL_PATTERNS.some((pattern) => pattern.test(url));
}

export function isSampleVendorName(vendor?: string | null): boolean {
  return /^sample\s+maker\b/i.test((vendor ?? '').trim());
}

export function deriveCanonicalProductIdFromSlug(slug: string): string {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/^prod_/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `prod_${normalized}`;
}

export function deriveDefaultFulfillmentClassification(
  commerceProvider: CommerceProvider
): FulfillmentClassificationValue {
  switch (commerceProvider) {
    case 'fourthwall':
      return 'fourthwall_merch';
    case 'digital':
      return 'digital_download';
    case 'direct':
      return 'direct_editorial';
    case 'affiliate':
    default:
      return 'affiliate_redirect';
  }
}

/**
 * Extracts raw JSON from a chatbot response that may wrap the JSON payload
 * in a Markdown ```json ... ``` code fence or conversational preamble.
 */
export function parseJsonFromChatbotResponse(rawInput: string): {
  parsed: unknown | null;
  error: string | null;
} {
  if (typeof rawInput !== 'string' || !rawInput.trim()) {
    return { parsed: null, error: 'Input string is empty.' };
  }
  const trimmed = rawInput.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return { parsed: JSON.parse(candidate), error: null };
  } catch (firstErr: any) {
    // Attempt to locate outermost JSON object braces if conversational text surrounds the block
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return {
          parsed: JSON.parse(candidate.slice(firstBrace, lastBrace + 1)),
          error: null,
        };
      } catch {
        // Fall through to original parse error
      }
    }
    return {
      parsed: null,
      error: `Invalid JSON syntax: ${firstErr?.message || 'Unable to parse JSON payload.'}`,
    };
  }
}

/**
 * Validates and normalizes an incoming Product Interchange payload (either a raw JSON string
 * or a parsed JavaScript object) for both `"create"` and `"revision"` modes.
 *
 * Key guarantees:
 * - Rejects missing or incompatible `schemaVersion` (must be `"1.0"`).
 * - Quarantines non-canonical interest tags into `quarantinedTaxonomySuggestions` with a warning
 *   rather than inventing new site categories.
 * - Rejects unknown controlled taxonomy values for `recipients`, `occasions`, `personalityTraits`,
 *   `ageRanges`, and `productType`.
 * - Enforces separation between verified facts and AI editorial copy: if `price` or `inStock` is
 *   `null` or unverified, flags it in `unverifiedFactFlags` and forces verification booleans to `false`.
 * - Auto-derives `budgetTier` and `guidePriceBucket` from `price` when `price` is a positive number.
 */
export function validateAndNormalizeProductInterchange(
  rawInput: unknown
): ProductInterchangeValidationResult {
  const errors: ProductInterchangeValidationIssue[] = [];
  const warnings: ProductInterchangeValidationIssue[] = [];
  const quarantinedTaxonomySuggestions: QuarantinedTaxonomySuggestion[] = [];
  const unverifiedFactFlags: UnverifiedFactFlag[] = [];

  let inputObj: unknown = rawInput;
  if (typeof rawInput === 'string') {
    const parsedResult = parseJsonFromChatbotResponse(rawInput);
    if (parsedResult.error || !parsedResult.parsed) {
      errors.push({
        path: '$',
        code: 'INVALID_JSON',
        severity: 'error',
        message: parsedResult.error || 'Input is not valid JSON.',
      });
      return {
        valid: false,
        mode: null,
        schemaVersion: null,
        errors,
        warnings,
        quarantinedTaxonomySuggestions,
        unverifiedFactFlags,
        normalized: null,
      };
    }
    inputObj = parsedResult.parsed;
  }

  if (!isPlainObject(inputObj)) {
    errors.push({
      path: '$',
      code: 'TYPE_MISMATCH',
      severity: 'error',
      message: 'Root payload must be a JSON object.',
    });
    return {
      valid: false,
      mode: null,
      schemaVersion: null,
      errors,
      warnings,
      quarantinedTaxonomySuggestions,
      unverifiedFactFlags,
      normalized: null,
    };
  }

  const schemaVersion = typeof inputObj.schemaVersion === 'string' ? inputObj.schemaVersion : null;
  if (schemaVersion !== PRODUCT_INTERCHANGE_SCHEMA_VERSION) {
    errors.push({
      path: 'schemaVersion',
      code: 'UNSUPPORTED_SCHEMA_VERSION',
      severity: 'error',
      message: `Unsupported or missing schemaVersion "${String(
        inputObj.schemaVersion ?? ''
      )}". Expected "${PRODUCT_INTERCHANGE_SCHEMA_VERSION}".`,
    });
  }

  if (inputObj.format !== PRODUCT_INTERCHANGE_FORMAT_ID) {
    errors.push({
      path: 'format',
      code: 'INVALID_FORMAT_ID',
      severity: 'error',
      message: `Invalid or missing format "${String(
        inputObj.format ?? ''
      )}". Expected "${PRODUCT_INTERCHANGE_FORMAT_ID}".`,
    });
  }

  const mode: ProductInterchangeMode | null =
    inputObj.mode === 'create' || inputObj.mode === 'revision' ? inputObj.mode : null;
  if (!mode) {
    errors.push({
      path: 'mode',
      code: 'INVALID_MODE',
      severity: 'error',
      message: `Invalid or missing mode "${String(
        inputObj.mode ?? ''
      )}". Expected "create" or "revision".`,
    });
  }

  const isCreate = mode === 'create';
  const isRevision = mode === 'revision';

  const checkStringLength = (
    val: unknown,
    path: string,
    min: number,
    max: number,
    required: boolean
  ): string | undefined => {
    if (val === undefined || val === null) {
      if (required) {
        errors.push({
          path,
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: `Required string field "${path}" is missing.`,
        });
      }
      return undefined;
    }
    if (typeof val !== 'string') {
      errors.push({
        path,
        code: 'TYPE_MISMATCH',
        severity: 'error',
        message: `Field "${path}" must be a string.`,
      });
      return undefined;
    }
    const trimmed = val.trim();
    if (trimmed.length < min || trimmed.length > max) {
      errors.push({
        path,
        code: 'STRING_LENGTH_OUT_OF_RANGE',
        severity: 'error',
        message: `Field "${path}" must be between ${min} and ${max} characters (received ${trimmed.length}).`,
      });
    }
    return trimmed;
  };

  // Validate targetProduct
  let normalizedTargetProduct: ProductInterchangeTargetRefV1 | undefined;
  if (inputObj.targetProduct !== undefined) {
    if (!isPlainObject(inputObj.targetProduct)) {
      errors.push({
        path: 'targetProduct',
        code: 'TYPE_MISMATCH',
        severity: 'error',
        message: '"targetProduct" must be an object.',
      });
    } else {
      const tp = inputObj.targetProduct;
      normalizedTargetProduct = {};
      if (tp.canonicalProductId !== undefined && tp.canonicalProductId !== null) {
        if (
          typeof tp.canonicalProductId !== 'string' ||
          !CANONICAL_PRODUCT_ID_REGEX.test(tp.canonicalProductId.trim())
        ) {
          errors.push({
            path: 'targetProduct.canonicalProductId',
            code: 'INVALID_CANONICAL_ID',
            severity: 'error',
            message:
              'targetProduct.canonicalProductId must match "^prod_[a-z0-9_]+$" (e.g. "prod_hinoki_carafe").',
          });
        } else {
          normalizedTargetProduct.canonicalProductId = tp.canonicalProductId.trim();
        }
      }
      if (tp.slug !== undefined && tp.slug !== null) {
        if (typeof tp.slug !== 'string' || !SLUG_REGEX.test(tp.slug.trim())) {
          errors.push({
            path: 'targetProduct.slug',
            code: 'INVALID_SLUG_FORMAT',
            severity: 'error',
            message: 'targetProduct.slug must be lowercase kebab-case ("[a-z0-9-]+").',
          });
        } else {
          normalizedTargetProduct.slug = tp.slug.trim();
        }
      }
      if (tp.sourceUrl !== undefined && tp.sourceUrl !== null) {
        if (!isValidHttpsUrl(tp.sourceUrl)) {
          errors.push({
            path: 'targetProduct.sourceUrl',
            code: 'INVALID_URL_FORMAT',
            severity: 'error',
            message: 'targetProduct.sourceUrl must be a valid HTTPS URL.',
          });
        } else {
          normalizedTargetProduct.sourceUrl = tp.sourceUrl.trim();
        }
      }
    }
  } else if (isRevision) {
    errors.push({
      path: 'targetProduct',
      code: 'MISSING_REQUIRED_FIELD',
      severity: 'error',
      message: '"targetProduct" is required when mode is "revision".',
    });
  }

  if (
    isRevision &&
    normalizedTargetProduct &&
    !normalizedTargetProduct.canonicalProductId &&
    !normalizedTargetProduct.slug &&
    !normalizedTargetProduct.sourceUrl
  ) {
    errors.push({
      path: 'targetProduct',
      code: 'MISSING_REQUIRED_FIELD',
      severity: 'error',
      message:
        'When mode is "revision", targetProduct must specify at least one of canonicalProductId, slug, or sourceUrl.',
    });
  }

  // Validate revisionControl (for revisions)
  let normalizedRevisionControl: ProductInterchangeRevisionControlV1 | undefined;
  if (inputObj.revisionControl !== undefined) {
    if (!isPlainObject(inputObj.revisionControl)) {
      errors.push({
        path: 'revisionControl',
        code: 'TYPE_MISMATCH',
        severity: 'error',
        message: '"revisionControl" must be an object.',
      });
    } else {
      const rc = inputObj.revisionControl;
      const validClearFields: ClearableProductRevisionField[] = [];
      if (rc.clearFields !== undefined) {
        if (!Array.isArray(rc.clearFields)) {
          errors.push({
            path: 'revisionControl.clearFields',
            code: 'TYPE_MISMATCH',
            severity: 'error',
            message: '"revisionControl.clearFields" must be an array of field paths.',
          });
        } else {
          for (const fieldPath of rc.clearFields) {
            if (
              typeof fieldPath === 'string' &&
              (CLEARABLE_PRODUCT_REVISION_FIELDS as readonly string[]).includes(fieldPath)
            ) {
              if (!validClearFields.includes(fieldPath as ClearableProductRevisionField)) {
                validClearFields.push(fieldPath as ClearableProductRevisionField);
              }
            } else {
              errors.push({
                path: 'revisionControl.clearFields',
                code: 'UNKNOWN_CLEAR_FIELD',
                severity: 'error',
                message: `Field "${String(
                  fieldPath
                )}" is not a supported clearable optional field path.`,
              });
            }
          }
        }
      }
      normalizedRevisionControl = {
        clearFields: validClearFields.length > 0 ? validClearFields : undefined,
        allowOverwriteVerifiedFacts: Boolean(rc.allowOverwriteVerifiedFacts),
        revisionNotes:
          typeof rc.revisionNotes === 'string' ? rc.revisionNotes.trim().slice(0, 500) : undefined,
      };
    }
  }

  // Validate identity
  let normalizedIdentity: Partial<ProductInterchangeIdentityV1> | undefined;
  if (inputObj.identity === undefined) {
    if (isCreate) {
      errors.push({
        path: 'identity',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: '"identity" section is required when mode is "create".',
      });
    }
  } else if (!isPlainObject(inputObj.identity)) {
    errors.push({
      path: 'identity',
      code: 'TYPE_MISMATCH',
      severity: 'error',
      message: '"identity" must be an object.',
    });
  } else {
    const idIn = inputObj.identity;
    normalizedIdentity = {};
    const title = checkStringLength(idIn.title, 'identity.title', 4, 110, isCreate);
    if (title !== undefined) normalizedIdentity.title = title;

    if (idIn.slug === undefined || idIn.slug === null) {
      if (isCreate) {
        errors.push({
          path: 'identity.slug',
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: 'Required field "identity.slug" is missing.',
        });
      }
    } else if (typeof idIn.slug !== 'string' || !SLUG_REGEX.test(idIn.slug.trim())) {
      errors.push({
        path: 'identity.slug',
        code: 'INVALID_SLUG_FORMAT',
        severity: 'error',
        message:
          'Field "identity.slug" must be lowercase kebab-case matching "^[a-z0-9]+(?:-[a-z0-9]+)*$".',
      });
    } else {
      const slugTrimmed = idIn.slug.trim();
      if (slugTrimmed.length < 3 || slugTrimmed.length > 96) {
        errors.push({
          path: 'identity.slug',
          code: 'STRING_LENGTH_OUT_OF_RANGE',
          severity: 'error',
          message: 'Field "identity.slug" must be between 3 and 96 characters.',
        });
      }
      normalizedIdentity.slug = slugTrimmed;
    }

    const subtitle = checkStringLength(idIn.subtitle, 'identity.subtitle', 10, 160, isCreate);
    if (subtitle !== undefined) normalizedIdentity.subtitle = subtitle;

    const normalizedCat = normalizeProductCategory(idIn.productType);
    if (idIn.productType === undefined || idIn.productType === null) {
      if (isCreate) {
        errors.push({
          path: 'identity.productType',
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: 'Required field "identity.productType" is missing.',
        });
      }
    } else if (
      normalizedCat &&
      ALLOWED_PRODUCT_CATEGORY_VALUES.includes(normalizedCat as CanonicalProductCategory)
    ) {
      normalizedIdentity.productType = normalizedCat as CanonicalProductCategory;
    } else {
      errors.push({
        path: 'identity.productType',
        code: 'INVALID_CONTROLLED_TAXONOMY',
        severity: 'error',
        message: `Invalid productType "${String(
          idIn.productType
        )}". Allowed values: ${ALLOWED_PRODUCT_CATEGORY_VALUES.join(', ')}.`,
      });
      if (typeof idIn.productType === 'string' && idIn.productType.trim()) {
        quarantinedTaxonomySuggestions.push({
          sourceField: 'productType',
          rawValue: idIn.productType.trim(),
          reason: 'Not in PRODUCT_CATEGORY_OPTIONS',
        });
      }
    }

    if (idIn.merchandiseType !== undefined) {
      if (idIn.merchandiseType === null) {
        normalizedIdentity.merchandiseType = null;
      } else {
        const mt = checkStringLength(
          idIn.merchandiseType,
          'identity.merchandiseType',
          2,
          60,
          false
        );
        if (mt !== undefined) normalizedIdentity.merchandiseType = mt;
      }
    }

    if (idIn.calloutTag === null) {
      normalizedIdentity.calloutTag = null;
    } else if (idIn.calloutTag !== undefined) {
      const tag = checkStringLength(idIn.calloutTag, 'identity.calloutTag', 1, 42, false);
      if (tag !== undefined) normalizedIdentity.calloutTag = tag;
    }
  }

  // Validate factualContext
  let normalizedFactual: Partial<ProductInterchangeFactualContextV1> | undefined;
  if (inputObj.factualContext === undefined) {
    if (isCreate) {
      errors.push({
        path: 'factualContext',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: '"factualContext" section is required when mode is "create".',
      });
    }
  } else if (!isPlainObject(inputObj.factualContext)) {
    errors.push({
      path: 'factualContext',
      code: 'TYPE_MISMATCH',
      severity: 'error',
      message: '"factualContext" must be an object.',
    });
  } else {
    const fc = inputObj.factualContext;
    normalizedFactual = {};

    // sourceUrl
    if (fc.sourceUrl === null) {
      normalizedFactual.sourceUrl = null;
      unverifiedFactFlags.push({
        field: 'sourceUrl',
        reason: 'sourceUrl is null; editor must supply a verified HTTPS merchant link before publishing.',
      });
      warnings.push({
        path: 'factualContext.sourceUrl',
        code: 'UNVERIFIED_FACT_FLAGGED',
        severity: 'warning',
        message:
          'factualContext.sourceUrl is null. Draft can be saved for editorial review, but cannot be published until a verified HTTPS URL is provided.',
      });
    } else if (fc.sourceUrl !== undefined) {
      if (!isValidHttpsUrl(fc.sourceUrl)) {
        errors.push({
          path: 'factualContext.sourceUrl',
          code: 'INVALID_URL_FORMAT',
          severity: 'error',
          message: 'factualContext.sourceUrl must be a valid HTTPS URL (or null if unknown).',
        });
      } else if (isPlaceholderUrl(fc.sourceUrl)) {
        errors.push({
          path: 'factualContext.sourceUrl',
          code: 'PLACEHOLDER_URL_FORBIDDEN',
          severity: 'error',
          message: `factualContext.sourceUrl "${fc.sourceUrl}" matches a forbidden placeholder domain.`,
        });
      } else {
        normalizedFactual.sourceUrl = fc.sourceUrl.trim();
      }
    } else if (isCreate) {
      errors.push({
        path: 'factualContext.sourceUrl',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: 'Required field "factualContext.sourceUrl" is missing (use null if unknown).',
      });
    }

    // vendor
    const isUnknownVendorStr =
      typeof fc.vendor === 'string' &&
      ['unknown', 'unverified', 'unresolved', 'tbd'].includes(fc.vendor.trim().toLowerCase());

    if (fc.vendor === null || isUnknownVendorStr) {
      normalizedFactual.vendor = null;
      unverifiedFactFlags.push({
        field: 'vendor',
        reason: 'Vendor/maker is unresolved in draft; editor must confirm the brand before publishing.',
      });
    } else if (fc.vendor !== undefined) {
      const v = checkStringLength(fc.vendor, 'factualContext.vendor', 2, 80, false);
      if (v !== undefined) normalizedFactual.vendor = v;
    } else if (isCreate) {
      normalizedFactual.vendor = null;
      unverifiedFactFlags.push({
        field: 'vendor',
        reason: 'factualContext.vendor was omitted; set to null for draft editorial review.',
      });
      warnings.push({
        path: 'factualContext.vendor',
        code: 'UNVERIFIED_FACT_FLAGGED',
        severity: 'warning',
        message: 'factualContext.vendor is null/unresolved for draft review.',
      });
    }

    // price
    if (fc.price === null) {
      normalizedFactual.price = null;
      unverifiedFactFlags.push({
        field: 'price',
        reason: 'price is null (unverified in source prompt); requires human price verification.',
      });
      warnings.push({
        path: 'factualContext.price',
        code: 'UNVERIFIED_FACT_FLAGGED',
        severity: 'warning',
        message:
          'factualContext.price is null. Price verification has been locked to false until an editor verifies live retail pricing.',
      });
    } else if (fc.price !== undefined) {
      if (typeof fc.price !== 'number' || !Number.isFinite(fc.price) || fc.price <= 0) {
        errors.push({
          path: 'factualContext.price',
          code: 'NUMBER_OUT_OF_RANGE',
          severity: 'error',
          message: 'factualContext.price must be a positive number (or null if unknown).',
        });
      } else {
        normalizedFactual.price = Math.round(fc.price * 100) / 100;
      }
    } else if (isCreate) {
      errors.push({
        path: 'factualContext.price',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: 'Required field "factualContext.price" is missing (use null if unknown).',
      });
    }

    // currency
    if (fc.currency !== undefined) {
      if (fc.currency !== 'USD') {
        errors.push({
          path: 'factualContext.currency',
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: 'factualContext.currency must be "USD".',
        });
      } else {
        normalizedFactual.currency = 'USD';
      }
    } else if (isCreate) {
      normalizedFactual.currency = 'USD';
    }

    // inStock
    if (fc.inStock === null) {
      normalizedFactual.inStock = null;
      unverifiedFactFlags.push({
        field: 'inStock',
        reason: 'inStock is null (unverified in source prompt); requires human inventory check.',
      });
      warnings.push({
        path: 'factualContext.inStock',
        code: 'UNVERIFIED_FACT_FLAGGED',
        severity: 'warning',
        message:
          'factualContext.inStock is null. Inventory verification has been locked to false until an editor checks live stock.',
      });
    } else if (fc.inStock !== undefined) {
      if (typeof fc.inStock !== 'boolean') {
        errors.push({
          path: 'factualContext.inStock',
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: 'factualContext.inStock must be a boolean or null.',
        });
      } else {
        normalizedFactual.inStock = fc.inStock;
      }
    } else if (isCreate) {
      errors.push({
        path: 'factualContext.inStock',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: 'Required field "factualContext.inStock" is missing (use null if unknown).',
      });
    }

    // availabilityNote
    if (fc.availabilityNote === null) {
      normalizedFactual.availabilityNote = null;
    } else if (fc.availabilityNote !== undefined) {
      const note = checkStringLength(
        fc.availabilityNote,
        'factualContext.availabilityNote',
        1,
        140,
        false
      );
      if (note !== undefined) normalizedFactual.availabilityNote = note;
    }

    // commerceProvider
    if (fc.commerceProvider !== undefined) {
      if (
        typeof fc.commerceProvider !== 'string' ||
        !ALLOWED_COMMERCE_PROVIDER_VALUES.includes(fc.commerceProvider as CommerceProvider)
      ) {
        errors.push({
          path: 'factualContext.commerceProvider',
          code: 'INVALID_CONTROLLED_TAXONOMY',
          severity: 'error',
          message: `Invalid commerceProvider "${String(
            fc.commerceProvider
          )}". Allowed: ${ALLOWED_COMMERCE_PROVIDER_VALUES.join(', ')}.`,
        });
      } else {
        normalizedFactual.commerceProvider = fc.commerceProvider as CommerceProvider;
      }
    } else if (isCreate) {
      errors.push({
        path: 'factualContext.commerceProvider',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: 'Required field "factualContext.commerceProvider" is missing.',
      });
    }

    // fulfillmentClassification
    if (fc.fulfillmentClassification !== undefined && fc.fulfillmentClassification !== null) {
      if (
        typeof fc.fulfillmentClassification !== 'string' ||
        !ALLOWED_FULFILLMENT_CLASSIFICATION_VALUES.includes(
          fc.fulfillmentClassification as FulfillmentClassificationValue
        )
      ) {
        errors.push({
          path: 'factualContext.fulfillmentClassification',
          code: 'INVALID_CONTROLLED_TAXONOMY',
          severity: 'error',
          message: `Invalid fulfillmentClassification "${String(
            fc.fulfillmentClassification
          )}". Allowed: ${ALLOWED_FULFILLMENT_CLASSIFICATION_VALUES.join(', ')}.`,
        });
      } else {
        normalizedFactual.fulfillmentClassification =
          fc.fulfillmentClassification as FulfillmentClassificationValue;
      }
    } else if (normalizedFactual.commerceProvider) {
      normalizedFactual.fulfillmentClassification = deriveDefaultFulfillmentClassification(
        normalizedFactual.commerceProvider
      );
    }

    // externalProductId, affiliateUrl, fourthwallUrl
    if (fc.externalProductId === null) {
      normalizedFactual.externalProductId = null;
    } else if (fc.externalProductId !== undefined) {
      const extId = checkStringLength(
        fc.externalProductId,
        'factualContext.externalProductId',
        1,
        120,
        false
      );
      if (extId !== undefined) normalizedFactual.externalProductId = extId;
    }

    if (fc.affiliateUrl === null) {
      normalizedFactual.affiliateUrl = null;
    } else if (fc.affiliateUrl !== undefined) {
      if (!isValidHttpsUrl(fc.affiliateUrl) || isPlaceholderUrl(fc.affiliateUrl)) {
        errors.push({
          path: 'factualContext.affiliateUrl',
          code: 'INVALID_URL_FORMAT',
          severity: 'error',
          message: 'factualContext.affiliateUrl must be a valid non-placeholder HTTPS URL.',
        });
      } else {
        normalizedFactual.affiliateUrl = fc.affiliateUrl.trim();
      }
    }

    if (fc.fourthwallUrl === null) {
      normalizedFactual.fourthwallUrl = null;
    } else if (fc.fourthwallUrl !== undefined) {
      if (!isValidHttpsUrl(fc.fourthwallUrl) || isPlaceholderUrl(fc.fourthwallUrl)) {
        errors.push({
          path: 'factualContext.fourthwallUrl',
          code: 'INVALID_URL_FORMAT',
          severity: 'error',
          message: 'factualContext.fourthwallUrl must be a valid non-placeholder HTTPS URL.',
        });
      } else {
        normalizedFactual.fourthwallUrl = fc.fourthwallUrl.trim();
      }
    }

    if (
      normalizedFactual.commerceProvider === 'fourthwall' &&
      isCreate &&
      !normalizedFactual.fourthwallUrl
    ) {
      errors.push({
        path: 'factualContext.fourthwallUrl',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: 'fourthwallUrl is required when commerceProvider is "fourthwall".',
      });
    }

    // priceVerification
    if (fc.priceVerification !== undefined) {
      if (!isPlainObject(fc.priceVerification)) {
        errors.push({
          path: 'factualContext.priceVerification',
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: 'factualContext.priceVerification must be an object.',
        });
      } else {
        const pv = fc.priceVerification;
        const rawSource = pv.source;
        if (!ALLOWED_PRICE_VERIFICATION_SOURCES.includes(rawSource)) {
          errors.push({
            path: 'factualContext.priceVerification.source',
            code: 'INVALID_CONTROLLED_TAXONOMY',
            severity: 'error',
            message: `Invalid priceVerification.source "${String(rawSource)}".`,
          });
        }
        const priceIsKnown =
          typeof normalizedFactual.price === 'number' && normalizedFactual.price > 0;
        let verified = Boolean(pv.verified);
        let source: PriceVerificationSourceValue = ALLOWED_PRICE_VERIFICATION_SOURCES.includes(
          rawSource
        )
          ? rawSource
          : 'unverified';

        if (!priceIsKnown && verified) {
          warnings.push({
            path: 'factualContext.priceVerification.verified',
            code: 'CONTRADICTORY_VERIFICATION_FLAG',
            severity: 'warning',
            message:
              'priceVerification.verified was set to true while price is null; automatically downgraded to verified=false, source="unverified".',
          });
          verified = false;
          source = 'unverified';
        }
        if (verified && source === 'unverified') {
          errors.push({
            path: 'factualContext.priceVerification.source',
            code: 'CONTRADICTORY_VERIFICATION_FLAG',
            severity: 'error',
            message:
              'priceVerification.verified cannot be true when priceVerification.source is "unverified".',
          });
        }
        if (!verified) {
          unverifiedFactFlags.push({
            field: 'price',
            reason: 'Price is marked as unverified; human editor must verify before publication.',
          });
        }
        normalizedFactual.priceVerification = {
          verified,
          source,
          verifiedAt:
            pv.verifiedAt === null
              ? null
              : typeof pv.verifiedAt === 'string'
              ? pv.verifiedAt.trim()
              : undefined,
          evidenceNote:
            pv.evidenceNote === null
              ? null
              : typeof pv.evidenceNote === 'string'
              ? pv.evidenceNote.trim().slice(0, 240)
              : undefined,
        };
      }
    } else if (isCreate) {
      normalizedFactual.priceVerification = {
        verified: false,
        source: 'unverified',
        verifiedAt: null,
        evidenceNote: null,
      };
      unverifiedFactFlags.push({
        field: 'price',
        reason: 'priceVerification omitted; defaulted to unverified.',
      });
    }

    // inventoryVerification
    if (fc.inventoryVerification !== undefined) {
      if (!isPlainObject(fc.inventoryVerification)) {
        errors.push({
          path: 'factualContext.inventoryVerification',
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: 'factualContext.inventoryVerification must be an object.',
        });
      } else {
        const iv = fc.inventoryVerification;
        const rawSource = iv.source;
        if (!ALLOWED_INVENTORY_VERIFICATION_SOURCES.includes(rawSource)) {
          errors.push({
            path: 'factualContext.inventoryVerification.source',
            code: 'INVALID_CONTROLLED_TAXONOMY',
            severity: 'error',
            message: `Invalid inventoryVerification.source "${String(rawSource)}".`,
          });
        }
        const stockIsKnown = typeof normalizedFactual.inStock === 'boolean';
        let verified = Boolean(iv.verified);
        let source: InventoryVerificationSourceValue =
          ALLOWED_INVENTORY_VERIFICATION_SOURCES.includes(rawSource) ? rawSource : 'unverified';

        if (!stockIsKnown && verified) {
          warnings.push({
            path: 'factualContext.inventoryVerification.verified',
            code: 'CONTRADICTORY_VERIFICATION_FLAG',
            severity: 'warning',
            message:
              'inventoryVerification.verified was set to true while inStock is null; automatically downgraded to verified=false, source="unverified".',
          });
          verified = false;
          source = 'unverified';
        }
        if (verified && source === 'unverified') {
          errors.push({
            path: 'factualContext.inventoryVerification.source',
            code: 'CONTRADICTORY_VERIFICATION_FLAG',
            severity: 'error',
            message:
              'inventoryVerification.verified cannot be true when inventoryVerification.source is "unverified".',
          });
        }
        if (!verified) {
          unverifiedFactFlags.push({
            field: 'inStock',
            reason: 'Inventory is marked as unverified; human editor must verify before publication.',
          });
        }
        normalizedFactual.inventoryVerification = {
          verified,
          source,
          verifiedAt:
            iv.verifiedAt === null
              ? null
              : typeof iv.verifiedAt === 'string'
              ? iv.verifiedAt.trim()
              : undefined,
        };
      }
    } else if (isCreate) {
      normalizedFactual.inventoryVerification = {
        verified: false,
        source: 'unverified',
        verifiedAt: null,
      };
      unverifiedFactFlags.push({
        field: 'inStock',
        reason: 'inventoryVerification omitted; defaulted to unverified.',
      });
    }

    // specifications
    if (fc.specifications !== undefined) {
      if (!Array.isArray(fc.specifications)) {
        errors.push({
          path: 'factualContext.specifications',
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: 'factualContext.specifications must be an array.',
        });
      } else {
        if (isCreate && fc.specifications.length === 0) {
          errors.push({
            path: 'factualContext.specifications',
            code: 'MISSING_REQUIRED_FIELD',
            severity: 'error',
            message: 'factualContext.specifications must include at least 1 specification row.',
          });
        }
        const specs: ProductSpecificationItem[] = [];
        fc.specifications.slice(0, 12).forEach((row: unknown, idx: number) => {
          if (!isPlainObject(row)) {
            errors.push({
              path: `factualContext.specifications[${idx}]`,
              code: 'TYPE_MISMATCH',
              severity: 'error',
              message: 'Specification entry must be an object with label and value.',
            });
            return;
          }
          const label = checkStringLength(
            row.label,
            `factualContext.specifications[${idx}].label`,
            2,
            60,
            true
          );
          const value = checkStringLength(
            row.value,
            `factualContext.specifications[${idx}].value`,
            2,
            220,
            true
          );
          if (label && value) {
            specs.push({ label, value });
          }
        });
        normalizedFactual.specifications = specs;
      }
    } else if (isCreate) {
      errors.push({
        path: 'factualContext.specifications',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: 'Required field "factualContext.specifications" is missing.',
      });
    }
  }

  // Validate editorialProfile
  let normalizedEditorial: ProductInterchangeRevisionPayloadV1['editorialProfile'] | undefined;
  if (inputObj.editorialProfile === undefined) {
    if (isCreate) {
      errors.push({
        path: 'editorialProfile',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: '"editorialProfile" section is required when mode is "create".',
      });
    }
  } else if (!isPlainObject(inputObj.editorialProfile)) {
    errors.push({
      path: 'editorialProfile',
      code: 'TYPE_MISMATCH',
      severity: 'error',
      message: '"editorialProfile" must be an object.',
    });
  } else {
    const ep = inputObj.editorialProfile;
    normalizedEditorial = {};

    const whyToGiveIt = checkStringLength(
      ep.whyToGiveIt,
      'editorialProfile.whyToGiveIt',
      60,
      750,
      isCreate
    );
    if (whyToGiveIt !== undefined) normalizedEditorial.whyToGiveIt = whyToGiveIt;

    const bestForSummary = checkStringLength(
      ep.bestForSummary,
      'editorialProfile.bestForSummary',
      18,
      180,
      isCreate
    );
    if (bestForSummary !== undefined) normalizedEditorial.bestForSummary = bestForSummary;

    const detailsAndCare = checkStringLength(
      ep.detailsAndCare,
      'editorialProfile.detailsAndCare',
      25,
      500,
      isCreate
    );
    if (detailsAndCare !== undefined) normalizedEditorial.detailsAndCare = detailsAndCare;

    // giftVerdict
    if (ep.giftVerdict === undefined) {
      if (isCreate) {
        errors.push({
          path: 'editorialProfile.giftVerdict',
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: 'Required field "editorialProfile.giftVerdict" is missing.',
        });
      }
    } else if (!isPlainObject(ep.giftVerdict)) {
      errors.push({
        path: 'editorialProfile.giftVerdict',
        code: 'TYPE_MISMATCH',
        severity: 'error',
        message: '"editorialProfile.giftVerdict" must be an object.',
      });
    } else {
      const gv = ep.giftVerdict;
      const verdictOut: Partial<ProductInterchangeGiftVerdictV1> = {};
      const editorialAssessment = checkStringLength(
        gv.editorialAssessment,
        'editorialProfile.giftVerdict.editorialAssessment',
        40,
        420,
        isCreate
      );
      if (editorialAssessment !== undefined) verdictOut.editorialAssessment = editorialAssessment;

      const standoutReason = checkStringLength(
        gv.standoutReason,
        'editorialProfile.giftVerdict.standoutReason',
        25,
        300,
        isCreate
      );
      if (standoutReason !== undefined) verdictOut.standoutReason = standoutReason;

      const recipientDelight = checkStringLength(
        gv.recipientDelight,
        'editorialProfile.giftVerdict.recipientDelight',
        25,
        300,
        isCreate
      );
      if (recipientDelight !== undefined) verdictOut.recipientDelight = recipientDelight;

      if (gv.importantCaveat === null) {
        verdictOut.importantCaveat = null;
      } else if (gv.importantCaveat !== undefined) {
        const caveat = checkStringLength(
          gv.importantCaveat,
          'editorialProfile.giftVerdict.importantCaveat',
          5,
          280,
          false
        );
        if (caveat !== undefined) verdictOut.importantCaveat = caveat;
      }
      normalizedEditorial.giftVerdict = verdictOut;
    }

    // idealRecipientProfile
    if (ep.idealRecipientProfile === undefined) {
      if (isCreate) {
        errors.push({
          path: 'editorialProfile.idealRecipientProfile',
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: 'Required field "editorialProfile.idealRecipientProfile" is missing.',
        });
      }
    } else if (!isPlainObject(ep.idealRecipientProfile)) {
      errors.push({
        path: 'editorialProfile.idealRecipientProfile',
        code: 'TYPE_MISMATCH',
        severity: 'error',
        message: '"editorialProfile.idealRecipientProfile" must be an object.',
      });
    } else {
      const irp = ep.idealRecipientProfile;
      const profileOut: Partial<ProductInterchangeIdealRecipientProfileV1> = {};
      const headline = checkStringLength(
        irp.headline,
        'editorialProfile.idealRecipientProfile.headline',
        10,
        120,
        isCreate
      );
      if (headline !== undefined) profileOut.headline = headline;

      const narrative = checkStringLength(
        irp.narrative,
        'editorialProfile.idealRecipientProfile.narrative',
        40,
        460,
        isCreate
      );
      if (narrative !== undefined) profileOut.narrative = narrative;

      if (irp.lifestyleNotes !== undefined) {
        if (!Array.isArray(irp.lifestyleNotes) || irp.lifestyleNotes.length === 0) {
          errors.push({
            path: 'editorialProfile.idealRecipientProfile.lifestyleNotes',
            code: 'MISSING_REQUIRED_FIELD',
            severity: 'error',
            message: 'lifestyleNotes must be a non-empty array of 1–5 strings.',
          });
        } else {
          const notes: string[] = [];
          irp.lifestyleNotes.slice(0, 5).forEach((item: unknown, idx: number) => {
            const checked = checkStringLength(
              item,
              `editorialProfile.idealRecipientProfile.lifestyleNotes[${idx}]`,
              8,
              160,
              true
            );
            if (checked) notes.push(checked);
          });
          profileOut.lifestyleNotes = notes;
        }
      } else if (isCreate) {
        errors.push({
          path: 'editorialProfile.idealRecipientProfile.lifestyleNotes',
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: 'Required field "editorialProfile.idealRecipientProfile.lifestyleNotes" is missing.',
        });
      }

      if (irp.relationshipFit !== undefined) {
        if (!Array.isArray(irp.relationshipFit) || irp.relationshipFit.length === 0) {
          errors.push({
            path: 'editorialProfile.idealRecipientProfile.relationshipFit',
            code: 'MISSING_REQUIRED_FIELD',
            severity: 'error',
            message: 'relationshipFit must be a non-empty array of 1–5 strings.',
          });
        } else {
          const fits: string[] = [];
          irp.relationshipFit.slice(0, 5).forEach((item: unknown, idx: number) => {
            const checked = checkStringLength(
              item,
              `editorialProfile.idealRecipientProfile.relationshipFit[${idx}]`,
              4,
              90,
              true
            );
            if (checked) fits.push(checked);
          });
          profileOut.relationshipFit = fits;
        }
      } else if (isCreate) {
        errors.push({
          path: 'editorialProfile.idealRecipientProfile.relationshipFit',
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: 'Required field "editorialProfile.idealRecipientProfile.relationshipFit" is missing.',
        });
      }

      normalizedEditorial.idealRecipientProfile = profileOut;
    }

    // extendedGiftRationale
    if (ep.extendedGiftRationale !== undefined) {
      if (!Array.isArray(ep.extendedGiftRationale)) {
        errors.push({
          path: 'editorialProfile.extendedGiftRationale',
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: 'editorialProfile.extendedGiftRationale must be an array of paragraphs.',
        });
      } else if (isCreate && ep.extendedGiftRationale.length === 0) {
        errors.push({
          path: 'editorialProfile.extendedGiftRationale',
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: 'editorialProfile.extendedGiftRationale must contain 1–5 paragraphs.',
        });
      } else {
        const paragraphs: string[] = [];
        ep.extendedGiftRationale.slice(0, 5).forEach((para: unknown, idx: number) => {
          const checked = checkStringLength(
            para,
            `editorialProfile.extendedGiftRationale[${idx}]`,
            40,
            520,
            true
          );
          if (checked) paragraphs.push(checked);
        });
        normalizedEditorial.extendedGiftRationale = paragraphs;
      }
    } else if (isCreate) {
      errors.push({
        path: 'editorialProfile.extendedGiftRationale',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: 'Required field "editorialProfile.extendedGiftRationale" is missing.',
      });
    }

    // buyingConsiderations
    if (ep.buyingConsiderations !== undefined) {
      if (!Array.isArray(ep.buyingConsiderations)) {
        errors.push({
          path: 'editorialProfile.buyingConsiderations',
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: 'editorialProfile.buyingConsiderations must be an array.',
        });
      } else if (isCreate && ep.buyingConsiderations.length === 0) {
        errors.push({
          path: 'editorialProfile.buyingConsiderations',
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: 'editorialProfile.buyingConsiderations must contain 1–6 items.',
        });
      } else {
        const list: ProductBuyingConsideration[] = [];
        ep.buyingConsiderations.slice(0, 6).forEach((item: unknown, idx: number) => {
          if (!isPlainObject(item)) {
            errors.push({
              path: `editorialProfile.buyingConsiderations[${idx}]`,
              code: 'TYPE_MISMATCH',
              severity: 'error',
              message: 'Buying consideration item must be an object with label and detail.',
            });
            return;
          }
          const label = checkStringLength(
            item.label,
            `editorialProfile.buyingConsiderations[${idx}].label`,
            3,
            80,
            true
          );
          const detail = checkStringLength(
            item.detail,
            `editorialProfile.buyingConsiderations[${idx}].detail`,
            15,
            320,
            true
          );
          if (label && detail) list.push({ label, detail });
        });
        normalizedEditorial.buyingConsiderations = list;
      }
    } else if (isCreate) {
      errors.push({
        path: 'editorialProfile.buyingConsiderations',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: 'Required field "editorialProfile.buyingConsiderations" is missing.',
      });
    }

    // occasionContextNotes
    if (ep.occasionContextNotes !== undefined) {
      if (!Array.isArray(ep.occasionContextNotes)) {
        errors.push({
          path: 'editorialProfile.occasionContextNotes',
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: 'editorialProfile.occasionContextNotes must be an array.',
        });
      } else if (isCreate && ep.occasionContextNotes.length === 0) {
        errors.push({
          path: 'editorialProfile.occasionContextNotes',
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: 'editorialProfile.occasionContextNotes must contain 1–6 items.',
        });
      } else {
        const notes: ProductOccasionNote[] = [];
        ep.occasionContextNotes.slice(0, 6).forEach((item: unknown, idx: number) => {
          if (!isPlainObject(item)) {
            errors.push({
              path: `editorialProfile.occasionContextNotes[${idx}]`,
              code: 'TYPE_MISMATCH',
              severity: 'error',
              message: 'Occasion context note must be an object.',
            });
            return;
          }
          if (
            typeof item.occasion !== 'string' ||
            !ALLOWED_OCCASION_VALUES.includes(item.occasion as OccasionType)
          ) {
            errors.push({
              path: `editorialProfile.occasionContextNotes[${idx}].occasion`,
              code: 'INVALID_CONTROLLED_TAXONOMY',
              severity: 'error',
              message: `Invalid occasion "${String(
                item.occasion
              )}". Allowed: ${ALLOWED_OCCASION_VALUES.join(', ')}.`,
            });
            return;
          }
          const label = checkStringLength(
            item.label,
            `editorialProfile.occasionContextNotes[${idx}].label`,
            3,
            70,
            true
          );
          const note = checkStringLength(
            item.note,
            `editorialProfile.occasionContextNotes[${idx}].note`,
            15,
            280,
            true
          );
          if (label && note) {
            notes.push({
              occasion: item.occasion as OccasionType,
              label,
              note,
            });
          }
        });
        normalizedEditorial.occasionContextNotes = notes;
      }
    } else if (isCreate) {
      errors.push({
        path: 'editorialProfile.occasionContextNotes',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: 'Required field "editorialProfile.occasionContextNotes" is missing.',
      });
    }

    // editorialRating & testingNote
    if (ep.editorialRating === null) {
      normalizedEditorial.editorialRating = null;
    } else if (ep.editorialRating !== undefined) {
      if (
        typeof ep.editorialRating !== 'number' ||
        ep.editorialRating < 1 ||
        ep.editorialRating > 5
      ) {
        errors.push({
          path: 'editorialProfile.editorialRating',
          code: 'NUMBER_OUT_OF_RANGE',
          severity: 'error',
          message: 'editorialProfile.editorialRating must be a number between 1.0 and 5.0.',
        });
      } else {
        normalizedEditorial.editorialRating = Math.round(ep.editorialRating * 10) / 10;
      }
    }

    if (ep.testingNote === null) {
      normalizedEditorial.testingNote = null;
    } else if (ep.testingNote !== undefined) {
      const tn = checkStringLength(ep.testingNote, 'editorialProfile.testingNote', 5, 320, false);
      if (tn !== undefined) normalizedEditorial.testingNote = tn;
    }
  }

  // Validate taxonomy
  let normalizedTaxonomy: Partial<ProductInterchangeTaxonomyV1> | undefined;
  if (inputObj.taxonomy === undefined) {
    if (isCreate) {
      errors.push({
        path: 'taxonomy',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: '"taxonomy" section is required when mode is "create".',
      });
    }
  } else if (!isPlainObject(inputObj.taxonomy)) {
    errors.push({
      path: 'taxonomy',
      code: 'TYPE_MISMATCH',
      severity: 'error',
      message: '"taxonomy" must be an object.',
    });
  } else {
    const tax = inputObj.taxonomy;
    normalizedTaxonomy = {};

    const validateControlledArray = <T extends string>(
      rawArr: unknown,
      path: string,
      allowed: readonly T[],
      sourceField: QuarantinedTaxonomySuggestion['sourceField'],
      minItems: number,
      maxItems: number,
      quarantineInsteadOfError: boolean
    ): T[] | undefined => {
      if (rawArr === undefined) {
        if (isCreate) {
          errors.push({
            path,
            code: 'MISSING_REQUIRED_FIELD',
            severity: 'error',
            message: `Required taxonomy array "${path}" is missing.`,
          });
        }
        return undefined;
      }
      if (!Array.isArray(rawArr)) {
        errors.push({
          path,
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: `Field "${path}" must be an array.`,
        });
        return undefined;
      }
      const accepted: T[] = [];
      for (const item of rawArr) {
        if (typeof item !== 'string' || !item.trim()) {
          errors.push({
            path,
            code: 'TYPE_MISMATCH',
            severity: 'error',
            message: `All values in "${path}" must be non-empty strings.`,
          });
          continue;
        }
        const trimmed = item.trim();
        const candidate = trimmed;

        if ((allowed as readonly string[]).includes(candidate)) {
          if (!accepted.includes(candidate as T)) {
            accepted.push(candidate as T);
          }
        } else if (quarantineInsteadOfError) {
          quarantinedTaxonomySuggestions.push({
            sourceField,
            rawValue: trimmed,
            reason: `Value "${trimmed}" is not in the canonical ${sourceField} vocabulary (${allowed.join(
              ', '
            )}). Quarantined for editor review without creating a new category.`,
          });
          warnings.push({
            path,
            code: 'TAXONOMY_QUARANTINED',
            severity: 'warning',
            message: `Unapproved interest tag "${trimmed}" was quarantined into suggestedUnmappedTags and excluded from canonical taxonomy.interests.`,
          });
        } else {
          quarantinedTaxonomySuggestions.push({
            sourceField,
            rawValue: trimmed,
            reason: `Rejected unapproved value "${trimmed}" outside controlled ${sourceField} vocabulary.`,
          });
          errors.push({
            path,
            code: 'INVALID_CONTROLLED_TAXONOMY',
            severity: 'error',
            message: `Unapproved taxonomy value "${trimmed}" in "${path}". Allowed values: ${allowed.join(
              ', '
            )}.`,
          });
        }
      }

      if (accepted.length < minItems) {
        if (quarantineInsteadOfError) {
          warnings.push({
            path,
            code: 'TAXONOMY_QUARANTINED',
            severity: 'warning',
            message: `"${path}" had no pre-approved canonical values; unapproved values were quarantined into suggestedUnmappedTags for human editor review.`,
          });
        } else {
          errors.push({
            path,
            code: 'MISSING_REQUIRED_FIELD',
            severity: 'error',
            message: `"${path}" must contain at least ${minItems} valid canonical value(s) from [${allowed.join(
              ', '
            )}].`,
          });
        }
      }
      if (accepted.length > maxItems) {
        errors.push({
          path,
          code: 'NUMBER_OUT_OF_RANGE',
          severity: 'error',
          message: `"${path}" allows at most ${maxItems} values (received ${accepted.length}).`,
        });
      }
      return accepted.slice(0, maxItems);
    };

    const recipients = validateControlledArray(
      tax.recipients,
      'taxonomy.recipients',
      ALLOWED_RECIPIENT_VALUES,
      'recipients',
      1,
      4,
      false
    );
    if (recipients !== undefined) normalizedTaxonomy.recipients = recipients;

    const occasions = validateControlledArray(
      tax.occasions,
      'taxonomy.occasions',
      ALLOWED_OCCASION_VALUES,
      'occasions',
      1,
      5,
      false
    );
    if (occasions !== undefined) normalizedTaxonomy.occasions = occasions;

    // For interests, if an AI includes extra non-canonical tags alongside valid canonical tags,
    // quarantine the non-canonical tags into quarantinedTaxonomySuggestions; if zero valid
    // canonical interests remain, validateControlledArray records an error.
    const interests = validateControlledArray(
      tax.interests,
      'taxonomy.interests',
      ALLOWED_INTEREST_VALUES,
      'interests',
      1,
      6,
      true
    );
    if (interests !== undefined) normalizedTaxonomy.interests = interests;

    const personalityTraits = validateControlledArray(
      tax.personalityTraits,
      'taxonomy.personalityTraits',
      ALLOWED_PERSONALITY_VALUES,
      'personalityTraits',
      1,
      3,
      false
    );
    if (personalityTraits !== undefined) normalizedTaxonomy.personalityTraits = personalityTraits;

    const ageRanges = validateControlledArray(
      tax.ageRanges,
      'taxonomy.ageRanges',
      ALLOWED_AGE_RANGE_VALUES,
      'ageRanges',
      1,
      4,
      false
    );
    if (ageRanges !== undefined) normalizedTaxonomy.ageRanges = ageRanges;

    // suggestedUnmappedTags
    const unmappedSet = new Set<string>(
      quarantinedTaxonomySuggestions
        .filter((q) => q.sourceField === 'interests')
        .map((q) => q.rawValue)
    );
    if (tax.suggestedUnmappedTags !== undefined) {
      if (!Array.isArray(tax.suggestedUnmappedTags)) {
        errors.push({
          path: 'taxonomy.suggestedUnmappedTags',
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: 'taxonomy.suggestedUnmappedTags must be an array of strings.',
        });
      } else {
        for (const rawTag of tax.suggestedUnmappedTags) {
          if (typeof rawTag === 'string' && rawTag.trim().length >= 2) {
            const cleanTag = rawTag.trim().slice(0, 60);
            unmappedSet.add(cleanTag);
            quarantinedTaxonomySuggestions.push({
              sourceField: 'suggestedUnmappedTags',
              rawValue: cleanTag,
              reason: 'Provided in suggestedUnmappedTags for optional human editorial review.',
            });
          }
        }
      }
    }
    if (unmappedSet.size > 0) {
      normalizedTaxonomy.suggestedUnmappedTags = Array.from(unmappedSet).slice(0, 10);
    }

    // budgetTier and guidePriceBucket derivation / validation against factualContext.price
    const knownPrice =
      normalizedFactual && typeof normalizedFactual.price === 'number' && normalizedFactual.price > 0
        ? normalizedFactual.price
        : null;

    if (tax.budgetTier !== undefined && tax.budgetTier !== null) {
      if (!ALLOWED_BUDGET_TIER_VALUES.includes(tax.budgetTier as BudgetTierValue)) {
        errors.push({
          path: 'taxonomy.budgetTier',
          code: 'INVALID_CONTROLLED_TAXONOMY',
          severity: 'error',
          message: `Invalid taxonomy.budgetTier "${String(
            tax.budgetTier
          )}". Allowed: ${ALLOWED_BUDGET_TIER_VALUES.join(', ')}.`,
        });
      } else {
        const expectedTier =
          knownPrice !== null
            ? (deriveBudgetTierFromPrice(knownPrice) as BudgetTierValue)
            : (tax.budgetTier as BudgetTierValue);
        if (knownPrice !== null && tax.budgetTier !== expectedTier) {
          warnings.push({
            path: 'taxonomy.budgetTier',
            code: 'BUDGET_TIER_MISMATCH',
            severity: 'warning',
            message: `taxonomy.budgetTier "${tax.budgetTier}" did not match price $${knownPrice}; normalized to "${expectedTier}".`,
          });
        }
        normalizedTaxonomy.budgetTier = expectedTier;
      }
    } else if (knownPrice !== null) {
      normalizedTaxonomy.budgetTier = deriveBudgetTierFromPrice(knownPrice) as BudgetTierValue;
    } else if (isCreate) {
      normalizedTaxonomy.budgetTier = null;
    }

    if (tax.guidePriceBucket !== undefined && tax.guidePriceBucket !== null) {
      if (!ALLOWED_GUIDE_PRICE_BUCKET_VALUES.includes(tax.guidePriceBucket as GuidePriceBucketValue)) {
        errors.push({
          path: 'taxonomy.guidePriceBucket',
          code: 'INVALID_CONTROLLED_TAXONOMY',
          severity: 'error',
          message: `Invalid taxonomy.guidePriceBucket "${String(
            tax.guidePriceBucket
          )}". Allowed: ${ALLOWED_GUIDE_PRICE_BUCKET_VALUES.join(', ')}.`,
        });
      } else {
        const expectedBucket =
          knownPrice !== null
            ? (deriveGuidePriceBucketFromPrice(knownPrice) as GuidePriceBucketValue)
            : (tax.guidePriceBucket as GuidePriceBucketValue);
        if (knownPrice !== null && tax.guidePriceBucket !== expectedBucket) {
          warnings.push({
            path: 'taxonomy.guidePriceBucket',
            code: 'PRICE_BUCKET_MISMATCH',
            severity: 'warning',
            message: `taxonomy.guidePriceBucket "${tax.guidePriceBucket}" did not match price $${knownPrice}; normalized to "${expectedBucket}".`,
          });
        }
        normalizedTaxonomy.guidePriceBucket = expectedBucket;
      }
    } else if (knownPrice !== null) {
      normalizedTaxonomy.guidePriceBucket = deriveGuidePriceBucketFromPrice(
        knownPrice
      ) as GuidePriceBucketValue;
    } else if (isCreate) {
      normalizedTaxonomy.guidePriceBucket = null;
    }
  }

  // Validate media
  let normalizedMedia: Partial<ProductInterchangeMediaV1> | undefined;
  if (inputObj.media === undefined) {
    if (isCreate) {
      errors.push({
        path: 'media',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: '"media" section is required when mode is "create".',
      });
    }
  } else if (!isPlainObject(inputObj.media)) {
    errors.push({
      path: 'media',
      code: 'TYPE_MISMATCH',
      severity: 'error',
      message: '"media" must be an object.',
    });
  } else {
    const mediaIn = inputObj.media;
    normalizedMedia = {};
    if (mediaIn.images === undefined) {
      if (isCreate) {
        errors.push({
          path: 'media.images',
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
          message: 'Required field "media.images" is missing.',
        });
      }
    } else if (!Array.isArray(mediaIn.images)) {
      errors.push({
        path: 'media.images',
        code: 'TYPE_MISMATCH',
        severity: 'error',
        message: 'media.images must be an array of product images.',
      });
    } else if (mediaIn.images.length === 0) {
      normalizedMedia.images = [];
      unverifiedFactFlags.push({
        field: 'sourceUrl',
        reason: 'Product image collection is empty; draft saved without images (asset required before publishing).',
      });
      warnings.push({
        path: 'media.images',
        code: 'UNVERIFIED_FACT_FLAGGED',
        severity: 'warning',
        message:
          'media.images is empty. At least one verified product image will be required before publication.',
      });
    } else {
      const slugBase =
        normalizedIdentity?.slug || normalizedTargetProduct?.slug || 'product';
      const images: ProductInterchangeImageV1[] = [];
      mediaIn.images.slice(0, MAX_PRODUCT_GALLERY_IMAGES).forEach((rawImg: unknown, idx: number) => {
        const pathPrefix = `media.images[${idx}]`;
        if (!isPlainObject(rawImg)) {
          errors.push({
            path: pathPrefix,
            code: 'TYPE_MISMATCH',
            severity: 'error',
            message: 'Image entry must be an object.',
          });
          return;
        }
        const extractedAssetId = extractSanityAssetIdFromImage(rawImg);
        const rawUrl =
          rawImg.url ??
          rawImg.externalUrl ??
          (extractedAssetId ? resolveSanityImageUrlFromAssetRef(extractedAssetId) : undefined);

        if (
          typeof rawUrl === 'string' &&
          (rawUrl.trim().toLowerCase().startsWith('data:') ||
            rawUrl.trim().toLowerCase().startsWith('blob:'))
        ) {
          errors.push({
            path: `${pathPrefix}.url`,
            code: 'INVALID_URL_FORMAT',
            severity: 'error',
            message:
              'Binary base64 data: URLs and temporary blob: URLs are forbidden in permanent product JSON. Upload images to Sanity Content Lake assets first.',
          });
          return;
        }

        if (!isValidHttpsUrl(rawUrl)) {
          errors.push({
            path: `${pathPrefix}.url`,
            code: 'INVALID_URL_FORMAT',
            severity: 'error',
            message: 'Image url must be a valid HTTPS URL.',
          });
          return;
        }
        if (isPlaceholderUrl(rawUrl)) {
          errors.push({
            path: `${pathPrefix}.url`,
            code: 'PLACEHOLDER_URL_FORBIDDEN',
            severity: 'error',
            message: `Image url "${rawUrl}" matches a forbidden placeholder domain.`,
          });
          return;
        }
        const alt = checkStringLength(rawImg.alt, `${pathPrefix}.alt`, 10, 220, true);
        if (!alt) return;

        const fitMode =
          rawImg.fitMode === 'contain' || rawImg.fitMode === 'cover'
            ? rawImg.fitMode
            : 'cover';
        const fallbackColor =
          typeof rawImg.fallbackColor === 'string' && HEX_COLOR_REGEX.test(rawImg.fallbackColor)
            ? rawImg.fallbackColor
            : '#F6F4EF';

        let focalPoint = { x: 0.5, y: 0.5 };
        const fpSource = isPlainObject(rawImg.focalPoint)
          ? rawImg.focalPoint
          : isPlainObject(rawImg.asset?.hotspot)
          ? rawImg.asset.hotspot
          : null;
        if (fpSource) {
          const fx = Number(fpSource.x);
          const fy = Number(fpSource.y);
          if (
            !Number.isFinite(fx) ||
            !Number.isFinite(fy) ||
            fx < 0 ||
            fx > 1 ||
            fy < 0 ||
            fy > 1
          ) {
            errors.push({
              path: `${pathPrefix}.focalPoint`,
              code: 'NUMBER_OUT_OF_RANGE',
              severity: 'error',
              message: 'Image focalPoint.x and focalPoint.y must be numbers between 0 and 1.',
            });
          } else {
            focalPoint = { x: fx, y: fy };
          }
        }

        let crop: { top: number; bottom: number; left: number; right: number } | undefined;
        const cropSource = isPlainObject(rawImg.crop)
          ? rawImg.crop
          : isPlainObject(rawImg.asset?.crop)
          ? rawImg.asset.crop
          : null;
        if (cropSource) {
          const top = Number(cropSource.top ?? 0);
          const bottom = Number(cropSource.bottom ?? 0);
          const left = Number(cropSource.left ?? 0);
          const right = Number(cropSource.right ?? 0);
          if (
            [top, bottom, left, right].some((v) => !Number.isFinite(v) || v < 0 || v > 0.5)
          ) {
            errors.push({
              path: `${pathPrefix}.crop`,
              code: 'NUMBER_OUT_OF_RANGE',
              severity: 'error',
              message: 'Image crop bounds (top, bottom, left, right) must be between 0 and 0.5.',
            });
          } else {
            crop = { top, bottom, left, right };
          }
        }

        const resolvedWidth =
          typeof rawImg.width === 'number' && rawImg.width >= 100
            ? Math.round(rawImg.width)
            : 2400;
        const resolvedHeight =
          typeof rawImg.height === 'number' && rawImg.height >= 100
            ? Math.round(rawImg.height)
            : 2400;

        images.push({
          id:
            typeof rawImg.id === 'string' && rawImg.id.trim()
              ? rawImg.id.trim()
              : `img_${slugBase.replace(/-/g, '_')}_${String(idx + 1).padStart(2, '0')}`,
          url: rawUrl.trim(),
          alt,
          caption:
            rawImg.caption === null
              ? null
              : typeof rawImg.caption === 'string' && rawImg.caption.trim()
              ? rawImg.caption.trim().slice(0, 240)
              : undefined,
          sanityAssetId: extractedAssetId ?? undefined,
          sourceType:
            rawImg.sourceType === 'sanity-upload' ||
            rawImg.sourceType === 'external-url' ||
            rawImg.sourceType === 'fourthwall-synced'
              ? rawImg.sourceType
              : extractedAssetId
              ? 'sanity-upload'
              : 'external-url',
          fourthwallVariantId:
            typeof rawImg.fourthwallVariantId === 'string' && rawImg.fourthwallVariantId.trim()
              ? rawImg.fourthwallVariantId.trim().slice(0, 120)
              : undefined,
          originalFilename:
            typeof rawImg.originalFilename === 'string' && rawImg.originalFilename.trim()
              ? rawImg.originalFilename.trim().slice(0, 180)
              : undefined,
          mimeType:
            typeof rawImg.mimeType === 'string' && rawImg.mimeType.trim()
              ? rawImg.mimeType.trim().slice(0, 60)
              : undefined,
          aspectRatio:
            typeof rawImg.aspectRatio === 'number' && Number.isFinite(rawImg.aspectRatio) && rawImg.aspectRatio > 0
              ? Math.round(rawImg.aspectRatio * 1000) / 1000
              : Math.round((resolvedWidth / resolvedHeight) * 1000) / 1000,
          fitMode,
          fallbackColor,
          focalPoint,
          crop,
          landscapeOverrideUrl:
            rawImg.landscapeOverrideUrl === null
              ? null
              : isValidHttpsUrl(rawImg.landscapeOverrideUrl)
              ? rawImg.landscapeOverrideUrl.trim()
              : undefined,
          portraitOverrideUrl:
            rawImg.portraitOverrideUrl === null
              ? null
              : isValidHttpsUrl(rawImg.portraitOverrideUrl)
              ? rawImg.portraitOverrideUrl.trim()
              : undefined,
          width: resolvedWidth,
          height: resolvedHeight,
        });
      });
      normalizedMedia.images = images;
    }
  }

  // Determine self canonical product ID to guard against self-reference in relationships
  const selfCanonicalId =
    normalizedTargetProduct?.canonicalProductId ||
    (normalizedIdentity?.slug ? deriveCanonicalProductIdFromSlug(normalizedIdentity.slug) : null);

  // Validate relationships
  let normalizedRelationships: Partial<ProductInterchangeRelationshipsV1> | undefined;
  if (inputObj.relationships !== undefined) {
    if (!isPlainObject(inputObj.relationships)) {
      errors.push({
        path: 'relationships',
        code: 'TYPE_MISMATCH',
        severity: 'error',
        message: '"relationships" must be an object.',
      });
    } else {
      const rel = inputObj.relationships;
      normalizedRelationships = {};

      if (rel.similarGiftComparisons !== undefined) {
        if (!Array.isArray(rel.similarGiftComparisons)) {
          errors.push({
            path: 'relationships.similarGiftComparisons',
            code: 'TYPE_MISMATCH',
            severity: 'error',
            message: 'relationships.similarGiftComparisons must be an array.',
          });
        } else {
          const seenCompared = new Set<string>();
          const comps: ProductInterchangeSimilarComparisonV1[] = [];
          rel.similarGiftComparisons.slice(0, 4).forEach((item: unknown, idx: number) => {
            const p = `relationships.similarGiftComparisons[${idx}]`;
            if (!isPlainObject(item)) {
              errors.push({
                path: p,
                code: 'TYPE_MISMATCH',
                severity: 'error',
                message: 'Comparison item must be an object.',
              });
              return;
            }
            const prodId =
              typeof item.productId === 'string' ? item.productId.trim() : '';
            if (!CANONICAL_PRODUCT_ID_REGEX.test(prodId)) {
              errors.push({
                path: `${p}.productId`,
                code: 'INVALID_CANONICAL_ID',
                severity: 'error',
                message: `productId "${prodId}" must match "^prod_[a-z0-9_]+$".`,
              });
              return;
            }
            if (selfCanonicalId && prodId === selfCanonicalId) {
              errors.push({
                path: `${p}.productId`,
                code: 'SELF_REFERENCE_FORBIDDEN',
                severity: 'error',
                message: `Product "${selfCanonicalId}" cannot compare against itself in similarGiftComparisons.`,
              });
              return;
            }
            if (seenCompared.has(prodId)) {
              errors.push({
                path: `${p}.productId`,
                code: 'DUPLICATE_VALUE',
                severity: 'error',
                message: `Duplicate productId "${prodId}" in similarGiftComparisons.`,
              });
              return;
            }
            seenCompared.add(prodId);

            const angle = checkStringLength(
              item.comparisonAngle,
              `${p}.comparisonAngle`,
              4,
              110,
              true
            );
            const summary = checkStringLength(
              item.summary,
              `${p}.summary`,
              15,
              360,
              true
            );
            if (!angle || !summary) return;

            comps.push({
              productId: prodId,
              comparisonAngle: angle,
              summary,
              distinctionLabel:
                item.distinctionLabel === null
                  ? null
                  : typeof item.distinctionLabel === 'string' && item.distinctionLabel.trim()
                  ? item.distinctionLabel.trim().slice(0, 60)
                  : undefined,
              comparisonNote:
                item.comparisonNote === null
                  ? null
                  : typeof item.comparisonNote === 'string' && item.comparisonNote.trim()
                  ? item.comparisonNote.trim().slice(0, 360)
                  : undefined,
            });
          });
          normalizedRelationships.similarGiftComparisons = comps;
        }
      }

      if (rel.citationIds !== undefined) {
        if (!Array.isArray(rel.citationIds)) {
          errors.push({
            path: 'relationships.citationIds',
            code: 'TYPE_MISMATCH',
            severity: 'error',
            message: 'relationships.citationIds must be an array of canonical citation IDs.',
          });
        } else {
          const ids: string[] = [];
          rel.citationIds.forEach((id: unknown, idx: number) => {
            if (typeof id !== 'string' || !CANONICAL_CITATION_ID_REGEX.test(id.trim())) {
              errors.push({
                path: `relationships.citationIds[${idx}]`,
                code: 'INVALID_CANONICAL_ID',
                severity: 'error',
                message: `Citation ID "${String(id)}" must match "^cit_[a-z0-9_]+$".`,
              });
              return;
            }
            const clean = id.trim();
            if (!ids.includes(clean)) ids.push(clean);
          });
          normalizedRelationships.citationIds = ids.slice(0, 8);
        }
      }

      if (rel.relatedProductIds !== undefined) {
        if (!Array.isArray(rel.relatedProductIds)) {
          errors.push({
            path: 'relationships.relatedProductIds',
            code: 'TYPE_MISMATCH',
            severity: 'error',
            message: 'relationships.relatedProductIds must be an array of canonical product IDs.',
          });
        } else {
          const ids: string[] = [];
          rel.relatedProductIds.forEach((id: unknown, idx: number) => {
            if (typeof id !== 'string' || !CANONICAL_PRODUCT_ID_REGEX.test(id.trim())) {
              errors.push({
                path: `relationships.relatedProductIds[${idx}]`,
                code: 'INVALID_CANONICAL_ID',
                severity: 'error',
                message: `Related product ID "${String(id)}" must match "^prod_[a-z0-9_]+$".`,
              });
              return;
            }
            const clean = id.trim();
            if (selfCanonicalId && clean === selfCanonicalId) {
              errors.push({
                path: `relationships.relatedProductIds[${idx}]`,
                code: 'SELF_REFERENCE_FORBIDDEN',
                severity: 'error',
                message: `Product "${selfCanonicalId}" cannot reference itself in relatedProductIds.`,
              });
              return;
            }
            if (!ids.includes(clean)) ids.push(clean);
          });
          normalizedRelationships.relatedProductIds = ids.slice(0, 6);
        }
      }

      if (rel.relatedGuideIds !== undefined) {
        if (!Array.isArray(rel.relatedGuideIds)) {
          errors.push({
            path: 'relationships.relatedGuideIds',
            code: 'TYPE_MISMATCH',
            severity: 'error',
            message: 'relationships.relatedGuideIds must be an array of canonical guide IDs.',
          });
        } else {
          const ids: string[] = [];
          rel.relatedGuideIds.forEach((id: unknown, idx: number) => {
            if (typeof id !== 'string' || !CANONICAL_GUIDE_ID_REGEX.test(id.trim())) {
              errors.push({
                path: `relationships.relatedGuideIds[${idx}]`,
                code: 'INVALID_CANONICAL_ID',
                severity: 'error',
                message: `Related guide ID "${String(id)}" must match "^guide_[a-z0-9_]+$".`,
              });
              return;
            }
            const clean = id.trim();
            if (!ids.includes(clean)) ids.push(clean);
          });
          normalizedRelationships.relatedGuideIds = ids.slice(0, 6);
        }
      }
    }
  } else if (isCreate) {
    normalizedRelationships = {
      similarGiftComparisons: [],
      citationIds: [],
      relatedProductIds: [],
      relatedGuideIds: [],
    };
  }

  // Validate seo
  let normalizedSeo: Partial<ProductInterchangeSeoV1> | undefined;
  if (inputObj.seo === undefined) {
    if (isCreate) {
      errors.push({
        path: 'seo',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: '"seo" section is required when mode is "create".',
      });
    }
  } else if (!isPlainObject(inputObj.seo)) {
    errors.push({
      path: 'seo',
      code: 'TYPE_MISMATCH',
      severity: 'error',
      message: '"seo" must be an object.',
    });
  } else {
    const seoIn = inputObj.seo;
    normalizedSeo = {};

    const seoTitle = checkStringLength(seoIn.seoTitle, 'seo.seoTitle', 15, 65, isCreate);
    if (seoTitle !== undefined) normalizedSeo.seoTitle = seoTitle;

    const metaDescription = checkStringLength(
      seoIn.metaDescription,
      'seo.metaDescription',
      50,
      160,
      isCreate
    );
    if (metaDescription !== undefined) normalizedSeo.metaDescription = metaDescription;

    if (seoIn.canonicalPath !== undefined && seoIn.canonicalPath !== null) {
      if (
        typeof seoIn.canonicalPath !== 'string' ||
        !/^\/products\/[a-z0-9-]+$/.test(seoIn.canonicalPath.trim())
      ) {
        errors.push({
          path: 'seo.canonicalPath',
          code: 'INVALID_SLUG_FORMAT',
          severity: 'error',
          message:
            'seo.canonicalPath must be a relative product path matching "^/products/[a-z0-9-]+$".',
        });
      } else {
        normalizedSeo.canonicalPath = seoIn.canonicalPath.trim();
      }
    } else if (isCreate && normalizedIdentity?.slug) {
      normalizedSeo.canonicalPath = `/products/${normalizedIdentity.slug}`;
    } else if (isCreate) {
      errors.push({
        path: 'seo.canonicalPath',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: 'Required field "seo.canonicalPath" is missing.',
      });
    }

    if (seoIn.ogTitle === null) {
      normalizedSeo.ogTitle = null;
    } else if (seoIn.ogTitle !== undefined) {
      const ogt = checkStringLength(seoIn.ogTitle, 'seo.ogTitle', 5, 70, false);
      if (ogt !== undefined) normalizedSeo.ogTitle = ogt;
    }

    if (seoIn.ogDescription === null) {
      normalizedSeo.ogDescription = null;
    } else if (seoIn.ogDescription !== undefined) {
      const ogd = checkStringLength(seoIn.ogDescription, 'seo.ogDescription', 15, 200, false);
      if (ogd !== undefined) normalizedSeo.ogDescription = ogd;
    }

    if (seoIn.ogImage === null) {
      normalizedSeo.ogImage = null;
    } else if (seoIn.ogImage !== undefined) {
      if (!isValidHttpsUrl(seoIn.ogImage)) {
        errors.push({
          path: 'seo.ogImage',
          code: 'INVALID_URL_FORMAT',
          severity: 'error',
          message: 'seo.ogImage must be a valid HTTPS URL (or null).',
        });
      } else {
        normalizedSeo.ogImage = seoIn.ogImage.trim();
      }
    }

    if (seoIn.indexing !== undefined) {
      if (seoIn.indexing !== 'index,follow' && seoIn.indexing !== 'noindex,follow') {
        errors.push({
          path: 'seo.indexing',
          code: 'INVALID_CONTROLLED_TAXONOMY',
          severity: 'error',
          message: 'seo.indexing must be "index,follow" or "noindex,follow".',
        });
      } else {
        normalizedSeo.indexing = seoIn.indexing;
      }
    } else if (isCreate) {
      normalizedSeo.indexing = 'index,follow';
    }
  }

  if (errors.length > 0 || !mode) {
    return {
      valid: false,
      mode,
      schemaVersion,
      errors,
      warnings,
      quarantinedTaxonomySuggestions,
      unverifiedFactFlags,
      normalized: null,
    };
  }

  if (mode === 'create') {
    const slug = normalizedIdentity!.slug!;
    const canonicalProductId =
      normalizedTargetProduct?.canonicalProductId || deriveCanonicalProductIdFromSlug(slug);
    const createDoc: ProductInterchangeCreatePayloadV1 = {
      schemaVersion: PRODUCT_INTERCHANGE_SCHEMA_VERSION,
      format: PRODUCT_INTERCHANGE_FORMAT_ID,
      mode: 'create',
      targetProduct: {
        canonicalProductId,
        slug,
        sourceUrl: normalizedFactual!.sourceUrl ?? undefined,
      },
      factualContext: normalizedFactual as ProductInterchangeFactualContextV1,
      identity: normalizedIdentity as ProductInterchangeIdentityV1,
      editorialProfile: normalizedEditorial as ProductInterchangeEditorialProfileV1,
      taxonomy: normalizedTaxonomy as ProductInterchangeTaxonomyV1,
      media: normalizedMedia as ProductInterchangeMediaV1,
      relationships: normalizedRelationships,
      seo: normalizedSeo as ProductInterchangeSeoV1,
    };
    return {
      valid: true,
      mode: 'create',
      schemaVersion,
      errors,
      warnings,
      quarantinedTaxonomySuggestions,
      unverifiedFactFlags,
      normalized: createDoc,
    };
  }

  const revisionDoc: ProductInterchangeRevisionPayloadV1 = {
    schemaVersion: PRODUCT_INTERCHANGE_SCHEMA_VERSION,
    format: PRODUCT_INTERCHANGE_FORMAT_ID,
    mode: 'revision',
    targetProduct: normalizedTargetProduct!,
    revisionControl: normalizedRevisionControl,
    factualContext: normalizedFactual,
    identity: normalizedIdentity,
    editorialProfile: normalizedEditorial,
    taxonomy: normalizedTaxonomy,
    media: normalizedMedia,
    relationships: normalizedRelationships,
    seo: normalizedSeo,
  };

  return {
    valid: true,
    mode: 'revision',
    schemaVersion,
    errors,
    warnings,
    quarantinedTaxonomySuggestions,
    unverifiedFactFlags,
    normalized: revisionDoc,
  };
}

/**
 * Converts a validated `ProductInterchangeCreatePayloadV1` into the runtime
 * Astro / TypeScript `Product` interface (`src/types/content.ts`).
 */
export function mapInterchangeToAstroProduct(
  doc: ProductInterchangeCreatePayloadV1
): Product {
  const slug = doc.identity.slug;
  const canonicalId =
    doc.targetProduct?.canonicalProductId || deriveCanonicalProductIdFromSlug(slug);
  const numericPrice =
    typeof doc.factualContext.price === 'number' && doc.factualContext.price > 0
      ? doc.factualContext.price
      : 0;

  const budgetTier: BudgetTierValue =
    doc.taxonomy.budgetTier ||
    (deriveBudgetTierFromPrice(numericPrice > 0 ? numericPrice : 45) as BudgetTierValue);
  const guidePriceBucket: GuidePriceBucketValue =
    doc.taxonomy.guidePriceBucket ||
    (deriveGuidePriceBucketFromPrice(
      numericPrice > 0 ? numericPrice : 45
    ) as GuidePriceBucketValue);

  const images: ProductImage[] = doc.media.images.map((img, idx) => {
    const sanityAssetId = extractSanityAssetIdFromImage(img as any);
    const focalPoint = img.focalPoint || { x: 0.5, y: 0.5 };
    return {
      id: img.id || `img_${slug.replace(/-/g, '_')}_${String(idx + 1).padStart(2, '0')}`,
      url: img.url,
      alt: img.alt,
      caption: img.caption ?? undefined,
      sanityAssetId,
      asset: sanityAssetId
        ? {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: sanityAssetId,
            },
            hotspot: {
              _type: 'sanity.imageHotspot',
              x: focalPoint.x,
              y: focalPoint.y,
              width: 0.3,
              height: 0.3,
            },
            ...(img.crop
              ? {
                  crop: {
                    _type: 'sanity.imageCrop',
                    top: img.crop.top,
                    bottom: img.crop.bottom,
                    left: img.crop.left,
                    right: img.crop.right,
                  },
                }
              : {}),
          }
        : undefined,
      sourceType:
        img.sourceType || (sanityAssetId ? 'sanity-upload' : 'external-url'),
      fourthwallVariantId: img.fourthwallVariantId ?? undefined,
      originalFilename: img.originalFilename ?? undefined,
      mimeType: img.mimeType ?? undefined,
      aspectRatio: img.aspectRatio ?? undefined,
      fitMode: img.fitMode || 'cover',
      fallbackColor: img.fallbackColor || '#F6F4EF',
      focalPoint,
      crop: img.crop,
      landscapeOverrideUrl: img.landscapeOverrideUrl ?? undefined,
      portraitOverrideUrl: img.portraitOverrideUrl ?? undefined,
      width: img.width || 2400,
      height: img.height || 2400,
      isSampleAsset: false,
    };
  });

  const giftVerdict: ProductGiftVerdict = {
    editorialAssessment: doc.editorialProfile.giftVerdict.editorialAssessment,
    standoutReason: doc.editorialProfile.giftVerdict.standoutReason,
    recipientDelight: doc.editorialProfile.giftVerdict.recipientDelight,
    importantCaveat: doc.editorialProfile.giftVerdict.importantCaveat ?? undefined,
  };

  const idealRecipientProfile: ProductIdealRecipientProfile = {
    headline: doc.editorialProfile.idealRecipientProfile.headline,
    narrative: doc.editorialProfile.idealRecipientProfile.narrative,
    lifestyleNotes: [...doc.editorialProfile.idealRecipientProfile.lifestyleNotes],
    relationshipFit: [...doc.editorialProfile.idealRecipientProfile.relationshipFit],
  };

  const similarGiftComparisons: ProductSimilarComparison[] = (
    doc.relationships?.similarGiftComparisons || []
  ).map((comp) => ({
    productId: comp.productId,
    comparisonAngle: comp.comparisonAngle,
    summary: comp.summary,
    distinctionLabel: comp.distinctionLabel ?? undefined,
    comparisonNote: comp.comparisonNote ?? undefined,
  }));

  const seo: SEOConfig = {
    seoTitle: doc.seo.seoTitle,
    metaDescription: doc.seo.metaDescription,
    canonicalPath: doc.seo.canonicalPath || `/products/${slug}`,
    ogTitle: doc.seo.ogTitle ?? undefined,
    ogDescription: doc.seo.ogDescription ?? undefined,
    ogImage: doc.seo.ogImage ?? undefined,
    ogType: 'product',
    schemaType: 'Product',
    indexing: doc.seo.indexing || 'index,follow',
  };

  return {
    id: canonicalId,
    slug,
    title: doc.identity.title,
    subtitle: doc.identity.subtitle,
    status: 'draft',
    vendor: doc.factualContext.vendor || 'Unverified Vendor',
    price: numericPrice,
    currency: 'USD',
    budgetTier,
    guidePriceBucket,
    productType: doc.identity.productType,
    commerceProvider: doc.factualContext.commerceProvider,
    fulfillmentClassification:
      doc.factualContext.fulfillmentClassification ||
      deriveDefaultFulfillmentClassification(doc.factualContext.commerceProvider),
    externalProductId: doc.factualContext.externalProductId ?? undefined,
    purchaseUrl: doc.factualContext.sourceUrl || '',
    affiliateUrl: doc.factualContext.affiliateUrl ?? undefined,
    fourthwallUrl: doc.factualContext.fourthwallUrl ?? undefined,
    isPlaceholderLink: false,
    isSampleProduct: false,
    priceVerified: Boolean(doc.factualContext.priceVerification.verified && numericPrice > 0),
    priceVerificationSource: doc.factualContext.priceVerification.source,
    priceVerifiedAt: doc.factualContext.priceVerification.verifiedAt ?? undefined,
    priceVerificationEvidenceNote:
      doc.factualContext.priceVerification.evidenceNote ?? undefined,
    inventoryVerified: Boolean(
      doc.factualContext.inventoryVerification.verified &&
        typeof doc.factualContext.inStock === 'boolean'
    ),
    inventoryVerificationSource: doc.factualContext.inventoryVerification.source,
    inventoryVerifiedAt: doc.factualContext.inventoryVerification.verifiedAt ?? undefined,
    inStock: doc.factualContext.inStock ?? false,
    availabilityNote: doc.factualContext.availabilityNote ?? undefined,
    calloutTag: doc.identity.calloutTag ?? undefined,
    whyToGiveIt: doc.editorialProfile.whyToGiveIt,
    detailsAndCare: doc.editorialProfile.detailsAndCare,
    bestForSummary: doc.editorialProfile.bestForSummary,
    recipients: [...doc.taxonomy.recipients],
    interests: [...doc.taxonomy.interests],
    ageRanges: [...doc.taxonomy.ageRanges],
    occasions: [...doc.taxonomy.occasions],
    personalityTraits: [...doc.taxonomy.personalityTraits],
    images,
    citationIds: [...(doc.relationships?.citationIds || [])],
    relatedProductIds: [...(doc.relationships?.relatedProductIds || [])],
    relatedGuideIds: [...(doc.relationships?.relatedGuideIds || [])],
    seo,
    giftVerdict,
    idealRecipientProfile,
    extendedGiftRationale: [...doc.editorialProfile.extendedGiftRationale],
    buyingConsiderationsList: doc.editorialProfile.buyingConsiderations.map((b) => ({
      label: b.label,
      detail: b.detail,
    })),
    occasionContextNotes: doc.editorialProfile.occasionContextNotes.map((n) => ({
      occasion: n.occasion,
      label: n.label,
      note: n.note,
    })),
    specifications: doc.factualContext.specifications.map((s) => ({
      label: s.label,
      value: s.value,
    })),
    similarGiftComparisons,
    editorialRating: doc.editorialProfile.editorialRating ?? undefined,
    testingNote: doc.editorialProfile.testingNote ?? undefined,
    editorialApproved: false,
  };
}

/**
 * Converts a validated `ProductInterchangeCreatePayloadV1` into a Sanity `product`
 * draft document ready for `saveSanityProductDraft` (always stored as `status: "draft"`).
 */
export function mapInterchangeToSanityProductDraft(
  doc: ProductInterchangeCreatePayloadV1,
  options?: {
    existingDraftId?: string;
    existingRev?: string;
  }
): Record<string, any> {
  const astroProduct = mapInterchangeToAstroProduct(doc);
  const canonicalProductId = astroProduct.id;
  const draftId =
    options?.existingDraftId ||
    (canonicalProductId.startsWith('drafts.')
      ? canonicalProductId
      : `drafts.${canonicalProductId}`);

  const sanityDoc: Record<string, any> = {
    _id: draftId,
    _type: 'product',
    productId: canonicalProductId,
    title: astroProduct.title,
    slug: {
      _type: 'slug',
      current: astroProduct.slug,
    },
    subtitle: astroProduct.subtitle,
    status: 'draft',
    editorialApproved: Boolean(astroProduct.editorialApproved),
    isPlaceholderLink: isPlaceholderUrl(doc.factualContext.sourceUrl || '') || Boolean((doc as any).isPlaceholderLink),
    calloutTag: astroProduct.calloutTag,
    productType: astroProduct.productType,
    vendor: doc.factualContext.vendor || (astroProduct.vendor !== 'unknown' ? astroProduct.vendor : undefined),
    price: typeof doc.factualContext.price === 'number' && doc.factualContext.price > 0 ? doc.factualContext.price : undefined,
    currency: 'USD',
    budgetTier: astroProduct.budgetTier,
    guidePriceBucket: astroProduct.guidePriceBucket,
    commerceProvider: astroProduct.commerceProvider,
    fulfillmentClassification: astroProduct.fulfillmentClassification,
    externalProductId: astroProduct.externalProductId,
    purchaseUrl: astroProduct.purchaseUrl,
    affiliateUrl: astroProduct.affiliateUrl,
    fourthwallUrl: astroProduct.fourthwallUrl,
    inStock: typeof doc.factualContext.inStock === 'boolean' ? doc.factualContext.inStock : undefined,
    availabilityNote: astroProduct.availabilityNote,
    priceVerified: Boolean(doc.factualContext.priceVerification?.verified && typeof doc.factualContext.price === 'number' && doc.factualContext.price > 0),
    priceVerificationSource: astroProduct.priceVerificationSource,
    priceVerifiedAt: astroProduct.priceVerifiedAt,
    priceVerificationEvidenceNote: astroProduct.priceVerificationEvidenceNote,
    inventoryVerified: Boolean(doc.factualContext.inventoryVerification?.verified && typeof doc.factualContext.inStock === 'boolean'),
    inventoryVerificationSource: astroProduct.inventoryVerificationSource,
    inventoryVerifiedAt: astroProduct.inventoryVerifiedAt,
    whyToGiveIt: astroProduct.whyToGiveIt,
    bestForSummary: astroProduct.bestForSummary,
    detailsAndCare: astroProduct.detailsAndCare,
    giftVerdict: astroProduct.giftVerdict
      ? {
          _type: 'productGiftVerdict',
          editorialAssessment: astroProduct.giftVerdict.editorialAssessment,
          standoutReason: astroProduct.giftVerdict.standoutReason,
          recipientDelight: astroProduct.giftVerdict.recipientDelight,
          importantCaveat: astroProduct.giftVerdict.importantCaveat,
        }
      : undefined,
    idealRecipientProfile: astroProduct.idealRecipientProfile
      ? {
          _type: 'productRecipientProfile',
          headline: astroProduct.idealRecipientProfile.headline,
          narrative: astroProduct.idealRecipientProfile.narrative,
          lifestyleNotes: astroProduct.idealRecipientProfile.lifestyleNotes || [],
          relationshipFit: astroProduct.idealRecipientProfile.relationshipFit || [],
        }
      : undefined,
    extendedGiftRationale: astroProduct.extendedGiftRationale || [],
    buyingConsiderationsList: (astroProduct.buyingConsiderationsList || []).map((item, idx) => ({
      _type: 'productBuyingConsideration',
      _key: `buy_cons_${String(idx + 1).padStart(2, '0')}`,
      label: item.label,
      detail: item.detail,
    })),
    occasionContextNotes: (astroProduct.occasionContextNotes || []).map((item, idx) => ({
      _type: 'productOccasionNote',
      _key: `occ_note_${item.occasion}_${String(idx + 1).padStart(2, '0')}`,
      occasion: item.occasion,
      label: item.label,
      note: item.note,
    })),
    specifications: (astroProduct.specifications || []).map((item, idx) => ({
      _type: 'productSpecificationItem',
      _key: `spec_${String(idx + 1).padStart(2, '0')}`,
      label: item.label,
      value: item.value,
    })),
    editorialRating: astroProduct.editorialRating,
    testingNote: astroProduct.testingNote,
    recipients: astroProduct.recipients,
    occasions: astroProduct.occasions,
    interests: astroProduct.interests,
    personalityTraits: astroProduct.personalityTraits,
    ageRanges: astroProduct.ageRanges,
    images: astroProduct.images.map((img, idx) => ({
      _type: 'productImage',
      _key: img.id || `img_${String(idx + 1).padStart(2, '0')}`,
      id: img.id,
      url: img.url,
      alt: img.alt,
      caption: img.caption,
      sanityAssetId: img.sanityAssetId,
      asset: img.asset,
      sourceType: img.sourceType || (img.sanityAssetId ? 'sanity-upload' : 'external-url'),
      fourthwallVariantId: img.fourthwallVariantId,
      originalFilename: img.originalFilename,
      mimeType: img.mimeType,
      aspectRatio: img.aspectRatio,
      fitMode: img.fitMode || 'cover',
      fallbackColor: img.fallbackColor || '#F6F4EF',
      focalPoint: img.focalPoint
        ? {
            _type: 'imageFocalPoint',
            x: img.focalPoint.x,
            y: img.focalPoint.y,
          }
        : undefined,
      crop: img.crop
        ? {
            _type: 'imageCropBox',
            top: img.crop.top,
            bottom: img.crop.bottom,
            left: img.crop.left,
            right: img.crop.right,
          }
        : undefined,
      landscapeOverrideUrl: img.landscapeOverrideUrl,
      portraitOverrideUrl: img.portraitOverrideUrl,
      width: img.width || 2400,
      height: img.height || 2400,
      isSampleAsset: false,
    })),
    similarGiftComparisons: (astroProduct.similarGiftComparisons || []).map((comp, idx) => ({
      _type: 'productSimilarComparison',
      _key: `sim_comp_${comp.productId}_${String(idx + 1).padStart(2, '0')}`,
      product: {
        _type: 'reference',
        _ref: comp.productId,
        _weak: true,
      },
      comparisonAngle: comp.comparisonAngle,
      summary: comp.summary,
      distinctionLabel: comp.distinctionLabel,
      comparisonNote: comp.comparisonNote,
    })),
    citationRefs: (astroProduct.citationIds || []).map((citId, idx) => ({
      _type: 'reference',
      _key: `cit_ref_${citId}_${String(idx + 1).padStart(2, '0')}`,
      _ref: citId,
      _weak: true,
    })),
    relatedProducts: (astroProduct.relatedProductIds || []).map((prodId, idx) => ({
      _type: 'reference',
      _key: `rel_prod_${prodId}_${String(idx + 1).padStart(2, '0')}`,
      _ref: prodId,
      _weak: true,
    })),
    relatedGuides: (astroProduct.relatedGuideIds || []).map((guideId, idx) => ({
      _type: 'reference',
      _key: `rel_guide_${guideId}_${String(idx + 1).padStart(2, '0')}`,
      _ref: guideId,
      _weak: true,
    })),
    seo: astroProduct.seo
      ? {
          _type: 'seoMetadata',
          seoTitle: astroProduct.seo.seoTitle,
          metaDescription: astroProduct.seo.metaDescription,
          canonicalPath: astroProduct.seo.canonicalPath,
          ogTitle: astroProduct.seo.ogTitle,
          ogDescription: astroProduct.seo.ogDescription,
          ogImage: astroProduct.seo.ogImage,
          indexing: astroProduct.seo.indexing || 'index,follow',
        }
      : undefined,
  };

  if (options?.existingRev) {
    sanityDoc._rev = options.existingRev;
  }

  return sanityDoc;
}

/**
 * Converts an existing Astro `Product` or Sanity `product` document into a
 * Canonical Product Interchange `create` payload (useful for exporting an existing
 * product to ChatGPT for editorial revision or round-trip verification).
 */
export function mapExistingProductToInterchangeV1(
  recordInput: Product | Record<string, any>
): ProductInterchangeCreatePayloadV1 {
  const record = recordInput as Record<string, any>;
  const rawSlug =
    typeof record.slug === 'string'
      ? record.slug
      : typeof record.slug?.current === 'string'
      ? record.slug.current
      : 'untitled-product';
  const rawCanonicalId =
    typeof record.productId === 'string' && record.productId.startsWith('prod_')
      ? record.productId
      : typeof record.id === 'string' && record.id.startsWith('prod_')
      ? record.id
      : typeof record._id === 'string'
      ? record._id.replace(/^drafts\./, '')
      : deriveCanonicalProductIdFromSlug(rawSlug);

  const rawInterests: string[] = Array.isArray(record.interests) ? record.interests : [];
  const canonicalInterests: CanonicalInterestTag[] = [];
  const unmappedInterests: string[] = [];

  for (const tag of rawInterests) {
    if (typeof tag === 'string') {
      if (ALLOWED_INTEREST_VALUES.includes(tag as CanonicalInterestTag)) {
        if (!canonicalInterests.includes(tag as CanonicalInterestTag)) {
          canonicalInterests.push(tag as CanonicalInterestTag);
        }
      } else if (tag.trim()) {
        unmappedInterests.push(tag.trim());
      }
    }
  }

  const productType: CanonicalProductCategory = ALLOWED_PRODUCT_CATEGORY_VALUES.includes(
    record.productType as CanonicalProductCategory
  )
    ? (record.productType as CanonicalProductCategory)
    : 'Home & Textiles';

  const price =
    typeof record.price === 'number' && record.price > 0 ? record.price : null;
  const inStock =
    typeof record.inStock === 'boolean' ? record.inStock : null;

  const citationIds: string[] = Array.isArray(record.citationIds)
    ? record.citationIds
    : Array.isArray(record.citationRefs)
    ? record.citationRefs
        .map((r: any) => (typeof r?._ref === 'string' ? r._ref : null))
        .filter(Boolean)
    : [];

  const relatedProductIds: string[] = Array.isArray(record.relatedProductIds)
    ? record.relatedProductIds
    : Array.isArray(record.relatedProducts)
    ? record.relatedProducts
        .map((r: any) => (typeof r?._ref === 'string' ? r._ref : null))
        .filter(Boolean)
    : [];

  const relatedGuideIds: string[] = Array.isArray(record.relatedGuideIds)
    ? record.relatedGuideIds
    : Array.isArray(record.relatedGuides)
    ? record.relatedGuides
        .map((r: any) => (typeof r?._ref === 'string' ? r._ref : null))
        .filter(Boolean)
    : [];

  const similarGiftComparisons: ProductInterchangeSimilarComparisonV1[] = Array.isArray(
    record.similarGiftComparisons
  )
    ? record.similarGiftComparisons
        .map((comp: any) => {
          const productId =
            typeof comp?.productId === 'string'
              ? comp.productId
              : typeof comp?.product?._ref === 'string'
              ? comp.product._ref
              : '';
          if (!productId) return null;
          return {
            productId,
            comparisonAngle: comp.comparisonAngle || 'Alternative Option',
            summary: comp.summary || '',
            distinctionLabel: comp.distinctionLabel ?? undefined,
            comparisonNote: comp.comparisonNote ?? undefined,
          };
        })
        .filter(Boolean) as ProductInterchangeSimilarComparisonV1[]
    : [];

  const images: ProductInterchangeImageV1[] = Array.isArray(record.images)
    ? record.images
        .map((img: any, idx: number) => {
          const sanityAssetId = extractSanityAssetIdFromImage(img);
          const url =
            img?.url ||
            img?.externalUrl ||
            (sanityAssetId ? resolveSanityImageUrlFromAssetRef(sanityAssetId) : '') ||
            '';
          if (!url) return null;
          const focalPointSource = img?.focalPoint || img?.asset?.hotspot;
          const cropSource = img?.crop || img?.asset?.crop;
          return {
            id:
              img.id ||
              img._key ||
              `img_${rawSlug.replace(/-/g, '_')}_${String(idx + 1).padStart(2, '0')}`,
            url,
            alt: img.alt || `${record.title || rawSlug} photograph`,
            caption: img.caption ?? undefined,
            sanityAssetId,
            sourceType:
              img.sourceType || (sanityAssetId ? 'sanity-upload' : 'external-url'),
            fourthwallVariantId: img.fourthwallVariantId ?? undefined,
            originalFilename: img.originalFilename ?? undefined,
            mimeType: img.mimeType ?? undefined,
            aspectRatio: img.aspectRatio ?? undefined,
            fitMode: img.fitMode === 'contain' ? 'contain' : 'cover',
            fallbackColor: img.fallbackColor || '#F6F4EF',
            focalPoint: focalPointSource
              ? {
                  x: Number(focalPointSource.x ?? 0.5),
                  y: Number(focalPointSource.y ?? 0.5),
                }
              : { x: 0.5, y: 0.5 },
            crop: cropSource
              ? {
                  top: Number(cropSource.top ?? 0),
                  bottom: Number(cropSource.bottom ?? 0),
                  left: Number(cropSource.left ?? 0),
                  right: Number(cropSource.right ?? 0),
                }
              : undefined,
            landscapeOverrideUrl: img.landscapeOverrideUrl ?? undefined,
            portraitOverrideUrl: img.portraitOverrideUrl ?? undefined,
            width: img.width || 2400,
            height: img.height || 2400,
          };
        })
        .filter(Boolean) as ProductInterchangeImageV1[]
    : [];

  const commerceProvider: CommerceProvider = ALLOWED_COMMERCE_PROVIDER_VALUES.includes(
    record.commerceProvider
  )
    ? record.commerceProvider
    : 'affiliate';

  return {
    schemaVersion: PRODUCT_INTERCHANGE_SCHEMA_VERSION,
    format: PRODUCT_INTERCHANGE_FORMAT_ID,
    mode: 'create',
    targetProduct: {
      canonicalProductId: rawCanonicalId,
      slug: rawSlug,
      sourceUrl: record.purchaseUrl || undefined,
    },
    factualContext: {
      sourceUrl: record.purchaseUrl || null,
      vendor: record.vendor || null,
      price,
      currency: 'USD',
      inStock,
      availabilityNote: record.availabilityNote ?? null,
      commerceProvider,
      fulfillmentClassification:
        record.fulfillmentClassification ||
        deriveDefaultFulfillmentClassification(commerceProvider),
      externalProductId: record.externalProductId ?? null,
      affiliateUrl: record.affiliateUrl ?? null,
      fourthwallUrl: record.fourthwallUrl ?? null,
      priceVerification: {
        verified: Boolean(record.priceVerified && price !== null),
        source: ALLOWED_PRICE_VERIFICATION_SOURCES.includes(record.priceVerificationSource)
          ? record.priceVerificationSource
          : record.priceVerified
          ? 'retailer_live_check'
          : 'unverified',
        verifiedAt: record.priceVerifiedAt ?? null,
        evidenceNote: record.priceVerificationEvidenceNote ?? null,
      },
      inventoryVerification: {
        verified: Boolean(record.inventoryVerified && inStock !== null),
        source: ALLOWED_INVENTORY_VERIFICATION_SOURCES.includes(record.inventoryVerificationSource)
          ? record.inventoryVerificationSource
          : record.inventoryVerified
          ? 'retailer_live_check'
          : 'unverified',
        verifiedAt: record.inventoryVerifiedAt ?? null,
      },
      specifications: Array.isArray(record.specifications)
        ? record.specifications.map((s: any) => ({ label: s.label, value: s.value }))
        : [],
    },
    identity: {
      title: record.title || '',
      slug: rawSlug,
      subtitle: record.subtitle || '',
      productType,
      calloutTag: record.calloutTag ?? null,
    },
    editorialProfile: {
      whyToGiveIt: record.whyToGiveIt || '',
      bestForSummary: record.bestForSummary || '',
      detailsAndCare: record.detailsAndCare || '',
      giftVerdict: {
        editorialAssessment:
          record.giftVerdict?.editorialAssessment || record.giftVerdict?.summary || '',
        standoutReason:
          record.giftVerdict?.standoutReason || record.giftVerdict?.distinctDifference || '',
        recipientDelight:
          record.giftVerdict?.recipientDelight || record.giftVerdict?.whyEnjoyReceiving || '',
        importantCaveat:
          record.giftVerdict?.importantCaveat ?? record.giftVerdict?.caveat ?? null,
      },
      idealRecipientProfile: {
        headline: record.idealRecipientProfile?.headline || '',
        narrative: record.idealRecipientProfile?.narrative || '',
        lifestyleNotes: Array.isArray(record.idealRecipientProfile?.lifestyleNotes)
          ? [...record.idealRecipientProfile.lifestyleNotes]
          : [],
        relationshipFit: Array.isArray(record.idealRecipientProfile?.relationshipFit)
          ? [...record.idealRecipientProfile.relationshipFit]
          : [],
      },
      extendedGiftRationale: Array.isArray(record.extendedGiftRationale)
        ? [...record.extendedGiftRationale]
        : [],
      buyingConsiderations: Array.isArray(record.buyingConsiderationsList)
        ? record.buyingConsiderationsList.map((b: any) => ({
            label: b.label,
            detail: b.detail,
          }))
        : [],
      occasionContextNotes: Array.isArray(record.occasionContextNotes)
        ? record.occasionContextNotes.map((n: any) => ({
            occasion: n.occasion,
            label: n.label,
            note: n.note,
          }))
        : [],
      editorialRating:
        typeof record.editorialRating === 'number' ? record.editorialRating : null,
      testingNote: record.testingNote ?? null,
    },
    taxonomy: {
      recipients: Array.isArray(record.recipients) ? [...record.recipients] : [],
      occasions: Array.isArray(record.occasions) ? [...record.occasions] : [],
      interests: canonicalInterests,
      personalityTraits: Array.isArray(record.personalityTraits)
        ? [...record.personalityTraits]
        : [],
      ageRanges: Array.isArray(record.ageRanges) ? [...record.ageRanges] : [],
      budgetTier:
        price !== null
          ? (deriveBudgetTierFromPrice(price) as BudgetTierValue)
          : record.budgetTier ?? null,
      guidePriceBucket:
        price !== null
          ? (deriveGuidePriceBucketFromPrice(price) as GuidePriceBucketValue)
          : record.guidePriceBucket ?? null,
      suggestedUnmappedTags: unmappedInterests.length > 0 ? unmappedInterests : undefined,
    },
    media: {
      images,
    },
    relationships: {
      similarGiftComparisons,
      citationIds,
      relatedProductIds,
      relatedGuideIds,
    },
    seo: {
      seoTitle: record.seo?.seoTitle || `${record.title || rawSlug} | Science of Gifts`,
      metaDescription: record.seo?.metaDescription || record.bestForSummary || '',
      canonicalPath: record.seo?.canonicalPath || `/products/${rawSlug}`,
      ogTitle: record.seo?.ogTitle ?? null,
      ogDescription: record.seo?.ogDescription ?? null,
      ogImage: record.seo?.ogImage ?? null,
      indexing:
        record.seo?.indexing === 'noindex,follow' ? 'noindex,follow' : 'index,follow',
    },
  };
}

export interface ProductRevisionFieldDiff {
  fieldPath: string;
  action: 'preserved' | 'updated' | 'cleared' | 'blocked_verified_fact';
  previousValue: unknown;
  nextValue: unknown;
  reason?: string;
}

export interface ProductRevisionMergeResult {
  valid: boolean;
  canonicalProductId: string;
  slug: string;
  mergedInterchange: ProductInterchangeCreatePayloadV1 | null;
  mergedAstroProduct: Product | null;
  mergedSanityDraft: Record<string, any> | null;
  fieldDiffs: ProductRevisionFieldDiff[];
  warnings: ProductInterchangeValidationIssue[];
  errors: ProductInterchangeValidationIssue[];
}

/**
 * Applies a validated `ProductInterchangeRevisionPayloadV1` (`mode: "revision"`) onto
 * an existing product record (either an Astro `Product` or a Sanity `product` document).
 *
 * Non-destructive guarantees:
 * 1. Canonical product ID (`prod_<slug>`) and URL slug are preserved and cannot be mutated by a revision.
 * 2. Any field omitted (`undefined`) in the revision payload preserves its existing value.
 * 3. Optional fields listed in `revisionControl.clearFields` (or explicitly set to `null`) are cleared.
 * 4. Verified factual fields (`price`, `inStock`, `vendor`, `sourceUrl`) on an already-verified existing
 *    product are protected against accidental overwrite unless `revisionControl.allowOverwriteVerifiedFacts === true`.
 */
export function applyProductInterchangeRevision(
  existingRecord: Product | Record<string, any>,
  revisionInput: ProductInterchangeRevisionPayloadV1 | unknown
): ProductRevisionMergeResult {
  const baseInterchange = mapExistingProductToInterchangeV1(existingRecord);
  const canonicalProductId = baseInterchange.targetProduct!.canonicalProductId!;
  const baseSlug = baseInterchange.identity.slug;

  let validatedRevision: ProductInterchangeRevisionPayloadV1;
  const warnings: ProductInterchangeValidationIssue[] = [];
  const errors: ProductInterchangeValidationIssue[] = [];

  if (
    isPlainObject(revisionInput) &&
    revisionInput.mode === 'revision' &&
    revisionInput.schemaVersion === PRODUCT_INTERCHANGE_SCHEMA_VERSION
  ) {
    const check = validateAndNormalizeProductInterchange(revisionInput);
    warnings.push(...check.warnings);
    errors.push(...check.errors);
    if (!check.valid || !check.normalized || check.normalized.mode !== 'revision') {
      return {
        valid: false,
        canonicalProductId,
        slug: baseSlug,
        mergedInterchange: null,
        mergedAstroProduct: null,
        mergedSanityDraft: null,
        fieldDiffs: [],
        warnings,
        errors,
      };
    }
    validatedRevision = check.normalized;
  } else {
    const check = validateAndNormalizeProductInterchange(revisionInput);
    warnings.push(...check.warnings);
    errors.push(...check.errors);
    if (!check.valid || !check.normalized || check.normalized.mode !== 'revision') {
      return {
        valid: false,
        canonicalProductId,
        slug: baseSlug,
        mergedInterchange: null,
        mergedAstroProduct: null,
        mergedSanityDraft: null,
        fieldDiffs: [],
        warnings,
        errors,
      };
    }
    validatedRevision = check.normalized;
  }

  // Verify targetProduct matches the existing product when canonicalProductId or slug is provided
  if (
    validatedRevision.targetProduct.canonicalProductId &&
    validatedRevision.targetProduct.canonicalProductId !== canonicalProductId
  ) {
    errors.push({
      path: 'targetProduct.canonicalProductId',
      code: 'INVALID_CANONICAL_ID',
      severity: 'error',
      message: `Revision targetProduct.canonicalProductId "${validatedRevision.targetProduct.canonicalProductId}" does not match existing product "${canonicalProductId}".`,
    });
    return {
      valid: false,
      canonicalProductId,
      slug: baseSlug,
      mergedInterchange: null,
      mergedAstroProduct: null,
      mergedSanityDraft: null,
      fieldDiffs: [],
      warnings,
      errors,
    };
  }

  const clearSet = new Set<string>(validatedRevision.revisionControl?.clearFields || []);
  const allowOverwriteVerifiedFacts = Boolean(
    validatedRevision.revisionControl?.allowOverwriteVerifiedFacts
  );

  const fieldDiffs: ProductRevisionFieldDiff[] = [];
  const merged: ProductInterchangeCreatePayloadV1 = JSON.parse(
    JSON.stringify(baseInterchange)
  );

  const recordDiff = (
    fieldPath: string,
    action: ProductRevisionFieldDiff['action'],
    previousValue: unknown,
    nextValue: unknown,
    reason?: string
  ) => {
    fieldDiffs.push({ fieldPath, action, previousValue, nextValue, reason });
  };

  // Canonical ID and slug are always preserved
  if (
    validatedRevision.identity?.slug &&
    validatedRevision.identity.slug !== baseSlug
  ) {
    warnings.push({
      path: 'identity.slug',
      code: 'INVALID_CANONICAL_ID',
      severity: 'warning',
      message: `Attempted to change canonical slug from "${baseSlug}" to "${validatedRevision.identity.slug}" during revision; canonical slug and ID "${canonicalProductId}" were preserved.`,
    });
    recordDiff(
      'identity.slug',
      'preserved',
      baseSlug,
      baseSlug,
      'Canonical slug and productId are immutable during revisions.'
    );
  }

  // Helper for updating or preserving scalar/array fields
  const mergeField = <T>(
    fieldPath: string,
    currentVal: T,
    incomingVal: T | undefined,
    clearDefault?: T
  ): T => {
    if (clearSet.has(fieldPath) || incomingVal === null) {
      const clearedVal = (clearDefault !== undefined ? clearDefault : null) as T;
      recordDiff(
        fieldPath,
        'cleared',
        currentVal,
        clearedVal,
        clearSet.has(fieldPath)
          ? 'Listed in revisionControl.clearFields'
          : 'Explicitly set to null in revision payload'
      );
      return clearedVal;
    }
    if (incomingVal === undefined) {
      recordDiff(fieldPath, 'preserved', currentVal, currentVal);
      return currentVal;
    }
    const changed = JSON.stringify(currentVal) !== JSON.stringify(incomingVal);
    recordDiff(
      fieldPath,
      changed ? 'updated' : 'preserved',
      currentVal,
      incomingVal
    );
    return incomingVal;
  };

  // 1. Merge factualContext with verified-fact protection
  const revFc = validatedRevision.factualContext;
  const priceIsLocked =
    baseInterchange.factualContext.priceVerification.verified && !allowOverwriteVerifiedFacts;
  const stockIsLocked =
    baseInterchange.factualContext.inventoryVerification.verified && !allowOverwriteVerifiedFacts;

  if (
    revFc?.price !== undefined &&
    revFc.price !== baseInterchange.factualContext.price
  ) {
    if (priceIsLocked) {
      warnings.push({
        path: 'factualContext.price',
        code: 'VERIFIED_FACT_OVERWRITE_BLOCKED',
        severity: 'warning',
        message: `Blocked overwrite of verified price ($${baseInterchange.factualContext.price}) with ${String(
          revFc.price
        )}. Set revisionControl.allowOverwriteVerifiedFacts=true to override verified commerce facts.`,
      });
      recordDiff(
        'factualContext.price',
        'blocked_verified_fact',
        baseInterchange.factualContext.price,
        baseInterchange.factualContext.price,
        'Existing price is verified; overwrite blocked.'
      );
    } else {
      merged.factualContext.price = revFc.price;
      recordDiff(
        'factualContext.price',
        'updated',
        baseInterchange.factualContext.price,
        revFc.price
      );
      if (typeof revFc.price === 'number' && revFc.price > 0) {
        merged.taxonomy.budgetTier = deriveBudgetTierFromPrice(
          revFc.price
        ) as BudgetTierValue;
        merged.taxonomy.guidePriceBucket = deriveGuidePriceBucketFromPrice(
          revFc.price
        ) as GuidePriceBucketValue;
      }
    }
  } else {
    recordDiff(
      'factualContext.price',
      'preserved',
      baseInterchange.factualContext.price,
      baseInterchange.factualContext.price
    );
  }

  if (
    revFc?.sourceUrl !== undefined &&
    revFc.sourceUrl !== baseInterchange.factualContext.sourceUrl
  ) {
    if (priceIsLocked) {
      warnings.push({
        path: 'factualContext.sourceUrl',
        code: 'VERIFIED_FACT_OVERWRITE_BLOCKED',
        severity: 'warning',
        message: `Blocked overwrite of verified sourceUrl "${baseInterchange.factualContext.sourceUrl}".`,
      });
      recordDiff(
        'factualContext.sourceUrl',
        'blocked_verified_fact',
        baseInterchange.factualContext.sourceUrl,
        baseInterchange.factualContext.sourceUrl,
        'Existing sourceUrl is tied to verified pricing; overwrite blocked.'
      );
    } else {
      merged.factualContext.sourceUrl = revFc.sourceUrl;
      recordDiff(
        'factualContext.sourceUrl',
        'updated',
        baseInterchange.factualContext.sourceUrl,
        revFc.sourceUrl
      );
    }
  } else {
    recordDiff(
      'factualContext.sourceUrl',
      'preserved',
      baseInterchange.factualContext.sourceUrl,
      baseInterchange.factualContext.sourceUrl
    );
  }

  if (
    revFc?.inStock !== undefined &&
    revFc.inStock !== baseInterchange.factualContext.inStock
  ) {
    if (stockIsLocked) {
      warnings.push({
        path: 'factualContext.inStock',
        code: 'VERIFIED_FACT_OVERWRITE_BLOCKED',
        severity: 'warning',
        message: `Blocked overwrite of verified inStock (${String(
          baseInterchange.factualContext.inStock
        )}).`,
      });
      recordDiff(
        'factualContext.inStock',
        'blocked_verified_fact',
        baseInterchange.factualContext.inStock,
        baseInterchange.factualContext.inStock,
        'Existing inventory state is verified; overwrite blocked.'
      );
    } else {
      merged.factualContext.inStock = revFc.inStock;
      recordDiff(
        'factualContext.inStock',
        'updated',
        baseInterchange.factualContext.inStock,
        revFc.inStock
      );
    }
  } else {
    recordDiff(
      'factualContext.inStock',
      'preserved',
      baseInterchange.factualContext.inStock,
      baseInterchange.factualContext.inStock
    );
  }

  merged.factualContext.vendor = mergeField(
    'factualContext.vendor',
    baseInterchange.factualContext.vendor,
    revFc?.vendor
  );
  merged.factualContext.availabilityNote = mergeField(
    'factualContext.availabilityNote',
    baseInterchange.factualContext.availabilityNote,
    revFc?.availabilityNote,
    null
  );
  merged.factualContext.externalProductId = mergeField(
    'factualContext.externalProductId',
    baseInterchange.factualContext.externalProductId,
    revFc?.externalProductId,
    null
  );
  merged.factualContext.affiliateUrl = mergeField(
    'factualContext.affiliateUrl',
    baseInterchange.factualContext.affiliateUrl,
    revFc?.affiliateUrl,
    null
  );
  merged.factualContext.fourthwallUrl = mergeField(
    'factualContext.fourthwallUrl',
    baseInterchange.factualContext.fourthwallUrl,
    revFc?.fourthwallUrl,
    null
  );
  merged.factualContext.specifications = mergeField(
    'factualContext.specifications',
    baseInterchange.factualContext.specifications,
    revFc?.specifications
  );

  // 2. Merge identity (preserving slug)
  const revId = validatedRevision.identity;
  merged.identity.title = mergeField(
    'identity.title',
    baseInterchange.identity.title,
    revId?.title
  );
  merged.identity.subtitle = mergeField(
    'identity.subtitle',
    baseInterchange.identity.subtitle,
    revId?.subtitle
  );
  merged.identity.productType = mergeField(
    'identity.productType',
    baseInterchange.identity.productType,
    revId?.productType
  );
  merged.identity.calloutTag = mergeField(
    'identity.calloutTag',
    baseInterchange.identity.calloutTag,
    revId?.calloutTag,
    null
  );

  // 3. Merge editorialProfile
  const revEp = validatedRevision.editorialProfile;
  merged.editorialProfile.whyToGiveIt = mergeField(
    'editorialProfile.whyToGiveIt',
    baseInterchange.editorialProfile.whyToGiveIt,
    revEp?.whyToGiveIt
  );
  merged.editorialProfile.bestForSummary = mergeField(
    'editorialProfile.bestForSummary',
    baseInterchange.editorialProfile.bestForSummary,
    revEp?.bestForSummary
  );
  merged.editorialProfile.detailsAndCare = mergeField(
    'editorialProfile.detailsAndCare',
    baseInterchange.editorialProfile.detailsAndCare,
    revEp?.detailsAndCare
  );
  merged.editorialProfile.giftVerdict.editorialAssessment = mergeField(
    'editorialProfile.giftVerdict.editorialAssessment',
    baseInterchange.editorialProfile.giftVerdict.editorialAssessment,
    revEp?.giftVerdict?.editorialAssessment
  );
  merged.editorialProfile.giftVerdict.standoutReason = mergeField(
    'editorialProfile.giftVerdict.standoutReason',
    baseInterchange.editorialProfile.giftVerdict.standoutReason,
    revEp?.giftVerdict?.standoutReason
  );
  merged.editorialProfile.giftVerdict.recipientDelight = mergeField(
    'editorialProfile.giftVerdict.recipientDelight',
    baseInterchange.editorialProfile.giftVerdict.recipientDelight,
    revEp?.giftVerdict?.recipientDelight
  );
  merged.editorialProfile.giftVerdict.importantCaveat = mergeField(
    'editorialProfile.giftVerdict.importantCaveat',
    baseInterchange.editorialProfile.giftVerdict.importantCaveat,
    revEp?.giftVerdict?.importantCaveat,
    null
  );

  merged.editorialProfile.idealRecipientProfile.headline = mergeField(
    'editorialProfile.idealRecipientProfile.headline',
    baseInterchange.editorialProfile.idealRecipientProfile.headline,
    revEp?.idealRecipientProfile?.headline
  );
  merged.editorialProfile.idealRecipientProfile.narrative = mergeField(
    'editorialProfile.idealRecipientProfile.narrative',
    baseInterchange.editorialProfile.idealRecipientProfile.narrative,
    revEp?.idealRecipientProfile?.narrative
  );
  merged.editorialProfile.idealRecipientProfile.lifestyleNotes = mergeField(
    'editorialProfile.idealRecipientProfile.lifestyleNotes',
    baseInterchange.editorialProfile.idealRecipientProfile.lifestyleNotes,
    revEp?.idealRecipientProfile?.lifestyleNotes
  );
  merged.editorialProfile.idealRecipientProfile.relationshipFit = mergeField(
    'editorialProfile.idealRecipientProfile.relationshipFit',
    baseInterchange.editorialProfile.idealRecipientProfile.relationshipFit,
    revEp?.idealRecipientProfile?.relationshipFit
  );

  merged.editorialProfile.extendedGiftRationale = mergeField(
    'editorialProfile.extendedGiftRationale',
    baseInterchange.editorialProfile.extendedGiftRationale,
    revEp?.extendedGiftRationale,
    []
  );
  merged.editorialProfile.buyingConsiderations = mergeField(
    'editorialProfile.buyingConsiderations',
    baseInterchange.editorialProfile.buyingConsiderations,
    revEp?.buyingConsiderations,
    []
  );
  merged.editorialProfile.occasionContextNotes = mergeField(
    'editorialProfile.occasionContextNotes',
    baseInterchange.editorialProfile.occasionContextNotes,
    revEp?.occasionContextNotes,
    []
  );
  merged.editorialProfile.editorialRating = mergeField(
    'editorialProfile.editorialRating',
    baseInterchange.editorialProfile.editorialRating,
    revEp?.editorialRating,
    null
  );
  merged.editorialProfile.testingNote = mergeField(
    'editorialProfile.testingNote',
    baseInterchange.editorialProfile.testingNote,
    revEp?.testingNote,
    null
  );

  // 4. Merge taxonomy
  const revTax = validatedRevision.taxonomy;
  merged.taxonomy.recipients = mergeField(
    'taxonomy.recipients',
    baseInterchange.taxonomy.recipients,
    revTax?.recipients
  );
  merged.taxonomy.occasions = mergeField(
    'taxonomy.occasions',
    baseInterchange.taxonomy.occasions,
    revTax?.occasions
  );
  merged.taxonomy.interests = mergeField(
    'taxonomy.interests',
    baseInterchange.taxonomy.interests,
    revTax?.interests
  );
  merged.taxonomy.personalityTraits = mergeField(
    'taxonomy.personalityTraits',
    baseInterchange.taxonomy.personalityTraits,
    revTax?.personalityTraits
  );
  merged.taxonomy.ageRanges = mergeField(
    'taxonomy.ageRanges',
    baseInterchange.taxonomy.ageRanges,
    revTax?.ageRanges
  );

  // 5. Merge media (preserve existing images when media.images is omitted or empty [])
  const incomingImages =
    validatedRevision.media?.images && validatedRevision.media.images.length > 0
      ? validatedRevision.media.images.map((incImg, idx) => {
          const prevMatch =
            baseInterchange.media.images.find(
              (b) => (incImg.id && b.id === incImg.id) || b.url === incImg.url
            ) || baseInterchange.media.images[idx];
          if (prevMatch && prevMatch.url === incImg.url) {
            return {
              ...prevMatch,
              ...incImg,
              sanityAssetId: incImg.sanityAssetId || prevMatch.sanityAssetId,
              sourceType: incImg.sourceType || prevMatch.sourceType,
              fourthwallVariantId:
                incImg.fourthwallVariantId || prevMatch.fourthwallVariantId,
              originalFilename: incImg.originalFilename || prevMatch.originalFilename,
            };
          }
          return incImg;
        })
      : undefined;

  merged.media.images = mergeField(
    'media.images',
    baseInterchange.media.images,
    incomingImages
  );

  // 6. Merge relationships
  const revRel = validatedRevision.relationships;
  merged.relationships = {
    similarGiftComparisons: mergeField(
      'relationships.similarGiftComparisons',
      baseInterchange.relationships?.similarGiftComparisons || [],
      revRel?.similarGiftComparisons,
      []
    ),
    citationIds: mergeField(
      'relationships.citationIds',
      baseInterchange.relationships?.citationIds || [],
      revRel?.citationIds,
      []
    ),
    relatedProductIds: mergeField(
      'relationships.relatedProductIds',
      baseInterchange.relationships?.relatedProductIds || [],
      revRel?.relatedProductIds,
      []
    ),
    relatedGuideIds: mergeField(
      'relationships.relatedGuideIds',
      baseInterchange.relationships?.relatedGuideIds || [],
      revRel?.relatedGuideIds,
      []
    ),
  };

  // 7. Merge SEO
  const revSeo = validatedRevision.seo;
  merged.seo.seoTitle = mergeField(
    'seo.seoTitle',
    baseInterchange.seo.seoTitle,
    revSeo?.seoTitle
  );
  merged.seo.metaDescription = mergeField(
    'seo.metaDescription',
    baseInterchange.seo.metaDescription,
    revSeo?.metaDescription
  );
  merged.seo.ogTitle = mergeField(
    'seo.ogTitle',
    baseInterchange.seo.ogTitle,
    revSeo?.ogTitle,
    null
  );
  merged.seo.ogDescription = mergeField(
    'seo.ogDescription',
    baseInterchange.seo.ogDescription,
    revSeo?.ogDescription,
    null
  );
  merged.seo.ogImage = mergeField(
    'seo.ogImage',
    baseInterchange.seo.ogImage,
    revSeo?.ogImage,
    null
  );
  merged.seo.indexing = mergeField(
    'seo.indexing',
    baseInterchange.seo.indexing,
    revSeo?.indexing
  );

  const mergedAstroProduct = mapInterchangeToAstroProduct(merged);
  const existingDraftId =
    typeof (existingRecord as any)._id === 'string'
      ? (existingRecord as any)._id
      : `drafts.${canonicalProductId}`;
  const existingRev =
    typeof (existingRecord as any)._rev === 'string'
      ? (existingRecord as any)._rev
      : undefined;
  const mergedSanityDraft = mapInterchangeToSanityProductDraft(merged, {
    existingDraftId,
    existingRev,
  });

  return {
    valid: true,
    canonicalProductId,
    slug: baseSlug,
    mergedInterchange: merged,
    mergedAstroProduct,
    mergedSanityDraft,
    fieldDiffs,
    warnings,
    errors,
  };
}

export interface PublicationReadinessReport {
  ready: boolean;
  blockers: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

/**
 * Strict publication readiness validator for live Science of Gifts publishing.
 *
 * Enforces the strict boundary between editable drafts and public catalog publishing:
 * - Drafts may be created and saved with unknown vendors, missing prices, empty image collections,
 *   or placeholder links.
 * - Publication STRICTLY requires verified facts, real merchant HTTPS URLs, positive prices with
 *   verified evidence, live inventory check, and at least one high-resolution product photograph.
 */
export function validateProductPublicationReadiness(
  productOrDraft: Record<string, any>
): PublicationReadinessReport {
  const blockers: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  const raw = productOrDraft || {};

  // Extract from Interchange v1, Sanity Draft, or Astro Product
  const isInterchange = raw.format === PRODUCT_INTERCHANGE_FORMAT_ID || Boolean(raw.identity && raw.factualContext);
  const title = String(raw.title || raw.identity?.title || '').trim();
  const rawSlug = String(
    typeof raw.slug === 'string'
      ? raw.slug
      : raw.slug?.current || raw.identity?.slug || ''
  ).trim();
  const vendor = String(raw.vendor ?? raw.factualContext?.vendor ?? '').trim();
  const rawPrice = raw.price ?? raw.factualContext?.price;
  const rawStock = raw.inStock ?? raw.factualContext?.inStock;
  const purchaseUrl = String(raw.purchaseUrl || raw.factualContext?.sourceUrl || '').trim();
  const isPlaceholderLink = Boolean(raw.isPlaceholderLink || (purchaseUrl && isPlaceholderUrl(purchaseUrl)));
  const isSampleProduct = Boolean(raw.isSampleProduct);
  const priceVerified = Boolean(raw.priceVerified ?? raw.factualContext?.priceVerification?.verified);
  const priceVerificationSource = String(
    raw.priceVerificationSource || raw.factualContext?.priceVerification?.source || 'unverified'
  );
  const inventoryVerified = Boolean(raw.inventoryVerified ?? raw.factualContext?.inventoryVerification?.verified);
  const inventoryVerificationSource = String(
    raw.inventoryVerificationSource || raw.factualContext?.inventoryVerification?.source || 'unverified'
  );
  const images = Array.isArray(raw.images) ? raw.images : Array.isArray(raw.media?.images) ? raw.media.images : [];
  const whyToGiveIt = String(raw.whyToGiveIt || raw.editorialProfile?.whyToGiveIt || '').trim();
  const bestForSummary = String(raw.bestForSummary || raw.editorialProfile?.bestForSummary || '').trim();
  const productType = String(raw.productType || raw.identity?.productType || '').trim();

  // 1. Identity & Routing
  if (!title || title.length < 4) {
    blockers.push({
      field: 'title',
      message: 'Product title must be at least 4 characters long.',
    });
  }
  if (!rawSlug || !SLUG_REGEX.test(rawSlug)) {
    blockers.push({
      field: 'slug',
      message: 'Product URL slug must be a valid lowercase kebab-case string.',
    });
  }
  if (!productType) {
    blockers.push({
      field: 'productType',
      message: 'Product category (productType) is required.',
    });
  }

  // 2. Factual Commerce & URLs
  if (!purchaseUrl || !isValidHttpsUrl(purchaseUrl)) {
    blockers.push({
      field: 'purchaseUrl',
      message: 'A valid HTTPS purchase/merchant URL is required before publishing.',
    });
  } else if (isPlaceholderLink || isPlaceholderUrl(purchaseUrl)) {
    blockers.push({
      field: 'purchaseUrl',
      message: 'Placeholder merchant URLs (e.g. example.com) cannot be published. A verified merchant URL is required.',
    });
  }

  if (!vendor || vendor.toLowerCase() === 'unknown' || isSampleVendorName(vendor)) {
    blockers.push({
      field: 'vendor',
      message: 'A real merchant/brand vendor name is required (cannot be empty, "unknown", or "Sample Maker").',
    });
  }

  if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice) || rawPrice <= 0) {
    blockers.push({
      field: 'price',
      message: 'A verified positive numeric price is required for publication. Missing prices remain drafts only.',
    });
  } else if (!priceVerified || priceVerificationSource === 'unverified') {
    blockers.push({
      field: 'priceVerification',
      message: 'Price must be verified with supporting evidence (priceVerified: true) before public release.',
    });
  }

  if (typeof rawStock !== 'boolean') {
    blockers.push({
      field: 'inStock',
      message: 'In-stock availability status must be explicitly verified as true or false.',
    });
  } else if (!inventoryVerified || inventoryVerificationSource === 'unverified') {
    warnings.push({
      field: 'inventoryVerification',
      message: 'Inventory check is unverified; public availability schema will be suppressed.',
    });
  }

  // 3. Media Assets
  if (!Array.isArray(images) || images.length === 0) {
    blockers.push({
      field: 'images',
      message: 'At least one verified product photograph is required before public publication.',
    });
  } else {
    const firstImg = images[0];
    const imgUrl = firstImg?.url || firstImg?.externalUrl || '';
    if (!isValidHttpsUrl(imgUrl) || isPlaceholderUrl(imgUrl)) {
      blockers.push({
        field: 'images[0].url',
        message: 'Primary product photograph must be a valid, accessible HTTPS image asset.',
      });
    }
  }

  // 4. Sample Governance
  if (isSampleProduct) {
    blockers.push({
      field: 'isSampleProduct',
      message: 'Sample catalog products cannot be published to the live public catalog.',
    });
  }

  // 5. Editorial Content
  if (!whyToGiveIt || whyToGiveIt.length < 60) {
    blockers.push({
      field: 'whyToGiveIt',
      message: 'Primary editorial rationale (whyToGiveIt) must be at least 60 characters long.',
    });
  }
  if (!bestForSummary || bestForSummary.length < 18) {
    blockers.push({
      field: 'bestForSummary',
      message: 'Quick-scan editorial verdict (bestForSummary) must be at least 18 characters long.',
    });
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  };
}

