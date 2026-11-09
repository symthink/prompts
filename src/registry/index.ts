import { promptRegistry } from '../generated/registry.js';
import type { PromptDelivery, PromptMeta } from './types.js';

export type {
  PromptCapability,
  PromptDelivery,
  PromptMeta,
  PromptOutputFormat,
  PromptUsage,
  PromptVariableMeta,
  UsageStatus,
} from './types.js';
export type {
  DecisionPrompt,
  DecisionQuestion,
  DecisionQuestionType,
  DecisionQuestionsSpec,
} from '../render/decision-questions.js';
export type { JsonPromptWithOutputSchema } from './output-schemas.js';
export { outputSchemasByPromptId } from './output-schemas.js';
export { promptRegistry };

export function getPromptMeta(id: string): PromptMeta | undefined {
  return promptRegistry.find((meta) => meta.id === id);
}

export function listPrompts(filter: { domain?: string; delivery?: PromptDelivery } = {}): PromptMeta[] {
  return promptRegistry.filter(
    (meta) =>
      (!filter.domain || meta.domain === filter.domain) &&
      (!filter.delivery || meta.delivery === filter.delivery),
  );
}

export function listDomains(): string[] {
  return [...new Set(promptRegistry.map((meta) => meta.domain))];
}
