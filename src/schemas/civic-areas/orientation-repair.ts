import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';

export const orientationRepair = definePrompt({
  id: 'civic-areas.orientation-repair',
  output: 'single',
  schema: z.strictObject({}),
});

export type OrientationRepairVars = PromptVars<typeof orientationRepair>;
