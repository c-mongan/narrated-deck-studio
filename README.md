# Narrated Deck Studio

A Cowork-first, consent-gated local studio for turning a mixed source folder into reviewed, editable PowerPoints, self-playing PowerPoint Shows, captioned videos, and provenance receipts.

Dad is the first user. The normal experience is conversational: select a folder in Claude Cowork, answer a few plain-English questions, approve four review pages, and receive deliverables. No terminal, JSON editing, voice profile IDs, or arbitrary command access is part of that path.

## What is implemented

- Safe recursive inventory of PPTX, DOCX, PDF, text, media and images, including checksums, notes detection, macro warnings, prompt-injection warnings, symlink confinement and generated-folder exclusions.
- Human-readable series planning with duration, word and slide budgets plus three creative territories.
- Exact-artifact approval receipts and automatic downstream invalidation.
- Loopback-only, token-protected review UI with plan, deck, blind-voice and release gates. Agents cannot approve.
- Eight narrow MCP tools and a portable Agent Skill for Cowork, Codex and Hermes.
- Imported World Class Decks creative QA/render pipeline and a pinned external PPT Master authoring contract.
- Consent-gated local Voicebox take generation, immutable-master handling, alignment request/validation, captions, Remotion composition and Windows native PowerPoint narration application.
- Fail-closed release checks and checksum manifest export.

## Developer verification

```bash
npm ci
python3 -m pip install -e './packages/world-class-decks[dev]'
npm run build
npm test
npm run validate
npm run mcp:build
```

The packaged extension is written to `dist/narrated-deck-studio.mcpb`. MCPB signing is intentionally a release gate; see [docs/PACKAGING.md](docs/PACKAGING.md).

## Boundaries

The repository orchestrates work; it does not silently invent approval, consent, native playback evidence, or PowerPoint fidelity. PPT Master is installed separately and remains external. Voicebox, WhisperX, PowerPoint, FFmpeg and platform media tools are also separately installed/pinned. macOS/Windows PowerPoint acceptance and Dad's zero-terminal Cowork trial remain machine-backed release gates.

Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [skills/narrated-deck-studio/SKILL.md](skills/narrated-deck-studio/SKILL.md), and [PRIVACY.md](PRIVACY.md).

## Responsible use

Only synthesize a voice with the speaker's explicit permission and separately confirm download rights for online source material. Always disclose synthetic narration. Never use this project for deception, fraud, impersonation, authentication bypass, or political persuasion.
