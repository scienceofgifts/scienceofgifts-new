import type { APIRoute } from 'astro';
import { contentRepository } from '../cms/contentRepository';
import { ENABLE_EDITORIAL_HUB_DEV_NAV_PREVIEW } from '../config/navigationConfig';
import { buildSiteSearchIndex } from '../utils/siteSearchEngine';

export const GET: APIRoute = async () => {
  await contentRepository.ensureSyncedFromSanity();
  const items = buildSiteSearchIndex({
    includeDevSampleProducts: true,
    includeDevEditorialHubs: ENABLE_EDITORIAL_HUB_DEV_NAV_PREVIEW,
  });

  const isDev = Boolean(import.meta.env?.DEV);

  return new Response(
    JSON.stringify({
      generatedAt: '2026-03-30',
      items,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': isDev
          ? 'no-store, no-cache, must-revalidate'
          : 'public, max-age=300',
      },
    }
  );
};
