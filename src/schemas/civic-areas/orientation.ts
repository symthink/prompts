import { z } from 'zod';

import { definePrompt, type PromptVars } from '../../render/define.js';
import { nonEmpty } from '../shared.js';

const identifiers = z.record(z.string(), z.unknown());

export const orientation = definePrompt({
  id: 'civic-areas.orientation',
  output: 'single',
  schema: z.strictObject({
    boundary_group_id: nonEmpty,
    name: nonEmpty,
    authoring_scope_key: nonEmpty,
    representation_topology: z.enum([
      'coterminous_legislative_district',
      'single_representation_channel',
      'general_government_scope',
      'unspecified',
    ]),
    country: nonEmpty,
    state_or_equivalent: z.string().nullish(),
    level_display: nonEmpty,
    parent_areas: z.array(z.strictObject({ semantic_type: nonEmpty, name: nonEmpty })).nullish(),
    scope_identifiers: identifiers.nullish(),
    ladder_members: z.array(
      z.strictObject({
        semantic_type: nonEmpty,
        name: nonEmpty,
        civic_area_id: nonEmpty,
        identifiers: identifiers.nullish(),
      }),
    ),
    representation_channels: z
      .array(
        z.strictObject({
          representation_role: nonEmpty,
          chamber: z.string().nullish(),
          district_code: z.string().nullish(),
          seat_count: z.number().int().nonnegative(),
        }),
      )
      .nullish(),
    additional_context: z.string().nullish(),
  }),
  view: (vars) => ({
    topologyIs: { [vars.representation_topology]: true },
    stateOrEquivalentLabel: vars.state_or_equivalent ?? '(none)',
    hasParentAreas: (vars.parent_areas?.length ?? 0) > 0,
    scopeIdentifiersJson: vars.scope_identifiers ? JSON.stringify(vars.scope_identifiers) : undefined,
    ladderMembers: vars.ladder_members.map((member) => ({
      ...member,
      identifiersJson: member.identifiers ? JSON.stringify(member.identifiers) : undefined,
    })),
    hasRepresentationChannels: (vars.representation_channels?.length ?? 0) > 0,
    representationChannels: (vars.representation_channels ?? []).map((channel) => ({
      ...channel,
      chamberLabel: channel.chamber ?? 'n/a',
      districtCodeLabel: channel.district_code ?? 'n/a',
    })),
    additionalContext: vars.additional_context?.trim() || undefined,
  }),
});

export type OrientationVars = PromptVars<typeof orientation>;
