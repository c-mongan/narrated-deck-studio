# Integrations

## PPT Master — preferred expressive authoring engine

Project: `hugohe3/ppt-master`.

Use for flagship free-design decks when native PowerPoint depth matters. Current upstream capabilities include editable SVG→DrawingML authoring, masters/layouts, optional native charts/tables, source/template workflows, native transitions, optional object animations, notes/narration and image acquisition/generation.

World Class Decks intentionally does **not** vendor PPT Master. Pin a known-good revision in production, rerun WCD evals on upgrade, and store the tested commit in provenance.

The `world_class_decks.adapters.ppt_master` module provides discovery/script invocation helpers; the upstream skill remains the source of truth.

## hands-on-deck

Project: `EveryInc/hands-on-deck`.

Recommended complementary role:

- inspect/edit existing PPTX objects;
- atomic patches;
- HTML/CSS-driven native composition where useful;
- geometry/overlap checks;
- targeted repair after visual review.

## PptxGenJS

Useful for deterministic data-heavy decks or when a custom codebase already standardizes on it. `proyecto26/slides-ai-plugin` remains a useful helper reference for text measurement, theming and validation.

## Image generation

Use the host agent's current image-generation capability or PPT Master's configured image backend. Inspect outputs before acceptance. Generated visuals should share a deck-level art direction and should not contain critical numeric/text evidence.

## Microsoft PowerPoint

PowerPoint is the final rendering/playback authority for PowerPoint delivery. The adapter provides:

- native PNG export through COM;
- a conservative motion-plan applicator for named shapes using documented PowerPoint animation APIs.

PPT Master should be preferred when its own native motion pipeline meets the need. The COM adapter is a narrow fallback/post-process, not a replacement authoring engine.
