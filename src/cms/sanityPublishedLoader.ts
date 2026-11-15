/**
 * Science of Gifts — Server-Side Sanity Content Lake Published Loader
 *
 * Fetches strictly published (`!(_id in path("drafts.**")) && status == "published"`)
 * `product` documents from Sanity Content Lake at Astro build time and during Astro dev SSR.
 *
 * Security & Reliability Guarantees:
 * - Uses `resolveSanityServerCredentials()` strictly on the server; `SANITY_API_READ_TOKEN`
 *   is never exposed to client bundles.
 * - Never includes `drafts.*` documents on public routes.
 * - When Sanity credentials ARE configured, explicitly throws `SanityContentFetchError` on
 *   HTTP/network failure instead of silently masking an outage with stale data.
 */

import type { Product } from '../types/content';
import { mapSanityProductDocumentToAstroProduct } from './studio/productDocumentMapper';
import { resolveSanityServerCredentials } from './studio/sanityServerClient';

export class SanityContentFetchError extends Error {
  public readonly statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'SanityContentFetchError';
    this.statusCode = statusCode;
  }
}

const DEV_CACHE_TTL_MS = 2_000;

interface CachedPublishedState {
  products: Product[];
  fetchedAt: number;
  projectId: string;
  dataset: string;
}

const globalCacheHolder = globalThis as unknown as {
  __SOG_SANITY_PUBLISHED_PRODUCTS_CACHE__?: CachedPublishedState | null;
  __SOG_SANITY_SYNC_VERSION__?: number;
};

/**
 * Invalidates the in-memory Sanity published products cache immediately after a
 * Studio publish action so the next Astro dev request reads the fresh Content Lake state.
 */
export function invalidateSanityPublishedCache(): void {
  globalCacheHolder.__SOG_SANITY_PUBLISHED_PRODUCTS_CACHE__ = null;
  globalCacheHolder.__SOG_SANITY_SYNC_VERSION__ =
    (globalCacheHolder.__SOG_SANITY_SYNC_VERSION__ || 0) + 1;
}

export function getSanityPublishedCacheVersion(): number {
  return globalCacheHolder.__SOG_SANITY_SYNC_VERSION__ || 0;
}

/**
 * Queries Sanity Content Lake (`perspective=published`) for all published `product`
 * documents and maps them into Astro `Product` objects.
 */
export async function loadPublishedSanityProducts(options?: {
  forceRefresh?: boolean;
  envOverride?: Record<string, string | undefined>;
}): Promise<{
  products: Product[];
  fetchedAt: number;
  fromCache: boolean;
}> {
  const creds = resolveSanityServerCredentials(options?.envOverride);
  if (!creds.projectId || !creds.dataset) {
    return {
      products: [],
      fetchedAt: Date.now(),
      fromCache: false,
    };
  }

  const now = Date.now();
  const cached = globalCacheHolder.__SOG_SANITY_PUBLISHED_PRODUCTS_CACHE__;
  if (
    !options?.forceRefresh &&
    cached &&
    cached.projectId === creds.projectId &&
    cached.dataset === creds.dataset &&
    now - cached.fetchedAt < DEV_CACHE_TTL_MS
  ) {
    return {
      products: cached.products,
      fetchedAt: cached.fetchedAt,
      fromCache: true,
    };
  }

  const groq = encodeURIComponent(
    `*[_type == "product" && !(_id in path("drafts.**")) && status == "published"] | order(_updatedAt desc)`
  );
  const url = `https://${creds.projectId}.api.sanity.io/v${creds.apiVersion}/data/query/${creds.dataset}?query=${groq}&perspective=published`;

  const headers: Record<string, string> = {};
  if (creds.readToken) {
    headers.Authorization = `Bearer ${creds.readToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err: any) {
    throw new SanityContentFetchError(
      `Failed to connect to Sanity Content Lake (${creds.projectId}/${creds.dataset}) while loading published products: ${err?.message ?? String(err)}`
    );
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new SanityContentFetchError(
      `Sanity Content Lake published products query returned HTTP ${res.status}: ${bodyText.slice(0, 240)}`,
      res.status
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err: any) {
    throw new SanityContentFetchError(
      `Sanity Content Lake published products query returned invalid JSON: ${err?.message ?? String(err)}`
    );
  }

  const rawDocs: any[] = Array.isArray(data?.result) ? data.result : [];
  const mappedProducts = rawDocs
    .filter(
      (doc) =>
        doc &&
        typeof doc === 'object' &&
        doc._type === 'product' &&
        !String(doc._id || '').startsWith('drafts.') &&
        doc.status === 'published'
    )
    .map((doc) =>
      mapSanityProductDocumentToAstroProduct(doc, {
        projectId: creds.projectId,
        dataset: creds.dataset,
      })
    );

  globalCacheHolder.__SOG_SANITY_PUBLISHED_PRODUCTS_CACHE__ = {
    products: mappedProducts,
    fetchedAt: Date.now(),
    projectId: creds.projectId,
    dataset: creds.dataset,
  };

  return {
    products: mappedProducts,
    fetchedAt: globalCacheHolder.__SOG_SANITY_PUBLISHED_PRODUCTS_CACHE__.fetchedAt,
    fromCache: false,
  };
}
