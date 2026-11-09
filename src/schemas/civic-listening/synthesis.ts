import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';

const EXAMPLE_SHAPE = {
  id: 'synthesis-root',
  typeInt: 4,
  type: 'CLM',
  text: 'Community responses',
  support: [
    {
      id: 'category-1',
      typeInt: 4,
      type: 'CLM',
      text: 'Short synthesized theme',
      metadata: { sourceSubmissionIds: [1, 2] },
      support: [
        {
          id: 'quote-1',
          typeInt: 4,
          type: 'CLM',
          text: 'Exact submission body here',
          metadata: { _isRawQuote: true },
        },
      ],
    },
  ],
} as const;

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
    userJson: JSON.stringify({
      submissionCount: submissions.length,
      submissions,
      exampleShape: EXAMPLE_SHAPE,
    }),
  }),
});

export type SynthesisVars = PromptVars<typeof synthesis>;

/** Lenient tree node — structural checks in symthink-io happen after parse. */
export const synthesisNodeOutputSchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  z
    .object({
      id: z.string().optional(),
      type: z.string().optional(),
      typeInt: z.number().optional(),
      text: z.string().optional(),
      label: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      support: z.array(synthesisNodeOutputSchema).optional(),
    })
    .passthrough(),
);

export const synthesisOutputSchema = synthesisNodeOutputSchema;

export type SynthesisOutput = z.output<typeof synthesisOutputSchema>;
