/**
 * Science of Gifts — Server-Side Sanity Studio API Middleware & Production Isolation Plugin
 *
 * Security & Isolation Guarantees:
 * 1. Only mounts `/api/studio/sanity/*` in the private development server (`configureServer`
 *    when `NODE_ENV !== 'production'`). Never mounts in `configurePreviewServer` or production.
 * 2. Every endpoint (`/status`, `/drafts`, `/published`, `/document`, `/save-draft`,
 *    `/open-or-create-draft`, `/publish-product`, `/preview-ticket`, `/preview-product`,
 *    `/delete-draft`, `/verify-lifecycle`) enforces `verifyStudioApiRequestAuthorization`
 *    or signed short-lived preview tickets (`issueStudioPreviewTicket` / `verifyStudioPreviewTicket`).
 * 3. Strips `dist/studio` during static production builds (`closeBundle`) so `/studio/` can never
 *    be deployed publicly as part of the static Astro website.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PRODUCTS } from '../../data/catalog';
import {
  deleteDisposableTestArticleFromSanity,
  deleteDraftFromSanityContentLake,
  ensureEditableDraftInSanityContentLake,
  fetchDocumentFromSanityContentLake,
  getSanityContentLakeStatus,
  listDraftsFromSanityContentLake,
  listPublishedArticlesFromSanityContentLake,
  listPublishedProductsFromSanityContentLake,
  publishArticleDraftInSanityContentLake,
  publishProductDraftInSanityContentLake,
  resolveSanityServerCredentials,
  runDisposableDraftPersistenceVerificationTest,
  saveDraftToSanityContentLake,
  unpublishArticleInSanityContentLake,
  unpublishProductInSanityContentLake,
  uploadImageAssetToSanityContentLake,
  uploadMultipleImageAssetsToSanityContentLake,
  type SanityImageUploadInput,
} from './sanityServerClient';
import { invalidateSanityPublishedCache } from '../sanityPublishedLoader';
import {
  isFourthwallStorefrontUrl,
  mapAstroFulfillmentToSanity,
  mapAstroInventoryVerificationSourceToSanity,
  mapAstroPriceVerificationSourceToSanity,
  normalizeInternalCanonicalPath,
  normalizeSanityProductDocumentBackwardCompatible,
} from './productDocumentMapper';
import { normalizeSanityArticleDocumentBackwardCompatible } from './articleDocumentMapper';
import { extractProductDetailsFromUrl } from './productUrlExtractor';
import {
  ensureDefaultAiWritingProfileInSanity,
  ensureDefaultArticleAiWritingProfileInSanity,
  ensureEvaluationHoodieCopyInSanity,
  generateCompleteProductProposal,
  generateProductEditorialCopy,
  generateProductSupportingFields,
  listAiWritingProfilesFromSanity,
  polishProductEditorialCopy,
  saveAiWritingProfileToSanity,
} from './productAiAuthoringService';
import {
  exportArticleAiBrief,
  generateCompleteArticleWithAi,
  improveArticleWithAi,
  parseImportedArticlePayload,
} from './articleAiAuthoringService';
import {
  isStudioDevelopmentEnvironmentAllowed,
  issueStudioEditorSessionCredentials,
  issueStudioPreviewTicket,
  verifySameOriginRequestHeaders,
  verifyStudioApiRequestAuthorization,
  verifyStudioPreviewTicket,
} from './sanityStudioAuth';

type PreviewModuleType = typeof import('./sanityDraftPreviewRenderer');

let activeViteDevServer: { ssrLoadModule?: (url: string) => Promise<any> } | null =
  null;

async function loadPreviewRendererModule(): Promise<PreviewModuleType> {
  if (activeViteDevServer && typeof activeViteDevServer.ssrLoadModule === 'function') {
    return (await activeViteDevServer.ssrLoadModule(
      '/src/cms/studio/sanityDraftPreviewRenderer.tsx'
    )) as PreviewModuleType;
  }
  return (await import('./sanityDraftPreviewRenderer')) as PreviewModuleType;
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const err = new Error('Invalid JSON request body.') as Error & {
          code?: string;
        };
        err.code = 'INVALID_JSON_BODY';
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function decodeBase64UploadPayload(rawBase64: string): Buffer {
  const cleaned = rawBase64
    .trim()
    .replace(/^data:[^;]+;base64,/i, '');
  return Buffer.from(cleaned, 'base64');
}

/**
 * Sends a guaranteed JSON response.
 * Note: The Google AI Studio preview container's Nginx reverse proxy configures
 * `proxy_intercept_errors on; error_page 403 = /forbidden.html;`.
 * When `X-Forwarded-Host` is present on `/api/studio/sanity/*`, we map wire
 * status 403 -> 401 (while preserving `httpStatus: 403` in the JSON payload)
 * so the browser always receives the structured JSON error payload.
 */
