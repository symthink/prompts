import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

export const warSummary = definePrompt({
  id: 'in-app.war-summary',
  output: 'system_user',
  schema: z.strictObject({
    billTitlesContent: nonEmpty,
    legislatorName: nonEmpty,
    periodStart: nonEmpty,
    periodEnd: nonEmpty,
  }),
});

export type WarSummaryVars = PromptVars<typeof warSummary>;
