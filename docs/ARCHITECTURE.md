# Architecture

## Goal

Build presentations as **creative products plus testable software artifacts**. Correctness/QA is the floor. Creative authorship and comparative quality are the ceiling.

## Layers

### 1. Evidence / story

Ground claims, define audience action, and shape the argument before design.

### 2. Creative exploration

Generate at least three distinct creative territories for flagship free-design work. Select one using explicit criteria rather than blending all concepts into generic compromise.

### 3. Theme / typography / imagery / motion

The selected territory becomes a system: font roles, type scale, color roles, spacing/grid, image treatment, chart system, shape language, signature motif, section variants and motion grammar.

### 4. Authoring engine

**Preferred flagship engine: PPT Master.** It owns expressive native PPTX generation, masters/layouts, DrawingML conversion, optional native charts/tables, templates, transitions/animations and narration capabilities.

**hands-on-deck** is a complementary surgical editor and geometry/inspection layer.

**PptxGenJS** remains useful when a project is primarily programmatic chart/layout code.

The WCD repo owns none of those upstream engines; it owns contracts, orchestration and acceptance criteria.

### 5. Deterministic QA

Fast checks catch unequivocal defects: out-of-bounds shapes, placeholders, likely collisions, density/tiny-copy warnings and copy anti-patterns. `wcd capabilities` separately inventories native PPTX depth (theme/master/layout/fonts/charts/media/motion markup).

### 6. Rendered-pixel QA

A fresh visual critic inspects full-resolution slide renders and a contact sheet. This catches perceptual failures geometry cannot: hierarchy, bad crops, weak art direction, repetitive composition, awkward whitespace and “AI deck” sameness.

### 7. Native PowerPoint acceptance

When PowerPoint is the target renderer, it is the final fidelity authority. Motion must be played in native PowerPoint because a static render cannot validate timing.

### 8. Blind human benchmark

A comparative judge sees randomized anonymized A/B renders from candidate and curated human references. This is the only supported path for a “human-beating” claim.

## Trust boundaries

Generated imagery, external references and input decks are untrusted. Never execute macros from source decks. Do not redistribute copyrighted benchmark decks. Store only references the user/project is licensed to use. Do not embed secrets in notes/image prompts.
