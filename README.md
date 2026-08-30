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
- Eight narrow MCP tools and one portable Agent Skill shared by Codex, Hermes Agent and Cowork.
- Imported World Class Decks creative QA/render pipeline and a pinned external PPT Master authoring contract.
- Consent-gated local Voicebox take generation, immutable-master handling, alignment request/validation, captions, Remotion composition and Windows native PowerPoint narration application.
- Fail-closed release checks and checksum manifest export.

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
