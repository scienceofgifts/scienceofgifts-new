import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  DEFAULT_ARTICLE_AI_WRITING_PROFILE,
  DEFAULT_PRODUCT_AI_WRITING_PROFILE,
  aiWritingProfileDocument,
  type AiWritingProfileDocument,
} from './schemas/documents/aiWritingProfile';

export {
  DEFAULT_ARTICLE_AI_WRITING_PROFILE,
  DEFAULT_PRODUCT_AI_WRITING_PROFILE,
  type AiWritingProfileDocument,
};
import { productDocument } from './schemas/documents/product';
import { validateDocumentWithSchema } from './sanityCore';
import {
  fetchDocumentFromSanityContentLake,
  readServerEnv,
  resolveSanityServerCredentials,
  validateSanityDraftBeforeServerMutation,
} from './sanityServerClient';
import {
  AGE_RANGE_OPTIONS,
  INTEREST_OPTIONS,
  OCCASION_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  RECIPIENT_OPTIONS,
} from './taxonomyRegistry';
import {
  deriveBudgetTierFromPrice,
  deriveCanonicalProductIdFromSlug,
  deriveGuidePriceBucketFromPrice,
} from '../productInterchangeSchema';
import {
  extractProductDetailsFromUrl,
  type ExtractedProductDetailsResult,
} from './productUrlExtractor';

export const DEFAULT_GEMINI_EDITORIAL_MODEL = 'gemini-4-hydrogen';
export const EVALUATION_HOODIE_DRAFT_ID =
  'drafts.prod_eval_copy_emotional_support_psychology_major_hoodie';
export const EVALUATION_HOODIE_PRODUCT_ID =
  'prod_eval_copy_emotional_support_psychology_major_hoodie';

export interface ProposedFieldDiff {
  field: string;
  label: string;
  category: 'supporting' | 'editorial';
  previousValue: any;
  proposedValue: any;
  hasExistingContent: boolean;
}

export interface ProductAuthoringContextInput {
  productUrl?: string;
  fetchUrlFirst?: boolean;
  retrievedDetails?: ExtractedProductDetailsResult | null;
  currentDocument?: Record<string, any> | null;
  writingProfileId?: string;
  writingProfile?: AiWritingProfileDocument | null;
  customInstructions?: string;
  modelOverride?: string;
}

export interface SupportingFieldsGenerationResult {
  ok: boolean;
  modelUsed: string;
  writingProfileUsed: {
    profileId: string;
    name: string;
  };
  retrievedDetails?: ExtractedProductDetailsResult | null;
  proposedSupportingFields: Record<string, any>;
  fieldDiffs: ProposedFieldDiff[];
  validationIssues: Array<{ path: string; message: string; level: 'error' | 'warning' }>;
  message: string;
}

export interface EditorialCopyGenerationResult {
  ok: boolean;
  modelUsed: string;
  writingProfileUsed: {
    profileId: string;
    name: string;
  };
  centralObservation: string;
  proposedEditorialFields: {
    whyToGiveIt: string;
    giftVerdict: {
      _type: 'productGiftVerdict';
      editorialAssessment: string;
      standoutReason: string;
      recipientDelight: string;
      importantCaveat: string;
    };
    idealRecipientProfile: {
      _type: 'productRecipientProfile';
      headline: string;
      narrative: string;
      lifestyleNotes: string[];
      relationshipFit: string;
    };
    extendedGiftRationale: string[];
    buyingConsiderationsList: Array<{
      _type: 'productBuyingConsideration';
      _key: string;
      title: string;
      detail: string;
      importance: 'high' | 'medium' | 'contextual';
    }>;
    occasionContextNotes: Array<{
      _type: 'productOccasionNote';
      _key: string;
      occasion: string;
      note: string;
    }>;
  };
  fieldDiffs: ProposedFieldDiff[];
  hasExistingEditorialContent: boolean;
  validationIssues: Array<{ path: string; message: string; level: 'error' | 'warning' }>;
  message: string;
}

export interface CompleteProductGenerationResult {
  ok: boolean;
  modelUsed: string;
  writingProfileUsed: {
    profileId: string;
    name: string;
  };
  centralObservation: string;
  retrievedDetails?: ExtractedProductDetailsResult | null;
  proposedSupportingFields: Record<string, any>;
  proposedEditorialFields: EditorialCopyGenerationResult['proposedEditorialFields'];
  combinedProposedFields: Record<string, any>;
  supportingDiffs: ProposedFieldDiff[];
  editorialDiffs: ProposedFieldDiff[];
  hasExistingEditorialContent: boolean;
  validationIssues: Array<{ path: string; message: string; level: 'error' | 'warning' }>;
  validForDraftSave: boolean;
  message: string;
}

export type EditorialPolishActionType =
  | 'rewrite'
  | 'new_angle'
  | 'more_distinctive'
  | 'reduce_repetition'
  | 'shorten'
  | 'custom';

export type EditorialPolishTargetSection =
  | 'all_editorial'
  | 'whyToGiveIt'
  | 'giftVerdict'
  | 'idealRecipientProfile'
  | 'extendedGiftRationale'
  | 'buyingConsiderationsList'
  | 'occasionContextNotes';

export interface PolishEditorialCopyInput extends ProductAuthoringContextInput {
  action: EditorialPolishActionType;
  targetSection?: EditorialPolishTargetSection;
}

export interface PolishEditorialCopyResult {
  ok: boolean;
  action: EditorialPolishActionType;
  targetSection: EditorialPolishTargetSection;
  modelUsed: string;
  writingProfileUsed: {
    profileId: string;
    name: string;
  };
  centralObservation: string;
  rationaleSummary: string;
  originalFields: Record<string, any>;
  proposedFields: Record<string, any>;
  fieldDiffs: ProposedFieldDiff[];
  validationIssues: Array<{ path: string; message: string; level: 'error' | 'warning' }>;
  message: string;
}

const ALLOWED_CATEGORIES = PRODUCT_CATEGORY_OPTIONS.map((o) => o.value);
const ALLOWED_RECIPIENTS = RECIPIENT_OPTIONS.map((o) => o.value);
const ALLOWED_OCCASIONS = OCCASION_OPTIONS.map((o) => o.value);
const ALLOWED_INTERESTS = INTEREST_OPTIONS.map((o) => o.value);
const ALLOWED_PERSONALITIES = PERSONALITY_TRAIT_OPTIONS.map((o) => o.value);
const ALLOWED_AGE_RANGES = AGE_RANGE_OPTIONS.map((o) => o.value);

function getServerGeminiClient(): { ai: GoogleGenAI; defaultModel: string } {
  const apiKey =
    readServerEnv('GEMINI_API_KEY') ||
    readServerEnv('GOOGLE_API_KEY') ||
    process.env.GEMINI_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error(
      'Server-side GEMINI_API_KEY is not configured in the environment.'
    );
  }

  const defaultModel =
    readServerEnv('GEMINI_EDITORIAL_MODEL') || DEFAULT_GEMINI_EDITORIAL_MODEL;

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return { ai, defaultModel };
}

async function callGeminiJsonWithRetry(params: {
  modelOverride?: string;
  prompt: string;
  responseSchema: Record<string, any>;
}): Promise<{ parsed: any; modelUsed: string }> {
  const { ai, defaultModel } = getServerGeminiClient();
  const primaryModel = params.modelOverride || defaultModel;
  const candidateModels = [
    primaryModel,
    primaryModel,
    'gemini-2.5-flash',
  ];

  let lastErr: any = null;
  for (let attempt = 0; attempt < candidateModels.length; attempt++) {
    const modelName = candidateModels[attempt];
    try {
      const isHydrogenOrGemini3 =
        modelName.includes('hydrogen') || modelName.includes('gemini-3');
      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          ...(isHydrogenOrGemini3
            ? {
                thinkingConfig: {
                  thinkingLevel: ThinkingLevel.LOW,
                },
              }
            : {}),
        },
      });
      const parsed = JSON.parse(response.text || '{}');
      return { parsed, modelUsed: modelName };
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || '');
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED');
      if (!isTransient || attempt === candidateModels.length - 1) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }

  throw lastErr || new Error('Gemini generation failed.');
}

function toKebabSlug(raw: string): string {
  const cleaned = (raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned.length >= 3 ? cleaned : 'editorial-gift-item';
}

function isNonEmptyValue(val: any): boolean {
  if (val === undefined || val === null || val === '') return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') {
    if (val._type === 'slug') return Boolean(val.current);
    return Object.keys(val).some(
      (k) => !k.startsWith('_') && isNonEmptyValue(val[k])
    );
  }
  return true;
}

