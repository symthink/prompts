import { describe, expect, it } from 'vitest';

import {
  buildReviewRequest,
  fingerprintReviewUnit,
  JEV_QUESTION_SET_VERSION,
  JEV_REVIEW_QUESTIONS,
  stripSymthinkGlyphs,
  supportingCount,
  type ReviewNode,
  type ReviewUnit,
} from '../src/jev/index.js';

function node(id: string, text: string, typeInt: number, label = 'Claim'): ReviewNode {
  return { id, text, label, typeInt, sources: [] };
}

/** The research's `state_example` (jev-questions-v3.json). */
const STATE_EXAMPLE_UNIT: ReviewUnit = {
  nodeId: 'idea-1',
  kind: 'idea',
  question: { text: 'How can our town reduce pedestrian injuries on Maple Avenue?' },
  context: [],
  subject: node(
    'idea-1',
    'Perhaps the town could lower the speed limit on Maple Avenue from 35 to 25 mph.',
    5,
    'Idea',
  ),
  support: [
    node(
      's1',
      'Town police records show 14 pedestrian injuries on Maple Avenue between 2021 and 2024, and speed was cited in 9 of them.',
      8,
    ),
    node('s2', 'A lower limit would only help if drivers comply.', 8),
    node('s3', 'Would drivers actually slow down without more enforcement?', 2, 'Question'),
  ],
};

const IDEA_UNIT: ReviewUnit = {
  nodeId: 'idea-2',
  kind: 'idea',
  question: { text: 'How can the city cut drunk driving downtown?' },
  context: [],
  subject: node(
    'idea-2',
    'Extending weekend bus service until 2 a.m. could cut drunk driving downtown.',
    5,
    'Idea',
  ),
  support: [
    node('c1', 'Downtown bars close at 1:30 a.m., but the last bus leaves at midnight.', 8),
    node('c2', 'Everyone I know thinks the buses should run later.', 8),
    node(
      'c3',
      "The transit director has never ridden a bus in his life, so his objections don't count.",
      8,
    ),
    node('c4', 'The new library opened last spring.', 8),
  ],
};

const NESTED_CLAIM_UNIT: ReviewUnit = {
  ...IDEA_UNIT,
  kind: 'nested',
  nodeId: 'claim-nested',
  context: [{ text: 'Parent idea text.' }],
  subject: node(
    'nested-subject',
    'Downtown bars close at 1:30 a.m., but the last bus leaves at midnight.',
    8,
  ),
  support: [node('child-1', 'Child claim one', 8), node('child-2', 'Child claim two.', 8)],
};

const NESTED_IDEA_UNIT: ReviewUnit = {
  ...NESTED_CLAIM_UNIT,
  nodeId: 'idea-nested',
  subject: node('nested-idea', 'Add a late-night shuttle from the bars to the transit hub.', 5, 'Idea'),
};

describe('supportingCount', () => {
  it('counts support items outside the Question band (typeInt 0-3)', () => {
    expect(supportingCount(STATE_EXAMPLE_UNIT)).toBe(2);
    expect(supportingCount(IDEA_UNIT)).toBe(4);
    expect(supportingCount({ support: [] })).toBe(0);
    expect(
      supportingCount({
        support: [node('a', 'q0', 0), node('b', 'q3', 3), node('c', 'idea', 4), node('d', 'x', 8)],
      }),
    ).toBe(2);
  });
});

