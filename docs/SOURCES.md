# Design provenance and upstream projects

This repository does not vendor the projects below. They informed the architecture and/or are supported as optional integrations. Review their current license and documentation before production pinning.

## Primary upstreams

- EveryInc/hands-on-deck — agent-native editable PowerPoint authoring and geometry QA. Tested research snapshot observed at commit `a24b996ecff6393ccf39c4fee2b88c493fb0b693` (2026-08-04).
- siril9/presentation-skill — structured planning/workspace and iterative render-review concepts.
- adewale/anti-slop-writing — dedicated anti-generic-writing skill and eval philosophy.
- proyecto26/slides-ai-plugin — PptxGenJS sizing/validation patterns.
- OpenAI skills / Codex skills documentation — progressive-disclosure skill structure and image-generation workflow.
- Anthropic PowerPoint skill — adversarial render-and-inspect design guidance.
- Hermes Agent skills / PowerPoint skill — Agent Skills compatibility and vision-based slide inspection pattern.

## Research motivation

Recent slide-agent benchmarks and systems reinforce the need for separate planning, editing, rendering, and visual evaluation rather than relying on a single generation pass. Keep benchmark-specific claims in research notes/evals rather than hard-coding them into runtime behavior.

## Upgrade policy

Do not blindly track `main` for production. Pin a known-good upstream revision, rerun the eval suite, inspect render diffs, then upgrade deliberately.
