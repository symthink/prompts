Location: {{location}}
Districts:
{{#districts}}
- {{type}}: {{name}}
{{/districts}}
{{^districts}}
- (none)
{{/districts}}
{{#hasCivicElections}}

Upcoming elections from Google Civic (context only — official sample ballots remain the source of truth):
{{#civicElections}}
- {{name}}{{#electionDay}} ({{electionDay}}){{/electionDay}}
{{/civicElections}}
{{/hasCivicElections}}
