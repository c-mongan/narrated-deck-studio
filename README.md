# Narrated Demo Toolkit

A consent-first, local-first toolkit for producing slow, understandable product
walkthroughs with cloned narration, accurate screen alignment, readable labels,
captions, and objective media QA.

The core editing rule is simple: approve one narration master, then treat that
audio as immutable. Screens, slides, labels, tooltips, pauses, and speed ramps
move around the narration. The final editor must not trim, rearrange, splice, or
crossfade the approved master.

## What is included

- `voice-clone-studio`: permission, reference-audio, generation, selection, and
  provenance guidance.
- `video-narration-sync`: forced alignment, chapter timing, visual assembly,
  captions, and continuity QA.
- `narrated-product-demo`: an end-to-end orchestration skill joining both.
- `forensic-slide-alignment`: measured Voicebox narration-to-slide matching with
  provenance, confidence scores and mandatory human review.
- consent-gated voice-message and authorised YouTube ingestion with `yt-dlp`.
- WhisperX word timing, Demucs separation, pyannote speaker diarisation and
  PySceneDetect transition analysis in an isolated Python environment.
- narration-to-slide matching with confidence scores and mandatory review flags.
- PowerPoint rendering through LibreOffice and Poppler.
- reusable consent, job, and chapter-manifest templates.
- deterministic validation and FFmpeg/ffprobe continuity checks.
- forensic artifact and pacing analysis for narration masters.

## Requirements

- Node.js 20 or newer
- Voicebox running locally for authorised voice generation
- the media toolchain described in [`DEPENDENCIES.md`](DEPENDENCIES.md)

Install the toolchain and run the executable dependency report:

**macOS**

```bash
npm run install:media:macos
npm run doctor
```

**Windows PowerShell / Claude Cowork**

```powershell
npm run install:media:windows
npm run doctor
```

The Node workflows, privacy gates, slide matcher and Voicebox launcher are
cross-platform. Windows private outputs are protected with `icacls`; macOS and
Linux use restrictive file modes. CI runs the repository tests on Windows,
macOS and Ubuntu. Voicebox itself must be installed separately; set
`VOICEBOX_SERVER` if its Windows executable is outside the standard locations.

## Quick start

```bash
npm test
cp templates/job-manifest.example.json /outside/repo/jobs/demo.private.json
node scripts/validate_job.mjs /outside/repo/jobs/demo.private.json
node scripts/analyze_voice_naturalness.mjs /outside/repo/master.wav /outside/repo/script.txt
```

Read `skills/narrated-product-demo/SKILL.md` for the complete workflow. Copy a
skill directory into a compatible agent's skills folder if you want it to be
automatically discoverable.

## Privacy boundary

Do not commit speaker recordings, generated voices, Voicebox profile IDs,
permission evidence, unreleased product footage, customer data, model weights,
or real job manifests. A private GitHub repository reduces exposure; it is not
a suitable voice-evidence vault. See `PRIVACY.md`.

## Responsible use

Only clone a voice with the speaker's explicit permission. Disclose synthetic
narration in the finished video or its accompanying materials. Do not use this
toolkit for deception, impersonation, authentication bypass, fraud, or political
persuasion.

## Project status

This is a practical production toolkit, not a full video editor. The supplied
checks verify manifests and audio-stream continuity. A human still approves the
voice, pronunciation, visual meaning, readability, and final disclosure.
