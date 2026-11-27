import { describe, expect, it } from 'vitest';

import {
  argumentPoints,
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

/** Probe doc fixture: Idea with five points, all flat (B). */
const PROBE_QUESTION = { text: 'How can the county cut drunk driving downtown?' };
const PROBE_IDEA = node(
  'idea-buses',
  'Run free late-night weekend buses from downtown bars to residential areas.',
  5,
  'Idea',
);
const P1 = node('p1', 'People who have been drinking would have a free ride home, so fewer of them would need to drive.', 8);
const P2 = node(
  'p2',
  "In the county's 2024 crash report, most downtown drunk-driving arrests happened between midnight and 3 a.m., after the last bus leaves at 11:30 p.m.",
  8,
);
const P3 = node("p3", "The county's buses sit idle at night, so the service would not need new vehicles.", 8);
const C1 = node(
  'c1',
  'Paying drivers until 3 a.m. on Fridays and Saturdays would cost the county about $400,000 a year.',
  8,
);
const C2 = node(
  'c2',
  'Some people would still drive home if they parked downtown and need their car the next morning.',
  8,
);
const REPLY_C1 = node(
  'r1',
  "The 2024 crash report puts the county's cost of downtown drunk-driving crashes at about $2 million a year, so preventing a fifth of them would cover the service.",
  8,
);
const REPLY_C2 = node(
  'r2',
  'Downtown garages could offer free next-morning parking to anyone who rode the late bus.',
  8,
);
const PAYS_FOR_ITSELF = node('weak1', 'The service would pay for itself.', 8);
const PAYS_SUB = [
  node('weak1-a', 'Downtown has more than twenty bars.', 8),
  node('weak1-b', 'Students often ride the bus.', 8),
];
const COSTS_AND_LIMITS = node('con-claim', 'The service would have real costs and limits.', 8);

function probeUnit(support: ReviewNode[], extra: Partial<ReviewUnit> = {}): ReviewUnit {
  return {
    nodeId: 'idea-buses',
    kind: 'idea',
    question: PROBE_QUESTION,
    context: [],
    subject: PROBE_IDEA,
    support,
    ...extra,
  };
}

function heading(id: string, text: string, support: ReviewNode[]): ReviewNode {
  return { id, text, group: true, support };
}

/** B: flat, five points, no sub-points. */
const FIXTURE_B = probeUnit([P1, P2, P3, C1, C2]);

/** C: Pros / Cons groupings, 3 + 2 points. */
const FIXTURE_C = probeUnit([heading('g-pros', 'Pros', [P1, P2, P3]), heading('g-cons', 'Cons', [C1, C2])]);

/** F: P1, P2, a real Claim with weak sub-points, then the Cons grouping. */
const FIXTURE_F = probeUnit([
  P1,
  P2,
  { ...PAYS_FOR_ITSELF, support: PAYS_SUB },
  heading('g-cons', 'Cons', [C1, C2]),
]);

/** F reordered: the weak Claim second, a con Claim with its own sub-points first. */
const FIXTURE_F_REORDERED = probeUnit([
  P1,
  { ...COSTS_AND_LIMITS, support: [C1, C2] },
  { ...PAYS_FOR_ITSELF, support: PAYS_SUB },
]);

/** T0: flat, downsides stated and not answered. */
const FIXTURE_T0 = FIXTURE_B;

/** T1: Pros / Cons tree with a real reply nested under each con. */
const FIXTURE_T1 = probeUnit([
  heading('g-pros', 'Pros', [P1, P2, P3]),
  heading('g-cons', 'Cons', [
    { ...C1, support: [REPLY_C1] },
    { ...C2, support: [REPLY_C2] },
  ]),
]);

/** T4: flat, the cost reply as a sibling item, not nested. */
const FIXTURE_T4 = probeUnit([P1, P2, P3, C1, REPLY_C1, C2]);

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

/** A flat unit with default options (4.0.0): the 3.1.0 keys plus `objection_answered`, which follows `considers_downside`. */
const FLAT_KEYS = [...V3_1_KEYS, 'objection_answered'];

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

  it('counts points: five in the flat fixture B', () => {
    expect(supportingCount(FIXTURE_B)).toBe(5);
    expect(argumentPoints(FIXTURE_B).map((point) => point.id)).toEqual(['p1', 'p2', 'p3', 'c1', 'c2']);
  });

  it('counts the points inside groupings, not the groupings: five in the grouped fixture C', () => {
    expect(FIXTURE_C.support).toHaveLength(2);
    expect(supportingCount(FIXTURE_C)).toBe(5);
    expect(argumentPoints(FIXTURE_C).map((point) => point.id)).toEqual(['p1', 'p2', 'p3', 'c1', 'c2']);
  });

  it('does not count sub-points', () => {
    expect(supportingCount(FIXTURE_F)).toBe(5);
    expect(supportingCount(probeUnit([{ ...P1, support: [P2, P3, C1] }]))).toBe(1);
  });

  it('counts nothing for a grouping with no points', () => {
    expect(supportingCount(probeUnit([heading('g', 'Pros', [])]))).toBe(0);
  });
});