function filterToAllowedList(
  candidates: unknown,
  allowedValues: string[],
  fallbackValues: string[],
  maxItems: number
): string[] {
  const allowedSet = new Set(allowedValues);
  const rawList = Array.isArray(candidates) ? candidates : [];
  const filtered: string[] = [];
  for (const item of rawList) {
    const str = typeof item === 'string' ? item.trim() : '';
    if (str && allowedSet.has(str) && !filtered.includes(str)) {
      filtered.push(str);
    }
  }
  if (filtered.length === 0) {
    return fallbackValues.slice(0, maxItems);
  }
  return filtered.slice(0, maxItems);
}

/**
 * Ensures the default `Science of Gifts Product Editorial` (`ai_profile_science_of_gifts_product_editorial`)
 * document exists in Sanity Content Lake so editors can inspect and customize it directly in Studio.
 */
export async function ensureDefaultAiWritingProfileInSanity(): Promise<AiWritingProfileDocument> {
  const creds = resolveSanityServerCredentials();
  if (!creds.projectId || !creds.dataset || !creds.writeToken) {
    return DEFAULT_PRODUCT_AI_WRITING_PROFILE;
  }

  const pubId = DEFAULT_PRODUCT_AI_WRITING_PROFILE._id;
  const draftId = `drafts.${pubId}`;

  const existingDraft = await fetchDocumentFromSanityContentLake(draftId);
  if (existingDraft && existingDraft._type === 'aiWritingProfile') {
    return existingDraft as AiWritingProfileDocument;
  }

  const existingPub = await fetchDocumentFromSanityContentLake(pubId);
  if (existingPub && existingPub._type === 'aiWritingProfile') {
    return existingPub as AiWritingProfileDocument;
  }

  const mutateUrl = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/data/mutate/${creds.dataset}?returnIds=true&returnDocuments=true`;
  try {
    const res = await fetch(mutateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.writeToken}`,
      },
      body: JSON.stringify({
        mutations: [
          {
            createIfNotExists: {
              ...DEFAULT_PRODUCT_AI_WRITING_PROFILE,
              _id: pubId,
              _type: 'aiWritingProfile',
              status: 'published',
            },
          },
        ],
      }),
    });
    if (res.ok) {
      const readBack = await fetchDocumentFromSanityContentLake(pubId);
      if (readBack && readBack._type === 'aiWritingProfile') {
        return readBack as AiWritingProfileDocument;
      }
    }
  } catch {}

  return DEFAULT_PRODUCT_AI_WRITING_PROFILE;
}

export async function ensureDefaultArticleAiWritingProfileInSanity(): Promise<AiWritingProfileDocument> {
  const creds = resolveSanityServerCredentials();
  if (!creds.projectId || !creds.dataset || !creds.writeToken) {
    return DEFAULT_ARTICLE_AI_WRITING_PROFILE;
  }

  const pubId = DEFAULT_ARTICLE_AI_WRITING_PROFILE._id;
  const draftId = `drafts.${pubId}`;

  const existingDraft = await fetchDocumentFromSanityContentLake(draftId);
  if (existingDraft && existingDraft._type === 'aiWritingProfile') {
    return existingDraft as AiWritingProfileDocument;
  }

  const existingPub = await fetchDocumentFromSanityContentLake(pubId);
  if (existingPub && existingPub._type === 'aiWritingProfile') {
    return existingPub as AiWritingProfileDocument;
  }

  const mutateUrl = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/data/mutate/${creds.dataset}?returnIds=true&returnDocuments=true`;
  try {
    const res = await fetch(mutateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.writeToken}`,
      },
      body: JSON.stringify({
        mutations: [
          {
            createIfNotExists: {
              ...DEFAULT_ARTICLE_AI_WRITING_PROFILE,
              _id: pubId,
              _type: 'aiWritingProfile',
              status: 'published',
            },
          },
        ],
      }),
    });
    if (res.ok) {
      const readBack = await fetchDocumentFromSanityContentLake(pubId);
      if (readBack && readBack._type === 'aiWritingProfile') {
        return readBack as AiWritingProfileDocument;
      }
    }
  } catch {}

  return DEFAULT_ARTICLE_AI_WRITING_PROFILE;
}

/**
 * Lists all `aiWritingProfile` documents stored in Sanity Content Lake, preferring any active draft
 * (`drafts.<id>`) over its published counterpart so Studio edits take effect immediately.
 */
export async function listAiWritingProfilesFromSanity(): Promise<
  AiWritingProfileDocument[]
> {
  await Promise.all([
    ensureDefaultAiWritingProfileInSanity(),
    ensureDefaultArticleAiWritingProfileInSanity(),
  ]);

  const creds = resolveSanityServerCredentials();
  if (!creds.projectId || !creds.dataset) {
    return [
      DEFAULT_PRODUCT_AI_WRITING_PROFILE,
      DEFAULT_ARTICLE_AI_WRITING_PROFILE,
    ];
  }

  const groq = encodeURIComponent(
    `*[_type == "aiWritingProfile"] | order(_updatedAt desc)`
  );
  const url = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/data/query/${creds.dataset}?query=${groq}&perspective=raw`;
  const headers: Record<string, string> = {};
  if (creds.readToken) {
    headers.Authorization = `Bearer ${creds.readToken}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      return [
        DEFAULT_PRODUCT_AI_WRITING_PROFILE,
        DEFAULT_ARTICLE_AI_WRITING_PROFILE,
      ];
    }
    const data = await res.json();
    const rawDocs: AiWritingProfileDocument[] = Array.isArray(data?.result)
      ? data.result
      : [];

    const byCanonicalId = new Map<string, AiWritingProfileDocument>();
    for (const doc of rawDocs) {
      if (!doc || typeof doc._id !== 'string') continue;
      const isDraft = doc._id.startsWith('drafts.');
      const canonicalId = doc._id.replace(/^drafts\./, '');
      const existing = byCanonicalId.get(canonicalId);
      if (!existing || isDraft) {
        byCanonicalId.set(canonicalId, {
          ...doc,
          profileId: doc.profileId || canonicalId,
        });
      }
    }

    if (!byCanonicalId.has(DEFAULT_PRODUCT_AI_WRITING_PROFILE._id)) {
      byCanonicalId.set(
        DEFAULT_PRODUCT_AI_WRITING_PROFILE._id,
        DEFAULT_PRODUCT_AI_WRITING_PROFILE
      );
    }
    if (!byCanonicalId.has(DEFAULT_ARTICLE_AI_WRITING_PROFILE._id)) {
      byCanonicalId.set(
        DEFAULT_ARTICLE_AI_WRITING_PROFILE._id,
        DEFAULT_ARTICLE_AI_WRITING_PROFILE
      );
    }

    return Array.from(byCanonicalId.values());
  } catch {
    return [
      DEFAULT_PRODUCT_AI_WRITING_PROFILE,
      DEFAULT_ARTICLE_AI_WRITING_PROFILE,
    ];
  }
}

/**
 * Resolves a specific `aiWritingProfile` by `profileId` or `_id` from Sanity Content Lake,
 * falling back to the default Science of Gifts Product Editorial profile.
 */
export async function resolveActiveAiWritingProfile(
  profileIdOrDoc?: string | AiWritingProfileDocument | null
): Promise<AiWritingProfileDocument> {
  if (
    profileIdOrDoc &&
    typeof profileIdOrDoc === 'object' &&
    profileIdOrDoc.editorialVoiceAndStyle
  ) {
    return profileIdOrDoc;
  }

  const profiles = await listAiWritingProfilesFromSanity();
  const requestedId =
    typeof profileIdOrDoc === 'string'
      ? profileIdOrDoc.trim().replace(/^drafts\./, '')
      : '';

  if (requestedId) {
    const matched = profiles.find(
      (p) =>
        p.profileId === requestedId ||
        p._id.replace(/^drafts\./, '') === requestedId
    );
    if (matched) return matched;
  }

  const defaultProfile =
    profiles.find((p) => p.isDefault && p.contentType === 'product') ||
    profiles[0] ||
    DEFAULT_PRODUCT_AI_WRITING_PROFILE;

  return defaultProfile;
}

/**
 * Saves or updates an `aiWritingProfile` document in Sanity Content Lake so editors can modify
 * instructions, examples, avoid-lists, or lengths directly in Studio and have changes take effect immediately.
 */
