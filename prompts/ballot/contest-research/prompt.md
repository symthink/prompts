I'm researching my official election ballot and need source-backed help.

{{> ballot-context}}

Goal: through the series of steps below, produce a bulleted tree of candidates and sources for the given contest, instructions for how to vote, and job responsibilities. Do not make up any information. If not found, label the instructions as "not found".

Example of the bullet tree structure (using fictitious data):
```markdown
- Contest: Democratic Central Committee District 19
  - Instructions: Vote for up to 2 candidates
  - source: https://montgomerycountyelections.gov/candidate-list
  - Responsibilities: What are the job responsibilities for this office❓
    - Party governance: Help govern the Montgomery County Democratic Party organization at the legislative district level.🕫
    - Candidate support: Recruit, support, and organize Democratic candidates, volunteers, and voter outreach efforts.🕫
    - Vacancies: Fill certain party vacancies and participate in party governance, endorsements, and related duties.🕫
  - Candidate: Jane Doe
    - source: https://wordpress.com/jane-doe
  - Candidate: Roger Flat
    - source: https://rogerflat.org
  - Candidate: Henry Bestermont
    - source: https://wordpress.com/henrybestermont
    - source: https://github.com/henrybestermont
```

The actual contest I am researching: {{contestTitle}}
Use this root exactly: - Contest: {{contestTitle}}

Steps:
{{#hasContestCandidates}}
1. Verified candidate names already listed under this contest in my imported ballot:
{{#contestCandidates}}
   - {{.}}
{{/contestCandidates}}
   Use these candidate names. Do not substitute, add, or guess other candidates for this contest unless an authoritative election source proves the imported ballot list is wrong for this exact election, party ballot, ballot style, and election date.
{{/hasContestCandidates}}
{{^hasContestCandidates}}
1. Identify the candidate names for this contest using the election, contest, ballot style, and election day context above. Use authoritative election sources such as the official sample ballot or election office candidate list before using campaign sites. Do not guess or use candidates from a different contest, district, party ballot, or election date. If you cannot verify the candidate list, omit the names.
{{/hasContestCandidates}}
2. For each verified candidate name, use their name and the ballot context info to identify website(s) with their issue positions.
3. With the list of candidate websites found, identify the website with the highest probability of being an accurate and genuine representation of the candidate's positions. If you lack confidence in all results, omit the list of source urls. If there is more than one website with a high probability of being the candidate's official campaign website, then list them both.
4. Work through steps 1–3 and 5 in conversation. Build the bulleted tree as you go, but do not output fenced markdown until I send Ready for paste-back.
5. Identify the top 3 responsibilities of the position and include them under the contest root as shown in the example.

{{> paste-back-contract}}

{{> paste-back-workflow}}

Flow-specific rules:
- Root bullet must be the current contest below; nest all new points beneath it.

Until I send Ready for paste-back, do NOT output paste-back markdown.

When I send Ready for paste-back, your entire reply must be exactly one fenced markdown code block (opening fence line, bulleted tree, closing fence line). No other text before or after the fence.

Example structure (inside your paste-back fenced markdown block):
```markdown
- Contest: {{contestTitle}}
  - Candidate: Example Name
    - source: https://example.org/source
```

Reminder: Ready for paste-back → one fenced markdown code block only; no prose outside the fence.
