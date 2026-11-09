import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

export const pdfCitation = definePrompt({
  id: 'in-app.pdf-citation',
  output: 'system_user',
  schema: z.strictObject({ pdfText: nonEmpty }),
});

export type PdfCitationVars = PromptVars<typeof pdfCitation>;

const pdfAuthorNameSchema = z.union([
  z.object({ family: z.string(), given: z.string().optional() }).passthrough(),
  z.object({ literal: z.string() }).passthrough(),
]);

/** Mirrors symthink-io `PdfExtractedCitation` (fields optional when absent in the PDF). */
export const pdfCitationOutputSchema = z
  .object({
    title: z.string().optional(),
    author: z.array(pdfAuthorNameSchema).optional(),
    issued: z
      .object({
        'date-parts': z.array(z.array(z.number())),
      })
      .passthrough()
      .optional(),
    'container-title': z.string().optional(),
    publisher: z.string().optional(),
    note: z.string().optional(),
    DOI: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

export type PdfCitationOutput = z.infer<typeof pdfCitationOutputSchema>;
