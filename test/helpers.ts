import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { externalChatPrompts } from '../src/external-chat/index.js';
import type { PromptDefinition } from '../src/render/define.js';
import { symthinkApiPrompts } from '../src/symthink-api/index.js';

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURES_DIR = path.join(PACKAGE_ROOT, 'fixtures');

export const definitionsByDelivery: Record<string, Record<string, PromptDefinition>> = {
  'external-chat': externalChatPrompts,
  'symthink-api': symthinkApiPrompts,
};

export interface FixtureFile {
  /** File name without `.json`, e.g. `vision.research--claim`. */
  name: string;
  promptId: string;
  vars: unknown;
}

export function loadFixtures(): FixtureFile[] {
  return readdirSync(FIXTURES_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const name = file.slice(0, -'.json'.length);
      return {
        name,
        promptId: name.split('--')[0]!,
        vars: JSON.parse(readFileSync(path.join(FIXTURES_DIR, file), 'utf8')),
      };
    });
}
