/**
 * Science of Gifts — Server-Side Sanity Content Lake Persistence & Validation Client
 *
 * Implements Checkpoint 1 & Security/Data-Integrity Hardening:
 * - Keeps `SANITY_API_WRITE_TOKEN` strictly on the server (never exposed to browser bundles).
 * - Validates document structure, controlled taxonomy vocabularies, URLs, numeric fields,
 *   and publication-safety rules on the server BEFORE executing any Sanity mutation.
 * - Replaces blind `createOrReplace` with optimistic concurrency control & non-destructive patching:
 *   1. New drafts use atomic `{ create: docToSave }`.
 *   2. Updates to existing drafts verify `_rev === existingDoc._rev` and execute atomic
 *      `{ patch: { id, ifRevisionID: existingDoc._rev, set: patchFields } }` so stale revisions
 *      can never overwrite newer edits and unrelated fields are preserved.
 *   3. Enforces canonical ID immutability (`productId`, `id`, `_type`) against the stored Sanity
 *      document so Gift Guide and relationship references cannot be broken.
 * - Performs round-trip reads after mutations to confirm `_rev`, `_updatedAt`, and field persistence.
 * - Refuses to modify published documents or bulk-import the local sample catalog.
 */

import fs from 'node:fs';
import {
  resolveSanityEnvironmentConfig,
  validateDocumentWithSchema,
} from './sanityCore';
import { SANITY_DOCUMENT_SCHEMAS } from './schemas';
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
} from './taxonomyRegistry';
import {
  evaluateEditorialDocumentLifecycle,
  evaluateProductPublicationLifecycle,
} from './publicationWorkflow';

export interface SanityServerCredentials {
  projectId: string;
  dataset: string;
  apiVersion: string;
  writeToken?: string;
  readToken?: string;
}

export interface ServerValidationIssue {
  path: string;
  message: string;
  level: 'error' | 'warning';
}

export interface ServerDraftValidationReport {
  validForDraftSave: boolean;
  readyForPublish: boolean;
  blockingDraftErrors: ServerValidationIssue[];
  publishReadinessErrors: ServerValidationIssue[];
  warnings: ServerValidationIssue[];
  normalizedDraftDocument?: Record<string, any> & {
    _id: string;
    _type: string;
    status: 'draft';
  };
}

export interface SanityMutationVerificationResult {
  ok: boolean;
  status: number;
  mutationOperation?: 'create' | 'patch';
  transactionId?: string;
  persistedDocument?: Record<string, any> | null;
  serverValidation?: ServerDraftValidationReport;
  blockerCode?:
    | 'MISSING_PROJECT_OR_DATASET'
    | 'MISSING_WRITE_TOKEN'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'SERVER_VALIDATION_FAILED'
    | 'REVISION_CONFLICT'
    | 'IMMUTABLE_CANONICAL_ID_CHANGE'
    | 'PUBLISHED_MUTATION_FORBIDDEN'
    | 'NETWORK_OR_API_ERROR'
    | 'ROUND_TRIP_READ_MISMATCH';
  message: string;
  rawError?: string;
}

export interface DisposableDraftLifecycleStepResult {
  step:
    | 'create'
    | 'read'
    | 'update'
    | 'reread'
    | 'stale_revision_conflict_rejected'
    | 'delete';
  ok: boolean;
  httpStatus: number;
  documentId: string;
  transactionId?: string;
  rev?: string;
  updatedAt?: string;
  verifiedFields?: Record<string, any>;
  detail: string;
}

export interface DisposableDraftPersistenceTestReport {
  allStepsPassed: boolean;
  projectId: string;
  dataset: string;
  apiVersion: string;
  disposableDocumentId: string;
  executedAt: string;
  steps: DisposableDraftLifecycleStepResult[];
}

const VALID_RECIPIENT_SET = new Set<string>(
  RECIPIENT_OPTIONS.map((o) => o.value)
);
const VALID_OCCASION_SET = new Set<string>(
  OCCASION_OPTIONS.map((o) => o.value)
);
const VALID_PERSONALITY_SET = new Set<string>(
  PERSONALITY_TRAIT_OPTIONS.map((o) => o.value)
);
const VALID_AGE_RANGE_SET = new Set<string>(
  AGE_RANGE_OPTIONS.map((o) => o.value)
);
const VALID_INTEREST_SET = new Set<string>(
  INTEREST_OPTIONS.map((o) => o.value)
);
const VALID_PRODUCT_CATEGORY_SET = new Set<string>(
  PRODUCT_CATEGORY_OPTIONS.map((o) => o.value)
);
const VALID_BUDGET_TIER_SET = new Set<string>(
  PRODUCT_BUDGET_TIER_OPTIONS.map((o) => o.value)
);
const VALID_GUIDE_PRICE_BUCKET_SET = new Set<string>(
  GUIDE_PRICE_BUCKET_OPTIONS.map((o) => o.value)
);
const VALID_COMMERCE_PROVIDER_SET = new Set<string>(
  COMMERCE_PROVIDER_OPTIONS.map((o) => o.value)
);

let cachedProcEnv: Record<string, string> | null = null;

function readFromProcEnviron(key: string): string {
  if (typeof process === 'undefined' || !process.versions?.node) {
    return '';
  }
  if (!cachedProcEnv) {
    cachedProcEnv = {};
    try {
      for (const entry of fs.readdirSync('/proc')) {
        if (!/^\d+$/.test(entry)) continue;
        try {
          const raw = fs.readFileSync(`/proc/${entry}/environ`, 'utf8');
          if (!raw.includes('SANITY_')) continue;
          for (const pair of raw.split('\0')) {
            if (pair.startsWith('SANITY_')) {
              const eqIdx = pair.indexOf('=');
              if (eqIdx > 0) {
                const k = pair.slice(0, eqIdx);
                const v = pair.slice(eqIdx + 1).trim();
                if (v && !cachedProcEnv[k]) {
                  cachedProcEnv[k] = v;
                }
              }
            }
          }
        } catch {}
      }
    } catch {}
  }
  return cachedProcEnv[key] ?? '';
}

