# Operating playbook

## Flagship production run

1. `wcd init-workspace work/<deck>`.
2. Complete the evidence/story artifacts before styling.
3. Develop at least three genuinely different creative territories in `concept_candidates.json`.
4. Select one territory and fully specify `creative_strategy.json`, `theme_system.json`, `visual_direction.json`, and `asset_plan.json`.
5. Build with one primary expressive engine. Prefer PPT Master for decks requiring rich native PowerPoint, custom masters/layouts, SVG/DrawingML, charts/tables, transitions, or animation. Use hands-on-deck as an additional geometry/repair layer when useful.
6. `wcd audit deck.pptx --output work/<deck>/audit.json`.
7. `wcd capabilities deck.pptx` and compare the report with the intended design/motion plan. Capability presence is descriptive, not a quality score.
8. `wcd render deck.pptx work/<deck>/renders`.
9. `wcd contact-sheet work/<deck>/renders work/<deck>/contact-sheet.png`.
10. Run a fresh adversarial visual reviewer on every full-resolution slide and the contact sheet.
11. Repair failed slides and repeat deterministic + visual QA.
12. If motion is part of the brief, apply/verify the native motion plan and play it in Microsoft PowerPoint. Static PNG review is not sufficient for motion acceptance.
13. Export final PNGs from Microsoft PowerPoint when available and perform the final visual pass there.
14. For a flagship or release evaluation, run a blinded pairwise comparison against curated human-reference decks and score it with `wcd score-pairwise`.

## Human-superiority claims

Do not infer elite design quality from a self-score. For a serious claim that the system beats strong human work:

- use held-out, high-quality human references;
- randomize/anonymize candidate vs reference;
- use multiple judges when possible;
- use at least 20 valid pairwise comparisons for a serious release claim;
- target candidate pairwise point win rate >= 70%;
- require the 95% Wilson lower confidence bound to exceed 50%;
- inspect dimension-level losses even when the aggregate passes.

## CI

CI runs static analysis, unit tests, deterministic PPTX QA, schema/eval tests, and fixture capability inspection. Model-based visual review and PowerPoint-native motion playback belong in an agent/eval or Windows runner because they need a multimodal judge and/or Microsoft PowerPoint.

## Failure handling

If LibreOffice and PowerPoint disagree:

- treat PowerPoint as final authority for PowerPoint delivery;
- record the renderer-dependent discrepancy;
- avoid fragile layout tricks that depend on one renderer unless necessary.

If a visual judge and deterministic QA disagree, inspect the actual pixels. Geometry is an early warning system; presentation quality is perceptual.
