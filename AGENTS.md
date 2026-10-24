# Agent guide — @symthink/prompts

This repository is the **source of truth for Symthink’s LLM prompt text**, shipped as Mustache templates with Zod-validated variables. Agents should treat **prompt prose** and **variable contracts** as the product; TypeScript is mostly wiring, generation, and tests.

## Read first

| Document | Use when |
|----------|----------|
| [README.md](README.md) | Package purpose, delivery types, npm API |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Adding/editing prompts, Mustache rules, fixtures, versioning |
| Domain READMEs under `prompts/<domain>/README.md` | Per-prompt variables and usage (tables are generated) |

## Repository map

```
prompts/<domain>/<slug>/     # meta.json + prompt.md OR system.md + user.md
prompts/_partials/           # Shared Mustache partials ({{> name}})
fixtures/                    # Public example vars → demo + snapshot tests
src/schemas/<domain>/        # Zod schemas (definePrompt)
src/external-chat/index.ts   # Registers delivery: external-chat
src/symthink-api/index.ts    # Registers delivery: symthink-api
src/render/                  # Renderer, normalization, errors
src/generated/               # GENERATED — run npm run generate
scripts/                     # Template embed + domain README index
test/                        # Vitest: meta, render, bundles, fixtures
demo/                        # Local interpolation UI (no model calls)
```

**Prompt id** is always `<domain>.<slug>` and must match folder names and schema `id`.

## Generated artifacts — do not hand-edit

These are produced by `npm run generate` (`scripts/build-templates.mjs`):

- `src/generated/*.ts`
- Embedded template strings consumed by `src/render/engine.ts`

After changing any `prompts/**/*.md` or `meta.json`, run `npm run generate` (or `npm test`, which runs it first).

## Delivery and registration

Each prompt’s `meta.json` sets `delivery`:

| `delivery` | Template output | Register in |
|------------|-----------------|-------------|
| `external-chat` | Usually `output: "single"` → `prompt.md` | `src/external-chat/index.ts` |
| `symthink-api` | Often `output: "system_user"` → `system.md` + `user.md` | `src/symthink-api/index.ts` |

Wrong entrypoint registration fails tests. `meta.json` `variables` must stay aligned with the Zod schema keys.

## Editing prompt wording

1. Edit `prompt.md` / `system.md` / `user.md` under `prompts/…` (and partials in `prompts/_partials/` if needed).
2. Update `meta.json` only when id, delivery, output, variables, or usage metadata change.
3. Run `npm run generate`.
4. Run `npm run test:update` if rendered output changed intentionally; review snapshot diffs.
5. Run `npm test` and `npm run typecheck`.

**Content standards** (from CONTRIBUTING): neutral, sourced, honest about uncertainty. Fixtures and snapshots are public — use fictional data only.

## Adding a new prompt

Follow the checklist in [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-prompt). In short:

1. `prompts/<domain>/<slug>/` + `meta.json` + template file(s).
2. `src/schemas/<domain>/<slug>.ts` with `definePrompt`.
3. Register in the correct `index.ts` and add a `render…` export.
4. `fixtures/<domain>.<slug>.json` (+ optional `--<variant>` fixtures).
5. `npm run docs:domain-index`, `npm run test:update`, `npm test`, `npm run typecheck`.

New domain: add `prompts/<domain>/README.md` with `prompt-index` markers and link from root README.

## Mustache and view helpers

- Prefer prose in templates; use schema `view()` only for formatting Mustache cannot do (JSON blobs, escaped YAML, numeric zero as string).
- Section tags on their own line when wrapping whole lines (see CONTRIBUTING).
- Derived flags: `has<ListName>` for non-empty lists; `<field>Is.<value>` for string equality — no custom code needed in templates.

## Verification commands

| Command | When |
|---------|------|
| `npm run generate` | After prompt/meta/partial changes |
| `npm test` | Before claiming work is done |
| `npm run test:update` | After intentional snapshot changes |
| `npm run typecheck` | After TypeScript changes |
| `npm run docs:domain-index` | After meta/usage changes (or use `:check` in CI via `npm test`) |
| `npm run demo` | Manually verify interpolation in the browser |

## Versioning (semver)

- Wording changes → **minor**
- New prompt id → **minor**
- Remove/rename id or make a variable required → **major** (deprecate first when possible)

## What not to do

- Do not commit `node_modules/`, `dist/`, or hand-edited `src/generated/`.
- Do not HTML-escape or change normalization behavior without explicit request and test updates.
- Do not put real PII in fixtures or snapshots.
