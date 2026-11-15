import { describe, expect, it } from 'vitest';

import { buildCertaintyRequest } from '../src/jev/index.js';

describe('buildCertaintyRequest glyph strip', () => {
  it('strips trailing glyphs before sending to Jev', () => {
    const { state } = buildCertaintyRequest('Later buses might help💡');
    expect(state).toEqual({ statement: 'Later buses might help.' });
  });
});