import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { civicJurisdictionShape, MAX_CIVIC_ELECTIONS, nonEmpty, optionalText } from '../shared.js';

export const sourceDiscovery = definePrompt({
  id: 'ballot.source-discovery',
  output: 'single',
  schema: z.strictObject({
    ...civicJurisdictionShape,
    savedContext: z
      .strictObject({
        reuseScope: nonEmpty,
        key: nonEmpty,
        precinct: optionalText,
        precinctSplit: optionalText,
        ballotStyle: optionalText,
        partyContext: optionalText,
        sourceAgency: optionalText,
        sourceUrl: z.url(),
      })
      .nullish(),
  }),
  view: ({ civicElections }) => ({
    civicElections: civicElections.slice(0, MAX_CIVIC_ELECTIONS),
  }),
});

export type SourceDiscoveryVars = PromptVars<typeof sourceDiscovery>;

const ballotSourceTypeSchema = z.enum([
  'personalized_sample_ballot_lookup',
  'sample_ballot_pdf',
  'election_information_page',
  'voter_guide',
  'unknown',
]);

const ballotSourceConfidenceSchema = z.enum(['high', 'medium', 'low']);

const ballotOfficialDomainStatusSchema = z.enum([
  'official_government_domain',
  'official_election_board_domain',
  'vendor_linked_from_official_source',
  'unverified',
]);

/** One ballot source row after `BallotSourceSchema.safeParse` in symthink-io. */
export const ballotSourceOutputSchema = z
  .object({
    url: z.string().url(),
    host: z.string().min(1),
    sourceAgency: z.string().min(1),
    sourceType: ballotSourceTypeSchema,
    confidence: ballotSourceConfidenceSchema,
    officialDomainStatus: ballotOfficialDomainStatusSchema,
    reason: z.string().min(1),
    requiresManualInfo: z.array(z.string()),
    privacyInstruction: z.string().min(1),
  })
  .passthrough();

/** Raw model JSON before per-source normalization. */
export const sourceDiscoveryOutputSchema = z
  .object({
    recommended: z.union([ballotSourceOutputSchema, z.null()]).optional(),
    alternates: z.array(ballotSourceOutputSchema).optional(),
    warnings: z.array(z.string()).optional(),
  })
  .passthrough();

export type BallotSourceOutput = z.infer<typeof ballotSourceOutputSchema>;
export type SourceDiscoveryOutput = z.infer<typeof sourceDiscoveryOutputSchema>;
