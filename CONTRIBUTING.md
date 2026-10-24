# Contributing

Thanks for helping improve these prompts. Wording changes are welcome, as long as they keep a
prompt neutral, sourced, and honest about uncertainty.

By submitting a contribution, you agree that it is licensed under the
[Apache License 2.0](LICENSE), the same licence as the rest of the project.

## Layout of a prompt

```
prompts/<domain>/<slug>/
  meta.json      # id, title, description, delivery, output, variables, usage
  prompt.md      # when output is "single"
  system.md      # when output is "system_user"
  user.md        #   (both files required)
src/schemas/<domain>/<slug>.ts   # Zod schema for the variables, plus optional view values
fixtures/<domain>.<slug>.json    # example variables for the demo and the snapshot tests
```

The id is always `<domain>.<slug>` and must match the folder names.

## Adding a prompt

1. Create `prompts/<domain>/<slug>/` with `meta.json` and the template file(s). Copy a nearby
   prompt's `meta.json` as a starting point.
2. Choose `delivery`:
   - `external-chat` if a person copies the prompt into their own AI chat;
   - `symthink-api` if a server sends it to a model.
3. Write the schema in `src/schemas/<domain>/<slug>.ts` with `definePrompt`, and register it in
   `src/external-chat/index.ts` or `src/symthink-api/index.ts` to match `delivery`. Add a named
   `render…` function next to the others.
4. Add `fixtures/<domain>.<slug>.json`. Add `fixtures/<domain>.<slug>--<variant>.json` for branches
   worth seeing, such as optional sections left out.
5. Run `npm run docs:domain-index`, `npm run test:update`, and review the new snapshot.
6. Run `npm test` and `npm run typecheck`.

The tests fail if `meta.json` variables and the schema keys disagree, if a prompt is registered in
the wrong entrypoint, or if a domain README is out of date.

New domain? Add `prompts/<domain>/README.md` (copy an existing one, keeping the
`prompt-index` markers) and link it from the root README.

## Template conventions

Templates use [Mustache](https://mustache.github.io/mustache.5.html):

| Need | Write |
|------|-------|
| A value | `{{questionText}}` |
| An optional section | `{{#electionDay}}Election day: {{electionDay}}{{/electionDay}}` |
| A list of strings | `{{#childLines}}- {{.}}{{/childLines}}` (one item per line when tags are on their own lines) |
| A list of objects | `{{#districts}}- {{type}}: {{name}}{{/districts}}` |
| Text when something is missing | `{{^districts}}- (none){{/districts}}` |
| Shared prose | `{{> paste-back-contract}}` (file in `prompts/_partials/`) |

Every prompt also gets these derived values, so templates do not need custom code for them:

| Derived value | True when |
|---------------|-----------|
| `has<Name>` | The top-level list `<name>` is non-empty, e.g. `{{#hasChildLines}}…{{/hasChildLines}}` wraps a heading plus the list. |
| `<name>Is.<value>` | The top-level text variable `<name>` equals `<value>`, e.g. `{{#nodeTypeIs.question}}…{{/nodeTypeIs.question}}`. |

Put a section tag (`{{#…}}`, `{{/…}}`, `{{^…}}`) on its own line when it wraps whole lines. Mustache
then removes the tag's line, so no blank line is left behind.

Keep prose in templates. Use a schema's `view` function only for values Mustache cannot produce,
such as a JSON-encoded payload, an escaped YAML string, or a label with a fallback. Mustache treats
`0` and `""` as missing in sections, so convert numbers that can be zero to strings in `view`.

## How output is cleaned up

After rendering, every prompt is normalized the same way:

- `\r\n` becomes `\n`;
- trailing spaces and tabs are removed from each line;
- three or more newlines collapse to one blank line;
- leading and trailing blank lines are removed.

Values are never HTML-escaped, so quotes, `&`, `<`, and emoji pass through unchanged.

## Usage metadata

`meta.json` → `usage` records whether and how Symthink uses the prompt. Update it whenever that
changes; the domain README tables are generated from it.

| Field | Meaning |
|-------|---------|
| `status` | `active`, `mirrored`, `experimental`, `deprecated`, or `reference` (below) |
| `symthink.wired` | `true` once Symthink renders this prompt from this package |
| `symthink.surfaces` | Where Symthink uses it: UI paths, API routes, or jobs |
| `symthink.sourceFiles` | symthink-io files the text came from or is assembled in |
| `symthink.docs` | Optional symthink-io doc describing the feature |
| `pasteBack` | `true` when the AI's reply is imported back into a Symthink tree |
| `notes` | Optional: known differences from the source, caveats, replacements |

| Status | Meaning |
|--------|---------|
| `active` | Canonical here, and released Symthink renders it from this package. |
| `mirrored` | Copied here; Symthink still uses its own in-repo copy of the text. |
| `experimental` | Shipped here, but not yet in the product or only used in manual testing. |
| `deprecated` | Kept for semver compatibility; `notes` names the replacement prompt. |
| `reference` | Kept for others to reuse; Symthink does not call it. |

## Privacy

Fixtures and snapshots are public. Use invented names, places, and submissions. Never paste real
user content, email addresses, or anything that identifies a person.

## Versioning

Changing prompt wording is a minor release. Renaming or removing a prompt id, or making a variable
required, is a major release. Deprecate first (`status: "deprecated"`) when you can.
