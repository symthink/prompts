export type PromptDelivery = 'external-chat' | 'symthink-api';

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
    /** Symthink files the prompt text came from or is assembled in. */
    sourceFiles: string[];
    docs?: string;
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
  output: 'single' | 'system_user';
  variables: PromptVariableMeta[];
  usage: PromptUsage;
}
