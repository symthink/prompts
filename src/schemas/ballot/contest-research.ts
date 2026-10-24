import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty, optionalText } from '../shared.js';

export const contestResearch = definePrompt({
  id: 'ballot.contest-research',
  output: 'single',
  schema: z.strictObject({
    electionName: nonEmpty,
    electionDay: optionalText,
    contestTitle: nonEmpty,
    contestCandidates: z.array(nonEmpty).default([]),
  }),
});

export type ContestResearchVars = PromptVars<typeof contestResearch>;
