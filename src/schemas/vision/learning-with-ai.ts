import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { lines, nonEmpty } from '../shared.js';

export const learningWithAi = definePrompt({
  id: 'vision.learning-with-ai',
  output: 'single',
  schema: z.strictObject({
    situationPreface: z.string().nullish(),
    ancestorLines: lines,
    questionText: nonEmpty,
    childLines: lines,
  }),
});

export type LearningWithAiVars = PromptVars<typeof learningWithAi>;
