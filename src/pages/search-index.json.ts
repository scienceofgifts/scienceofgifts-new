import type { APIRoute } from 'astro';
import { ENABLE_EDITORIAL_HUB_DEV_NAV_PREVIEW } from '../config/navigationConfig';
import { buildSiteSearchIndex } from '../utils/siteSearchEngine';

export const GET: APIRoute = () => {
  const items = buildSiteSearchIndex({
    includeDevSampleProducts: true,
    includeDevEditorialHubs: ENABLE_EDITORIAL_HUB_DEV_NAV_PREVIEW,
  });

  return new Response(
    JSON.stringify({
      generatedAt: '2026-03-30',
      items,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
};
