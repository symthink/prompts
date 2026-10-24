import { z } from 'zod';

import type { PromptMeta } from './types.js';

export const promptMetaSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+$/, 'ids look like `domain.slug`'),
  domain: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  delivery: z.enum(['external-chat', 'symthink-api']),
  output: z.enum(['single', 'system_user']),
  variables: z.array(
    z.strictObject({
      name: z.string().min(1),
      type: z.string().min(1),
      required: z.boolean(),
      description: z.string().min(1),
    }),
  ),
  usage: z.strictObject({
    status: z.enum(['active', 'mirrored', 'experimental', 'deprecated', 'reference']),
    symthink: z.strictObject({
      wired: z.boolean(),
      surfaces: z.array(z.string().min(1)),
      sourceFiles: z.array(z.string().min(1)),
      docs: z.string().min(1).optional(),
    }),
    pasteBack: z.boolean(),
    notes: z.string().min(1).optional(),
  }),
}) satisfies z.ZodType<PromptMeta>;
