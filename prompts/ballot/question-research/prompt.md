I'm researching my official election ballot and need source-backed help.

{{> ballot-context}}

Goal: find the official text of this ballot question and a neutral account of what a vote each way does. Do not invent ballot language. If you cannot verify the official text from an authoritative source, say so and omit claims you cannot cite.

Ballot question title from my imported ballot:
{{questionTitle}}

Steps:
1. Using the ballot context above, find the official measure that matches this title. Prefer the official sample ballot, election office, or enacted ordinance. Do not use a different election, district, or similarly named measure.
2. Provide the exact wording of the complete question and a source link to where you found it.
3. Find public arguments on the web in favor and against the measure. You can use blogs, videos, social media, and other sites, but do not make up sources.
4. Provide one steelman argument in favor and one against the measure.
5. Identify the key value trade-off in making a decision.

{{> paste-back-contract}}

{{> paste-back-workflow}}

Flow-specific rules:
- Root bullet must be the current question below; nest all new points beneath it.

Until I send Ready for paste-back, do NOT output paste-back markdown.

When I send Ready for paste-back, your entire reply must be exactly one fenced markdown code block (opening fence line, bulleted tree, closing fence line). No other text before or after the fence.

Example structure (inside your paste-back fenced markdown block):
```markdown
- Question: {{questionTitle}}❓
```

Example structure (inside your paste-back fenced markdown block):
```markdown
- Street safety: How can we make our neighborhood safer for people walking and biking❓
  - Reduce vehicle speeds: Slower traffic can reduce the risk and severity of collisions💡
    - Traffic calming: Speed cushions, narrower lanes, and raised crossings encourage drivers to slow down🕫
    - Measure speeding: Collect speed data to identify where speeding is most common💡
  - Improve intersections: Identify and address locations where pedestrians and cyclists face the greatest risks💡
    - Crash data: Review reported crashes to identify dangerous locations💡
    - Resident observations: Ask residents where they feel unsafe crossing streets💡
```

Reminder: Ready for paste-back → one fenced markdown code block only; no prose outside the fence.
