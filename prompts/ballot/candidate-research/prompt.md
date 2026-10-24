I'm researching my official election ballot and need source-backed help.

{{> ballot-context}}

Use only public, authoritative sources. Do not invent positions, endorsements, or ballot text.

Candidate I am researching:
{{candidateName}}

Please research this candidate in the context of this election and contest. Focus on public record, campaign website, official filings, endorsements, prior office experience, and notable public statements. Cite authoritative links and avoid partisan spin or invented positions.

{{#fecCandidateId}}
Federal Election Commission profile: https://www.fec.gov/data/candidate/{{fecCandidateId}}/

{{/fecCandidateId}}
{{> paste-back-contract}}

{{> paste-back-workflow}}

Flow-specific rules:
- Root bullet must be the current candidate below; nest all new points beneath it.

Until I send Ready for paste-back, do NOT output paste-back markdown.

When I send Ready for paste-back, your entire reply must be exactly one fenced markdown code block (opening fence line, bulleted tree, closing fence line). No other text before or after the fence.

Example structure (inside your paste-back fenced markdown block):
```markdown
- {{candidateName}}💡
  - Prior office: Served on the town council before this campaign.🕫
    - source: https://example.org/source
```

Reminder: Ready for paste-back → one fenced markdown code block only; no prose outside the fence.
