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
