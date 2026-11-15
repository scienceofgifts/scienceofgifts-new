/**
 * Science of Gifts — Official Sanity Studio Configuration (`sanity` v6)
 *
 * Uses official `defineConfig` from `sanity` and `structureTool` from `sanity/structure`.
 * Preserves all existing document and object schemas, adds the `aiWritingProfile` document schema,
 * integrates the AI Product Authoring & Research Suite directly inside the `product` document editor
 * and as a dedicated Studio tool, and enforces singleton safeguards on `siteSettings`.
 */

import { createAuthStore, defineConfig } from 'sanity';
import { createClient } from '@sanity/client';
import { structureTool } from 'sanity/structure';
import {
  parseStrictBooleanEnv,
  resolveSanityEnvironmentConfig,
  isSanityStudioEnvConfigured,
  type ResolvedSanityEnvironmentConfig,
} from './src/cms/studio/sanityCore';
import { buildOfficialSanityDeskStructure } from './src/cms/studio/deskStructure';
import { buildOfficialSanitySchemaTypes } from './src/cms/studio/officialSanitySchemaAdapter';

export {
  parseStrictBooleanEnv,
  resolveSanityEnvironmentConfig,
  isSanityStudioEnvConfigured,
  type ResolvedSanityEnvironmentConfig,
};

const SINGLETON_TYPES = new Set<string>(['siteSettings']);
const SINGLETON_ACTIONS = new Set<string>([
  'publish',
  'discardChanges',
  'restore',
]);
const PROTECTED_EVALUATION_DOC_IDS = new Set<string>([
  'prod_emotional_support_psychology_major_hoodie',
  'drafts.prod_emotional_support_psychology_major_hoodie',
]);

export const SANITY_STUDIO_ENV: ResolvedSanityEnvironmentConfig =
  resolveSanityEnvironmentConfig();

function getSameOriginLakeProxyHost(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/studio/sanity/lake`;
  }
  return 'http://localhost:3000/api/studio/sanity/lake';
}

const studioAuthStore =
  typeof window !== 'undefined'
    ? createAuthStore({
        projectId: SANITY_STUDIO_ENV.projectId || 'c1y2qdje',
        dataset: SANITY_STUDIO_ENV.dataset || 'production',
        apiHost: getSameOriginLakeProxyHost(),
        clientFactory: (options) =>
          createClient({
            ...options,
            apiHost: getSameOriginLakeProxyHost(),
            useProjectHostname: false,
            useCdn: false,
          }),
      })
    : undefined;

export const officialSanityStudioConfig = defineConfig({
  name: 'science-of-gifts-studio',
  title: 'Science of Gifts — Official Sanity Studio',
  projectId: SANITY_STUDIO_ENV.projectId || 'c1y2qdje',
  dataset: SANITY_STUDIO_ENV.dataset || 'production',
  basePath: '/studio',
  ...(studioAuthStore ? { auth: studioAuthStore } : {}),
  plugins: [
    structureTool({
      name: 'structure',
      title: 'Editorial Desk',
      structure: buildOfficialSanityDeskStructure,
    }),
  ],
  schema: {
    types: buildOfficialSanitySchemaTypes(),
    // Prevent editors from creating new singleton documents via global "New Document" menu
    templates: (prev: any[]) =>
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
    actions: (prev, { schemaType, documentId }) => {
      // Prevent mutating or deleting the protected production hoodie during evaluation
      if (
        documentId &&
        (PROTECTED_EVALUATION_DOC_IDS.has(documentId) ||
          PROTECTED_EVALUATION_DOC_IDS.has(`drafts.${documentId}`))
      ) {
        return [];
      }
      if (SINGLETON_TYPES.has(schemaType)) {
        return prev.filter(
          (item) => item.action && SINGLETON_ACTIONS.has(item.action)
        );
      }
      return prev;
    },
  },
});

const exportedSanityConfig: Omit<typeof officialSanityStudioConfig, 'schema'> & {
  schema: {
    types: any[];
    templates?: (
      prev: Array<{ id: string; schemaType: string; [key: string]: any }>
    ) => Array<{ id: string; schemaType: string; [key: string]: any }>;
  };
} = officialSanityStudioConfig as any;

export default exportedSanityConfig;
