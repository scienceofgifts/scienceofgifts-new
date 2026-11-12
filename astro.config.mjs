import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { sanityStudioApiPlugin } from './src/cms/studio/sanityStudioApiPlugin';

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
  integrations: [react()],
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