function sendJson(
  req: IncomingMessage,
  res: ServerResponse,
  statusCode: number,
  payload: Record<string, any>
) {
  const isProxied = Boolean(req.headers['x-forwarded-host']);
  const wireStatusCode =
    isProxied && statusCode === 403 ? 401 : statusCode;

  res.statusCode = wireStatusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.end(
    JSON.stringify({
      httpStatus: statusCode,
      ...payload,
    })
  );
}

function sendHtml(
  res: ServerResponse,
  statusCode: number,
  html: string
) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.end(html);
}

const POST_ONLY_STUDIO_PATHS = new Set<string>([
  '/api/studio/sanity/fetch-product-details',
  '/api/studio/sanity/save-draft',
  '/api/studio/sanity/open-or-create-draft',
  '/api/studio/sanity/publish-product',
  '/api/studio/sanity/unpublish-product',
  '/api/studio/sanity/preview-ticket',
  '/api/studio/sanity/delete-draft',
  '/api/studio/sanity/upload-image',
  '/api/studio/sanity/upload-images',
  '/api/studio/sanity/verify-lifecycle',
  '/api/studio/sanity/ai-generate-supporting',
  '/api/studio/sanity/ai-generate-editorial',
  '/api/studio/sanity/ai-generate-complete',
  '/api/studio/sanity/ai-polish-editorial',
  '/api/studio/sanity/ensure-eval-hoodie-copy',
]);

function readRawRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Same-Origin Sanity Content Lake Proxy for Official Sanity Studio (`<Studio />`).
 * Attaches the server-side `SANITY_API_WRITE_TOKEN` without ever exposing it to the browser,
 * handles `/users/me` and `/projects/:id` for seamless embedded Studio authentication,
 * protects `prod_emotional_support_psychology_major_hoodie` from accidental mutation,
 * and invalidates the Astro published product cache whenever a mutation occurs.
 */
