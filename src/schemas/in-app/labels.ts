import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

function escapeYamlDoubleQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export const labels = definePrompt({
  id: 'in-app.labels',
  output: 'system_user',
  schema: z.strictObject({
    items: z.array(z.strictObject({ id: nonEmpty, text: z.string() })).min(1),
  }),
  view: ({ items }) => ({
    yamlItems: items.map((item) => ({ id: item.id, yamlText: escapeYamlDoubleQuoted(item.text) })),
  }),
});

export type LabelsVars = PromptVars<typeof labels>;
