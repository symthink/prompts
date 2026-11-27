import type { DecisionQuestion } from '../render/decision-questions.js';

/** `none`: the entry carries no good or bad reading (Choice entries and `scheme_fits`). */
export type ReviewQuestionPolarity = 'good' | 'flag' | 'none';
export type ReviewQuestionKind = 'rubric' | 'fallacy' | 'scheme' | 'structure' | 'critical';

/** Argumentation schemes that have critical questions. */
export type ReviewQuestionScheme = 'consequences' | 'cause_to_effect' | 'expert_opinion';

/**
 * State key a review question may name for the unit's subject. Every unit sends `question` and
 * `support`; the subject goes under `idea` when it is an Idea (`typeInt` 4-6) and `claim` otherwise,
 * so Jev reads the node as what it is.
 */
export type ReviewStateKeys = {
  subject: 'idea' | 'claim';
};

/**
 * Per-request data for entries whose wording depends on the tree (4.0.0). `weakItemTexts` are the texts
 * of the points that have sub-points, in tree order; option `i1` is the first, `i2` the second, and so on.
 */
export type ReviewQuestionContext = {
  weakItemTexts: readonly string[];
};

/** Option id for the nth (0-based) point with sub-points in a `weak_item` question. */
export function weakItemOptionId(index: number): string {
  return `i${index + 1}`;
}

