# Neutrality standard for civic prompts

Symthink uses these prompts to help people learn about elections and government. They must not push a party, candidate, or ballot side. This document is the standard reviewers apply when someone changes civic or ballot wording.

## Scope

This standard applies to prompts and shared partials in:

- `prompts/ballot/`
- `prompts/civic-areas/`
- `prompts/civic-listening/`
- `prompts/vision/civic-level-research/`
- `prompts/_partials/ballot-context.md`
- `prompts/_partials/civic-jurisdiction.md`

Other domains should still be neutral, sourced, and honest (see [CONTRIBUTING.md](CONTRIBUTING.md)), but maintainers give these paths extra review.

## The standard

Prompt text and instructions should:

- Frame topics in non-partisan terms — no endorsement or opposition of candidates, measures, parties, or campaigns.
- Encourage balanced sourcing: official and primary sources first; when sources disagree, present multiple viewpoints fairly.
- Treat candidates in the same contest with equal depth and respect — not favoring one name, tone, or framing.
- Avoid loaded language, sarcasm, or rhetoric aimed at persuading the reader how to vote.
- State uncertainty openly when facts are incomplete, disputed, or time-bound.

Fixtures and examples must use fictional people and places, not real private individuals.

## What reviewers check

Before approving a PR that touches the scope above, the reviewer reads the rendered prompt (fixture or demo) and asks:

1. Could a reasonable reader infer that Symthink favors one side in a real contest?
2. Does the prompt ask the model to argue for one outcome over another?
3. Are sourcing instructions one-sided or dismissive of legitimate opposing views?
4. Would two candidates in the same race get unequal treatment if the prompt ran as written?

If any answer is yes, the change needs revision before merge.

## Disagreements

Discuss on the PR first. If neutrality is still unclear, the maintainer makes the call and records the reasoning in the PR thread. We prefer small, reversible wording changes over long debates.

## How changes reach users

The Symthink app pins an exact package version (`@symthink/prompts`). Edits here do not affect production until a maintainer bumps that pin and ships a release. That delay is intentional so civic wording is reviewed before it reaches users.

## Who reviews

**Thomas Ford** (project maintainer) reviews every PR that changes files in the scope listed above. Other contributors may review for clarity and tests, but merge on civic paths needs maintainer sign-off on neutrality.
