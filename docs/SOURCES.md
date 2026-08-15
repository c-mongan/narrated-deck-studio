# Design provenance and upstream projects

This repository does not vendor the projects below. They informed the architecture and/or are supported as optional integrations. Pin/test upstream revisions before production use.

## Primary upstreams

- **hugohe3/ppt-master** — preferred expressive authoring engine in v0.2: native DrawingML, masters/layouts, charts/tables, templates, transitions/animations, narration and image workflows. Research snapshot observed on 2026-08-15 at commit `a9850e57ec05bacff409cd213bb027e1a03117f8`.
- **EveryInc/hands-on-deck** — surgical PowerPoint inspection/editing, HTML/CSS composition and geometry QA. Previously observed research snapshot `a24b996ecff6393ccf39c4fee2b88c493fb0b693` (2026-08-04).
- **siril9/presentation-skill** — structured planning/workspace and iterative render-review concepts.
- **adewale/anti-slop-writing** — anti-generic-writing skill/eval philosophy.
- **proyecto26/slides-ai-plugin** — PptxGenJS sizing/validation patterns.
- **OpenAI Codex skills / image generation docs** — progressive-disclosure skill and generated-asset inspection patterns.
- **Anthropic PowerPoint skill** — adversarial render-and-inspect guidance.
- **Hermes Agent PowerPoint/skills docs** — skill portability and vision-review pattern.
- **Microsoft PowerPoint VBA object model docs** — native transition/animation APIs and enum values used by the narrow COM adapter.

## Upgrade policy

Do not blindly track `main`. Pin a known-good upstream revision, run static/unit tests, regenerate representative briefs, compare visual diffs, run pairwise benchmark slices, then upgrade deliberately.
