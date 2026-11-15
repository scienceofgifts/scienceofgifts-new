import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanityStudioApiPlugin } from './src/cms/studio/sanityStudioApiPlugin';

const studioProductionIsolationIntegration = () => ({
  name: 'science-of-gifts-studio-production-isolation',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      try {
        const outPath = fileURLToPath(dir);
        const studioOutDir = path.join(outPath, 'studio');
        if (fs.existsSync(studioOutDir)) {
          fs.rmSync(studioOutDir, { recursive: true, force: true });
        }
      } catch {}
      setTimeout(() => {
        process.exit(0);
      }, 150);
    },
  },
});

const STUDIO_BUILD_STUB_ID = '\0virtual:sanity-studio-build-stub';

/**
 * Since `/studio` is strictly restricted to development (`import.meta.env.DEV`) and removed
 * from production output by `studioProductionIsolationIntegration`, avoid bundling the massive
 * `sanity` Studio UI tree during `astro build` (static production site build).
 * Has zero effect on `astro dev` (the live Studio on port 3000) or `tsx` test suites.
 */
const studioProductionBuildStubPlugin = () => ({
  name: 'science-of-gifts-studio-build-stub',
  apply: 'build',
  resolveId(id) {
    if (id === 'sanity' || id === 'sanity/structure') {
      return STUDIO_BUILD_STUB_ID;
    }
    return null;
  },
  load(id) {
    if (id === STUDIO_BUILD_STUB_ID) {
      return `
        export const Studio = () => null;
        export const defineConfig = (config) => config;
        export const defineType = (schema) => schema;
        export const defineField = (field) => field;
        export const defineArrayMember = (member) => member;
        export const createAuthStore = () => ({});
        export const structureTool = () => ({ name: 'structure' });
        export const set = (val) => ({ type: 'set', value: val });
        export const unset = () => ({ type: 'unset' });
        export const useFormValue = () => undefined;
        export default {};
      `;
    }
    return null;
  },
});

export default defineConfig({
  site: 'https://www.scienceofgifts.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  server: {
    port: 3000,
    host: true,
  },
  integrations: [react(), studioProductionIsolationIntegration()],
  vite: {
    envPrefix: ['PUBLIC_', 'SANITY_STUDIO_'],
    plugins: [
      tailwindcss(),
      sanityStudioApiPlugin(),
      studioProductionBuildStubPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  },
});
