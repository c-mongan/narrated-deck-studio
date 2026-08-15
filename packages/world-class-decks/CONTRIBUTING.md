# Contributing

Keep the core boring and testable.

Before submitting changes:

```bash
ruff check .
python -m compileall src
pytest
```

For skill/prompt changes, also run the eval protocol in `docs/EVALS.md`.

Avoid adding rules solely because they improved one demo. Prefer a failing eval case plus the smallest general fix.