export async function saveAiWritingProfileToSanity(
  profileInput: Partial<AiWritingProfileDocument> & {
    profileId?: string;
    _id?: string;
  },
  publishImmediately = true
): Promise<{
  ok: boolean;
  savedProfile: AiWritingProfileDocument;
  validationErrors: Array<{ path: string; message: string }>;
  message: string;
}> {
  const baseProfile = await resolveActiveAiWritingProfile(
    profileInput.profileId || profileInput._id
  );
  const canonicalId = (
    profileInput.profileId ||
    profileInput._id ||
    baseProfile.profileId ||
    DEFAULT_PRODUCT_AI_WRITING_PROFILE.profileId
  )
    .trim()
    .replace(/^drafts\./, '');

  const merged: AiWritingProfileDocument = {
    ...DEFAULT_PRODUCT_AI_WRITING_PROFILE,
    ...baseProfile,
    ...profileInput,
    _id: publishImmediately ? canonicalId : `drafts.${canonicalId}`,
    _type: 'aiWritingProfile',
    profileId: canonicalId,
    status: publishImmediately ? 'published' : 'draft',
    sectionInstructions: {
      ...DEFAULT_PRODUCT_AI_WRITING_PROFILE.sectionInstructions,
      ...(baseProfile.sectionInstructions || {}),
      ...(profileInput.sectionInstructions || {}),
      _type: 'aiWritingSectionInstructions',
    },
    recommendedLengths: {
      ...DEFAULT_PRODUCT_AI_WRITING_PROFILE.recommendedLengths,
      ...(baseProfile.recommendedLengths || {}),
      ...(profileInput.recommendedLengths || {}),
      _type: 'aiWritingLengthGuidance',
    },
  };

  const schemaCheck = validateDocumentWithSchema(
    aiWritingProfileDocument,
    merged as Record<string, any>
  );
  if (schemaCheck.errors.length > 0) {
    return {
      ok: false,
      savedProfile: merged,
      validationErrors: schemaCheck.errors.map((e) => ({
        path: e.path,
        message: e.message,
      })),
      message: `Validation failed on AI Writing Profile: ${schemaCheck.errors[0].message}`,
    };
  }

  const creds = resolveSanityServerCredentials();
  if (!creds.projectId || !creds.dataset || !creds.writeToken) {
    return {
      ok: false,
      savedProfile: merged,
      validationErrors: [],
      message: 'Missing server-side Sanity credentials.',
    };
  }

  const mutateUrl = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/data/mutate/${creds.dataset}?returnIds=true&returnDocuments=true`;
  const docToPersist: Record<string, any> = { ...merged };
  delete docToPersist._rev;
  delete docToPersist._createdAt;
  delete docToPersist._updatedAt;

  const mutations: any[] = [
    {
      createOrReplace: {
        ...docToPersist,
        _id: canonicalId,
        status: 'published',
      },
    },
  ];

  // If a draft also exists, keep it synchronized so Studio displays the latest values
  const existingDraft = await fetchDocumentFromSanityContentLake(
    `drafts.${canonicalId}`
  );
  if (existingDraft || !publishImmediately) {
    mutations.push({
      createOrReplace: {
        ...docToPersist,
        _id: `drafts.${canonicalId}`,
        status: 'draft',
      },
    });
  }

  const res = await fetch(mutateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.writeToken}`,
    },
    body: JSON.stringify({ mutations }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      ok: false,
      savedProfile: merged,
      validationErrors: [],
      message: `Sanity mutation failed (${res.status}): ${errText.slice(0, 200)}`,
    };
  }

  const readBack =
    (await fetchDocumentFromSanityContentLake(
      publishImmediately ? canonicalId : `drafts.${canonicalId}`
    )) || merged;

  return {
    ok: true,
    savedProfile: readBack as AiWritingProfileDocument,
    validationErrors: [],
    message: `Saved AI Writing Profile "${merged.name}" (${canonicalId}) to Sanity Content Lake.`,
  };
}

/**
 * Creates or loads a safe, non-indexed evaluation copy of the `Emotional Support Psychology Major Hoodie`
 * (`drafts.prod_eval_copy_emotional_support_psychology_major_hoodie`) cloned from the real published hoodie
 * (`prod_emotional_support_psychology_major_hoodie`) without modifying the original document.
 */
export async function ensureEvaluationHoodieCopyInSanity(): Promise<{
  ok: boolean;
  originalHoodieId: string;
  originalHoodieRev: string | null;
  evaluationCopy: Record<string, any> | null;
  message: string;
}> {
  const originalId = 'prod_emotional_support_psychology_major_hoodie';
  const originalDoc = await fetchDocumentFromSanityContentLake(originalId);
  if (!originalDoc) {
    return {
      ok: false,
      originalHoodieId: originalId,
      originalHoodieRev: null,
      evaluationCopy: null,
      message: `Original hoodie document "${originalId}" was not found in Sanity Content Lake.`,
    };
  }

  const existingEvalCopy = await fetchDocumentFromSanityContentLake(
    EVALUATION_HOODIE_DRAFT_ID
  );
  if (existingEvalCopy) {
    return {
      ok: true,
      originalHoodieId: originalId,
      originalHoodieRev: originalDoc._rev || null,
      evaluationCopy: existingEvalCopy,
      message: `Loaded existing evaluation copy "${EVALUATION_HOODIE_DRAFT_ID}" (original "${originalId}" untouched at rev ${originalDoc._rev}).`,
    };
  }

  const clonedEvalDraft: Record<string, any> = {
    ...originalDoc,
    _id: EVALUATION_HOODIE_DRAFT_ID,
    _type: 'product',
    productId: EVALUATION_HOODIE_PRODUCT_ID,
    status: 'draft',
    isSampleProduct: true,
    slug: {
      _type: 'slug',
      current: 'eval-copy-emotional-support-psychology-major-hoodie',
    },
    seo: {
      ...(originalDoc.seo || {}),
      _type: 'seoMetadata',
      canonicalPath:
        '/products/eval-copy-emotional-support-psychology-major-hoodie',
      indexing: 'noindex,follow',
    },
  };
  delete clonedEvalDraft._rev;
  delete clonedEvalDraft._createdAt;
  delete clonedEvalDraft._updatedAt;

  const saveRes = await saveDraftToSanityServerHelper(clonedEvalDraft);
  return {
    ok: saveRes.ok,
    originalHoodieId: originalId,
    originalHoodieRev: originalDoc._rev || null,
    evaluationCopy: saveRes.persistedDocument || clonedEvalDraft,
    message: saveRes.ok
      ? `Created evaluation copy "${EVALUATION_HOODIE_DRAFT_ID}" with full nested editorial content while keeping "${originalId}" untouched (rev: ${originalDoc._rev}).`
      : saveRes.message,
  };
}

async function saveDraftToSanityServerHelper(doc: Record<string, any>) {
  const { saveDraftToSanityContentLake } = await import('./sanityServerClient');
  return saveDraftToSanityContentLake(
    doc as Record<string, any> & { _id: string; _type: string }
  );
}

function summarizeSourceFactsForPrompt(
  input: ProductAuthoringContextInput,
  retrieved: ExtractedProductDetailsResult | null
): string {
  const doc = input.currentDocument || {};
  const lines: string[] = [];

  const sourceUrl =
    input.productUrl ||
    retrieved?.finalUrl ||
    retrieved?.sourceUrl ||
    doc.purchaseUrl ||
    doc.fourthwallUrl ||
    doc.affiliateUrl ||
    '';

  const title = retrieved?.title || doc.title || '';
  const vendor = retrieved?.vendor || doc.vendor || '';
  const description = retrieved?.description || '';
  const price =
    typeof retrieved?.price === 'number'
      ? retrieved.price
      : typeof doc.price === 'number'
      ? doc.price
      : null;
  const currency = retrieved?.currency || doc.currency || 'USD';
  const priceVerified = Boolean(doc.priceVerified);
  const inStock =
    typeof retrieved?.inStock === 'boolean'
      ? retrieved.inStock
      : typeof doc.inStock === 'boolean'
      ? doc.inStock
      : null;
  const inventoryVerified = Boolean(doc.inventoryVerified);
  const materials = retrieved?.materials || [];
  const dimensions = retrieved?.dimensions || null;
  const sizes = retrieved?.sizes || [];
  const colors = retrieved?.colors || [];
  const specs = retrieved?.specifications || doc.specifications || [];
  const variants = retrieved?.variants || [];
  const images =
    retrieved?.images?.map((i) => i.url) ||
    (Array.isArray(doc.images)
      ? doc.images.map((i: any) => i?.url).filter(Boolean)
      : []);

  lines.push(`- Source URL: ${sourceUrl || 'Not provided'}`);
  lines.push(`- Product Title: ${title || 'Unknown (derive from URL or notes)'}`);
  lines.push(`- Merchant / Brand: ${vendor || 'Unknown'}`);
  lines.push(
    `- Retail Price: ${
      price !== null ? `$${price} ${currency}` : 'UNKNOWN / UNVERIFIED (must remain null)'
    } (Editor-verified: ${priceVerified})`
  );
  lines.push(
    `- Availability / Stock: ${
      inStock !== null
        ? inStock
          ? `Reported In Stock (${retrieved?.availabilityLabel || 'Unverified'})`
          : `Reported Out of Stock (${retrieved?.availabilityLabel || 'Unverified'})`
        : 'UNKNOWN / UNVERIFIED'
    } (Editor-verified: ${inventoryVerified})`
  );

  if (description) {
    lines.push(`- Retrieved Merchant Description:\n"""\n${description.slice(0, 1800)}\n"""`);
  }
  if (materials.length > 0) {
    lines.push(`- Known Materials: ${materials.join(', ')}`);
  }
  if (dimensions) {
    lines.push(`- Known Dimensions: ${dimensions}`);
  }
  if (sizes.length > 0) {
    lines.push(`- Available Sizes: ${sizes.join(', ')}`);
  }
  if (colors.length > 0) {
    lines.push(`- Available Colors / Finishes: ${colors.join(', ')}`);
  }
  if (Array.isArray(specs) && specs.length > 0) {
    const specText = specs
      .slice(0, 12)
      .map((s: any) => `${s.label}: ${s.value}`)
      .join('; ');
    lines.push(`- Known Specifications: ${specText}`);
  }
  if (Array.isArray(variants) && variants.length > 0) {
    const varText = variants
      .slice(0, 10)
      .map(
        (v: any) =>
          `${v.title}${typeof v.price === 'number' ? ` ($${v.price})` : ''}`
      )
      .join('; ');
    lines.push(`- Known Variants (${variants.length}): ${varText}`);
  }
  if (images.length > 0) {
    lines.push(`- Product Images (${images.length} URLs available): ${images.slice(0, 3).join(', ')}`);
  }
  if (input.customInstructions?.trim()) {
    lines.push(`- Editor Custom Instructions / Notes: ${input.customInstructions.trim()}`);
  }

  return lines.join('\n');
}

