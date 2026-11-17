import type { DecisionPrompt, DecisionQuestion } from '../render/decision-questions.js';

import { stripSymthinkGlyphs } from './glyphs.js';
import {
  JEV_REVIEW_QUESTIONS,
  type ReviewQuestionEntry,
  type ReviewStateKeys,
} from './review-questions.js';
import { supportingCount, type ReviewUnit } from './review-unit.js';

export type BuildReviewRequestOptions = {
  includeFallacies?: boolean;
};

function resolveQuestion(entry: ReviewQuestionEntry, keys: ReviewStateKeys): DecisionQuestion {
  const question = entry.question;
  return typeof question === 'function' ? question(keys) : question;
}

/**
 * State key for the unit's subject: `idea` for an Idea (`typeInt` 4-6), otherwise `claim`. An `idea`
 * unit is always an Idea, so it always uses `idea`.
 */
export function reviewStateKeys(unit: Pick<ReviewUnit, 'kind' | 'subject'>): ReviewStateKeys {
  const { typeInt } = unit.subject;
  const isIdea = unit.kind === 'idea' || (typeInt >= 4 && typeInt <= 6);
  return { subject: isIdea ? 'idea' : 'claim' };
}

/** Build the Jev review request for one `idea` or `nested` support unit. */
export function buildReviewRequest(
  unit: ReviewUnit,
  options: BuildReviewRequestOptions = {},
): DecisionPrompt {
  const { includeFallacies = true } = options;
  const keys = reviewStateKeys(unit);

  const state: Record<string, unknown> = {
    question: stripSymthinkGlyphs(unit.question.text),
    [keys.subject]: stripSymthinkGlyphs(unit.subject.text),
    support: unit.support
      .map((item) => stripSymthinkGlyphs(item.text.trim()).trim())
      .filter((text) => text.length > 0),
  };

  if (unit.kind === 'nested' && unit.context.length > 0) {
    state.context = unit.context.map((item) => stripSymthinkGlyphs(item.text));
  }

  const supporting = supportingCount(unit);
  const questions: Record<string, DecisionQuestion> = {};

  for (const entry of JEV_REVIEW_QUESTIONS) {
    if (!entry.enabled) continue;
    if (entry.kind === 'fallacy' && !includeFallacies) continue;
    if (entry.ideaUnitOnly && unit.kind !== 'idea') continue;
    if (entry.minSupporting !== undefined && supporting < entry.minSupporting) continue;
    questions[entry.key] = resolveQuestion(entry, keys);
  }

  return { state, questions };
}
