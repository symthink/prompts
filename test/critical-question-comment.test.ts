import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  criticalQuestionCommentOutputSchema,
  criticalQuestionCommentVars,
} from '../src/schemas/in-app/critical-question-comment.js';
import { renderCriticalQuestionComment, validatePromptVars } from '../src/symthink-api/index.js';
import { FIXTURES_DIR } from './helpers.js';

const fixture = (name: string) =>
  JSON.parse(readFileSync(path.join(FIXTURES_DIR, `in-app.critical-question-comment${name}.json`), 'utf8'));

const check = (key: string) => ({ key, question: 'Is the outcome asserted without evidence?', kind: 'burden' as const });
const valid = fixture('');

describe('critical-question-comment variables', () => {
  it.each(['', '--ban', '--allow'])('accepts the %s fixture', (variant) => {
    expect(criticalQuestionCommentVars.safeParse(fixture(variant)).success).toBe(true);
  });

  it('rejects 0 or 3 checks', () => {
    expect(criticalQuestionCommentVars.safeParse({ ...valid, checks: [] }).success).toBe(false);
    const three = [check('a'), check('b'), check('c')];
    expect(criticalQuestionCommentVars.safeParse({ ...valid, checks: three }).success).toBe(false);
    expect(criticalQuestionCommentVars.safeParse({ ...valid, checks: three.slice(0, 1) }).success).toBe(true);
  });

  it('rejects an empty support, an unknown scheme and an unknown check kind', () => {
    expect(criticalQuestionCommentVars.safeParse({ ...valid, support: [] }).success).toBe(false);
    expect(criticalQuestionCommentVars.safeParse({ ...valid, scheme: 'cause_to_effect' }).success).toBe(false);
    expect(
      criticalQuestionCommentVars.safeParse({ ...valid, checks: [{ ...check('a'), kind: 'other' }] }).success,
    ).toBe(false);
  });

  it('is enforced by the renderer', () => {
    expect(validatePromptVars('in-app.critical-question-comment', { ...valid, checks: [] }).ok).toBe(false);
  });
});

describe('critical-question-comment output', () => {
  it('accepts one or two items of up to 280 characters', () => {
    expect(criticalQuestionCommentOutputSchema.safeParse({ items: ['a'.repeat(280)] }).success).toBe(true);
    expect(criticalQuestionCommentOutputSchema.safeParse({ items: ['a', 'b'] }).success).toBe(true);
  });

  it('rejects 0 or 3 items, a 281-character item and an empty item', () => {
    expect(criticalQuestionCommentOutputSchema.safeParse({ items: [] }).success).toBe(false);
    expect(criticalQuestionCommentOutputSchema.safeParse({ items: ['a', 'b', 'c'] }).success).toBe(false);
    expect(criticalQuestionCommentOutputSchema.safeParse({ items: ['a'.repeat(281)] }).success).toBe(false);
    expect(criticalQuestionCommentOutputSchema.safeParse({ items: [''] }).success).toBe(false);
  });
});

describe('critical-question-comment neutrality', () => {
  it('renders identical instructions for the mirrored ban and allow fixtures', () => {
    const ban = renderCriticalQuestionComment(fixture('--ban'));
    const allow = renderCriticalQuestionComment(fixture('--allow'));
    expect(ban.system).toBe(allow.system);
    const stripText = (user: string) =>
      user
        .split('\n')
        .filter((line) => !/^(Idea:|\d+\. )/.test(line))
        .join('\n');
    expect(stripText(ban.user)).toBe(stripText(allow.user));
  });
});
