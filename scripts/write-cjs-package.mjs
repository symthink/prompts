#!/usr/bin/env node
// The package is "type": "module"; this marks dist/cjs so Node loads those .js files as CommonJS.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from './lib/prompt-source.mjs';

await writeFile(path.join(ROOT, 'dist', 'cjs', 'package.json'), `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
