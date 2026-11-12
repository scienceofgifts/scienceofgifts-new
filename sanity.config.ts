/**
 * Science of Gifts — Sanity Studio v3 Configuration
 *
 * Uses environment-driven configuration (`SANITY_STUDIO_PROJECT_ID` / `SANITY_PROJECT_ID`
 * and `SANITY_STUDIO_DATASET` / `SANITY_DATASET`) without hardcoded or fabricated credentials.
 *
 * Enforces:
 * - Registration of all 9 document types and 34 reusable object types.
 * - Custom 3-group editorial desk structure (`Editorial Content`, `Discovery & Organization`, `Publication Settings`).
 * - Singleton protection on `siteSettings` (blocks creating multiple conflicting Site Settings documents or deleting the singleton).
 */

import {
  defineConfig,
  parseStrictBooleanEnv,
  resolveSanityEnvironmentConfig,
  isSanityStudioEnvConfigured,
  type ResolvedSanityEnvironmentConfig,
} from './src/cms/studio/sanityCore';
import { ALL_SANITY_STUDIO_TYPES } from './src/cms/studio/schemas';
import { buildScienceOfGiftsDeskStructure } from './src/cms/studio/deskStructure';
import { SITE_SETTINGS_SINGLETON_ID } from './src/cms/studio/schemas/documents/siteSettings';

export {
  parseStrictBooleanEnv,
  resolveSanityEnvironmentConfig,
  isSanityStudioEnvConfigured,
  type ResolvedSanityEnvironmentConfig,
};

const SINGLETON_TYPES = new Set<string>(['siteSettings']);
const SINGLETON_ACTIONS = new Set<string>(['publish', 'discardChanges', 'restore']);

export const SANITY_STUDIO_ENV: ResolvedSanityEnvironmentConfig =
  resolveSanityEnvironmentConfig();

export default defineConfig({
  name: 'science-of-gifts-studio',
  title: 'Science of Gifts — Editorial Studio',
  projectId: SANITY_STUDIO_ENV.projectId,
  dataset: SANITY_STUDIO_ENV.dataset,
  apiVersion: SANITY_STUDIO_ENV.apiVersion,
  basePath: '/studio',
  plugins: [
    {
      name: 'structureTool',
      options: {
        structure: buildScienceOfGiftsDeskStructure,
        singletonDocumentId: SITE_SETTINGS_SINGLETON_ID,
      },
    },
  ],
  schema: {
    types: ALL_SANITY_STUDIO_TYPES,
    // Prevent editors from creating new singleton documents via global "New Document" menu
    templates: (prev) =>
      prev.filter((template) => !SINGLETON_TYPES.has(template.schemaType)),
  },
  document: {
    newDocumentOptions: (prev, { creationContext }) => {
      if (creationContext.type === 'global') {
        return prev.filter(
          (templateItem) => !SINGLETON_TYPES.has(templateItem.templateId)
        );
      }
      return prev;
    },
    actions: (prev, { schemaType }) => {
      if (SINGLETON_TYPES.has(schemaType)) {
        return prev.filter(
          (item) => item.action && SINGLETON_ACTIONS.has(item.action)
        );
      }
      return prev;
    },
  },
});
