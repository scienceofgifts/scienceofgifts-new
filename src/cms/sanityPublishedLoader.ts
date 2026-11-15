/**
 * Science of Gifts — Server-Side Published Sanity Content Lake Loader
 *
 * Bridges published Sanity Content Lake documents (`!(_id in path("drafts.**")) && status == "published"`)
 * into the Astro `contentRepository` during SSR/SSG builds and development requests.
 *
 * Guarantees:
 * - Strictly excludes `drafts.*` documents and any record where `status !== 'published'`.
 * - Maps published Sanity `product` and `article` documents into canonical Astro `Product`
 *   and `Article` records.
 * - Provides explicit cache invalidation (`invalidateSanityPublishedCache()`) called
 *   immediately after any `/api/studio/sanity/publish-*` or `/api/studio/sanity/unpublish-*` mutation.
 */

import path from 'node:path';
import type { Article, Product } from '../types/content';
import { mapSanityProductDocumentToAstroProduct } from './studio/productDocumentMapper';
import { mapSanityArticleToAstroArticle } from './studio/articleDocumentMapper';
import {
  fetchPublishedSiteSettingsFromSanityContentLake,
  listPublishedArticlesFromSanityContentLake,
  listPublishedProductsFromSanityContentLake,
} from './studio/sanityServerClient';

interface CachedPublishedSnapshot {
  fetchedAtMs: number;
  version: number;
  products: Product[];
  articles: Article[];
  siteSettings: Record<string, any> | null;
  rawSanityDocs: Array<Record<string, any>>;
  rawSanityArticleDocs: Array<Record<string, any>>;
}

interface GlobalSanityCacheState {
  publishedCacheVersion: number;
  cachedSnapshot: CachedPublishedSnapshot | null;
}

const globalCacheHost = globalThis as unknown as {
  __SOG_SANITY_PUBLISHED_CACHE_STATE__?: GlobalSanityCacheState;
  __SOG_VITE_DEV_SERVER__?: {
    moduleGraph?: {
      getModuleById?: (id: string) => any;
      getModulesByFile?: (file: string) => Set<any> | undefined;
      invalidateModule?: (mod: any) => void;
    };
    watcher?: {
      emit?: (event: string, filePath: string) => void;
    };
  } | null;
};

if (!globalCacheHost.__SOG_SANITY_PUBLISHED_CACHE_STATE__) {
  globalCacheHost.__SOG_SANITY_PUBLISHED_CACHE_STATE__ = {
    publishedCacheVersion: 1,
    cachedSnapshot: null,
  };
}

const CACHE_TTL_MS = 15_000;

export function invalidateSanityPublishedCache(): void {
  const state = globalCacheHost.__SOG_SANITY_PUBLISHED_CACHE_STATE__!;
  state.publishedCacheVersion += 1;
  state.cachedSnapshot = null;

  const viteServer = globalCacheHost.__SOG_VITE_DEV_SERVER__;
  if (viteServer && typeof process !== 'undefined' && process.cwd) {
    const relFiles = [
      'src/layouts/BaseLayout.astro',
      'src/pages/index.astro',
      'src/pages/articles/[slug].astro',
      'src/pages/articles/index.astro',
      'src/pages/products/[slug].astro',
      'src/cms/sanityPublishedLoader.ts',
      'src/cms/contentRepository.ts',
    ];
    for (const rel of relFiles) {
      const absPath = path.resolve(process.cwd(), rel);
      try {
        const mods = viteServer.moduleGraph?.getModulesByFile?.(absPath);
        if (mods) {
          for (const m of mods) {
            viteServer.moduleGraph?.invalidateModule?.(m);
          }
        }
        const directMod =
          viteServer.moduleGraph?.getModuleById?.(absPath) ||
          viteServer.moduleGraph?.getModuleById?.(`/${rel}`);
        if (directMod) {
          viteServer.moduleGraph?.invalidateModule?.(directMod);
        }
        viteServer.watcher?.emit?.('change', absPath);
      } catch {}
    }
  }
}

