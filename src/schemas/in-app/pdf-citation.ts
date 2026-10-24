import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

export const pdfCitation = definePrompt({
  id: 'in-app.pdf-citation',
  output: 'system_user',
  schema: z.strictObject({ pdfText: nonEmpty }),
});

export type PdfCitationVars = PromptVars<typeof pdfCitation>;
