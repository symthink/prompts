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

const CONCLUSION_UNIT: ReviewUnit = {
  ...IDEA_UNIT,
  nodeId: 'idea-argument',
  support: IDEA_UNIT.support.slice(0, 2),
  conclusion: node('concl', 'So later buses would cut drunk driving downtown.💡', 8),
};

const V3_1_KEYS = [
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
];

const SCHEME_KEYS = [
  'scheme',
  'scheme_fits',
  'structure',
  'support_ordered',
  'conclusion_restates',
  'cq_cons_likely',
  'cq_cons_evidence',
  'cq_cons_value',
  'cq_cause_timing_only',
  'cq_cause_evidence',
  'cq_cause_rival_addressed',
  'cq_exp_expertise',
  'cq_exp_field',
  'cq_exp_opinion',
  'cq_exp_trust',
];

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

  it('keeps the 3.1.0 fingerprint for a unit without a conclusion', () => {
    // Hash computed with the 3.1.0 code, before `conclusion` existed.
    const unit: ReviewUnit = { ...IDEA_UNIT, support: IDEA_UNIT.support.slice(0, 2) };
    expect(fingerprintReviewUnit(unit)).toBe('15bac7b1696acd');
  });

  it('adds the conclusion to the fingerprint when present, and changes when it is edited', () => {
    const without: ReviewUnit = { ...IDEA_UNIT, support: IDEA_UNIT.support.slice(0, 2) };
    const withConclusion = fingerprintReviewUnit(CONCLUSION_UNIT);
    expect(withConclusion).not.toBe(fingerprintReviewUnit(without));
    const edited: ReviewUnit = {
      ...CONCLUSION_UNIT,
      conclusion: { ...CONCLUSION_UNIT.conclusion!, text: 'Different conclusion.' },
    };
    expect(fingerprintReviewUnit(edited)).not.toBe(withConclusion);
    expect(fingerprintReviewUnit({ ...CONCLUSION_UNIT, conclusion: undefined })).toBe(
      fingerprintReviewUnit(without),
    );
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

  it('has exactly the 3.1.0 question keys with default options', () => {
    for (const unit of [IDEA_UNIT, CONCLUSION_UNIT]) {
      const { questions } = buildReviewRequest(unit);
      expect(Object.keys(questions).sort()).toEqual([...V3_1_KEYS].sort());
      expect(Object.keys(buildReviewRequest(unit, { includeScheme: false }).questions).sort()).toEqual(
        [...V3_1_KEYS].sort(),
      );
    }
  });

  it('adds every scheme key but conclusion_restates with includeScheme and no conclusion', () => {
    const { questions, state } = buildReviewRequest(IDEA_UNIT, { includeScheme: true });
    expect(supportingCount(IDEA_UNIT)).toBe(4);
    expect(Object.keys(questions).sort()).toEqual(
      [...V3_1_KEYS, ...SCHEME_KEYS.filter((key) => key !== 'conclusion_restates')].sort(),
    );
    expect(state).not.toHaveProperty('conclusion');
  });

  it('skips structure and support_ordered with a single supporting statement', () => {
    const one: ReviewUnit = { ...IDEA_UNIT, support: [IDEA_UNIT.support[0]!] };
    const { questions } = buildReviewRequest(one, { includeScheme: true });
    expect(questions.structure).toBeUndefined();
    expect(questions.support_ordered).toBeUndefined();
    expect(questions.scheme).toBeDefined();
    expect(questions.scheme_fits).toBeDefined();
    expect(questions.cq_cons_likely).toBeDefined();
  });

  it('sends conclusion_restates and the conclusion state key for a unit with a conclusion', () => {
    const { questions, state } = buildReviewRequest(CONCLUSION_UNIT, { includeScheme: true });
    expect(Object.keys(questions).sort()).toEqual([...V3_1_KEYS, ...SCHEME_KEYS].sort());
    expect(state).toHaveProperty('conclusion', 'So later buses would cut drunk driving downtown.');
    expect(questions.conclusion_restates?.instructions).toBe(
      'Does `conclusion` say the same thing as `idea`?',
    );
  });

  it('sends the conclusion state key whatever includeScheme is, and skips an empty one', () => {
    const plain = buildReviewRequest(CONCLUSION_UNIT);
    expect(plain.state).toHaveProperty('conclusion', 'So later buses would cut drunk driving downtown.');
    expect(Object.keys(plain.questions)).not.toContain('conclusion_restates');

    const blank: ReviewUnit = { ...CONCLUSION_UNIT, conclusion: node('concl', '  💡 ', 8) };
    const glyphOnly = buildReviewRequest(blank, { includeScheme: true });
    const emptyText: ReviewUnit = { ...CONCLUSION_UNIT, conclusion: node('concl', '   ', 8) };
    const empty = buildReviewRequest(emptyText, { includeScheme: true });
    expect(empty.state).not.toHaveProperty('conclusion');
    expect(empty.questions.conclusion_restates).toBeUndefined();
    expect(glyphOnly.state).toHaveProperty('conclusion');
  });

  it('names claim, not idea, in scheme wording for a nested Claim unit', () => {
    const { questions, state } = buildReviewRequest(NESTED_CLAIM_UNIT, { includeScheme: true });
    expect(questions.scheme?.instructions).toBe(
      'Which pattern of reasoning do the statements in `support` mainly use to back `claim`?',
    );
    expect(questions.structure?.instructions).toContain('back `claim`?');
    expect(questions.cq_cause_evidence?.instructions).toContain('in `claim` or `support`');
    expect(questions.structure).toMatchObject({
      type: 'choice',
      criteria: { linked: expect.stringContaining('support the claim only in combination') },
    });
    for (const [id, question] of Object.entries(questions)) {
      expect(question.instructions, id).not.toContain('`idea`');
      for (const [, key] of question.instructions.matchAll(/`([a-z_]+)`/g)) {
        expect(state, `${id} names ${key}`).toHaveProperty(key!);
      }
    }
  });

  it('only names keys that exist in the state with includeScheme', () => {
    for (const unit of [IDEA_UNIT, CONCLUSION_UNIT, NESTED_IDEA_UNIT]) {
      const { state, questions } = buildReviewRequest(unit, { includeScheme: true });
      for (const [id, question] of Object.entries(questions)) {
        for (const [, key] of question.instructions.matchAll(/`([a-z_]+)`/g)) {
          expect(state, `${unit.nodeId}: ${id} names ${key}`).toHaveProperty(key!);
        }
      }
    }
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
  it('is 3.2.0', () => {
    expect(JEV_QUESTION_SET_VERSION).toBe('3.2.0');
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
    expect(JEV_REVIEW_QUESTIONS.filter((item) => item.minSupporting !== undefined)).toHaveLength(3);
    expect(byKey('structure')?.minSupporting).toBe(2);
    expect(byKey('support_ordered')?.minSupporting).toBe(2);
    expect(JEV_REVIEW_QUESTIONS.some((item) => 'minClaims' in item)).toBe(false);
  });

  it('declares the scheme, structure and critical entries in order after the fallacies', () => {
    const tail = JEV_REVIEW_QUESTIONS.slice(JEV_REVIEW_QUESTIONS.findIndex((e) => e.key === 'scheme'));
    expect(tail.map((entry) => entry.key)).toEqual(SCHEME_KEYS);
    expect(JEV_REVIEW_QUESTIONS.slice(0, -tail.length).some((e) => e.kind === 'critical')).toBe(false);
    expect(tail.map((entry) => entry.kind)).toEqual([
      'scheme',
      'scheme',
      'structure',
      'structure',
      'structure',
      ...Array(10).fill('critical'),
    ]);
    expect(byKey('scheme')).toMatchObject({ polarity: 'none' });
    expect(byKey('scheme')?.question).toBeTypeOf('function');
    expect(byKey('scheme_fits')?.polarity).toBe('none');
    expect(byKey('structure')).toMatchObject({ polarity: 'none', minSupporting: 2 });
    expect(byKey('support_ordered')).toMatchObject({ polarity: 'none', minSupporting: 2 });
    expect(byKey('conclusion_restates')).toMatchObject({ polarity: 'none', requiresConclusion: true });
  });

  it('carries scheme, cq, polarity and logOnly on the critical entries', () => {
    const expected: Record<string, [string, string, string]> = {
      cq_cons_likely: ['consequences', 'burden', 'flag'],
      cq_cons_evidence: ['consequences', 'burden', 'flag'],
      cq_cons_value: ['consequences', 'rebuttal', 'flag'],
      cq_cause_timing_only: ['cause_to_effect', 'burden', 'flag'],
      cq_cause_evidence: ['cause_to_effect', 'burden', 'flag'],
      cq_cause_rival_addressed: ['cause_to_effect', 'rebuttal', 'good'],
      cq_exp_expertise: ['expert_opinion', 'burden', 'flag'],
      cq_exp_field: ['expert_opinion', 'burden', 'flag'],
      cq_exp_opinion: ['expert_opinion', 'burden', 'flag'],
      cq_exp_trust: ['expert_opinion', 'rebuttal', 'flag'],
    };
    for (const [key, [scheme, cq, polarity]] of Object.entries(expected)) {
      expect(byKey(key), key).toMatchObject({ kind: 'critical', scheme, cq, polarity, enabled: true });
    }
    expect(JEV_REVIEW_QUESTIONS.filter((e) => e.logOnly).map((e) => e.key)).toEqual(['cq_cons_value']);
    expect(JEV_REVIEW_QUESTIONS.some((e) => e.key === 'cq_cons_opposite')).toBe(false);
  });

  it('matches the enabled question set snapshot (wording changes must be deliberate)', () => {
    const enabled = JEV_REVIEW_QUESTIONS.filter((entry) => entry.enabled).map((entry) => ({
      key: entry.key,
      polarity: entry.polarity,
      kind: entry.kind,
      ideaUnitOnly: entry.ideaUnitOnly ?? false,
      minSupporting: entry.minSupporting ?? 0,
      // Only present on the 3.2.0 entries that set them, so the 3.1.0 snapshot entries stay as they were.
      ...(entry.scheme !== undefined && { scheme: entry.scheme }),
      ...(entry.cq !== undefined && { cq: entry.cq }),
      ...(entry.logOnly !== undefined && { logOnly: entry.logOnly }),
      ...(entry.requiresConclusion !== undefined && { requiresConclusion: entry.requiresConclusion }),
      idea: typeof entry.question === 'function' ? entry.question({ subject: 'idea' }) : entry.question,
      claim: typeof entry.question === 'function' ? entry.question({ subject: 'claim' }) : entry.question,
    }));
    expect(enabled).toMatchSnapshot();
  });
});
