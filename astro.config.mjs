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
    },
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
    plugins: [tailwindcss(), sanityStudioApiPlugin()],
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
