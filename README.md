# World Class Decks

An agent-native production system for **excellent, editable PowerPoint decks without AI slop**.

The repo is intentionally not another one-shot “prompt → .pptx” generator. It separates deck creation into explicit creative and QA stages:

`brief → story → copy → art direction → assets → build → deterministic lint → render → independent visual review → repair → eval`

## Why this exists

LLMs are good at producing slide-shaped text. They are much less reliable at producing a coherent story, disciplined typography, non-generic art direction, accurate layout, and a final `.pptx` that survives rendering. This repo treats a deck like a software artifact: structured inputs, deterministic checks, rendered-output inspection, independent review, and repeatable evals.

## What is included

- `skills/world-class-deck/SKILL.md` — portable Agent Skill for Codex/Hermes-style runtimes.
- `src/world_class_decks/` — small Python CLI and production QA core.
- deterministic `.pptx` audit for off-slide objects, likely collisions, tiny text, excessive copy, placeholders, and common generic-copy patterns.
- LibreOffice → PDF → PNG rendering pipeline.
- contact-sheet generation for whole-deck visual review.
- JSON contracts for story, art direction, visual-review results, and eval results.
- `hands-on-deck` and PptxGenJS adapter contracts without vendoring upstream projects.
- evaluation runner with hard gates + weighted rubric scoring.
- golden briefs covering executive, technical, fundraising, product, scientific, and financial decks.
- CI, tests, architecture docs, contribution guide, threat model, and operating playbook.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
wcd doctor
wcd init-workspace ./work/demo
wcd audit examples/demo/demo.pptx
wcd render examples/demo/demo.pptx --out-dir ./work/demo/renders
wcd contact-sheet ./work/demo/renders --output ./work/demo/contact-sheet.png
pytest
```

`wcd doctor` reports optional tools such as LibreOffice, Poppler, Node, and PowerPoint export support.

## Core rule

**The builder never gets to be the final judge.** The rendered slides are reviewed by a fresh visual-review agent using `skills/world-class-deck/references/visual-qa-rubric.md`. Deterministic failures are fixed before visual review begins.

## Recommended engines

The workflow owns the process; external engines are replaceable:

- **Visual/native editable decks:** `EveryInc/hands-on-deck`.
- **Chart/data-heavy decks:** PptxGenJS, optionally with `proyecto26/slides-ai-plugin`.
- **Copy review:** compatible anti-slop skill, or the built-in rules in this repo.
- **Custom visual assets:** the host agent's image-generation capability.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

## Quality gates

A release candidate deck should have:

1. zero critical deterministic QA findings;
2. zero unresolved overlap/off-slide/tiny-text findings;
3. no placeholder text;
4. visual review with no severity-`blocker` findings;
5. story and visual rubric scores above the configured threshold;
6. at least one render → review → repair → re-render cycle;
7. a final render from PowerPoint itself when available.

## Design philosophy

- One slide, one claim.
- Action titles beat topic labels.
- Evidence beats adjectives.
- Fewer words beat smaller fonts.
- Subject-derived visual language beats generic gradients/cards.
- Native shapes remain editable whenever practical.
- Generated imagery supports the story; it does not contain critical text or numeric evidence.
- “Looks good in source code” is irrelevant. Rendered pixels are the product.

## License

MIT. Upstream projects retain their own licenses and are not vendored here.