function formatWritingProfileForPrompt(profile: AiWritingProfileDocument): string {
  return [
    `ACTIVE AI WRITING PROFILE: "${profile.name}" (${profile.profileId})`,
    `Editorial Voice & Style:\n${profile.editorialVoiceAndStyle}`,
    `Core Writing Objectives:\n${(profile.writingObjectives || [])
      .map((o, idx) => `${idx + 1}. ${o}`)
      .join('\n')}`,
    `Phrases & Approaches to Strictly Avoid:\n${(
      profile.avoidPhrasesAndApproaches || []
    )
      .map((p) => `- ${p}`)
      .join('\n')}`,
    profile.preferredExamples?.length
      ? `Preferred Model Examples:\n${profile.preferredExamples
          .map((e) => `> ${e}`)
          .join('\n')}`
      : '',
    `Section-by-Section Guidance:\n` +
      `- Why to Give It (${profile.recommendedLengths?.whyToGiveItRange || '160–420 chars'}): ${profile.sectionInstructions?.whyToGiveIt || ''}\n` +
      `- Four-Part Gift Verdict (${profile.recommendedLengths?.verdictAssessmentRange || '120–320 chars per sub-field'}): ${profile.sectionInstructions?.giftVerdict || ''}\n` +
      `- Ideal Recipient Profile (${profile.recommendedLengths?.recipientNarrativeRange || '140–360 chars'}): ${profile.sectionInstructions?.idealRecipientProfile || ''}\n` +
      `- Extended Gift Rationale (${profile.recommendedLengths?.extendedRationaleParagraphs || '2–3 paragraphs'}): ${profile.sectionInstructions?.extendedGiftRationale || ''}\n` +
      `- Buying Considerations (${profile.recommendedLengths?.buyingConsiderationsCount || '3–4 items'}): ${profile.sectionInstructions?.buyingConsiderations || ''}\n` +
      `- Occasion Context Notes: ${profile.sectionInstructions?.occasionContextNotes || ''}\n` +
      `- Supporting Metadata & SEO (${profile.recommendedLengths?.subtitleRange || '60–130 chars'}): ${profile.sectionInstructions?.supportingMetadataAndSeo || ''}`,
    profile.additionalCustomInstructions
      ? `Additional Custom Instructions:\n${profile.additionalCustomInstructions}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * WORKFLOW ACTION 2: Generate Supporting Fields (Single Bulk AI Operation)
 *
 * Generates classification, taxonomy tags, short summaries, specifications (strictly from known facts),
 * and SEO metadata in one single structured Gemini call.
 */
export async function generateProductSupportingFields(
  input: ProductAuthoringContextInput
): Promise<SupportingFieldsGenerationResult> {
  let retrieved = input.retrievedDetails || null;
  if (!retrieved && input.fetchUrlFirst && input.productUrl?.trim()) {
    const extRes = await extractProductDetailsFromUrl(input.productUrl.trim());
    retrieved = extRes.ok ? extRes : null;
  }

  const profile = await resolveActiveAiWritingProfile(
    input.writingProfile || input.writingProfileId
  );
  const currentDoc = input.currentDocument || {};
  const factsSummary = summarizeSourceFactsForPrompt(input, retrieved);

  const prompt = `You are the senior cataloging and editorial metadata architect at Science of Gifts.
Generate all supporting product metadata, controlled taxonomy classifications, short summaries, factual specifications, and SEO fields in ONE single structured JSON response.

${formatWritingProfileForPrompt(profile)}

SOURCE PRODUCT FACTS:
${factsSummary}

STRICT RULES:
1. NEVER invent specifications, materials, dimensions, or care instructions that are not supported by the source facts. If only limited facts are known, include only those verified/retrieved facts in \`specifications\` and \`detailsAndCare\`.
2. Choose taxonomy tags ONLY from the allowed canonical enum values enforced by the schema.
3. Keep \`title\` clean and natural (never append "Review" to \`title\`; put search keywords in \`seoTitle\`).
4. Ensure \`subtitle\` is 20–150 characters, \`calloutTag\` is 8–50 characters, \`bestForSummary\` is 25–190 characters, \`detailsAndCare\` is 25–500 characters, \`seoTitle\` is 20–62 characters, and \`metaDescription\` is 60–155 characters.`;

  const { parsed, modelUsed: modelToUse } = await callGeminiJsonWithRetry({
    modelOverride: input.modelOverride,
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      required: [
        'title',
        'vendor',
        'productType',
        'subtitle',
        'calloutTag',
        'bestForSummary',
        'detailsAndCare',
        'recipients',
        'occasions',
        'interests',
        'personalityTraits',
        'ageRanges',
        'specifications',
        'seoTitle',
        'metaDescription',
      ],
      properties: {
        title: {
          type: Type.STRING,
          description: 'Clean editorial product title (4–110 chars).',
        },
        vendor: {
          type: Type.STRING,
          description: 'Brand, studio, or merchant name.',
        },
        productType: {
          type: Type.STRING,
          enum: ALLOWED_CATEGORIES,
          description: 'Primary product category.',
        },
        subtitle: {
          type: Type.STRING,
          description: 'Crisp magazine-style subtitle (20–150 chars).',
        },
        calloutTag: {
          type: Type.STRING,
          description: 'Short editorial badge label (8–50 chars).',
        },
        bestForSummary: {
          type: Type.STRING,
          description:
            'Concise 1–2 sentence summary for guide cards and quick verdicts (25–190 chars).',
        },
        detailsAndCare: {
          type: Type.STRING,
          description:
            'Materials, sizing, and care summary grounded strictly in known product facts (25–500 chars).',
        },
        recipients: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: ALLOWED_RECIPIENTS },
          description: '1 to 4 canonical recipient categories.',
        },
        occasions: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: ALLOWED_OCCASIONS },
          description: '1 to 5 canonical gifting occasions.',
        },
        interests: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: ALLOWED_INTERESTS },
          description: '1 to 6 canonical interest categories.',
        },
        personalityTraits: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: ALLOWED_PERSONALITIES },
          description: '1 to 3 recipient personality archetypes.',
        },
        ageRanges: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: ALLOWED_AGE_RANGES },
          description: '1 to 4 recipient age ranges.',
        },
        specifications: {
          type: Type.ARRAY,
          description:
            'Structured factual specifications derived strictly from retrieved/known product facts.',
          items: {
            type: Type.OBJECT,
            required: ['label', 'value'],
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
          },
        },
        seoTitle: {
          type: Type.STRING,
          description: 'Search engine title (20–62 chars).',
        },
        metaDescription: {
          type: Type.STRING,
          description: 'Search engine meta description (60–155 chars).',
        },
      },
    },
  });

  const resolvedTitle =
    (typeof currentDoc.title === 'string' && currentDoc.title.trim()) ||
    retrieved?.title ||
    (typeof parsed.title === 'string' ? parsed.title.trim() : '') ||
    'Untitled Editorial Gift';

  const existingSlugCurrent =
    typeof currentDoc.slug === 'object' && currentDoc.slug?.current
      ? currentDoc.slug.current
      : typeof currentDoc.slug === 'string'
      ? currentDoc.slug
      : '';

  const slugCurrent = existingSlugCurrent || toKebabSlug(resolvedTitle);
  const existingProductId =
    typeof currentDoc.productId === 'string' &&
    currentDoc.productId.startsWith('prod_')
      ? currentDoc.productId
      : deriveCanonicalProductIdFromSlug(slugCurrent);

  const sourceUrl =
    input.productUrl?.trim() ||
    retrieved?.finalUrl ||
    retrieved?.sourceUrl ||
    currentDoc.purchaseUrl ||
    '';

  const isFourthwall =
    sourceUrl.toLowerCase().includes('shop.scienceofgifts.com') ||
    sourceUrl.toLowerCase().includes('fourthwall.com') ||
    retrieved?.commerceProvider === 'fourthwall' ||
    (!sourceUrl &&
      (currentDoc.commerceProvider === 'fourthwall' ||
        currentDoc.fulfillmentClassification === 'owned-fourthwall-merch' ||
        currentDoc.fulfillmentClassification === 'fourthwall_merch' ||
        currentDoc.fulfillmentClassification === 'fourthwall-merchandise'));

  const commerceProvider = isFourthwall
    ? 'fourthwall'
    : currentDoc.commerceProvider === 'digital' ||
      currentDoc.fulfillmentClassification === 'owned-digital-product'
    ? 'digital'
    : currentDoc.commerceProvider === 'direct' ||
      currentDoc.fulfillmentClassification === 'editorial-non-monetized'
    ? 'direct'
    : 'affiliate';

  const fulfillmentClassification =
    commerceProvider === 'fourthwall'
      ? 'owned-fourthwall-merch'
      : commerceProvider === 'digital'
      ? 'owned-digital-product'
      : commerceProvider === 'direct'
      ? 'editorial-non-monetized'
      : 'affiliate-partner';

  const knownPrice =
    typeof currentDoc.price === 'number' && currentDoc.price > 0
      ? currentDoc.price
      : typeof retrieved?.price === 'number' && retrieved.price > 0
      ? retrieved.price
      : undefined;

  const knownInStock =
    typeof currentDoc.inStock === 'boolean'
      ? currentDoc.inStock
      : typeof retrieved?.inStock === 'boolean'
      ? retrieved.inStock
      : undefined;

  const normalizedSpecs = Array.isArray(parsed.specifications)
    ? parsed.specifications
        .filter((s: any) => s && s.label && s.value)
        .slice(0, 12)
        .map((s: any, idx: number) => ({
          _type: 'productSpecificationItem' as const,
          _key: `spec_${String(idx + 1).padStart(2, '0')}`,
          label: String(s.label).trim().slice(0, 60),
          value: String(s.value).trim().slice(0, 180),
          ...(s.notes ? { notes: String(s.notes).trim().slice(0, 160) } : {}),
        }))
    : [];

  // Preserve existing uploaded Sanity images or populate from retrieved URL images if document has none
  const existingImages =
    Array.isArray(currentDoc.images) && currentDoc.images.length > 0
      ? currentDoc.images
      : Array.isArray(retrieved?.images) && retrieved!.images.length > 0
      ? retrieved!.images.slice(0, 8).map((img, idx) => ({
          _type: 'productImage',
          _key: `img_${String(idx + 1).padStart(2, '0')}`,
          id: `img_${String(idx + 1).padStart(2, '0')}`,
          url: img.url,
          alt: img.alt || `${resolvedTitle} product view ${idx + 1}`,
          caption:
            idx === 0
              ? `Primary product view for ${resolvedTitle}.`
              : `Additional gallery view ${idx + 1} for ${resolvedTitle}.`,
          isPrimary: idx === 0,
          sourceType: 'external-url',
          fitMode: 'cover',
          fallbackColor: '#F6F4EF',
          focalPoint: { _type: 'imageFocalPoint', x: 0.5, y: 0.5 },
        }))
      : undefined;

  const proposedSupportingFields: Record<string, any> = {
    title: resolvedTitle.slice(0, 120),
    slug: { _type: 'slug', current: slugCurrent },
    productId: existingProductId,
    vendor: (
      retrieved?.vendor ||
      currentDoc.vendor ||
      String(parsed.vendor || '').trim() ||
      'Science of Gifts Partner'
    ).slice(0, 80),
    productType: ALLOWED_CATEGORIES.includes(parsed.productType)
      ? parsed.productType
      : ALLOWED_CATEGORIES[0],
    subtitle: String(parsed.subtitle || '').trim().slice(0, 160),
    calloutTag: String(parsed.calloutTag || '').trim().slice(0, 55),
    bestForSummary: String(parsed.bestForSummary || '').trim().slice(0, 200),
    detailsAndCare: String(parsed.detailsAndCare || '').trim().slice(0, 550),
    recipients: filterToAllowedList(
      parsed.recipients,
      ALLOWED_RECIPIENTS,
      ['friend'],
      4
    ),
    occasions: filterToAllowedList(
      parsed.occasions,
      ALLOWED_OCCASIONS,
      ['birthday', 'just-because'],
      5
    ),
    interests: filterToAllowedList(
      parsed.interests,
      ALLOWED_INTERESTS,
      ['Everyday Carry & Workspace'],
      6
    ),
    personalityTraits: filterToAllowedList(
      parsed.personalityTraits,
      ALLOWED_PERSONALITIES,
      ['curious-creative'],
      3
    ),
    ageRanges: filterToAllowedList(
      parsed.ageRanges,
      ALLOWED_AGE_RANGES,
      ['25-34', '35-49'],
      4
    ),
    specifications: normalizedSpecs,
    commerceProvider,
    fulfillmentClassification,
    ...(sourceUrl ? { purchaseUrl: sourceUrl } : {}),
    ...(sourceUrl && commerceProvider === 'fourthwall'
      ? { fourthwallUrl: sourceUrl }
      : {}),
    ...(sourceUrl && commerceProvider === 'affiliate'
      ? { affiliateUrl: sourceUrl }
      : {}),
    ...(knownPrice !== undefined
      ? {
          price: knownPrice,
          budgetTier: deriveBudgetTierFromPrice(knownPrice),
          guidePriceBucket: deriveGuidePriceBucketFromPrice(knownPrice),
        }
      : {}),
    priceVerified: Boolean(currentDoc.priceVerified),
    priceVerificationSource: currentDoc.priceVerificationSource || 'unverified',
    ...(knownInStock !== undefined ? { inStock: knownInStock } : {}),
    inventoryVerified: Boolean(currentDoc.inventoryVerified),
    inventoryVerificationSource:
      currentDoc.inventoryVerificationSource || 'unverified',
    ...(existingImages ? { images: existingImages } : {}),
    seo: {
      ...(currentDoc.seo || {}),
      _type: 'seoMetadata',
      seoTitle: String(parsed.seoTitle || `${resolvedTitle} | Science of Gifts`)
        .trim()
        .slice(0, 65),
      metaDescription: String(
        parsed.metaDescription || parsed.bestForSummary || ''
      )
        .trim()
        .slice(0, 160),
      canonicalPath: `/products/${slugCurrent}`,
      indexing:
        currentDoc.status === 'published' ? 'index,follow' : 'noindex,follow',
    },
  };

  const labelMap: Record<string, string> = {
    title: 'Product Name',
    slug: 'Canonical URL Slug',
    productId: 'Canonical Product ID',
    vendor: 'Vendor / Brand / Maker',
    productType: 'Primary Product Category',
    subtitle: 'Editorial Subtitle',
    calloutTag: 'Editorial Callout Badge',
    bestForSummary: 'Best-For Summary (Quick Verdict)',
    detailsAndCare: 'Materials, Specifications & Care Summary',
    recipients: 'Recipient Categories',
    occasions: 'Gifting Occasions',
    interests: 'Interest Categories',
    personalityTraits: 'Recipient Personality Archetypes',
    ageRanges: 'Age Ranges',
    specifications: 'Structured Technical Specifications',
    seo: 'SEO Metadata (Title, Description, Canonical Path)',
  };

  const fieldDiffs: ProposedFieldDiff[] = Object.keys(labelMap).map((key) => ({
    field: key,
    label: labelMap[key],
    category: 'supporting',
    previousValue: currentDoc[key],
    proposedValue: proposedSupportingFields[key],
    hasExistingContent: isNonEmptyValue(currentDoc[key]),
  }));

  const candidateDoc = {
    ...currentDoc,
    ...proposedSupportingFields,
    _id: currentDoc._id || `drafts.${existingProductId}`,
    _type: 'product',
  };
  const schemaCheck = validateDocumentWithSchema(productDocument, candidateDoc);
  const supportingPaths = new Set(Object.keys(proposedSupportingFields));
  const validationIssues = [
    ...schemaCheck.errors
      .filter((e) => supportingPaths.has(e.path.split('.')[0]))
      .map((e) => ({
        path: e.path,
        message: e.message,
        level: 'error' as const,
      })),
    ...schemaCheck.warnings
      .filter((w) => supportingPaths.has(w.path.split('.')[0]))
      .map((w) => ({
        path: w.path,
        message: w.message,
        level: 'warning' as const,
      })),
  ];

  return {
    ok: true,
    modelUsed: modelToUse,
    writingProfileUsed: {
      profileId: profile.profileId,
      name: profile.name,
    },
    retrievedDetails: retrieved,
    proposedSupportingFields,
    fieldDiffs,
    validationIssues,
    message: `Generated ${fieldDiffs.length} supporting product fields in a single bulk operation using "${profile.name}".`,
  };
}

