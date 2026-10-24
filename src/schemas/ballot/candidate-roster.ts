import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty, optionalText } from '../shared.js';

const ballotLineSchema = z.strictObject({
  displayText: nonEmpty,
  votingInstruction: optionalText,
});

export const candidateRoster = definePrompt({
  id: 'ballot.candidate-roster',
  output: 'single',
  schema: z.strictObject({
    elections: z
      .array(
        z.strictObject({
          name: nonEmpty,
          electionDay: optionalText,
          ballotStyle: optionalText,
          partyContext: optionalText,
          contests: z.array(ballotLineSchema).default([]),
          questions: z.array(ballotLineSchema).default([]),
        }),
      )
      .min(1),
    officialSourceUrl: z.url().optional(),
  }),
});

export type CandidateRosterVars = PromptVars<typeof candidateRoster>;
