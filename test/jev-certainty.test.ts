import { describe, expect, it } from 'vitest';

import { buildCertaintyRequest, typeIntFromCertaintyScore } from '../src/jev/index.js';

const SAMPLE_STATEMENT = 'Later bus service would probably reduce drunk driving downtown.';

describe('typeIntFromCertaintyScore', () => {
  it.each([
    [0, 2],
    [0.06, 2],
    [0.89, 5],
    [1, 5],
    [2, 8],
    [-1, 1],
    [3, 9],
  ] as const)('maps score %f to typeInt %i', (score, typeInt) => {
    expect(typeIntFromCertaintyScore(score)).toBe(typeInt);
  });

  it('never returns 0', () => {
    for (const score of [-100, 0, 0.001, 100]) {
      expect(typeIntFromCertaintyScore(score)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('buildCertaintyRequest', () => {
  it('matches research Sample 1 (host supplies model)', () => {
    expect(buildCertaintyRequest(SAMPLE_STATEMENT)).toMatchInlineSnapshot(`
      {
        "questions": {
          "certainty": {
            "criteria": [
              "Asks: poses something to be answered or wondered about",
              "Proposes: offers a possibility, suggestion or hypothesis, using words such as might, could, probably, perhaps, or what if",
              "Asserts: states something as true or settled, without hedging",
            ],
            "instructions": "How certain does the wording of \`statement\` present itself as being? Judge the wording only, not whether the statement is true.",
            "type": "score",
          },
        },
        "state": {
          "statement": "Later bus service would probably reduce drunk driving downtown.",
        },
      }
    `);
  });
});