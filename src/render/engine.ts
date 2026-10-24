import Mustache from 'mustache';

import type { PromptDefinition, PromptResult, PromptVars, SystemUserPrompt } from './define.js';
import { PromptVariablesError, UnknownPromptError, type PromptVariableIssue } from './errors.js';
import { normalizePrompt } from './normalize.js';

export interface PromptTemplates {
  prompt?: string;
  system?: string;
  user?: string;
}

export interface TemplateBundle {
  templates: Record<string, PromptTemplates>;
  partials: Record<string, string>;
}

export type PromptDefinitions = Record<string, PromptDefinition>;

export type ValidationResult =
  | { ok: true; issues: [] }
  | { ok: false; issues: PromptVariableIssue[] };

// One writer per module: Mustache caches each parsed template and partial on first use,
// so every later render skips parsing.
const writer = new Mustache.Writer();

// Prompts are plain text; Mustache's default HTML escaping would corrupt quotes, `&`, and `<`.
const renderOptions = { escape: (value: unknown) => String(value) };

const FLAG_VALUE = /^[\w-]+$/;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Derived view keys available to every template:
 * - `has<Name>` is true when the top-level list `<name>` is non-empty;
 * - `<name>Is.<value>` is true when the top-level text variable `<name>` equals `<value>`.
 */
export function deriveViewFlags(vars: Record<string, unknown>): Record<string, unknown> {
  const flags: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (Array.isArray(value)) {
      flags[`has${capitalize(key)}`] = value.length > 0;
    } else if (typeof value === 'string' && FLAG_VALUE.test(value)) {
      flags[`${key}Is`] = { [value]: true };
    }
  }
  return flags;
}

function toIssues(error: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> }) {
  return error.issues.map((issue) => ({
    path: issue.path.map((part) => String(part)).join('.'),
    message: issue.message,
  }));
}

/** The object a template is rendered against: derived flags, then validated variables, then `view()` values. */
export function buildView(definition: PromptDefinition, data: Record<string, unknown>): Record<string, unknown> {
  return { ...deriveViewFlags(data), ...data, ...definition.view?.(data) };
}

export function renderTemplate(
  template: string,
  view: Record<string, unknown>,
  partials: Record<string, string>,
): string {
  return normalizePrompt(writer.render(template, view, partials, renderOptions));
}

export function createRenderer<D extends PromptDefinitions>(definitions: D, bundle: TemplateBundle) {
  function getDefinition(id: string): PromptDefinition {
    const definition = definitions[id];
    const templates = bundle.templates[id];
    if (!definition || !templates) {
      throw new UnknownPromptError(id);
    }
    return definition;
  }

  function templatePart(id: string, part: keyof PromptTemplates): string {
    const template = bundle.templates[id]?.[part];
    if (template == null) {
      throw new Error(`Prompt "${id}" is missing its ${part} template.`);
    }
    return template;
  }

  function validate<Id extends keyof D & string>(id: Id, vars: PromptVars<D[Id]>): ValidationResult {
    const result = getDefinition(id).schema.safeParse(vars);
    return result.success ? { ok: true, issues: [] } : { ok: false, issues: toIssues(result.error) };
  }

  function render<Id extends keyof D & string>(id: Id, vars: PromptVars<D[Id]>): PromptResult<D[Id]> {
    const definition = getDefinition(id);
    const parsed = definition.schema.safeParse(vars);
    if (!parsed.success) {
      throw new PromptVariablesError(id, toIssues(parsed.error));
    }

    const view = buildView(definition, parsed.data as Record<string, unknown>);

    if (definition.output === 'system_user') {
      const result: SystemUserPrompt = {
        system: renderTemplate(templatePart(id, 'system'), view, bundle.partials),
        user: renderTemplate(templatePart(id, 'user'), view, bundle.partials),
      };
      return result as PromptResult<D[Id]>;
    }

    return renderTemplate(templatePart(id, 'prompt'), view, bundle.partials) as PromptResult<D[Id]>;
  }

  return {
    render,
    validate,
    ids: Object.keys(definitions) as Array<keyof D & string>,
  };
}
