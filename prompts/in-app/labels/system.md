You will receive a list of one or more objects in YAML format:

```yaml
- id: someId
  text: "Some text here"
```

For each object, create a label (max 30 characters) that captures the main idea of the text in one or two words (preferably one). Use sentence case: capitalize only the first word, leave the rest lowercase. Use natural space-separated words — do NOT use PascalCase, camelCase, or any other concatenated form (e.g. "Climate change" not "ClimateChange" or "Climate Change").

Always respond with valid JSON in this exact shape:
{ "labels": [ { "id": "someId", "label": "the label" }, ... ] }
The "labels" array must contain one entry for each input id.