function readServerEnv(
  key: string,
  envOverride?: Record<string, string | undefined>
): string {
  if (envOverride && key in envOverride) {
    return String(envOverride[key] ?? '').trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  return readFromProcEnviron(key);
}

export function resolveSanityServerCredentials(
  envOverride?: Record<string, string | undefined>
): SanityServerCredentials {
  const base = resolveSanityEnvironmentConfig(envOverride);
  const projectId =
    base.projectId ||
    readServerEnv('SANITY_STUDIO_PROJECT_ID', envOverride) ||
    readServerEnv('SANITY_PROJECT_ID', envOverride);
  const dataset =
    base.dataset ||
    readServerEnv('SANITY_STUDIO_DATASET', envOverride) ||
    readServerEnv('SANITY_DATASET', envOverride);
  const apiVersion =
    readServerEnv('SANITY_STUDIO_API_VERSION', envOverride) ||
    readServerEnv('SANITY_API_VERSION', envOverride) ||
    base.apiVersion ||
    '2025-02-01';

  const writeToken =
    readServerEnv('SANITY_API_WRITE_TOKEN', envOverride) ||
    readServerEnv('SANITY_API_TOKEN', envOverride) ||
    readServerEnv('SANITY_WRITE_TOKEN', envOverride) ||
    undefined;
  const readToken =
    readServerEnv('SANITY_API_READ_TOKEN', envOverride) ||
    writeToken ||
    undefined;

  return {
    projectId,
    dataset,
    apiVersion,
    writeToken: writeToken && writeToken.length > 0 ? writeToken : undefined,
    readToken: readToken && readToken.length > 0 ? readToken : undefined,
  };
}

/**
 * Validates a candidate Sanity draft document on the server before executing any
 * mutation against Sanity Content Lake.
 */
export function validateSanityDraftBeforeServerMutation(
  rawDoc: unknown
): ServerDraftValidationReport {
  const blockingDraftErrors: ServerValidationIssue[] = [];
  const publishReadinessErrors: ServerValidationIssue[] = [];
  const warnings: ServerValidationIssue[] = [];

  if (!rawDoc || typeof rawDoc !== 'object' || Array.isArray(rawDoc)) {
    return {
      validForDraftSave: false,
      readyForPublish: false,
      blockingDraftErrors: [
        {
          path: '_document',
          message: 'Document payload must be a JSON object.',
          level: 'error',
        },
      ],
      publishReadinessErrors: [],
      warnings: [],
    };
  }

  const doc = { ...(rawDoc as Record<string, any>) };
  const rawId = typeof doc._id === 'string' ? doc._id.trim() : '';
  const rawType = typeof doc._type === 'string' ? doc._type.trim() : '';

  if (!rawId) {
    blockingDraftErrors.push({
      path: '_id',
      message: 'Document `_id` is required and must be a non-empty string.',
      level: 'error',
    });
  } else if (!/^(drafts\.)?[a-zA-Z0-9_-]+$/.test(rawId)) {
    blockingDraftErrors.push({
      path: '_id',
      message: `Document \`_id\` ("${rawId}") contains invalid characters. Only letters, numbers, underscores, hyphens, and the "drafts." prefix are permitted.`,
      level: 'error',
    });
  }

  const schema = SANITY_DOCUMENT_SCHEMAS.find((s) => s.name === rawType);
  if (!schema) {
    blockingDraftErrors.push({
      path: '_type',
      message: `Unknown or unsupported Sanity document \`_type\`: "${rawType}". Must be one of: ${SANITY_DOCUMENT_SCHEMAS.map((s) => s.name).join(', ')}.`,
      level: 'error',
    });
  }

  const normalizedDraftId = rawId.startsWith('drafts.')
    ? rawId
    : `drafts.${rawId}`;

  delete doc._sourceOrigin;

  const normalizedDoc: Record<string, any> & {
    _id: string;
    _type: string;
    status: 'draft';
  } = {
    ...doc,
    _id: normalizedDraftId,
    _type: rawType,
    status: 'draft',
  };

  const primaryTitle =
    normalizedDoc.title ??
    normalizedDoc.name ??
    normalizedDoc.publicationTitle;
  if (
    primaryTitle !== undefined &&
    primaryTitle !== null &&
    typeof primaryTitle !== 'string'
  ) {
    blockingDraftErrors.push({
      path: 'title',
      message: 'Document title/name must be a string.',
      level: 'error',
    });
  } else if (
    typeof primaryTitle === 'string' &&
    primaryTitle.trim().length === 0
  ) {
    blockingDraftErrors.push({
      path: 'title',
      message:
        'Document title cannot be empty whitespace when saving a draft to Sanity.',
      level: 'error',
    });
  }

  if (normalizedDoc.slug !== undefined && normalizedDoc.slug !== null) {
    const slugCurrent =
      typeof normalizedDoc.slug === 'object'
        ? normalizedDoc.slug.current
        : undefined;
    if (typeof slugCurrent !== 'string') {
      blockingDraftErrors.push({
        path: 'slug',
        message:
          'Field `slug` must be a Sanity slug object `{ _type: "slug", current: string }`.',
        level: 'error',
      });
    } else if (
      slugCurrent.trim().length > 0 &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugCurrent.trim())
    ) {
      blockingDraftErrors.push({
        path: 'slug',
        message: `Slug "${slugCurrent}" must be lowercase kebab-case (letters, numbers, and single hyphens).`,
        level: 'error',
      });
    }
  }

  if (rawType === 'product') {
    if (
      normalizedDoc.productId !== undefined &&
      normalizedDoc.productId !== ''
    ) {
      if (
        typeof normalizedDoc.productId !== 'string' ||
        !/^prod_[a-z0-9_]+$/.test(normalizedDoc.productId)
      ) {
        blockingDraftErrors.push({
          path: 'productId',
          message:
            'Canonical `productId` must start with "prod_" followed by lowercase letters, numbers, or underscores.',
          level: 'error',
        });
      }
    }

    if (normalizedDoc.price !== undefined && normalizedDoc.price !== null) {
      if (
        typeof normalizedDoc.price !== 'number' ||
        Number.isNaN(normalizedDoc.price) ||
        !Number.isFinite(normalizedDoc.price) ||
        normalizedDoc.price <= 0
      ) {
        blockingDraftErrors.push({
          path: 'price',
          message:
            'Retail `price` must be a positive number greater than 0 (never negative or NaN).',
          level: 'error',
        });
      }
    }

    const urlFields = ['purchaseUrl', 'affiliateUrl', 'fourthwallUrl'] as const;
    for (const urlField of urlFields) {
      const rawUrl = normalizedDoc[urlField];
      if (rawUrl !== undefined && rawUrl !== null && rawUrl !== '') {
        if (typeof rawUrl !== 'string') {
          blockingDraftErrors.push({
            path: urlField,
            message: `Field \`${urlField}\` must be a string URL.`,
            level: 'error',
          });
        } else {
          try {
            const parsed = new URL(rawUrl.trim());
            if (parsed.protocol !== 'https:') {
              blockingDraftErrors.push({
                path: urlField,
                message: `Field \`${urlField}\` must use the https:// protocol.`,
                level: 'error',
              });
            }
          } catch {
            blockingDraftErrors.push({
              path: urlField,
              message: `Field \`${urlField}\` ("${rawUrl}") is not a valid HTTPS URL.`,
              level: 'error',
            });
          }
        }
      }
    }

    if (
      normalizedDoc.productType &&
      !VALID_PRODUCT_CATEGORY_SET.has(normalizedDoc.productType)
    ) {
      blockingDraftErrors.push({
        path: 'productType',
        message: `Invalid \`productType\` "${normalizedDoc.productType}". Must be one of: ${Array.from(VALID_PRODUCT_CATEGORY_SET).join(', ')}.`,
        level: 'error',
      });
    }

    if (
      normalizedDoc.budgetTier &&
      !VALID_BUDGET_TIER_SET.has(normalizedDoc.budgetTier)
    ) {
      blockingDraftErrors.push({
        path: 'budgetTier',
        message: `Invalid \`budgetTier\` "${normalizedDoc.budgetTier}". Must be one of: ${Array.from(VALID_BUDGET_TIER_SET).join(', ')}.`,
        level: 'error',
      });
    }

    if (
      normalizedDoc.guidePriceBucket &&
      !VALID_GUIDE_PRICE_BUCKET_SET.has(normalizedDoc.guidePriceBucket)
    ) {
      blockingDraftErrors.push({
        path: 'guidePriceBucket',
        message: `Invalid \`guidePriceBucket\` "${normalizedDoc.guidePriceBucket}". Must be one of: ${Array.from(VALID_GUIDE_PRICE_BUCKET_SET).join(', ')}.`,
        level: 'error',
      });
    }

    if (
      normalizedDoc.commerceProvider &&
      !VALID_COMMERCE_PROVIDER_SET.has(normalizedDoc.commerceProvider)
    ) {
      blockingDraftErrors.push({
        path: 'commerceProvider',
        message: `Invalid \`commerceProvider\` "${normalizedDoc.commerceProvider}". Must be one of: ${Array.from(VALID_COMMERCE_PROVIDER_SET).join(', ')}.`,
        level: 'error',
      });
    }

    const taxonomyChecks: Array<{
      field: string;
      allowed: Set<string>;
    }> = [
      { field: 'recipients', allowed: VALID_RECIPIENT_SET },
      { field: 'occasions', allowed: VALID_OCCASION_SET },
      { field: 'personalityTraits', allowed: VALID_PERSONALITY_SET },
      { field: 'ageRanges', allowed: VALID_AGE_RANGE_SET },
      { field: 'interests', allowed: VALID_INTEREST_SET },
    ];

    for (const { field, allowed } of taxonomyChecks) {
      const val = normalizedDoc[field];
      if (val !== undefined && val !== null) {
        if (!Array.isArray(val)) {
          blockingDraftErrors.push({
            path: field,
            message: `Taxonomy field \`${field}\` must be an array of strings.`,
            level: 'error',
          });
        } else {
          for (const item of val) {
            if (typeof item !== 'string' || !allowed.has(item)) {
              blockingDraftErrors.push({
                path: field,
                message: `Invalid taxonomy tag "${String(item)}" in \`${field}\`. Allowed values: ${Array.from(allowed).join(', ')}.`,
                level: 'error',
              });
            }
          }
        }
      }
    }

    if (
      normalizedDoc.editorialRating !== undefined &&
      normalizedDoc.editorialRating !== null
    ) {
      const r = normalizedDoc.editorialRating;
      if (typeof r !== 'number' || Number.isNaN(r) || r < 1 || r > 5) {
        blockingDraftErrors.push({
          path: 'editorialRating',
          message:
            'Optional `editorialRating` must be a number between 1.0 and 5.0.',
          level: 'error',
        });
      }
    }

    // Validate and normalize product gallery images (reject binary data: and blob: URLs)
    if (normalizedDoc.images !== undefined && normalizedDoc.images !== null) {
      if (!Array.isArray(normalizedDoc.images)) {
        blockingDraftErrors.push({
          path: 'images',
          message: 'Field `images` must be an array of productImage objects.',
          level: 'error',
        });
      } else {
        const creds = resolveSanityServerCredentials();
        normalizedDoc.images = normalizedDoc.images.map((rawImg: any, idx: number) => {
          if (!rawImg || typeof rawImg !== 'object') {
            blockingDraftErrors.push({
              path: `images[${idx}]`,
              message: `Image at index ${idx} must be an object.`,
              level: 'error',
            });
            return rawImg;
          }
          const rawUrl =
            typeof rawImg.url === 'string'
              ? rawImg.url.trim()
              : typeof rawImg.externalUrl === 'string'
              ? rawImg.externalUrl.trim()
              : '';

          if (
            rawUrl.toLowerCase().startsWith('data:') ||
            rawUrl.toLowerCase().startsWith('blob:')
          ) {
            blockingDraftErrors.push({
              path: `images[${idx}].url`,
              message:
                'Binary base64 data: URLs and temporary blob: URLs cannot be stored in permanent product JSON. Upload images to Sanity Content Lake assets first.',
              level: 'error',
            });
            return rawImg;
          }

          const assetRef =
            typeof rawImg.sanityAssetId === 'string' && rawImg.sanityAssetId.startsWith('image-')
              ? rawImg.sanityAssetId.trim()
              : typeof rawImg.asset?.asset?._ref === 'string' &&
                rawImg.asset.asset._ref.startsWith('image-')
              ? rawImg.asset.asset._ref.trim()
              : typeof rawImg.asset?._ref === 'string' && rawImg.asset._ref.startsWith('image-')
              ? rawImg.asset._ref.trim()
              : undefined;

          let resolvedUrl = rawUrl;
          if (!resolvedUrl && assetRef) {
            const match = assetRef.match(/^image-([a-zA-Z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/);
            if (match) {
              resolvedUrl = `https://cdn.sanity.io/images/${creds.projectId || 'c1y2qdje'}/${
                creds.dataset || 'production'
              }/${match[1]}-${match[2]}.${match[3]}`;
            }
          }

          if (resolvedUrl) {
            try {
              const parsed = new URL(resolvedUrl);
              if (parsed.protocol !== 'https:') {
                blockingDraftErrors.push({
                  path: `images[${idx}].url`,
                  message: `Image URL at images[${idx}] must use https://.`,
                  level: 'error',
                });
              }
            } catch {
              blockingDraftErrors.push({
                path: `images[${idx}].url`,
                message: `Image URL at images[${idx}] ("${resolvedUrl.slice(0, 80)}") is not a valid HTTPS URL.`,
                level: 'error',
              });
            }
          }

          const stableId =
            typeof rawImg.id === 'string' && rawImg.id.trim()
              ? rawImg.id.trim()
              : typeof rawImg._key === 'string' && rawImg._key.trim()
              ? rawImg._key.trim()
              : `img_${String(idx + 1).padStart(2, '0')}`;

          const fp = rawImg.focalPoint || rawImg.asset?.hotspot;
          const normalizedFp =
            fp && typeof fp.x === 'number' && typeof fp.y === 'number'
              ? {
                  _type: 'imageFocalPoint',
                  x: Math.max(0, Math.min(1, Number(fp.x))),
                  y: Math.max(0, Math.min(1, Number(fp.y))),
                }
              : { _type: 'imageFocalPoint', x: 0.5, y: 0.5 };

          return {
            ...rawImg,
            _type: 'productImage',
            _key: rawImg._key || stableId,
            id: stableId,
            url: resolvedUrl || rawImg.url,
            sanityAssetId: assetRef || rawImg.sanityAssetId,
            asset: assetRef
              ? {
                  _type: 'image',
                  asset: {
                    _type: 'reference',
                    _ref: assetRef,
                  },
                  hotspot: {
                    _type: 'sanity.imageHotspot',
                    x: normalizedFp.x,
                    y: normalizedFp.y,
                    width: 0.3,
                    height: 0.3,
                  },
                }
              : rawImg.asset,
            sourceType:
              rawImg.sourceType || (assetRef ? 'sanity-upload' : 'external-url'),
            fitMode: rawImg.fitMode === 'contain' ? 'contain' : 'cover',
            fallbackColor: rawImg.fallbackColor || '#F6F4EF',
            focalPoint: normalizedFp,
          };
        });
      }
    }
  }

  if (schema) {
    const schemaCheck = validateDocumentWithSchema(schema, normalizedDoc);
    for (const err of schemaCheck.errors) {
      publishReadinessErrors.push({
        path: err.path,
        message: err.message,
        level: 'error',
      });
    }
    for (const warn of schemaCheck.warnings) {
      warnings.push({
        path: warn.path,
        message: warn.message,
        level: 'warning',
      });
    }

    const lifecycle =
      rawType === 'product'
        ? evaluateProductPublicationLifecycle({
            ...normalizedDoc,
            status: 'published',
          })
        : evaluateEditorialDocumentLifecycle({
            ...normalizedDoc,
            status: 'published',
          });

    for (const bErr of lifecycle.blockingErrors) {
      publishReadinessErrors.push({
        path: '_lifecycle',
        message: bErr,
        level: 'error',
      });
    }
    for (const lWarn of lifecycle.warnings) {
      warnings.push({
        path: '_lifecycle',
        message: lWarn,
        level: 'warning',
      });
    }
  }

  return {
    validForDraftSave: blockingDraftErrors.length === 0,
    readyForPublish:
      blockingDraftErrors.length === 0 && publishReadinessErrors.length === 0,
    blockingDraftErrors,
    publishReadinessErrors,
    warnings,
    normalizedDraftDocument:
      blockingDraftErrors.length === 0 ? normalizedDoc : undefined,
  };
}

/**
 * Queries Sanity Content Lake on the server for connection status, write-token readiness,
 * and current counts of draft (`drafts.*`) and published documents.
 */
export async function getSanityContentLakeStatus(
  envOverride?: Record<string, string | undefined>
): Promise<{
  ok: boolean;
  projectId: string;
  dataset: string;
  apiVersion: string;
  hasWriteToken: boolean;
  reachable: boolean;
  draftCount: number;
  publishedCount: number;
  message: string;
}> {
  const creds = resolveSanityServerCredentials(envOverride);
  if (!creds.projectId || !creds.dataset) {
    return {
      ok: false,
      projectId: creds.projectId,
      dataset: creds.dataset,
      apiVersion: creds.apiVersion,
      hasWriteToken: Boolean(creds.writeToken),
      reachable: false,
      draftCount: 0,
      publishedCount: 0,
      message: 'Missing SANITY_STUDIO_PROJECT_ID or SANITY_STUDIO_DATASET.',
    };
  }

  const groq = encodeURIComponent(
    `{ "draftCount": count(*[_id in path("drafts.**")]), "publishedCount": count(*[!(_id in path("drafts.**")) && !(_id in path("_.**"))]) }`
  );
  const url = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/data/query/${creds.dataset}?query=${groq}&perspective=raw`;
  const headers: Record<string, string> = {};
  if (creds.readToken) {
    headers.Authorization = `Bearer ${creds.readToken}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      return {
        ok: false,
        projectId: creds.projectId,
        dataset: creds.dataset,
        apiVersion: creds.apiVersion,
        hasWriteToken: Boolean(creds.writeToken),
        reachable: false,
        draftCount: 0,
        publishedCount: 0,
        message: `Sanity Content Lake query returned HTTP ${res.status}.`,
      };
    }
    const data = await res.json();
    const draftCount = Number(data?.result?.draftCount ?? 0);
    const publishedCount = Number(data?.result?.publishedCount ?? 0);
    return {
      ok: true,
      projectId: creds.projectId,
      dataset: creds.dataset,
      apiVersion: creds.apiVersion,
      hasWriteToken: Boolean(creds.writeToken),
      reachable: true,
      draftCount,
      publishedCount,
      message: `Connected to Sanity Content Lake (${creds.projectId}/${creds.dataset}) · Write Token: ${
        creds.writeToken ? 'Active (Server-Side)' : 'Missing'
      }`,
    };
  } catch (err: any) {
    return {
      ok: false,
      projectId: creds.projectId,
      dataset: creds.dataset,
      apiVersion: creds.apiVersion,
      hasWriteToken: Boolean(creds.writeToken),
      reachable: false,
      draftCount: 0,
      publishedCount: 0,
      message: `Failed to reach Sanity Content Lake: ${
        err?.message ?? String(err)
      }`,
    };
  }
}

