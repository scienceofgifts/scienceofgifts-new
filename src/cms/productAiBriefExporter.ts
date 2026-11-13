import type { Product } from '../types/content';
import { CITATIONS, GIFT_GUIDES, PRODUCTS } from '../data/catalog';
import {
  ALLOWED_AGE_RANGE_VALUES,
  ALLOWED_BUDGET_TIER_VALUES,
  ALLOWED_COMMERCE_PROVIDER_VALUES,
  ALLOWED_FULFILLMENT_CLASSIFICATION_VALUES,
  ALLOWED_GUIDE_PRICE_BUCKET_VALUES,
  ALLOWED_INTEREST_VALUES,
  ALLOWED_OCCASION_VALUES,
  ALLOWED_PERSONALITY_VALUES,
  ALLOWED_PRODUCT_CATEGORY_VALUES,
  ALLOWED_RECIPIENT_VALUES,
  CLEARABLE_PRODUCT_REVISION_FIELDS,
  PRODUCT_FIELD_COVERAGE_MAP,
  PRODUCT_INTERCHANGE_FORMAT_ID,
  PRODUCT_INTERCHANGE_SCHEMA_VERSION,
  ProductInterchangeCreatePayloadV1,
  ProductInterchangeMode,
  ProductInterchangeRevisionPayloadV1,
  deriveBudgetTierFromPrice,
  deriveCanonicalProductIdFromSlug,
  deriveGuidePriceBucketFromPrice,
  mapExistingProductToInterchangeV1,
} from './productInterchangeSchema';
import {
  AGE_RANGE_OPTIONS,
  COMMERCE_PROVIDER_OPTIONS,
  GUIDE_PRICE_BUCKET_OPTIONS,
  INTEREST_OPTIONS,
  MERCHANDISE_TYPE_OPTIONS,
  OCCASION_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  PRODUCT_BUDGET_TIER_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  RECIPIENT_OPTIONS,
} from './studio/taxonomyRegistry';

export interface ProductAiBriefSourceInput {
  /**
   * Required starting point for new product brief generation (`mode: "create"`).
   * For revisions (`mode: "revision"`), defaults to the existing product's purchaseUrl if omitted.
   */
  productUrl: string;
  /** Export mode: `"create"` for a complete new product profile, `"revision"` for updating an existing product. */
  mode?: ProductInterchangeMode;
  /** Optional known product title hint provided by the editor. */
  knownTitle?: string;
  /** Optional known vendor / brand hint provided by the editor. */
  knownVendor?: string;
  /** Optional verified retail price in USD if already checked by the editor. */
  knownPrice?: number | null;
  /** Optional stock status if already checked by the editor. */
  knownInStock?: boolean | null;
  /** Optional commerce provider (`affiliate`, `fourthwall`, `digital`, `direct`). */
  commerceProvider?: 'affiliate' | 'fourthwall' | 'digital' | 'direct';
  /** Optional separate affiliate or Fourthwall purchase URL if distinct from the product source URL. */
  purchaseDestinationUrl?: string;
  /** Optional known image HTTPS URLs. */
  knownImageUrls?: string[];
  /**
   * Optional already-uploaded Sanity gallery images (from the Product Media Manager).
   * Included as editorial context in the brief without requiring the AI to reproduce
   * internal Sanity asset reference objects or invent image URLs.
   */
  uploadedImages?: Array<Record<string, any>>;
  /** Optional raw notes, pasted merchant description, or specifications provided by the editor. */
  additionalSourceNotes?: string;
  /** Optional revision instructions when `mode === "revision"`. */
  revisionGoals?: string;
  /**
   * Optional existing product record (from Sanity drafts or local catalog).
   * If omitted, the exporter automatically checks whether `productUrl` matches an existing product.
   */
  existingProduct?: Product | Record<string, any> | null;
}

export interface GeneratedProductAiBrief {
  mode: ProductInterchangeMode;
  productUrl: string;
  suggestedFilename: string;
  matchedExistingProduct: boolean;
  canonicalProductId: string | null;
  slugSuggestion: string;
  markdownBrief: string;
  templatePayload: ProductInterchangeCreatePayloadV1 | ProductInterchangeRevisionPayloadV1;
}

export function isPlaceholderUrlOrLink(url?: string | null, isPlaceholderFlag?: boolean): boolean {
  if (isPlaceholderFlag) return true;
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.includes('example.com') ||
    lower.includes('placeholder') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('your-affiliate-link') ||
    lower.includes('todo') ||
    lower.includes('merchant-domain.com')
  );
}

