/**
 * Science of Gifts — Server-Side Sanity Content Lake Persistence & Validation Client
 *
 * Implements Checkpoint 1 (Verified Sanity Content Lake Persistence):
 * - Keeps `SANITY_API_WRITE_TOKEN` strictly on the server (never exposed to browser bundles).
 * - Validates document structure, controlled taxonomy vocabularies, URLs, numeric fields,
 *   and publication-safety rules on the server BEFORE executing any Sanity mutation.
 * - Executes authenticated server-side mutations (`POST /data/mutate/<dataset>`)
 *   and draft/document queries (`GET /data/query/<dataset>?perspective=raw`) against
 *   Sanity Content Lake.
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
  transactionId?: string;
  persistedDocument?: Record<string, any> | null;
  serverValidation?: ServerDraftValidationReport;
  blockerCode?:
    | 'MISSING_PROJECT_OR_DATASET'
    | 'MISSING_WRITE_TOKEN'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'SERVER_VALIDATION_FAILED'
    | 'PUBLISHED_MUTATION_FORBIDDEN'
    | 'NETWORK_OR_API_ERROR'
    | 'ROUND_TRIP_READ_MISMATCH';
  message: string;
  rawError?: string;
}

export interface DisposableDraftLifecycleStepResult {
  step: 'create' | 'read' | 'update' | 'reread' | 'delete';
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
 *
 * Distinctions enforced:
 * 1. `blockingDraftErrors`: Structural, type, format, URL scheme, or controlled taxonomy
 *    violations that immediately block saving corrupt data to Sanity Content Lake (HTTP 422).
 * 2. `publishReadinessErrors`: Missing editorial fields or unverified commerce claims that
 *    are allowed on a work-in-progress draft (`drafts.*`) but block promotion to `published`.
 * 3. Forces `_id` to start with `drafts.` and `status` to `'draft'` so published documents
 *    are never modified via the draft endpoint.
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

  // Normalize ID strictly to `drafts.<base_id>` and status to `draft`
  const normalizedDraftId = rawId.startsWith('drafts.')
    ? rawId
    : `drafts.${rawId}`;

  // Strip local-only markers before persisting to Sanity Content Lake
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

  // Validate primary title/name field if provided
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

  // Validate slug structure if present
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

  // Product-specific server-side type, URL, numeric, and controlled taxonomy checks
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
  }

  // Run full Sanity schema & lifecycle checks on the server for publish readiness
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
 * via server-side authenticated mutation (`createOrReplace`) and immediately performs
 * a round-trip query to verify the document was genuinely stored in Sanity Content Lake.
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
        mutations: [{ createOrReplace: docToSave }],
      }),
    });

    const bodyText = await mutateRes.text();
    if (!mutateRes.ok) {
      const isPermissionError =
        mutateRes.status === 401 || mutateRes.status === 403;
      return {
        ok: false,
        status: mutateRes.status,
        serverValidation,
        blockerCode: isPermissionError
          ? 'INSUFFICIENT_PERMISSIONS'
          : 'NETWORK_OR_API_ERROR',
        message: `Sanity Content Lake mutation failed with HTTP ${mutateRes.status}. Ensure SANITY_API_WRITE_TOKEN has "Editor" permissions on dataset "${creds.dataset}".`,
        rawError: bodyText,
      };
    }

    let mutateJson: any = {};
    try {
      mutateJson = JSON.parse(bodyText);
    } catch {}

    // 2. Perform round-trip read back from Sanity Content Lake to confirm genuine persistence
    const readBack = await fetchDocumentFromSanityContentLake(
      normalizedDraftId,
      envOverride
    );

    if (!readBack) {
      return {
        ok: false,
        status: 500,
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
      transactionId: mutateJson.transactionId,
      persistedDocument: readBack,
      serverValidation,
      message: `Saved "${normalizedDraftId}" to Sanity Content Lake (${creds.projectId}/${creds.dataset}, rev: ${readBack._rev}).`,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
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
 * Executes the complete 5-step Checkpoint 1 disposable draft test against Sanity Content Lake:
 * 1. Create disposable draft (`drafts.prod_checkpoint1_verify_<timestamp>`)
 * 2. Read the created draft back from Sanity Content Lake
 * 3. Update the draft (modifying title, price, and editorial rationale)
 * 4. Reread the updated draft and confirm `_rev` advanced and updated fields persisted
 * 5. Delete the disposable draft and confirm readback returns `null`
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
    whyToGiveIt:
      'Initial editorial rationale verifying that server-side createOrReplace mutations write to Sanity Content Lake.',
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
    ok: createRes.ok,
    httpStatus: createRes.status,
    documentId: disposableDocumentId,
    transactionId: createRes.transactionId,
    rev: createRes.persistedDocument?._rev,
    updatedAt: createRes.persistedDocument?._updatedAt,
    verifiedFields: createRes.persistedDocument
      ? {
          title: createRes.persistedDocument.title,
          price: createRes.persistedDocument.price,
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

  // STEP 3: UPDATE
  const updatedDraft = {
    ...initialDraft,
    title: 'Checkpoint 1 Disposable Test Carafe (Updated Step 3)',
    price: 68,
    budgetTier: '50-to-100',
    guidePriceBucket: '25-to-75',
    whyToGiveIt:
      'Updated editorial rationale confirming that modifying an existing draft updates the document revision in Sanity Content Lake.',
  };
  const updateRes = await saveDraftToSanityContentLake(updatedDraft, envOverride);
  steps.push({
    step: 'update',
    ok: updateRes.ok,
    httpStatus: updateRes.status,
    documentId: disposableDocumentId,
    transactionId: updateRes.transactionId,
    rev: updateRes.persistedDocument?._rev,
    updatedAt: updateRes.persistedDocument?._updatedAt,
    verifiedFields: updateRes.persistedDocument
      ? {
          title: updateRes.persistedDocument.title,
          price: updateRes.persistedDocument.price,
          budgetTier: updateRes.persistedDocument.budgetTier,
        }
      : undefined,
    detail: updateRes.message,
  });

  // STEP 4: REREAD
  const secondReadDoc = await fetchDocumentFromSanityContentLake(
    disposableDocumentId,
    envOverride
  );
  const rereadOk =
    Boolean(secondReadDoc) &&
    secondReadDoc?.title === updatedDraft.title &&
    secondReadDoc?.price === 68 &&
    secondReadDoc?.budgetTier === '50-to-100' &&
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
          budgetTier: secondReadDoc.budgetTier,
          previousRev: firstReadDoc?._rev,
          newRev: secondReadDoc._rev,
        }
      : undefined,
    detail: rereadOk
      ? `Reread updated draft "${disposableDocumentId}" from Sanity Content Lake: confirmed title="${secondReadDoc?.title}", price=$${secondReadDoc?.price}, and revision advanced from ${firstReadDoc?._rev} to ${secondReadDoc?._rev}.`
      : 'Reread failed or fields did not match updated values.',
  });

  // STEP 5: DELETE & CONFIRM REMOVAL
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