/**
 * WORKFLOW ACTION 3: Generate Editorial Copy (Focused Editorial Writing Call)
 *
 * Separate, focused model call dedicated to developing ONE distinctive central observation
 * and generating coherent, non-repetitive editorial prose across all 6 editorial sections.
 */
export async function generateProductEditorialCopy(
  input: ProductAuthoringContextInput
): Promise<EditorialCopyGenerationResult> {
  let retrieved = input.retrievedDetails || null;
  if (!retrieved && input.fetchUrlFirst && input.productUrl?.trim()) {
    const extRes = await extractProductDetailsFromUrl(input.productUrl.trim());
    retrieved = extRes.ok ? extRes : null;
  }

  const profile = await resolveActiveAiWritingProfile(
    input.writingProfile || input.writingProfileId
  );
  const currentDoc = input.currentDocument || {};
  const factsSummary = summarizeSourceFactsForPrompt(input, retrieved);

  const taxonomyContext = [
    currentDoc.productType ? `Category: ${currentDoc.productType}` : '',
    Array.isArray(currentDoc.recipients) && currentDoc.recipients.length
      ? `Target Recipients: ${currentDoc.recipients.join(', ')}`
      : '',
    Array.isArray(currentDoc.interests) && currentDoc.interests.length
      ? `Interests: ${currentDoc.interests.join(', ')}`
      : '',
    Array.isArray(currentDoc.occasions) && currentDoc.occasions.length
      ? `Occasions: ${currentDoc.occasions.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const prompt = `You are a lead editorial gift critic at Science of Gifts.
Your sole task in this call is to write distinctive, emotionally intelligent, publication-grade editorial copy for this product.

${formatWritingProfileForPrompt(profile)}

SOURCE PRODUCT FACTS:
${factsSummary}
${taxonomyContext ? `\nCLASSIFICATION CONTEXT:\n${taxonomyContext}` : ''}

COHERENCE & QUALITY MANDATE:
1. First formulate \`centralObservation\`: ONE specific, memorable observation about why this product works as a gift and what moment of recognition or utility it creates between giver and recipient.
2. Build every editorial section around that central observation so the piece reads like a unified magazine review rather than disconnected AI bullets.
3. NEVER repeat the same sentence, opening phrase, or adjective pair across \`whyToGiveIt\`, \`giftVerdict\`, \`idealRecipientProfile\`, and \`extendedGiftRationale\`.
4. NEVER use banned promotional clichés (${(
    profile.avoidPhrasesAndApproaches || []
  )
    .slice(0, 8)
    .join(', ')}).
5. Respect factual truth: if retail price or stock is unknown/unverified, do NOT invent a price; include a practical note in \`buyingConsiderationsList\` reminding buyers to check live sizing/availability on the merchant page.`;

  const { parsed, modelUsed: modelToUse } = await callGeminiJsonWithRetry({
    modelOverride: input.modelOverride,
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      required: [
        'centralObservation',
        'whyToGiveIt',
        'giftVerdict',
        'idealRecipientProfile',
        'extendedGiftRationale',
        'buyingConsiderationsList',
        'occasionContextNotes',
      ],
      properties: {
        centralObservation: {
          type: Type.STRING,
          description:
            'The single distinctive central thesis/observation anchoring the entire product review (80–260 chars).',
        },
        whyToGiveIt: {
          type: Type.STRING,
          description:
            'Primary editorial hook explaining why this succeeds as a gift (160–480 chars).',
        },
        giftVerdict: {
          type: Type.OBJECT,
          required: [
            'editorialAssessment',
            'standoutReason',
            'recipientDelight',
            'importantCaveat',
          ],
          properties: {
            editorialAssessment: {
              type: Type.STRING,
              description:
                'Core editorial synthesis of the gift recommendation (120–380 chars).',
            },
            standoutReason: {
              type: Type.STRING,
              description:
                'Specific craft, conceptual, or design detail that sets it apart (80–300 chars).',
            },
            recipientDelight: {
              type: Type.STRING,
              description:
                'Concrete moment or feeling the recipient experiences when unboxing or using it (80–300 chars).',
            },
            importantCaveat: {
              type: Type.STRING,
              description:
                'One candid, helpful limitation or caveat for buyers (60–260 chars).',
            },
          },
        },
        idealRecipientProfile: {
          type: Type.OBJECT,
          required: [
            'headline',
            'narrative',
            'lifestyleNotes',
            'relationshipFit',
          ],
          properties: {
            headline: {
              type: Type.STRING,
              description:
                'Distinctive persona headline for who this suits best (15–100 chars).',
            },
            narrative: {
              type: Type.STRING,
              description:
                'Editorial portrait of the recipient habits, sensibility, and mindset (120–420 chars).',
            },
            lifestyleNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 concrete lifestyle or personality cues.',
            },
            relationshipFit: {
              type: Type.STRING,
              description:
                'Which giver-recipient relationships make this gift feel most natural (40–240 chars).',
            },
          },
        },
        extendedGiftRationale: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            '2 to 3 cohesive editorial paragraphs deepening the central observation without repeating the verdict (each paragraph 160–550 chars).',
        },
        buyingConsiderationsList: {
          type: Type.ARRAY,
          description: '3 to 4 practical buying considerations.',
          items: {
            type: Type.OBJECT,
            required: ['title', 'detail', 'importance'],
            properties: {
              title: {
                type: Type.STRING,
                description: 'Short consideration heading (8–80 chars).',
              },
              detail: {
                type: Type.STRING,
                description:
                  'Practical advice or verification note for the buyer (50–320 chars).',
              },
              importance: {
                type: Type.STRING,
                enum: ['high', 'medium', 'contextual'],
              },
            },
          },
        },
        occasionContextNotes: {
          type: Type.ARRAY,
          description: '2 to 3 occasion fit notes using canonical occasion keys.',
          items: {
            type: Type.OBJECT,
            required: ['occasion', 'note'],
            properties: {
              occasion: {
                type: Type.STRING,
                enum: ALLOWED_OCCASIONS,
              },
              note: {
                type: Type.STRING,
                description:
                  'How to frame, time, or present this gift for the occasion (40–260 chars).',
              },
            },
          },
        },
      },
    },
  });

  const proposedEditorialFields: EditorialCopyGenerationResult['proposedEditorialFields'] =
    {
      whyToGiveIt: String(parsed.whyToGiveIt || '').trim().slice(0, 650),
      giftVerdict: {
        _type: 'productGiftVerdict',
        editorialAssessment: String(
          parsed.giftVerdict?.editorialAssessment || ''
        )
          .trim()
          .slice(0, 600),
        standoutReason: String(parsed.giftVerdict?.standoutReason || '')
          .trim()
          .slice(0, 380),
        recipientDelight: String(parsed.giftVerdict?.recipientDelight || '')
          .trim()
          .slice(0, 380),
        importantCaveat: String(parsed.giftVerdict?.importantCaveat || '')
          .trim()
          .slice(0, 340),
      },
      idealRecipientProfile: {
        _type: 'productRecipientProfile',
        headline: String(parsed.idealRecipientProfile?.headline || '')
          .trim()
          .slice(0, 120),
        narrative: String(parsed.idealRecipientProfile?.narrative || '')
          .trim()
          .slice(0, 550),
        lifestyleNotes: Array.isArray(
          parsed.idealRecipientProfile?.lifestyleNotes
        )
          ? parsed.idealRecipientProfile.lifestyleNotes
              .map((n: any) => String(n || '').trim())
              .filter(Boolean)
              .slice(0, 5)
          : [],
        relationshipFit: String(
          parsed.idealRecipientProfile?.relationshipFit || ''
        )
          .trim()
          .slice(0, 280),
      },
      extendedGiftRationale: Array.isArray(parsed.extendedGiftRationale)
        ? parsed.extendedGiftRationale
            .map((p: any) => String(p || '').trim())
            .filter(Boolean)
            .slice(0, 4)
        : [],
      buyingConsiderationsList: Array.isArray(parsed.buyingConsiderationsList)
        ? parsed.buyingConsiderationsList
            .filter((item: any) => item && item.title && item.detail)
            .slice(0, 6)
            .map((item: any, idx: number) => ({
              _type: 'productBuyingConsideration' as const,
              _key: `bc_${String(idx + 1).padStart(2, '0')}`,
              title: String(item.title).trim().slice(0, 90),
              detail: String(item.detail).trim().slice(0, 360),
              importance: (['high', 'medium', 'contextual'].includes(
                item.importance
              )
                ? item.importance
                : 'medium') as 'high' | 'medium' | 'contextual',
            }))
        : [],
      occasionContextNotes: Array.isArray(parsed.occasionContextNotes)
        ? parsed.occasionContextNotes
            .filter(
              (item: any) =>
                item &&
                ALLOWED_OCCASIONS.includes(item.occasion) &&
                item.note
            )
            .slice(0, 4)
            .map((item: any, idx: number) => ({
              _type: 'productOccasionNote' as const,
              _key: `oc_${String(idx + 1).padStart(2, '0')}`,
              occasion: item.occasion,
              note: String(item.note).trim().slice(0, 280),
            }))
        : [],
    };

  const editorialLabels: Record<string, string> = {
    whyToGiveIt: 'Why to Give It (Editorial Hook)',
    giftVerdict: 'Four-Part Gift Verdict',
    idealRecipientProfile: 'Ideal Recipient Profile (Who It Suits Best)',
    extendedGiftRationale: 'Extended Gift Rationale (Editorial Paragraphs)',
    buyingConsiderationsList: 'Practical Buying Considerations',
    occasionContextNotes: 'Occasion Fit & Presentation Notes',
  };

  const fieldDiffs: ProposedFieldDiff[] = Object.keys(editorialLabels).map(
    (key) => ({
      field: key,
      label: editorialLabels[key],
      category: 'editorial',
      previousValue: currentDoc[key],
      proposedValue: (proposedEditorialFields as Record<string, any>)[key],
      hasExistingContent: isNonEmptyValue(currentDoc[key]),
    })
  );

  const hasExistingEditorialContent = fieldDiffs.some(
    (d) => d.hasExistingContent
  );

  const candidateDoc = {
    ...currentDoc,
    ...proposedEditorialFields,
    _id: currentDoc._id || 'drafts.prod_editorial_preview',
    _type: 'product',
  };
  const schemaCheck = validateDocumentWithSchema(productDocument, candidateDoc);
  const editorialPaths = new Set(Object.keys(editorialLabels));
  const validationIssues = [
    ...schemaCheck.errors
      .filter((e) => editorialPaths.has(e.path.split('.')[0]))
      .map((e) => ({
        path: e.path,
        message: e.message,
        level: 'error' as const,
      })),
    ...schemaCheck.warnings
      .filter((w) => editorialPaths.has(w.path.split('.')[0]))
      .map((w) => ({
        path: w.path,
        message: w.message,
        level: 'warning' as const,
      })),
  ];

  return {
    ok: true,
    modelUsed: modelToUse,
    writingProfileUsed: {
      profileId: profile.profileId,
      name: profile.name,
    },
    centralObservation: String(parsed.centralObservation || '').trim(),
    proposedEditorialFields,
    fieldDiffs,
    hasExistingEditorialContent,
    validationIssues,
    message: `Generated coherent editorial copy around central angle: "${String(
      parsed.centralObservation || ''
    ).slice(0, 110)}" using profile "${profile.name}".`,
  };
}