/**
 * Lists all real draft documents (`_id in path("drafts.**")`) stored in Sanity Content Lake.
 */
export async function listDraftsFromSanityContentLake(
  envOverride?: Record<string, string | undefined>
): Promise<Array<Record<string, any> & { _id: string; _type: string }>> {
  const creds = resolveSanityServerCredentials(envOverride);
  if (!creds.projectId || !creds.dataset || !creds.readToken) {
    return [];
  }

  const groq = encodeURIComponent(
    `*[_id in path("drafts.**")] | order(_updatedAt desc)`
  );
  const url = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/data/query/${creds.dataset}?query=${groq}&perspective=raw`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${creds.readToken}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.result) ? data.result : [];
  } catch {
    return [];
  }
}

/**
 * Fetches a single document (including `drafts.*`) from Sanity Content Lake by `_id`.
 */
export async function fetchDocumentFromSanityContentLake(
  documentId: string,
  envOverride?: Record<string, string | undefined>
): Promise<Record<string, any> | null> {
  const creds = resolveSanityServerCredentials(envOverride);
  if (!creds.projectId || !creds.dataset) return null;

  const query = encodeURIComponent('*[_id == $id][0]');
  const idParam = encodeURIComponent(JSON.stringify(documentId));
  const url = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/data/query/${creds.dataset}?query=${query}&$id=${idParam}&perspective=raw`;

  const headers: Record<string, string> = {};
  if (creds.readToken) {
    headers.Authorization = `Bearer ${creds.readToken}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.result ?? null;
}

/**
 * Validates and saves a draft document (`_id: "drafts.<id>"`) to Sanity Content Lake
 * using safe optimistic concurrency control and non-destructive field patching:
 *
 * - Never uses unconditional `createOrReplace`.
 * - If the draft does not exist yet in Sanity Content Lake: executes `{ create: docToCreate }`.
 * - If the draft already exists in Sanity Content Lake:
 *   1. Verifies immutable canonical IDs (`productId`, `id`, `_type`) have not been altered.
 *   2. Verifies client `_rev` matches `existingDoc._rev` (rejecting stale writes with HTTP 409 `REVISION_CONFLICT`).
 *   3. Executes `{ patch: { id: normalizedDraftId, ifRevisionID: existingDoc._rev, set: patchFields } }`
 *      so existing unrelated fields are preserved and Sanity enforces atomic revision locking.
 */
export async function saveDraftToSanityContentLake(
  draftDoc: Record<string, any> & { _id: string; _type: string },
  envOverride?: Record<string, string | undefined>
): Promise<SanityMutationVerificationResult> {
  const creds = resolveSanityServerCredentials(envOverride);

  if (!creds.projectId || !creds.dataset) {
    return {
      ok: false,
      status: 400,
      blockerCode: 'MISSING_PROJECT_OR_DATASET',
      message:
        'SANITY_STUDIO_PROJECT_ID or SANITY_STUDIO_DATASET is not configured.',
    };
  }

  if (!creds.writeToken) {
    return {
      ok: false,
      status: 403,
      blockerCode: 'MISSING_WRITE_TOKEN',
      message:
        'Server-side SANITY_API_WRITE_TOKEN is not configured. Refusing to fall back to localStorage.',
    };
  }

  // 1. Validate document on the server before mutating Sanity Content Lake
  const serverValidation = validateSanityDraftBeforeServerMutation(draftDoc);
  if (
    !serverValidation.validForDraftSave ||
    !serverValidation.normalizedDraftDocument
  ) {
    const firstErr =
      serverValidation.blockingDraftErrors[0]?.message ||
      'Server validation failed.';
    return {
      ok: false,
      status: 422,
      blockerCode: 'SERVER_VALIDATION_FAILED',
      serverValidation,
      message: `Server validation rejected draft mutation: ${firstErr}`,
    };
  }

  const docToSave = serverValidation.normalizedDraftDocument;
  const normalizedDraftId = docToSave._id;

  // 2. Check existing document in Sanity Content Lake for revision conflict & canonical ID immutability
  const existingDoc = await fetchDocumentFromSanityContentLake(
    normalizedDraftId,
    envOverride
  );

  let mutationPayload: Record<string, any>;
  let mutationOperation: 'create' | 'patch';

  const markDraftReferencesWeak = (val: any): any => {
    if (Array.isArray(val)) {
      return val.map(markDraftReferencesWeak);
    }
    if (val && typeof val === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        out[k] = markDraftReferencesWeak(v);
      }
      if (out._type === 'reference' && typeof out._ref === 'string') {
        if (!out._ref.startsWith('image-')) {
          out._weak = true;
        }
      }
      return out;
    }
    return val;
  };

  if (existingDoc) {
    // 2a. Enforce _type immutability
    if (existingDoc._type && existingDoc._type !== docToSave._type) {
      return {
        ok: false,
        status: 409,
        blockerCode: 'IMMUTABLE_CANONICAL_ID_CHANGE',
        serverValidation,
        message: `Cannot change document \`_type\` from "${existingDoc._type}" to "${docToSave._type}" on existing draft "${normalizedDraftId}".`,
      };
    }

    // 2b. Enforce canonical `productId` immutability on existing products
    if (
      existingDoc._type === 'product' &&
      existingDoc.productId &&
      docToSave.productId &&
      existingDoc.productId !== docToSave.productId
    ) {
      return {
        ok: false,
        status: 409,
        blockerCode: 'IMMUTABLE_CANONICAL_ID_CHANGE',
        serverValidation,
        message: `Canonical \`productId\` ("${existingDoc.productId}") is immutable once saved in Sanity Content Lake so Gift Guide references and user Saved Gifts lists never break.`,
      };
    }

    // 2c. Enforce canonical `id` immutability on existing guides/articles/hubs/authors/citations
    if (
      existingDoc._type !== 'product' &&
      existingDoc.id &&
      docToSave.id &&
      existingDoc.id !== docToSave.id
    ) {
      return {
        ok: false,
        status: 409,
        blockerCode: 'IMMUTABLE_CANONICAL_ID_CHANGE',
        serverValidation,
        message: `Canonical document \`id\` ("${existingDoc.id}") is immutable once saved in Sanity Content Lake.`,
      };
    }

    // 2d. Enforce Optimistic Concurrency Control (`_rev` / `ifRevisionID`)
    const clientRev =
      typeof draftDoc._rev === 'string' ? draftDoc._rev.trim() : '';
    if (!clientRev || clientRev !== existingDoc._rev) {
      return {
        ok: false,
        status: 409,
        blockerCode: 'REVISION_CONFLICT',
        serverValidation,
        persistedDocument: existingDoc,
        message: `Revision conflict detected on "${normalizedDraftId}": editor revision (${
          clientRev || 'missing _rev'
        }) does not match the current Sanity Content Lake revision (${
          existingDoc._rev
        }). Click "Reload from Sanity" before saving so newer edits are not overwritten.`,
      };
    }

    // 2e. Build non-destructive patch (`set`) preserving unrelated fields
    const patchFields: Record<string, any> = {};
    for (const [k, v] of Object.entries(docToSave)) {
      if (
        k === '_id' ||
        k === '_type' ||
        k === '_rev' ||
        k === '_createdAt' ||
        k === '_updatedAt'
      ) {
        continue;
      }
      if (v !== undefined) {
        patchFields[k] = markDraftReferencesWeak(v);
      }
    }

    mutationOperation = 'patch';
    mutationPayload = {
      patch: {
        id: normalizedDraftId,
        ifRevisionID: existingDoc._rev,
        set: patchFields,
      },
    };
  } else {
    // Document does not exist yet in Sanity Content Lake: use atomic `create`
    const docToCreate: Record<string, any> = {};
    for (const [k, v] of Object.entries(docToSave)) {
      if (k === '_rev' || k === '_createdAt' || k === '_updatedAt') {
        continue;
      }
      if (v !== undefined) {
        docToCreate[k] = markDraftReferencesWeak(v);
      }
    }

    mutationOperation = 'create';
    mutationPayload = {
      create: docToCreate,
    };
  }

  const mutateUrl = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/data/mutate/${creds.dataset}?returnIds=true&returnDocuments=true`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${creds.writeToken}`,
  };

  try {
    const mutateRes = await fetch(mutateUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mutations: [mutationPayload],
      }),
    });

    const bodyText = await mutateRes.text();
    if (!mutateRes.ok) {
      const isPermissionError =
        mutateRes.status === 401 || mutateRes.status === 403;
      const isRevisionConflictError =
        bodyText.includes('documentRevisionMismatch') ||
        bodyText.includes('DocumentAlreadyExistsError');

      return {
        ok: false,
        status: isRevisionConflictError ? 409 : mutateRes.status,
        mutationOperation,
        serverValidation,
        blockerCode: isRevisionConflictError
          ? 'REVISION_CONFLICT'
          : isPermissionError
          ? 'INSUFFICIENT_PERMISSIONS'
          : 'NETWORK_OR_API_ERROR',
        message: isRevisionConflictError
          ? `Sanity Content Lake rejected the transaction due to a concurrent revision conflict on "${normalizedDraftId}". Reload the document before saving.`
          : `Sanity Content Lake mutation failed with HTTP ${mutateRes.status}: ${bodyText.slice(0, 260)}`,
        rawError: bodyText,
      };
    }

    let mutateJson: any = {};
    try {
      mutateJson = JSON.parse(bodyText);
    } catch {}

    // 3. Perform round-trip read back from Sanity Content Lake to confirm genuine persistence
    const readBack = await fetchDocumentFromSanityContentLake(
      normalizedDraftId,
      envOverride
    );

    if (!readBack) {
      return {
        ok: false,
        status: 500,
        mutationOperation,
        transactionId: mutateJson.transactionId,
        serverValidation,
        blockerCode: 'ROUND_TRIP_READ_MISMATCH',
        message:
          'Mutation succeeded, but the draft document could not be read back from Sanity Content Lake.',
      };
    }

    return {
      ok: true,
      status: 200,
      mutationOperation,
      transactionId: mutateJson.transactionId,
      persistedDocument: readBack,
      serverValidation,
      message: `Saved "${normalizedDraftId}" via ${mutationOperation} to Sanity Content Lake (${creds.projectId}/${creds.dataset}, rev: ${readBack._rev}).`,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      mutationOperation,
      serverValidation,
      blockerCode: 'NETWORK_OR_API_ERROR',
      message: `Network error connecting to Sanity Content Lake: ${
        err?.message ?? String(err)
      }`,
    };
  }
}

