const TRAILING_GLYPHS = ['❓', '💡', '🕫'] as const;

const GLYPH_TO_PUNCT: Record<(typeof TRAILING_GLYPHS)[number], string> = {
  '❓': '?',
  '💡': '.',
  '🕫': '.',
};

/** Replace trailing Symthink certainty glyphs with plain punctuation (Jev safety net, P19). */
export function stripSymthinkGlyphs(text: string): string {
  let result = text;
  for (const glyph of TRAILING_GLYPHS) {
    if (!result.endsWith(glyph)) continue;
    const body = result.slice(0, -glyph.length);
    if (/[.?!]$/.test(body)) {
      result = body;
    } else {
      result = body + GLYPH_TO_PUNCT[glyph];
    }
  }
  return result;
}