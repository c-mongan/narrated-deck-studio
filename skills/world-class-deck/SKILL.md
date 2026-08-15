---
name: world-class-deck
description: Create, repair, and audit world-class editable PowerPoint decks with structured story planning, anti-slop copy editing, subject-derived art direction, deterministic QA, rendering, independent visual review, and iterative repair. Use for high-stakes presentations where visual quality and editability matter.
---

# World Class Deck

Use this workflow for production-quality PowerPoint work. Do not jump directly from a user prompt to slide code.

## Non-negotiable operating rules

1. **Builder != final judge.** A fresh reviewer must inspect rendered pixels.
2. **One slide, one claim.** Prefer action titles that state the conclusion.
3. **Evidence before decoration.** Claims need data, citations, screenshots, or source-grounded reasoning when appropriate.
4. **Cut words before shrinking type.** Do not solve density with tiny text.
5. **Subject-derived design.** Avoid generic blue/gradient/card-grid aesthetics unless the subject or reference template genuinely calls for them.
6. **Native editability by default.** Keep important text, charts, labels, and diagrams editable. Generated images must not carry critical factual text.
7. **Rendered pixels are the truth.** Source geometry alone is not acceptance evidence.
8. **At least one repair loop.** Build → render → review → fix → render again before declaring completion.

## Phase 1 — Brief and evidence

Create or update these workspace files before building slides:

- `brief.md`
- `design_brief.json`
- `content_plan.json`
- `evidence_plan.json`
- `asset_plan.json`
- `outline.json`
- `visual_direction.json`

Read `references/storytelling.md` and `references/evidence.md`.

For each slide define:

- `purpose`: why the slide exists;
- `claim`: the sentence the audience should remember;
- `evidence`: what proves the claim;
- `visual`: the dominant visual form;
- `transition`: why the next slide follows.

Do not use headings like “Overview”, “Our Approach”, or “Key Priorities” unless no truthful action title exists.

## Phase 2 — Copy pass

Read `references/anti-slop.md`.

Rewrite slide copy to:

- use specific nouns and verbs;
- remove inflated significance language;
- remove generic “unlock / transform / seamless / future-ready” language unless literally required;
- replace abstract benefits with observable outcomes;
- remove duplicated headline/body meaning;
- make titles declarative where possible.

Keep body text terse. Speaker notes can contain nuance that does not belong on-slide.

## Phase 3 — Art direction

Read `references/design-doctrine.md`.

Create one coherent visual system:

- palette roles, not random colors;
- typography roles and a type scale;
- spacing/grid system;
- image treatment;
- chart/table treatment;
- icon treatment;
- one signature motif;
- rhythm rules across the sequence.

Internally explore 2–3 substantially different concepts, then commit to one. Do not average them together.

If the user supplies a strong template/reference deck, prefer its master/layout/theme over inventing a new identity.

## Phase 4 — Assets

Use the host runtime's image-generation capability when custom imagery improves the narrative. Inspect generated outputs before use.

Good uses:
- hero/editorial illustration;
- photographic concepts;
- abstract metaphors;
- textures/backgrounds;
- bespoke section artwork.

Bad uses:
- tiny labels;
- critical numeric evidence;
- charts that should be editable;
- rasterized body copy.

## Phase 5 — Build

Choose one primary writer per deck:

### Visual/native decks
Prefer `hands-on-deck` when available. Its HTML/CSS-based layout path is useful for high-design pages while retaining editable PowerPoint objects.

### Chart/data-heavy decks
Prefer PptxGenJS or another native-chart-capable writer. Keep all theme values centralized.

Do not mix multiple writers casually; differences in geometry and font handling become difficult to debug.

## Phase 6 — Deterministic QA

Run:

```bash
wcd audit path/to/deck.pptx --output work/audit.json
```

Hard-fix:
- off-slide objects;
- placeholders;
- actual overflow;
- critical overlaps;
- broken assets;
- unreadable text.

Treat heuristic overlap warnings as prompts to inspect the rendered slide, not as automatic proof of a defect.

If `hands-on-deck` is installed, run its lint/geometry checks too.

## Phase 7 — Render

Render every slide:

```bash
wcd render path/to/deck.pptx work/renders
wcd contact-sheet work/renders work/contact-sheet.png
```

For final-fidelity acceptance on Windows, prefer a Microsoft PowerPoint export after LibreOffice QA.

## Phase 8 — Fresh visual review

A fresh reviewer must read `references/visual-qa-rubric.md` and inspect:

1. each full-resolution slide render;
2. the whole-deck contact sheet.

The reviewer should be adversarial: identify defects, not compliments.

Output the JSON shape documented in `references/reviewer-contract.md`.

## Phase 9 — Repair and re-check

Repair only failed slides where possible. Then:

- re-run deterministic QA;
- re-render repaired slides/deck;
- have the reviewer verify the fixes;
- update `review.json` with iteration count.

Never claim completion after the first unreviewed render.

## Phase 10 — Eval

For reusable workflows or skill changes, run the eval protocol in `../../../docs/EVALS.md` against multiple briefs. Do not tune only to the demo deck.

## Completion checklist

A deck is complete only when:

- deterministic QA has zero critical findings;
- no placeholders remain;
- visual reviewer has zero blockers;
- copy is specific and non-generic;
- deck-level rhythm is coherent;
- claims are evidence-grounded;
- at least one repair/re-render cycle occurred;
- output remains editable where expected;
- final `.pptx` opens and renders successfully.