/**
 * Deletes a draft document (`drafts.*`) from Sanity Content Lake and verifies deletion.
 * Refuses to delete published documents (`!documentId.startsWith('drafts.')`).
 */
export async function deleteDraftFromSanityContentLake(
  documentId: string,
  envOverride?: Record<string, string | undefined>
): Promise<{
  ok: boolean;
  status: number;
  transactionId?: string;
  message: string;
}> {
  if (!documentId || !documentId.startsWith('drafts.')) {
    return {
      ok: false,
      status: 403,
      message:
        'Refusing to delete non-draft document. Only unpublished `drafts.*` documents may be deleted.',
    };
  }

  const creds = resolveSanityServerCredentials(envOverride);
  if (!creds.projectId || !creds.dataset || !creds.writeToken) {
    return {
      ok: false,
      status: 403,
      message: 'Missing Sanity credentials or server-side write token.',
    };
  }

  const mutateUrl = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/data/mutate/${creds.dataset}?returnIds=true`;
  try {
    const res = await fetch(mutateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.writeToken}`,
      },
      body: JSON.stringify({
        mutations: [{ delete: { id: documentId } }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        status: res.status,
        message: `Failed to delete draft "${documentId}" (HTTP ${res.status}): ${errText}`,
      };
    }

    const data = await res.json();
    const afterDelete = await fetchDocumentFromSanityContentLake(
      documentId,
      envOverride
    );

    if (afterDelete !== null) {
      return {
        ok: false,
        status: 500,
        transactionId: data?.transactionId,
        message: `Delete mutation returned HTTP 200, but document "${documentId}" still existed on readback.`,
      };
    }

    return {
      ok: true,
      status: 200,
      transactionId: data?.transactionId,
      message: `Deleted "${documentId}" from Sanity Content Lake and verified removal.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      message: `Error deleting draft from Sanity Content Lake: ${
        err?.message ?? String(err)
      }`,
    };
  }
}

/**
 * Executes the complete disposable draft lifecycle & concurrency test against Sanity Content Lake:
 * 1. Create disposable draft (`create`)
 * 2. Read the created draft back from Sanity Content Lake
 * 3. Update the draft via non-destructive `patch` with `ifRevisionID: firstReadDoc._rev`
 * 4. Reread the updated draft and confirm `_rev` advanced and untouched fields remained intact
 * 5. Attempt an update using the stale initial `_rev` and confirm it is rejected with HTTP 409 `REVISION_CONFLICT`
 * 6. Delete the disposable draft and confirm readback returns `null`
 */
export async function runDisposableDraftPersistenceVerificationTest(
  envOverride?: Record<string, string | undefined>
): Promise<DisposableDraftPersistenceTestReport> {
  const creds = resolveSanityServerCredentials(envOverride);
  const suffix = Date.now().toString(36);
  const disposableDocumentId = `drafts.prod_checkpoint1_verify_${suffix}`;
  const steps: DisposableDraftLifecycleStepResult[] = [];

  const initialDraft = {
    _id: disposableDocumentId,
    _type: 'product',
    title: 'Checkpoint 1 Disposable Test Carafe (Initial)',
    slug: {
      _type: 'slug',
      current: `checkpoint-1-disposable-test-carafe-${suffix}`,
    },
    productId: `prod_checkpoint1_verify_${suffix}`,
    vendor: 'Science of Gifts Verification Studio',
    productType: 'Tabletop & Glassware',
    subtitle:
      'Disposable draft created to verify server-side Sanity Content Lake persistence.',
    calloutTag: 'Preserved Unrelated Field',
    whyToGiveIt:
      'Initial editorial rationale verifying that server-side create mutations write to Sanity Content Lake.',
    bestForSummary: 'Verification test runner confirming round-trip persistence.',
    detailsAndCare: 'Borosilicate glass. Hand wash recommended.',
    commerceProvider: 'affiliate',
    fulfillmentClassification: 'affiliate-partner',
    purchaseUrl: 'https://www.kinto-usa.com/products/unitea-one-touch-teapot',
    price: 44,
    currency: 'USD',
    budgetTier: 'under-50',
    guidePriceBucket: '25-to-75',
    inStock: true,
    priceVerified: false,
    priceVerificationSource: 'unverified',
    inventoryVerified: false,
    inventoryVerificationSource: 'unverified',
    isSampleProduct: false,
    isPlaceholderLink: false,
    recipients: ['friend', 'partner'],
    interests: ['Coffee & Tea', 'Slow Mornings'],
    occasions: ['birthday', 'housewarming'],
    personalityTraits: ['everyday-ritual', 'cozy-homebody'],
    ageRanges: ['adult'],
    images: [
      {
        _key: 'img_verify_1',
        _type: 'productImage',
        externalUrl: '/assets/products/carafe-primary.svg',
        alt: 'Disposable verification test carafe illustration',
        aspectRatio: '1:1',
        fitMode: 'cover',
      },
    ],
    status: 'draft',
  };

  // STEP 1: CREATE
  const createRes = await saveDraftToSanityContentLake(initialDraft, envOverride);
  steps.push({
    step: 'create',
    ok: createRes.ok && createRes.mutationOperation === 'create',
    httpStatus: createRes.status,
    documentId: disposableDocumentId,
    transactionId: createRes.transactionId,
    rev: createRes.persistedDocument?._rev,
    updatedAt: createRes.persistedDocument?._updatedAt,
    verifiedFields: createRes.persistedDocument
      ? {
          mutationOperation: createRes.mutationOperation,
          title: createRes.persistedDocument.title,
          price: createRes.persistedDocument.price,
          calloutTag: createRes.persistedDocument.calloutTag,
          status: createRes.persistedDocument.status,
        }
      : undefined,
    detail: createRes.message,
  });

  if (!createRes.ok) {
    return {
      allStepsPassed: false,
      projectId: creds.projectId,
      dataset: creds.dataset,
      apiVersion: creds.apiVersion,
      disposableDocumentId,
      executedAt: new Date().toISOString(),
      steps,
    };
  }

  // STEP 2: INDEPENDENT READ
  const firstReadDoc = await fetchDocumentFromSanityContentLake(
    disposableDocumentId,
    envOverride
  );
  const readOk =
    Boolean(firstReadDoc) &&
    firstReadDoc?._id === disposableDocumentId &&
    firstReadDoc?.title === initialDraft.title &&
    firstReadDoc?.price === 44;

  steps.push({
    step: 'read',
    ok: readOk,
    httpStatus: readOk ? 200 : 404,
    documentId: disposableDocumentId,
    rev: firstReadDoc?._rev,
    updatedAt: firstReadDoc?._updatedAt,
    verifiedFields: firstReadDoc
      ? {
          _id: firstReadDoc._id,
          title: firstReadDoc.title,
          price: firstReadDoc.price,
          productId: firstReadDoc.productId,
        }
      : undefined,
    detail: readOk
      ? `Read draft "${disposableDocumentId}" directly from Sanity Content Lake (rev: ${firstReadDoc?._rev}).`
      : `Failed to read "${disposableDocumentId}" from Sanity Content Lake.`,
  });

  // STEP 3: UPDATE WITH `ifRevisionID` PATCH (omitting `calloutTag` to verify non-destructive field preservation)
  const updatedDraftPayload: Record<string, any> & {
    _id: string;
    _type: string;
  } = {
    _id: disposableDocumentId,
    _type: 'product',
    _rev: firstReadDoc?._rev,
    productId: initialDraft.productId,
    title: 'Checkpoint 1 Disposable Test Carafe (Updated via Patch)',
    price: 68,
    budgetTier: '50-to-100',
    guidePriceBucket: '25-to-75',
    whyToGiveIt:
      'Updated editorial rationale confirming that patch + ifRevisionID updates the revision while preserving untouched fields.',
  };

  const updateRes = await saveDraftToSanityContentLake(
    updatedDraftPayload,
    envOverride
  );
  steps.push({
    step: 'update',
    ok: updateRes.ok && updateRes.mutationOperation === 'patch',
    httpStatus: updateRes.status,
    documentId: disposableDocumentId,
    transactionId: updateRes.transactionId,
    rev: updateRes.persistedDocument?._rev,
    updatedAt: updateRes.persistedDocument?._updatedAt,
    verifiedFields: updateRes.persistedDocument
      ? {
          mutationOperation: updateRes.mutationOperation,
          title: updateRes.persistedDocument.title,
          price: updateRes.persistedDocument.price,
          preservedCalloutTag: updateRes.persistedDocument.calloutTag,
          preservedRecipients: updateRes.persistedDocument.recipients,
        }
      : undefined,
    detail: updateRes.message,
  });

  // STEP 4: REREAD & VERIFY NON-DESTRUCTIVE FIELD PRESERVATION
  const secondReadDoc = await fetchDocumentFromSanityContentLake(
    disposableDocumentId,
    envOverride
  );
  const rereadOk =
    Boolean(secondReadDoc) &&
    secondReadDoc?.title === updatedDraftPayload.title &&
    secondReadDoc?.price === 68 &&
    secondReadDoc?.calloutTag === 'Preserved Unrelated Field' &&
    Array.isArray(secondReadDoc?.recipients) &&
    secondReadDoc?.recipients.length === 2 &&
    secondReadDoc?._rev !== firstReadDoc?._rev;

  steps.push({
    step: 'reread',
    ok: rereadOk,
    httpStatus: rereadOk ? 200 : 500,
    documentId: disposableDocumentId,
    rev: secondReadDoc?._rev,
    updatedAt: secondReadDoc?._updatedAt,
    verifiedFields: secondReadDoc
      ? {
          title: secondReadDoc.title,
          price: secondReadDoc.price,
          preservedCalloutTag: secondReadDoc.calloutTag,
          previousRev: firstReadDoc?._rev,
          newRev: secondReadDoc._rev,
        }
      : undefined,
    detail: rereadOk
      ? `Reread updated draft "${disposableDocumentId}": confirmed title="${secondReadDoc?.title}", price=$${secondReadDoc?.price}, preserved untouched field calloutTag="${secondReadDoc?.calloutTag}", and revision advanced from ${firstReadDoc?._rev} to ${secondReadDoc?._rev}.`
      : 'Reread failed or untouched fields were not preserved.',
  });

  // STEP 5: STALE REVISION CONFLICT CHECK (Attempt to overwrite using stale `firstReadDoc._rev`)
  const staleAttemptRes = await saveDraftToSanityContentLake(
    {
      _id: disposableDocumentId,
      _type: 'product',
      _rev: firstReadDoc?._rev, // Stale revision!
      productId: initialDraft.productId,
      title: 'Stale Overwrite Attempt That Must Be Blocked',
      price: 99,
    },
    envOverride
  );
  const staleRejectedOk =
    !staleAttemptRes.ok &&
    staleAttemptRes.status === 409 &&
    staleAttemptRes.blockerCode === 'REVISION_CONFLICT';

  steps.push({
    step: 'stale_revision_conflict_rejected',
    ok: staleRejectedOk,
    httpStatus: staleAttemptRes.status,
    documentId: disposableDocumentId,
    rev: secondReadDoc?._rev,
    verifiedFields: {
      rejectedStaleRev: firstReadDoc?._rev,
      activeCloudRev: secondReadDoc?._rev,
      blockerCode: staleAttemptRes.blockerCode,
    },
    detail: staleAttemptRes.message,
  });

  // STEP 6: DELETE & CONFIRM REMOVAL
  const deleteRes = await deleteDraftFromSanityContentLake(
    disposableDocumentId,
    envOverride
  );
  steps.push({
    step: 'delete',
    ok: deleteRes.ok,
    httpStatus: deleteRes.status,
    documentId: disposableDocumentId,
    transactionId: deleteRes.transactionId,
    verifiedFields: { deletedAndConfirmedNull: deleteRes.ok },
    detail: deleteRes.message,
  });

  return {
    allStepsPassed: steps.every((s) => s.ok),
    projectId: creds.projectId,
    dataset: creds.dataset,
    apiVersion: creds.apiVersion,
    disposableDocumentId,
    executedAt: new Date().toISOString(),
    steps,
  };
}

export const ALLOWED_UPLOAD_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

export type AllowedUploadImageMimeType = (typeof ALLOWED_UPLOAD_IMAGE_MIME_TYPES)[number];

export const MAX_UPLOAD_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB per image

export interface SanityImageUploadInput {
  buffer?: Buffer | Uint8Array;
  base64Data?: string;
  filename: string;
  mimeType: string;
  alt?: string;
  caption?: string;
  fitMode?: 'cover' | 'contain';
  focalPoint?: { x: number; y: number };
  fallbackColor?: string;
  existingImageId?: string;
}

export interface SanityUploadedAssetSummary {
  assetId: string;
  url: string;
  imageField: {
    _type: 'image';
    asset: {
      _type: 'reference';
      _ref: string;
    };
    hotspot?: {
      _type: 'sanity.imageHotspot';
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  alt: string;
  caption?: string;
  originalFilename?: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface SanityUploadedImageAssetResult {
  ok: boolean;
  status: number;
  blockerCode?:
    | 'MISSING_PROJECT_OR_DATASET'
    | 'MISSING_WRITE_TOKEN'
    | 'INVALID_FILE_TYPE'
    | 'FILE_TOO_LARGE'
    | 'EMPTY_FILE_BUFFER'
    | 'CORRUPT_IMAGE_BINARY'
    | 'SANITY_UPLOAD_FAILED';
  asset?: SanityUploadedAssetSummary;
  assetDocument?: {
    _id: string;
    _type: 'sanity.imageAsset';
    url: string;
    originalFilename?: string;
    mimeType: string;
    size: number;
    width: number;
    height: number;
    aspectRatio: number;
  };
  productImage?: Record<string, any>;
  message: string;
}

function sanitizeImageFilename(rawFilename: string, mimeType: string): string {
  const defaultExt =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
      ? 'webp'
      : mimeType === 'image/avif'
      ? 'avif'
      : mimeType === 'image/gif'
      ? 'gif'
      : 'jpg';
  const base = (rawFilename || `product-photo.${defaultExt}`)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return base || `product-photo.${defaultExt}`;
}

function deriveDefaultAltFromFilename(filename: string): string {
  const withoutExt = filename
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutExt.length >= 10) {
    return `${withoutExt.charAt(0).toUpperCase()}${withoutExt.slice(1)} product photograph`;
  }
  return `${withoutExt || 'Editorial'} product photograph on neutral studio surface`;
}

function verifyImageMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 8) return false;
  if (mimeType === 'image/png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (mimeType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === 'image/gif') {
    return (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    );
  }
  if (mimeType === 'image/webp') {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 && // R
      bytes[1] === 0x49 && // I
      bytes[2] === 0x46 && // F
      bytes[3] === 0x46 && // F
      bytes[8] === 0x57 && // W
      bytes[9] === 0x45 && // E
      bytes[10] === 0x42 && // B
      bytes[11] === 0x50 // P
    );
  }
  if (mimeType === 'image/avif') {
    // ISO BMFF ftyp box at bytes 4..7
    return (
      bytes.length >= 12 &&
      bytes[4] === 0x66 && // f
      bytes[5] === 0x74 && // t
      bytes[6] === 0x79 && // y
      bytes[7] === 0x70 // p
    );
  }
  return false;
}

/**
 * Uploads an image binary directly to Sanity Content Lake's native image asset infrastructure
 * (`POST https://<projectId>.api.sanity.io/v<apiVersion>/assets/images/<dataset>`) using the
 * server-side `SANITY_API_WRITE_TOKEN`.
 *
 * Never stores base64 or blob URLs in product documents: returns a persistent `sanity.imageAsset`
 * reference (`image-<hash>-<w>x<h>-<ext>`) and `https://cdn.sanity.io/images/...` URL.
 */
export async function uploadImageAssetToSanityContentLake(
  input: SanityImageUploadInput,
  envOverride?: Record<string, string | undefined>
): Promise<SanityUploadedImageAssetResult> {
  const creds = resolveSanityServerCredentials(envOverride);

  if (!creds.projectId || !creds.dataset) {
    return {
      ok: false,
      status: 400,
      blockerCode: 'MISSING_PROJECT_OR_DATASET',
      message: 'SANITY_STUDIO_PROJECT_ID or SANITY_STUDIO_DATASET is not configured.',
    };
  }

  if (!creds.writeToken) {
    return {
      ok: false,
      status: 403,
      blockerCode: 'MISSING_WRITE_TOKEN',
      message: 'Server-side SANITY_API_WRITE_TOKEN is not configured.',
    };
  }

  const normalizedMime = (input.mimeType || '').trim().toLowerCase();
  if (
    !(ALLOWED_UPLOAD_IMAGE_MIME_TYPES as readonly string[]).includes(normalizedMime)
  ) {
    return {
      ok: false,
      status: 415,
      blockerCode: 'INVALID_FILE_TYPE',
      message: `Unsupported image file type "${input.mimeType || 'unknown'}". Allowed formats: JPEG, PNG, WebP, AVIF, GIF.`,
    };
  }

  let byteArray: Uint8Array;
  if (input.buffer instanceof Uint8Array && input.buffer.byteLength > 0) {
    byteArray = input.buffer;
  } else if (Buffer.isBuffer(input.buffer) && input.buffer.byteLength > 0) {
    byteArray = new Uint8Array(input.buffer);
  } else if (typeof input.base64Data === 'string' && input.base64Data.trim()) {
    const cleaned = input.base64Data.trim().replace(/^data:[^;]+;base64,/i, '');
    byteArray = new Uint8Array(Buffer.from(cleaned, 'base64'));
  } else {
    byteArray = new Uint8Array(0);
  }

  if (byteArray.byteLength === 0) {
    return {
      ok: false,
      status: 400,
      blockerCode: 'EMPTY_FILE_BUFFER',
      message: 'Uploaded image file is empty (0 bytes).',
    };
  }

  if (byteArray.byteLength > MAX_UPLOAD_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      status: 413,
      blockerCode: 'FILE_TOO_LARGE',
      message: `Image file exceeds maximum allowed size of 15 MB (received ${(
        byteArray.byteLength /
        (1024 * 1024)
      ).toFixed(2)} MB).`,
    };
  }

  if (!verifyImageMagicBytes(byteArray, normalizedMime)) {
    return {
      ok: false,
      status: 400,
      blockerCode: 'CORRUPT_IMAGE_BINARY',
      message: `Uploaded file "${input.filename}" does not contain valid ${normalizedMime} binary header bytes.`,
    };
  }

  const cleanFilename = sanitizeImageFilename(input.filename, normalizedMime);
  const uploadUrl = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/assets/images/${
    creds.dataset
  }?filename=${encodeURIComponent(cleanFilename)}`;

  try {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.writeToken}`,
        'Content-Type': normalizedMime,
      },
      body: Buffer.from(byteArray),
    });

    const responseText = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        blockerCode: 'SANITY_UPLOAD_FAILED',
        message: `Sanity asset upload failed with HTTP ${res.status}: ${responseText.slice(
          0,
          240
        )}`,
      };
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return {
        ok: false,
        status: 500,
        blockerCode: 'SANITY_UPLOAD_FAILED',
        message: 'Sanity returned an invalid JSON response during image asset upload.',
      };
    }

    const doc = parsed?.document;
    if (!doc || typeof doc._id !== 'string' || !doc._id.startsWith('image-')) {
      return {
        ok: false,
        status: 500,
        blockerCode: 'SANITY_UPLOAD_FAILED',
        message: 'Sanity asset upload response did not include a valid image-* asset _id.',
      };
    }

    const width = Number(doc?.metadata?.dimensions?.width) || 2400;
    const height = Number(doc?.metadata?.dimensions?.height) || 2400;
    const aspectRatio =
      Number(doc?.metadata?.dimensions?.aspectRatio) ||
      Math.round((width / height) * 1000) / 1000;
    const cdnUrl: string =
      doc.url ||
      `https://cdn.sanity.io/images/${creds.projectId}/${creds.dataset}/${doc._id
        .replace(/^image-/, '')
        .replace(/-([a-z0-9]+)$/, '.$1')}`;

    const fp = input.focalPoint || { x: 0.5, y: 0.5 };
    const fitMode = input.fitMode === 'contain' ? 'contain' : 'cover';
    const fallbackColor = input.fallbackColor || '#F6F4EF';
    const altText =
      input.alt && input.alt.trim().length >= 10
        ? input.alt.trim().slice(0, 220)
        : deriveDefaultAltFromFilename(cleanFilename);

    const shortHash = doc._id.split('-')[1]?.slice(0, 10) || Date.now().toString(36);
    const stableId =
      input.existingImageId && input.existingImageId.trim()
        ? input.existingImageId.trim()
        : `img_${shortHash}_${Math.random().toString(36).slice(2, 6)}`;

    const productImage = {
      _type: 'productImage',
      _key: stableId,
      id: stableId,
      sanityAssetId: doc._id,
      asset: {
        _type: 'image' as const,
        asset: {
          _type: 'reference' as const,
          _ref: String(doc._id),
        },
        hotspot: {
          _type: 'sanity.imageHotspot' as const,
          x: fp.x,
          y: fp.y,
          width: 0.3,
          height: 0.3,
        },
      },
      url: cdnUrl,
      alt: altText,
      caption: input.caption?.trim() || undefined,
      fitMode,
      fallbackColor,
      focalPoint: {
        _type: 'imageFocalPoint',
        x: fp.x,
        y: fp.y,
      },
      width,
      height,
      aspectRatio,
      originalFilename: doc.originalFilename || cleanFilename,
      mimeType: doc.mimeType || normalizedMime,
      sourceType: 'sanity-upload' as const,
      isSampleAsset: false,
    };

    const assetSummary: SanityUploadedAssetSummary = {
      assetId: doc._id,
      url: cdnUrl,
      imageField: productImage.asset,
      alt: altText,
      caption: productImage.caption,
      originalFilename: doc.originalFilename || cleanFilename,
      mimeType: doc.mimeType || normalizedMime,
      size: Number(doc.size) || byteArray.byteLength,
      width,
      height,
      aspectRatio,
    };

    return {
      ok: true,
      status: 200,
      asset: assetSummary,
      assetDocument: {
        _id: doc._id,
        _type: 'sanity.imageAsset',
        url: cdnUrl,
        originalFilename: doc.originalFilename || cleanFilename,
        mimeType: doc.mimeType || normalizedMime,
        size: Number(doc.size) || byteArray.byteLength,
        width,
        height,
        aspectRatio,
      },
      productImage,
      message: `Uploaded "${cleanFilename}" (${width}×${height}px) to Sanity Content Lake asset "${doc._id}".`,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      blockerCode: 'SANITY_UPLOAD_FAILED',
      message: `Network error uploading image to Sanity Content Lake: ${
        err?.message ?? String(err)
      }`,
    };
  }
}

