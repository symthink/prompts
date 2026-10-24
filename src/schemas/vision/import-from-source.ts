import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';

export const importFromSource = definePrompt({
  id: 'vision.import-from-source',
  output: 'single',
  schema: z.strictObject({
    articleUrl: z.url({ protocol: /^https?$/ }),
  }),
});

export type ImportFromSourceVars = PromptVars<typeof importFromSource>;
