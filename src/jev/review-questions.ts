import type { DecisionQuestion } from '../render/decision-questions.js';

import { CERTAINTY_CRITERIA, CERTAINTY_INSTRUCTIONS_FOR } from './certainty-question.js';

export type ReviewQuestionScope = 'unit' | 'per_claim' | 'set' | 'per_node';
export type ReviewQuestionPolarity = 'good' | 'flag';
export type ReviewQuestionKind = 'rubric' | 'fallacy' | 'certainty';

export type ReviewQuestionEntry = {
  key: string;
  scope: ReviewQuestionScope;
  polarity: ReviewQuestionPolarity;
  kind: ReviewQuestionKind;
  enabled: boolean;
  /** Skip this entry when the unit has fewer direct Claims (e.g. 2 for questions that compare Claims). */
  minClaims?: number;
  question: DecisionQuestion | ((subjectKey: 'idea' | 'claim', claimNum?: number) => DecisionQuestion);
};

const SUFFICIENCY_CRITERIA = [
  'Only restate the main point or do not address it',
  'Give one reason',
  'Give two or more independent reasons',
  'Give independent reasons and at least one piece of evidence, such as a fact, figure or example',
] as const;

/*
 * Playground: clarity, calibration, distinctness, counterpoint and conclusion_follows are unrun
 * (qualitative-table draft). Set-level fallacies stay disabled until the owner gates (variant 3b,
 * `circular_set` swap) pass — see docs/work/argument-quality-incentives/README.md.
 */

const CLARITY_CRITERIA = [
  'Vague or several ideas at once',
  'One idea but loosely worded',
  'One specific, checkable statement',
] as const;

const CALIBRATION_CRITERIA = [
  'Stated certainty far exceeds the support',
  'Somewhat exceeds',
  'Matches',
] as const;

export const JEV_REVIEW_QUESTIONS: readonly ReviewQuestionEntry[] = [
  {
    key: 'responds_to_question',
    scope: 'unit',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: (subjectKey) => ({
      type: 'noul',
      instructions: `Does \`${subjectKey}\` respond to \`question\`?`,
    }),
  },
  {
    key: 'relevant',
    scope: 'per_claim',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: (subjectKey, claimNum) => ({
      type: 'noul',
      instructions: `Does \`claims.c${claimNum}\` bear directly on whether \`${subjectKey}\` is true or wise?`,
    }),
  },
  {
    key: 'sufficiency',
    scope: 'unit',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: (subjectKey) => ({
      type: 'score',
      instructions: `Taken together, how well do \`claims\` support \`${subjectKey}\`? Judge the reasoning only, not whether you agree with the position.`,
      criteria: [...SUFFICIENCY_CRITERIA],
    }),
  },
  {
    key: 'clarity',
    scope: 'unit',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: (subjectKey) => ({
      type: 'score',
      instructions: `How clear and focused is the wording of \`${subjectKey}\`?`,
      criteria: [...CLARITY_CRITERIA],
    }),
  },
  {
    key: 'calibration',
    scope: 'unit',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: (subjectKey) => ({
      type: 'score',
      instructions: `How well does the stated certainty of \`${subjectKey}\` match the support in \`claims\`?`,
      criteria: [...CALIBRATION_CRITERIA],
    }),
  },
  {
    key: 'distinctness',
    scope: 'unit',
    // Yes ("two Claims make the same point") is the criticism.
    polarity: 'flag',
    kind: 'rubric',
    enabled: true,
    minClaims: 2,
    question: {
      type: 'noul',
      instructions: 'Do two or more items in `claims` make the same point?',
    },
  },
  {
    key: 'counterpoint',
    scope: 'unit',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: (subjectKey) => ({
      type: 'noul',
      instructions: `Do \`${subjectKey}\` or the items in \`claims\` acknowledge an objection to \`${subjectKey}\`, or a limit on it?`,
    }),
  },
  {
    key: 'conclusion_follows',
    scope: 'unit',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    minClaims: 1,
    question: (subjectKey) => ({
      type: 'noul',
      instructions: `If the items in \`claims\` were true, would \`${subjectKey}\` follow from them?`,
    }),
  },
  {
    key: 'certainty',
    scope: 'per_node',
    polarity: 'good',
    kind: 'certainty',
    enabled: true,
    question: (subjectKey, claimNum) => {
      if (claimNum === undefined) {
        return {
          type: 'score',
          instructions: CERTAINTY_INSTRUCTIONS_FOR(subjectKey),
          criteria: [...CERTAINTY_CRITERIA],
        };
      }
      return {
        type: 'score',
        instructions: CERTAINTY_INSTRUCTIONS_FOR(`claims.c${claimNum}`),
        criteria: [...CERTAINTY_CRITERIA],
      };
    },
  },
  {
    key: 'appeal_to_popularity',
    scope: 'per_claim',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    question: (subjectKey, claimNum) => ({
      type: 'noul',
      instructions: `Does \`claims.c${claimNum}\` argue that \`${subjectKey}\` is right because many people believe or want it?`,
    }),
  },
  {
    key: 'personal_attack',
    scope: 'per_claim',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    question: (subjectKey, claimNum) => ({
      type: 'noul',
      instructions: `Does \`claims.c${claimNum}\` dismiss a view by attacking the person who holds it instead of the view itself?`,
    }),
  },
  {
    key: 'false_dilemma',
    scope: 'per_claim',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    question: (_subjectKey, claimNum) => ({
      type: 'noul',
      instructions: `Does \`claims.c${claimNum}\` present only two options when more exist?`,
    }),
  },
  {
    key: 'slippery_slope',
    scope: 'per_claim',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    question: (_subjectKey, claimNum) => ({
      type: 'noul',
      instructions: `Does \`claims.c${claimNum}\` claim one step will lead to an extreme outcome without showing why each step follows?`,
    }),
  },
  {
    key: 'slippery_slope_set',
    scope: 'set',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: false,
    minClaims: 2,
    question: {
      type: 'noul',
      instructions:
        'Taken in order, do the items in `claims` form a chain in which each step is assumed to lead to the next, ending in an extreme outcome, without showing why each step follows?',
    },
  },
  {
    key: 'circular_set',
    scope: 'set',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: false,
    minClaims: 2,
    question: (subjectKey) => ({
      type: 'noul',
      instructions: `Do the items in \`claims\` support \`${subjectKey}\` only by restating it, or by relying on each other in a circle?`,
    }),
  },
  {
    key: 'hasty_generalisation',
    scope: 'per_claim',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: false,
    question: (_subjectKey, claimNum) => ({
      type: 'noul',
      instructions: `Does \`claims.c${claimNum}\` conclude something about a whole group from one or a few personal examples or anecdotes?`,
    }),
  },
] as const;