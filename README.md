# @symthink/prompts

The AI prompts behind [Symthink](https://symthink.io), published as plain Mustache templates with
typed, validated variables.

Every prompt is a readable `.md` file. Variables are filled in with
[Mustache](https://mustache.github.io/mustache.5.html), checked with [Zod](https://zod.dev) before
rendering, and returned as plain text with no HTML escaping. You can read the prompts on GitHub,
try them in the local demo, or import them from npm.

**Wiring a Symthink consumer?** See [Integrating in the Symthink app](#integrating-in-the-symthink-app)
for entrypoints, every `render…` helper, variable types, version pinning, and a verification
checklist. That section is written for humans and for AI assistants in the main app repo.

## What's inside

Prompts are grouped by what they are for. Each domain folder has a README listing its prompts,
their variables, and how Symthink uses them today.

| Domain | What the prompts do |
|--------|---------------------|
| [`vision`](prompts/vision/README.md) | Learn, research, and import sources into a personal reasoning tree |
| [`ballot`](prompts/ballot/README.md) | Research a voter's ballot: elections, official sources, contests, candidates |
| [`articles`](prompts/articles/README.md) | Review a reasoning branch, then draft an evidence-aware article from it |
| [`civic-areas`](prompts/civic-areas/README.md) | Explain one civic geographic scope: powers, decision-makers, participation |
| [`civic-listening`](prompts/civic-listening/README.md) | Group anonymous community submissions into themes |
| [`in-app`](prompts/in-app/README.md) | Small in-app model calls: rephrase, labels, PDF citations, legislative summaries |
| [`_partials`](prompts/_partials/README.md) | Shared prose included by several prompts |

Each prompt lives in `prompts/<domain>/<slug>/` and has the id `<domain>.<slug>`, for example
`vision.learning-with-ai`.

## Two kinds of delivery

Every prompt's `meta.json` declares a `delivery`, which decides the npm entrypoint it ships in:

| `delivery` | Who sends the prompt | Import from |
|------------|----------------------|-------------|
| `external-chat` | A person copies it into the AI chat of their choice (ChatGPT, Claude, …). Many end with a paste-back contract so the reply can be imported into Symthink. | `@symthink/prompts/external-chat` |
| `symthink-api` | Symthink's server sends it to a model and parses the reply. These prompts usually return `{ system, user }`. | `@symthink/prompts/symthink-api` |

The two entrypoints are built separately, so a web or mobile app that imports `external-chat`
never bundles the server prompts, and the server never bundles the copy-paste prompts.

## Install

`@symthink/prompts` is published on [GitHub Packages](https://github.com/orgs/symthink/packages) (same registry as `@symthink/tree`). Point the `@symthink` scope at that registry, then install:

```bash
# once per machine or project (symthink-io already has this in .npmrc)
echo '@symthink:registry=https://npm.pkg.github.com' >> .npmrc

npm install @symthink/prompts@0.2.0
```

Authenticate with a GitHub token that has `read:packages` (for example `export NODE_AUTH_TOKEN="$(gh auth token)"` before `npm install`).

## Usage

```ts
import { renderLearningWithAi } from '@symthink/prompts/external-chat';

const prompt = renderLearningWithAi({
  ancestorLines: ['Budget: How should we fund transit❓'],
  questionText: 'Should we expand bus service❓',
  childLines: ['Ridership data: Weekday routes are at capacity💡'],
});
```

Server prompts with `output: "system_user"` return both messages:

```ts
import { renderCivicListeningSynthesis } from '@symthink/prompts/symthink-api';

const { system, user } = renderCivicListeningSynthesis({
  tier: '5_plus',
  submissions: [{ id: 1, body: 'The bus stops near the school need shelters.' }],
});
```

**Decision prompts** (experimental) render `{ state, questions }` for TypeSafe Jev /
`experimental_decide`. They use `output: "decision"` and `delivery: "symthink-api"` only. Types
(`DecisionPrompt`, `DecisionQuestion`, …) are exported from `@symthink/prompts/registry`; see
[CONTRIBUTING.md](./CONTRIBUTING.md#adding-a-decision-prompt). No production decision prompts ship
in this package yet—a test-only example lives under `test/decision-prompt-example/`.

In Deno, use an `npm:` specifier:

```ts
import { renderPdfCitation } from 'npm:@symthink/prompts@0.2.0/symthink-api';
```

You can also render by id, or validate variables before rendering:

```ts
import { renderPrompt, validatePromptVars, PromptVariablesError } from '@symthink/prompts/external-chat';

const check = validatePromptVars('vision.import-from-source', { articleUrl: 'not a url' });
// { ok: false, issues: [{ path: 'articleUrl', message: 'Invalid URL' }] }

try {
  renderPrompt('vision.import-from-source', { articleUrl: 'not a url' });
} catch (error) {
  if (error instanceof PromptVariablesError) console.log(error.issues);
}
```

### What ships on npm

The published tarball is intentionally small. It contains `dist/` (compiled JS and `.d.ts` files),
this README, `LICENSE`, and `NOTICE`. It does **not** include `prompts/**/*.md`, `fixtures/`,
`AGENTS.md`, or domain READMEs. Template text is embedded inside `dist/` at build time; at runtime
you only render through the API below.

Links in this README to `prompts/<domain>/…` point at the [GitHub source
repo](https://github.com/symthink/prompts). After `npm install`, use `getPromptMeta` (see
[Registry](#registry)) for variable names and types, or open the repo on GitHub to read template
prose.

## Integrating in the Symthink app

This section is for humans and for AI assistants wiring
[symthink-io](https://github.com/symthink/symthink-io) to render prompts from this package instead
of duplicated in-repo strings.

### Outcome

Each call site that today builds prompt text locally should:

1. Import the matching `render…` function (or `renderPrompt`) from the correct entrypoint.
2. Pass the same **variables** the old builder already computed (URLs, labels, JSON blobs, etc.).
3. Send the return value to the model API unchanged (`string`, or `{ system, user }` for
   `output: "system_user"`).
4. Delete the obsolete prompt constants, template literals, and any duplicate normalization—the
   package already validates variables, applies optional `view()` formatting, renders Mustache,
   and normalizes whitespace.

Do **not** copy template markdown into symthink-io. The product should depend on a released
`@symthink/prompts` version so prompt wording updates ride semver.

### Pick a prompt id

Match the product surface (UI path, API route, or job) to a prompt using `usage.symthink.surfaces` in
domain READMEs or registry metadata. If you are replacing duplicated in-repo prompt strings, compare
rendered output from this package to the legacy text for the same variables (see [Verify before
merging](#verify-before-merging)).

At runtime or in tooling, load metadata without rendering:

```ts
import { getPromptMeta, listPrompts } from '@symthink/prompts/registry';

const meta = getPromptMeta('ballot.candidate-research');
// meta.delivery → 'external-chat' | 'symthink-api'
// meta.output → 'single' | 'system_user' | 'decision'
// meta.outputFormat → 'paste-back-markdown' | 'json' | 'text' | 'decision'
// meta.requires → e.g. [] or ['web_search']
// meta.outputSchema → true when a Zod reply schema is exported (JSON prompts only)
// meta.variables → { name, type, required, description }[]
// meta.usage.symthink.surfaces → product entry points (routes, UI, jobs)
// meta.usage.symthink.wired → false until the app renders this id from the package
```

Prefer migrating prompts where `usage.status` is `mirrored` (canonical text lives here; symthink-io
still has a copy). Skip `reference` prompts unless you are deliberately adopting them. Check
`usage.notes` for `deprecated` replacements.

### Pick the import path

| `meta.delivery` | Import from | Typical consumer |
|-----------------|-------------|------------------|
| `external-chat` | `@symthink/prompts/external-chat` | Browser or mobile client (copy-paste / research flows) |
| `symthink-api` | `@symthink/prompts/symthink-api` | Server or edge worker (Deno `npm:` imports) |

Never import `symthink-api` prompts from the browser bundle (they are server prompts). The two
entrypoints are separate builds so tree-shaking keeps copy-paste prompts out of the server bundle
and vice versa.

### Render functions and variable types

Every prompt has a stable id `<domain>.<slug>`. The npm entrypoint exports:

| Export | Role |
|--------|------|
| `render<PromptName>(vars)` | Named helper; preferred at call sites |
| `renderPrompt(id, vars)` | Same render, keyed by string id |
| `validatePromptVars(id, vars)` | Zod check without rendering; returns `{ ok, issues }` |
| `<Name>Vars` | TypeScript input type for that prompt's variables |
| `externalChatPromptIds` / `symthinkApiPromptIds` | All ids in that entrypoint |
| `PromptVariablesError` | Thrown when `renderPrompt` receives invalid vars |
| `UnknownPromptError` | Thrown when `id` is not in that entrypoint |

Naming rule for helpers: `domain.slug` → `render` + PascalCase segments, e.g.
`ballot.candidate-research` → `renderBallotCandidateResearch`. Import the matching `…Vars` type
from the same module.

**`@symthink/prompts/external-chat`** (`output` is always `single` → `string`):

| Prompt id | Render helper | Vars type |
|-----------|---------------|-----------|
| `articles.draft` | `renderArticleDraft` | `ArticleDraftVars` |
| `articles.editorial-analysis` | `renderEditorialAnalysis` | `EditorialAnalysisVars` |
| `ballot.candidate-research` | `renderBallotCandidateResearch` | `CandidateResearchVars` |
| `ballot.candidate-roster` | `renderBallotCandidateRoster` | `CandidateRosterVars` |
| `ballot.contest-research` | `renderBallotContestResearch` | `ContestResearchVars` |
| `ballot.question-research` | `renderBallotQuestionResearch` | `QuestionResearchVars` |
| `vision.civic-level-research` | `renderCivicLevelResearch` | `CivicLevelResearchVars` |
| `vision.import-from-source` | `renderImportFromSource` | `ImportFromSourceVars` |
| `vision.learning-with-ai` | `renderLearningWithAi` | `LearningWithAiVars` |
| `vision.research` | `renderResearch` | `ResearchVars` |

**`@symthink/prompts/symthink-api`**:

| Prompt id | `output` | Render helper | Vars type |
|-----------|----------|---------------|-----------|
| `ballot.source-discovery` | `single` | `renderBallotSourceDiscovery` | `SourceDiscoveryVars` |
| `ballot.upcoming-elections` | `single` | `renderUpcomingElections` | `UpcomingElectionsVars` |
| `civic-areas.orientation` | `single` | `renderCivicAreaOrientation` | `OrientationVars` |
| `civic-areas.orientation-repair` | `single` | `renderCivicAreaOrientationRepair` | `OrientationRepairVars` |
| `civic-listening.synthesis` | `system_user` | `renderCivicListeningSynthesis` | `SynthesisVars` |
| `in-app.labels` | `system_user` | `renderLabels` | `LabelsVars` |
| `in-app.pdf-citation` | `system_user` | `renderPdfCitation` | `PdfCitationVars` |
| `in-app.rephrase` | `system_user` | `renderRephrase` | `RephraseVars` |
| `in-app.rephrase-options` | `system_user` | `renderRephraseOptions` | `RephraseOptionsVars` |
| `in-app.single-label` | `system_user` | `renderSingleLabel` | `SingleLabelVars` |
| `in-app.war-summary` | `system_user` | `renderWarSummary` | `WarSummaryVars` |

For `system_user` prompts, the return type is `SystemUserPrompt` (`{ system: string; user: string }`).
Wire `system` and `user` into your existing chat/completions helper the same way you already split
static system instructions from the dynamic user payload.

### Refactor pattern

Pin an exact package version in `package.json` (no semver range on `@symthink/prompts`) and in Deno
import maps (`npm:@symthink/prompts@X.Y.Z/<entrypoint>`). Bump the pin only when you intend prompt
wording to change in production.

```ts
// Before: local string assembly in the app
// export function buildBallotCandidateResearchPrompt(ctx) { return `...${ctx.name}...`; }

import {
  renderBallotCandidateResearch,
  type CandidateResearchVars,
} from '@symthink/prompts/external-chat';

export function buildBallotCandidateResearchPrompt(ctx: …): string {
  const vars: CandidateResearchVars = {
    electionName: ctx.electionName,
    electionDay: ctx.electionDay,
    contestTitle: ctx.contestTitle,
    candidateName: ctx.candidateName,
    fecCandidateId: ctx.fecCandidateId,
  };
  return renderBallotCandidateResearch(vars);
}
```

Keep context-gathering, truncation, and API calls in the consumer app. Move only the **wording** and
Mustache structure into this package. If the old builder applied extra formatting (JSON.stringify,
bullet lists, etc.), check whether the Zod schema's optional `view()` in this repo already encodes
that—duplicate formatting at the call site can double-encode or drift from snapshots.

Optional sections in templates use Mustache (`{{#field}}…{{/field}}`). Lists expose derived flags
such as `hasChildLines` and string equality flags such as `nodeTypeIs.question`; you do not pass
those—they are computed at render time from the variables you supply.

### Verify before merging

1. **Types**: Let TypeScript guide the variable object; required fields match `meta.variables` with
   `required: true`.
2. **Validation**: In tests or dev, `validatePromptVars(id, vars)` should return `{ ok: true }` for
   realistic fixtures.
3. **Output**: Compare rendered text to the previous in-repo prompt for the same vars (character-level
   diff). Normalization rules are fixed—see [Rendering rules](#rendering-rules).
4. **Bundle**: Ensure client code only imports `@symthink/prompts/external-chat`.

After the app ships wiring for a prompt, update this repo's `meta.json` (`usage.symthink.wired:
true`, `usage.status: active`) in a follow-up change here—not in the consumer repo.

### Registry

To list prompts and their usage metadata without loading any template text:

```ts
import { getPromptMeta, listDomains, listPrompts, promptRegistry } from '@symthink/prompts/registry';

listPrompts({ delivery: 'symthink-api', domain: 'in-app' });
listDomains();
promptRegistry.length; // same metadata as getPromptMeta for every id
getPromptMeta('ballot.source-discovery')?.usage.symthink.surfaces;
```

`@symthink/prompts/registry` has no render functions and no Mustache dependency weight from the
template bundles—safe for tooling, codegen, or admin UI that lists prompts.

### JSON output schemas

Prompts with `outputFormat: "json"` and `outputSchema: true` export Zod schemas for the model
reply alongside their variable schemas. Import them from `@symthink/prompts/symthink-api` (for
example `labelsOutputSchema`, `orientationOutputSchema`, and matching `…Output` types). Sample
replies live in `fixtures/<prompt-id>.output.json` for tests.

These schemas mirror what the Symthink app accepts today—they are documented here for future
`runPrompt()` work; symthink-io does not import them yet. This package uses **Zod 4**; edge
functions that still use Zod 3 should import output validators from this package rather than
mixing Zod instances.

### Rendering rules

- Output is plain text. Characters such as `"`, `&`, and `<` are never HTML-escaped.
- Whitespace is normalized after rendering: trailing spaces are removed, runs of blank lines are
  collapsed to one, and leading and trailing blank lines are trimmed.
- Templates are compiled once per process and cached. Rendering takes well under a millisecond,
  and templates are embedded in the JavaScript, so nothing is read from disk at runtime.

## Usage status

Each prompt's `meta.json` has a `usage` block saying whether and how Symthink uses it. The status
values are:

| Status | Meaning |
|--------|---------|
| `active` | Canonical here, and released Symthink renders it from this package. |
| `mirrored` | Copied here; Symthink still uses its own in-repo copy of the text. |
| `experimental` | Shipped here, but not yet in the product or only used in manual testing. |
| `deprecated` | Kept for semver compatibility; `usage.notes` names the replacement. |
| `reference` | Kept for others to reuse; Symthink does not call it. |

## Demo

The demo is a local page for trying interpolation. Pick a prompt, edit its example variables as
JSON, and see the rendered prompt update live. It never calls an AI model and needs no API keys.

```bash
npm install
npm run demo
```

Example variables live in [`fixtures/`](fixtures/). Each prompt has `fixtures/<id>.json`, and
alternate examples are named `fixtures/<id>--<variant>.json`. The same fixtures drive the snapshot
tests.

## Development

| Command | What it does |
|---------|--------------|
| `npm run demo` | Start the interpolation demo |
| `npm test` | Regenerate templates, check domain READMEs, run snapshot and schema tests |
| `npm run test:update` | Accept intended changes to rendered snapshots |
| `npm run typecheck` | Type-check the library, tests, and demo |
| `npm run build` | Build `dist/` (ESM, CommonJS, and type declarations) |
| `npm run docs:domain-index` | Regenerate the prompt tables in the domain READMEs |

See [CONTRIBUTING.md](CONTRIBUTING.md) for template conventions and how to add a prompt.
For AI assistants and Cursor agents **editing this repository**, see [AGENTS.md](AGENTS.md).
Consumers who only install from npm should use [Integrating in the Symthink app](#integrating-in-the-symthink-app) above.

## Publishing

Packages are published to GitHub Packages (`npm.pkg.github.com`), not the public npm registry.

1. Authenticate: `export NODE_AUTH_TOKEN="$(gh auth token)"` (token needs `write:packages` and `repo` for private repos).
2. From a clean working tree: `npm test && npm run build` (or rely on `prepublishOnly`).
3. First publish: `npm publish`.
4. Later releases: `npm run release` (uses [release-it](https://github.com/release-it/release-it) to bump semver, tag `v*`, create a GitHub release, and publish).

Follow [AGENTS.md](AGENTS.md) for semver: prompt wording changes are **minor**; breaking variable contracts are **major**.

## License

[Apache License 2.0](LICENSE). If you redistribute these prompts, modified or not, keep the
[NOTICE](NOTICE) file with them and mark any files you changed.
