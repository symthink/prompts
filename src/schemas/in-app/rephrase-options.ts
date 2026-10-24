import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

export const rephraseOptions = definePrompt({
  id: 'in-app.rephrase-options',
  output: 'system_user',
  schema: z.strictObject({
    nodeType: z.enum(['question', 'claim', 'idea']),
    text: nonEmpty,
    maxChars: z.number().int().positive().default(280),
  }),
  view: ({ text }) => ({ textJson: JSON.stringify(text) }),
});

export type RephraseOptionsVars = PromptVars<typeof rephraseOptions>;
