import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

const SCHEME_LABELS = {
  consequences: 'argument from consequences',
  expert_opinion: "argument from an expert's opinion",
} as const;

export const MAX_COMMENT_ITEMS = 2;
export const MAX_COMMENT_ITEM_CHARS = 280;

export const criticalQuestionCommentVars = z.strictObject({
  question: nonEmpty,
  subjectKind: z.enum(['idea', 'claim']),
  subject: nonEmpty,
  support: z.array(nonEmpty).min(1),
  scheme: z.enum(['consequences', 'expert_opinion']),
  checks: z
    .array(
      z.strictObject({
        key: nonEmpty,
        question: nonEmpty,
        kind: z.enum(['burden', 'rebuttal']),
      }),
    )
    .min(1)
    .max(MAX_COMMENT_ITEMS),
});

export const criticalQuestionComment = definePrompt({
  id: 'in-app.critical-question-comment',
  output: 'system_user',
  schema: criticalQuestionCommentVars,
  view: ({ subjectKind, support, scheme }) => ({
    subjectLabel: subjectKind === 'claim' ? 'Claim' : 'Idea',
    supportNumbered: support.map((text, index) => ({ n: index + 1, text })),
    schemeLabel: SCHEME_LABELS[scheme],
  }),
});

export type CriticalQuestionCommentVars = PromptVars<typeof criticalQuestionComment>;

/** What the model returns: one or two questions or prompts for the author, each at most 280 characters. */
export const criticalQuestionCommentOutputSchema = z.strictObject({
  items: z.array(z.string().trim().min(1).max(MAX_COMMENT_ITEM_CHARS)).min(1).max(MAX_COMMENT_ITEMS),
});

export type CriticalQuestionCommentOutput = z.infer<typeof criticalQuestionCommentOutputSchema>;
