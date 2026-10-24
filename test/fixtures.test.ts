import { describe, expect, it } from 'vitest';

import { renderPrompt as renderExternalChat } from '../src/external-chat/index.js';
import type { SystemUserPrompt } from '../src/render/define.js';
import { getPromptMeta, promptRegistry } from '../src/registry/index.js';
import { renderPrompt as renderSymthinkApi } from '../src/symthink-api/index.js';
import { loadFixtures } from './helpers.js';

type AnyRender = (id: string, vars: unknown) => string | SystemUserPrompt;

const render: Record<string, AnyRender> = {
  'external-chat': renderExternalChat as AnyRender,
  'symthink-api': renderSymthinkApi as AnyRender,
};

const fixtures = loadFixtures();

describe('fixtures', () => {
  it('every prompt has a default fixture', () => {
    const withDefault = new Set(fixtures.filter((fixture) => !fixture.name.includes('--')).map((f) => f.promptId));
    const missing = promptRegistry.map((meta) => meta.id).filter((id) => !withDefault.has(id));
    expect(missing).toEqual([]);
  });

  it('every fixture belongs to a known prompt', () => {
    const unknown = fixtures.filter((fixture) => !getPromptMeta(fixture.promptId)).map((fixture) => fixture.name);
    expect(unknown).toEqual([]);
  });
});

// Snapshots are plain-text files so a prompt change reads as a normal diff in review.
describe.each(fixtures)('$name', ({ name, promptId, vars }) => {
  const meta = getPromptMeta(promptId)!;

  it('renders the committed snapshot', async () => {
    const output = render[meta.delivery]!(promptId, vars);
    if (typeof output === 'string') {
      await expect(`${output}\n`).toMatchFileSnapshot(`./__snapshots__/rendered/${name}.txt`);
    } else {
      await expect(`${output.system}\n`).toMatchFileSnapshot(`./__snapshots__/rendered/${name}.system.txt`);
      await expect(`${output.user}\n`).toMatchFileSnapshot(`./__snapshots__/rendered/${name}.user.txt`);
    }
  });
});
