# Typography and theme system

Typography is a first-class art-direction decision. Do not choose a font because it is popular in AI demos.

## Font selection

Derive typography from subject, audience, venue, language coverage, brand, and visual concept. Consider:

- personality: editorial, technical, institutional, luxury, kinetic, archival, playful;
- width and density under real slide copy;
- numeral quality for data-heavy decks;
- italic / weight range;
- punctuation and multilingual coverage;
- licensing and installation/embedding constraints;
- screen/projection rendering.

Use one family when it genuinely has enough range; otherwise use a purposeful display/text pairing. Three unrelated families is usually a failure.

## Type system

Specify roles, not arbitrary sizes:

- display / hero;
- action title;
- section title;
- body;
- annotation / source;
- data label / numeric hero.

Optical balance beats a rigid numerical scale, but the system must be explicit in `theme_system.json`.

## Theme generation

A world-class free-design deck must generate a deck-specific theme system before slide authoring: palette roles, font roles, type scale, grid, spacing scale, shape language, image treatment, chart system, section variants, and signature motif.

The theme should be explainable from the content. If the rationale is merely “modern”, “clean”, “professional”, “premium”, or “techy”, the art direction is not specific enough.

## Verification

Run `wcd capabilities deck.pptx` and review declared font families, master/layout/theme presence, and native objects. Final acceptance should render in Microsoft PowerPoint when custom typography is important because font substitution can materially change geometry.
