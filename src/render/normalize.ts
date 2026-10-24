/**
 * Rendered prompts are normalized so template authors do not have to manage
 * whitespace around optional sections:
 * - trailing spaces and tabs are removed from every line;
 * - runs of blank lines collapse to a single blank line;
 * - leading and trailing blank lines are removed.
 */
export function normalizePrompt(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
}