function normalizeUrlForComparison(rawUrl: string | undefined | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl.trim());
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${cleanPath}`;
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }
}

function deriveSlugSuggestionFromUrl(rawUrl: string, knownTitle?: string): string {
  if (knownTitle && knownTitle.trim().length >= 3) {
    const fromTitle = knownTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    if (fromTitle.length >= 3) return fromTitle;
  }
  try {
    const parsed = new URL(rawUrl.trim());
    const segments = parsed.pathname
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
    const lastSegment = segments[segments.length - 1] || parsed.hostname.split('.')[0] || 'gift-item';
    const cleaned = lastSegment
      .toLowerCase()
      .replace(/\.(html?|php|aspx?)$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return cleaned.length >= 3 ? cleaned : 'new-editorial-gift';
  } catch {
    return 'new-editorial-gift';
  }
}

/**
 * Looks up an existing product in the provided workspace documents or local `PRODUCTS` catalog
 * by URL, canonical product ID (`prod_<slug>`), or slug.
 */
export function findMatchingExistingProduct(
  query: {
    productUrl?: string;
    canonicalProductId?: string;
    slug?: string;
  },
  workspaceDocuments?: Array<Record<string, any>>
): Product | Record<string, any> | null {
  const targetUrl = normalizeUrlForComparison(query.productUrl);
  const targetId = query.canonicalProductId?.trim().replace(/^drafts\./, '');
  const targetSlug = query.slug?.trim().toLowerCase();

  const pool: Array<Product | Record<string, any>> = [
    ...(Array.isArray(workspaceDocuments)
      ? workspaceDocuments.filter((d) => d && d._type === 'product')
      : []),
    ...Object.values(PRODUCTS),
  ];

  for (const item of pool) {
    const rec = item as Record<string, any>;
    const itemId = (rec.productId || rec.id || rec._id || '').replace(/^drafts\./, '');
    const itemSlug =
      typeof rec.slug === 'string'
        ? rec.slug.toLowerCase()
        : typeof rec.slug?.current === 'string'
        ? rec.slug.current.toLowerCase()
        : '';
    const itemUrl = normalizeUrlForComparison(rec.purchaseUrl || rec.affiliateUrl || rec.fourthwallUrl);

    if (targetId && itemId && itemId === targetId) {
      return item;
    }
    if (targetSlug && itemSlug && itemSlug === targetSlug) {
      return item;
    }
    if (targetUrl && itemUrl && itemUrl === targetUrl) {
      return item;
    }
  }

  return null;
}

/**
 * Builds a complete, schema-valid example `ProductInterchangeCreatePayloadV1` or
 * `ProductInterchangeRevisionPayloadV1` tailored to the requested URL/product context.
 *
 * Notice: When mode is "revision", it produces ONLY valid revision fields and never includes
 * competing create payload dumps.
 */
export function buildBriefTemplatePayload(
  input: ProductAiBriefSourceInput,
  existingInterchange: ProductInterchangeCreatePayloadV1 | null
): ProductInterchangeCreatePayloadV1 | ProductInterchangeRevisionPayloadV1 {
  const mode: ProductInterchangeMode = input.mode || 'create';
  const cleanUrl = input.productUrl?.trim() || existingInterchange?.factualContext.sourceUrl || '';
  const validHttpsUrl = cleanUrl.startsWith('https://')
    ? cleanUrl
    : 'https://merchant-domain.com/products/item-slug';

  const slugSuggestion =
    existingInterchange?.identity.slug ||
    deriveSlugSuggestionFromUrl(validHttpsUrl, input.knownTitle);
  const canonicalId =
    existingInterchange?.targetProduct?.canonicalProductId ||
    deriveCanonicalProductIdFromSlug(slugSuggestion);

  if (mode === 'revision') {
    return {
      schemaVersion: PRODUCT_INTERCHANGE_SCHEMA_VERSION,
      format: PRODUCT_INTERCHANGE_FORMAT_ID,
      mode: 'revision',
      targetProduct: {
        canonicalProductId: canonicalId,
        slug: slugSuggestion,
        sourceUrl: validHttpsUrl,
      },
      revisionControl: {
        clearFields: [],
        allowOverwriteVerifiedFacts: false,
        revisionNotes:
          input.revisionGoals?.trim() ||
          'Summarize what editorial, taxonomy, or SEO fields were updated in this revision.',
      },
      editorialProfile: {
        whyToGiveIt:
          existingInterchange?.editorialProfile.whyToGiveIt ||
          'Provide updated primary editorial narrative (60-750 chars) only if revising this field; omit unchanged fields.',
        bestForSummary:
          existingInterchange?.editorialProfile.bestForSummary ||
          'Best for recipients who value thoughtful material craft and quiet daily rituals.',
        giftVerdict: {
          editorialAssessment:
            existingInterchange?.editorialProfile.giftVerdict.editorialAssessment ||
            '2-3 sentence assessment explaining why this piece succeeds as a gift.',
          standoutReason:
            existingInterchange?.editorialProfile.giftVerdict.standoutReason ||
            'What differentiates this object from ordinary alternatives in its category.',
          recipientDelight:
            existingInterchange?.editorialProfile.giftVerdict.recipientDelight ||
            'The tactile or emotional moment the recipient experiences when unboxing and using it.',
          importantCaveat:
            existingInterchange?.editorialProfile.giftVerdict.importantCaveat ??
            'Optional practical caveat or care consideration for the buyer.',
        },
      },
      taxonomy: {
        recipients: existingInterchange?.taxonomy.recipients || ['friend', 'partner'],
        occasions: existingInterchange?.taxonomy.occasions || ['birthday', 'housewarming'],
        interests: existingInterchange?.taxonomy.interests || ['Home Decor', 'Cozy Sanctuary'],
        personalityTraits: existingInterchange?.taxonomy.personalityTraits || [
          'everyday-ritual',
          'cozy-homebody',
        ],
        ageRanges: existingInterchange?.taxonomy.ageRanges || ['adult'],
      },
    };
  }

  const resolvedPrice =
    input.knownPrice !== undefined
      ? input.knownPrice
      : existingInterchange?.factualContext.price ?? null;
  const resolvedInStock =
    input.knownInStock !== undefined
      ? input.knownInStock
      : existingInterchange?.factualContext.inStock ?? null;
  const priceVerified = Boolean(
    typeof resolvedPrice === 'number' &&
      resolvedPrice > 0 &&
      (input.knownPrice !== undefined ||
        existingInterchange?.factualContext.priceVerification.verified)
  );
  const inventoryVerified = Boolean(
    typeof resolvedInStock === 'boolean' &&
      (input.knownInStock !== undefined ||
        existingInterchange?.factualContext.inventoryVerification.verified)
  );

  const uploadedOrExistingImages =
    input.uploadedImages && input.uploadedImages.length > 0
      ? input.uploadedImages
      : existingInterchange?.media.images && existingInterchange.media.images.length > 0
      ? existingInterchange.media.images
      : [];

  const templateImages =
    uploadedOrExistingImages.length > 0
      ? uploadedOrExistingImages.map((img: Record<string, any>, idx: number) => ({
          id:
            img.id ||
            img._key ||
            `img_${slugSuggestion.replace(/-/g, '_')}_${String(idx + 1).padStart(2, '0')}`,
          url:
            img.url ||
            img.externalUrl ||
            'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1600&q=85',
          alt:
            img.alt ||
            `${input.knownTitle?.trim() || slugSuggestion} product photograph ${idx + 1}`,
          ...(img.caption ? { caption: img.caption } : {}),
          fitMode: (img.fitMode === 'contain' ? 'contain' : 'cover') as 'cover' | 'contain',
          fallbackColor: img.fallbackColor || '#F6F4EF',
          focalPoint: img.focalPoint
            ? { x: Number(img.focalPoint.x ?? 0.5), y: Number(img.focalPoint.y ?? 0.5) }
            : { x: 0.5, y: 0.5 },
          width: Number(img.width) || 2400,
          height: Number(img.height) || 2400,
        }))
      : [
          {
            id: `img_${slugSuggestion.replace(/-/g, '_')}_01`,
            url:
              (input.knownImageUrls && input.knownImageUrls[0]) ||
              'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1600&q=85',
            alt: `${input.knownTitle?.trim() || slugSuggestion} product photograph`,
            fitMode: 'cover' as const,
            fallbackColor: '#F6F4EF',
            focalPoint: { x: 0.5, y: 0.5 },
            width: 2400,
            height: 2400,
          },
        ];

  return {
    schemaVersion: PRODUCT_INTERCHANGE_SCHEMA_VERSION,
    format: PRODUCT_INTERCHANGE_FORMAT_ID,
    mode: 'create',
    targetProduct: {
      canonicalProductId: canonicalId,
      slug: slugSuggestion,
      sourceUrl: validHttpsUrl,
    },
    factualContext: {
      sourceUrl: validHttpsUrl,
      vendor: input.knownVendor?.trim() || existingInterchange?.factualContext.vendor || 'Maker or Brand Name',
      price: resolvedPrice,
      currency: 'USD',
      inStock: resolvedInStock,
      availabilityNote: existingInterchange?.factualContext.availabilityNote ?? null,
      commerceProvider:
        input.commerceProvider || existingInterchange?.factualContext.commerceProvider || 'affiliate',
      fulfillmentClassification:
        existingInterchange?.factualContext.fulfillmentClassification || 'affiliate_redirect',
      externalProductId: existingInterchange?.factualContext.externalProductId ?? null,
      affiliateUrl:
        input.purchaseDestinationUrl?.trim() ||
        existingInterchange?.factualContext.affiliateUrl ||
        null,
      fourthwallUrl: existingInterchange?.factualContext.fourthwallUrl ?? null,
      priceVerification: {
        verified: priceVerified,
        source: priceVerified ? 'retailer_live_check' : 'unverified',
        verifiedAt: priceVerified ? new Date().toISOString() : null,
        evidenceNote: priceVerified
          ? 'Verified directly from the merchant product page.'
          : null,
      },
      inventoryVerification: {
        verified: inventoryVerified,
        source: inventoryVerified ? 'retailer_live_check' : 'unverified',
        verifiedAt: inventoryVerified ? new Date().toISOString() : null,
      },
      specifications:
        existingInterchange?.factualContext.specifications &&
        existingInterchange.factualContext.specifications.length > 0
          ? existingInterchange.factualContext.specifications
          : [
              {
                label: 'Materials',
                value: 'Verified material composition from merchant page (do not guess)',
              },
              {
                label: 'Dimensions / Capacity',
                value: 'Verified dimensions or capacity (or state "Dimensions not listed by maker")',
              },
              {
                label: 'Care',
                value: 'Verified care instructions from merchant page',
              },
            ],
    },
    identity: {
      title:
        input.knownTitle?.trim() ||
        existingInterchange?.identity.title ||
        'Concise Editorial Product Title',
      slug: slugSuggestion,
      subtitle:
        existingInterchange?.identity.subtitle ||
        'Concise material and functional subheadline (10-160 characters)',
      productType:
        existingInterchange?.identity.productType || 'Home & Textiles',
      merchandiseType:
        (existingInterchange?.identity as any)?.merchandiseType || 'Desk Accessory',
      calloutTag: existingInterchange?.identity.calloutTag ?? 'Heirloom Craft',
    },
    editorialProfile: {
      whyToGiveIt:
        existingInterchange?.editorialProfile.whyToGiveIt ||
        'Thoughtful 2-4 sentence editorial narrative (60-750 chars) explaining why this object makes a memorable gift, what everyday habit or setting it upgrades, and why it feels more considered than a generic alternative.',
      bestForSummary:
        existingInterchange?.editorialProfile.bestForSummary ||
        'Best for design-conscious hosts and slow-morning minimalists who value tactile everyday craft.',
      detailsAndCare:
        existingInterchange?.editorialProfile.detailsAndCare ||
        'Summarize verified physical craftsmanship, materials, included components, and practical care guidance (25-500 chars).',
      giftVerdict: {
        editorialAssessment:
          existingInterchange?.editorialProfile.giftVerdict.editorialAssessment ||
          '2-3 sentence editorial verdict (40-420 chars) capturing why this gift succeeds and who it serves best.',
        standoutReason:
          existingInterchange?.editorialProfile.giftVerdict.standoutReason ||
          'Specific material, design, or functional distinction that sets it apart (25-300 chars).',
        recipientDelight:
          existingInterchange?.editorialProfile.giftVerdict.recipientDelight ||
          'What the recipient notices and enjoys when unboxing and using the piece (25-300 chars).',
        importantCaveat:
          existingInterchange?.editorialProfile.giftVerdict.importantCaveat ??
          'Honest practical limitation, sizing nuance, or care requirement the buyer should know beforehand.',
      },
      idealRecipientProfile: {
        headline:
          existingInterchange?.editorialProfile.idealRecipientProfile.headline ||
          'The Tactile Homebody Who Notices Material Honesty',
        narrative:
          existingInterchange?.editorialProfile.idealRecipientProfile.narrative ||
          '2-3 sentence portrait (40-460 chars) of the recipient mindset, home environment, or daily rituals that make this gift resonate.',
        lifestyleNotes:
          existingInterchange?.editorialProfile.idealRecipientProfile.lifestyleNotes &&
          existingInterchange.editorialProfile.idealRecipientProfile.lifestyleNotes.length > 0
            ? existingInterchange.editorialProfile.idealRecipientProfile.lifestyleNotes
            : [
                'Appreciates natural materials that age gracefully with daily use',
                'Prefers fewer, better-made functional objects over decorative clutter',
              ],
        relationshipFit:
          existingInterchange?.editorialProfile.idealRecipientProfile.relationshipFit &&
          existingInterchange.editorialProfile.idealRecipientProfile.relationshipFit.length > 0
            ? existingInterchange.editorialProfile.idealRecipientProfile.relationshipFit
            : [
                'Partner or spouse birthday or anniversary',
                'Close friend housewarming or host thank-you gesture',
              ],
      },
      extendedGiftRationale:
        existingInterchange?.editorialProfile.extendedGiftRationale &&
        existingInterchange.editorialProfile.extendedGiftRationale.length > 0
          ? existingInterchange.editorialProfile.extendedGiftRationale
          : [
              'First extended paragraph (40-520 chars) exploring how this object fits into the recipient’s daily or seasonal routine.',
              'Second extended paragraph (40-520 chars) examining presentation, longevity, and why recipients rarely buy this upgrade for themselves.',
            ],
      buyingConsiderations:
        existingInterchange?.editorialProfile.buyingConsiderations &&
        existingInterchange.editorialProfile.buyingConsiderations.length > 0
          ? existingInterchange.editorialProfile.buyingConsiderations
          : [
              {
                label: 'Care & Maintenance',
                detail: 'Note any hand-washing, seasoning, or storage requirements that affect day-to-day convenience.',
              },
              {
                label: 'Space & Scale',
                detail: 'Explain countertop or shelf footprint so the buyer knows whether it suits compact apartments.',
              },
            ],
      occasionContextNotes:
        existingInterchange?.editorialProfile.occasionContextNotes &&
        existingInterchange.editorialProfile.occasionContextNotes.length > 0
          ? existingInterchange.editorialProfile.occasionContextNotes
          : [
              {
                occasion: 'housewarming',
                label: 'New Home Upgrade',
                note: 'Explain how to present or pair this gift for a housewarming celebration.',
              },
              {
                occasion: 'birthday',
                label: 'Personal Ritual Gift',
                note: 'Explain why this feels personal and celebratory for a birthday.',
              },
            ],
      editorialRating: existingInterchange?.editorialProfile.editorialRating ?? null,
      testingNote: existingInterchange?.editorialProfile.testingNote ?? null,
    },
    taxonomy: {
      recipients: existingInterchange?.taxonomy.recipients?.length
        ? existingInterchange.taxonomy.recipients
        : ['friend', 'partner', 'host'],
      occasions: existingInterchange?.taxonomy.occasions?.length
        ? existingInterchange.taxonomy.occasions
        : ['birthday', 'housewarming', 'holidays'],
      interests: existingInterchange?.taxonomy.interests?.length
        ? existingInterchange.taxonomy.interests
        : ['Home Decor', 'Cozy Sanctuary'],
      personalityTraits: existingInterchange?.taxonomy.personalityTraits?.length
        ? existingInterchange.taxonomy.personalityTraits
        : ['cozy-homebody', 'everyday-ritual'],
      ageRanges: existingInterchange?.taxonomy.ageRanges?.length
        ? existingInterchange.taxonomy.ageRanges
        : ['adult'],
      budgetTier:
        typeof resolvedPrice === 'number' && resolvedPrice > 0
          ? deriveBudgetTierFromPrice(resolvedPrice)
          : existingInterchange?.taxonomy.budgetTier ?? null,
      guidePriceBucket:
        typeof resolvedPrice === 'number' && resolvedPrice > 0
          ? deriveGuidePriceBucketFromPrice(resolvedPrice)
          : existingInterchange?.taxonomy.guidePriceBucket ?? null,
    },
    media: {
      images: templateImages,
    },
    relationships: {
      similarGiftComparisons: existingInterchange?.relationships?.similarGiftComparisons || [],
      citationIds: existingInterchange?.relationships?.citationIds || [],
      relatedProductIds: existingInterchange?.relationships?.relatedProductIds || [],
      relatedGuideIds: existingInterchange?.relationships?.relatedGuideIds || [],
    },
    seo: {
      seoTitle:
        existingInterchange?.seo.seoTitle ||
        `${input.knownTitle?.trim() || 'Product Name'} Review & Gift Guide | Science of Gifts`,
      metaDescription:
        existingInterchange?.seo.metaDescription ||
        'Thoughtful editorial gift evaluation exploring craftsmanship, recipient fit, and daily ritual value.',
      canonicalPath: `/products/${slugSuggestion}`,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      indexing: 'index,follow',
    },
  };
}

/**
 * Generates an authoritative, writer-first AI Editorial Writing Brief.
 *
 * Redesigned into 4 distinct, unambiguous sections:
 * 1. Product Source Facts & Unresolved Research (explicitly distinguishing verified facts,
 *    unverified catalog info, editorial interpretations, missing facts, and placeholder links)
 * 2. Editorial Writing Assignment (writer-first guidance, gifting psychology, relational signaling,
 *    avoiding clichés and fake testing claims)
 * 3. Classification & SEO Instructions (merchandise category, physical product form, rich subject tags)
 * 4. Exact JSON Output Requirements (ONLY ONE clean JSON code block tailored to create or revision mode)
 * Appendix: Technical constraints and catalog reference IDs.
 */
export function generateProductAiWritingBrief(
  input: ProductAiBriefSourceInput,
  workspaceDocuments?: Array<Record<string, any>>
): GeneratedProductAiBrief {
  const mode: ProductInterchangeMode = input.mode || 'create';
  const rawUrl = (input.productUrl || '').trim();

  // Check if an existing product was passed or matches in the catalog/workspace
  const matchedRecord =
    input.existingProduct ||
    findMatchingExistingProduct(
      {
        productUrl: rawUrl,
      },
      workspaceDocuments
    );

  const existingInterchange = matchedRecord
    ? mapExistingProductToInterchangeV1(matchedRecord)
    : null;

  const effectiveUrl =
    rawUrl ||
    existingInterchange?.factualContext.sourceUrl ||
    'https://merchant-domain.com/products/item-slug';

  const isPlaceholderLink = isPlaceholderUrlOrLink(
    effectiveUrl,
    Boolean(matchedRecord && (matchedRecord as any).isPlaceholderLink)
  );

  const isSampleProduct = Boolean(
    matchedRecord && (matchedRecord as any).isSampleProduct
  );

  const slugSuggestion =
    existingInterchange?.identity.slug ||
    deriveSlugSuggestionFromUrl(effectiveUrl, input.knownTitle);
  const canonicalProductId =
    existingInterchange?.targetProduct?.canonicalProductId ||
    deriveCanonicalProductIdFromSlug(slugSuggestion);

  const templatePayload = buildBriefTemplatePayload(
    {
      ...input,
      productUrl: effectiveUrl,
      mode,
    },
    existingInterchange
  );

  // Controlled vocabulary references
  const categoryTable = PRODUCT_CATEGORY_OPTIONS.map(
    (opt) => `- \`"${opt.value}"\` — ${opt.title}`
  ).join('\n');
  const merchandiseTypeTable = MERCHANDISE_TYPE_OPTIONS.map(
    (opt) => `- \`"${opt.value}"\` — ${opt.title}`
  ).join('\n');
  const recipientTable = RECIPIENT_OPTIONS.map(
    (opt) => `- \`"${opt.value}"\` — ${opt.title}`
  ).join('\n');
  const occasionTable = OCCASION_OPTIONS.map(
    (opt) => `- \`"${opt.value}"\` — ${opt.title}`
  ).join('\n');
  const interestTable = INTEREST_OPTIONS.map(
    (opt) => `- \`"${opt.value}"\` — ${opt.title}`
  ).join('\n');
  const personalityTable = PERSONALITY_TRAIT_OPTIONS.map(
    (opt) => `- \`"${opt.value}"\` — ${opt.title}`
  ).join('\n');
  const ageRangeTable = AGE_RANGE_OPTIONS.map(
    (opt) => `- \`"${opt.value}"\` — ${opt.title}`
  ).join('\n');
  const budgetTierTable = PRODUCT_BUDGET_TIER_OPTIONS.map(
    (opt) => `- \`"${opt.value}"\` — ${opt.title}`
  ).join('\n');
  const priceBucketTable = GUIDE_PRICE_BUCKET_OPTIONS.map(
    (opt) => `- \`"${opt.value}"\` — ${opt.title}`
  ).join('\n');
  const commerceProviderTable = COMMERCE_PROVIDER_OPTIONS.map(
    (opt) => `- \`"${opt.value}"\` — ${opt.title}`
  ).join('\n');

  // Reference catalog IDs for relationships
  const catalogProductSummaries = Object.values(PRODUCTS)
    .slice(0, 12)
    .map((p) => `- \`${p.id}\` — "${p.title}" ($${p.price}, ${p.productType})`)
    .join('\n');
  const catalogGuideSummaries = GIFT_GUIDES.slice(0, 8)
    .map((g) => `- \`${g.id}\` — "${g.title}"`)
    .join('\n');
  const catalogCitationSummaries = Object.values(CITATIONS)
    .slice(0, 8)
    .map((c) => `- \`${c.id}\` — ${c.authors} (${c.year}): "${c.title}"`)
    .join('\n');

  const fieldCoverageTableRows = PRODUCT_FIELD_COVERAGE_MAP.map(
    (entry) =>
      `| \`${entry.interchangePath}\` | ${entry.requiredInCreate ? 'Required' : 'Optional'} | ${
        entry.editorialOrFactual
      } | ${entry.notes} |`
  ).join('\n');

  // --- BUILD SECTION 1: Product Source Facts & Research Audit ---
  const sourceFactsLines: string[] = [];

  if (isPlaceholderLink) {
    sourceFactsLines.push(`> ⚠️ **IMPORTANT: PLACEHOLDER SOURCE URL DETECTED**
> The product URL provided (\`${effectiveUrl}\`) is an illustrative placeholder or mock link.
> **DO NOT** invent merchant specifications, retail prices, shipping policies, or customer ratings based on a mock link.
> An editor must supply a real, live HTTPS merchant product page before this profile can be approved for live publication.
`);
  }

  if (isSampleProduct) {
    sourceFactsLines.push(`> ℹ️ **SAMPLE CATALOG RECORD CONTEXT**
> This record originates from the local sample catalog fixture. Its factual merchant fields are illustrative and have not been independently verified against a live retailer.
`);
  }

  sourceFactsLines.push('#### A. Verified Source Facts');
  sourceFactsLines.push(`- **Merchant / Product URL**: \`${effectiveUrl}\``);
  if (input.purchaseDestinationUrl?.trim()) {
    sourceFactsLines.push(`- **Separate Purchase / Affiliate Link**: \`${input.purchaseDestinationUrl.trim()}\``);
  }
  if (input.knownVendor?.trim()) {
    sourceFactsLines.push(`- **Confirmed Maker / Brand**: ${input.knownVendor.trim()}`);
  }
  if (input.knownPrice !== undefined && input.knownPrice !== null) {
    sourceFactsLines.push(`- **Verified Retail Price (USD)**: $${input.knownPrice}`);
  }
  if (input.knownInStock !== undefined && input.knownInStock !== null) {
    sourceFactsLines.push(`- **Verified Stock Availability**: ${String(input.knownInStock)}`);
  }
  const activeGalleryImages =
    input.uploadedImages && input.uploadedImages.length > 0
      ? input.uploadedImages
      : existingInterchange?.media.images && existingInterchange.media.images.length > 0
      ? existingInterchange.media.images
      : [];

  if (activeGalleryImages.length > 0) {
    sourceFactsLines.push(
      `- **Uploaded Product Photography Gallery**: ${activeGalleryImages.length} photograph(s) already attached in Studio (preserved automatically on import — you do NOT need to reproduce internal Sanity asset references or invent image URLs; you may refine \`alt\` and \`caption\` text or leave \`media.images\` as provided)`
    );
    activeGalleryImages.forEach((img: Record<string, any>, idx: number) => {
      const roleLabel = idx === 0 ? 'Primary Hero' : `Gallery #${idx + 1}`;
      const dims = img.width && img.height ? ` (${img.width}×${img.height}px)` : '';
      sourceFactsLines.push(
        `  - [${roleLabel}] \`${img.id || `img_0${idx + 1}`}\`${dims} — Alt: "${img.alt || 'Pending alt text'}"${
          img.caption ? ` | Caption: "${img.caption}"` : ''
        }`
      );
    });
  } else if (input.knownImageUrls && input.knownImageUrls.length > 0) {
    sourceFactsLines.push(`- **Verified Image Assets Provided**: ${input.knownImageUrls.length} image URL(s)`);
    for (const url of input.knownImageUrls) {
      sourceFactsLines.push(`  - \`${url}\``);
    }
  }

  sourceFactsLines.push('\n#### B. Existing Unverified Catalog Information');
  if (existingInterchange) {
    sourceFactsLines.push(`- **Canonical Product ID**: \`${canonicalProductId}\` (immutable on revision)`);
    sourceFactsLines.push(`- **Canonical URL Slug**: \`${slugSuggestion}\``);
    sourceFactsLines.push(`- **Catalog Vendor**: ${existingInterchange.factualContext.vendor || 'Not set'}`);
    sourceFactsLines.push(
      `- **Catalog Price**: ${
        existingInterchange.factualContext.price !== null
          ? `$${existingInterchange.factualContext.price}`
          : 'None / Unknown'
      } (Verified: ${String(existingInterchange.factualContext.priceVerification.verified)})`
    );
    sourceFactsLines.push(
      `- **Catalog In-Stock**: ${
        existingInterchange.factualContext.inStock !== null
          ? String(existingInterchange.factualContext.inStock)
          : 'None / Unknown'
      } (Verified: ${String(existingInterchange.factualContext.inventoryVerification.verified)})`
    );
  } else {
    sourceFactsLines.push('- No prior record exists in the Science of Gifts catalog for this item.');
  }

  sourceFactsLines.push('\n#### C. Unresolved / Unknown Facts Requiring Research or Null Flags');
  if (input.knownPrice === undefined && (!existingInterchange || existingInterchange.factualContext.price === null)) {
    sourceFactsLines.push(
      '- **Retail Price**: Unknown. If you have live web browsing enabled, extract the exact USD retail price. If browsing is unavailable or price is unlisted, set `"price": null` with `"verified": false`.'
    );
  }
  if (input.knownInStock === undefined && (!existingInterchange || existingInterchange.factualContext.inStock === null)) {
    sourceFactsLines.push(
      '- **Inventory Status**: Unknown. If not verified via live browsing, set `"inStock": null` with `"verified": false`.'
    );
  }
  if (!input.knownImageUrls?.length && activeGalleryImages.length === 0) {
    sourceFactsLines.push(
      '- **Official Photography**: No assets supplied yet. If you can extract official merchant CDN image URLs, include them; otherwise return an empty array `[]` (the Studio draft will save without images until assets are attached).'
    );
  }

  if (input.additionalSourceNotes?.trim()) {
    sourceFactsLines.push(`\n#### D. Editor Notes & Raw Merchant Details\n${input.additionalSourceNotes.trim()}`);
  }

  if (input.revisionGoals?.trim()) {
    sourceFactsLines.push(`\n#### E. Requested Revision Objectives\n${input.revisionGoals.trim()}`);
  }

  // --- READ-ONLY SNAPSHOT FOR REVISION MODE (NO competing JSON block!) ---
  let readOnlyExistingContext = '';
  if (mode === 'revision' && existingInterchange) {
    readOnlyExistingContext = `
### Current Editorial Content in CMS (Read-Only Context)
> *The following existing content is provided for reference only so you know what is currently published. Do NOT return this as your output. Return only the revision JSON specified in Section 4.*

- **Current Title**: ${existingInterchange.identity.title}
- **Current Subtitle**: ${existingInterchange.identity.subtitle}
- **Current Category**: ${existingInterchange.identity.productType}
- **Current Why-To-Give-It**: ${existingInterchange.editorialProfile.whyToGiveIt}
- **Current Quick Verdict**: ${existingInterchange.editorialProfile.bestForSummary}
- **Current Gift Verdict Assessment**: ${existingInterchange.editorialProfile.giftVerdict.editorialAssessment}
- **Current Standout Reason**: ${existingInterchange.editorialProfile.giftVerdict.standoutReason}
- **Current Recipient Delight**: ${existingInterchange.editorialProfile.giftVerdict.recipientDelight}
- **Current Caveat**: ${existingInterchange.editorialProfile.giftVerdict.importantCaveat || 'None'}
- **Current Active Interests**: ${existingInterchange.taxonomy.interests.join(', ')}
- **Current Active Recipients**: ${existingInterchange.taxonomy.recipients.join(', ')}
- **Current Active Occasions**: ${existingInterchange.taxonomy.occasions.join(', ')}
`;
  }

  const markdownBrief = `# Science of Gifts — AI Editorial Writing Brief
**Document Version:** Canonical Product Interchange Schema v${PRODUCT_INTERCHANGE_SCHEMA_VERSION}  
**Format Identifier:** \`${PRODUCT_INTERCHANGE_FORMAT_ID}\`  
**Execution Mode:** \`${mode}\` (${mode === 'revision' ? 'Updating targeted fields on an existing product' : 'Creating a complete new editorial product profile'})

You are writing a publication-grade editorial product profile for **Science of Gifts**, a research-grounded gift recommendation publication.

Your output will be imported into our editorial studio in **a single copy-paste operation**.
Return **EXACTLY ONE valid JSON object** matching the required schema.

---

## 1. Product Source Facts & Research Audit

${sourceFactsLines.join('\n')}
${readOnlyExistingContext}
### Strict Factual Grounding Discipline
1. **Never Fabricate Merchant Facts**: If browsing is enabled, verify specifications, price, materials, and maker claims from the merchant URL. If browsing is disabled or a fact is not stated on the merchant page, leave the property as \`null\` (or omit it if optional).
2. **Never Invent Ratings, Testing, or Awards**: Do not fabricate lab testing results, award certifications, star ratings, or customer quotes.
3. **Draft vs. Live Publication**: Our CMS allows saving incomplete drafts with missing prices (\`null\`) or empty image arrays (\`[]\`), but strictly prevents public catalog publication until human editors verify every fact and attach verified assets.

---

## 2. Editorial Writing Assignment (Writer-First Guidance)

Write nuanced, intelligent, human-sounding editorial prose designed for discerning gift givers.

### Core Editorial Pillars
1. **The Central Concept & Material Honesty**:
   - What makes this object interesting, beautiful, or useful?
   - Focus on material integrity, sensory appeal, tactile weight, or design intent.
2. **The Gifting Rationale & Relational Psychology**:
   - Why would someone give this instead of letting the recipient buy it for themselves?
   - What does giving this object communicate about the relationship? (e.g. "I pay attention to your morning routine", "I celebrate your fascination with Roman history").
3. **Nuanced Recipient Persona**:
   - Paint a vivid picture of the recipient mindset, home environment, or daily rituals in \`idealRecipientProfile\`.
   - Specify who this gift delights and who it will fail with.
4. **Honest Limitations & Distinctive Caveats**:
   - Every authentic recommendation has boundaries. Provide an honest caveat in \`giftVerdict.importantCaveat\` (e.g. hand-wash requirements, oversized countertop footprint, specific sizing, or niche humor).
5. **Practical Buying Considerations**:
   - Provide 1 to 6 concrete buying notes (materials care, lead times, space compatibility) in \`buyingConsiderations\`.
6. **Voice & Anti-Cliché Standards**:
   - **Banned Clichés**: Never use "the perfect gift for anyone", "must-have", "game-changer", "elevate your lifestyle", "look no further", or "curated perfection".
   - **No Fake Testing**: Do not claim "we tested this in our studio kitchen" unless an actual testing protocol was conducted.
   - **Clean Title Discipline**: \`identity.title\` should be the clean, elegant editorial product name (e.g. "Kyoto Hinoki Tea Caddy"). Do NOT force the word "Review" into the visible title if this is a recommendation or curated piece. Use \`seo.seoTitle\` for search engine keywords.

---

## 3. Classification & SEO Instructions

Our classification system operates on two distinct, complementary axes:

### Axis 1: Merchandise Category & Physical Form
- **Merchandise Category (\`identity.productType\` — exactly 1)**:
${categoryTable}
- **Physical Merchandise Form (\`identity.merchandiseType\` — choose from standard options or describe cleanly)**:
${merchandiseTypeTable}

*Example Classification*:
- A Roman History Mug is categorized as:
  - \`identity.productType\`: \`"Drinkware & Mugs"\`
  - \`identity.merchandiseType\`: \`"Ceramic Mug"\`
  - \`taxonomy.interests\`: \`["History & Antiquity", "Coffee & Tea"]\`
- A Psychology Pullover Hoodie is categorized as:
  - \`identity.productType\`: \`"Apparel & Wearables"\`
  - \`identity.merchandiseType\`: \`"Hoodie"\`
  - \`taxonomy.interests\`: \`["Psychology & Human Behavior"]\`

### Axis 2: Rich Subject & Controlled Interests (\`taxonomy.interests\` — 1 to 6 tags)
Choose 1 to 6 canonical tags strictly from the controlled vocabulary below:
${interestTable}

> **Tip for Unmapped Tags**: If the product has a very specific niche tag not listed above (e.g. "Stoicism", "Neuroscience", "Espresso"), place it in \`taxonomy.suggestedUnmappedTags\` (array of strings). Our CMS will safely quarantine it for human editorial review without breaking canonical categorization.

### Controlled Taxonomy Tables
- **Recipients (\`taxonomy.recipients\` — 1 to 4 tags)**:
${recipientTable}
- **Occasions (\`taxonomy.occasions\` — 1 to 5 tags)**:
${occasionTable}
- **Personality Traits (\`taxonomy.personalityTraits\` — 1 to 3 tags)**:
${personalityTable}
- **Age Ranges (\`taxonomy.ageRanges\` — 1 to 4 tags)**:
${ageRangeTable}
- **Budget Tier (\`taxonomy.budgetTier\`)**:
${budgetTierTable}
- **Price Bucket (\`taxonomy.guidePriceBucket\`)**:
${priceBucketTable}

### SEO & Routing
- \`seo.seoTitle\` (15–65 chars): Search-engine title.
- \`seo.metaDescription\` (50–160 chars): Compelling meta snippet.
- \`seo.canonicalPath\`: Must be \`/products/${slugSuggestion}\`.
- \`seo.indexing\`: \`"index,follow"\` (or \`"noindex,follow"\` if draft).

---

## 4. Exact JSON Output Requirements

${
  mode === 'revision'
    ? `### Revision Mode Instructions
