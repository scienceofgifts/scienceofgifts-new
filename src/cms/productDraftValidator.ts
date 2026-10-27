import {
  AgeRange,
  CommerceProvider,
  OccasionType,
  PersonalityTrait,
  Product,
  RecipientType,
} from '../types/content';

export type FieldProvenanceStatus =
  | 'verified_deterministic'
  | 'ai_suggested_needs_review'
  | 'missing_requires_manual_entry'
  | 'invalid_ai_output_rejected'
  | 'editor_confirmed';

export interface ScrapedProductMetadata {
  ogTitle?: string;
  ogSiteName?: string;
  ogDescription?: string;
  ogImage?: string;
  jsonLdPrice?: number;
  jsonLdCurrency?: 'USD';
  jsonLdAvailability?: 'InStock' | 'OutOfStock';
  rawMaterialsText?: string;
}

export interface ProductExtractionSourceInput {
  sourceUrl: string;
  imageUrl?: string;
  /** Deterministic metadata parsed from HTML <meta> OpenGraph or Schema.org Product JSON-LD */
  scrapedMetadata?: ScrapedProductMetadata;
}

export interface ProductDraftFieldProvenance {
  title: FieldProvenanceStatus;
  price: FieldProvenanceStatus;
  vendor: FieldProvenanceStatus;
  purchaseUrl: FieldProvenanceStatus;
  taxonomy: FieldProvenanceStatus;
  editorialCopy: FieldProvenanceStatus;
  imageAlt: FieldProvenanceStatus;
}

export interface AIProductDraftSuggestion {
  draftId: string;
  productId: string;
  slug: string;
  title: string;
  subtitle: string;
  vendor: string;
  price: number | null;
  priceVerified: boolean;
  currency: 'USD';
  budgetTier: 'under-50' | '50-to-100' | '100-plus' | null;
  guidePriceBucket: 'under-25' | '25-to-75' | 'over-75' | null;
  productType: string;
  commerceProvider: CommerceProvider;
  purchaseUrl: string;
  inStock: boolean | null;
  whyToGiveIt: string;
  detailsAndCare: string;
  bestForSummary: string;
  recipients: RecipientType[];
  interests: string[];
  ageRanges: AgeRange[];
  occasions: OccasionType[];
  personalityTraits: PersonalityTrait[];
  imageUrl: string;
  imageAlt: string;
  provenance: ProductDraftFieldProvenance;
  reviewWarnings: string[];
  humanReviewed: boolean;
}

export interface ProductDraftValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  canonicalProduct?: Product;
}

const VALID_RECIPIENTS = new Set<RecipientType>([
  'partner',
  'parent',
  'friend',
  'host',
  'kids',
  'coworker',
]);

const VALID_OCCASIONS = new Set<OccasionType>([
  'birthday',
  'housewarming',
  'anniversary',
  'thank-you',
  'holidays',
  'just-because',
]);

const VALID_AGE_RANGES = new Set<AgeRange>([
  'kids',
  'young-adult',
  'adult',
  'parents-grandparents',
  'all-ages',
]);

const VALID_PERSONALITY_TRAITS = new Set<PersonalityTrait>([
  'foodie-host',
  'cozy-homebody',
  'curious-creative',
  'outdoors-nature',
  'nostalgic-sentimental',
  'everyday-ritual',
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function inferBudgetTiers(price: number | null): {
  budgetTier: 'under-50' | '50-to-100' | '100-plus' | null;
  guidePriceBucket: 'under-25' | '25-to-75' | 'over-75' | null;
} {
  if (price === null || Number.isNaN(price) || price <= 0) {
    return { budgetTier: null, guidePriceBucket: null };
  }
  const budgetTier =
    price < 50 ? 'under-50' : price <= 100 ? '50-to-100' : '100-plus';
  const guidePriceBucket =
    price < 25 ? 'under-25' : price <= 75 ? '25-to-75' : 'over-75';
  return { budgetTier, guidePriceBucket };
}

/**
 * Validates that a merchant product URL is a well-formed HTTPS URL.
 */
export function validateMerchantSourceUrl(rawUrl: string): {
  valid: boolean;
  normalizedUrl?: string;
  hostname?: string;
  error?: string;
} {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Merchant URL is empty.' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: `Merchant URL must use https:// protocol (received "${parsed.protocol}").`,
      };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return {
        valid: false,
        error: `Merchant URL hostname "${parsed.hostname}" is invalid.`,
      };
    }
    return {
      valid: true,
      normalizedUrl: parsed.toString(),
      hostname: parsed.hostname.replace(/^www\./, ''),
    };
  } catch {
    return {
      valid: false,
      error: `Malformed merchant URL: "${trimmed}".`,
    };
  }
}

