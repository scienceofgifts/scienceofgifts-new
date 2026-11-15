/**
 * Science of Gifts — Canonical Product Document Mapper
 *
 * Bidirectional, non-destructive conversion between:
 * 1. Local catalog / Astro `Product` records (`src/types/content.ts`, `src/data/catalog.ts`)
 * 2. Sanity Content Lake `product` documents (`src/cms/studio/schemas/documents/product.ts`)
 *
 * Guarantees:
 * - All legacy taxonomy strings (`productType`, `interests`, etc.) are normalized against
 *   `taxonomyRegistry.ts` so every local catalog product can be cleanly saved as a Sanity draft.
 * - Unverified or missing prices are NEVER fabricated as `$0.00` verified offers or forced
 *   into wrong budget buckets; `price <= 0` omits `price`, `budgetTier`, and `guidePriceBucket`.
 * - Unverified inventory never asserts `InStock`/`OutOfStock` Schema.org claims.
 * - All structured editorial blocks (`giftVerdict`, `idealRecipientProfile`,
 *   `extendedGiftRationale`, `buyingConsiderationsList`, `specifications`,
 *   `occasionContextNotes`, `similarGiftComparisons`) map cleanly in both directions.
 */

import type {
  AgeRange,
  CommerceProvider,
  OccasionType,
  PersonalityTrait,
  Product,
  ProductBuyingConsideration,
  ProductImage,
  ProductOccasionNote,
  ProductSimilarComparison,
  ProductSpecificationItem,
  RecipientType,
} from '../../types/content';
import { evaluateProductPublicationLifecycle } from './publicationWorkflow';
import {
  AGE_RANGE_OPTIONS,
  COMMERCE_PROVIDER_OPTIONS,
  GUIDE_PRICE_BUCKET_OPTIONS,
  OCCASION_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  PRODUCT_BUDGET_TIER_OPTIONS,
  RECIPIENT_OPTIONS,
  normalizeProductCategory,
  normalizeTaxonomyInterestTag,
} from './taxonomyRegistry';

const VALID_RECIPIENTS = new Set<string>(RECIPIENT_OPTIONS.map((o) => o.value));
const VALID_OCCASIONS = new Set<string>(OCCASION_OPTIONS.map((o) => o.value));
const VALID_PERSONALITY_TRAITS = new Set<string>(
  PERSONALITY_TRAIT_OPTIONS.map((o) => o.value)
);
const VALID_AGE_RANGES = new Set<string>(AGE_RANGE_OPTIONS.map((o) => o.value));
const VALID_COMMERCE_PROVIDERS = new Set<string>(
  COMMERCE_PROVIDER_OPTIONS.map((o) => o.value)
);
const VALID_BUDGET_TIERS = new Set<string>(
  PRODUCT_BUDGET_TIER_OPTIONS.map((o) => o.value)
);
const VALID_GUIDE_BUCKETS = new Set<string>(
  GUIDE_PRICE_BUCKET_OPTIONS.map((o) => o.value)
);

function deriveBudgetTierFromPositivePrice(
  price: number
): 'under-50' | '50-to-100' | '100-plus' {
  if (price < 50) return 'under-50';
  if (price <= 100) return '50-to-100';
  return '100-plus';
}

function deriveGuidePriceBucketFromPositivePrice(
  price: number
): 'under-25' | '25-to-75' | 'over-75' {
  if (price < 25) return 'under-25';
  if (price <= 75) return '25-to-75';
  return 'over-75';
}

