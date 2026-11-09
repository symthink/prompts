import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

export const singleLabel = definePrompt({
  id: 'in-app.single-label',
  output: 'system_user',
  schema: z.strictObject({ text: nonEmpty }),
});

export type SingleLabelVars = PromptVars<typeof singleLabel>;

/** Reference prompt — same JSON shape as legacy `getTextLabel`. */
export const singleLabelOutputSchema = z.object({ label: z.string() }).passthrough();

export type SingleLabelOutput = z.infer<typeof singleLabelOutputSchema>;
