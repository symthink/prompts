export interface PromptVariableIssue {
  /** Dot-separated path to the offending variable, e.g. `elections.0.name`. Empty for the root object. */
  path: string;
  message: string;
}

export class UnknownPromptError extends Error {
  readonly promptId: string;

  constructor(promptId: string) {
    super(`Unknown prompt id "${promptId}".`);
    this.name = 'UnknownPromptError';
    this.promptId = promptId;
  }
}

export class PromptVariablesError extends Error {
  readonly promptId: string;
  readonly issues: PromptVariableIssue[];

  constructor(promptId: string, issues: PromptVariableIssue[]) {
    const summary = issues
      .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
      .join('; ');
    super(`Invalid variables for prompt "${promptId}": ${summary}`);
    this.name = 'PromptVariablesError';
    this.promptId = promptId;
    this.issues = issues;
  }
}
