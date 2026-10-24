import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

export const singleLabel = definePrompt({
  id: 'in-app.single-label',
  output: 'system_user',
  schema: z.strictObject({ text: nonEmpty }),
});

export type SingleLabelVars = PromptVars<typeof singleLabel>;
