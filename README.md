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
- reusable consent, job, and chapter-manifest templates.
- deterministic validation and FFmpeg/ffprobe continuity checks.

## Requirements

- Node.js 20 or newer
- FFmpeg and ffprobe
- `jq` and `curl` for the optional Voicebox helper
- a local Voicebox server for voice generation
- WhisperX or Montreal Forced Aligner for final word-level alignment

## Quick start

```bash
npm test
cp templates/job-manifest.example.json /outside/repo/jobs/demo.private.json
node scripts/validate_job.mjs /outside/repo/jobs/demo.private.json
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
