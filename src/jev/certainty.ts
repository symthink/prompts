import type { DecisionPrompt } from '../render/decision-questions.js';

import { CERTAINTY_CRITERIA, CERTAINTY_INSTRUCTIONS_FOR } from './certainty-question.js';
import { stripSymthinkGlyphs } from './glyphs.js';
export { JEV_QUESTION_SET_VERSION } from './version.js';

/** Sample 1 certainty request for one statement (model is set by the host). */
export function buildCertaintyRequest(statement: string): DecisionPrompt {
  return {
    state: { statement: stripSymthinkGlyphs(statement) },
    questions: {
      certainty: {
        type: 'score',
        instructions: CERTAINTY_INSTRUCTIONS_FOR('statement'),
        criteria: [...CERTAINTY_CRITERIA],
      },
    },
  };
}

/** Map certainty score to Symthink `typeInt` 1–9 (`round(2 + 3 × score)`, clamped, never 0). */
export function typeIntFromCertaintyScore(score: number): number {
  const value = Math.round(2 + 3 * score);
  return Math.min(9, Math.max(1, value));
}