export type ReviewQuestionEntry = {
  key: string;
  /** `good`: no (or a low score) is the criticism. `flag`: yes is the criticism. `none`: neither. */
  polarity: ReviewQuestionPolarity;
  kind: ReviewQuestionKind;
  /** Disabled entries stay in the library but are never sent. Flip to `true` to turn one on. */
  enabled: boolean;
  /** Skip this entry when the unit has fewer points (`supportingCount`: top-level items, or the items inside groupings). */
  minSupporting?: number;
  /** Skip this entry unless some point has sub-points (`sub_support_backs`). */
  requiresSubPoints?: boolean;
  /** Skip this entry unless the entry with this key is sent in the same request. */
  sentWith?: string;
  /** Critical entries: the scheme whose critical question this is. */
  scheme?: ReviewQuestionScheme;
  /** Critical entries: `burden` shifts proof onto the author's support, `rebuttal` invites an objection. */
  cq?: 'burden' | 'rebuttal';
  /** Stored in the answers but never shown to the author. */
  logOnly?: boolean;
  /** Skip this entry when the unit has no `conclusion` (the ∴ line of an Argument-style unit). */
  requiresConclusion?: boolean;
  question:
    | DecisionQuestion
    | ((keys: ReviewStateKeys, context: ReviewQuestionContext) => DecisionQuestion);
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
 * Scheme, structure and critical entries (3.2.0) were probed against Jev on 2026-11-24 (22 units, see
 * jev-scheme-probe-2026-11-24.md) and have not had a labelled run. They are sent only with
 * `buildReviewRequest(unit, { includeScheme: true })`. Their wording is the amended set from
 * jev-logical-unit-review-handoff.md.
 *
 * 4.0.0: a unit is one Idea reviewed as a tree, so `support` may hold objects (`{ text, group?, support? }`).
 * `sub_support_backs`, `weak_item` and `objection_answered` were probed against Jev on 2026-11-25 (see
 * jev-argument-tree-probe-2026-11-25.md) and their wording is the probe's, word for word. The 3.2.0
 * scheme, structure and critical entries are carried over unchanged.
 *
 * Wording is matched word for word to the JSON; a snapshot test makes any change deliberate.
 */

export const JEV_REVIEW_QUESTIONS: readonly ReviewQuestionEntry[] = [
  {
    key: 'answers_question',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
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
    // 4.0.0. Detects a weak link in the tree. Sent only when some point has sub-points: asked of a flat
    // list it answers about 0.9 by default.
    key: 'sub_support_backs',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    requiresSubPoints: true,
    question: {
      type: 'noul',
      instructions:
        'For each item in `support` that has its own `support`, do those sub-points work as reasons to accept that item? An item that is only a heading grouping points (such as "Pros" or "Cons") needs no backing. Judge the reasoning only, not whether anything is true.',
      criteria: {
        true: 'Every item that has sub-points is backed by them, or is only a heading',
        false:
          'At least one item that has sub-points is not backed by them: they are background, off topic, or repeat it',
      },
    },
  },
  {
    // 4.0.0. Locates the weak link. Options are built per request (`i1`, `i2`, ... for each point with
    // sub-points, in tree order, then `none`). The app reads it only when `sub_support_backs` is a no.
    key: 'weak_item',
    polarity: 'none',
    kind: 'rubric',
    enabled: true,
    sentWith: 'sub_support_backs',
    question: (_keys, { weakItemTexts }) => ({
      type: 'choice',
      instructions:
        'Of the items in `support` that have their own `support`, which one is least well backed by its sub-points? An item that is only a heading grouping points (such as "Pros" or "Cons") needs no backing. Judge the reasoning only, not whether anything is true.',
      criteria: {
        ...Object.fromEntries(
          weakItemTexts.map((text, index) => [weakItemOptionId(index), `The item "${text}"`]),
        ),
        none: 'Every item with sub-points is backed by them, or is only a heading',
      },
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
    // 4.0.0. Level 3 (Tested). Sent whenever `considers_downside` is sent.
    key: 'objection_answered',
    polarity: 'good',
    kind: 'rubric',
    enabled: true,
    sentWith: 'considers_downside',
    question: {
      type: 'noul',
      instructions:
        'Look at the items in `support` that count against the idea (downsides, costs, objections). Does the argument reply to the strongest of them: is there a point, usually nested under that downside, that answers it by reducing, outweighing or addressing it? Stating a downside is not replying to it. Judge the reasoning only, not whether anything is true.',
      criteria: {
        true: 'The strongest downside has a reply that genuinely answers it',
        false: "No downside is answered, or the replies don't address the downside they sit under",
      },
    },
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
  // Scheme, structure and critical questions (3.2.0). Sent only with `includeScheme: true`.
  {
    key: 'scheme',
    polarity: 'none',
    kind: 'scheme',
    enabled: true,
    question: ({ subject }) => ({
      type: 'choice',
      instructions: `Which pattern of reasoning do the statements in \`support\` mainly use to back \`${subject}\`?`,
      criteria: {
        consequences:
          'They argue for or against an action or policy by its likely good or bad outcomes',
        cause_to_effect:
          'They argue that something did cause, or will cause, a particular effect, as a matter of fact rather than as a reason to act',
        expert_opinion:
          'They rely mainly on what an expert, scientist, official or authoritative source says',
      },
    }),
  },
  {
    key: 'scheme_fits',
    polarity: 'none',
    kind: 'scheme',
    enabled: true,
    question: {
      type: 'noul',
      instructions:
        'Do the statements in `support` mainly rely on one of these patterns: the likely outcomes of an action, a cause and its effect, or what an expert or authority says?',
      criteria: {
        true: 'Most of the support is one of these three patterns',
        false:
          'The support mainly relies on something else, such as a rule, a value, a comparison, examples, a sequence of steps or a description',
      },
    },
  },
  {
    key: 'structure',
    polarity: 'none',
    kind: 'structure',
    enabled: true,
    minSupporting: 2,
    question: ({ subject }) => ({
      type: 'choice',
      instructions: `How do the statements in \`support\` work together to back \`${subject}\`?`,
      criteria: {
        convergent: `Each statement gives a separate reason for the ${subject}. Removing one weakens the case, but the rest still support it`,
        linked: `The statements support the ${subject} only in combination. If one is false or removed, the others no longer support it`,
        serial: `One statement mainly backs another statement, which in turn backs the ${subject}`,
        mixed: `Some statements support the ${subject} separately and others only in combination or in a chain`,
      },
    }),
  },
  {
    key: 'support_ordered',
    polarity: 'none',
    kind: 'structure',
    enabled: true,
    minSupporting: 2,
    question: {
      type: 'noul',
      instructions:
        'Do the statements in `support` describe steps, events in sequence, or a ranking, so that their order matters?',
      criteria: {
        true: 'Reordering the statements would change or lose their meaning',
        false: 'The statements could be listed in any order without changing what they say',
      },
    },
  },
  {
    key: 'conclusion_restates',
    polarity: 'none',
    kind: 'structure',
    enabled: true,
    requiresConclusion: true,
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Does \`conclusion\` say the same thing as \`${subject}\`?`,
      criteria: {
        true: `The conclusion repeats the ${subject}, in the same or different words, and adds nothing`,
        false: `The conclusion states something the ${subject} does not, such as what the statements add up to or a narrower claim`,
      },
    }),
  },
  {
    key: 'cq_cons_likely',
    polarity: 'flag',
    kind: 'critical',
    scheme: 'consequences',
    cq: 'burden',
    enabled: true,
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Is a predicted outcome in \`support\` unlikely, or only loosely connected to the action in \`${subject}\`?`,
      criteria: {
        true: 'The outcome would need several further steps or unstated assumptions to follow from the action',
        false: 'The outcome follows plausibly and directly from the action, or no outcome is predicted',
      },
    }),
  },
  {
    key: 'cq_cons_evidence',
    polarity: 'flag',
    kind: 'critical',
    scheme: 'consequences',
    cq: 'burden',
    enabled: true,
    question: {
      type: 'noul',
      instructions: 'Is a predicted outcome in `support` asserted without any evidence or example?',
      criteria: {
        true: 'The outcome is stated with nothing that shows it would happen',
        false:
          'At least one statement gives evidence, data or an example that the outcome would happen, or no outcome is predicted',
      },
    },
  },
  {
    key: 'cq_cons_value',
    polarity: 'flag',
    kind: 'critical',
    scheme: 'consequences',
    cq: 'rebuttal',
    logOnly: true,
    enabled: true,
    question: {
      type: 'noul',
      instructions:
        'Could reasonable people disagree about whether the outcome described in `support` is good or bad, or about who it is good for?',
      criteria: {
        true: 'Whether the outcome is good depends on values or on which group is affected',
        false:
          'Almost everyone would agree whether the outcome is good or bad, or no outcome is described',
      },
    },
  },
  {
    key: 'cq_cause_timing_only',
    polarity: 'flag',
    kind: 'critical',
    scheme: 'cause_to_effect',
    cq: 'burden',
    enabled: true,
    question: {
      type: 'noul',
      instructions:
        'Is the only evidence for the causal link in `support` that the two things happened together, or at about the same time?',
      criteria: {
        true: 'Nothing beyond timing or co-occurrence links the cause to the effect',
        false:
          'The statements give more than timing, such as a comparison, a mechanism or a ruled-out alternative',
      },
    },
  },
  {
    key: 'cq_cause_evidence',
    polarity: 'flag',
    kind: 'critical',
    scheme: 'cause_to_effect',
    cq: 'burden',
    enabled: true,
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Is a causal link in \`${subject}\` or \`support\` asserted without any evidence?`,
      criteria: {
        true: 'A cause is named with nothing that shows it produces the effect',
        false: 'Evidence for the causal link is given, or no causal link is claimed',
      },
    }),
  },
  {
    key: 'cq_cause_rival_addressed',
    // Yes ("a rival explanation is dealt with") is the good answer.
    polarity: 'good',
    kind: 'critical',
    scheme: 'cause_to_effect',
    cq: 'rebuttal',
    enabled: true,
    question: {
      type: 'noul',
      instructions:
        'Do the statements in `support` address another likely explanation for the effect, for example by comparing with a case where the claimed cause was absent?',
      criteria: {
        true: 'At least one statement deals with a rival explanation or compares with a case without the cause',
        false: 'The statements only show the cause and effect occurring together',
      },
    },
  },
  {
    key: 'cq_exp_expertise',
    polarity: 'flag',
    kind: 'critical',
    scheme: 'expert_opinion',
    cq: 'burden',
    enabled: true,
    question: {
      type: 'noul',
      instructions: 'Is it unclear whether a source cited in `support` is a credible expert?',
      criteria: {
        true: 'The source is unnamed, vague, or not shown to have relevant knowledge',
        false: 'The source is a named, recognised authority, or no source is cited',
      },
    },
  },
  {
    key: 'cq_exp_field',
    polarity: 'flag',
    kind: 'critical',
    scheme: 'expert_opinion',
    cq: 'burden',
    enabled: true,
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Is the expertise of a source cited in \`support\` in a different field from the claim in \`${subject}\`?`,
      criteria: {
        true: "The source's expertise is in an unrelated field",
        false: "The source's expertise matches the claim, or no source is cited",
      },
    }),
  },
  {
    key: 'cq_exp_opinion',
    polarity: 'flag',
    kind: 'critical',
    scheme: 'expert_opinion',
    cq: 'burden',
    enabled: true,
    question: ({ subject }) => ({
      type: 'noul',
      instructions: `Does \`${subject}\` claim more than a source in \`support\` is reported to have said?`,
      criteria: {
        true: `The ${subject} goes further than what the source said`,
        false: `The ${subject} stays within what the source said, or no source is cited`,
      },
    }),
  },
  {
    key: 'cq_exp_trust',
    polarity: 'flag',
    kind: 'critical',
    scheme: 'expert_opinion',
    cq: 'rebuttal',
    enabled: true,
    question: {
      type: 'noul',
      instructions:
        'Is there an obvious reason to think a source cited in `support` is biased or has a conflict of interest?',
      criteria: {
        true: 'The source stands to gain from the claim, or is known to favour one side',
        false: 'No such reason is apparent, or no source is cited',
      },
    },
  },
] as const;
