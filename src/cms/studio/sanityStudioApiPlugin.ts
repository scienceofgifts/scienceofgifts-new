/**
 * Science of Gifts — Server-Side Sanity Studio API Middleware Plugin
 *
 * Mounts `/api/studio/sanity/*` routes inside the Node.js Vite/Astro server so:
 * 1. `SANITY_API_WRITE_TOKEN` remains 100% server-side and is never sent to the browser.
 * 2. Every draft save is validated on the server before calling Sanity Content Lake.
 * 3. Reopening a draft fetches the fresh document directly from Sanity Content Lake.
 * 4. Astro's `output: 'static'` build remains completely untouched and continues rendering
 *    the public website from the local catalog (`src/data/catalog.ts`).
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  deleteDraftFromSanityContentLake,
  fetchDocumentFromSanityContentLake,
  getSanityContentLakeStatus,
  listDraftsFromSanityContentLake,
  runDisposableDraftPersistenceVerificationTest,
  saveDraftToSanityContentLake,
} from './sanityServerClient';

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
      } catch (err) {
        reject(new Error('Invalid JSON request body.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(payload));
}

async function handleSanityStudioApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  const rawUrl = req.url ?? '';
  if (!rawUrl.startsWith('/api/studio/sanity/')) {
    next();
    return;
  }

  const parsedUrl = new URL(rawUrl, 'http://localhost:3000');
  const pathname = parsedUrl.pathname;
  const method = (req.method ?? 'GET').toUpperCase();

  try {
    if (method === 'GET' && pathname === '/api/studio/sanity/status') {
      const status = await getSanityContentLakeStatus();
      sendJson(res, 200, status);
      return;
    }

    if (method === 'GET' && pathname === '/api/studio/sanity/drafts') {
      const drafts = await listDraftsFromSanityContentLake();
      sendJson(res, 200, {
        ok: true,
        count: drafts.length,
        drafts,
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/studio/sanity/document') {
      const docId = (parsedUrl.searchParams.get('id') ?? '').trim();
      if (!docId) {
        sendJson(res, 400, {
          ok: false,
          message: 'Query parameter `id` is required.',
        });
        return;
      }
      const doc = await fetchDocumentFromSanityContentLake(docId);
      if (!doc) {
        sendJson(res, 404, {
          ok: false,
          message: `Document "${docId}" was not found in Sanity Content Lake.`,
        });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        document: doc,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/save-draft') {
      const body = await readJsonBody(req);
      const doc = body?.document ?? body;
      const result = await saveDraftToSanityContentLake(doc);
      sendJson(res, result.status, result);
      return;
    }

    if (method === 'POST' && pathname === '/api/studio/sanity/delete-draft') {
      const body = await readJsonBody(req);
      const docId = String(body?.documentId ?? body?.id ?? '').trim();
      const result = await deleteDraftFromSanityContentLake(docId);
      sendJson(res, result.status, result);
      return;
    }

    if (
      method === 'POST' &&
      pathname === '/api/studio/sanity/verify-lifecycle'
    ) {
      const report = await runDisposableDraftPersistenceVerificationTest();
      sendJson(res, report.allStepsPassed ? 200 : 500, report);
      return;
    }

    sendJson(res, 404, {
      ok: false,
      message: `Unknown Sanity Studio API endpoint: ${method} ${pathname}`,
    });
  } catch (err: any) {
    sendJson(res, 500, {
      ok: false,
      message: err?.message ?? 'Internal server error in Sanity Studio API.',
    });
  }
}

export function sanityStudioApiPlugin() {
  return {
    name: 'science-of-gifts-sanity-studio-api',
    configureServer(server: { middlewares: { use: Function } }) {
      server.middlewares.use(handleSanityStudioApiRequest);
    },
    configurePreviewServer(server: { middlewares: { use: Function } }) {
      server.middlewares.use(handleSanityStudioApiRequest);
    },
  };
}