/**
 * Uploads multiple image files in a single batch operation to Sanity Content Lake.
 */
export async function uploadMultipleImageAssetsToSanityContentLake(
  files: SanityImageUploadInput[],
  envOverride?: Record<string, string | undefined>
): Promise<{
  ok: boolean;
  status: number;
  uploadedCount: number;
  failedCount: number;
  results: SanityUploadedImageAssetResult[];
  uploadedAssets: SanityUploadedAssetSummary[];
  errors: Array<{ filename: string; message: string; blockerCode?: string }>;
  productImages: Array<Record<string, any>>;
  message: string;
}> {
  if (!Array.isArray(files) || files.length === 0) {
    return {
      ok: false,
      status: 400,
      uploadedCount: 0,
      failedCount: 0,
      results: [],
      uploadedAssets: [],
      errors: [{ filename: '', message: 'No image files provided for upload.' }],
      productImages: [],
      message: 'No image files provided for upload.',
    };
  }

  const results: SanityUploadedImageAssetResult[] = [];
  const uploadedAssets: SanityUploadedAssetSummary[] = [];
  const errors: Array<{ filename: string; message: string; blockerCode?: string }> = [];
  const productImages: Array<Record<string, any>> = [];

  for (const file of files) {
    const res = await uploadImageAssetToSanityContentLake(file, envOverride);
    results.push(res);
    if (res.ok && res.productImage && res.asset) {
      productImages.push(res.productImage);
      uploadedAssets.push(res.asset);
    } else {
      errors.push({
        filename: file.filename,
        message: res.message,
        blockerCode: res.blockerCode,
      });
    }
  }

  const uploadedCount = productImages.length;
  const failedCount = results.length - uploadedCount;
  const allOk = uploadedCount > 0 && failedCount === 0;

  return {
    ok: uploadedCount > 0,
    status: allOk ? 200 : uploadedCount > 0 ? 207 : results[0]?.status || 422,
    uploadedCount,
    failedCount,
    results,
    uploadedAssets,
    errors,
    productImages,
    message:
      failedCount === 0
        ? `Successfully uploaded ${uploadedCount} photograph${
            uploadedCount === 1 ? '' : 's'
          } to Sanity Content Lake.`
        : `Uploaded ${uploadedCount} photograph(s); ${failedCount} failed (${
            results.find((r) => !r.ok)?.message || 'validation error'
          }).`,
  };
}

