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
