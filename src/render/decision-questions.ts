import { z } from 'zod';

/** TypeSafe System One question kinds. */
export type DecisionQuestionType = 'noul' | 'score' | 'choice';

export interface NoulQuestion {
  type: 'noul';
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export interface ScoreQuestion {
  type: 'score';
  instructions: string;
  criteria: string[];
}

export interface ChoiceQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
}

export type DecisionQuestion = NoulQuestion | ScoreQuestion | ChoiceQuestion;

/**
 * Rendered or programmatic payload for TypeSafe `POST /v1/systemone`.
 *
 * Template-rendered prompts produce a string `state`; Jev builders may pass structured objects.
 */
export interface DecisionPrompt {
  model?: string;
  state: string | Record<string, unknown>;
  questions: Record<string, DecisionQuestion>;
}

export interface NoulAnswer {
  type: 'noul';
  noul: number;
}

export interface ScoreAnswer {
  type: 'score';
  score: number;
  confidence: number;
  legend: Record<string, unknown>;
  probabilities: Record<string, number>;
}

export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export type DecisionAnswer = NoulAnswer | ScoreAnswer | ChoiceAnswer;

export interface SystemOneResponse {
  model: string;
  answers: Record<string, DecisionAnswer>;
  usage: { input_tokens: number | null; output_tokens: number | null };
}

const noulQuestionSchema = z.strictObject({
  type: z.literal('noul'),
  instructions: z.string(),
  criteria: z
    .strictObject({
      true: z.string().optional(),
      false: z.string().optional(),
    })
    .optional(),
});

const scoreQuestionSchema = z.strictObject({
  type: z.literal('score'),
  instructions: z.string(),
  criteria: z.array(z.string()).min(1).max(10),
});

const choiceQuestionSchema = z.strictObject({
  type: z.literal('choice'),
  instructions: z.string(),
  criteria: z.record(z.string(), z.string()),
});

export const decisionQuestionSchema = z.discriminatedUnion('type', [
  noulQuestionSchema,
  scoreQuestionSchema,
  choiceQuestionSchema,
]) satisfies z.ZodType<DecisionQuestion>;

/** Static `questions.json` keyed by question id. */
export const decisionQuestionsSpecSchema = z.record(z.string().min(1), decisionQuestionSchema);

export type DecisionQuestionsSpec = z.infer<typeof decisionQuestionsSpecSchema>;