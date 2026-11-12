/**
 * Science of Gifts — Sanity CLI Configuration
 *
 * Reads `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` from environment variables.
 * Never hardcodes or fabricates project IDs or deployment hosts.
 */

import { defineCliConfig } from './src/cms/studio/sanityCore';

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID || process.env.SANITY_PROJECT_ID || '';
const dataset =
  process.env.SANITY_STUDIO_DATASET || process.env.SANITY_DATASET || '';

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
});
