import { z } from 'zod';

/**
 * Question kinds understood by AI SDK `experimental_decide` / TypeSafe Jev.
 *
 * - `boolean` — supported via TypeSafe today.
 * - `choice`, `score`, `box` — typed for future gateway mapping; not verified against production Jev yet.
 *
 * @experimental
 */
export type DecisionQuestionType =
  | 'boolean'
  /** @experimental Gateway mapping unconfirmed. */
  | 'choice'
  /** @experimental Gateway mapping unconfirmed. */
  | 'score'
  /** @experimental Gateway mapping unconfirmed. */
  | 'box';

/**
 * One decision question passed to `experimental_decide`.
 *
 * @experimental
 */
export interface DecisionQuestion {
  type: DecisionQuestionType;
  instructions: string;
  choices?: string[];
}

/**
 * Rendered decision prompt payload for `experimental_decide({ state, questions })`.
 *
 * @experimental
 */
export interface DecisionPrompt {
  state: string;
  questions: Record<string, DecisionQuestion>;
}

const decisionQuestionTypeSchema = z.enum(['boolean', 'choice', 'score', 'box']);

export const decisionQuestionSchema = z.strictObject({
  type: decisionQuestionTypeSchema,
  instructions: z.string(),
  choices: z.array(z.string()).optional(),
}) satisfies z.ZodType<DecisionQuestion>;

/** Static `questions.json` keyed by question id. */
export const decisionQuestionsSpecSchema = z.record(z.string().min(1), decisionQuestionSchema);

export type DecisionQuestionsSpec = z.infer<typeof decisionQuestionsSpecSchema>;
