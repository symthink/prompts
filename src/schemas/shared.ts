import { z } from 'zod';

export const SYM_QUESTION = '❓';
export const SYM_IDEA = '💡';
export const SYM_CLAIM = '🕫';

export const nonEmpty = z.string().trim().min(1);
export const optionalText = z.string().trim().min(1).optional();
export const lines = z.array(z.string()).default([]);

export const districtSchema = z.strictObject({
  type: nonEmpty,
  name: nonEmpty,
});

export const civicElectionSchema = z.strictObject({
  name: nonEmpty,
  electionDay: z.string().nullish(),
});

/** Variables read by the `civic-jurisdiction` partial. */
export const civicJurisdictionShape = {
  location: nonEmpty,
  districts: z.array(districtSchema).default([]),
  civicElections: z.array(civicElectionSchema).default([]),
};

export const MAX_CIVIC_ELECTIONS = 6;
