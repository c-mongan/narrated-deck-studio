---
name: world-class-deck
description: Create, repair, and benchmark exceptional native PowerPoint decks with multi-concept creative direction, subject-derived themes and typography, bespoke imagery, native motion, anti-slop editing, deterministic QA, rendered-pixel review, and blind comparison against elite human reference work. Use for high-stakes presentations where visual quality, editability, and originality matter.
---

# World Class Deck

This skill targets **elite creative work**, not merely competent AI-generated slides. Do not jump directly from a prompt to slide code.

## North-star rule

A deck is not “world class” because it passes lint or receives a high self-score. It must survive three different tests:

1. **correctness** — evidence, instructions, layout and rendering are right;
2. **creative authorship** — the deck has a specific visual point of view derived from its subject;
3. **comparative quality** — in high-bar workflows it should compete blind against curated exceptional human work.

Read these first when producing a flagship deck:

- `references/creative-direction.md`
- `references/typography-and-theme.md`
- `references/storytelling.md`
- `references/evidence.md`
- `references/anti-slop.md`
- `references/motion-direction.md`
- `references/visual-qa-rubric.md`
- `references/human-benchmark.md`

## Non-negotiable operating rules

1. **Builder != final judge.** A fresh reviewer inspects rendered pixels.
2. **Explore before committing.** Generate at least three materially different creative territories for a flagship free-design deck.
3. **One slide, one claim.** Prefer action titles that state the conclusion.
4. **Evidence before decoration.** Claims need sources/data/grounded reasoning when appropriate.
5. **Cut words before shrinking type.** Density is not solved with tiny copy.
6. **Subject-derived design.** Avoid generic “premium AI” gradients/cards unless the subject genuinely warrants them.
7. **Typography is art direction.** Font selection, hierarchy, numerals, width, language coverage and rendering must be deliberate.
8. **Native editability by default.** Keep important text, charts, labels, diagrams and motion editable.
9. **Generated imagery must be art-directed.** It supports the narrative; it must not carry critical factual text/numbers.
10. **Motion must explain or pace.** Never animate merely because PowerPoint can.
11. **Rendered pixels are the truth.** Source geometry alone is not acceptance evidence.
12. **At least one repair loop.** Build → render → review → fix → render again.
13. **Superiority claims require blind comparison.** Never claim “better than elite humans” from an absolute score alone.

## Phase 1 — Brief, evidence and presentation context

Create/update:

- `brief.md`
- `design_brief.json`
- `content_plan.json`
- `evidence_plan.json`
- `asset_plan.json`
- `outline.json`

For each slide define purpose, claim, evidence, dominant visual form and transition to the next idea.

## Phase 2 — Creative territories

Create `concept_candidates.json`. Produce >=3 substantially different concepts. Each concept must include a big idea, palette rationale, type direction, composition grammar, imagery approach, signature motif, hero moments, topic-specificity rationale and risks.

Do **not** produce three recolored versions of the same card deck. Score the candidates, choose one, and record why the others lost.

Then create:

- `creative_strategy.json`
- `theme_system.json`
- `visual_direction.json`

## Phase 3 — Copy / anti-slop pass

Rewrite slide copy for specificity. Remove generic significance language, inflated claims, duplicated headline/body meaning and canned AI rhetoric. Speaker notes may carry nuance that should not appear on-slide.

## Phase 4 — Asset direction

For each non-user image make an explicit source decision:

- documentary/source-grounded;
- user/brand asset;
- licensed/search image;
- generated image;
- diagram/data graphic;
- no image.

Do not let the chosen visual style automatically force AI-generated imagery. For real people, places, products, historical objects or verifiable events, source-grounded imagery is usually preferable unless the treatment is intentionally illustrative/non-documentary.

When generating images, keep one coherent art direction across the deck and inspect each result before use.

## Phase 5 — Build engine selection

The workflow owns quality; authoring engines are replaceable.

### Flagship expressive / native / motion decks

Prefer **PPT Master** when available. It currently provides the broadest expressive native PowerPoint path in this stack: editable SVG→DrawingML composition, slide masters/layouts, native charts/tables when requested, transitions, optional object animations, notes/narration and template reuse.

### Surgical editing / geometry QA / HTML-CSS composition

Use **hands-on-deck** for targeted native edits, inspection, geometry lint and its HTML/CSS composition workflow where useful.

### Data-heavy programmatic decks

Use PPT Master native charts/tables or PptxGenJS when deterministic chart APIs dominate.

Use one primary writer per deck unless a second engine has a narrow explicit job. Never casually mix geometry systems.

## Phase 6 — Typography, theme and native capability check

The theme system must be content-specific and explicit. Run:

```bash
wcd capabilities deck.pptx
```

Inspect actual theme/master/layout presence, declared typefaces, native charts/tables, pictures/media and motion markup. This is evidence, not a quality score.

## Phase 7 — Motion direction

If the delivery context benefits from motion, create `motion_plan.json` before applying it. Every animated object must have a storytelling rationale.

Prefer native motion from PPT Master. On Windows, the PowerPoint COM adapter can apply a small auditable motion subset by explicit shape name. Validate animation by playing it in PowerPoint; a static PNG render cannot prove timing quality.

## Phase 8 — Deterministic QA

Run:

```bash
wcd audit deck.pptx --output work/audit.json
```

Hard-fix off-slide objects, placeholders, overflow, critical overlaps, broken assets and unreadable text. Run the authoring engine's native linter as well when available.

## Phase 9 — Render and independent visual review

Render every slide at high resolution and create a contact sheet:

```bash
wcd render deck.pptx work/renders
wcd contact-sheet work/renders work/contact-sheet.png
```

A fresh reviewer inspects both full-resolution slides and the whole sequence. It should be adversarial and should not see the generating code or be told what the builder intended.

Review typography, image crops, hierarchy, whitespace, composition, alignment, visual rhythm, chart craft, generic-AI signals and topic specificity. Repair findings and re-render.

For final fidelity, prefer a Microsoft PowerPoint export when available.

## Phase 10 — Blind human benchmark

For high-bar flagship work, compare anonymized candidate renders against curated exceptional human references. Randomize A/B ordering. Judge art direction, typography, composition, imagery, story, specificity and motion where comparable.

Use:

```bash
wcd score-pairwise evals/pairwise/results.json
```

Do not claim “human-beating” until the comparative protocol in `references/human-benchmark.md` is satisfied.

## Completion checklist

A flagship deck is complete only when:

- correctness and source fidelity pass;
- deterministic QA has zero critical findings;
- no placeholders remain;
- visual reviewer has zero blockers/majors;
- copy is specific and non-generic;
- theme/type/image system is coherent and topic-derived;
- hero moments exist without every page shouting;
- deck-level rhythm is intentional;
- motion, if used, has been played and checked in native PowerPoint;
- at least one repair/re-render cycle occurred;
- output remains editable where expected;
- final `.pptx` opens/renders successfully;
- any “elite/human-beating” claim is backed by blind pairwise evidence.
