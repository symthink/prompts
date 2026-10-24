import type { z } from 'zod';

export type PromptOutput = 'single' | 'system_user';

export interface SystemUserPrompt {
  system: string;
  user: string;
}

export interface PromptDefinition<
  S extends z.ZodType = z.ZodType,
  O extends PromptOutput = PromptOutput,
> {
  id: string;
  output: O;
  schema: S;
  /**
   * Adds computed values to the template view (e.g. JSON payloads or a root bullet).
   * Keep prose in the template; use this only for formatting that Mustache cannot express.
   */
  view?(vars: z.output<S>): Record<string, unknown>;
}

export function definePrompt<S extends z.ZodType, O extends PromptOutput>(
  definition: PromptDefinition<S, O>,
): PromptDefinition<S, O> {
  return definition;
}

export type PromptVars<D> = D extends PromptDefinition<infer S, PromptOutput> ? z.input<S> : never;

export type PromptResult<D> =
  D extends PromptDefinition<z.ZodType, infer O>
    ? O extends 'system_user'
      ? SystemUserPrompt
      : string
    : never;
