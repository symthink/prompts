import type { DecisionQuestion } from '../render/decision-questions.js';

export type ReviewQuestionPolarity = 'good' | 'flag';
export type ReviewQuestionKind = 'rubric' | 'fallacy';

/**
 * State keys a review question may name. Idea units send `idea` + `claims`; nested-Claim units send
 * `claim` + `supporting_claims`, so Jev reads the paragraph as support for the Claim above it.
 */
export type ReviewStateKeys = {
  subject: 'idea' | 'claim';
  claims: 'claims' | 'supporting_claims';
};

export type ReviewQuestionEntry = {
  key: string;
  polarity: ReviewQuestionPolarity;
  kind: ReviewQuestionKind;
  enabled: boolean;
  /** Skip this entry when the unit has fewer direct Claims (e.g. 2 for questions that compare Claims). */
  minClaims?: number;
  question: DecisionQuestion | ((keys: ReviewStateKeys) => DecisionQuestion);
};

const SUFFICIENCY_CRITERIA = [
  'Only restate the main point or do not address it',
  'Give one reason',
  'Give two or more independent reasons',
  'Give independent reasons and at least one piece of evidence, such as a fact, figure or example',
] as const;

/*
 * Every question is asked once per unit, against the Claims taken together as one paragraph.
 * Claims often only make sense in combination, so judging each one alone against its parent gave
 * misleading answers (owner, 2026-11-15).
 *
 * Playground: the paragraph form, clarity, distinctness, counterpoint and conclusion_follows are
 * unrun. Fallacy flags still reach authors only when the app's `JEV_FALLACY_FLAGS_ENABLED` is on.
 */

const CLARITY_CRITERIA = [
  'Vague or several ideas at once',
  'One idea but loosely worded',
  'One specific, checkable statement',
] as const;

export const JEV_REVIEW_QUESTIONS: readonly ReviewQuestionEntry[] = [
  {
    key: 'responds_to_question',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Does \`${subject}\` respond to \`question\`?`,
    }),
  },
  {
    key: 'relevant',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    minClaims: 1,
    question: ({ subject, claims }) => ({
      type: 'noul',
      instructions: `Taken together, do \`${claims}\` bear directly on whether \`${subject}\` is true or wise?`,
    }),
  },
  {
    key: 'sufficiency',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: ({ subject, claims }) => ({
      type: 'score',
      instructions: `Taken together, how well do \`${claims}\` support \`${subject}\`? Judge the reasoning only, not whether you agree with the position.`,
      criteria: [...SUFFICIENCY_CRITERIA],
    }),
  },
  {
    key: 'clarity',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: ({ subject }) => ({
      type: 'score',
      instructions: `How clear and focused is the wording of \`${subject}\`?`,
      criteria: [...CLARITY_CRITERIA],
    }),
  },
  {
    key: 'distinctness',
    // Yes ("two Claims make the same point") is the criticism.
    polarity: 'flag',
    kind: 'rubric',
    enabled: true,
    minClaims: 2,
    question: ({ claims }) => ({
      type: 'noul',
      instructions: `Do two or more statements in \`${claims}\` make the same point?`,
    }),
  },
  {
    key: 'counterpoint',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: ({ subject, claims }) => ({
      type: 'noul',
      instructions: `Do \`${subject}\` or \`${claims}\` acknowledge an objection to \`${subject}\`, or a limit on it?`,
    }),
  },
  {
    key: 'conclusion_follows',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    minClaims: 1,
    question: ({ subject, claims }) => ({
      type: 'noul',
      instructions: `If \`${claims}\` were true, would \`${subject}\` follow from them?`,
    }),
  },
  {
    key: 'appeal_to_popularity',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    minClaims: 1,
    question: ({ subject, claims }) => ({
      type: 'noul',
      instructions: `Do \`${claims}\` argue that \`${subject}\` is right because many people believe or want it?`,
    }),
  },
  {
    key: 'personal_attack',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    minClaims: 1,
    question: ({ claims }) => ({
      type: 'noul',
      instructions: `Do \`${claims}\` dismiss a view by attacking the person who holds it instead of the view itself?`,
    }),
  },
  {
    key: 'false_dilemma',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    minClaims: 1,
    question: ({ claims }) => ({
      type: 'noul',
      instructions: `Do \`${claims}\` present only two options when more exist?`,
    }),
  },
  {
    key: 'slippery_slope',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    minClaims: 1,
    question: ({ claims }) => ({
      type: 'noul',
      instructions: `Do \`${claims}\` assume that one step will lead, through further steps, to an extreme outcome without showing why each step follows?`,
    }),
  },
  {
    key: 'circular_reasoning',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    minClaims: 1,
    question: ({ subject, claims }) => ({
      type: 'noul',
      instructions: `Do \`${claims}\` support \`${subject}\` only by restating it, or by relying on each other in a circle?`,
    }),
  },
  {
    key: 'hasty_generalisation',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: false,
    minClaims: 1,
    question: ({ claims }) => ({
      type: 'noul',
      instructions: `Do \`${claims}\` conclude something about a whole group from one or a few personal examples or anecdotes?`,
    }),
  },
] as const;
