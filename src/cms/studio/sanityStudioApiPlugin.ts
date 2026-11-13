/**
 * Science of Gifts — Server-Side Sanity Studio API Middleware & Production Isolation Plugin
 *
 * Security & Isolation Guarantees:
 * 1. Only mounts `/api/studio/sanity/*` in the private development server (`configureServer`
 *    when `NODE_ENV !== 'production'`). Never mounts in `configurePreviewServer` or production.
 * 2. Every endpoint (`/status`, `/drafts`, `/document`, `/save-draft`, `/delete-draft`,
 *    `/verify-lifecycle`) enforces `verifyStudioApiRequestAuthorization`:
 *    - Rejects unauthenticated requests with HTTP 401 (`MISSING_AUTH_TOKEN` / `INVALID_OR_EXPIRED_AUTH_TOKEN`).
 *    - Rejects state-changing `POST` requests without a valid paired `X-Sanity-Studio-Csrf`
 *      header or `Content-Type: application/json` with HTTP 403 (`CSRF_VALIDATION_FAILED`).
 *    - Rejects cross-origin requests (`Sec-Fetch-Site: cross-site` or mismatched `Origin`) with HTTP 403.
 * 3. Strips `dist/studio` during static production builds (`closeBundle`) so `/studio/` can never
 *    be deployed publicly as part of the static Astro website.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  deleteDraftFromSanityContentLake,
  fetchDocumentFromSanityContentLake,
  getSanityContentLakeStatus,
  listDraftsFromSanityContentLake,
  runDisposableDraftPersistenceVerificationTest,
  saveDraftToSanityContentLake,
  uploadImageAssetToSanityContentLake,
  uploadMultipleImageAssetsToSanityContentLake,
  type SanityImageUploadInput,
} from './sanityServerClient';
import {
  isStudioDevelopmentEnvironmentAllowed,
  issueStudioEditorSessionCredentials,
  verifySameOriginRequestHeaders,
  verifyStudioApiRequestAuthorization,
} from './sanityStudioAuth';

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
 * If an upstream server responds with HTTP 403 behind `X-Forwarded-Host`, Nginx
 * intercepts the response and replaces the JSON body with an HTML page.
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

const POST_ONLY_STUDIO_PATHS = new Set<string>([
  '/api/studio/sanity/save-draft',
  '/api/studio/sanity/delete-draft',
  '/api/studio/sanity/upload-image',
  '/api/studio/sanity/upload-images',
  '/api/studio/sanity/verify-lifecycle',
]);

export async function handleSanityStudioApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  const rawUrl = req.url ?? '';
  if (!rawUrl.startsWith('/api/studio/sanity')) {
    next();
    return;
  }

  const parsedUrl = new URL(rawUrl, 'http://localhost:3000');
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/api/studio/sanity';
  const method = (req.method ?? 'GET').toUpperCase();

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

    if (method === 'GET' && pathname === '/api/studio/sanity/document') {
      const docId = (parsedUrl.searchParams.get('id') ?? '').trim();
      if (!docId) {
        sendJson(req, res, 400, {
          ok: false,
          errorCode: 'MISSING_DOCUMENT_ID',
          message: 'Query parameter `id` is required.',
        });
        return;
      }
      if (!docId.startsWith('drafts.')) {
        sendJson(req, res, 422, {
          ok: false,
          errorCode: 'NON_DRAFT_ID_REJECTED',
          message:
            'Studio draft endpoint only reads unpublished `drafts.*` documents.',
        });
        return;
      }
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
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/save-draft') {
      const body = await readJsonBody(req);
      const doc = body?.document ?? body;
      const result = await saveDraftToSanityContentLake(doc);
      sendJson(req, res, result.status, {
        ...result,
        errorCode: result.blockerCode,
        validationIssues:
          result.serverValidation?.blockingDraftErrors ?? [],
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
    configureServer(server: { middlewares: { use: Function } }) {
      // Only mount in development environment; fail closed in production
      if (!isStudioDevelopmentEnvironmentAllowed()) {
        return;
      }
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
