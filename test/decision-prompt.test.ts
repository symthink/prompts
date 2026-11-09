import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { PromptVariablesError } from '../src/render/errors.js';
import { definePrompt } from '../src/render/define.js';
import { createRenderer, renderTemplate } from '../src/render/engine.js';
import { normalizePrompt } from '../src/render/normalize.js';

const EXAMPLE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'decision-prompt-example');

const testDecision = definePrompt({
  id: 'test.refund-decision',
  output: 'decision',
  schema: z.strictObject({
    customerName: z.string(),
    incidentSummary: z.string(),
  }),
});

const renderer = createRenderer(
  { 'test.refund-decision': testDecision },
  {
    templates: {
      'test.refund-decision': {
        state: readFileSync(path.join(EXAMPLE_DIR, 'state.md'), 'utf8'),
        questions: JSON.parse(readFileSync(path.join(EXAMPLE_DIR, 'questions.json'), 'utf8')),
      },
    },
    partials: {},
  },
);

describe('decision prompts (test-only example)', () => {
  it('renders normalized state and passes question shape through', () => {
    const result = renderer.render('test.refund-decision', {
      customerName: 'Alex',
      incidentSummary: 'requested a refund for order #42',
    });

    expect(result).toEqual({
      state: normalizePrompt(
        'The support agent handled Alex: requested a refund for order #42.',
      ),
      questions: {
        refunded: {
          type: 'boolean',
          instructions: 'Was a full refund issued to Alex?',
        },
      },
    });
  });

  it('throws PromptVariablesError for invalid variables', () => {
    expect(() =>
      renderer.render('test.refund-decision', { customerName: 'Alex' } as { customerName: string; incidentSummary: string }),
    ).toThrow(PromptVariablesError);
  });

  it('leaves choices and experimental question types intact', () => {
    const bundle = {
      templates: {
        'test.choice': {
          state: 'Static state.',
          questions: {
            severity: {
              type: 'choice' as const,
              instructions: 'Pick one.',
              choices: ['low', 'high'],
            },
          },
        },
      },
      partials: {},
    };
    const choicePrompt = definePrompt({
      id: 'test.choice',
      output: 'decision',
      schema: z.strictObject({}),
    });
    const choiceRenderer = createRenderer({ 'test.choice': choicePrompt }, bundle);
    expect(choiceRenderer.render('test.choice', {})).toEqual({
      state: 'Static state.',
      questions: {
        severity: {
          type: 'choice',
          instructions: 'Pick one.',
          choices: ['low', 'high'],
        },
      },
    });
  });
});

describe('renderTemplate', () => {
  it('normalizes rendered decision state the same way as chat prompts', () => {
    expect(renderTemplate('Line one  \n\n\nLine two\n', {}, {})).toBe('Line one\n\nLine two');
  });
});