/**
 * WORKFLOW ACTION 4: Generate Complete Product (Coordinated Multi-Step Workflow)
 *
 * Coordinates:
 * 1. Existing or retrieved product context
 * 2. Bulk supporting-field generation
 * 3. Separate coherent editorial-copy generation (aligned with the generated supporting taxonomy)
 * 4. Full schema validation
 * 5. Reviewable proposed changes (never automatically overwriting existing approved editorial content)
 */
export async function generateCompleteProductProposal(
  input: ProductAuthoringContextInput
): Promise<CompleteProductGenerationResult> {
  let retrieved = input.retrievedDetails || null;
  if (!retrieved && input.productUrl?.trim()) {
    const extRes = await extractProductDetailsFromUrl(input.productUrl.trim());
    retrieved = extRes.ok ? extRes : null;
  }

  const profile = await resolveActiveAiWritingProfile(
    input.writingProfile || input.writingProfileId
  );

  // Step 2: Bulk Supporting Fields
  const supportingRes = await generateProductSupportingFields({
    ...input,
    retrievedDetails: retrieved,
    writingProfile: profile,
  });

  // Step 3: Coherent Editorial Copy (seeded with the newly generated supporting fields & taxonomy)
  const mergedContextDoc = {
    ...(input.currentDocument || {}),
    ...supportingRes.proposedSupportingFields,
  };

  const editorialRes = await generateProductEditorialCopy({
    ...input,
    retrievedDetails: retrieved,
    currentDocument: mergedContextDoc,
    writingProfile: profile,
  });

  const combinedProposedFields: Record<string, any> = {
    ...supportingRes.proposedSupportingFields,
    ...editorialRes.proposedEditorialFields,
  };

  const candidateDraft = {
    ...(input.currentDocument || {}),
    ...combinedProposedFields,
    _id:
      input.currentDocument?._id ||
      `drafts.${supportingRes.proposedSupportingFields.productId}`,
    _type: 'product',
    status: 'draft' as const,
  };

  const serverValidation = validateSanityDraftBeforeServerMutation(candidateDraft);
  const allValidationIssues = [
    ...serverValidation.blockingDraftErrors,
    ...supportingRes.validationIssues,
    ...editorialRes.validationIssues,
  ];

  return {
    ok: true,
    modelUsed: editorialRes.modelUsed,
    writingProfileUsed: editorialRes.writingProfileUsed,
    centralObservation: editorialRes.centralObservation,
    retrievedDetails: retrieved,
    proposedSupportingFields: supportingRes.proposedSupportingFields,
    proposedEditorialFields: editorialRes.proposedEditorialFields,
    combinedProposedFields,
    supportingDiffs: supportingRes.fieldDiffs,
    editorialDiffs: editorialRes.fieldDiffs,
    hasExistingEditorialContent: editorialRes.hasExistingEditorialContent,
    validationIssues: allValidationIssues,
    validForDraftSave: serverValidation.validForDraftSave,
    message: `Complete product proposal ready for review (${supportingRes.fieldDiffs.length} supporting fields + ${editorialRes.fieldDiffs.length} editorial sections).`,
  };
}