describe('fingerprintReviewUnit', () => {
  it('is stable regardless of object key order in inputs', () => {
    const a = fingerprintReviewUnit(IDEA_UNIT);
    const reordered = {
      support: IDEA_UNIT.support.map((item) => ({
        typeInt: item.typeInt,
        sources: [...item.sources],
        text: item.text,
        label: item.label,
        id: item.id,
      })),
      subject: {
        typeInt: IDEA_UNIT.subject.typeInt,
        text: IDEA_UNIT.subject.text,
        sources: [...IDEA_UNIT.subject.sources],
        label: IDEA_UNIT.subject.label,
        id: IDEA_UNIT.subject.id,
      },
      context: [...IDEA_UNIT.context],
      question: { text: IDEA_UNIT.question.text },
      kind: IDEA_UNIT.kind,
      nodeId: IDEA_UNIT.nodeId,
    } satisfies ReviewUnit;
    expect(fingerprintReviewUnit(reordered)).toBe(a);
  });

  it('changes when the subject text, a source or a label changes', () => {
    const base = fingerprintReviewUnit(IDEA_UNIT);
    const textChange: ReviewUnit = {
      ...IDEA_UNIT,
      subject: { ...IDEA_UNIT.subject, text: IDEA_UNIT.subject.text + ' ' },
    };
    expect(fingerprintReviewUnit(textChange)).not.toBe(base);

    const sourceChange: ReviewUnit = {
      ...IDEA_UNIT,
      support: [{ ...IDEA_UNIT.support[0]!, sources: ['https://example.org'] }, ...IDEA_UNIT.support.slice(1)],
    };
    expect(fingerprintReviewUnit(sourceChange)).not.toBe(base);

    const typeChange: ReviewUnit = {
      ...IDEA_UNIT,
      support: [{ ...IDEA_UNIT.support[0]!, typeInt: 7 }, ...IDEA_UNIT.support.slice(1)],
    };
    expect(fingerprintReviewUnit(typeChange)).not.toBe(base);
  });

  it('changes when a Question child text changes', () => {
    const base = fingerprintReviewUnit(STATE_EXAMPLE_UNIT);
    const edited: ReviewUnit = {
      ...STATE_EXAMPLE_UNIT,
      support: [
        ...STATE_EXAMPLE_UNIT.support.slice(0, 2),
        { ...STATE_EXAMPLE_UNIT.support[2]!, text: 'Would drivers slow down without enforcement?' },
      ],
    };
    expect(fingerprintReviewUnit(edited)).not.toBe(base);
  });

  it('changes when the order of support changes', () => {
    const base = fingerprintReviewUnit(IDEA_UNIT);
    const swapped: ReviewUnit = {
      ...IDEA_UNIT,
      support: [IDEA_UNIT.support[1]!, IDEA_UNIT.support[0]!, ...IDEA_UNIT.support.slice(2)],
    };
    expect(fingerprintReviewUnit(swapped)).not.toBe(base);
  });

  it('changes when the Question or a context text changes', () => {
    const base = fingerprintReviewUnit(NESTED_CLAIM_UNIT);
    expect(
      fingerprintReviewUnit({ ...NESTED_CLAIM_UNIT, question: { text: 'Another question?' } }),
    ).not.toBe(base);
    expect(
      fingerprintReviewUnit({ ...NESTED_CLAIM_UNIT, context: [{ text: 'Other parent text.' }] }),
    ).not.toBe(base);
  });

  it('ignores fields outside the fingerprint shape', () => {
    const withMeta: ReviewUnit = {
      ...IDEA_UNIT,
      nodeId: 'other',
      support: IDEA_UNIT.support.map((item) => ({ ...item, id: `other-${item.id}` })),
    };
    expect(fingerprintReviewUnit(withMeta)).toBe(fingerprintReviewUnit(IDEA_UNIT));
  });
});

