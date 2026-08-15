# World Class Decks

An agent-native **creative direction, authoring orchestration, visual QA and benchmarking system** for exceptional editable PowerPoint decks.

> **Quality bar:** “technically clean” is not enough. The target is a presentation with a specific creative point of view, bespoke typography/theme/image direction, native PowerPoint depth, disciplined motion, and enough comparative evidence to know whether it actually competes with elite human work.

## What changed in v0.2

v0.1 proved the engineering loop: plan → build → lint → render → independent review → repair → eval. That is necessary, but it does not by itself produce a masterpiece.

v0.2 adds the missing creative system:

- **three-territory creative exploration** before authoring;
- a deck-specific `creative_strategy.json` and `theme_system.json`;
- first-class typography and font-direction rules;
- per-image source decisions and coherent generative art direction;
- native motion planning and a PowerPoint COM motion adapter;
- **PPT Master as the preferred expressive native authoring engine**;
- hands-on-deck retained as surgical editing / geometry QA;
- PPTX capability inspection for themes, masters, layouts, fonts, charts, media and timing markup;
- higher-resolution visual/story/art-direction eval dimensions;
- a **blind candidate-vs-human pairwise benchmark** with a statistical win-rate report;
- a hard rule that “better than elite humans” can never be inferred from a self-score.

## Architecture

```text
source / brief / references
          │
          ▼
  evidence + story director
          │
          ▼
   3+ creative territories
          │
          ▼
 creative director selects one
          │
          ├──── typography + theme system
          ├──── image / asset direction
          └──── motion direction
          │
          ▼
 expressive PPTX authoring
 (PPT Master preferred)
          │
          ├──── hands-on-deck surgical QA/editing
          ├──── deterministic WCD audit
          └──── native-capability inspection
          │
          ▼
 render every slide + contact sheet
          │
          ▼
 fresh adversarial visual critic
          │ findings
          └──────────────► targeted repair loop
          │
          ▼
 native PowerPoint render / playback
          │
          ▼
 blind pairwise tournament vs elite human references
```

## Why PPT Master is now the expressive default

PPT Master has become unusually deep for an agent-driven open-source PowerPoint stack: it can produce editable DrawingML from authored SVG, preserve/use PowerPoint masters and layouts, create native data-backed charts/tables, reuse templates, and add real PowerPoint transitions and optional object animations. It also has AI image generation and licensed/search-image acquisition paths. We keep it external and pinned rather than forking it.

**World Class Decks does not replace PPT Master.** It supplies the creative brief, taste constraints, anti-slop rules, independent review, benchmark harness and release criteria around it.

## Repository map

- `skills/world-class-deck/SKILL.md` — portable top-level Agent Skill.
- `skills/world-class-deck/references/creative-direction.md` — multi-concept art direction.
- `skills/world-class-deck/references/typography-and-theme.md` — font/theme system.
- `skills/world-class-deck/references/motion-direction.md` — native motion grammar.
- `skills/world-class-deck/references/human-benchmark.md` — blind comparative release bar.
- `src/world_class_decks/qa/` — PPTX geometry/copy/native-capability inspection.
- `src/world_class_decks/evals/` — absolute rubric + pairwise human benchmark scoring.
- `src/world_class_decks/adapters/` — PPT Master, hands-on-deck and PowerPoint bridges.
- `evals/briefs/` — heterogeneous build briefs + holdout.
- `evals/golden-references/` — reference-corpus contract (no copyrighted decks are bundled).
- `tests/` — unit tests for QA, workspace, eval and motion-script generation.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'

wcd doctor
wcd init-workspace work/demo
wcd audit deck.pptx
wcd capabilities deck.pptx
wcd render deck.pptx work/demo/renders
wcd contact-sheet work/demo/renders work/demo/contact-sheet.png
pytest
```

## The deck workspace

`wcd init-workspace` creates persistent artifacts so the agent cannot hand-wave the design process:

```text
brief.md
design_brief.json
content_plan.json
evidence_plan.json
asset_plan.json
outline.json
concept_candidates.json
creative_strategy.json
theme_system.json
visual_direction.json
motion_plan.json
benchmark_plan.json
review.json
assets/
concepts/
references/
renders/
motion/
```

## Quality gates

A flagship release should satisfy all of these:

1. zero critical deterministic layout/content failures;
2. independent rendered-pixel review with no blockers/majors;
3. specific copy and evidence-grounded claims;
4. deliberate deck-specific typography/theme/image system;
5. at least one render → critique → repair → re-render loop;
6. native PowerPoint final render when PowerPoint fidelity matters;
7. native playback inspection when animations matter;
8. for any superiority claim, blind pairwise comparison against curated human references.

## “Can it beat the best human PowerPoint designer?”

That is the aspiration, **not a current factual claim**. The repo now contains the machinery needed to test that claim rather than pretending a 90/100 LLM score proves it.

The release benchmark target is deliberately difficult: across diverse briefs and elite human references, the generated candidate should earn >=70% pairwise points, and the lower 95% confidence bound should eventually exceed 50% before we treat “human-beating” as demonstrated.

## License

MIT. External engines remain separate projects with their own licenses and release cadences.
