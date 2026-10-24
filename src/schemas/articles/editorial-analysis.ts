import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

export const editorialAnalysis = definePrompt({
  id: 'articles.editorial-analysis',
  output: 'single',
  schema: z.strictObject({
    audience: z.enum(['author', 'subscriber']).default('author'),
    treeYaml: nonEmpty,
  }),
});

export type EditorialAnalysisVars = PromptVars<typeof editorialAnalysis>;
