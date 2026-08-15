# Agent Host Instructions

For folder-to-narrated-PowerPoint work, load `skills/narrated-deck-studio/SKILL.md` first. It is the host-neutral entrypoint for Codex, Hermes Agent and Claude Cowork and owns the four human approval gates. The older skills remain focused sub-workflows.

This repository is a consent-first toolkit for authorised synthetic narration,
PowerPoint alignment and video assembly. Claude Cowork may run the checked-in
scripts, tests and validators on Windows or macOS.

## First run

Windows PowerShell:

```powershell
npm run install:media:windows
npm run doctor
npm test
```

macOS:

```bash
npm run install:media:macos
npm run doctor
npm test
```

Start the separately installed local Voicebox service with:

```bash
npm run voicebox:start
```

On Windows, set `VOICEBOX_SERVER` if discovery cannot find
`voicebox-server.exe`.

## Non-negotiable safety boundaries

- Require explicit speaker permission before `--voice-reference` use.
- Require `--source-authorized` for YouTube ingestion.
- Keep recordings, consent evidence, profile IDs, model weights, generated
  voices, customer footage and real job manifests outside this repository.
- Never bind Voicebox to a non-loopback host.
- Never bypass failed privacy-permission, dependency-doctor or review checks.
- Treat lexical slide matching as review evidence, not automatic approval.

## Completion gates

```bash
npm test
npm run validate
npm run doctor
```

Also inspect the final PowerPoint/video visually and review every alignment entry
marked `reviewRequired` before delivery.
