import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty, optionalText } from '../shared.js';

export const candidateResearch = definePrompt({
  id: 'ballot.candidate-research',
  output: 'single',
  schema: z.strictObject({
    electionName: nonEmpty,
    electionDay: optionalText,
    contestTitle: optionalText,
    candidateName: nonEmpty,
    fecCandidateId: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]+$/, 'FEC candidate ids contain only uppercase letters and digits')
      .optional(),
  }),
});

export type CandidateResearchVars = PromptVars<typeof candidateResearch>;
