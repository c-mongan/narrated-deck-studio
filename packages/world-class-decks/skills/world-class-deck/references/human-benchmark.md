# Human benchmark protocol

“World class” is a comparative claim, so evaluate comparatively.

## Reference set

Maintain a curated set of legally usable / user-provided reference decks representing exceptional human work across editorial, keynote, investor, technical, data-journalism, luxury, scientific, and product storytelling styles. Do not copy their content or trade dress; use them as blind quality references.

## Blind pairwise judge

For each generated deck, render candidate and reference decks to anonymized images. Randomize A/B order. The judge must not know which is AI-generated.

Compare:

- art direction;
- typography;
- composition;
- imagery;
- story clarity;
- specificity;
- data/diagram craft;
- motion, when comparable.

The judge returns `candidate`, `reference`, or `tie`, plus per-dimension preferences and concrete reasons.

## Release bar

Do not claim “human-beating” from an absolute 0–100 rubric. Require at minimum:

- no hard correctness/layout failures;
- >= 5 blind pairwise comparisons for a development check;
- >= 20 comparisons across multiple briefs for a release claim;
- candidate point win rate >= 70%;
- lower bound of the confidence interval above 50% before making a serious superiority claim;
- no major regression on the holdout corpus.

Use `wcd score-pairwise comparisons.json`.
