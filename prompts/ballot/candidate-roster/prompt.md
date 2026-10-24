Goal: For each contest listed below, identify verified candidate names from authoritative election sources (official sample ballot, election office candidate list, or equivalent). Use the election name, election day, ballot style, and party ballot context when present so you do not mix different ballots or dates.

Copy each contest line below exactly in your paste-back (same spelling and punctuation). Do not shorten or reword contest titles.

Voting instructions and ballot-question titles were already captured from the sample ballot. Do not repeat Instructions lines or Choice lines in the paste-back. Do not add proposition body text.

Ballot questions already parsed from the sample ballot are listed by title only. Add any missing ballot questions you can verify from authoritative election sources, using the printed title only. If you cannot verify a question, omit it. Do not include Yes/No, For/Against, or other answer choices, and do not include the proposition text.

Do not include campaign websites, issue positions, or job responsibilities. Candidate names only.

If you cannot verify the candidate list for a contest, omit that contest entirely from your answer.

Contests and questions from the sample ballot parse:
{{#elections}}
Election: {{name}}
{{#electionDay}}
Election day: {{electionDay}}
{{/electionDay}}
{{#ballotStyle}}
Ballot style: {{ballotStyle}}
{{/ballotStyle}}
{{#partyContext}}
Party ballot: {{partyContext}}
{{/partyContext}}
{{#contests}}
{{displayText}}
{{#votingInstruction}}
Instructions: {{votingInstruction}}
{{/votingInstruction}}
{{/contests}}
{{#questions}}
{{displayText}}
{{#votingInstruction}}
Choice: {{votingInstruction}}
{{/votingInstruction}}
{{/questions}}

{{/elections}}
{{#officialSourceUrl}}
Official sample-ballot source: {{officialSourceUrl}}
{{/officialSourceUrl}}

Paste-back contract (strict):
- Reply with ONLY one fenced markdown code block — nothing before or after it.
- Contest roots have Candidate children. Question lines are siblings of contests, not nested under contests. No prose outside the fence.
- Example shape:
```markdown
- Contest: Governor
  - Candidate: Jane Doe
  - Candidate: Wes Moore
- Contest: State Senator District 19
  - Candidate: Alex Kim
- Question: Charter Amendment A
```
