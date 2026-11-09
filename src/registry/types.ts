export type PromptDelivery = 'external-chat' | 'symthink-api';

/** How the consuming app expects to interpret the model reply (or decision payload). */
export type PromptOutputFormat = 'paste-back-markdown' | 'json' | 'text' | 'decision';

/** Model or tool capabilities the prompt needs (extensible enum). */
export type PromptCapability = 'web_search';

export type UsageStatus = 'active' | 'mirrored' | 'experimental' | 'deprecated' | 'reference';

export interface PromptVariableMeta {
  name: string;
  /** Human-readable type, e.g. `string`, `string[]`, `"author" | "subscriber"`. */
  type: string;
  required: boolean;
  description: string;
}

export interface PromptUsage {
  status: UsageStatus;
  symthink: {
    /** True when the Symthink app renders this prompt from this package. */
    wired: boolean;
    /** Where Symthink uses the prompt today: UI entry points, API routes, or jobs. */
    surfaces: string[];
  };
  /** True when the AI's reply is pasted back into a Symthink tree. */
  pasteBack: boolean;
  notes?: string;
}

export interface PromptMeta {
  id: string;
  domain: string;
  title: string;
  description: string;
  delivery: PromptDelivery;
  output: 'single' | 'system_user' | 'decision';
  outputFormat: PromptOutputFormat;
  /** Tooling the model needs; empty when the prompt is self-contained. */
  requires: PromptCapability[];
  /** True when this package exports a Zod output schema for `outputFormat: "json"`. */
  outputSchema?: boolean;
  variables: PromptVariableMeta[];
  usage: PromptUsage;
}
