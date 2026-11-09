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

/** Match symthink-io `promptBlock` indentation dedent in ballot research builders. */
export function promptBlock(value: string): string {
  const withoutOuterNewlines = value.replace(/^\n/, '').replace(/\n\s*$/, '');
  const indents = withoutOuterNewlines.match(/^[ \t]*(?=\S)/gm) ?? [];
  const minIndent = indents.length ? Math.min(...indents.map((indent) => indent.length)) : 0;
  if (minIndent === 0) return withoutOuterNewlines;
  return withoutOuterNewlines
    .split('\n')
    .map((line) => (line.trim() ? line.slice(minIndent) : ''))
    .join('\n');
}

const CANDIDATE_VERIFY_EMPTY =
  '1. Identify the candidate names for this contest using the election, contest, ballot style, and election day context above. Use authoritative election sources such as the official sample ballot or election office candidate list before using campaign sites. Do not guess or use candidates from a different contest, district, party ballot, or election date. If you cannot verify the candidate list, omit the names.';

export function buildContestCandidateVerificationStep(candidates: string[]): string {
  if (!candidates.length) return CANDIDATE_VERIFY_EMPTY;
  return promptBlock(`
      1. Verified candidate names already listed under this contest in my imported ballot:
      ${candidates.map((name) => `   - ${name}`).join('\n')}
         Use these candidate names. Do not substitute, add, or guess other candidates for this contest unless an authoritative election source proves the imported ballot list is wrong for this exact election, party ballot, ballot style, and election date.
    `);
}
