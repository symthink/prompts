import { describe, expect, it } from 'vitest';

import {
  buildReviewRequest,
  claimIdForQuestionKey,
  fingerprintReviewUnit,
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

/** Research Sample 3 fallacy instructions (per-Claim and set only). */
const SAMPLE_3_FALLACY_INSTRUCTIONS: Record<string, string> = {
  slippery_slope_set:
    'Taken in order, do the items in `claims` form a chain in which each step is assumed to lead to the next, ending in an extreme outcome, without showing why each step follows?',
  circular_set:
    'Do the items in `claims` support `idea` only by restating it, or by relying on each other in a circle?',
  appeal_to_popularity_c1: 'Does `claims.c1` argue that `idea` is right because many people believe or want it?',
  appeal_to_popularity_c2: 'Does `claims.c2` argue that `idea` is right because many people believe or want it?',
  appeal_to_popularity_c3: 'Does `claims.c3` argue that `idea` is right because many people believe or want it?',
  appeal_to_popularity_c4: 'Does `claims.c4` argue that `idea` is right because many people believe or want it?',
  personal_attack_c1: 'Does `claims.c1` dismiss a view by attacking the person who holds it instead of the view itself?',
  personal_attack_c2: 'Does `claims.c2` dismiss a view by attacking the person who holds it instead of the view itself?',
  personal_attack_c3: 'Does `claims.c3` dismiss a view by attacking the person who holds it instead of the view itself?',
  personal_attack_c4: 'Does `claims.c4` dismiss a view by attacking the person who holds it instead of the view itself?',
  hasty_generalisation_c1: 'Does `claims.c1` draw a broad conclusion from one or a few cases?',
  hasty_generalisation_c2: 'Does `claims.c2` draw a broad conclusion from one or a few cases?',
  hasty_generalisation_c3: 'Does `claims.c3` draw a broad conclusion from one or a few cases?',
  hasty_generalisation_c4: 'Does `claims.c4` draw a broad conclusion from one or a few cases?',
  false_dilemma_c1: 'Does `claims.c1` present only two options when more exist?',
  false_dilemma_c2: 'Does `claims.c2` present only two options when more exist?',
  false_dilemma_c3: 'Does `claims.c3` present only two options when more exist?',
  false_dilemma_c4: 'Does `claims.c4` present only two options when more exist?',
  slippery_slope_c1:
    'Does `claims.c1` claim one step will lead to an extreme outcome without showing why each step follows?',
  slippery_slope_c2:
    'Does `claims.c2` claim one step will lead to an extreme outcome without showing why each step follows?',
  slippery_slope_c3:
    'Does `claims.c3` claim one step will lead to an extreme outcome without showing why each step follows?',
  slippery_slope_c4:
    'Does `claims.c4` claim one step will lead to an extreme outcome without showing why each step follows?',
};

function fallacyQuestionsWithHasty(unit: ReviewUnit) {
  const base = buildReviewRequest(unit, { includeFallacies: true, includeSetFallacies: true });
  const hastyEntry = JEV_REVIEW_QUESTIONS.find((entry) => entry.key === 'hasty_generalisation')!;
  const questions = { ...base.questions };
  unit.claims.forEach((_claim, index) => {
    const claimNum = index + 1;
    const id = `hasty_generalisation_c${claimNum}`;
    const question =
      typeof hastyEntry.question === 'function'
        ? hastyEntry.question('idea', claimNum)
        : hastyEntry.question;
    questions[id] = question;
  });
  return questions;
}

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
  it('includes 34 questions for four Claims with enabled fallacies (hasty disabled)', () => {
    const { questions } = buildReviewRequest(SAMPLE_2_UNIT, {
      includeFallacies: true,
      includeSetFallacies: true,
    });
    // 7 unit + 4 relevant + 5 certainty + 4 per-Claim fallacies × 4 Claims; set-level entries are gated off.
    expect(Object.keys(questions)).toHaveLength(32);
    expect(questions.hasty_generalisation_c1).toBeUndefined();
    expect(questions.slippery_slope_set).toBeUndefined();
    expect(questions.circular_set).toBeUndefined();
  });

  it('skips questions that compare Claims when the unit has fewer than two', () => {
    const single: ReviewUnit = { ...SAMPLE_2_UNIT, claims: [SAMPLE_2_UNIT.claims[0]!] };
    const { questions } = buildReviewRequest(single);
    expect(questions.distinctness).toBeUndefined();
    expect(questions.conclusion_follows).toBeDefined();
    expect(questions.relevant_c1).toBeDefined();

    const none: ReviewUnit = { ...SAMPLE_2_UNIT, claims: [] };
    const empty = buildReviewRequest(none).questions;
    expect(empty.distinctness).toBeUndefined();
    expect(empty.conclusion_follows).toBeUndefined();
    expect(empty.sufficiency).toBeDefined();
  });

  it('only names keys that exist in the request state', () => {
    const { questions } = buildReviewRequest(SAMPLE_2_UNIT);
    expect(questions.counterpoint?.instructions).not.toContain('the unit');
    expect(questions.conclusion_follows?.instructions).not.toContain('the conclusion');
  });

  it('uses the claim state key and skips responds_to_question for nested units', () => {
    const nested: ReviewUnit = {
      ...SAMPLE_2_UNIT,
      kind: 'nested_claim',
      nodeId: 'claim-nested',
      context: [{ text: 'Parent idea text.' }],
      subject: { ...SAMPLE_2_UNIT.claims[0]!, id: 'nested-subject' },
      claims: [
        {
          id: 'child-1',
          text: 'Child claim one.',
          label: 'Claim',
          typeInt: 8,
          sources: [],
        },
      ],
    };
    const { state, questions } = buildReviewRequest(nested);
    expect(state).toHaveProperty('claim');
    expect(state).not.toHaveProperty('idea');
    expect((state as Record<string, unknown>).context).toEqual(['Parent idea text.']);
    expect(questions.responds_to_question).toBeUndefined();
    expect(questions.relevant_c1?.instructions).toContain('`claim`');
  });

  it('strips Symthink glyphs from state text', () => {
    const withGlyphs: ReviewUnit = {
      ...SAMPLE_2_UNIT,
      question: { text: 'How can we fix this❓' },
      subject: { ...SAMPLE_2_UNIT.subject, text: 'Maybe buses help💡' },
      claims: [{ ...SAMPLE_2_UNIT.claims[0]!, text: 'Bars close late🕫' }],
    };
    const { state } = buildReviewRequest(withGlyphs);
    const stateRecord = state as Record<string, unknown>;
    expect(stateRecord.question).toBe('How can we fix this?');
    expect(stateRecord.idea).toBe('Maybe buses help.');
    expect((stateRecord.claims as Record<string, string>).c1).toBe('Bars close late.');
  });

  it('matches Sample 3 fallacy instructions for per-Claim and set entries', () => {
    const questions = fallacyQuestionsWithHasty(SAMPLE_2_UNIT);
    for (const [id, expected] of Object.entries(SAMPLE_3_FALLACY_INSTRUCTIONS)) {
      if (id.startsWith('hasty_generalisation')) continue;
      if (id.endsWith('_set')) {
        // Set-level entries are disabled (owner gate) but keep their Sample 3 wording in the library.
        const entry = JEV_REVIEW_QUESTIONS.find((item) => item.key === id)!;
        const question = typeof entry.question === 'function' ? entry.question('idea') : entry.question;
        expect(question.instructions, id).toBe(expected);
        continue;
      }
      expect(questions[id]?.instructions, id).toBe(expected);
    }
    expect(questions.hasty_generalisation_c2?.instructions).toBe(
      'Does `claims.c2` conclude something about a whole group from one or a few personal examples or anecdotes?',
    );
  });
});

describe('claimIdForQuestionKey', () => {
  it('maps per-claim and subject keys to node ids', () => {
    expect(claimIdForQuestionKey('relevant_c3', SAMPLE_2_UNIT)).toBe('c3');
    expect(claimIdForQuestionKey('certainty_subject', SAMPLE_2_UNIT)).toBe('idea-1');
    expect(claimIdForQuestionKey('sufficiency', SAMPLE_2_UNIT)).toBeNull();
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

  it('keeps set-level fallacies disabled until the owner gates pass', () => {
    for (const key of ['slippery_slope_set', 'circular_set']) {
      const entry = JEV_REVIEW_QUESTIONS.find((item) => item.key === key);
      expect(entry?.enabled, key).toBe(false);
      expect(entry?.minClaims, key).toBe(2);
    }
  });

  it('marks distinctness as a flag (yes is the criticism)', () => {
    const entry = JEV_REVIEW_QUESTIONS.find((item) => item.key === 'distinctness');
    expect(entry?.polarity).toBe('flag');
  });
});