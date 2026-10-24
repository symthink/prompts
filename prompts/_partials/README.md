# Partials

Shared prose included by prompt templates with `{{> partial-name}}`. A partial sees the same variables as the prompt that includes it.

| Partial | Used for | Variables it reads |
|---------|----------|--------------------|
| `paste-back-contract` | Markup rules for fenced-markdown paste-back into Symthink | none |
| `paste-back-workflow` | The "Ready for paste-back" conversation workflow | none |
| `ballot-context` | Election / contest / ballot-question context lines | `electionName`, `electionDay?`, `contestTitle?`, `questionTitle?` |
| `civic-jurisdiction` | Voter location, districts, and Google Civic elections | `location`, `districts[]`, `civicElections[]` |

Partials are bundled only into the entrypoint (`external-chat` or `symthink-api`) whose prompts reference them.