function resolveSanityCdnUrlFromRef(
  ref: string | undefined,
  projectId = 'c1y2qdje',
  dataset = 'production'
): string | undefined {
  if (!ref || typeof ref !== 'string') return undefined;
  const match = ref.match(/^image-([a-zA-Z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/);
  if (!match) return undefined;
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${match[1]}-${match[2]}.${match[3]}`;
}

export type SanityFulfillmentClassification =
  | 'affiliate-partner'
  | 'owned-fourthwall-merch'
  | 'owned-digital-product'
  | 'editorial-non-monetized';

export function isFourthwallStorefrontUrl(rawUrl: unknown): boolean {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'shop.scienceofgifts.com' ||
      host.endsWith('.fourthwall.com') ||
      host === 'fourthwall.com'
    );
  } catch {
    const lower = rawUrl.trim().toLowerCase();
    return (
      lower.includes('shop.scienceofgifts.com') ||
      lower.includes('fourthwall.com')
    );
  }
}

export function mapAstroFulfillmentToSanity(
  raw: Product['fulfillmentClassification'] | string | undefined,
  commerceProvider: CommerceProvider
): SanityFulfillmentClassification {
  if (
    raw === 'owned-fourthwall-merch' ||
    raw === 'fourthwall_merch' ||
    raw === 'fourthwall-merchandise' ||
    commerceProvider === 'fourthwall'
  ) {
    return 'owned-fourthwall-merch';
  }
  if (
    raw === 'owned-digital-product' ||
    raw === 'digital_download' ||
    commerceProvider === 'digital'
  ) {
    return 'owned-digital-product';
  }
  if (
    raw === 'editorial-non-monetized' ||
    raw === 'direct_editorial' ||
    commerceProvider === 'direct'
  ) {
    return 'editorial-non-monetized';
  }
  if (
    raw === 'affiliate-partner' ||
    raw === 'affiliate_redirect' ||
    raw === 'external-affiliate'
  ) {
    return 'affiliate-partner';
  }
  return 'affiliate-partner';
}

/**
 * Deterministically resolves `commerceProvider` and `fulfillmentClassification`
 * from actual product data (`purchaseUrl`, `fourthwallUrl`, `fulfillmentClassification`, `commerceProvider`)
 * so they always use canonical Sanity enum values and never disagree.
 */
export function resolveDeterministicCommerceAndFulfillment(
  doc: Record<string, any>
): {
  commerceProvider: CommerceProvider;
  fulfillmentClassification: SanityFulfillmentClassification;
} {
  const purchaseUrl =
    typeof doc.purchaseUrl === 'string' ? doc.purchaseUrl.trim() : '';
  const fourthwallUrl =
    typeof doc.fourthwallUrl === 'string' ? doc.fourthwallUrl.trim() : '';
  const rawFulfillment =
    typeof doc.fulfillmentClassification === 'string'
      ? doc.fulfillmentClassification.trim()
      : '';
  const rawProvider =
    typeof doc.commerceProvider === 'string' ? doc.commerceProvider.trim() : '';

  // 1. Primary purchaseUrl or fourthwallUrl on Fourthwall storefront is authoritative
  if (
    isFourthwallStorefrontUrl(purchaseUrl) ||
    (!purchaseUrl && isFourthwallStorefrontUrl(fourthwallUrl))
  ) {
    return {
      commerceProvider: 'fourthwall',
      fulfillmentClassification: 'owned-fourthwall-merch',
    };
  }

  // 2. If purchaseUrl is an explicit non-Fourthwall HTTPS URL, determine from non-fourthwall classification
  if (purchaseUrl) {
    if (
      rawFulfillment === 'owned-digital-product' ||
      rawFulfillment === 'digital_download' ||
      rawProvider === 'digital'
    ) {
      return {
        commerceProvider: 'digital',
        fulfillmentClassification: 'owned-digital-product',
      };
    }
    if (
      rawFulfillment === 'editorial-non-monetized' ||
      rawFulfillment === 'direct_editorial' ||
      rawProvider === 'direct'
    ) {
      return {
        commerceProvider: 'direct',
        fulfillmentClassification: 'editorial-non-monetized',
      };
    }
    return {
      commerceProvider: 'affiliate',
      fulfillmentClassification: 'affiliate-partner',
    };
  }

  // 3. When no purchaseUrl is set yet, reconcile fulfillmentClassification and commerceProvider
  if (
    rawFulfillment === 'owned-fourthwall-merch' ||
    rawFulfillment === 'fourthwall_merch' ||
    rawFulfillment === 'fourthwall-merchandise' ||
    rawProvider === 'fourthwall'
  ) {
    return {
      commerceProvider: 'fourthwall',
      fulfillmentClassification: 'owned-fourthwall-merch',
    };
  }
  if (
    rawFulfillment === 'owned-digital-product' ||
    rawFulfillment === 'digital_download' ||
    rawProvider === 'digital'
  ) {
    return {
      commerceProvider: 'digital',
      fulfillmentClassification: 'owned-digital-product',
    };
  }
  if (
    rawFulfillment === 'editorial-non-monetized' ||
    rawFulfillment === 'direct_editorial' ||
    rawProvider === 'direct'
  ) {
    return {
      commerceProvider: 'direct',
      fulfillmentClassification: 'editorial-non-monetized',
    };
  }

  return {
    commerceProvider: 'affiliate',
    fulfillmentClassification: 'affiliate-partner',
  };
}

export function normalizeInternalCanonicalPath(
  rawCanonicalPath: unknown,
  fallbackSlug?: string
): string | undefined {
  if (typeof rawCanonicalPath === 'string' && rawCanonicalPath.trim()) {
    const trimmed = rawCanonicalPath.trim();
    // Only normalize internal relative paths starting with "/" (do not mask invalid external URLs or query strings)
    if (
      trimmed.startsWith('/') &&
      !trimmed.startsWith('//') &&
      !/[?#]/.test(trimmed) &&
      /^\/[a-z0-9-/]*$/.test(trimmed)
    ) {
      if (trimmed === '/') return '/';
      return `${trimmed.replace(/\/+$/, '')}/`;
    }
    return trimmed;
  }
  if (typeof fallbackSlug === 'string' && fallbackSlug.trim()) {
    return `/products/${fallbackSlug.trim().replace(/^\/+|\/+$/g, '')}/`;
  }
  return undefined;
}

function mapSanityFulfillmentToAstro(
  raw: unknown,
  commerceProvider: CommerceProvider
): Product['fulfillmentClassification'] {
  if (
    raw === 'owned-fourthwall-merch' ||
    raw === 'fourthwall_merch' ||
    raw === 'fourthwall-merchandise' ||
    commerceProvider === 'fourthwall'
  ) {
    return 'fourthwall_merch';
  }
  if (
    raw === 'owned-digital-product' ||
    raw === 'digital_download' ||
    commerceProvider === 'digital'
  ) {
    return 'digital_download';
  }
  if (
    raw === 'editorial-non-monetized' ||
    raw === 'direct_editorial' ||
    commerceProvider === 'direct'
  ) {
    return 'direct_editorial';
  }
  return 'affiliate_redirect';
}

export function mapAstroPriceVerificationSourceToSanity(
  raw: unknown,
  priceVerified: boolean
): 'unverified' | 'merchant-json-ld' | 'manual-merchant-check' | 'fourthwall-catalog' {
  if (
    raw === 'merchant-json-ld' ||
    raw === 'manual-merchant-check' ||
    raw === 'fourthwall-catalog' ||
    raw === 'unverified'
  ) {
    return raw;
  }
  if (raw === 'fourthwall_api') return 'fourthwall-catalog';
  if (raw === 'retailer_live_check' || raw === 'brand_catalog_sheet') {
    return 'manual-merchant-check';
  }
  return priceVerified ? 'manual-merchant-check' : 'unverified';
}

function mapSanityPriceVerificationSourceToAstro(
  raw: unknown
): Product['priceVerificationSource'] {
  if (raw === 'fourthwall-catalog' || raw === 'fourthwall_api') {
    return 'fourthwall_api';
  }
  if (raw === 'merchant-json-ld' || raw === 'manual-merchant-check' || raw === 'retailer_live_check') {
    return 'retailer_live_check';
  }
  if (raw === 'brand_catalog_sheet') {
    return 'brand_catalog_sheet';
  }
  return 'unverified';
}

export function mapAstroInventoryVerificationSourceToSanity(
  raw: unknown,
  inventoryVerified: boolean
): 'unverified' | 'merchant-json-ld' | 'manual-merchant-check' | 'fourthwall-catalog' {
  if (
    raw === 'merchant-json-ld' ||
    raw === 'manual-merchant-check' ||
    raw === 'fourthwall-catalog' ||
    raw === 'unverified'
  ) {
    return raw;
  }
  if (raw === 'fourthwall_stock_feed') return 'fourthwall-catalog';
  if (raw === 'retailer_live_check' || raw === 'manual_editor_check') {
    return 'manual-merchant-check';
  }
  return inventoryVerified ? 'manual-merchant-check' : 'unverified';
}

function mapSanityInventoryVerificationSourceToAstro(
  raw: unknown
): Product['inventoryVerificationSource'] {
  if (raw === 'fourthwall-catalog' || raw === 'fourthwall_stock_feed') {
    return 'fourthwall_stock_feed';
  }
  if (raw === 'merchant-json-ld' || raw === 'retailer_live_check') {
    return 'retailer_live_check';
  }
  if (raw === 'manual-merchant-check' || raw === 'manual_editor_check') {
    return 'manual_editor_check';
  }
  return 'unverified';
}

/**
 * Backward-compatible normalizer for Sanity `product` documents.
 *
 * Non-destructively normalizes:
 * 1. Legacy fulfillment values (`fourthwall_merch`, `fourthwall-merchandise`,
 *    `affiliate_redirect`, `external-affiliate`, `digital_download`, `direct_editorial`)
 *    into the official Sanity enum (`owned-fourthwall-merch`, `affiliate-partner`,
 *    `owned-digital-product`, `editorial-non-monetized`).
 * 2. Deterministic `commerceProvider` & `fulfillmentClassification` agreement from actual
 *    product URLs (`shop.scienceofgifts.com` / `fourthwall.com` -> `fourthwall` + `owned-fourthwall-merch`).
 * 3. Legacy verification source values (`retailer_live_check`, `fourthwall_api`, `fourthwall_stock_feed`, etc.).
 * 4. Internal `seo.canonicalPath` trailing slash consistency.
 *
 * Preserves all product content, IDs (`_id`, `productId`), `_rev`, URLs, and publishing `status`.
 */
export function normalizeSanityProductDocumentBackwardCompatible<
  T extends Record<string, any>,
>(doc: T): T {
  if (!doc || typeof doc !== 'object' || doc._type !== 'product') {
    return doc;
  }

  const cloned: Record<string, any> = { ...doc };

  const { commerceProvider, fulfillmentClassification } =
    resolveDeterministicCommerceAndFulfillment(cloned);
  cloned.commerceProvider = commerceProvider;
  cloned.fulfillmentClassification = fulfillmentClassification;

  // If this is a Fourthwall product with a storefront URL and an accidental duplicate affiliateUrl pointing to Fourthwall, clean up fourthwallUrl
  if (
    commerceProvider === 'fourthwall' &&
    typeof cloned.purchaseUrl === 'string' &&
    isFourthwallStorefrontUrl(cloned.purchaseUrl) &&
    !cloned.fourthwallUrl
  ) {
    cloned.fourthwallUrl = cloned.purchaseUrl.trim();
  }

  if (cloned.priceVerificationSource !== undefined) {
    cloned.priceVerificationSource = mapAstroPriceVerificationSourceToSanity(
      cloned.priceVerificationSource,
      Boolean(cloned.priceVerified)
    );
  }

  if (cloned.inventoryVerificationSource !== undefined) {
    cloned.inventoryVerificationSource =
      mapAstroInventoryVerificationSourceToSanity(
        cloned.inventoryVerificationSource,
        Boolean(cloned.inventoryVerified)
      );
  }

  if (Array.isArray(cloned.similarGiftComparisons)) {
    cloned.similarGiftComparisons = cloned.similarGiftComparisons.map(
      (item: any) => {
        if (!item || typeof item !== 'object') return item;
        return {
          ...item,
          comparisonAngle:
            item.comparisonAngle ||
            item.distinctionLabel ||
            'Alternative Pick',
          summary: item.summary || item.comparisonNote || '',
        };
      }
    );
  }

  if (cloned.seo && typeof cloned.seo === 'object') {
    const slugCurrent =
      typeof cloned.slug === 'string'
        ? cloned.slug
        : typeof cloned.slug?.current === 'string'
        ? cloned.slug.current
        : undefined;
    const normalizedPath = normalizeInternalCanonicalPath(
      cloned.seo.canonicalPath,
      slugCurrent
    );
    cloned.seo = {
      ...cloned.seo,
      ...(normalizedPath ? { canonicalPath: normalizedPath } : {}),
    };
  }

  return cloned as T;
}

/**
 * Converts a local catalog / Astro `Product` record into a normalized Sanity Studio
 * `product` document (`drafts.<canonicalId>` by default, or canonical ID when specified).
 *
 * Ensures all legacy taxonomy tags (`productType`, `interests`) are normalized against
 * `taxonomyRegistry.ts` so saving to Sanity Content Lake succeeds without 422 errors.
 */
export function convertLocalProductToSanityDraft(
  product: Product,
  options?: {
    _rev?: string;
    asLocalReferenceSeed?: boolean;
  }
): Record<string, any> & {
  _id: string;
  _type: 'product';
  status: 'draft' | 'published';
} {
  const canonicalId = (product.id || '').trim().replace(/^drafts\./, '');
  const asSeed = Boolean(options?.asLocalReferenceSeed);

  const normalizedCategory =
    normalizeProductCategory(product.productType) || 'Decor & Accents';

  const normalizedInterests = Array.from(
    new Set(
      (product.interests ?? [])
        .map((tag) => normalizeTaxonomyInterestTag(tag))
        .filter((tag): tag is string => Boolean(tag))
    )
  );
  if (normalizedInterests.length === 0) {
    normalizedInterests.push('Home Decor');
  }

  const normalizedRecipients = (product.recipients ?? []).filter((r) =>
    VALID_RECIPIENTS.has(r)
  );
  const normalizedOccasions = (product.occasions ?? []).filter((o) =>
    VALID_OCCASIONS.has(o)
  );
  const normalizedPersonalityTraits = (product.personalityTraits ?? []).filter((p) =>
    VALID_PERSONALITY_TRAITS.has(p)
  );
  const normalizedAgeRanges = (product.ageRanges ?? []).filter((a) =>
    VALID_AGE_RANGES.has(a)
  );

  const { commerceProvider, fulfillmentClassification } =
    resolveDeterministicCommerceAndFulfillment({
      purchaseUrl: product.purchaseUrl,
      fourthwallUrl: product.fourthwallUrl,
      commerceProvider: product.commerceProvider,
      fulfillmentClassification: product.fulfillmentClassification,
    });

  const hasPositivePrice =
    typeof product.price === 'number' &&
    Number.isFinite(product.price) &&
    product.price > 0;

  const isPriceVerified = Boolean(product.priceVerified && hasPositivePrice);
  const priceVerificationSource = mapAstroPriceVerificationSourceToSanity(
    product.priceVerificationSource,
    isPriceVerified
  );

  const hasBooleanStock = typeof product.inStock === 'boolean';
  const isInventoryVerified = Boolean(product.inventoryVerified && hasBooleanStock);
  const inventoryVerificationSource = mapAstroInventoryVerificationSourceToSanity(
    product.inventoryVerificationSource,
    isInventoryVerified
  );

  const doc: Record<string, any> = {
    _id: asSeed ? canonicalId : `drafts.${canonicalId}`,
    _type: 'product' as const,
    ...(options?._rev ? { _rev: options._rev } : {}),
    _updatedAt: new Date().toISOString(),
    title: product.title,
    slug: { _type: 'slug', current: product.slug },
    productId: canonicalId,
    vendor: product.vendor,
    productType: normalizedCategory,
    subtitle: product.subtitle,
    ...(product.calloutTag ? { calloutTag: product.calloutTag } : {}),
    whyToGiveIt: product.whyToGiveIt,
    bestForSummary: product.bestForSummary,
    detailsAndCare: product.detailsAndCare,
    commerceProvider,
    fulfillmentClassification,
    ...(product.externalProductId
      ? { externalProductId: product.externalProductId }
      : {}),
    purchaseUrl: product.purchaseUrl,
    ...(product.affiliateUrl ? { affiliateUrl: product.affiliateUrl } : {}),
    ...(product.fourthwallUrl ? { fourthwallUrl: product.fourthwallUrl } : {}),
    currency: product.currency || 'USD',
    ...(hasPositivePrice
      ? {
          price: product.price,
          budgetTier: VALID_BUDGET_TIERS.has(product.budgetTier)
            ? product.budgetTier
            : deriveBudgetTierFromPositivePrice(product.price),
          guidePriceBucket: VALID_GUIDE_BUCKETS.has(product.guidePriceBucket)
            ? product.guidePriceBucket
            : deriveGuidePriceBucketFromPositivePrice(product.price),
        }
      : {}),
    ...(hasBooleanStock ? { inStock: product.inStock } : {}),
    ...(product.availabilityNote
      ? { availabilityNote: product.availabilityNote }
      : {}),
    priceVerified: isPriceVerified,
    priceVerificationSource,
    ...(isPriceVerified
      ? {
          priceVerifiedAt:
            product.priceVerifiedAt || new Date().toISOString().slice(0, 10),
          priceVerificationEvidenceNote:
            product.priceVerificationEvidenceNote &&
            product.priceVerificationEvidenceNote.trim().length >= 8
              ? product.priceVerificationEvidenceNote.trim()
              : `Verified $${product.price} USD against ${product.vendor || 'merchant'} catalog record`,
        }
      : {}),
    inventoryVerified: isInventoryVerified,
    inventoryVerificationSource,
    ...(isInventoryVerified && product.inventoryVerifiedAt
      ? { inventoryVerifiedAt: product.inventoryVerifiedAt }
      : {}),
    isSampleProduct: Boolean(product.isSampleProduct),
    isPlaceholderLink: Boolean(product.isPlaceholderLink),
    recipients:
      normalizedRecipients.length > 0 ? normalizedRecipients : ['friend'],
    interests: normalizedInterests,
    occasions: normalizedOccasions.length > 0 ? normalizedOccasions : ['birthday'],
    personalityTraits:
      normalizedPersonalityTraits.length > 0
        ? normalizedPersonalityTraits
        : ['everyday-ritual'],
    ageRanges: normalizedAgeRanges.length > 0 ? normalizedAgeRanges : ['adult'],
    images: (product.images ?? []).map((img, idx) => {
      const assetRef =
        img.sanityAssetId || img.asset?.asset?._ref || undefined;
      return {
        _key: img.id || `img_${String(idx + 1).padStart(2, '0')}`,
        _type: 'productImage',
        id: img.id || `img_${String(idx + 1).padStart(2, '0')}`,
        url: img.url,
        externalUrl: img.url,
        alt: img.alt,
        ...(img.caption ? { caption: img.caption } : {}),
        fitMode: img.fitMode === 'contain' ? 'contain' : 'cover',
        focalPoint: {
          _type: 'imageFocalPoint',
          x: img.focalPoint?.x ?? 0.5,
          y: img.focalPoint?.y ?? 0.5,
        },
        fallbackColor: img.fallbackColor || '#F6F4EF',
        ...(assetRef
          ? {
              sanityAssetId: assetRef,
              asset: {
                _type: 'image',
                asset: { _type: 'reference', _ref: assetRef },
                hotspot: {
                  _type: 'sanity.imageHotspot',
                  x: img.focalPoint?.x ?? 0.5,
                  y: img.focalPoint?.y ?? 0.5,
                  width: 0.3,
                  height: 0.3,
                },
              },
            }
          : {}),
        sourceType: img.sourceType || (assetRef ? 'sanity-upload' : 'external-url'),
        ...(img.width ? { width: img.width } : {}),
        ...(img.height ? { height: img.height } : {}),
        ...(img.aspectRatio ? { aspectRatio: img.aspectRatio } : {}),
        isSampleAsset: Boolean(img.isSampleAsset),
      };
    }),
    specifications: (product.specifications || []).map((spec, idx) => ({
      _key: `spec_${String(idx + 1).padStart(2, '0')}`,
      _type: 'productSpecificationItem',
      label: spec.label,
      value: spec.value,
    })),
    ...(product.giftVerdict
      ? {
          giftVerdict: {
            _type: 'productGiftVerdict',
            editorialAssessment:
              product.giftVerdict.editorialAssessment ||
              product.giftVerdict.summary ||
              '',
            standoutReason:
              product.giftVerdict.standoutReason ||
              product.giftVerdict.distinctDifference ||
              '',
            recipientDelight:
              product.giftVerdict.recipientDelight ||
              product.giftVerdict.appeal ||
              '',
            ...(product.giftVerdict.importantCaveat || product.giftVerdict.caveat
              ? {
                  importantCaveat:
                    product.giftVerdict.importantCaveat ||
                    product.giftVerdict.caveat ||
                    '',
                }
              : {}),
          },
        }
      : {}),
    ...(product.idealRecipientProfile
      ? {
          idealRecipientProfile: {
            _type: 'productRecipientProfile',
            headline: product.idealRecipientProfile.headline || '',
            narrative: product.idealRecipientProfile.narrative || '',
            lifestyleNotes: Array.isArray(
              product.idealRecipientProfile.lifestyleNotes
            )
              ? [...product.idealRecipientProfile.lifestyleNotes]
              : [],
            relationshipFit: Array.isArray(
              product.idealRecipientProfile.relationshipFit
            )
              ? [...product.idealRecipientProfile.relationshipFit]
              : [],
          },
        }
      : {}),
    extendedGiftRationale: Array.isArray(product.extendedGiftRationale)
      ? [...product.extendedGiftRationale]
      : typeof product.extendedGiftRationale === 'string' &&
        product.extendedGiftRationale
      ? String(product.extendedGiftRationale).split(/\n{2,}/).filter(Boolean)
      : [],
    buyingConsiderationsList: Array.isArray(product.buyingConsiderationsList)
      ? product.buyingConsiderationsList.map((item, idx) => ({
          _key: `bc_${String(idx + 1).padStart(2, '0')}`,
          _type: 'productBuyingConsideration',
          label: item.label,
          detail: item.detail,
        }))
      : [],
    occasionContextNotes: Array.isArray(product.occasionContextNotes)
      ? product.occasionContextNotes.map((item, idx) => ({
          _key: `occ_${String(idx + 1).padStart(2, '0')}`,
          _type: 'productOccasionNote',
          occasion: item.occasion,
          label: item.label,
          note: item.note,
        }))
      : [],
    ...(Array.isArray(product.similarGiftComparisons) &&
    product.similarGiftComparisons.length > 0
      ? {
          similarGiftComparisons: product.similarGiftComparisons.map((cmp, idx) => ({
            _key: `cmp_${String(idx + 1).padStart(2, '0')}`,
            _type: 'productSimilarComparison',
            product: {
              _type: 'reference',
              _ref: cmp.productId,
            },
            comparisonAngle: cmp.comparisonAngle,
            summary: cmp.summary,
          })),
        }
      : {}),
    ...(Array.isArray(product.citationIds) && product.citationIds.length > 0
      ? {
          citationRefs: product.citationIds.map((citId, idx) => ({
            _key: `cit_${idx}`,
            _type: 'reference',
            _ref: citId,
          })),
        }
      : {}),
    ...(Array.isArray(product.relatedProductIds) &&
    product.relatedProductIds.length > 0
      ? {
          relatedProducts: product.relatedProductIds.map((pid, idx) => ({
            _key: `relp_${idx}`,
            _type: 'reference',
            _ref: pid,
          })),
        }
      : {}),
    ...(Array.isArray(product.relatedGuideIds) &&
    product.relatedGuideIds.length > 0
      ? {
          relatedGuides: product.relatedGuideIds.map((gid, idx) => ({
            _key: `relg_${idx}`,
            _type: 'reference',
            _ref: gid,
          })),
        }
      : {}),
    ...(typeof product.editorialRating === 'number'
      ? { editorialRating: product.editorialRating }
      : {}),
    ...(product.testingNote ? { testingNote: product.testingNote } : {}),
    status: asSeed ? (product.status ?? 'published') : 'draft',
    editorialApproved:
      typeof product.editorialApproved === 'boolean'
        ? product.editorialApproved
        : asSeed,
    seo: {
      _type: 'seoMetadata',
      seoTitle: product.seo?.seoTitle ?? `${product.title} | Science of Gifts`,
      metaDescription: product.seo?.metaDescription ?? product.subtitle,
      canonicalPath:
        product.seo?.canonicalPath ?? `/products/${product.slug}/`,
      indexing:
        product.seo?.noindex || product.seo?.indexing === 'noindex,follow'
          ? 'noindex,follow'
          : 'index,follow',
    },
  };

  return doc as Record<string, any> & {
    _id: string;
    _type: 'product';
    status: 'draft' | 'published';
  };
}

/**
 * Maps a Sanity Content Lake `product` document (published OR draft for preview)
 * into a complete Astro/React `Product` object (`src/types/content.ts`).
 */
export function mapSanityProductDocumentToAstroProduct(
  doc: Record<string, any>,
  sanityConfig?: { projectId?: string; dataset?: string }
): Product {
  const projectId = sanityConfig?.projectId || 'c1y2qdje';
  const dataset = sanityConfig?.dataset || 'production';

  const rawId = String(doc.productId || doc.id || doc._id || '').trim();
  const canonicalId = rawId.replace(/^drafts\./, '');
  const title = String(doc.title || 'Untitled Product').trim();
  const slug =
    typeof doc.slug === 'string'
      ? doc.slug.trim()
      : typeof doc.slug?.current === 'string'
      ? doc.slug.current.trim()
      : canonicalId.replace(/^prod_/, '').replace(/_/g, '-');

  const isSanityDraftId = String(doc._id || '').startsWith('drafts.');
  const status: 'draft' | 'published' =
    isSanityDraftId || doc.status === 'draft' ? 'draft' : 'published';

  const hasValidPositivePrice =
    typeof doc.price === 'number' &&
    Number.isFinite(doc.price) &&
    doc.price > 0;
  const price = hasValidPositivePrice ? Number(doc.price) : 0;

  const budgetTier = hasValidPositivePrice
    ? VALID_BUDGET_TIERS.has(doc.budgetTier)
      ? doc.budgetTier
      : deriveBudgetTierFromPositivePrice(price)
    : (undefined as unknown as Product['budgetTier']);

  const guidePriceBucket = hasValidPositivePrice
    ? VALID_GUIDE_BUCKETS.has(doc.guidePriceBucket)
      ? doc.guidePriceBucket
      : deriveGuidePriceBucketFromPositivePrice(price)
    : (undefined as unknown as Product['guidePriceBucket']);

  const inStock =
    typeof doc.inStock === 'boolean'
      ? doc.inStock
      : (undefined as unknown as boolean);

  const images: ProductImage[] = Array.isArray(doc.images)
    ? doc.images
        .map((rawImg: any, idx: number): ProductImage | null => {
          if (!rawImg || typeof rawImg !== 'object') return null;
          const assetRef =
            typeof rawImg.sanityAssetId === 'string' &&
            rawImg.sanityAssetId.startsWith('image-')
              ? rawImg.sanityAssetId.trim()
              : typeof rawImg.asset?.asset?._ref === 'string' &&
                rawImg.asset.asset._ref.startsWith('image-')
              ? rawImg.asset.asset._ref.trim()
              : typeof rawImg.asset?._ref === 'string' &&
                rawImg.asset._ref.startsWith('image-')
              ? rawImg.asset._ref.trim()
              : undefined;

          const directUrl =
            typeof rawImg.url === 'string' && rawImg.url.trim()
              ? rawImg.url.trim()
              : typeof rawImg.externalUrl === 'string' && rawImg.externalUrl.trim()
              ? rawImg.externalUrl.trim()
              : resolveSanityCdnUrlFromRef(assetRef, projectId, dataset) || '';

          if (!directUrl && !assetRef) return null;

          const fp = rawImg.focalPoint || rawImg.asset?.hotspot;
          const focalPoint =
            fp && typeof fp.x === 'number' && typeof fp.y === 'number'
              ? {
                  x: Math.max(0, Math.min(1, Number(fp.x))),
                  y: Math.max(0, Math.min(1, Number(fp.y))),
                }
              : { x: 0.5, y: 0.5 };

          return {
            id:
              typeof rawImg.id === 'string' && rawImg.id.trim()
                ? rawImg.id.trim()
                : typeof rawImg._key === 'string' && rawImg._key.trim()
                ? rawImg._key.trim()
                : `img_${String(idx + 1).padStart(2, '0')}`,
            url: directUrl,
            fallbackColor:
              typeof rawImg.fallbackColor === 'string' && rawImg.fallbackColor.trim()
                ? rawImg.fallbackColor.trim()
                : '#F6F4EF',
            alt:
              typeof rawImg.alt === 'string' && rawImg.alt.trim()
                ? rawImg.alt.trim()
                : title,
            ...(typeof rawImg.caption === 'string' && rawImg.caption.trim()
              ? { caption: rawImg.caption.trim() }
              : {}),
            isSampleAsset: Boolean(rawImg.isSampleAsset),
            ...(assetRef ? { sanityAssetId: assetRef } : {}),
            ...(rawImg.asset && typeof rawImg.asset === 'object'
              ? { asset: rawImg.asset }
              : {}),
            ...(rawImg.sourceType ? { sourceType: rawImg.sourceType } : {}),
            ...(typeof rawImg.width === 'number' ? { width: rawImg.width } : {}),
            ...(typeof rawImg.height === 'number' ? { height: rawImg.height } : {}),
            ...(typeof rawImg.aspectRatio === 'number'
              ? { aspectRatio: rawImg.aspectRatio }
              : {}),
            focalPoint,
            fitMode: rawImg.fitMode === 'contain' ? 'contain' : 'cover',
            ...(typeof rawImg.landscapeOverrideUrl === 'string'
              ? { landscapeOverrideUrl: rawImg.landscapeOverrideUrl }
              : {}),
            ...(typeof rawImg.portraitOverrideUrl === 'string'
              ? { portraitOverrideUrl: rawImg.portraitOverrideUrl }
              : {}),
          };
        })
        .filter((img): img is ProductImage => img !== null)
    : [];

  const gv =
    doc.giftVerdict && typeof doc.giftVerdict === 'object'
      ? doc.giftVerdict
      : doc.verdict && typeof doc.verdict === 'object'
      ? doc.verdict
      : null;
  const giftVerdict = gv
    ? {
        editorialAssessment: String(
          gv.editorialAssessment ?? gv.summary ?? doc.giftVerdictAssessment ?? ''
        ).trim(),
        standoutReason: String(
          gv.standoutReason ?? gv.distinctDifference ?? doc.giftVerdictTactileQuality ?? ''
        ).trim(),
        recipientDelight: String(
          gv.recipientDelight ?? gv.whyEnjoyReceiving ?? gv.appeal ?? doc.giftVerdictBehavioralLogic ?? ''
        ).trim(),
        ...(gv.importantCaveat || gv.caveat || doc.giftVerdictPracticalCaveats
          ? {
              importantCaveat: String(
                gv.importantCaveat ?? gv.caveat ?? doc.giftVerdictPracticalCaveats ?? ''
              ).trim(),
            }
          : {}),
      }
    : undefined;

  const rawProfile = doc.idealRecipientProfile ?? doc.recipientProfile;
  const idealRecipientProfile =
    rawProfile && typeof rawProfile === 'object' && !Array.isArray(rawProfile)
      ? {
          headline: String(rawProfile.headline || '').trim(),
          narrative: String(
            rawProfile.narrative || rawProfile.summary || ''
          ).trim(),
          lifestyleNotes: Array.isArray(rawProfile.lifestyleNotes)
            ? rawProfile.lifestyleNotes
                .map((n: unknown) => String(n ?? '').trim())
                .filter(Boolean)
            : [],
          relationshipFit: Array.isArray(rawProfile.relationshipFit)
            ? rawProfile.relationshipFit
                .map((n: unknown) => String(n ?? '').trim())
                .filter(Boolean)
            : [],
        }
      : typeof rawProfile === 'string' && rawProfile.trim()
      ? {
          headline: 'Ideal Recipient',
          narrative: rawProfile.trim(),
          lifestyleNotes: [],
          relationshipFit: [],
        }
      : undefined;

  const extendedGiftRationale: string[] | undefined = Array.isArray(
    doc.extendedGiftRationale
  )
    ? doc.extendedGiftRationale
        .map((p: unknown) => String(p ?? '').trim())
        .filter(Boolean)
    : typeof doc.extendedGiftRationale === 'string' &&
      doc.extendedGiftRationale.trim()
    ? doc.extendedGiftRationale
        .split(/\n{2,}/)
        .map((p: string) => p.trim())
        .filter(Boolean)
    : undefined;

  const buyingConsiderationsList: ProductBuyingConsideration[] | undefined =
    Array.isArray(doc.buyingConsiderationsList)
      ? doc.buyingConsiderationsList
          .map((item: any) => ({
            label: String(item?.label || '').trim(),
            detail: String(item?.detail || '').trim(),
          }))
          .filter((item: ProductBuyingConsideration) => Boolean(item.label || item.detail))
      : undefined;

  const occasionContextNotes: ProductOccasionNote[] | undefined = Array.isArray(
    doc.occasionContextNotes
  )
    ? doc.occasionContextNotes
        .map((item: any) => ({
          occasion: (VALID_OCCASIONS.has(item?.occasion)
            ? item.occasion
            : 'birthday') as OccasionType,
          label: String(item?.label || '').trim(),
          note: String(item?.note || '').trim(),
        }))
        .filter((item: ProductOccasionNote) => Boolean(item.label || item.note))
    : undefined;

  const specifications: ProductSpecificationItem[] | undefined = Array.isArray(
    doc.specifications
  )
    ? doc.specifications
        .map((item: any) => ({
          label: String(item?.label || item?.key || '').trim(),
          value: String(item?.value || '').trim(),
        }))
        .filter((item: ProductSpecificationItem) => Boolean(item.label || item.value))
    : undefined;

  const similarGiftComparisons: ProductSimilarComparison[] | undefined =
    Array.isArray(doc.similarGiftComparisons)
      ? doc.similarGiftComparisons
          .map((item: any) => {
            const refId =
              item?.product?._ref || item?.productId || '';
            return {
              productId: String(refId).replace(/^drafts\./, ''),
              comparisonAngle: String(item?.comparisonAngle || '').trim(),
              summary: String(item?.summary || item?.comparisonNote || '').trim(),
            };
          })
          .filter((c: ProductSimilarComparison) => Boolean(c.productId))
      : undefined;

  const citationIds: string[] = Array.isArray(doc.citationRefs)
    ? doc.citationRefs
        .map((ref: any) => String(ref?._ref || ref || '').replace(/^drafts\./, ''))
        .filter(Boolean)
    : Array.isArray(doc.citationIds)
    ? doc.citationIds.map((c: unknown) => String(c || '').trim()).filter(Boolean)
    : [];

  const relatedProductIds: string[] | undefined = Array.isArray(
    doc.relatedProducts
  )
    ? doc.relatedProducts
        .map((ref: any) => String(ref?._ref || ref || '').replace(/^drafts\./, ''))
        .filter(Boolean)
    : Array.isArray(doc.relatedProductIds)
    ? doc.relatedProductIds
    : undefined;

  const relatedGuideIds: string[] | undefined = Array.isArray(doc.relatedGuides)
    ? doc.relatedGuides
        .map((ref: any) => String(ref?._ref || ref || '').replace(/^drafts\./, ''))
        .filter(Boolean)
    : Array.isArray(doc.relatedGuideIds)
    ? doc.relatedGuideIds
    : undefined;

  const { commerceProvider } = resolveDeterministicCommerceAndFulfillment(doc);

  const lifecycle = evaluateProductPublicationLifecycle(doc);
  const rawCanonicalPath =
    typeof doc.seo?.canonicalPath === 'string' && doc.seo.canonicalPath.trim()
      ? doc.seo.canonicalPath.trim()
      : `/products/${slug}/`;
  const normalizedCanonicalPath = rawCanonicalPath.endsWith('/')
    ? rawCanonicalPath
    : `${rawCanonicalPath}/`;

  const explicitNoindex =
    doc.seo?.noindex === true || doc.seo?.indexing === 'noindex,follow';
  const effectiveNoindex =
    explicitNoindex || !lifecycle.isIndexablePublicPage;

  return {
    id: canonicalId,
    slug,
    title,
    subtitle: String(doc.subtitle || '').trim(),
    status,
    vendor: String(doc.vendor || 'Science of Gifts Partner').trim(),
    price,
    currency: 'USD',
    budgetTier,
    guidePriceBucket,
    productType:
      normalizeProductCategory(doc.productType) ||
      String(doc.productType || 'Decor & Accents'),
    commerceProvider,
    purchaseUrl: String(doc.purchaseUrl || '').trim(),
    isPlaceholderLink: Boolean(doc.isPlaceholderLink),
    isSampleProduct: Boolean(doc.isSampleProduct),
    priceVerified: Boolean(doc.priceVerified && hasValidPositivePrice),
    inventoryVerified: Boolean(
      doc.inventoryVerified && typeof doc.inStock === 'boolean'
    ),
    inStock,
    ...(doc.calloutTag ? { calloutTag: String(doc.calloutTag).trim() } : {}),
    whyToGiveIt: String(doc.whyToGiveIt || '').trim(),
    detailsAndCare: String(doc.detailsAndCare || '').trim(),
    bestForSummary: String(doc.bestForSummary || '').trim(),
    recipients: (Array.isArray(doc.recipients)
      ? doc.recipients.filter((r: string) => VALID_RECIPIENTS.has(r))
      : ['friend']) as RecipientType[],
    interests: Array.isArray(doc.interests)
      ? doc.interests.map((i: unknown) => String(i || '').trim()).filter(Boolean)
      : [],
    ageRanges: (Array.isArray(doc.ageRanges)
      ? doc.ageRanges.filter((a: string) => VALID_AGE_RANGES.has(a))
      : ['adult']) as AgeRange[],
    occasions: (Array.isArray(doc.occasions)
      ? doc.occasions.filter((o: string) => VALID_OCCASIONS.has(o))
      : ['birthday']) as OccasionType[],
    personalityTraits: (Array.isArray(doc.personalityTraits)
      ? doc.personalityTraits.filter((p: string) => VALID_PERSONALITY_TRAITS.has(p))
      : ['everyday-ritual']) as PersonalityTrait[],
    images,
    citationIds,
    seo: {
      seoTitle:
        typeof doc.seo?.seoTitle === 'string' && doc.seo.seoTitle.trim()
          ? doc.seo.seoTitle.trim()
          : `${title} | Science of Gifts`,
      metaDescription:
        typeof doc.seo?.metaDescription === 'string' &&
        doc.seo.metaDescription.trim()
          ? doc.seo.metaDescription.trim()
          : String(doc.bestForSummary || doc.subtitle || title).trim(),
      canonicalPath: normalizedCanonicalPath,
      ogType: 'product',
      schemaType: 'Product',
      ...(doc.seo?.ogTitle ? { ogTitle: String(doc.seo.ogTitle).trim() } : {}),
      ...(doc.seo?.ogDescription
        ? { ogDescription: String(doc.seo.ogDescription).trim() }
        : {}),
      ...(doc.seo?.ogImage
        ? { ogImage: String(doc.seo.ogImage).trim() }
        : images[0]?.url
        ? { ogImage: images[0].url }
        : {}),
      noindex: effectiveNoindex,
      indexing: effectiveNoindex ? 'noindex,follow' : 'index,follow',
    },
    ...(giftVerdict ? { giftVerdict } : {}),
    ...(idealRecipientProfile ? { idealRecipientProfile } : {}),
    ...(extendedGiftRationale && extendedGiftRationale.length > 0
      ? { extendedGiftRationale }
      : {}),
    ...(buyingConsiderationsList && buyingConsiderationsList.length > 0
      ? { buyingConsiderationsList }
      : {}),
    ...(occasionContextNotes && occasionContextNotes.length > 0
      ? { occasionContextNotes }
      : {}),
    ...(specifications && specifications.length > 0 ? { specifications } : {}),
    ...(similarGiftComparisons && similarGiftComparisons.length > 0
      ? { similarGiftComparisons }
      : {}),
    fulfillmentClassification: mapSanityFulfillmentToAstro(
      doc.fulfillmentClassification,
      commerceProvider
    ),
    ...(doc.externalProductId
      ? { externalProductId: String(doc.externalProductId) }
      : {}),
    ...(doc.affiliateUrl ? { affiliateUrl: String(doc.affiliateUrl) } : {}),
    ...(doc.fourthwallUrl ? { fourthwallUrl: String(doc.fourthwallUrl) } : {}),
    ...(doc.availabilityNote
      ? { availabilityNote: String(doc.availabilityNote) }
      : {}),
    priceVerificationSource: mapSanityPriceVerificationSourceToAstro(
      doc.priceVerificationSource
    ),
    ...(doc.priceVerifiedAt
      ? { priceVerifiedAt: String(doc.priceVerifiedAt) }
      : {}),
    ...(doc.priceVerificationEvidenceNote
      ? {
          priceVerificationEvidenceNote: String(
            doc.priceVerificationEvidenceNote
          ),
        }
      : {}),
    inventoryVerificationSource: mapSanityInventoryVerificationSourceToAstro(
      doc.inventoryVerificationSource
    ),
    ...(doc.inventoryVerifiedAt
      ? { inventoryVerifiedAt: String(doc.inventoryVerifiedAt) }
      : {}),
    ...(typeof doc.editorialRating === 'number'
      ? { editorialRating: doc.editorialRating }
      : {}),
    ...(doc.testingNote ? { testingNote: String(doc.testingNote) } : {}),
    ...(relatedProductIds ? { relatedProductIds } : {}),
    ...(relatedGuideIds ? { relatedGuideIds } : {}),
    ...(typeof doc.editorialApproved === 'boolean'
      ? { editorialApproved: doc.editorialApproved }
      : {}),
  };
}
