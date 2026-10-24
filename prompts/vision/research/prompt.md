I'm working on a structured knowledge tree and need research help.

{{#hasAncestorLines}}
Context (ancestor nodes):
{{#ancestorLines}}
{{.}}
{{/ancestorLines}}

{{/hasAncestorLines}}
{{> paste-back-contract}}

{{> paste-back-workflow}}

- Root bullet must be the current {{typeLabel}} below; nest all new points beneath it.

Until I send Ready for paste-back, do NOT output paste-back markdown.

{{#nodeTypeIs.question}}
Question I'm exploring:
{{/nodeTypeIs.question}}
{{#nodeTypeIs.idea}}
Idea I'm developing:
{{/nodeTypeIs.idea}}
{{#nodeTypeIs.claim}}
Claim I'm building:
{{/nodeTypeIs.claim}}
{{currentText}}

{{#hasChildLines}}
{{#nodeTypeIs.question}}
I've already noted these ideas:
{{/nodeTypeIs.question}}
{{^nodeTypeIs.question}}
I've already noted these supporting points:
{{/nodeTypeIs.question}}
{{#childLines}}
- {{.}}
{{/childLines}}

{{/hasChildLines}}
{{#nodeTypeIs.question}}
Let's explore this question together and brainstorm ideas and/or other perspectives to consider.
{{/nodeTypeIs.question}}
{{#nodeTypeIs.idea}}
Let's develop this idea together. Please help me find links to examples of this idea in action.
{{/nodeTypeIs.idea}}
{{#nodeTypeIs.claim}}
Please steelman this argument first, then help me build a logical argument with examples and links to authoritative sources backing any claims.
{{/nodeTypeIs.claim}}

When I send Ready for paste-back, your entire reply must be exactly one fenced markdown code block (opening fence line, bulleted tree, closing fence line). No other text before or after the fence.

Example structure (inside your paste-back fenced markdown block) — hierarchy (Question → Idea → Claim):
```markdown
- {{rootBullet}}
  - Electric vehicles: Encourage adoption of electric vehicles💡
    - Air pollution: Cities with higher EV adoption show measurable reductions in air pollutants🕫
      - source: https://keck.usc.edu/news/adoption-of-electric-vehicles-tied-to-real-world-reductions-in-air-pollution-study-finds
      - source: https://link.springer.com/chapter/10.1007/978-3-032-05711-2_10
```

Example structure (inside your paste-back fenced markdown block) — list of ideas under the same root:
```markdown
- {{rootBullet}}
  - Bike lanes: Build more bike lanes to reduce traffic congestion 💡
  - Remote work: Expand remote work options to decrease commuting 💡
  - Public transit: Improve public transit frequency during peak hours 💡
```

Reminder: Ready for paste-back → one fenced markdown code block only; no prose outside the fence.
