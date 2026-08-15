# Elite human reference corpus

This directory intentionally does **not** ship third-party copyrighted decks.

For serious evaluation, populate a private/local corpus with presentations you are legally allowed to use as references: your own decks, licensed examples, public-domain work, or decks supplied by the user for comparison.

Track metadata separately:

```json
{
  "id": "editorial-01",
  "path": "/secure/references/editorial-01.pptx",
  "provenance": "user-provided",
  "category": "editorial",
  "strengths": ["typography", "photography", "rhythm"],
  "allowed_for_training": false,
  "allowed_for_evaluation": true
}
```

Do not copy reference content, logos, or distinctive branded trade dress into generated work. The corpus exists to measure quality and learn high-level design principles, not to clone specific designers.
