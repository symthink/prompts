import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

export const rephrase = definePrompt({
  id: 'in-app.rephrase',
  output: 'system_user',
  schema: z.strictObject({ text: nonEmpty }),
});

export type RephraseVars = PromptVars<typeof rephrase>;
