I'm exploring civic opportunities and challenges at a specific level of government in my community.

Jurisdiction context:
- Level: {{levelLabel}}
- Semantic type: {{semanticType}}
{{#jurisdiction}}
- Resolved place name: {{placeName}}
{{#districtNumber}}
- District number: {{districtNumber}}
{{/districtNumber}}
{{#stateCode}}
- State code: {{stateCode}}
{{/stateCode}}
{{/jurisdiction}}
{{^jurisdiction}}
- Jurisdiction: Data for this civic level is not available in my Symthink civic ladder. Do not invent place names.
{{/jurisdiction}}

Conversation workflow:

Phase 1 — Explore & shape (no paste-back):
1. Briefly explain what this level of government is responsible for in my jurisdiction (neutral, source-backed). Keep responsibilities in chat only — do not add a separate "Responsibility" node in paste-back unless I explicitly ask.
2. Offer 3–5 example opportunities or challenges plausibly relevant at this level. Present them as options to consider — not recommendations. Do not advocate for any position or party.
3. Shape the question set with me (iterative — stay in conversation as long as I want; do not output fenced paste-back markdown until Phase 2):
   - Ask what matters to me — e.g. "What do you care about? I'll help phrase your priorities as questions that match this level's responsibilities in your jurisdiction." I may answer in plain language, name topics, ask for a broad set, or request more options.
   - Draft questions in chat from my input; iterate on phrasing, add/remove/merge, until I send Ready for paste-back.
   - I may name zero, one, or several topics (e.g. "climate", "climate and education", or "broad across what we discussed").
   - If I have not named topics, offer a balanced draft question set across responsibilities and opportunities from steps 1–2 — I do not have to narrow to a single topic.
   - When I ask to rephrase, add, remove, or merge questions, update the draft list and confirm briefly.
   - Remind me I can send "Ready for paste-back" whenever the draft question set looks right.
   - Phase 2 paste-back will add Questions only under the civic-level root — no Ideas or Claims yet.

Phase 2 — Paste-back (only after I send exactly: Ready for paste-back):
Under the root only, add 3–7 child Questions (each line ends with ❓). No Idea (💡) or Claim (🕫) children — questions are leaves.
- Format each line: - {Topic label}: {Full question}❓ — label is the topic (e.g. "Climate change"), never the word "Focus".
- If I named topic(s): every question should relate to those topics; spread across them when there are several.
- If I asked for broad / never named topics: balance across responsibilities and opportunities from our discussion.
- Use the final draft question set from Phase 1 step 3 when we agreed on one; otherwise use your best balanced set from the conversation.
- Do not invent URLs; omit "- source:" lines unless I explicitly asked for citations on questions.

Current Question text:
{{questionText}}

{{> paste-back-contract}}

{{> paste-back-workflow}}

Flow-specific rules:
- Civic paste-back uses Questions only: every new tree-node bullet must end with ❓. Do not output 💡 or 🕫 nodes.
- Root bullet must be the current civic-level question below; nest only sibling Question children beneath it (no grandchildren).
- Topic scope comes from Phase 1 step 3: zero topics = broad balanced set; one or more topics = questions scoped to those topics.
- Use the question phrasing we refined in Phase 1 step 3 when available.

Until I send Ready for paste-back, do NOT output paste-back markdown.

When I send Ready for paste-back, your entire reply must be exactly one fenced markdown code block (opening fence line, bulleted tree, closing fence line). No other text before or after the fence.

Example structure (inside your paste-back fenced markdown block) — Questions only under root:
```markdown
- State: opportunities and challenges in Maryland❓
  - Climate accountability: How can Maryland strengthen legislative oversight of climate targets❓
  - Public participation: How can residents meaningfully evaluate state climate spending❓
  - Building emissions: How can state policy accelerate building efficiency without harming affordability❓
  - Climate resilience: How should the state prioritize funding for heat and flood risks❓
```

Example when multiple topics were requested (climate + education):
```markdown
- SLD Upper Chamber: What opportunities and challenges can be addressed in our district❓
  - Climate change: How can District 19 strengthen oversight of Maryland climate implementation❓
  - Climate participation: Who is excluded from climate policymaking that affects our district❓
  - Education funding: How do state formulas affect per-pupil funding in our communities❓
  - School preparedness: How are schools preparing for extreme heat and flood disruption❓
```

Use this root exactly: - {{rootBulletBody}}

Reminder: Ready for paste-back → one fenced markdown code block only; no prose outside the fence.
