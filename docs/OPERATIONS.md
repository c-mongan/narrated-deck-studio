# Operating playbook

## Local production

1. `wcd init-workspace work/<deck>`
2. Have the agent complete the structured planning files.
3. Build the deck with the selected writer.
4. `wcd audit deck.pptx --output work/<deck>/audit.json`
5. `wcd render deck.pptx work/<deck>/renders`
6. `wcd contact-sheet work/<deck>/renders work/<deck>/contact-sheet.png`
7. Run a fresh visual reviewer.
8. Repair findings and repeat steps 4–7.
9. If PowerPoint is available, export a final PNG render there and visually spot-check again.

## CI

CI should run static analysis, tests, and deterministic QA on fixture decks. Vision review is best run in an agent/eval environment because it requires a multimodal model.

## Failure handling

If LibreOffice and PowerPoint disagree:
- treat PowerPoint as final authority for PowerPoint delivery;
- record the renderer-dependent discrepancy;
- avoid fragile layout tricks that depend on one renderer unless necessary.
