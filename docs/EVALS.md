# Evaluation strategy

A deck skill should be evaluated like software, not tuned by vibes against one demo.

## Test set

`evals/briefs/` contains heterogeneous briefs. Add real anonymized briefs over time.

Keep a holdout set that is not used while editing prompts/rules.

## Evaluation layers

### 1. Deterministic gates

- opens successfully;
- slide count within requested range;
- zero off-slide critical shapes;
- no placeholders;
- no critical overlaps/overflow;
- required citations/assets present;
- minimum text size policy passes where applicable.

### 2. Instruction-following judge

Does the deck satisfy the explicit brief, audience, required content, constraints, and source fidelity?

### 3. Visual judge

Use the independent visual QA rubric on rendered pixels.

### 4. Story judge

Assess claim sequence, evidence quality, decision usefulness, and transitions.

### 5. Specificity / anti-slop judge

Ask whether the copy and design could be transplanted unchanged to another topic. Penalize generic language and generic visual motifs.

## Scoring

Default weighted dimensions:

- story 22%
- visual quality 24%
- specificity 12%
- evidence 16%
- editability 8%
- copy quality 10%
- consistency 8%

Hard gates override weighted score.

Use `wcd score-eval eval.json` to score a judge-produced evaluation record.

## Regression protocol

For every meaningful skill change:

1. run deterministic unit tests;
2. generate at least 5 representative briefs;
3. render all decks;
4. run independent judges;
5. compare score deltas and failure categories;
6. inspect any large win/loss manually;
7. do not merge if holdout quality regresses materially.
