import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty, optionalText } from '../shared.js';

export const questionResearch = definePrompt({
  id: 'ballot.question-research',
  output: 'single',
  schema: z.strictObject({
    electionName: nonEmpty,
    electionDay: optionalText,
    questionTitle: nonEmpty,
  }),
});

export type QuestionResearchVars = PromptVars<typeof questionResearch>;
