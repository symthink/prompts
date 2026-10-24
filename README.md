# @symthink/prompts

The AI prompts behind [Symthink](https://symthink.io), published as plain Mustache templates with
typed, validated variables.

Every prompt is a readable `.md` file. Variables are filled in with
[Mustache](https://mustache.github.io/mustache.5.html), checked with [Zod](https://zod.dev) before
rendering, and returned as plain text with no HTML escaping. You can read the prompts on GitHub,
try them in the local demo, or import them from npm.

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

```bash
npm install @symthink/prompts
```

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

To list prompts and their usage metadata without loading any template text:

```ts
import { listPrompts, getPromptMeta } from '@symthink/prompts/registry';

listPrompts({ delivery: 'external-chat' }).map((meta) => meta.id);
getPromptMeta('ballot.source-discovery')?.usage.status;
```

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

## Moving this package to its own repository

This package is staged at `symthink-io/TEMP-symthink-prompts/` and is self-contained.

1. Copy the folder into a new repository, without `node_modules/`, `dist/`, or `src/generated/`.
2. Run `npm install && npm test && npm run build`.
3. Update `repository.url` in `package.json` if the repository name differs.
4. Publish with `npm publish --access public`. `prepublishOnly` runs the tests and the build first.

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