- Return **ONLY ONE valid JSON object** with \`"mode": "revision"\`.
- You MUST preserve \`"targetProduct": { "canonicalProductId": "${canonicalProductId}", "slug": "${slugSuggestion}" }\`.
- Include ONLY the fields you intend to update. Any field omitted will be preserved untouched in the CMS.
- If you intend to clear an optional field, list it in \`"revisionControl": { "clearFields": [...] }\`.
- Do NOT include full create payload structures or conversational chat text.`
    : `### Create Mode Instructions
- Return **ONLY ONE valid JSON object** with \`"mode": "create"\`.
- Populate all required fields according to the schema template below.
- Do NOT include conversational preamble or markdown commentary outside the JSON block.`
}

Return your entire response as a single JSON object conforming to the template below:

\`\`\`json
${JSON.stringify(templatePayload, null, 2)}
\`\`\`

---

## Appendix: Technical Field Reference & Canonical IDs

### Controlled Reference Identifiers (For \`relationships\`)
- **Canonical Catalog Products (\`relationships.relatedProductIds\` & \`similarGiftComparisons\` — never self-reference)**:
${catalogProductSummaries}
- **Canonical Gift Guides (\`relationships.relatedGuideIds\`)**:
${catalogGuideSummaries}
- **Canonical Research Citations (\`relationships.citationIds\`)**:
${catalogCitationSummaries}

### Field Constraint Map
| Path | Create | Type | Notes |
| :--- | :--- | :--- | :--- |
${fieldCoverageTableRows}
`;

  const suggestedFilename = `science-of-gifts-ai-brief-${slugSuggestion}-${mode}.md`;

  return {
    mode,
    productUrl: effectiveUrl,
    suggestedFilename,
    matchedExistingProduct: Boolean(matchedRecord),
    canonicalProductId: matchedRecord ? canonicalProductId : null,
    slugSuggestion,
    markdownBrief,
    templatePayload,
  };
}
