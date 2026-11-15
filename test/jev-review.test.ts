import { describe, expect, it } from 'vitest';

import {
  buildReviewRequest,
  fingerprintReviewUnit,
  joinClaimsParagraph,
  JEV_REVIEW_QUESTIONS,
  stripSymthinkGlyphs,
  type ReviewUnit,
} from '../src/jev/index.js';

const SAMPLE_2_UNIT: ReviewUnit = {
  nodeId: 'idea-1',
  kind: 'idea',
  question: { text: 'How can the city cut drunk driving downtown?' },
  context: [],
  subject: {
    id: 'idea-1',
    text: 'Extending weekend bus service until 2 a.m. could cut drunk driving downtown.',
    label: 'Idea',
    typeInt: 5,
    sources: [],
  },
  truncatedClaims: 0,
  claims: [
    {
      id: 'c1',
      text: 'Downtown bars close at 1:30 a.m., but the last bus leaves at midnight.',
      label: 'Claim',
      typeInt: 8,
      sources: [],
    },
    {
      id: 'c2',
      text: 'Everyone I know thinks the buses should run later.',
      label: 'Claim',
      typeInt: 8,
      sources: [],
    },
    {
      id: 'c3',
      text: "The transit director has never ridden a bus in his life, so his objections don't count.",
      label: 'Claim',
      typeInt: 8,
      sources: [],
    },
    {
      id: 'c4',
      text: 'The new library opened last spring.',
      label: 'Claim',
      typeInt: 8,
      sources: [],
    },
  ],
};

describe('fingerprintReviewUnit', () => {
  it('is stable regardless of object key order in inputs', () => {
    const a = fingerprintReviewUnit(SAMPLE_2_UNIT);
    const reordered: ReviewUnit = {
      ...SAMPLE_2_UNIT,
      claims: [...SAMPLE_2_UNIT.claims].reverse().reverse(),
    };
    expect(fingerprintReviewUnit(reordered)).toBe(a);
  });

  it('changes when covered fields or claim order changes', () => {
    const base = fingerprintReviewUnit(SAMPLE_2_UNIT);
    const textChange: ReviewUnit = {
      ...SAMPLE_2_UNIT,
      subject: { ...SAMPLE_2_UNIT.subject, text: SAMPLE_2_UNIT.subject.text + ' ' },
    };
    expect(fingerprintReviewUnit(textChange)).not.toBe(base);

    const swapped: ReviewUnit = {
      ...SAMPLE_2_UNIT,
      claims: [
        SAMPLE_2_UNIT.claims[1]!,
        SAMPLE_2_UNIT.claims[0]!,
        SAMPLE_2_UNIT.claims[2]!,
        SAMPLE_2_UNIT.claims[3]!,
      ],
    };
    expect(fingerprintReviewUnit(swapped)).not.toBe(base);
  });

  it('ignores fields outside the fingerprint shape', () => {
    const withMeta: ReviewUnit = { ...SAMPLE_2_UNIT, nodeId: 'other', truncatedClaims: 3 };
    expect(fingerprintReviewUnit(withMeta)).toBe(fingerprintReviewUnit(SAMPLE_2_UNIT));
  });
});

