# Integrations

## hands-on-deck

Project: `EveryInc/hands-on-deck`.

This repo detects its `deck` CLI when installed. We intentionally do not vendor it. Pin a tested upstream commit in your environment/lockfile for production use.

Recommended role:
- HTML/CSS-driven composition;
- native editable PPTX output;
- additional upstream lint/geometry checks.

## PptxGenJS

Use for chart-heavy or programmatic decks. Keep layout helpers and theme values centralized.

Optional helper project: `proyecto26/slides-ai-plugin` for adaptive sizing and validation patterns.

## Anti-slop writing skill

The built-in detector is intentionally small and deterministic. For agentic rewriting, install a dedicated compatible writing skill such as `adewale/anti-slop-writing`, then keep this repo's deterministic checks as a backstop.

## Codex

Install/copy `skills/world-class-deck` into the appropriate Codex skills location. The skill is designed for progressive disclosure: core workflow in `SKILL.md`, detailed rubrics under `references/`.

For images, use the host image-generation capability and require an inspection pass before accepting assets.

## Hermes

Hermes supports Agent Skills-style folders. Install this skill into the Hermes skills directory and use Hermes' vision capability for the independent rendered-slide review.

## Microsoft PowerPoint final renderer

LibreOffice is suitable for CI and early QA, but PowerPoint itself is the strongest final acceptance renderer for PowerPoint-bound users. `world_class_decks.adapters.powerpoint.powershell_export_script` provides a small COM export script generator for Windows runners.
