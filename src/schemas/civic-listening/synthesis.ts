import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';

export const synthesis = definePrompt({
  id: 'civic-listening.synthesis',
  output: 'system_user',
  schema: z.strictObject({
    tier: z.enum(['5_plus', '20_plus']),
    submissions: z
      .array(z.strictObject({ id: z.number().int(), body: z.string().min(1) }))
      .min(1),
  }),
  view: ({ submissions }) => ({
    submissionCount: submissions.length,
    submissionsJson: JSON.stringify(submissions),
  }),
});

export type SynthesisVars = PromptVars<typeof synthesis>;
