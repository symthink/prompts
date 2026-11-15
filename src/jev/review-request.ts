import type { DecisionPrompt, DecisionQuestion } from '../render/decision-questions.js';

import { stripSymthinkGlyphs } from './glyphs.js';
import { JEV_REVIEW_QUESTIONS, type ReviewQuestionEntry } from './review-questions.js';
import type { ReviewUnit } from './review-unit.js';

export type BuildReviewRequestOptions = {
  includeFallacies?: boolean;
  includeSetFallacies?: boolean;
};

function resolveQuestion(
  entry: ReviewQuestionEntry,
  subjectKey: 'idea' | 'claim',
  claimNum?: number,
): DecisionQuestion {
  const question = entry.question;
  if (typeof question === 'function') {
    return question(subjectKey, claimNum);
  }
  return question;
}

/** Map a question key ending in `_cN` or `_subject` to the tree node id, or `null` for unit/set keys. */
export function claimIdForQuestionKey(key: string, unit: ReviewUnit): string | null {
  const subjectMatch = /^(.+)_subject$/.exec(key);
  if (subjectMatch) return unit.subject.id;

  const claimMatch = /^(.+)_c(\d+)$/.exec(key);
  if (claimMatch) {
    const index = Number(claimMatch[2]) - 1;
    return unit.claims[index]?.id ?? null;
  }
  return null;
}

/** Build the Jev review request for one Idea or nested-Claim unit. */
export function buildReviewRequest(
  unit: ReviewUnit,
  options: BuildReviewRequestOptions = {},
): DecisionPrompt {
  const { includeFallacies = true, includeSetFallacies = true } = options;
  const subjectKey: 'idea' | 'claim' = unit.kind === 'idea' ? 'idea' : 'claim';

  const claims: Record<string, string> = {};
  unit.claims.forEach((claim, index) => {
    claims[`c${index + 1}`] = stripSymthinkGlyphs(claim.text);
  });

  const state: Record<string, unknown> = {
    question: stripSymthinkGlyphs(unit.question.text),
    [subjectKey]: stripSymthinkGlyphs(unit.subject.text),
    claims,
  };

  if (unit.kind === 'nested_claim' && unit.context.length > 0) {
    state.context = unit.context.map((item) => stripSymthinkGlyphs(item.text));
  }

  const questions: Record<string, DecisionQuestion> = {};

  const addQuestion = (id: string, question: DecisionQuestion) => {
    questions[id] = question;
  };

  for (const entry of JEV_REVIEW_QUESTIONS) {
    if (!entry.enabled) continue;
    if (entry.kind === 'fallacy' && !includeFallacies) continue;
    if (entry.scope === 'set' && !includeSetFallacies) continue;
    if (entry.key === 'responds_to_question' && unit.kind !== 'idea') continue;

    switch (entry.scope) {
      case 'unit':
        addQuestion(entry.key, resolveQuestion(entry, subjectKey));
        break;
      case 'set':
        addQuestion(entry.key, resolveQuestion(entry, subjectKey));
        break;
      case 'per_node':
        addQuestion(`${entry.key}_subject`, resolveQuestion(entry, subjectKey));
        unit.claims.forEach((_claim, index) => {
          const claimNum = index + 1;
          addQuestion(`${entry.key}_c${claimNum}`, resolveQuestion(entry, subjectKey, claimNum));
        });
        break;
      case 'per_claim':
        unit.claims.forEach((_claim, index) => {
          const claimNum = index + 1;
          addQuestion(`${entry.key}_c${claimNum}`, resolveQuestion(entry, subjectKey, claimNum));
        });
        break;
      default:
        break;
    }
  }

  return { state, questions };
}