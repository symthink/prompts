import type { z } from 'zod';

import {
  sourceDiscoveryOutputSchema,
  type SourceDiscoveryOutput,
  type BallotSourceOutput,
  ballotSourceOutputSchema,
} from '../schemas/ballot/source-discovery.js';
import {
  upcomingElectionsOutputSchema,
  type UpcomingElectionsOutput,
  type UpcomingElectionModelRow,
} from '../schemas/ballot/upcoming-elections.js';
import {
  orientationOutputSchema,
  type OrientationOutput,
} from '../schemas/civic-areas/orientation.js';
import {
  orientationRepairOutputSchema,
  type OrientationRepairOutput,
} from '../schemas/civic-areas/orientation-repair.js';
import {
  synthesisOutputSchema,
  type SynthesisOutput,
} from '../schemas/civic-listening/synthesis.js';
import { labelsOutputSchema, type LabelsOutput } from '../schemas/in-app/labels.js';
import { pdfCitationOutputSchema, type PdfCitationOutput } from '../schemas/in-app/pdf-citation.js';
import {
  rephraseOptionsOutputSchema,
  type RephraseOptionsOutput,
} from '../schemas/in-app/rephrase-options.js';
import { singleLabelOutputSchema, type SingleLabelOutput } from '../schemas/in-app/single-label.js';

/** JSON prompts with an exported output schema (keyed by prompt id). */
export const outputSchemasByPromptId = {
  'ballot.source-discovery': sourceDiscoveryOutputSchema,
  'ballot.upcoming-elections': upcomingElectionsOutputSchema,
  'civic-areas.orientation': orientationOutputSchema,
  'civic-areas.orientation-repair': orientationRepairOutputSchema,
  'civic-listening.synthesis': synthesisOutputSchema,
  'in-app.labels': labelsOutputSchema,
  'in-app.pdf-citation': pdfCitationOutputSchema,
  'in-app.rephrase-options': rephraseOptionsOutputSchema,
  'in-app.single-label': singleLabelOutputSchema,
} as const satisfies Record<string, z.ZodType>;

export type JsonPromptWithOutputSchema = keyof typeof outputSchemasByPromptId;

export type {
  BallotSourceOutput,
  LabelsOutput,
  OrientationOutput,
  OrientationRepairOutput,
  PdfCitationOutput,
  RephraseOptionsOutput,
  SingleLabelOutput,
  SourceDiscoveryOutput,
  SynthesisOutput,
  UpcomingElectionModelRow,
  UpcomingElectionsOutput,
};

export {
  ballotSourceOutputSchema,
  labelsOutputSchema,
  orientationOutputSchema,
  orientationRepairOutputSchema,
  pdfCitationOutputSchema,
  rephraseOptionsOutputSchema,
  singleLabelOutputSchema,
  sourceDiscoveryOutputSchema,
  synthesisOutputSchema,
  upcomingElectionsOutputSchema,
};
