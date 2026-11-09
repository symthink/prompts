import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { civicJurisdictionShape, MAX_CIVIC_ELECTIONS, nonEmpty, optionalText } from '../shared.js';

export const upcomingElections = definePrompt({
  id: 'ballot.upcoming-elections',
  output: 'single',
  schema: z.strictObject({
    ...civicJurisdictionShape,
    state: optionalText,
    todayIso: z.iso.date(),
    todayLabel: nonEmpty,
    topElectionCount: z.number().int().positive().default(3),
  }),
  view: ({ civicElections, state }) => ({
    civicElections: civicElections.slice(0, MAX_CIVIC_ELECTIONS),
    stateLabel: state ?? "the voter's state",
  }),
});

export type UpcomingElectionsVars = PromptVars<typeof upcomingElections>;

const upcomingElectionKindSchema = z.enum([
  'primary',
  'general',
  'midterm',
  'presidential',
  'special',
  'local',
  'other',
]);

const upcomingElectionDatePrecisionSchema = z.enum(['day', 'month']);

const upcomingElectionConfidenceSchema = z.enum(['high', 'medium', 'low']);

const upcomingElectionModelRowSchema = z
  .object({
    name: z.string().min(1),
    electionDay: z.string().nullable(),
    datePrecision: upcomingElectionDatePrecisionSchema,
    scheduledLabel: z.string().min(1).optional(),
    kind: upcomingElectionKindSchema,
    confidence: upcomingElectionConfidenceSchema,
    sourceUrl: z.string().url().optional(),
    summary: z.string().optional(),
  })
  .passthrough();

/** Raw model JSON before row-level `UpcomingElectionModelRowSchema` checks. */
export const upcomingElectionsOutputSchema = z
  .object({
    elections: z.array(upcomingElectionModelRowSchema).optional(),
    warnings: z.array(z.string()).optional(),
  })
  .passthrough();

export type UpcomingElectionModelRow = z.infer<typeof upcomingElectionModelRowSchema>;
export type UpcomingElectionsOutput = z.infer<typeof upcomingElectionsOutputSchema>;