describe('buildReviewRequest', () => {
  it('sends the Claims as one paragraph, in order', () => {
    const { state } = buildReviewRequest(SAMPLE_2_UNIT);
    expect(state).toEqual({
      question: 'How can the city cut drunk driving downtown?',
      idea: 'Extending weekend bus service until 2 a.m. could cut drunk driving downtown.',
      claims:
        "Downtown bars close at 1:30 a.m., but the last bus leaves at midnight. Everyone I know thinks the buses should run later. The transit director has never ridden a bus in his life, so his objections don't count. The new library opened last spring.",
    });
  });

  it('asks each enabled question once for the unit, with no per-Claim ids', () => {
    const { questions } = buildReviewRequest(SAMPLE_2_UNIT, { includeFallacies: true });
    expect(Object.keys(questions).sort()).toEqual(
      [
        'responds_to_question',
        'relevant',
        'sufficiency',
        'clarity',
        'distinctness',
        'counterpoint',
        'conclusion_follows',
        'appeal_to_popularity',
        'personal_attack',
        'false_dilemma',
        'slippery_slope',
        'circular_reasoning',
      ].sort(),
    );
    expect(Object.keys(questions).some((key) => /_c\d+$/.test(key))).toBe(false);
    expect(questions.hasty_generalisation).toBeUndefined();
  });

  it('measures fallacies against the Claims taken together', () => {
    const { questions } = buildReviewRequest(SAMPLE_2_UNIT);
    expect(questions.slippery_slope?.instructions).toBe(
      'Do `claims` assume that one step will lead, through further steps, to an extreme outcome without showing why each step follows?',
    );
    expect(questions.circular_reasoning?.instructions).toBe(
      'Do `claims` support `idea` only by restating it, or by relying on each other in a circle?',
    );
    expect(questions.relevant?.instructions).toBe(
      'Taken together, do `claims` bear directly on whether `idea` is true or wise?',
    );
  });

  it('leaves fallacies out when asked', () => {
    const { questions } = buildReviewRequest(SAMPLE_2_UNIT, { includeFallacies: false });
    expect(questions.personal_attack).toBeUndefined();
    expect(questions.sufficiency).toBeDefined();
  });

  it('skips questions that need more Claims than the unit has', () => {
    const single: ReviewUnit = { ...SAMPLE_2_UNIT, claims: [SAMPLE_2_UNIT.claims[0]!] };
    const { questions } = buildReviewRequest(single);
    expect(questions.distinctness).toBeUndefined();
    expect(questions.conclusion_follows).toBeDefined();
    expect(questions.relevant).toBeDefined();
    expect(questions.circular_reasoning).toBeDefined();

    const none: ReviewUnit = { ...SAMPLE_2_UNIT, claims: [] };
    const empty = buildReviewRequest(none);
    expect(empty.state).toHaveProperty('claims', '');
    expect(empty.questions.relevant).toBeUndefined();
    expect(empty.questions.conclusion_follows).toBeUndefined();
    expect(empty.questions.personal_attack).toBeUndefined();
    expect(empty.questions.sufficiency).toBeDefined();
  });

  it('only names keys that exist in the request state', () => {
    for (const unit of [SAMPLE_2_UNIT, { ...SAMPLE_2_UNIT, kind: 'nested_claim' as const }]) {
      const { state, questions } = buildReviewRequest(unit);
      for (const [id, question] of Object.entries(questions)) {
        for (const [, name] of question.instructions.matchAll(/`([a-z_]+)`/g)) {
          expect(state, `${unit.kind}:${id} names ${name}`).toHaveProperty(name!);
        }
      }
    }
  });

  it('uses claim and supporting_claims, and skips responds_to_question, for nested units', () => {
    const nested: ReviewUnit = {
      ...SAMPLE_2_UNIT,
      kind: 'nested_claim',
      nodeId: 'claim-nested',
      context: [{ text: 'Parent idea text.' }],
      subject: { ...SAMPLE_2_UNIT.claims[0]!, id: 'nested-subject' },
      claims: [
        { id: 'child-1', text: 'Child claim one', label: 'Claim', typeInt: 8, sources: [] },
        { id: 'child-2', text: 'Child claim two.', label: 'Claim', typeInt: 8, sources: [] },
      ],
    };
    const { state, questions } = buildReviewRequest(nested);
    expect(state).toEqual({
      question: 'How can the city cut drunk driving downtown?',
      claim: 'Downtown bars close at 1:30 a.m., but the last bus leaves at midnight.',
      supporting_claims: 'Child claim one. Child claim two.',
      context: ['Parent idea text.'],
    });
    expect(questions.responds_to_question).toBeUndefined();
    expect(questions.relevant?.instructions).toBe(
      'Taken together, do `supporting_claims` bear directly on whether `claim` is true or wise?',
    );
  });

  it('strips Symthink glyphs from state text', () => {
    const withGlyphs: ReviewUnit = {
      ...SAMPLE_2_UNIT,
      question: { text: 'How can we fix this❓' },
      subject: { ...SAMPLE_2_UNIT.subject, text: 'Maybe buses help💡' },
      claims: [
        { ...SAMPLE_2_UNIT.claims[0]!, text: 'Bars close late🕫' },
        { ...SAMPLE_2_UNIT.claims[1]!, text: 'What if buses ran later?💡' },
      ],
    };
    const { state } = buildReviewRequest(withGlyphs);
    expect(state).toMatchObject({
      question: 'How can we fix this?',
      idea: 'Maybe buses help.',
      claims: 'Bars close late. What if buses ran later?',
    });
  });
});

describe('joinClaimsParagraph', () => {
  it('adds a full stop only where a Claim has no closing punctuation', () => {
    expect(joinClaimsParagraph(['One', 'Two!', '  ', 'He said "three."', 'Four?'])).toBe(
      'One. Two! He said "three." Four?',
    );
  });
});

describe('stripSymthinkGlyphs', () => {
  it('matches tree jevText replacement rules', () => {
    expect(stripSymthinkGlyphs('Why do buses stop❓')).toBe('Why do buses stop?');
    expect(stripSymthinkGlyphs('Later buses might help💡')).toBe('Later buses might help.');
    expect(stripSymthinkGlyphs('What if buses ran?💡')).toBe('What if buses ran?');
  });
});

describe('JEV_REVIEW_QUESTIONS', () => {
  it('keeps hasty generalisation disabled in the library', () => {
    const entry = JEV_REVIEW_QUESTIONS.find((item) => item.key === 'hasty_generalisation');
    expect(entry?.enabled).toBe(false);
  });

  it('enables slippery slope and circular reasoning for the Claims taken together', () => {
    for (const key of ['slippery_slope', 'circular_reasoning']) {
      const entry = JEV_REVIEW_QUESTIONS.find((item) => item.key === key);
      expect(entry?.enabled, key).toBe(true);
      expect(entry?.minClaims, key).toBe(1);
    }
  });

  it('marks distinctness as a flag (yes is the criticism)', () => {
    const entry = JEV_REVIEW_QUESTIONS.find((item) => item.key === 'distinctness');
    expect(entry?.polarity).toBe('flag');
  });
});