describe('buildReviewRequest', () => {
  it('produces the research state_example state, support as an array in order', () => {
    const { state } = buildReviewRequest(STATE_EXAMPLE_UNIT);
    expect(state).toEqual({
      question: 'How can our town reduce pedestrian injuries on Maple Avenue?',
      idea: 'Perhaps the town could lower the speed limit on Maple Avenue from 35 to 25 mph.',
      support: [
        'Town police records show 14 pedestrian injuries on Maple Avenue between 2021 and 2024, and speed was cited in 9 of them.',
        'A lower limit would only help if drivers comply.',
        'Would drivers actually slow down without more enforcement?',
      ],
    });
  });

  it('asks each enabled question once for the unit, with no per-item ids', () => {
    const { questions } = buildReviewRequest(IDEA_UNIT, { includeFallacies: true });
    expect(Object.keys(questions).sort()).toEqual(
      [
        'answers_question',
        'support_backs_idea',
        'support_checkable',
        'considers_downside',
        'support_repeats',
        'question_leading',
        'loaded_wording',
        'appeal_to_popularity',
        'personal_attack',
        'false_dilemma',
        'slippery_slope',
        'circular_reasoning',
      ].sort(),
    );
    expect(Object.keys(questions).some((key) => /_c\d+$/.test(key))).toBe(false);
  });

  it('leaves out disabled entries', () => {
    const disabled = JEV_REVIEW_QUESTIONS.filter((entry) => !entry.enabled).map((entry) => entry.key);
    expect(disabled.sort()).toEqual(['hasty_generalisation', 'idea_compound']);
    for (const unit of [IDEA_UNIT, NESTED_CLAIM_UNIT, NESTED_IDEA_UNIT]) {
      const { questions } = buildReviewRequest(unit);
      for (const key of disabled) expect(questions[key], `${unit.kind}:${key}`).toBeUndefined();
    }
  });

  it('leaves fallacies out when asked', () => {
    const { questions } = buildReviewRequest(IDEA_UNIT, { includeFallacies: false });
    expect(questions.personal_attack).toBeUndefined();
    expect(questions.circular_reasoning).toBeUndefined();
    expect(questions.support_backs_idea).toBeDefined();
  });

  it('measures fallacies against the support statements taken together', () => {
    const { questions } = buildReviewRequest(IDEA_UNIT);
    expect(questions.slippery_slope?.instructions).toBe(
      'Do the statements in `support` assume that one step will lead, through further steps, to an extreme outcome without showing why each step follows?',
    );
    expect(questions.circular_reasoning?.instructions).toBe(
      'Do the statements in `support` back `idea` only by relying on each other in a circle?',
    );
    expect(questions.support_backs_idea?.instructions).toContain('the statements in `support`');
  });

  it('sends support_repeats only with two or more supporting statements', () => {
    const [first, , third] = STATE_EXAMPLE_UNIT.support as [ReviewNode, ReviewNode, ReviewNode];

    // Two statements and a Question: asked.
    expect(buildReviewRequest(STATE_EXAMPLE_UNIT).questions.support_repeats).toBeDefined();

    // One supporting statement: absent.
    const one: ReviewUnit = { ...STATE_EXAMPLE_UNIT, support: [first] };
    expect(buildReviewRequest(one).questions.support_repeats).toBeUndefined();

    // Two items, one of them a Question: absent.
    const statementAndQuestion: ReviewUnit = { ...STATE_EXAMPLE_UNIT, support: [first, third] };
    expect(supportingCount(statementAndQuestion)).toBe(1);
    expect(buildReviewRequest(statementAndQuestion).questions.support_repeats).toBeUndefined();

    // No support at all: absent, state carries an empty array.
    const none: ReviewUnit = { ...STATE_EXAMPLE_UNIT, support: [] };
    const empty = buildReviewRequest(none);
    expect(empty.state).toHaveProperty('support', []);
    expect(empty.questions.support_repeats).toBeUndefined();
  });

  it('drops empty support items from the state', () => {
    const withBlank: ReviewUnit = {
      ...IDEA_UNIT,
      support: [IDEA_UNIT.support[0]!, node('blank', '   ', 8), IDEA_UNIT.support[1]!],
    };
    expect(buildReviewRequest(withBlank).state).toHaveProperty('support', [
      'Downtown bars close at 1:30 a.m., but the last bus leaves at midnight.',
      'Everyone I know thinks the buses should run later.',
    ]);
  });

  it('only names keys that exist in the request state', () => {
    for (const [name, unit] of [
      ['idea', IDEA_UNIT],
      ['nested with a Claim subject', NESTED_CLAIM_UNIT],
      ['nested with an Idea subject', NESTED_IDEA_UNIT],
    ] as const) {
      const { state, questions } = buildReviewRequest(unit);
      expect(Object.keys(questions).length, name).toBeGreaterThan(0);
      for (const [id, question] of Object.entries(questions)) {
        for (const [, key] of question.instructions.matchAll(/`([a-z_]+)`/g)) {
          expect(state, `${name}: ${id} names ${key}`).toHaveProperty(key!);
        }
      }
    }
  });

  it('uses claim for a nested Claim subject and idea for a nested Idea subject', () => {
    const claim = buildReviewRequest(NESTED_CLAIM_UNIT);
    expect(claim.state).toEqual({
      question: 'How can the city cut drunk driving downtown?',
      claim: 'Downtown bars close at 1:30 a.m., but the last bus leaves at midnight.',
      support: ['Child claim one', 'Child claim two.'],
      context: ['Parent idea text.'],
    });
    expect(claim.questions.support_backs_idea?.instructions).toContain('reasons to accept `claim`');
    expect(claim.questions.circular_reasoning?.instructions).toContain('back `claim` only');

    const idea = buildReviewRequest(NESTED_IDEA_UNIT);
    expect(idea.state).toEqual({
      question: 'How can the city cut drunk driving downtown?',
      idea: 'Add a late-night shuttle from the bars to the transit hub.',
      support: ['Child claim one', 'Child claim two.'],
      context: ['Parent idea text.'],
    });
    expect(idea.questions.support_backs_idea?.instructions).toContain('reasons to accept `idea`');
  });

  it('omits context for nested units without one and for idea units', () => {
    const noContext: ReviewUnit = { ...NESTED_CLAIM_UNIT, context: [] };
    expect(buildReviewRequest(noContext).state).not.toHaveProperty('context');
    const ideaWithContext: ReviewUnit = { ...IDEA_UNIT, context: [{ text: 'ignored' }] };
    expect(buildReviewRequest(ideaWithContext).state).not.toHaveProperty('context');
  });

  it('asks no answers_question and no question_leading for nested units', () => {
    for (const unit of [NESTED_CLAIM_UNIT, NESTED_IDEA_UNIT]) {
      const { questions } = buildReviewRequest(unit);
      expect(questions.answers_question).toBeUndefined();
      expect(questions.question_leading).toBeUndefined();
      expect(questions.support_backs_idea).toBeDefined();
    }
    const { questions } = buildReviewRequest(IDEA_UNIT);
    expect(questions.answers_question).toBeDefined();
    expect(questions.question_leading).toBeDefined();
  });

  it('strips Symthink glyphs from state text', () => {
    const withGlyphs: ReviewUnit = {
      ...IDEA_UNIT,
      question: { text: 'How can we fix this❓' },
      subject: { ...IDEA_UNIT.subject, text: 'Maybe buses help💡' },
      support: [
        { ...IDEA_UNIT.support[0]!, text: 'Bars close late🕫' },
        { ...IDEA_UNIT.support[1]!, text: 'What if buses ran later?💡' },
      ],
    };
    const { state } = buildReviewRequest(withGlyphs);
    expect(state).toMatchObject({
      question: 'How can we fix this?',
      idea: 'Maybe buses help.',
      support: ['Bars close late.', 'What if buses ran later?'],
    });
  });

  it('strips Symthink glyphs from context text', () => {
    const withGlyphs: ReviewUnit = { ...NESTED_CLAIM_UNIT, context: [{ text: 'Parent idea💡' }] };
    expect(buildReviewRequest(withGlyphs).state).toHaveProperty('context', ['Parent idea.']);
  });
});

