import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty, optionalText, SYM_QUESTION } from '../shared.js';

export const civicLevelResearch = definePrompt({
  id: 'vision.civic-level-research',
  output: 'single',
  schema: z.strictObject({
    levelLabel: nonEmpty,
    semanticType: nonEmpty,
    jurisdiction: z
      .strictObject({
        placeName: nonEmpty,
        districtNumber: z.union([z.number(), nonEmpty]).nullish(),
        stateCode: optionalText,
      })
      .nullish(),
    questionText: nonEmpty,
  }),
  view: ({ jurisdiction, questionText }) => ({
    // Mustache treats 0 as falsy, so the district is passed as text.
    jurisdiction: jurisdiction && {
      ...jurisdiction,
      districtNumber: jurisdiction.districtNumber == null ? undefined : String(jurisdiction.districtNumber),
    },
    rootBulletBody: questionText.includes(SYM_QUESTION) ? questionText : `${questionText}${SYM_QUESTION}`,
  }),
});

export type CivicLevelResearchVars = PromptVars<typeof civicLevelResearch>;