describe('fingerprintReviewUnit', () => {
  it('is stable regardless of object key order in inputs', () => {
    const a = fingerprintReviewUnit(IDEA_UNIT);
    const reordered = {
      support: IDEA_UNIT.support.map((item) => ({
        typeInt: item.typeInt,
        sources: [...(item.sources ?? [])],
        text: item.text,
        label: item.label,
        id: item.id,
      })),
      subject: {
        typeInt: IDEA_UNIT.subject.typeInt,
        text: IDEA_UNIT.subject.text,
        sources: [...(IDEA_UNIT.subject.sources ?? [])],
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
    const unit: ReviewUnit = { ...IDEA_UNIT, context: [{ text: 'Parent idea text.' }] };
    const base = fingerprintReviewUnit(unit);
    expect(fingerprintReviewUnit({ ...unit, question: { text: 'Another question?' } })).not.toBe(base);
    expect(fingerprintReviewUnit({ ...unit, context: [{ text: 'Other parent text.' }] })).not.toBe(base);
  });

  it('hashes the nested shape: sub-points, groupings and the group flag all count', () => {
    const base = fingerprintReviewUnit(FIXTURE_F);

    // A sub-point edited, added or removed.
    const subEdited = probeUnit([
      P1,
      P2,
      { ...PAYS_FOR_ITSELF, support: [{ ...PAYS_SUB[0]!, text: 'Downtown has twenty bars.' }, PAYS_SUB[1]!] },
      FIXTURE_F.support[3]!,
    ]);
    expect(fingerprintReviewUnit(subEdited)).not.toBe(base);
    const subRemoved = probeUnit([
      P1,
      P2,
      { ...PAYS_FOR_ITSELF, support: [PAYS_SUB[0]!] },
      FIXTURE_F.support[3]!,
    ]);
    expect(fingerprintReviewUnit(subRemoved)).not.toBe(base);
    const subDropped = probeUnit([P1, P2, PAYS_FOR_ITSELF, FIXTURE_F.support[3]!]);
    expect(fingerprintReviewUnit(subDropped)).not.toBe(base);

    // Same texts, grouped and not: the group flag changes the hash.
    const grouped = fingerprintReviewUnit(FIXTURE_C);
    const ungrouped = fingerprintReviewUnit(
      probeUnit([
        { id: 'g-pros', text: 'Pros', label: 'Claim', typeInt: 8, sources: [], support: [P1, P2, P3] },
        { id: 'g-cons', text: 'Cons', label: 'Claim', typeInt: 8, sources: [], support: [C1, C2] },
      ]),
    );
    expect(grouped).not.toBe(ungrouped);

    // Moving a point between groupings.
    const moved = probeUnit([heading('g-pros', 'Pros', [P1, P2]), heading('g-cons', 'Cons', [P3, C1, C2])]);
    expect(fingerprintReviewUnit(moved)).not.toBe(grouped);
  });

  it('is the same for the same tree and ignores node ids at every level', () => {
    const renumber = (node: ReviewNode): ReviewNode => ({
      ...node,
      id: `x-${node.id}`,
      ...(node.support && { support: node.support.map(renumber) }),
    });
    expect(fingerprintReviewUnit({ ...FIXTURE_F, support: FIXTURE_F.support.map(renumber) })).toBe(
      fingerprintReviewUnit(FIXTURE_F),
    );
  });

  it('keeps the 3.1.0 fingerprint for a flat unit without a conclusion', () => {
    // Hash computed with the 3.1.0 code. Optional keys are left out when absent, so a flat unit is unchanged.
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
  it('produces the research state_example state, support as an array of objects in order', () => {
    const { state } = buildReviewRequest(STATE_EXAMPLE_UNIT);
    expect(state).toEqual({
      question: 'How can our town reduce pedestrian injuries on Maple Avenue?',
      idea: 'Perhaps the town could lower the speed limit on Maple Avenue from 35 to 25 mph.',
      support: [
        {
          text: 'Town police records show 14 pedestrian injuries on Maple Avenue between 2021 and 2024, and speed was cited in 9 of them.',
        },
        { text: 'A lower limit would only help if drivers comply.' },
        { text: 'Would drivers actually slow down without more enforcement?' },
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
        'objection_answered',
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

  it('has exactly the 3.1.0 question keys plus objection_answered with default options for a flat unit', () => {
    for (const unit of [IDEA_UNIT, CONCLUSION_UNIT]) {
      const { questions } = buildReviewRequest(unit);
      expect(Object.keys(questions).sort()).toEqual([...FLAT_KEYS].sort());
      expect(Object.keys(buildReviewRequest(unit, { includeScheme: false }).questions).sort()).toEqual(
        [...FLAT_KEYS].sort(),
      );
    }
  });

  it('adds every scheme key but conclusion_restates with includeScheme and no conclusion', () => {
    const { questions, state } = buildReviewRequest(IDEA_UNIT, { includeScheme: true });
    expect(supportingCount(IDEA_UNIT)).toBe(4);
    expect(Object.keys(questions).sort()).toEqual(
      [...FLAT_KEYS, ...SCHEME_KEYS.filter((key) => key !== 'conclusion_restates')].sort(),
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
    expect(Object.keys(questions).sort()).toEqual([...FLAT_KEYS, ...SCHEME_KEYS].sort());
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

  it('only names keys that exist in the state with includeScheme', () => {
    for (const unit of [IDEA_UNIT, CONCLUSION_UNIT, FIXTURE_F, FIXTURE_C]) {
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
    for (const unit of [IDEA_UNIT, FIXTURE_F, FIXTURE_C]) {
      const { questions } = buildReviewRequest(unit);
      for (const key of disabled) expect(questions[key], `${unit.nodeId}:${key}`).toBeUndefined();
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
      { text: 'Downtown bars close at 1:30 a.m., but the last bus leaves at midnight.' },
      { text: 'Everyone I know thinks the buses should run later.' },
    ]);
  });

  it('only names keys that exist in the request state', () => {
    for (const [name, unit] of [
      ['flat', IDEA_UNIT],
      ['grouped', FIXTURE_C],
      ['with a weak link', FIXTURE_F],
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

  it('never sends context: a unit is an Idea under a Question', () => {
    const withContext: ReviewUnit = { ...IDEA_UNIT, context: [{ text: 'ignored' }] };
    expect(buildReviewRequest(withContext).state).not.toHaveProperty('context');
  });

  it('always asks answers_question and question_leading', () => {
    for (const unit of [IDEA_UNIT, FIXTURE_B, FIXTURE_C, FIXTURE_F]) {
      const { questions } = buildReviewRequest(unit);
      expect(questions.answers_question, unit.nodeId).toBeDefined();
      expect(questions.question_leading, unit.nodeId).toBeDefined();
    }
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
      support: [{ text: 'Bars close late.' }, { text: 'What if buses ran later?' }],
    });
  });

  it('strips Symthink glyphs from nested and grouping text', () => {
    const { state } = buildReviewRequest(
      probeUnit([
        heading('g', 'Pros💡', [{ ...P1, text: 'A reason❓', support: [{ ...P2, text: 'A sub-point💡' }] }]),
      ]),
    );
    expect(state.support).toEqual([
      { text: 'Pros.', group: true, support: [{ text: 'A reason?', support: [{ text: 'A sub-point.' }] }] },
    ]);
  });
});

describe('buildReviewRequest: the argument as a tree (4.0.0)', () => {
  const keysOf = (unit: ReviewUnit, options = {}) => Object.keys(buildReviewRequest(unit, options).questions);

  it('sends state support as nested objects with no ids', () => {
    const { state } = buildReviewRequest(FIXTURE_F);
    expect(state).toEqual({
      question: 'How can the county cut drunk driving downtown?',
      idea: 'Run free late-night weekend buses from downtown bars to residential areas.',
      support: [
        { text: P1.text },
        { text: P2.text },
        {
          text: 'The service would pay for itself.',
          support: [{ text: 'Downtown has more than twenty bars.' }, { text: 'Students often ride the bus.' }],
        },
        { text: 'Cons', group: true, support: [{ text: C1.text }, { text: C2.text }] },
      ],
    });
    expect(JSON.stringify(state)).not.toMatch(/"id"|weak1|g-cons|"typeInt"|"sources"|"label"/);
  });

  it('marks groupings with group: true and leaves support and group out when unused', () => {
    const { state } = buildReviewRequest(FIXTURE_C);
    expect(state.support).toEqual([
      { text: 'Pros', group: true, support: [{ text: P1.text }, { text: P2.text }, { text: P3.text }] },
      { text: 'Cons', group: true, support: [{ text: C1.text }, { text: C2.text }] },
    ]);
    const flat = buildReviewRequest(FIXTURE_B).state.support as Record<string, unknown>[];
    for (const item of flat) expect(Object.keys(item)).toEqual(['text']);
  });

  it('drops blank sub-points, and a grouping with nothing under it', () => {
    const { state, questions } = buildReviewRequest(
      probeUnit([
        { ...P1, support: [node('b', '  ', 8), node('b2', '', 8)] },
        heading('g-empty', 'Pros', [node('b3', ' ', 8)]),
        heading('g-none', 'Cons', []),
      ]),
    );
    expect(state.support).toEqual([{ text: P1.text }]);
    expect(questions.sub_support_backs).toBeUndefined();
  });

  describe('fixture B (flat)', () => {
    it('has five points and asks neither sub_support_backs nor weak_item', () => {
      expect(supportingCount(FIXTURE_B)).toBe(5);
      const result = buildReviewRequest(FIXTURE_B, { includeScheme: true });
      expect(result.questions.sub_support_backs).toBeUndefined();
      expect(result.questions.weak_item).toBeUndefined();
      expect(result.weakItemOptions).toEqual({});
    });
  });

  describe('fixture C (grouped)', () => {
    it('counts five points, asks support_repeats, and asks neither weak-link question', () => {
      expect(supportingCount(FIXTURE_C)).toBe(5);
      const { questions, weakItemOptions } = buildReviewRequest(FIXTURE_C);
      expect(questions.support_repeats).toBeDefined();
      expect(questions.sub_support_backs).toBeUndefined();
      expect(questions.weak_item).toBeUndefined();
      expect(weakItemOptions).toEqual({});
    });

    it('asks structure and support_ordered with includeScheme, since five points are counted', () => {
      const { questions } = buildReviewRequest(FIXTURE_C, { includeScheme: true });
      expect(questions.structure).toBeDefined();
      expect(questions.support_ordered).toBeDefined();
    });

    it('does not count the groupings: two headings alone would not ask support_repeats', () => {
      const oneEach = probeUnit([heading('a', 'Pros', [P1]), heading('b', 'Cons', [C1])]);
      expect(supportingCount(oneEach)).toBe(2);
      expect(buildReviewRequest(oneEach).questions.support_repeats).toBeDefined();
      const single = probeUnit([heading('a', 'Pros', [P1]), heading('b', 'Cons', [])]);
      expect(supportingCount(single)).toBe(1);
      expect(buildReviewRequest(single).questions.support_repeats).toBeUndefined();
    });
  });

  describe('support_repeats with object items', () => {
    it('is asked for a flat list of object items', () => {
      expect(buildReviewRequest(FIXTURE_B).questions.support_repeats).toBeDefined();
    });

    it('is asked for points that carry sub-points, and counts points, not sub-points', () => {
      expect(buildReviewRequest(FIXTURE_F).questions.support_repeats).toBeDefined();
      const onePoint = probeUnit([{ ...P1, support: [P2, P3, C1] }]);
      expect(buildReviewRequest(onePoint).questions.support_repeats).toBeUndefined();
    });
  });

  describe('sub_support_backs', () => {
    it('is sent only when some point has sub-points', () => {
      expect(keysOf(FIXTURE_B)).not.toContain('sub_support_backs');
      expect(keysOf(FIXTURE_C)).not.toContain('sub_support_backs');
      expect(keysOf(FIXTURE_F)).toContain('sub_support_backs');
      expect(keysOf(FIXTURE_T1)).toContain('sub_support_backs');
    });

    it('is sent whatever includeFallacies and includeScheme are', () => {
      expect(keysOf(FIXTURE_F, { includeFallacies: false })).toContain('sub_support_backs');
      expect(keysOf(FIXTURE_F, { includeScheme: true })).toContain('sub_support_backs');
    });

    it("carries the probe's wording word for word", () => {
      expect(buildReviewRequest(FIXTURE_F).questions.sub_support_backs).toEqual({
        type: 'noul',
        instructions:
          'For each item in `support` that has its own `support`, do those sub-points work as reasons to accept that item? An item that is only a heading grouping points (such as "Pros" or "Cons") needs no backing. Judge the reasoning only, not whether anything is true.',
        criteria: {
          true: 'Every item that has sub-points is backed by them, or is only a heading',
          false:
            'At least one item that has sub-points is not backed by them: they are background, off topic, or repeat it',
        },
      });
    });
  });

  describe('weak_item', () => {
    it('is sent only with sub_support_backs', () => {
      for (const unit of [FIXTURE_B, FIXTURE_C, FIXTURE_F, FIXTURE_F_REORDERED, FIXTURE_T1]) {
        const keys = keysOf(unit);
        expect(keys.includes('weak_item'), unit.nodeId).toBe(keys.includes('sub_support_backs'));
      }
    });

    it("carries the probe's instructions and builds i1, i2 ... and none", () => {
      const { questions } = buildReviewRequest(FIXTURE_F_REORDERED);
      expect(questions.weak_item).toEqual({
        type: 'choice',
        instructions:
          'Of the items in `support` that have their own `support`, which one is least well backed by its sub-points? An item that is only a heading grouping points (such as "Pros" or "Cons") needs no backing. Judge the reasoning only, not whether anything is true.',
        criteria: {
          i1: 'The item "The service would have real costs and limits."',
          i2: 'The item "The service would pay for itself."',
          none: 'Every item with sub-points is backed by them, or is only a heading',
        },
      });
    });

    it('fixture F: i1 is the weak Claim and weakItemOptions maps it to its node id', () => {
      const { questions, weakItemOptions } = buildReviewRequest(FIXTURE_F);
      expect(questions.weak_item).toMatchObject({
        criteria: { i1: 'The item "The service would pay for itself."', none: expect.any(String) },
      });
      expect(Object.keys((questions.weak_item as { criteria: object }).criteria)).toEqual(['i1', 'none']);
      expect(weakItemOptions).toEqual({ i1: 'weak1' });
    });

    it('fixture F reordered: i1 and i2 map to the right node ids, in tree order', () => {
      const { weakItemOptions } = buildReviewRequest(FIXTURE_F_REORDERED);
      expect(weakItemOptions).toEqual({ i1: 'con-claim', i2: 'weak1' });
    });

    it('lists points with sub-points inside groupings, in tree order', () => {
      const unit = probeUnit([
        heading('g-pros', 'Pros', [{ ...P1, support: [P2] }, P3]),
        heading('g-cons', 'Cons', [{ ...C1, support: [REPLY_C1] }, C2]),
      ]);
      const { questions, weakItemOptions } = buildReviewRequest(unit);
      expect(weakItemOptions).toEqual({ i1: 'p1', i2: 'c1' });
      expect(Object.keys((questions.weak_item as { criteria: object }).criteria)).toEqual(['i1', 'i2', 'none']);
    });

    it('never offers a grouping, a sub-point, or a point without sub-points', () => {
      const { weakItemOptions } = buildReviewRequest(FIXTURE_T1);
      expect(Object.values(weakItemOptions)).toEqual(['c1', 'c2']);
    });

    it('leaves blank points out of the options', () => {
      const unit = probeUnit([
        { ...node('blank', '  ', 8), support: [P2] },
        { ...P1, support: [P3] },
      ]);
      expect(buildReviewRequest(unit).weakItemOptions).toEqual({ i1: 'p1' });
    });

    it('does not send the option map to Jev: it is not part of state or questions', () => {
      const result = buildReviewRequest(FIXTURE_F);
      expect(JSON.stringify(result.state)).not.toContain('weak1');
      expect(JSON.stringify(result.questions)).not.toContain('weak1');
    });
  });

  describe('objection_answered', () => {
    it('follows considers_downside, on every shape of tree', () => {
      for (const unit of [IDEA_UNIT, FIXTURE_B, FIXTURE_C, FIXTURE_F, FIXTURE_T0, FIXTURE_T1, FIXTURE_T4]) {
        const keys = keysOf(unit);
        expect(keys, unit.nodeId).toContain('considers_downside');
        expect(keys, unit.nodeId).toContain('objection_answered');
      }
    });

    it('is not sent without considers_downside', () => {
      const original = JEV_REVIEW_QUESTIONS.find((entry) => entry.key === 'considers_downside')!;
      const enabled = original.enabled;
      (original as { enabled: boolean }).enabled = false;
      try {
        const { questions } = buildReviewRequest(FIXTURE_C);
        expect(questions.considers_downside).toBeUndefined();
        expect(questions.objection_answered).toBeUndefined();
      } finally {
        (original as { enabled: boolean }).enabled = enabled;
      }
    });

    it("carries the probe's wording word for word", () => {
      expect(buildReviewRequest(FIXTURE_T1).questions.objection_answered).toEqual({
        type: 'noul',
        instructions:
          'Look at the items in `support` that count against the idea (downsides, costs, objections). Does the argument reply to the strongest of them: is there a point, usually nested under that downside, that answers it by reducing, outweighing or addressing it? Stating a downside is not replying to it. Judge the reasoning only, not whether anything is true.',
        criteria: {
          true: 'The strongest downside has a reply that genuinely answers it',
          false: "No downside is answered, or the replies don't address the downside they sit under",
        },
      });
    });

    it('sends the T1 tree with a reply nested under each con, and T4 with the reply as a sibling', () => {
      expect(buildReviewRequest(FIXTURE_T1).state.support).toEqual([
        { text: 'Pros', group: true, support: [{ text: P1.text }, { text: P2.text }, { text: P3.text }] },
        {
          text: 'Cons',
          group: true,
          support: [
            { text: C1.text, support: [{ text: REPLY_C1.text }] },
            { text: C2.text, support: [{ text: REPLY_C2.text }] },
          ],
        },
      ]);
      expect(supportingCount(FIXTURE_T4)).toBe(6);
      expect(buildReviewRequest(FIXTURE_T4).state.support).toHaveLength(6);
    });
  });

  it('asks the sub-point questions in order after support_backs_idea, and objection_answered after considers_downside', () => {
    const keys = keysOf(FIXTURE_F);
    expect(keys.slice(0, 6)).toEqual([
      'answers_question',
      'support_backs_idea',
      'sub_support_backs',
      'weak_item',
      'support_checkable',
      'considers_downside',
    ]);
    expect(keys[6]).toBe('objection_answered');
  });

  it('adds the scheme questions on a tree with includeScheme, unchanged', () => {
    const { questions } = buildReviewRequest(FIXTURE_F, { includeScheme: true });
    for (const key of SCHEME_KEYS.filter((key) => key !== 'conclusion_restates')) {
      expect(questions[key], key).toBeDefined();
    }
    expect(questions.weak_item).toBeDefined();
    expect(questions.objection_answered).toBeDefined();
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
  it('is 4.0.0', () => {
    expect(JEV_QUESTION_SET_VERSION).toBe('4.0.0');
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
    for (const [key, polarity] of [
      ['sub_support_backs', 'good'],
      ['weak_item', 'none'],
      ['objection_answered', 'good'],
    ] as const) {
      expect(byKey(key), key).toMatchObject({ polarity, kind: 'rubric', enabled: true });
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

  it('marks the minimum supporting count and the conditional entries', () => {
    expect(JEV_REVIEW_QUESTIONS.some((item) => 'ideaUnitOnly' in item)).toBe(false);
    expect(byKey('support_repeats')?.minSupporting).toBe(2);
    expect(JEV_REVIEW_QUESTIONS.filter((item) => item.minSupporting !== undefined)).toHaveLength(3);
    expect(byKey('sub_support_backs')?.requiresSubPoints).toBe(true);
    expect(byKey('weak_item')?.sentWith).toBe('sub_support_backs');
    expect(byKey('objection_answered')?.sentWith).toBe('considers_downside');
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
      minSupporting: entry.minSupporting ?? 0,
      // Only present on the entries that set them, so the 3.1.0 snapshot entries stay as they were.
      ...(entry.scheme !== undefined && { scheme: entry.scheme }),
      ...(entry.cq !== undefined && { cq: entry.cq }),
      ...(entry.logOnly !== undefined && { logOnly: entry.logOnly }),
      ...(entry.requiresConclusion !== undefined && { requiresConclusion: entry.requiresConclusion }),
      ...(entry.requiresSubPoints !== undefined && { requiresSubPoints: entry.requiresSubPoints }),
      ...(entry.sentWith !== undefined && { sentWith: entry.sentWith }),
      idea:
        typeof entry.question === 'function'
          ? entry.question({ subject: 'idea' }, { weakItemTexts: ['First item', 'Second item'] })
          : entry.question,
      claim:
        typeof entry.question === 'function'
          ? entry.question({ subject: 'claim' }, { weakItemTexts: ['First item', 'Second item'] })
          : entry.question,
    }));
    expect(enabled).toMatchSnapshot();
  });
});