/**
 * WORKFLOW ACTION 5: Review and Improve with AI (Focused Editorial Polishing & Regeneration)
 *
 * Supports:
 * - Rewrite editorial copy (`rewrite`)
 * - Try a different central angle (`new_angle`)
 * - Make the writing more distinctive (`more_distinctive`)
 * - Reduce repetition (`reduce_repetition`)
 * - Shorten (`shorten`)
 * - Apply custom instructions (`custom`)
 * Can target all editorial copy coherently (`all_editorial`) or a single section.
 */
export async function polishProductEditorialCopy(
  input: PolishEditorialCopyInput
): Promise<PolishEditorialCopyResult> {
  const targetSection: EditorialPolishTargetSection =
    input.targetSection || 'all_editorial';
  const action: EditorialPolishActionType = input.action || 'more_distinctive';

  const profile = await resolveActiveAiWritingProfile(
    input.writingProfile || input.writingProfileId
  );
  const currentDoc = input.currentDocument || {};
  const factsSummary = summarizeSourceFactsForPrompt(
    input,
    input.retrievedDetails || null
  );

  const actionDirectives: Record<EditorialPolishActionType, string> = {
    rewrite:
      'REWRITE EDITORIAL COPY: Write a fresh, natural editorial draft with clean rhythm and strong observational detail while preserving factual accuracy.',
    new_angle:
      'TRY A DIFFERENT CENTRAL ANGLE: Pivot away from the current angle and anchor the piece around a genuinely different, compelling psychological or everyday-ritual observation about why this gift lands well.',
    more_distinctive:
      'MAKE THE WRITING MORE DISTINCTIVE: Replace any generic or predictable phrasing with sharper, more tactile, human-sounding observations worthy of a flagship magazine column.',
    reduce_repetition:
      'REDUCE REPETITION: Eliminate any repeated words, echoed sentence structures, or overlapping claims between Why to Give It, the 4-part Gift Verdict, Ideal Recipient Profile, and Extended Rationale.',
    shorten:
      'SHORTEN & TIGHTEN: Condense the prose by 20–30% so every sentence carries maximum punch without losing warmth or specificity.',
    custom: `APPLY CUSTOM EDITOR INSTRUCTIONS: Follow these specific editor instructions carefully: "${
      input.customInstructions?.trim() ||
      'Sharpen specificity and conversational warmth.'
    }"`,
  };

  const currentEditorialSnapshot = {
    whyToGiveIt: currentDoc.whyToGiveIt || '',
    giftVerdict: currentDoc.giftVerdict || {},
    idealRecipientProfile: currentDoc.idealRecipientProfile || {},
    extendedGiftRationale: currentDoc.extendedGiftRationale || [],
    buyingConsiderationsList: currentDoc.buyingConsiderationsList || [],
    occasionContextNotes: currentDoc.occasionContextNotes || [],
  };

  const prompt = `You are a senior executive editor at Science of Gifts polishing an existing product draft.

${formatWritingProfileForPrompt(profile)}

SOURCE PRODUCT FACTS:
${factsSummary}

CURRENT EDITORIAL CONTENT IN DRAFT:
${JSON.stringify(currentEditorialSnapshot, null, 2)}

POLISHING ACTION REQUESTED:
${actionDirectives[action]}
${
  input.customInstructions?.trim() && action !== 'custom'
    ? `\nAdditional Editor Note: ${input.customInstructions.trim()}`
    : ''
}

TARGET SCOPE: ${
    targetSection === 'all_editorial'
      ? 'Polish ALL 6 editorial sections coherently so they work together seamlessly.'
      : `Focus your revision specifically on section "${targetSection}", ensuring it harmonizes with the rest of the draft without repeating phrases.`
  }`;

  const { parsed, modelUsed: modelToUse } = await callGeminiJsonWithRetry({
    modelOverride: input.modelOverride,
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      required: [
        'centralObservation',
        'rationaleSummary',
        'whyToGiveIt',
        'giftVerdict',
        'idealRecipientProfile',
        'extendedGiftRationale',
        'buyingConsiderationsList',
        'occasionContextNotes',
      ],
      properties: {
        centralObservation: {
          type: Type.STRING,
          description: 'The central observation guiding this polished revision.',
        },
        rationaleSummary: {
          type: Type.STRING,
          description:
            'Brief 1–2 sentence editor note explaining what was improved in this revision.',
        },
        whyToGiveIt: { type: Type.STRING },
        giftVerdict: {
          type: Type.OBJECT,
          required: [
            'editorialAssessment',
            'standoutReason',
            'recipientDelight',
            'importantCaveat',
          ],
          properties: {
            editorialAssessment: { type: Type.STRING },
            standoutReason: { type: Type.STRING },
            recipientDelight: { type: Type.STRING },
            importantCaveat: { type: Type.STRING },
          },
        },
        idealRecipientProfile: {
          type: Type.OBJECT,
          required: [
            'headline',
            'narrative',
            'lifestyleNotes',
            'relationshipFit',
          ],
          properties: {
            headline: { type: Type.STRING },
            narrative: { type: Type.STRING },
            lifestyleNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            relationshipFit: { type: Type.STRING },
          },
        },
        extendedGiftRationale: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        buyingConsiderationsList: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ['title', 'detail', 'importance'],
            properties: {
              title: { type: Type.STRING },
              detail: { type: Type.STRING },
              importance: {
                type: Type.STRING,
                enum: ['high', 'medium', 'contextual'],
              },
            },
          },
        },
        occasionContextNotes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ['occasion', 'note'],
            properties: {
              occasion: {
                type: Type.STRING,
                enum: ALLOWED_OCCASIONS,
              },
              note: { type: Type.STRING },
            },
          },
        },
      },
    },
  });

  const fullPolished: Record<string, any> = {
    whyToGiveIt: String(parsed.whyToGiveIt || '').trim().slice(0, 650),
    giftVerdict: {
      _type: 'productGiftVerdict',
      editorialAssessment: String(
        parsed.giftVerdict?.editorialAssessment || ''
      )
        .trim()
        .slice(0, 600),
      standoutReason: String(parsed.giftVerdict?.standoutReason || '')
        .trim()
        .slice(0, 380),
      recipientDelight: String(parsed.giftVerdict?.recipientDelight || '')
        .trim()
        .slice(0, 380),
      importantCaveat: String(parsed.giftVerdict?.importantCaveat || '')
        .trim()
        .slice(0, 340),
    },
    idealRecipientProfile: {
      _type: 'productRecipientProfile',
      headline: String(parsed.idealRecipientProfile?.headline || '')
        .trim()
        .slice(0, 120),
      narrative: String(parsed.idealRecipientProfile?.narrative || '')
        .trim()
        .slice(0, 550),
      lifestyleNotes: Array.isArray(parsed.idealRecipientProfile?.lifestyleNotes)
        ? parsed.idealRecipientProfile.lifestyleNotes
            .map((n: any) => String(n || '').trim())
            .filter(Boolean)
            .slice(0, 5)
        : [],
      relationshipFit: String(
        parsed.idealRecipientProfile?.relationshipFit || ''
      )
        .trim()
        .slice(0, 280),
    },
    extendedGiftRationale: Array.isArray(parsed.extendedGiftRationale)
      ? parsed.extendedGiftRationale
          .map((p: any) => String(p || '').trim())
          .filter(Boolean)
          .slice(0, 4)
      : [],
    buyingConsiderationsList: Array.isArray(parsed.buyingConsiderationsList)
      ? parsed.buyingConsiderationsList
          .filter((item: any) => item && item.title && item.detail)
          .slice(0, 6)
          .map((item: any, idx: number) => ({
            _type: 'productBuyingConsideration' as const,
            _key: `bc_${String(idx + 1).padStart(2, '0')}`,
            title: String(item.title).trim().slice(0, 90),
            detail: String(item.detail).trim().slice(0, 360),
            importance: (['high', 'medium', 'contextual'].includes(
              item.importance
            )
              ? item.importance
              : 'medium') as 'high' | 'medium' | 'contextual',
          }))
      : [],
    occasionContextNotes: Array.isArray(parsed.occasionContextNotes)
      ? parsed.occasionContextNotes
          .filter(
            (item: any) =>
              item && ALLOWED_OCCASIONS.includes(item.occasion) && item.note
          )
          .slice(0, 4)
          .map((item: any, idx: number) => ({
            _type: 'productOccasionNote' as const,
            _key: `oc_${String(idx + 1).padStart(2, '0')}`,
            occasion: item.occasion,
            note: String(item.note).trim().slice(0, 280),
          }))
      : [],
  };

  const editorialLabels: Record<string, string> = {
    whyToGiveIt: 'Why to Give It (Editorial Hook)',
    giftVerdict: 'Four-Part Gift Verdict',
    idealRecipientProfile: 'Ideal Recipient Profile (Who It Suits Best)',
    extendedGiftRationale: 'Extended Gift Rationale (Editorial Paragraphs)',
    buyingConsiderationsList: 'Practical Buying Considerations',
    occasionContextNotes: 'Occasion Fit & Presentation Notes',
  };

  const keysToInclude =
    targetSection === 'all_editorial'
      ? Object.keys(editorialLabels)
      : [targetSection];

  const originalFields: Record<string, any> = {};
  const proposedFields: Record<string, any> = {};
  const fieldDiffs: ProposedFieldDiff[] = [];

  for (const key of keysToInclude) {
    originalFields[key] = (currentEditorialSnapshot as Record<string, any>)[key];
    proposedFields[key] = fullPolished[key];
    fieldDiffs.push({
      field: key,
      label: editorialLabels[key] || key,
      category: 'editorial',
      previousValue: originalFields[key],
      proposedValue: proposedFields[key],
      hasExistingContent: isNonEmptyValue(originalFields[key]),
    });
  }

  const candidateDoc = {
    ...currentDoc,
    ...proposedFields,
    _id: currentDoc._id || 'drafts.prod_editorial_polish_preview',
    _type: 'product',
  };
  const schemaCheck = validateDocumentWithSchema(productDocument, candidateDoc);
  const targetSet = new Set(keysToInclude);
  const validationIssues = [
    ...schemaCheck.errors
      .filter((e) => targetSet.has(e.path.split('.')[0]))
      .map((e) => ({
        path: e.path,
        message: e.message,
        level: 'error' as const,
      })),
    ...schemaCheck.warnings
      .filter((w) => targetSet.has(w.path.split('.')[0]))
      .map((w) => ({
        path: w.path,
        message: w.message,
        level: 'warning' as const,
      })),
  ];

  return {
    ok: true,
    action,
    targetSection,
    modelUsed: modelToUse,
    writingProfileUsed: {
      profileId: profile.profileId,
      name: profile.name,
    },
    centralObservation: String(parsed.centralObservation || '').trim(),
    rationaleSummary: String(parsed.rationaleSummary || '').trim(),
    originalFields,
    proposedFields,
    fieldDiffs,
    validationIssues,
    message: `Prepared "${action}" editorial revision for ${
      targetSection === 'all_editorial' ? 'all editorial sections' : targetSection
    } using "${profile.name}".`,
  };
}
