import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { lines, nonEmpty, SYM_CLAIM, SYM_IDEA, SYM_QUESTION } from '../shared.js';

const TYPE_LABEL = { question: 'Question', idea: 'Idea', claim: 'Claim' } as const;
const TYPE_MARKER = { question: SYM_QUESTION, idea: SYM_IDEA, claim: SYM_CLAIM } as const;
const MARKERS = [SYM_QUESTION, SYM_IDEA, SYM_CLAIM];

export const research = definePrompt({
  id: 'vision.research',
  output: 'single',
  schema: z.strictObject({
    nodeType: z.enum(['question', 'idea', 'claim']),
    ancestorLines: lines,
    currentText: nonEmpty,
    childLines: lines,
  }),
  view: ({ nodeType, currentText }) => {
    const hasMarker = MARKERS.some((marker) => currentText.endsWith(marker));
    return {
      typeLabel: TYPE_LABEL[nodeType],
      rootBullet: hasMarker ? currentText : `${currentText}${TYPE_MARKER[nodeType]}`,
    };
  },
});

export type ResearchVars = PromptVars<typeof research>;
