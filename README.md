# @symthink/prompts

The AI prompts behind [Symthink](https://symthink.io), published as plain Mustache templates with
typed, validated variables.

Every prompt is a readable `.md` file. Variables are filled in with
[Mustache](https://mustache.github.io/mustache.5.html), checked with [Zod](https://zod.dev) before
rendering, and returned as plain text with no HTML escaping. You can read the prompts on GitHub,
try them in the local demo, or import them from npm.

**Wiring symthink-io?** See [Integrating in the Symthink app](#integrating-in-the-symthink-app) for
entrypoints, every `render…` helper, variable types, and how to map legacy `sourceFiles` to prompt
ids. That section is written for AI assistants working in the main app repo.

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

npm install @symthink/prompts
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

In Deno, use an `npm:` specifier:

```ts
import { renderPdfCitation } from 'npm:@symthink/prompts@0.1/symthink-api';
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

### Find the prompt for a legacy call site

Use the [Provenance](#provenance) table: each row links a prompt id to symthink-io `sourceFiles`
(functions and modules that used to own the text). You can also search symthink-io for a distinctive
phrase from the old prompt, then match that file to a row in the table.

At runtime or in tooling, load metadata without rendering:

```ts
import { getPromptMeta, listPrompts } from '@symthink/prompts/registry';

const meta = getPromptMeta('ballot.candidate-research');
// meta.delivery → 'external-chat' | 'symthink-api'
// meta.output → 'single' | 'system_user'
// meta.variables → { name, type, required, description }[]
// meta.usage.symthink.sourceFiles → legacy symthink-io paths
// meta.usage.symthink.surfaces → product entry points (routes, UI, jobs)
// meta.usage.symthink.wired → false until symthink-io uses this package for that id
```

Prefer migrating prompts where `usage.status` is `mirrored` (canonical text lives here; symthink-io
still has a copy). Skip `reference` prompts unless you are deliberately adopting them. Check
`usage.notes` for `deprecated` replacements.

### Pick the import path

| `meta.delivery` | Import from | Typical symthink-io location |
|-----------------|-------------|------------------------------|
| `external-chat` | `@symthink/prompts/external-chat` | Vite app (`src/`), client-side research flows |
| `symthink-api` | `@symthink/prompts/symthink-api` | Supabase edge functions, Deno `npm:` imports |

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

### Refactor pattern (symthink-io)

```ts
// Before: local string assembly in symthink-io
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

Keep context-gathering, truncation, and API calls in symthink-io. Move only the **wording** and
Mustache structure into this package. If the old builder applied extra formatting (JSON.stringify,
bullet lists, etc.), check whether the Zod schema's optional `view()` in this repo already encodes
that—duplicate formatting in symthink-io can double-encode or drift from snapshots.

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

After symthink-io ships, update this repo's `meta.json` for that prompt (`usage.symthink.wired:
true`, `usage.status: active`) in a follow-up change here—not in the app repo.

### Registry

To list prompts and their usage metadata without loading any template text:

```ts
import { getPromptMeta, listDomains, listPrompts, promptRegistry } from '@symthink/prompts/registry';

listPrompts({ delivery: 'symthink-api', domain: 'in-app' });
listDomains();
promptRegistry.length; // same metadata as getPromptMeta for every id
getPromptMeta('ballot.source-discovery')?.usage.symthink.sourceFiles;
```

`@symthink/prompts/registry` has no render functions and no Mustache dependency weight from the
template bundles—safe for tooling, codegen, or admin UI that lists prompts.

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
| `npm run docs:domain-index` | Regenerate the prompt tables in the domain READMEs and the provenance table below |

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

## Provenance

Every prompt was copied from the Symthink app. The `sourceFiles` paths below point into the
symthink-io repository.

<!-- provenance:start (generated by `npm run docs:domain-index`; edit meta.json instead) -->

| Prompt | Status | Copied from (symthink-io) |
|--------|--------|---------------------------|
| [`articles.draft`](prompts/articles/README.md#draft) | `mirrored` | `symthink-io/src/prompts/articleDraft.ts`<br>`symthink-io/src/utils/articlePrompt.builder.ts (generateArticlePrompt)` |
| [`articles.editorial-analysis`](prompts/articles/README.md#editorial-analysis) | `mirrored` | `symthink-io/src/prompts/articleEditorialAnalysis.ts`<br>`symthink-io/src/utils/articlePrompt.builder.ts (generateArticlePrompt, serializeArticleBranch)` |
| [`ballot.candidate-research`](prompts/ballot/README.md#candidate-research) | `mirrored` | `symthink-io/src/utils/ballotAiResearchContext.helpers.ts (buildBallotCandidateResearchPrompt)` |
| [`ballot.candidate-roster`](prompts/ballot/README.md#candidate-roster) | `mirrored` | `symthink-io/src/utils/ballotCandidateRoster.helpers.ts (buildBallotCandidateRosterPrompt)` |
| [`ballot.contest-research`](prompts/ballot/README.md#contest-research) | `mirrored` | `symthink-io/src/utils/ballotAiResearchContext.helpers.ts (buildBallotContestResearchPrompt)` |
| [`ballot.question-research`](prompts/ballot/README.md#question-research) | `mirrored` | `symthink-io/src/utils/ballotAiResearchContext.helpers.ts (buildBallotQuestionResearchPrompt)` |
| [`ballot.source-discovery`](prompts/ballot/README.md#source-discovery) | `mirrored` | `symthink-io/supabase/functions/_shared/services/ballot-source-discovery.ts (buildDiscoveryPrompt)`<br>`symthink-io/supabase/functions/_shared/services/ballot-civic-context.ts (formatCivicJurisdictionPromptBlock)`<br>`symthink-io/supabase/functions/_shared/services/ballot-civic.service.ts (formatCivicElectionsForPrompt)` |
| [`ballot.upcoming-elections`](prompts/ballot/README.md#upcoming-elections) | `mirrored` | `symthink-io/supabase/functions/_shared/services/upcoming-elections-discovery.ts (buildUpcomingElectionsPrompt)` |
| [`civic-areas.orientation`](prompts/civic-areas/README.md#orientation) | `mirrored` | `symthink-io/supabase/functions/_shared/services/civic-area-orientation/prompt.ts (buildCivicAreaOrientationPrompt, PROMPT_VERSION civic-area-orientation-v3)` |
| [`civic-areas.orientation-repair`](prompts/civic-areas/README.md#orientation-repair) | `mirrored` | `symthink-io/supabase/functions/_shared/services/civic-area-orientation/prompt.ts (buildCivicAreaOrientationRepairPrompt)` |
| [`civic-listening.synthesis`](prompts/civic-listening/README.md#synthesis) | `mirrored` | `symthink-io/supabase/functions/_shared/civic-listening/synthesis-prompts.ts (buildPrompt)`<br>`symthink-io/supabase/functions/_shared/civic-listening/run-synthesis.ts` |
| [`in-app.labels`](prompts/in-app/README.md#labels) | `mirrored` | `symthink-io/supabase/functions/_shared/ai/capabilities/labels.ts (MULTI_LABEL_SYSTEM_PROMPT, makeLabelsInline)` |
| [`in-app.pdf-citation`](prompts/in-app/README.md#pdf-citation) | `mirrored` | `symthink-io/supabase/functions/_shared/ai/capabilities/pdf-citation.ts (PDF_CITATION_SYSTEM_PROMPT)`<br>`symthink-io/supabase/functions/_shared/pdf-citation-resolver.ts` |
| [`in-app.rephrase`](prompts/in-app/README.md#rephrase) | `reference` | `symthink-io/supabase/functions/_shared/ai/capabilities/rephrase.ts (REPHRASE_TEXT_SYSTEM_PROMPT, getRephrasing)` |
| [`in-app.rephrase-options`](prompts/in-app/README.md#rephrase-options) | `mirrored` | `symthink-io/supabase/functions/_shared/ai/capabilities/rephrase.ts (buildRephraseSystemPrompt, getRephraseOptions)` |
| [`in-app.single-label`](prompts/in-app/README.md#single-label) | `reference` | `symthink-io/supabase/functions/_shared/ai/capabilities/labels.ts (SINGLE_LABEL_SYSTEM_PROMPT, getTextLabel)` |
| [`in-app.war-summary`](prompts/in-app/README.md#war-summary) | `mirrored` | `symthink-io/supabase/functions/_shared/ai/prompts/war.ts (WAR_SYSTEM_PROMPT)`<br>`symthink-io/supabase/functions/_shared/ai/capabilities/war-summary.ts (generateWarSummary)` |
| [`vision.civic-level-research`](prompts/vision/README.md#civic-level-research) | `mirrored` | `symthink-io/src/utils/civicLevelAiResearchContext.helpers.ts (buildCivicLevelResearchPrompt)` |
| [`vision.import-from-source`](prompts/vision/README.md#import-from-source) | `mirrored` | `symthink-io/src/prompts/importFromArticle.ts`<br>`symthink-io/src/utils/importFromArticlePrompt.builder.ts`<br>`symthink-io/src/utils/pasteBackContract.helpers.ts` |
| [`vision.learning-with-ai`](prompts/vision/README.md#learning-with-ai) | `mirrored` | `symthink-io/src/prompts/learningWithAi.ts`<br>`symthink-io/src/utils/learningWithAiPrompt.builder.ts` |
| [`vision.research`](prompts/vision/README.md#research) | `mirrored` | `symthink-io/src/utils/ai.store.ts (buildResearchPrompt, assembleResearchPromptBody)`<br>`symthink-io/src/utils/pasteBackContract.helpers.ts` |

<!-- provenance:end -->

## License

[Apache License 2.0](LICENSE). If you redistribute these prompts, modified or not, keep the
[NOTICE](NOTICE) file with them and mark any files you changed.
