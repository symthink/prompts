#!/usr/bin/env node
import { rm } from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from './lib/prompt-source.mjs';

await rm(path.join(ROOT, 'dist'), { recursive: true, force: true });
