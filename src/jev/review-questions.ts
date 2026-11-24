import type { DecisionQuestion } from '../render/decision-questions.js';

export type ReviewQuestionPolarity = 'good' | 'flag';
export type ReviewQuestionKind = 'rubric' | 'fallacy';

/**
 * State key a review question may name for the unit's subject. Every unit sends `question` and
 * `support`; the subject goes under `idea` when it is an Idea (`typeInt` 4-6) and `claim` otherwise,
 * so Jev reads the node as what it is.
 */
export type ReviewStateKeys = {
  subject: 'idea' | 'claim';
};

export type ReviewQuestionEntry = {
  key: string;
  /** `good`: no (or a low score) is the criticism. `flag`: yes is the criticism. */
  polarity: ReviewQuestionPolarity;
  kind: ReviewQuestionKind;
  /** Disabled entries stay in the library but are never sent. Flip to `true` to turn one on. */
  enabled: boolean;
  /** Ask only in `idea` units, where the subject sits directly under the Question. */
  ideaUnitOnly?: boolean;
  /** Skip this entry when the unit has fewer supporting statements (Question children do not count). */
  minSupporting?: number;
  question: DecisionQuestion | ((keys: ReviewStateKeys) => DecisionQuestion);
};

/*
 * Every question is asked once per unit, about the `support` statements taken together. The wording is
 * the merged set from the support-unit review research (jev-questions-v3.json).
 *
 * Playground: NOT YET RUN as a whole. Only `considers_downside` (3.1.0) has been run, against every test
 * case and the scheme-review probe units on jev-1.14.0 (2026-11-24). `idea_compound` and
 * `hasty_generalisation` ship disabled until the playground shows they separate their cases. Fallacy
 * flags still reach authors only when the app's `JEV_FALLACY_FLAGS_ENABLED` is on.
 *
 * Wording is matched word for word to the JSON; a snapshot test makes any change deliberate.
 */

export const JEV_REVIEW_QUESTIONS: readonly ReviewQuestionEntry[] = [
  {
    key: 'answers_question',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    ideaUnitOnly: true,
    question: ({ subject }) => ({
      type: 'score',
      instructions: `How directly does \`${subject}\` answer \`question\`?`,
      criteria: [
        'The idea is about a different subject than the question',
        "The idea is on the question's topic but does not propose an answer to it",
        'The idea proposes an answer to a related question, not the one asked',
        'The idea proposes a possible answer to the question as asked, or to one part of it',
      ],
    }),
  },
  {
    key: 'support_backs_idea',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: ({ subject }) => ({
      type: 'score',
      instructions: `How well do the statements in \`support\` work as reasons to accept \`${subject}\`? Judge the reasoning only, not whether the idea is right. Questions, and statements that argue against the idea, do not count as reasons to accept it.`,
      criteria: [
        'Every statement is about a different subject than the idea',
        'The statements repeat the idea or give background on its topic, and none gives a reason to accept it',
        'The statements back up a fact the idea relies on, such as that a problem exists, but none gives a reason to accept the main thing the idea proposes',
        'At least one statement gives a reason to accept the main thing the idea proposes',
      ],
    }),
  },
  {
    key: 'support_checkable',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    question: {
      type: 'score',
      instructions:
        'How easy would it be to check the factual statements in `support` against evidence? Ignore any that are questions.',
      criteria: [
        'Too vague to check: it is unclear what observation would count for or against them',
        'Checkable in principle, but they leave open who, where, when or how much',
        'At least one is specific enough that a reader can tell what kind of evidence would confirm or contradict it',
      ],
    },
  },
  {
    key: 'considers_downside',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    // 3.1.0: only the subject's own downsides count. The 3.0.0 wording also credited bad outcomes of
    // rejecting the subject or of an alternative, so an argument made only of the other side's costs
    // read as having considered a downside.
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Does \`${subject}\` or any item in \`support\` mention a cost or risk of what \`${subject}\` proposes, an objection to \`${subject}\`, or a situation in which it would not work or hold? Bad outcomes of rejecting \`${subject}\`, or of an alternative to it, do not count.`,
      criteria: {
        true: `At least one cost, risk, objection or limiting condition of the ${subject} itself is written out, as a statement or as a question that raises it`,
        false: `The only bad outcomes mentioned belong to rejecting the ${subject} or to an alternative, or there are none`,
      },
    }),
  },
  {
    key: 'support_repeats',
    // Yes ("two statements make the same point") is the criticism.
    polarity: 'flag',
    kind: 'rubric',
    enabled: true,
    minSupporting: 2,
    question: {
      type: 'noul',
      instructions: 'Do two or more statements in `support` make the same point in different words?',
      criteria: {
        true: 'At least two statements could be merged without losing a reason',
        false: 'Each statement adds something the others do not',
      },
    },
  },
  {
    key: 'question_leading',
    polarity: 'flag',
    kind: 'rubric',
    enabled: true,
    ideaUnitOnly: true,
    question: {
      type: 'noul',
      instructions: 'Does the wording of `question` assume or push a particular answer?',
      criteria: {
        true: 'It takes a conclusion for granted, or uses wording that favours one answer',
        false: 'It asks without taking an answer for granted. A plain factual question counts here',
      },
    },
  },
  {
    key: 'loaded_wording',
    polarity: 'flag',
    kind: 'rubric',
    enabled: true,
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Does \`${subject}\` or any item in \`support\` use insulting, mocking or contemptuous wording about a person or a group of people?`,
      criteria: {
        true: 'At least one word or phrase insults, mocks or shows contempt for a person or group',
        false:
          'The wording is neutral about people, even if it criticises an idea, a policy or an institution',
      },
    }),
  },
  {
    key: 'idea_compound',
    // Candidate: stays off until the playground shows it separates its cases (owner gate).
    // Yes ("separate proposals joined") is the criticism.
    polarity: 'flag',
    kind: 'rubric',
    enabled: false,
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Does \`${subject}\` propose two or more separate things that could each be accepted or rejected on its own?`,
      criteria: {
        true: "It joins separate proposals, for example with 'and' or 'as well as'",
        false: 'It proposes one thing, even if it gives details of that one thing',
      },
    }),
  },
  {
    key: 'appeal_to_popularity',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Do the statements in \`support\` argue that \`${subject}\` is right because many people believe or want it?`,
    }),
  },
  {
    key: 'personal_attack',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    question: {
      type: 'noul',
      instructions:
        'Do the statements in `support` dismiss a view by attacking the person who holds it instead of the view itself?',
    },
  },
  {
    key: 'false_dilemma',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    question: {
      type: 'noul',
      instructions: 'Do the statements in `support` present only two options when more exist?',
    },
  },
  {
    key: 'slippery_slope',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    question: {
      type: 'noul',
      instructions:
        'Do the statements in `support` assume that one step will lead, through further steps, to an extreme outcome without showing why each step follows?',
    },
  },
  {
    key: 'circular_reasoning',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: true,
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Do the statements in \`support\` back \`${subject}\` only by relying on each other in a circle?`,
    }),
  },
  {
    // Not in jev-questions-v3.json: carried over from 2.0.0 and re-pointed at `support`. Disabled as before.
    key: 'hasty_generalisation',
    polarity: 'flag',
    kind: 'fallacy',
    enabled: false,
    question: {
      type: 'noul',
      instructions:
        'Do the statements in `support` conclude something about a whole group from one or a few personal examples or anecdotes?',
    },
  },
] as const;
