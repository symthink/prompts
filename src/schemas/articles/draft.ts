import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';

export const articleDraft = definePrompt({
  id: 'articles.draft',
  output: 'single',
  schema: z.strictObject({}),
});

export type ArticleDraftVars = PromptVars<typeof articleDraft>;