/**
 * Deterministically extracts OpenGraph `<meta>` tags and Schema.org `Product` JSON-LD
 * from raw merchant HTML. Never guesses prices from unstructured body text.
 */
export function extractDeterministicMetadataFromHtml(
  html: string
): ScrapedProductMetadata {
  const result: ScrapedProductMetadata = {};

  const getMetaContent = (propOrName: string): string | undefined => {
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${propOrName}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propOrName}["'][^>]*>`,
      'i'
    );
    const match = html.match(regex);
    const val = match?.[1] ?? match?.[2];
    return val ? val.trim() : undefined;
  };

  result.ogTitle = getMetaContent('og:title');
  result.ogSiteName = getMetaContent('og:site_name');
  result.ogDescription =
    getMetaContent('og:description') ?? getMetaContent('description');
  result.ogImage = getMetaContent('og:image');

  // Parse all <script type="application/ld+json"> blocks for Schema.org Product
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawJson = match[1].trim();
    if (!rawJson) continue;
    try {
      const parsed = JSON.parse(rawJson);
      const candidates: Record<string, unknown>[] = [];
      if (Array.isArray(parsed)) {
        candidates.push(...(parsed as Record<string, unknown>[]));
      } else if (parsed && typeof parsed === 'object') {
        candidates.push(parsed as Record<string, unknown>);
        if (Array.isArray((parsed as Record<string, unknown>)['@graph'])) {
          candidates.push(
            ...((parsed as Record<string, unknown>)['@graph'] as Record<
              string,
              unknown
            >[])
          );
        }
      }

      for (const node of candidates) {
        const nodeType = node['@type'];
        const isProduct =
          nodeType === 'Product' ||
          (Array.isArray(nodeType) && nodeType.includes('Product'));
        if (!isProduct) continue;

        if (typeof node.name === 'string' && !result.ogTitle) {
          result.ogTitle = node.name.trim();
        }
        if (typeof node.description === 'string' && !result.ogDescription) {
          result.ogDescription = node.description.trim();
        }
        if (
          node.brand &&
          typeof node.brand === 'object' &&
          typeof (node.brand as Record<string, unknown>).name === 'string' &&
          !result.ogSiteName
        ) {
          result.ogSiteName = (
            (node.brand as Record<string, unknown>).name as string
          ).trim();
        }

        const rawOffers = node.offers;
        const offerObj = Array.isArray(rawOffers)
          ? (rawOffers[0] as Record<string, unknown> | undefined)
          : (rawOffers as Record<string, unknown> | undefined);

        if (offerObj && typeof offerObj === 'object') {
          const rawPrice = offerObj.price ?? offerObj.lowPrice;
          const numericPrice =
            typeof rawPrice === 'number'
              ? rawPrice
              : typeof rawPrice === 'string' && rawPrice.trim() !== ''
              ? Number(rawPrice)
              : NaN;

          if (!Number.isNaN(numericPrice) && numericPrice > 0) {
            result.jsonLdPrice = numericPrice;
            result.jsonLdCurrency = 'USD';
          }

          if (typeof offerObj.availability === 'string') {
            if (offerObj.availability.includes('InStock')) {
              result.jsonLdAvailability = 'InStock';
            } else if (offerObj.availability.includes('OutOfStock')) {
              result.jsonLdAvailability = 'OutOfStock';
            }
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks; fall back to remaining deterministic tags
    }
  }

  return result;
}

/**
 * Simulates the explicit editor-triggered Sanity Document Action pipeline:
 * 1. Parses deterministic URL / JSON-LD / OpenGraph fields (never fabricates price or stock if absent).
 * 2. Suggests structured taxonomy & editorial draft fields with explicit provenance flags.
 * 3. Flags any unverified or AI-suggested fields for mandatory human review before publishing.
 */
export function buildSuggestedProductDraftFromInput(
  input: ProductExtractionSourceInput
): AIProductDraftSuggestion {
  const cleanUrl = input.sourceUrl.trim();
  const urlCheck = validateMerchantSourceUrl(cleanUrl);
  const hostname = urlCheck.hostname ?? 'Independent Maker';

  const meta = input.scrapedMetadata ?? {};
  const hasVerifiedPrice =
    typeof meta.jsonLdPrice === 'number' &&
    !Number.isNaN(meta.jsonLdPrice) &&
    meta.jsonLdPrice > 0;
  const price = hasVerifiedPrice ? meta.jsonLdPrice! : null;
  const { budgetTier, guidePriceBucket } = inferBudgetTiers(price);

  const rawTitle =
    meta.ogTitle?.trim() || 'Hand-Thrown Speckled Stoneware Mug & Warmer';
  const slug = slugify(rawTitle);
  const vendor = meta.ogSiteName?.trim() || hostname;
  const imageUrl =
    input.imageUrl?.trim() ||
    meta.ogImage?.trim() ||
    'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80';

  const reviewWarnings: string[] = [];
  if (!urlCheck.valid && urlCheck.error) {
    reviewWarnings.push(urlCheck.error);
  }
  if (!hasVerifiedPrice) {
    reviewWarnings.push(
      'Price was not found in deterministic Schema.org Offer JSON-LD. Editor must enter and verify the retail price manually (AI never guesses prices).'
    );
  }
  if (!meta.jsonLdAvailability) {
    reviewWarnings.push(
      'Stock availability was not present in structured page metadata. Confirm merchant stock status before publishing.'
    );
  }
  reviewWarnings.push(
    'AI-suggested taxonomy (recipients, occasions, personality traits) and editorial draft copy require editor review before publishing.'
  );

  return {
    draftId: `draft_prod_${slug.replace(/-/g, '_').slice(0, 28)}`,
    productId: `prod_${slug.replace(/-/g, '_').slice(0, 28)}`,
    slug,
    title: rawTitle,
    subtitle:
      meta.ogDescription?.slice(0, 120) ||
      'Tactile small-batch stoneware designed to keep morning coffee or tea warm at the desk.',
    vendor,
    price,
    priceVerified: hasVerifiedPrice,
    currency: meta.jsonLdCurrency ?? 'USD',
    budgetTier,
    guidePriceBucket,
    productType: 'Tea & Coffee Rituals',
    commerceProvider: hostname.includes('fourthwall') ? 'fourthwall' : 'affiliate',
    purchaseUrl: cleanUrl,
    inStock:
      meta.jsonLdAvailability === 'InStock'
        ? true
        : meta.jsonLdAvailability === 'OutOfStock'
        ? false
        : null,
    whyToGiveIt:
      'Elevates a daily morning coffee or afternoon tea habit with warm, tactile stoneware craft—turning an ordinary desk mug into a quiet ritual.',
    detailsAndCare:
      meta.rawMaterialsText ||
      'Wheel-thrown stoneware with lead-free satin glaze. Dishwasher and microwave safe.',
    bestForSummary:
      'Remote workers, tea and coffee lovers, and friends who appreciate quiet daily rituals.',
    recipients: ['friend', 'partner', 'coworker'],
    interests: ['Tea & Coffee', 'Ceramics', 'Home Office'],
    ageRanges: ['adult', 'all-ages'],
    occasions: ['birthday', 'thank-you', 'holidays'],
    personalityTraits: ['everyday-ritual', 'cozy-homebody'],
    imageUrl,
    imageAlt: `${rawTitle} by ${vendor} photographed on a warm wooden surface`,
    provenance: {
      title: meta.ogTitle ? 'verified_deterministic' : 'ai_suggested_needs_review',
      price: hasVerifiedPrice
        ? 'verified_deterministic'
        : 'missing_requires_manual_entry',
      vendor: meta.ogSiteName
        ? 'verified_deterministic'
        : 'ai_suggested_needs_review',
      purchaseUrl: urlCheck.valid
        ? 'verified_deterministic'
        : 'missing_requires_manual_entry',
      taxonomy: 'ai_suggested_needs_review',
      editorialCopy: 'ai_suggested_needs_review',
      imageAlt: 'ai_suggested_needs_review',
    },
    reviewWarnings,
    humanReviewed: false,
  };
}

/**
 * Sanitizes and merges an untrusted AI JSON response onto a deterministic product draft.
 *
 * Security & Integrity invariants:
 * - NEVER allows the AI response to set or overwrite `price`, `priceVerified`, `inStock`, or `purchaseUrl`.
 * - Validates taxonomy arrays against controlled vocabularies (`RecipientType`, `OccasionType`, `AgeRange`, `PersonalityTrait`).
 * - Flags missing or invalid AI fields so `validateProductDraftForPublish` blocks publication until corrected by a human editor.
 */
export function applyUntrustedAiSuggestionsToDraft(
  baseDraft: AIProductDraftSuggestion,
  untrustedAiPayload: Record<string, unknown>
): AIProductDraftSuggestion {
  const updated: AIProductDraftSuggestion = structuredClone(baseDraft);
  updated.humanReviewed = false;

  // 1. Explicitly reject any AI attempt to hallucinate price or availability
  if ('price' in untrustedAiPayload || 'inStock' in untrustedAiPayload) {
    updated.reviewWarnings.push(
      'Security Guard: Ignored AI-supplied price/availability values. Price and stock status must come exclusively from deterministic Schema.org metadata or manual editor entry.'
    );
  }

  // 2. Validate editorial copy fields
  if ('whyToGiveIt' in untrustedAiPayload) {
    const val =
      typeof untrustedAiPayload.whyToGiveIt === 'string'
        ? untrustedAiPayload.whyToGiveIt.trim()
        : '';
    updated.whyToGiveIt = val;
    if (val.length < 20) {
      updated.provenance.editorialCopy = 'invalid_ai_output_rejected';
      updated.reviewWarnings.push(
        'AI response contained missing or too-short "whyToGiveIt" copy (minimum 20 characters required).'
      );
    }
  }

  if ('bestForSummary' in untrustedAiPayload) {
    const val =
      typeof untrustedAiPayload.bestForSummary === 'string'
        ? untrustedAiPayload.bestForSummary.trim()
        : '';
    updated.bestForSummary = val;
    if (!val) {
      updated.provenance.editorialCopy = 'invalid_ai_output_rejected';
      updated.reviewWarnings.push(
        'AI response contained an empty "bestForSummary" field.'
      );
    }
  }

  if ('imageAlt' in untrustedAiPayload) {
    const val =
      typeof untrustedAiPayload.imageAlt === 'string'
        ? untrustedAiPayload.imageAlt.trim()
        : '';
    updated.imageAlt = val;
    if (val.length < 10) {
      updated.provenance.imageAlt = 'invalid_ai_output_rejected';
      updated.reviewWarnings.push(
        'AI response provided missing or invalid image alt text (minimum 10 characters required).'
      );
    }
  }

  // 3. Validate controlled taxonomy arrays
  if ('recipients' in untrustedAiPayload) {
    const raw = Array.isArray(untrustedAiPayload.recipients)
      ? untrustedAiPayload.recipients
      : [];
    const valid = raw.filter(
      (r): r is RecipientType =>
        typeof r === 'string' && VALID_RECIPIENTS.has(r as RecipientType)
    );
    updated.recipients = valid;
    if (valid.length === 0 || valid.length !== raw.length) {
      updated.provenance.taxonomy = 'invalid_ai_output_rejected';
      updated.reviewWarnings.push(
        'AI response contained invalid or empty recipient tags outside the controlled taxonomy.'
      );
    }
  }

  if ('occasions' in untrustedAiPayload) {
    const raw = Array.isArray(untrustedAiPayload.occasions)
      ? untrustedAiPayload.occasions
      : [];
    const valid = raw.filter(
      (o): o is OccasionType =>
        typeof o === 'string' && VALID_OCCASIONS.has(o as OccasionType)
    );
    updated.occasions = valid;
    if (valid.length === 0 || valid.length !== raw.length) {
      updated.provenance.taxonomy = 'invalid_ai_output_rejected';
      updated.reviewWarnings.push(
        'AI response contained invalid or empty occasion tags outside the controlled taxonomy.'
      );
    }
  }

  if ('ageRanges' in untrustedAiPayload) {
    const raw = Array.isArray(untrustedAiPayload.ageRanges)
      ? untrustedAiPayload.ageRanges
      : [];
    const valid = raw.filter(
      (a): a is AgeRange =>
        typeof a === 'string' && VALID_AGE_RANGES.has(a as AgeRange)
    );
    updated.ageRanges = valid;
  }

  if ('personalityTraits' in untrustedAiPayload) {
    const raw = Array.isArray(untrustedAiPayload.personalityTraits)
      ? untrustedAiPayload.personalityTraits
      : [];
    const valid = raw.filter(
      (t): t is PersonalityTrait =>
        typeof t === 'string' && VALID_PERSONALITY_TRAITS.has(t as PersonalityTrait)
    );
    updated.personalityTraits = valid;
    if (valid.length === 0 || valid.length !== raw.length) {
      updated.provenance.taxonomy = 'invalid_ai_output_rejected';
      updated.reviewWarnings.push(
        'AI response contained invalid or empty personality trait tags.'
      );
    }
  }

  return updated;
}

export interface SafeProductImportRequest {
  sourceUrl: string;
  imageUrl?: string;
  /** Simulated or fetched HTTP response from the merchant product page */
  merchantFetchResult?: {
    httpStatus: number;
    ok: boolean;
    errorMessage?: string;
    rawHtml?: string;
  };
  scrapedMetadata?: ScrapedProductMetadata;
  untrustedAiResponse?: Record<string, unknown>;
}

export interface SafeProductImportResult {
  status: 'draft_created' | 'failed';
  errorCode?:
    | 'MALFORMED_URL'
    | 'MERCHANT_REQUEST_FAILED'
    | 'EMPTY_MERCHANT_RESPONSE';
  errorMessage?: string;
  draft?: AIProductDraftSuggestion;
  publishValidation?: ProductDraftValidationResult;
}

/**
 * End-to-end deterministic product import pipeline handling URL validation,
 * merchant HTTP failures/blocks, deterministic HTML JSON-LD/OpenGraph extraction,
 * untrusted AI suggestion sanitization, and pre-publish validation.
 */
export function runSafeProductImportPipeline(
  request: SafeProductImportRequest
): SafeProductImportResult {
  // 1. Validate URL first
  const urlValidation = validateMerchantSourceUrl(request.sourceUrl);
  if (!urlValidation.valid) {
    return {
      status: 'failed',
      errorCode: 'MALFORMED_URL',
      errorMessage: urlValidation.error,
    };
  }

  // 2. Check merchant HTTP response if provided
  if (request.merchantFetchResult) {
    const { ok, httpStatus, errorMessage } = request.merchantFetchResult;
    if (!ok || httpStatus < 200 || httpStatus >= 300) {
      return {
        status: 'failed',
        errorCode: 'MERCHANT_REQUEST_FAILED',
        errorMessage:
          errorMessage ||
          `Merchant request failed or was blocked with HTTP ${httpStatus}. Cannot fabricate product metadata.`,
      };
    }
  }

  // 3. Extract deterministic metadata from HTML if rawHtml is provided
  const metadataFromHtml = request.merchantFetchResult?.rawHtml
    ? extractDeterministicMetadataFromHtml(request.merchantFetchResult.rawHtml)
    : undefined;

  const mergedMetadata: ScrapedProductMetadata = {
    ...metadataFromHtml,
    ...request.scrapedMetadata,
  };

  // 4. Build initial draft strictly from deterministic metadata + defaults
  let draft = buildSuggestedProductDraftFromInput({
    sourceUrl: urlValidation.normalizedUrl!,
    imageUrl: request.imageUrl,
    scrapedMetadata: mergedMetadata,
  });

  // 5. If an AI suggestion payload is provided, sanitize and merge it without allowing price/stock overrides
  if (request.untrustedAiResponse) {
    draft = applyUntrustedAiSuggestionsToDraft(
      draft,
      request.untrustedAiResponse
    );
  }

  // 6. Run publish validator (which will block until humanReviewed === true and all required fields are valid)
  const publishValidation = validateProductDraftForPublish(draft);

  return {
    status: 'draft_created',
    draft,
    publishValidation,
  };
}

/**
 * Validates an AI-assisted product draft before allowing publication into a canonical Product record.
 * Prevents unreviewed AI suggestions, missing prices, invalid URLs, or missing alt text from being published.
 */
export function validateProductDraftForPublish(
  draft: AIProductDraftSuggestion
): ProductDraftValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [...draft.reviewWarnings];

  if (!draft.productId.match(/^prod_[a-z0-9_]+$/)) {
    errors.push('Product ID must follow the canonical "prod_<slug>" format.');
  }
  if (!draft.title.trim() || draft.title.trim().length < 3) {
    errors.push('Product title is required (minimum 3 characters).');
  }
  if (!draft.slug.trim()) {
    errors.push('Product URL slug is required.');
  }
  if (!draft.vendor.trim()) {
    errors.push('Merchant / vendor name is required.');
  }
  const urlCheck = validateMerchantSourceUrl(draft.purchaseUrl);
  if (!urlCheck.valid) {
    errors.push(
      urlCheck.error || 'Purchase URL must be a valid https:// merchant URL.'
    );
  }
  if (
    draft.price === null ||
    typeof draft.price !== 'number' ||
    Number.isNaN(draft.price) ||
    draft.price <= 0 ||
    !draft.priceVerified
  ) {
    errors.push(
      'A verified positive retail price is required before publishing (unverified or missing prices cannot be published).'
    );
  }
  if (draft.inStock === null) {
    errors.push('Stock availability (inStock) must be explicitly confirmed.');
  }
  if (!draft.imageAlt.trim() || draft.imageAlt.trim().length < 10) {
    errors.push(
      'Accessible image alt text (minimum 10 characters) is required for every product image.'
    );
  }
  if (!draft.whyToGiveIt.trim() || draft.whyToGiveIt.trim().length < 20) {
    errors.push(
      'Editorial "whyToGiveIt" rationale is required (minimum 20 characters).'
    );
  }
  if (!draft.bestForSummary.trim()) {
    errors.push('Recipient "bestForSummary" field is required.');
  }
  if (!draft.recipients.length) {
    errors.push('At least one valid recipient tag is required.');
  }
  if (!draft.occasions.length) {
    errors.push('At least one valid occasion tag is required.');
  }
  if (!draft.personalityTraits.length) {
    errors.push('At least one valid personality trait tag is required.');
  }
  if (!draft.humanReviewed) {
    errors.push(
      'Editor must explicitly review and approve AI-suggested fields (humanReviewed = true) before publishing.'
    );
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
    };
  }

  const tiers = inferBudgetTiers(draft.price);

  const canonicalProduct: Product = {
    id: draft.productId,
    slug: draft.slug,
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim(),
    vendor: draft.vendor.trim(),
    price: draft.price!,
    currency: draft.currency,
    budgetTier: draft.budgetTier ?? tiers.budgetTier ?? 'under-50',
    guidePriceBucket:
      draft.guidePriceBucket ?? tiers.guidePriceBucket ?? '25-to-75',
    productType: draft.productType,
    commerceProvider: draft.commerceProvider,
    purchaseUrl: urlCheck.normalizedUrl ?? draft.purchaseUrl.trim(),
    isPlaceholderLink: true,
    inStock: Boolean(draft.inStock),
    whyToGiveIt: draft.whyToGiveIt.trim(),
    detailsAndCare: draft.detailsAndCare.trim(),
    bestForSummary: draft.bestForSummary.trim(),
    recipients: draft.recipients,
    interests: draft.interests,
    ageRanges: draft.ageRanges,
    occasions: draft.occasions,
    personalityTraits: draft.personalityTraits,
    images: [
      {
        id: `img_${draft.productId}_01`,
        url: draft.imageUrl,
        fallbackColor: '#E5F5EE',
        alt: draft.imageAlt.trim(),
      },
    ],
    citationIds: [],
  };

  return {
    valid: true,
    errors: [],
    warnings: [],
    canonicalProduct,
  };
}
