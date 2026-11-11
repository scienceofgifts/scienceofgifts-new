#!/usr/bin/env node
import module from 'node:module';
import path from 'node:path';

if (!process.env.CI) {
  try {
    module.enableCompileCache?.();
    setTimeout(() => {
      try {
        module.flushCompileCache?.();
      } catch {}
    }, 10_000).unref();
  } catch {}
}

if (process.platform === 'win32') {
  const cwd = process.cwd();
  const correctedCwd = cwd.slice(0, 1).toUpperCase() + cwd.slice(1);
  if (correctedCwd !== cwd) process.chdir(correctedCwd);
}

const cliPath = path.resolve(process.cwd(), 'node_modules/astro/dist/cli/index.js');

import(cliPath)
  .then(({ cli }) => cli(process.argv))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
