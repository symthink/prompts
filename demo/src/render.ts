import * as externalChat from '../../src/external-chat/index.js';
import type { SystemUserPrompt } from '../../src/render/define.js';
import type { PromptVariableIssue } from '../../src/render/errors.js';
import type { PromptDelivery } from '../../src/registry/index.js';
import * as symthinkApi from '../../src/symthink-api/index.js';

type AnyRender = (id: string, vars: unknown) => string | SystemUserPrompt;

// The demo renders whatever id is selected, so it calls the same renderers as integrators
// but through an untyped signature.
const renderers: Record<PromptDelivery, AnyRender> = {
  'external-chat': externalChat.renderPrompt as AnyRender,
  'symthink-api': symthinkApi.renderPrompt as AnyRender,
};

export type RenderOutcome =
  | { kind: 'ok'; output: string | SystemUserPrompt }
  | { kind: 'json-error'; message: string }
  | { kind: 'invalid'; issues: PromptVariableIssue[] }
  | { kind: 'error'; message: string };

export function renderFromJson(delivery: PromptDelivery, id: string, json: string): RenderOutcome {
  let vars: unknown;
  try {
    vars = JSON.parse(json);
  } catch (error) {
    return { kind: 'json-error', message: (error as Error).message };
  }
  try {
    return { kind: 'ok', output: renderers[delivery](id, vars) };
  } catch (error) {
    if (error instanceof externalChat.PromptVariablesError) {
      return { kind: 'invalid', issues: error.issues };
    }
    return { kind: 'error', message: (error as Error).message };
  }
}
