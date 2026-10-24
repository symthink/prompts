import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  PromptVariablesError,
  renderCivicLevelResearch,
  renderImportFromSource,
  renderLearningWithAi,
  renderPrompt,
  renderResearch,
  UnknownPromptError,
  validatePromptVars,
} from '../src/external-chat/index.js';
import { definePrompt } from '../src/render/define.js';
import { createRenderer, deriveViewFlags } from '../src/render/engine.js';
import { normalizePrompt } from '../src/render/normalize.js';
import { renderLabels, renderRephraseOptions, renderUpcomingElections } from '../src/symthink-api/index.js';

describe('normalizePrompt', () => {
  it('strips trailing whitespace, collapses blank runs, and trims outer blank lines', () => {
    expect(normalizePrompt('\n\nA  \r\nB\t\n\n\n\nC\n\n')).toBe('A\nB\n\nC');
  });

  it('keeps single blank lines and leading indentation', () => {
    expect(normalizePrompt('A\n\n  - B')).toBe('A\n\n  - B');
  });
});

describe('deriveViewFlags', () => {
  it('adds has<Name> for lists and <name>Is.<value> for identifier-like strings', () => {
    expect(deriveViewFlags({ childLines: [], districts: [1], nodeType: 'claim', text: 'Hello world' })).toEqual({
      hasChildLines: false,
      hasDistricts: true,
      nodeTypeIs: { claim: true },
    });
  });
});

describe('createRenderer', () => {
  const greeting = definePrompt({
    id: 'test.greeting',
    output: 'single',
    schema: z.strictObject({ name: z.string(), items: z.array(z.string()).default([]) }),
    view: ({ name }) => ({ shout: name.toUpperCase() }),
  });
  const renderer = createRenderer(
    { 'test.greeting': greeting },
    {
      templates: {
        'test.greeting': {
          prompt: 'Hi {{name}} / {{shout}}\n{{#hasItems}}\nItems:\n{{#items}}\n- {{.}}\n{{/items}}\n{{/hasItems}}\n{{> sign-off}}',
        },
      },
      partials: { 'sign-off': '\n\n\nBye {{name}}' },
    },
  );

  it('renders variables, view values, standalone sections, and partials', () => {
    expect(renderer.render('test.greeting', { name: 'Ana', items: ['a', 'b'] })).toBe(
      'Hi Ana / ANA\nItems:\n- a\n- b\n\nBye Ana',
    );
  });

  it('drops a section whose list is empty without leaving blank lines', () => {
    expect(renderer.render('test.greeting', { name: 'Ana' })).toBe('Hi Ana / ANA\n\nBye Ana');
  });

  it('throws UnknownPromptError for an unregistered id', () => {
    expect(() => renderer.render('test.missing' as 'test.greeting', { name: 'x' })).toThrow(UnknownPromptError);
  });
});

describe('external-chat prompts', () => {
  it('never HTML-escapes values', () => {
    const output = renderLearningWithAi({ questionText: `Is "A & B" < C's cost❓` });
    expect(output).toContain(`Is "A & B" < C's cost❓`);
    expect(output).not.toMatch(/&(amp|quot|lt|#39|#x27);/);
  });

  it('omits optional sections when their variables are missing', () => {
    const output = renderLearningWithAi({ questionText: 'Why❓' });
    expect(output).not.toContain('Context (ancestor nodes');
    expect(output).not.toContain('already exploring beneath');
    expect(output).not.toMatch(/\n{3,}/);
  });

  it('includes the shared paste-back contract partial', () => {
    expect(renderImportFromSource({ articleUrl: 'https://example.org/a' })).toContain('🕫');
  });

  it('appends the question marker to the civic root only when missing', () => {
    const base = { levelLabel: 'County', semanticType: 'county', jurisdiction: null };
    expect(renderCivicLevelResearch({ ...base, questionText: 'County: Topics' })).toContain(
      'Use this root exactly: - County: Topics❓',
    );
    expect(renderCivicLevelResearch({ ...base, questionText: 'County: Topics❓' })).toContain(
      'Use this root exactly: - County: Topics❓\n',
    );
  });

  it('renders district number 0 instead of treating it as missing', () => {
    const output = renderCivicLevelResearch({
      levelLabel: 'Ward',
      semanticType: 'ward',
      jurisdiction: { placeName: 'Ward 0', districtNumber: 0 },
      questionText: 'Ward❓',
    });
    expect(output).toContain('- District number: 0');
  });

  it('selects node-type wording through <name>Is flags', () => {
    const output = renderResearch({ nodeType: 'claim', currentText: 'Bikes are fast' });
    expect(output).toContain("Claim I'm building:");
    expect(output).not.toContain("Question I'm exploring:");
    expect(output).toContain('- Bikes are fast🕫');
  });

  it('reports every invalid variable with its path', () => {
    const vars = { articleUrl: 'ftp://example.org', extra: 1 } as never;
    const result = validatePromptVars('vision.import-from-source', vars);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.path).sort()).toEqual(['', 'articleUrl']);
    expect(() => renderPrompt('vision.import-from-source', vars)).toThrow(PromptVariablesError);
  });
});

describe('symthink-api prompts', () => {
  it('returns system and user messages for system_user prompts', () => {
    const output = renderRephraseOptions({ nodeType: 'question', text: 'how "fast"' });
    expect(Object.keys(output).sort()).toEqual(['system', 'user']);
    expect(output.system).toContain('at most 280 characters');
    expect(output.user).toContain('"how \\"fast\\""');
  });

  it('escapes YAML-quoted label text', () => {
    const { user } = renderLabels({ items: [{ id: 'n1', text: 'Say "hi"\nnow' }] });
    expect(user).toBe('- id: n1\n  text: "Say \\"hi\\"\\nnow"');
  });

  it('applies schema defaults and view fallbacks', () => {
    const output = renderUpcomingElections({ location: 'ZIP 62701', todayIso: '2026-10-24', todayLabel: 'Oct 24' });
    expect(output).toContain('Return the next 3 chronologically upcoming');
    expect(output).toContain("Include the voter's state in the name");
    expect(output).toContain('- (none)');
  });
});
