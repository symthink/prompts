import type { DecisionPrompt, DecisionQuestion } from '../render/decision-questions.js';

import { stripSymthinkGlyphs } from './glyphs.js';
import {
  JEV_REVIEW_QUESTIONS,
  type ReviewQuestionEntry,
  type ReviewStateKeys,
} from './review-questions.js';
import type { ReviewUnit } from './review-unit.js';

export type BuildReviewRequestOptions = {
  includeFallacies?: boolean;
};

function resolveQuestion(entry: ReviewQuestionEntry, keys: ReviewStateKeys): DecisionQuestion {
  const question = entry.question;
  return typeof question === 'function' ? question(keys) : question;
}

/** State keys for a unit: `idea` + `claims`, or `claim` + `supporting_claims` for nested units. */
export function reviewStateKeys(unit: Pick<ReviewUnit, 'kind'>): ReviewStateKeys {
  return unit.kind === 'idea'
    ? { subject: 'idea', claims: 'claims' }
    : { subject: 'claim', claims: 'supporting_claims' };
}

const ENDS_SENTENCE = /[.?!]["'”’)\]]*$/;

/**
 * Join Claim texts into one paragraph, in order. Glyphs are replaced first (P19); a text with no
 * closing punctuation gets a full stop so sentences stay separate.
 */
export function joinClaimsParagraph(texts: readonly string[]): string {
  return texts
    .map((text) => stripSymthinkGlyphs(text.trim()).trim())
    .filter((text) => text.length > 0)
    .map((text) => (ENDS_SENTENCE.test(text) ? text : `${text}.`))
    .join(' ');
}

/** Build the Jev review request for one Idea or nested-Claim unit. */
export function buildReviewRequest(
  unit: ReviewUnit,
  options: BuildReviewRequestOptions = {},
): DecisionPrompt {
  const { includeFallacies = true } = options;
  const keys = reviewStateKeys(unit);

  const state: Record<string, unknown> = {
    question: stripSymthinkGlyphs(unit.question.text),
    [keys.subject]: stripSymthinkGlyphs(unit.subject.text),
    [keys.claims]: joinClaimsParagraph(unit.claims.map((claim) => claim.text)),
  };

  if (unit.kind === 'nested_claim' && unit.context.length > 0) {
    state.context = unit.context.map((item) => stripSymthinkGlyphs(item.text));
  }

  const questions: Record<string, DecisionQuestion> = {};

  for (const entry of JEV_REVIEW_QUESTIONS) {
    if (!entry.enabled) continue;
    if (entry.kind === 'fallacy' && !includeFallacies) continue;
    if (entry.key === 'responds_to_question' && unit.kind !== 'idea') continue;
    if (entry.minClaims !== undefined && unit.claims.length < entry.minClaims) continue;
    questions[entry.key] = resolveQuestion(entry, keys);
  }

  return { state, questions };
}
