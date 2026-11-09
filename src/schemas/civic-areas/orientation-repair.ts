import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { orientationOutputSchema, type OrientationOutput } from './orientation.js';

export const orientationRepair = definePrompt({
  id: 'civic-areas.orientation-repair',
  output: 'single',
  schema: z.strictObject({}),
});

export type OrientationRepairVars = PromptVars<typeof orientationRepair>;

export const orientationRepairOutputSchema = orientationOutputSchema;

export type OrientationRepairOutput = OrientationOutput;
