import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { bundle as externalChatBundle } from '../src/generated/external-chat.js';
import { bundle as symthinkApiBundle } from '../src/generated/symthink-api.js';
import { promptRegistry } from '../src/registry/index.js';
import { PACKAGE_ROOT } from './helpers.js';

const idsFor = (delivery: string) =>
  promptRegistry
    .filter((meta) => meta.delivery === delivery)
    .map((meta) => meta.id)
    .sort();

const partialRefs = (templates: Record<string, Record<string, string | undefined>>) =>
  new Set(
    Object.values(templates)
      .flatMap((parts) => Object.values(parts))
      .flatMap((template) => [...(template ?? '').matchAll(/\{\{>\s*([\w-]+)\s*\}\}/g)].map((match) => match[1]!)),
  );

describe('delivery bundles', () => {
  it('external-chat embeds only external-chat prompts', () => {
    expect(Object.keys(externalChatBundle.templates).sort()).toEqual(idsFor('external-chat'));
  });

  it('symthink-api embeds only symthink-api prompts', () => {
    expect(Object.keys(symthinkApiBundle.templates).sort()).toEqual(idsFor('symthink-api'));
  });

  it.each([
    ['external-chat', externalChatBundle],
    ['symthink-api', symthinkApiBundle],
  ] as const)('%s embeds only the partials its prompts reference', (_delivery, bundle) => {
    const referenced = partialRefs({ ...bundle.templates, ...{ _partials: bundle.partials } });
    expect(Object.keys(bundle.partials).sort()).toEqual([...referenced].sort());
  });

  it('the registry module carries metadata but no template text', () => {
    const registrySource = readFileSync(path.join(PACKAGE_ROOT, 'src/generated/registry.ts'), 'utf8');
    expect(registrySource).not.toContain('{{');
  });
});