export class SanityContentFetchError extends Error {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'SanityContentFetchError';
    this.statusCode = statusCode;
  }
}

export function getSanityPublishedCacheVersion(): number {
  return globalCacheHost.__SOG_SANITY_PUBLISHED_CACHE_STATE__!.publishedCacheVersion;
}

/**
 * Loads all strictly published `product` and `article` documents from Sanity Content Lake
 * and maps them to Astro `Product` and `Article` objects.
 */
export async function loadPublishedSanityProducts(options?: {
  forceRefresh?: boolean;
  envOverride?: Record<string, string | undefined>;
}): Promise<{
  products: Product[];
  articles: Article[];
  siteSettings: Record<string, any> | null;
  rawSanityDocs: Array<Record<string, any>>;
  rawSanityArticleDocs: Array<Record<string, any>>;
  fromCache: boolean;
}> {
  const state = globalCacheHost.__SOG_SANITY_PUBLISHED_CACHE_STATE__!;
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    !options?.envOverride &&
    state.cachedSnapshot &&
    state.cachedSnapshot.version === state.publishedCacheVersion &&
    now - state.cachedSnapshot.fetchedAtMs < CACHE_TTL_MS
  ) {
    return {
      products: state.cachedSnapshot.products,
      articles: state.cachedSnapshot.articles,
      siteSettings: state.cachedSnapshot.siteSettings,
      rawSanityDocs: state.cachedSnapshot.rawSanityDocs,
      rawSanityArticleDocs: state.cachedSnapshot.rawSanityArticleDocs,
      fromCache: true,
    };
  }

  let rawDocs: Array<Record<string, any>> = [];
  let rawArticleDocs: Array<Record<string, any>> = [];
  let rawSiteSettings: Record<string, any> | null = null;
  try {
    [rawDocs, rawArticleDocs, rawSiteSettings] = await Promise.all([
      listPublishedProductsFromSanityContentLake(options?.envOverride),
      listPublishedArticlesFromSanityContentLake(options?.envOverride),
      fetchPublishedSiteSettingsFromSanityContentLake(options?.envOverride),
    ]);
  } catch (err: any) {
    if (err instanceof SanityContentFetchError) {
      throw err;
    }
    throw new SanityContentFetchError(
      err?.message || 'Failed to fetch published documents from Sanity Content Lake.'
    );
  }

  const mappedProducts: Product[] = [];
  for (const doc of rawDocs) {
    if (!doc || typeof doc._id !== 'string') continue;
    if (doc._id.startsWith('drafts.')) continue;
    if (doc.status !== 'published') continue;
    if (doc.isSampleProduct) continue;

    const astroProduct = mapSanityProductDocumentToAstroProduct(doc);
    if (astroProduct.status === 'published' && !astroProduct.isSampleProduct) {
      mappedProducts.push(astroProduct);
    }
  }

  const mappedArticles: Article[] = [];
  for (const doc of rawArticleDocs) {
    if (!doc || typeof doc._id !== 'string') continue;
    if (doc._id.startsWith('drafts.')) continue;
    if (doc.status !== 'published') continue;

    const astroArticle = mapSanityArticleToAstroArticle(doc);
    if (astroArticle.status === 'published') {
      mappedArticles.push(astroArticle);
    }
  }

  if (!options?.envOverride) {
    state.cachedSnapshot = {
      fetchedAtMs: now,
      version: state.publishedCacheVersion,
      products: mappedProducts,
      articles: mappedArticles,
      siteSettings: rawSiteSettings,
      rawSanityDocs: rawDocs,
      rawSanityArticleDocs: rawArticleDocs,
    };
  }

  return {
    products: mappedProducts,
    articles: mappedArticles,
    siteSettings: rawSiteSettings,
    rawSanityDocs: rawDocs,
    rawSanityArticleDocs: rawArticleDocs,
    fromCache: false,
  };
}
