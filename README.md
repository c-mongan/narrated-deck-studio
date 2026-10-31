# Narrated Deck Studio

A host-neutral, consent-gated local studio for turning a mixed source folder into reviewed, editable PowerPoints, self-playing PowerPoint Shows, captioned videos, and provenance receipts. Codex, Hermes Agent and Claude Cowork can all drive the same local core and approval state machine.

The normal user experience is conversational: select or name a folder in a supported agent, answer a few plain-English questions, approve four local review pages, and receive deliverables. The guided path does not ask the user to edit JSON, disclose a voice profile ID, or give an agent arbitrary command access.

## Status

The deterministic core, local review flow, MCP server, host installers, media adapters, and cross-platform tests are implemented. The current MCPB is an unsigned development package. A trusted signature, clean-host installation, native PowerPoint playback evidence, and resolution of the known upstream Python media advisories remain release gates. See [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md) and [SECURITY.md](SECURITY.md) before using the project for production delivery.

## What is implemented

- Safe recursive inventory of PPTX, DOCX, PDF, text, media and images, including checksums, notes detection, macro warnings, prompt-injection warnings, symlink confinement and generated-folder exclusions.
- Human-readable series planning with duration, word and slide budgets plus three creative territories. Multiple PowerPoints default to one independently narrated PPTX/PPSX/MP4/caption set per source deck.
- Exact-artifact approval receipts and automatic downstream invalidation.
- Loopback-only, token-protected review UI with plan, deck, blind-voice and release gates. Agents cannot approve.
- Ten narrow MCP tools and one portable Agent Skill shared by Codex, Hermes Agent and Cowork.
- Source-preserving pilot intake that drafts missing narration, selects representative slides, flags dense/chart/name-and-number/layout risks, accepts test or explicitly authorised preview audio, and exports a hash-bound draft package without advancing approval state.
- Imported World Class Decks creative QA/render pipeline and a pinned external PPT Master authoring contract.
- Consent-gated local Voicebox take generation, immutable-master handling, alignment request/validation, captions, Remotion composition and Windows native PowerPoint narration application.
- Fail-closed release checks and checksum manifest export.

## Repeatable presentation production

The [production skill](skills/narrated-deck-studio/SKILL.md) now routes narrated films and product walkthroughs separately from the managed PowerPoint pipeline. Its [producer brief](skills/narrated-deck-studio/agents/producer.md) carries audience/story ownership, rehearsals, pacing, source provenance, revision reuse and delivery checks. `AGENTS.md` and `CLAUDE.md` point agents to that entrypoint. `agents/openai.yaml` enables normal Codex skill discovery; the producer brief is portable guidance, not a registered background agent.

Ask for the outcome, for example: “Use Narrated Deck Studio to make a narrated walkthrough from this folder for a first-time viewer.” Supply only consequential missing choices; the agent should reuse preferences already stated and carry production and verification through to completion.

The self-contained [QA helper and contract](skills/narrated-deck-studio/references/quality-contract.md) check measured cue timing, reading holds, selected-master integrity, final audio fidelity and exact-file visual-review coverage. The existing host installer copies the entire skill, including its references and helper. To update only the skill without reinstalling the MCP runtime, back up the existing host skill and copy `skills/narrated-deck-studio/` into that host's skill directory. Preserve any unrelated local additions. New sessions may be needed to refresh skill discovery.

These additions are agent-side production guidance and supplementary checks. They do not change application approval semantics, prove human listening, or remove native PowerPoint release requirements. Run `node --test tests/presentation_qa.test.mjs` with Python 3.10+, FFmpeg and ffprobe for the local media regression fixtures.

For an existing PowerPoint, `prepare_representative_pilot` creates a private draft-review package after planning. The same sample appears in the loopback review page. A reviewer can repair only an affected slide's narration; deterministic test audio is labelled as such, while voice preview audio requires explicit permission. The pilot export is not a PPTX/PPSX/MP4 release and cannot satisfy any of the four approval gates.

## Quick start from source

Prerequisites:

- Git, Node.js 20 or newer, and npm 10.
- Python 3.11 and [uv](https://docs.astral.sh/uv/) for the World Class Decks checks and media tools.
- macOS or Windows for the complete narrated PowerPoint workflow. The deterministic core tests also run on Linux.

Clone and install the locked JavaScript dependencies:

```bash
git clone https://github.com/c-mongan/narrated-deck-studio.git
cd narrated-deck-studio
npm ci
```

Create the Python 3.11 environment on macOS or Linux:

```bash
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python -e './packages/world-class-decks[dev]'
```

On Windows PowerShell, use:

```powershell
uv venv --python 3.11 .venv
uv pip install --python .venv\Scripts\python.exe -e './packages/world-class-decks[dev]'
```

Run the complete source and package verification:

```bash
npm run verify
```

The platform-specific extension is written to `dist/narrated-deck-studio.mcpb`. Build it on the operating system where it will be installed. MCPB signing is intentionally a release gate; see [docs/PACKAGING.md](docs/PACKAGING.md).

## Install the full media toolchain

The full workflow also needs native tools, an isolated hash-locked Python media environment, PPT Master, and a separately installed local Voicebox service. The automated installers and exact requirements are in [DEPENDENCIES.md](DEPENDENCIES.md), [requirements-media.txt](requirements-media.txt), [requirements-media.lock](requirements-media.lock), and [docs/DEPENDENCY_PINS.json](docs/DEPENDENCY_PINS.json).

On macOS:

```bash
npm run install:media:macos
npm run engines:install
npm run hosts:install
```

On Windows PowerShell:

```powershell
npm run install:media:windows
npm run engines:install
npm run hosts:install
```

The installers do not install Voicebox or create a voice profile. Follow the Voicebox project instructions, keep it on loopback, and use only a voice for which you have explicit permission. Run `npm run doctor` to see the exact tools that are ready or missing.

The engine installer checks out the exact pinned PPT Master commit, verifies it, and installs its Agent Skill into both hosts. The host installer copies a versioned runtime under the user's local application-data directory and registers the same stdio MCP server with both agents. Use `-- --replace` when intentionally refreshing an existing installation.

## Boundaries

The repository orchestrates work; it does not silently invent approval, consent, native playback evidence, or PowerPoint fidelity. PPT Master is installed separately and remains external. Voicebox, WhisperX, PowerPoint, FFmpeg and platform media tools are also separately installed or pinned. macOS and Windows PowerPoint acceptance plus a first-time-user trial remain machine-backed release gates.

Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [skills/narrated-deck-studio/SKILL.md](skills/narrated-deck-studio/SKILL.md), and [PRIVACY.md](PRIVACY.md).

Current-machine evidence and explicit gaps are recorded in [docs/LOCAL_VERIFICATION_2026-08-15.md](docs/LOCAL_VERIFICATION_2026-08-15.md).

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing the project. Report security or privacy issues using [SECURITY.md](SECURITY.md). Do not put private recordings, voice profile IDs, consent records, customer files, generated media, or credentials in an issue.

## Responsible use

Only synthesize a voice with the speaker's explicit permission and separately confirm download rights for online source material. Always disclose synthetic narration. Never use this project for deception, fraud, impersonation, authentication bypass, or political persuasion.