describe('stripSymthinkGlyphs', () => {
  it('matches tree jevText replacement rules', () => {
    expect(stripSymthinkGlyphs('Why do buses stop❓')).toBe('Why do buses stop?');
    expect(stripSymthinkGlyphs('Later buses might help💡')).toBe('Later buses might help.');
    expect(stripSymthinkGlyphs('What if buses ran?💡')).toBe('What if buses ran?');
  });
});

describe('JEV_QUESTION_SET_VERSION', () => {
  it('is 3.1.0', () => {
    expect(JEV_QUESTION_SET_VERSION).toBe('3.1.0');
  });
});

describe('JEV_REVIEW_QUESTIONS', () => {
  const byKey = (key: string) => JEV_REVIEW_QUESTIONS.find((item) => item.key === key);

  it('ships idea_compound and hasty_generalisation disabled', () => {
    expect(byKey('idea_compound')?.enabled).toBe(false);
    expect(byKey('hasty_generalisation')?.enabled).toBe(false);
  });

  it('does not carry the removed entries', () => {
    for (const key of [
      'responds_to_question',
      'relevant',
      'sufficiency',
      'clarity',
      'distinctness',
      'counterpoint',
      'conclusion_follows',
    ]) {
      expect(byKey(key), key).toBeUndefined();
    }
  });

  it('declares polarity and kind per entry', () => {
    for (const key of ['answers_question', 'support_backs_idea', 'support_checkable', 'considers_downside']) {
      expect(byKey(key)?.polarity, key).toBe('good');
      expect(byKey(key)?.kind, key).toBe('rubric');
    }
    for (const key of ['support_repeats', 'question_leading', 'loaded_wording', 'idea_compound']) {
      expect(byKey(key)?.polarity, key).toBe('flag');
      expect(byKey(key)?.kind, key).toBe('rubric');
    }
    for (const entry of JEV_REVIEW_QUESTIONS.filter((item) => item.kind === 'fallacy')) {
      expect(entry.polarity, entry.key).toBe('flag');
    }
    expect(JEV_REVIEW_QUESTIONS.filter((item) => item.kind === 'fallacy').map((item) => item.key)).toEqual([
      'appeal_to_popularity',
      'personal_attack',
      'false_dilemma',
      'slippery_slope',
      'circular_reasoning',
      'hasty_generalisation',
    ]);
  });

  it('marks the idea-unit-only entries and the minimum supporting count', () => {
    const ideaOnly = JEV_REVIEW_QUESTIONS.filter((item) => item.ideaUnitOnly).map((item) => item.key);
    expect(ideaOnly.sort()).toEqual(['answers_question', 'question_leading']);
    expect(byKey('support_repeats')?.minSupporting).toBe(2);
    expect(JEV_REVIEW_QUESTIONS.filter((item) => item.minSupporting !== undefined)).toHaveLength(1);
    expect(JEV_REVIEW_QUESTIONS.some((item) => 'minClaims' in item)).toBe(false);
  });

  it('matches the enabled question set snapshot (wording changes must be deliberate)', () => {
    const enabled = JEV_REVIEW_QUESTIONS.filter((entry) => entry.enabled).map((entry) => ({
      key: entry.key,
      polarity: entry.polarity,
      kind: entry.kind,
      ideaUnitOnly: entry.ideaUnitOnly ?? false,
      minSupporting: entry.minSupporting ?? 0,
      idea: typeof entry.question === 'function' ? entry.question({ subject: 'idea' }) : entry.question,
      claim: typeof entry.question === 'function' ? entry.question({ subject: 'claim' }) : entry.question,
    }));
    expect(enabled).toMatchSnapshot();
  });
});