async function handleSanityLakeProxyRequest(
  req: IncomingMessage,
  res: ServerResponse,
  parsedUrl: URL
) {
  if (!isStudioDevelopmentEnvironmentAllowed()) {
    sendJson(req, res, 403, {
      ok: false,
      errorCode: 'STUDIO_DISABLED_IN_PRODUCTION',
      message: 'Sanity Studio proxy is disabled in production.',
    });
    return;
  }

  const originCheck = verifySameOriginRequestHeaders(req);
  if (!originCheck.allowed) {
    sendJson(req, res, 403, {
      ok: false,
      errorCode: 'CROSS_ORIGIN_REQUEST_BLOCKED',
      message: originCheck.reason || 'Cross-origin request blocked.',
    });
    return;
  }

  const creds = resolveSanityServerCredentials();
  const subPath =
    parsedUrl.pathname.replace(/^\/api\/studio\/sanity\/lake/, '') || '/';
  const method = (req.method ?? 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // 1. Native Sanity Studio user session identity check (`/v*/users/me`)
  if (/^\/v[^/]+\/users\/me$/.test(subPath) || subPath === '/users/me') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        id: 'gr-editorial-studio',
        name: 'Science of Gifts Editorial Studio',
        email: 'editorial@scienceofgifts.com',
        profileImage: '',
        role: 'administrator',
        roles: [
          {
            name: 'administrator',
            title: 'Administrator',
          },
        ],
      })
    );
    return;
  }

  // 2. Native Sanity Studio project metadata check (`/v*/projects/:projectId`)
  if (/^\/v[^/]+\/projects\/[^/]+$/.test(subPath)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        id: creds.projectId || 'c1y2qdje',
        displayName: 'Science of Gifts',
        studioHost: null,
        organizationId: null,
        isBlocked: false,
        isDisabled: false,
        isDisabledByUser: false,
        metadata: {},
        members: [
          {
            id: 'gr-editorial-studio',
            role: 'administrator',
            isRobot: false,
            roles: [
              {
                name: 'administrator',
                title: 'Administrator',
              },
            ],
          },
        ],
        datasets: [
          {
            name: creds.dataset || 'production',
            aclMode: 'public',
          },
        ],
      })
    );
    return;
  }

  // 3. Native Sanity Studio datasets list check (`/v*/projects/:projectId/datasets`)
  if (/^\/v[^/]+\/projects\/[^/]+\/datasets$/.test(subPath)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify([
        {
          name: creds.dataset || 'production',
          aclMode: 'public',
          createdAt: '2026-11-01T00:00:00Z',
        },
      ])
    );
    return;
  }

  // 4. Native Sanity Studio grants check (`/v*/projects/:projectId/grants`)
  if (/^\/v[^/]+\/projects\/[^/]+\/grants$/.test(subPath)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({}));
    return;
  }

  // 5. Real-time EventSource listener (`/v*/data/listen/:dataset`)
  if (subPath.includes('/data/listen/')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.write('event: welcome\ndata: {"listenerName":"science-of-gifts-studio"}\n\n');
    const keepAlive = setInterval(() => {
      try {
        res.write(':\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 15000);
    req.on('close', () => clearInterval(keepAlive));
    return;
  }

  // 6. Forward all Content Lake queries, mutations, history, and asset uploads to Sanity API
  const targetUrl = `https://${creds.projectId || 'c1y2qdje'}.api.sanity.io${subPath}${parsedUrl.search}`;
  let rawBody =
    method !== 'GET' && method !== 'HEAD' ? await readRawRequestBody(req) : undefined;

  // Guard: Never allow any mutation against the preserved original hoodie document
  if (
    method === 'POST' &&
    subPath.includes('/data/mutate/') &&
    rawBody &&
    rawBody.length > 0
  ) {
    const bodyStr = rawBody.toString('utf8');
    if (
      bodyStr.includes('"prod_emotional_support_psychology_major_hoodie"') ||
      bodyStr.includes('"drafts.prod_emotional_support_psychology_major_hoodie"')
    ) {
      sendJson(req, res, 409, {
        ok: false,
        errorCode: 'PROTECTED_DOCUMENT_IMMUTABLE',
        message:
          'Document "prod_emotional_support_psychology_major_hoodie" is protected during evaluation. Edit the evaluation copy "prod_eval_copy_emotional_support_psychology_major_hoodie" instead.',
      });
      return;
    }

    // Normalize product mutations so legacy/disagreeing enum values never persist
    try {
      const parsedBody = JSON.parse(bodyStr);
      if (parsedBody && Array.isArray(parsedBody.mutations)) {
        let mutated = false;
        for (const m of parsedBody.mutations) {
          for (const op of ['create', 'createOrReplace', 'createIfNotExists'] as const) {
            if (m?.[op] && typeof m[op] === 'object' && m[op]._type === 'product') {
              m[op] = normalizeSanityProductDocumentBackwardCompatible(m[op]);
              mutated = true;
            } else if (m?.[op] && typeof m[op] === 'object' && m[op]._type === 'article') {
              m[op] = normalizeSanityArticleDocumentBackwardCompatible(m[op]);
              mutated = true;
            }
          }
          if (m?.patch && typeof m.patch === 'object' && m.patch.set && typeof m.patch.set === 'object') {
            const setObj = m.patch.set as Record<string, any>;
            const patchId = String(m.patch.id || '');
            const isProductPatch =
              patchId.startsWith('prod_') ||
              patchId.startsWith('drafts.prod_') ||
              setObj._type === 'product' ||
              'fulfillmentClassification' in setObj ||
              'commerceProvider' in setObj ||
              'priceVerificationSource' in setObj ||
              'inventoryVerificationSource' in setObj;

            if (isProductPatch) {
              if (typeof setObj.fulfillmentClassification === 'string') {
                const mappedFulfillment = mapAstroFulfillmentToSanity(
                  setObj.fulfillmentClassification,
                  setObj.commerceProvider === 'fourthwall'
                    ? 'fourthwall'
                    : setObj.commerceProvider === 'digital'
                    ? 'digital'
                    : setObj.commerceProvider === 'direct'
                    ? 'direct'
                    : 'affiliate'
                );
                setObj.fulfillmentClassification = mappedFulfillment;
                if (!setObj.commerceProvider) {
                  setObj.commerceProvider =
                    mappedFulfillment === 'owned-fourthwall-merch'
                      ? 'fourthwall'
                      : mappedFulfillment === 'owned-digital-product'
                      ? 'digital'
                      : mappedFulfillment === 'editorial-non-monetized'
                      ? 'direct'
                      : 'affiliate';
                }
                mutated = true;
              }
              if (typeof setObj.commerceProvider === 'string' && !setObj.fulfillmentClassification) {
                setObj.fulfillmentClassification = mapAstroFulfillmentToSanity(
                  undefined,
                  setObj.commerceProvider as any
                );
                mutated = true;
              }
              if (
                typeof setObj.purchaseUrl === 'string' &&
                isFourthwallStorefrontUrl(setObj.purchaseUrl)
              ) {
                setObj.commerceProvider = 'fourthwall';
                setObj.fulfillmentClassification = 'owned-fourthwall-merch';
                mutated = true;
              }
              if (typeof setObj.priceVerificationSource === 'string') {
                setObj.priceVerificationSource = mapAstroPriceVerificationSourceToSanity(
                  setObj.priceVerificationSource,
                  Boolean(setObj.priceVerified)
                );
                mutated = true;
              }
              if (typeof setObj.inventoryVerificationSource === 'string') {
                setObj.inventoryVerificationSource =
                  mapAstroInventoryVerificationSourceToSanity(
                    setObj.inventoryVerificationSource,
                    Boolean(setObj.inventoryVerified)
                  );
                mutated = true;
              }
              if (typeof setObj['seo.canonicalPath'] === 'string') {
                setObj['seo.canonicalPath'] =
                  normalizeInternalCanonicalPath(setObj['seo.canonicalPath']) ??
                  setObj['seo.canonicalPath'];
                mutated = true;
              }
              if (setObj.seo && typeof setObj.seo === 'object' && typeof setObj.seo.canonicalPath === 'string') {
                setObj.seo = {
                  ...setObj.seo,
                  canonicalPath:
                    normalizeInternalCanonicalPath(setObj.seo.canonicalPath) ??
                    setObj.seo.canonicalPath,
                };
                mutated = true;
              }
            }
          }
        }
        if (mutated) {
          rawBody = Buffer.from(JSON.stringify(parsedBody), 'utf8');
        }
      }
    } catch {
      // Non-JSON or unexpected payload; forward as-is
    }
  }

  const forwardHeaders: Record<string, string> = {};
  if (creds.writeToken) {
    forwardHeaders.Authorization = `Bearer ${creds.writeToken}`;
  } else if (creds.readToken) {
    forwardHeaders.Authorization = `Bearer ${creds.readToken}`;
  }
  if (req.headers['content-type']) {
    forwardHeaders['Content-Type'] = String(req.headers['content-type']);
  }
  if (req.headers['accept']) {
    forwardHeaders['Accept'] = String(req.headers['accept']);
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body: rawBody && rawBody.length > 0 ? (rawBody as any) : undefined,
    });

    if (method === 'POST' && subPath.includes('/data/mutate/') && upstreamRes.ok) {
      invalidateSanityPublishedCache();
    }

    res.statusCode = upstreamRes.status;
    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const arrayBuf = await upstreamRes.arrayBuffer();

    // Normalize `_type === "product"` documents in `/data/query/` and `/data/doc/` JSON responses
    if (
      upstreamRes.ok &&
      contentType?.includes('application/json') &&
      (subPath.includes('/data/query/') || subPath.includes('/data/doc/'))
    ) {
      try {
        const jsonText = Buffer.from(arrayBuf).toString('utf8');
        const parsed = JSON.parse(jsonText);
        const normalizeNode = (node: any): any => {
          if (Array.isArray(node)) {
            return node.map(normalizeNode);
          }
          if (node && typeof node === 'object') {
            if (node._type === 'product') {
              return normalizeSanityProductDocumentBackwardCompatible(node);
            }
            if (node._type === 'article') {
              return normalizeSanityArticleDocumentBackwardCompatible(node);
            }
            const out: Record<string, any> = {};
            for (const [k, v] of Object.entries(node)) {
              out[k] = normalizeNode(v);
            }
            return out;
          }
          return node;
        };
        const normalizedPayload = normalizeNode(parsed);
        res.end(Buffer.from(JSON.stringify(normalizedPayload), 'utf8'));
        return;
      } catch {
        // Fall through to raw buffer
      }
    }

    res.end(Buffer.from(arrayBuf));
  } catch (err: any) {
    sendJson(req, res, 502, {
      ok: false,
      errorCode: 'SANITY_LAKE_PROXY_ERROR',
      message: err?.message || 'Failed to reach Sanity Content Lake upstream.',
    });
  }
}

export async function handleSanityStudioApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  const rawUrl = req.url ?? '';

  // Support Official Sanity Studio client-side sub-routes (e.g. /studio/structure/..., /studio/ai-authoring)
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    rawUrl.startsWith('/studio/') &&
    rawUrl !== '/studio/' &&
    !rawUrl.startsWith('/studio/index') &&
    !rawUrl.includes('.')
  ) {
    req.url = '/studio/';
    next();
    return;
  }

  if (!rawUrl.startsWith('/api/studio/sanity')) {
    next();
    return;
  }

  const parsedUrl = new URL(rawUrl, 'http://localhost:3000');
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/api/studio/sanity';
  const method = (req.method ?? 'GET').toUpperCase();

  // Official Sanity Studio Content Lake Proxy (`/api/studio/sanity/lake/*`)
  if (
    pathname === '/api/studio/sanity/lake' ||
    pathname.startsWith('/api/studio/sanity/lake/')
  ) {
    await handleSanityLakeProxyRequest(req, res, parsedUrl);
    return;
  }

  // Same-origin development session bootstrap/renewal endpoint
  if (method === 'GET' && pathname === '/api/studio/sanity/session') {
    if (!isStudioDevelopmentEnvironmentAllowed()) {
      sendJson(req, res, 403, {
        ok: false,
        errorCode: 'STUDIO_DISABLED_IN_PRODUCTION',
        message: 'Sanity Editorial Studio APIs are disabled in production deployments.',
      });
      return;
    }
    const originCheck = verifySameOriginRequestHeaders(req);
    if (!originCheck.allowed) {
      sendJson(req, res, 403, {
        ok: false,
        errorCode: 'CROSS_ORIGIN_REQUEST_BLOCKED',
        message: originCheck.reason || 'Cross-origin request blocked.',
      });
      return;
    }
    const credentials = issueStudioEditorSessionCredentials();
    if (!credentials) {
      sendJson(req, res, 403, {
        ok: false,
        errorCode: 'STUDIO_DISABLED_IN_PRODUCTION',
        message: 'Unable to issue Studio session credentials outside development.',
      });
      return;
    }
    sendJson(req, res, 200, {
      ok: true,
      sessionCredentials: credentials,
    });
    return;
  }

  // Real Authenticated SSR Draft Preview endpoint (supports signed ticket OR header session auth)
  if (method === 'GET' && pathname === '/api/studio/sanity/preview-product') {
    if (!isStudioDevelopmentEnvironmentAllowed()) {
      sendHtml(
        res,
        403,
        '<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>403 — Studio Preview Disabled in Production</h1></body></html>'
      );
      return;
    }
    const originCheck = verifySameOriginRequestHeaders(req);
    if (!originCheck.allowed) {
      sendHtml(
        res,
        403,
        '<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>403 — Cross-Origin Preview Blocked</h1></body></html>'
      );
      return;
    }

    const docId = (parsedUrl.searchParams.get('id') ?? '').trim();
    const ticket = (parsedUrl.searchParams.get('ticket') ?? '').trim();
    if (!docId) {
      sendHtml(
        res,
        400,
        '<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>400 — Missing Preview Document ID</h1></body></html>'
      );
      return;
    }

    const ticketCheck = verifyStudioPreviewTicket(ticket, docId);
    const headerAuth = !ticketCheck.valid
      ? verifyStudioApiRequestAuthorization(req, { requireCsrf: false })
      : null;

    if (!ticketCheck.valid && !headerAuth?.authorized) {
      sendHtml(
        res,
        401,
        `<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>401 — Unauthorized Preview Request</h1><p>${ticketCheck.reason || headerAuth?.message || 'Valid preview ticket or Studio session required.'}</p></body></html>`
      );
      return;
    }

    try {
      const cleanCanonical = docId.replace(/^drafts\./, '');
      const primaryId = docId;
      const secondaryId = docId.startsWith('drafts.')
        ? cleanCanonical
        : `drafts.${cleanCanonical}`;

      let liveDoc = await fetchDocumentFromSanityContentLake(primaryId);
      if (!liveDoc) {
        liveDoc = await fetchDocumentFromSanityContentLake(secondaryId);
      }

      if (!liveDoc || liveDoc._type !== 'product') {
        sendHtml(
          res,
          404,
          `<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>404 — Sanity Product Not Found</h1><p>No live Sanity draft or published product exists for "${docId}".</p></body></html>`
        );
        return;
      }

      const creds = resolveSanityServerCredentials();
      const previewRenderer = await loadPreviewRendererModule();
      const rendered = await previewRenderer.renderSanityProductPreviewHtml({
        document: liveDoc,
        projectId: creds.projectId,
        dataset: creds.dataset,
      });

      sendHtml(res, 200, rendered.html);
      return;
    } catch (err: any) {
      sendHtml(
        res,
        500,
        `<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>500 — Preview Render Error</h1><p>${String(err?.message || 'Failed to render Sanity draft preview.')}</p></body></html>`
      );
      return;
    }
  }

  // Real Authenticated SSR Article Preview endpoint (`/api/studio/sanity/preview-article`)
  if (method === 'GET' && pathname === '/api/studio/sanity/preview-article') {
    if (!isStudioDevelopmentEnvironmentAllowed()) {
      sendHtml(
        res,
        403,
        '<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>403 — Studio Preview Disabled in Production</h1></body></html>'
      );
      return;
    }
    const originCheck = verifySameOriginRequestHeaders(req);
    if (!originCheck.allowed) {
      sendHtml(
        res,
        403,
        '<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>403 — Cross-Origin Preview Blocked</h1></body></html>'
      );
      return;
    }

    const docId = (parsedUrl.searchParams.get('id') ?? '').trim();
    const slugParam = (parsedUrl.searchParams.get('slug') ?? '').trim();
    const ticket = (parsedUrl.searchParams.get('ticket') ?? '').trim();
    if (!docId && !slugParam) {
      sendHtml(
        res,
        400,
        '<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>400 — Missing Preview Article ID or Slug</h1></body></html>'
      );
      return;
    }

    const ticketCheck = docId
      ? verifyStudioPreviewTicket(ticket, docId)
      : { valid: false, reason: 'No document ID for ticket' };
    const headerAuth = !ticketCheck.valid
      ? verifyStudioApiRequestAuthorization(req, { requireCsrf: false })
      : null;

    if (!ticketCheck.valid && !headerAuth?.authorized) {
      sendHtml(
        res,
        401,
        `<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>401 — Unauthorized Article Preview Request</h1><p>${ticketCheck.reason || headerAuth?.message || 'Valid preview ticket or Studio session required.'}</p></body></html>`
      );
      return;
    }

    try {
      const previewRenderer = await loadPreviewRendererModule();
      const rendered = await previewRenderer.renderSanityArticlePreviewHtml({
        documentId: docId || undefined,
        slug: slugParam || undefined,
      });

      if (!rendered) {
        sendHtml(
          res,
          404,
          `<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>404 — Sanity Article Not Found</h1><p>No live Sanity draft or published article exists for "${docId || slugParam}".</p></body></html>`
        );
        return;
      }

      sendHtml(res, 200, rendered.html);
      return;
    } catch (err: any) {
      sendHtml(
        res,
        500,
        `<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><h1>500 — Article Preview Render Error</h1><p>${String(err?.message || 'Failed to render Sanity article preview.')}</p></body></html>`
      );
      return;
    }
  }

  // Detect if an upstream proxy 302 redirect converted a POST request into a GET request
  if (method === 'GET' && POST_ONLY_STUDIO_PATHS.has(pathname)) {
    sendJson(req, res, 405, {
      ok: false,
      errorCode: 'POST_CONVERTED_TO_GET_BY_REDIRECT',
      message: `Endpoint ${pathname} requires HTTP POST, but received GET (an upstream proxy redirect may have converted POST to GET).`,
    });
    return;
  }

  const isMutation = method === 'POST';

  // Enforce server-verified editor authentication & CSRF protection on ALL endpoints
  const authCheck = verifyStudioApiRequestAuthorization(req, {
    requireCsrf: isMutation,
  });

  if (!authCheck.authorized) {
    sendJson(req, res, authCheck.httpStatus, {
      ok: false,
      errorCode: authCheck.errorCode,
      message: authCheck.message,
    });
    return;
  }

  try {
    if (method === 'GET' && pathname === '/api/studio/sanity/status') {
      const status = await getSanityContentLakeStatus();
      sendJson(req, res, 200, status);
      return;
    }

    if (method === 'GET' && pathname === '/api/studio/sanity/drafts') {
      const drafts = await listDraftsFromSanityContentLake();
      sendJson(req, res, 200, {
        ok: true,
        count: drafts.length,
        drafts,
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/studio/sanity/published') {
      const products = await listPublishedProductsFromSanityContentLake();
      sendJson(req, res, 200, {
        ok: true,
        count: products.length,
        products,
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/studio/sanity/document') {
      const rawId = (parsedUrl.searchParams.get('id') ?? '').trim();
      if (!rawId) {
        sendJson(req, res, 400, {
          ok: false,
          errorCode: 'MISSING_DOCUMENT_ID',
          message: 'Query parameter `id` is required.',
        });
        return;
      }
      const docId = rawId.startsWith('drafts.') ? rawId : `drafts.${rawId}`;
      const doc = await fetchDocumentFromSanityContentLake(docId);
      if (!doc) {
        sendJson(req, res, 404, {
          ok: false,
          errorCode: 'DRAFT_NOT_FOUND',
          message: `Draft document "${docId}" was not found in Sanity Content Lake.`,
        });
        return;
      }
      sendJson(req, res, 200, {
        ok: true,
        document: doc,
        draft: doc,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/open-or-create-draft') {
      const body = await readJsonBody(req);
      const canonicalId = String(body?.canonicalId ?? body?.productId ?? body?.id ?? '')
        .trim()
        .replace(/^drafts\./, '');
      const localFallback =
        body?.localProductFallback ?? (canonicalId ? PRODUCTS[canonicalId] : undefined);
      const result = await ensureEditableDraftInSanityContentLake({
        canonicalId,
        localProductFallback: localFallback,
      });
      sendJson(req, res, result.status, {
        ...result,
        errorCode: result.blockerCode,
        validationIssues: result.serverValidation?.blockingDraftErrors ?? [],
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/save-draft') {
      const body = await readJsonBody(req);
      const doc = body?.document ?? body;
      const result = await saveDraftToSanityContentLake(doc);
      sendJson(req, res, result.status, {
        ...result,
        savedDocument: result.persistedDocument,
        errorCode: result.blockerCode,
        validationIssues:
          result.serverValidation?.blockingDraftErrors ?? [],
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/fetch-product-details') {
      const body = await readJsonBody(req);
      const targetUrl = String(body?.url ?? body?.productUrl ?? '').trim();
      const extracted = await extractProductDetailsFromUrl(targetUrl);
      if (!extracted.ok) {
        sendJson(req, res, extracted.status, {
          ok: false,
          errorCode: extracted.errorCode,
          message: extracted.message,
          sourceUrl: extracted.sourceUrl,
        });
        return;
      }
      sendJson(req, res, 200, {
        ...extracted,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/publish-product') {
      const body = await readJsonBody(req);
      const result = await publishProductDraftInSanityContentLake({
        document: body?.document,
        canonicalId: body?.canonicalId,
        draftId: body?.draftId,
        expectedRev: body?.expectedRev,
      });
      invalidateSanityPublishedCache();
      sendJson(req, res, result.status, {
        ...result,
        errorCode: result.blockerCode,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/unpublish-product') {
      const body = await readJsonBody(req);
      const result = await unpublishProductInSanityContentLake({
        document: body?.document,
        canonicalId: body?.canonicalId,
        expectedRev: body?.expectedRev,
      });
      invalidateSanityPublishedCache();
      sendJson(req, res, result.status, {
        ...result,
        errorCode: result.blockerCode,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/publish-article') {
      const body = await readJsonBody(req);
      const result = await publishArticleDraftInSanityContentLake({
        document: body?.document,
        canonicalId: body?.canonicalId ?? body?.documentId ?? body?.id,
        draftId: body?.draftId,
      });
      invalidateSanityPublishedCache();
      sendJson(req, res, result.status, {
        ...result,
        errorCode: result.blockerCode,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/unpublish-article') {
      const body = await readJsonBody(req);
      const result = await unpublishArticleInSanityContentLake({
        document: body?.document,
        canonicalId: body?.canonicalId ?? body?.documentId ?? body?.id,
      });
      invalidateSanityPublishedCache();
      sendJson(req, res, result.status, {
        ...result,
        errorCode: result.blockerCode,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/preview-ticket') {
      const body = await readJsonBody(req);
      const documentId = String(body?.documentId ?? body?.id ?? '').trim();
      if (!documentId) {
        sendJson(req, res, 400, {
          ok: false,
          errorCode: 'MISSING_DOCUMENT_ID',
          message: 'Field `documentId` is required to issue a preview ticket.',
        });
        return;
      }
      const issued = issueStudioPreviewTicket(documentId);
      if (!issued) {
        sendJson(req, res, 403, {
          ok: false,
          errorCode: 'STUDIO_DISABLED_IN_PRODUCTION',
          message: 'Preview tickets cannot be issued outside development.',
        });
        return;
      }
      const cleanId = documentId.replace(/^drafts\./, '');
      const isArticle =
        cleanId.startsWith('art_') || body?.documentType === 'article';
      const previewRoute = isArticle
        ? '/api/studio/sanity/preview-article'
        : '/api/studio/sanity/preview-product';
      sendJson(req, res, 200, {
        ok: true,
        documentId,
        ticket: issued.ticket,
        expiresAtMs: issued.expiresAtMs,
        previewUrl: `${previewRoute}?id=${encodeURIComponent(
          documentId
        )}&ticket=${encodeURIComponent(issued.ticket)}`,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/delete-draft') {
      const body = await readJsonBody(req);
      const docId = String(body?.documentId ?? body?.id ?? '').trim();
      const result = await deleteDraftFromSanityContentLake(docId);
      sendJson(req, res, result.status, result);
      return;
    }

    if (
      method === 'POST' &&
      (pathname === '/api/studio/sanity/upload-image' ||
        pathname === '/api/studio/sanity/upload-images')
    ) {
      const body = await readJsonBody(req);
      const rawFiles = Array.isArray(body?.files)
        ? body.files
        : body && typeof body === 'object' && body.base64Data
        ? [body]
        : [];

      if (rawFiles.length === 0) {
        sendJson(req, res, 400, {
          ok: false,
          status: 400,
          errorCode: 'NO_FILES_PROVIDED',
          message:
            'Provide one or more image files (`files: [{ filename, mimeType, base64Data }]`) to upload to Sanity Content Lake.',
        });
        return;
      }

      const uploadInputs: SanityImageUploadInput[] = rawFiles.map((item: any) => ({
        buffer:
          typeof item?.base64Data === 'string'
            ? decodeBase64UploadPayload(item.base64Data)
            : Buffer.alloc(0),
        filename: String(item?.filename || 'product-photo.jpg'),
        mimeType: String(item?.mimeType || 'image/jpeg'),
        alt: typeof item?.alt === 'string' ? item.alt : undefined,
        caption: typeof item?.caption === 'string' ? item.caption : undefined,
        fitMode: item?.fitMode === 'contain' ? 'contain' : 'cover',
        focalPoint:
          item?.focalPoint &&
          typeof item.focalPoint.x === 'number' &&
          typeof item.focalPoint.y === 'number'
            ? { x: item.focalPoint.x, y: item.focalPoint.y }
            : undefined,
        fallbackColor:
          typeof item?.fallbackColor === 'string' ? item.fallbackColor : undefined,
        existingImageId:
          typeof item?.existingImageId === 'string' ? item.existingImageId : undefined,
      }));

      if (pathname === '/api/studio/sanity/upload-image' && uploadInputs.length === 1) {
        const singleResult = await uploadImageAssetToSanityContentLake(uploadInputs[0]);
        sendJson(req, res, singleResult.status, singleResult);
        return;
      }

      const batchResult = await uploadMultipleImageAssetsToSanityContentLake(uploadInputs);
      sendJson(req, res, batchResult.status, batchResult);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/verify-lifecycle'
    ) {
      const report = await runDisposableDraftPersistenceVerificationTest();
      sendJson(req, res, report.allStepsPassed ? 200 : 500, report);
      return;
    }

    if (method === 'GET' && pathname === '/api/studio/sanity/ai-profiles') {
      await ensureDefaultAiWritingProfileInSanity();
      const profiles = await listAiWritingProfilesFromSanity();
      sendJson(req, res, 200, {
        ok: true,
        count: profiles.length,
        profiles,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/ai-profiles') {
      const body = await readJsonBody(req);
      const profileInput = body?.profile ?? body;
      const publishImmediately = body?.publishImmediately !== false;
      const result = await saveAiWritingProfileToSanity(
        profileInput,
        publishImmediately
      );
      sendJson(req, res, result.ok ? 200 : 422, result);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/ensure-eval-hoodie-copy'
    ) {
      const result = await ensureEvaluationHoodieCopyInSanity();
      sendJson(req, res, result.ok ? 200 : 500, result);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/ai-generate-supporting'
    ) {
      const body = await readJsonBody(req);
      const result = await generateProductSupportingFields(body || {});
      sendJson(req, res, 200, result);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/ai-generate-editorial'
    ) {
      const body = await readJsonBody(req);
      const result = await generateProductEditorialCopy(body || {});
      sendJson(req, res, 200, result);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/ai-generate-complete'
    ) {
      const body = await readJsonBody(req);
      const result = await generateCompleteProductProposal(body || {});
      sendJson(req, res, 200, result);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/ai-polish-editorial'
    ) {
      const body = await readJsonBody(req);
      const result = await polishProductEditorialCopy(body || {});
      sendJson(req, res, 200, result);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/ai-article-generate'
    ) {
      const body = await readJsonBody(req);
      const result = await generateCompleteArticleWithAi(body || {});
      sendJson(req, res, 200, result);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/ai-article-improve'
    ) {
      const body = await readJsonBody(req);
      const result = await improveArticleWithAi(body || {});
      sendJson(req, res, 200, result);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/ai-article-export-brief'
    ) {
      const body = await readJsonBody(req);
      const result = await exportArticleAiBrief({
        mode: body?.mode === 'revision' ? 'revision' : 'create',
        topic: body?.topic,
        editorialAngle: body?.editorialAngle,
        researchNotes: body?.researchNotes,
        revisionGoals: body?.revisionGoals,
        writingProfile: body?.writingProfile,
        writingProfileId: body?.writingProfileId,
        currentDocument: body?.currentDocument,
      });
      sendJson(req, res, 200, { ok: true, ...result });
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/ai-article-import-payload'
    ) {
      const body = await readJsonBody(req);
      const result = parseImportedArticlePayload(
        String(body?.rawPayload ?? body?.jsonText ?? ''),
        body?.currentDocument
      );
      sendJson(req, res, result.ok ? 200 : 422, result);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/delete-disposable-article'
    ) {
      const body = await readJsonBody(req);
      const result = await deleteDisposableTestArticleFromSanity(
        String(body?.documentId ?? body?.canonicalId ?? '')
      );
      invalidateSanityPublishedCache();
      sendJson(req, res, result.ok ? 200 : 422, result);
      return;
    }

    if (method === 'GET' && pathname === '/api/studio/sanity/published-articles') {
      await ensureDefaultArticleAiWritingProfileInSanity();
      const articles = await listPublishedArticlesFromSanityContentLake();
      sendJson(req, res, 200, {
        ok: true,
        count: articles.length,
        articles,
      });
      return;
    }

    sendJson(req, res, 404, {
      ok: false,
      errorCode: 'UNKNOWN_STUDIO_ENDPOINT',
      message: `Unknown Sanity Studio API endpoint: ${method} ${pathname}`,
    });
  } catch (err: any) {
    const isInvalidJson = err?.code === 'INVALID_JSON_BODY';
    sendJson(req, res, isInvalidJson ? 400 : 500, {
      ok: false,
      errorCode: isInvalidJson ? 'INVALID_JSON_BODY' : 'INTERNAL_STUDIO_API_ERROR',
      message: err?.message ?? 'Internal server error in Sanity Studio API.',
    });
  }
}

export function sanityStudioApiPlugin() {
  let isBuild = false;
  return {
    name: 'science-of-gifts-sanity-studio-api',
    configResolved(config: { command?: string }) {
      isBuild = config.command === 'build';
    },
    configureServer(server: {
      middlewares: { use: Function };
      ssrLoadModule?: (url: string) => Promise<any>;
      moduleGraph?: any;
      watcher?: any;
    }) {
      // Only mount in development environment; fail closed in production
      if (!isStudioDevelopmentEnvironmentAllowed()) {
        return;
      }
      activeViteDevServer = server;
      (globalThis as any).__SOG_VITE_DEV_SERVER__ = server;
      server.middlewares.use(handleSanityStudioApiRequest);
    },
    closeBundle() {
      // Ensure `/studio/` is stripped if a static production build is run
      if (isBuild) {
        const distStudioDir = path.resolve(process.cwd(), 'dist', 'studio');
        if (fs.existsSync(distStudioDir)) {
          try {
            fs.rmSync(distStudioDir, { recursive: true, force: true });
          } catch {}
        }
      }
    },
  };
}
