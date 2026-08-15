# Evaluation strategy

A deck skill should be evaluated like both **software** and **creative work**.

## Layer 1 — deterministic gates

- file opens;
- requested page range/constraints respected;
- no placeholder content;
- no critical off-slide/overlap/overflow failures;
- required sources/assets/citations present;
- important text remains readable/editable;
- native PowerPoint render succeeds when required.

## Layer 2 — absolute rubric

`wcd score-eval` uses these default dimensions:

- story 15%
- visual quality 13%
- art direction 12%
- typography 10%
- composition 10%
- imagery 9%
- specificity 8%
- evidence 8%
- copy quality 6%
- editability 4%
- consistency 3%
- motion 2%

A `null` score means legitimately not applicable and its weight is renormalized. Default flagship pass threshold is 90, with hard gates overriding the weighted score.

An absolute rubric is useful for regression diagnosis, **not for proving superiority to humans**.

## Layer 3 — blind pairwise benchmark

Render candidate and human-reference decks into anonymized sequences, randomize A/B order, and ask independent judges which is better overall plus per-dimension preferences.

Use `wcd score-pairwise results.json` to calculate candidate point win rate and a Wilson 95% confidence interval.

### Development bar

- >=5 valid comparisons;
- candidate point win rate >=70%;
- no correctness/layout hard-gate failure.

### Serious human-beating claim

- >=20 comparisons across multiple briefs and multiple elite references;
- candidate point win rate >=70%;
- lower 95% confidence bound >50%;
- no meaningful holdout regression;
- multiple independent judges/models where practical;
- native-motion comparisons when motion is part of the claim.

## Regression protocol

For each meaningful skill/engine change:

1. run unit/static tests;
2. generate multiple representative briefs;
3. render every deck;
4. run deterministic + capability checks;
5. run independent visual/story judges;
6. run pairwise reference comparisons on the flagship subset;
7. inspect large wins/losses manually;
8. reject changes that materially regress the holdout.
