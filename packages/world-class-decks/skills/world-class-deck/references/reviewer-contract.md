# Reviewer output contract

Return JSON only when a machine-readable review is requested:

```json
{
  "iteration": 1,
  "status": "changes-required",
  "deck_scores": {
    "visual_quality": 0,
    "story": 0,
    "specificity": 0,
    "consistency": 0
  },
  "findings": [
    {
      "slide": 4,
      "severity": "major",
      "category": "spacing",
      "description": "Chart touches the subtitle and loses hierarchy.",
      "fix": "Move chart down ~0.2in and shorten subtitle to one line."
    }
  ]
}
```

Allowed severity values: `blocker`, `major`, `minor`.

`status` is `approved` only when no blockers or majors remain.
