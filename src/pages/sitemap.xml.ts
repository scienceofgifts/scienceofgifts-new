import type { APIRoute } from 'astro';
import { contentRepository } from '../cms/contentRepository';
import { generateXmlSitemap } from '../utils/seoAndValidation';

export const GET: APIRoute = () => {
  const xml = generateXmlSitemap({
    catalog: contentRepository.getCatalogSnapshot(),
    categoryEntries: contentRepository.getAllCategorySeoEntries(),
    editorialHubs: contentRepository.getAllEditorialHubs({
      includeDrafts: true,
    }),
  });

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
