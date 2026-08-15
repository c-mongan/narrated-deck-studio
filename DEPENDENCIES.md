# Media Toolchain

The toolkit keeps heavyweight speech tools isolated from the system Python. Real
media, voice profiles, consent evidence, model weights and job manifests stay
outside this repository.

## Install

### macOS

```bash
npm run install:media:macos
npm run doctor
```

### Windows PowerShell / Claude Cowork

```powershell
npm run install:media:windows
npm run doctor
```

The Windows installer uses `winget`, a Python 3.11 `.venv`, the same hash-locked
Python graph, pinned Songsee, and optional pinned MFA when micromamba is already
available. Reopen PowerShell and rerun if a newly installed command is not yet on
`PATH`. Voicebox is installed separately; use `VOICEBOX_SERVER` for a custom
Windows executable location.

The installer provides:

| Tier | Tools | Purpose |
|---|---|---|
| Required | yt-dlp, FFmpeg/ffprobe, Node, Python, jq, LibreOffice, Poppler | ingest, transform, render and verify |
| Recommended | WhisperX, Demucs, pyannote.audio, PySceneDetect, SoX, MediaInfo, ExifTool, Tesseract, Songsee, FFmpeg 7 compatibility libraries | alignment, separation, diarisation and evidence |
| Optional | Montreal Forced Aligner, ImageMagick, MKVToolNix | phoneme timing, contact sheets and unusual containers |

Python packages install into `.venv` from the hash-locked
`requirements-media.lock`. MFA `3.4.1` installs into
`~/.local/share/narrated-demo-toolkit/mfa` because its Conda dependencies should
not share the WhisperX environment. Songsee is pinned to `v0.1.1`. Exact native
versions used for release verification are recorded in `TOOLCHAIN_VERSIONS.md`;
Homebrew may resolve newer compatible bottles, which the executable doctor then
checks.

Voicebox is the approved voice-cloning engine. It remains a separately installed
local application/service; this repository calls its API through
`scripts/voicebox_generate.sh`. Do not commit its profiles, IDs, references or
outputs. Voicebox 0.5.0 defaults to port 8000 and `~/data` when its bundled server
is launched directly, so use the repository launcher to bind the expected port and
existing app data. The launcher refuses non-loopback hosts so this consent-sensitive
service cannot be exposed to the LAN accidentally:

```bash
npm run voicebox:start
# in another shell
npm run doctor
```

## Ingest a voice message

```bash
npm run ingest -- /path/to/message.m4a \
  --output /outside/repo/jobs/demo/source \
  --voice-reference --speaker-consent
```

This converts the message to mono 24 kHz PCM WAV and writes a private ingest
manifest. The consent flag is an execution gate, not proof by itself. Keep the
actual signed or recorded permission beside the private job manifest.

## Ingest an authorised YouTube source

```bash
npm run ingest -- 'https://www.youtube.com/watch?v=VIDEO_ID' \
  --output /outside/repo/jobs/demo/source \
  --source-authorized --voice-reference --speaker-consent
```

`yt-dlp` saves source metadata and available subtitles, then extracts lossless WAV.
Public availability does not grant permission to clone a speaker. Use only content
you may download and a voice you are explicitly authorised to synthesise.

## Alignment evidence

1. Use Demucs when speech must be separated from music or effects.
2. Use pyannote.audio when more than one speaker appears. On macOS, preload the
   normalised WAV as an in-memory waveform instead of relying on TorchCodec; this
   avoids mixing PyAV's bundled FFmpeg with Homebrew FFmpeg libraries.
3. Generate the approved narration with Voicebox.
4. Run WhisperX against the exact approved narration master and approved script.
5. Render the PowerPoint with LibreOffice and Poppler; extract each slide's text.
6. Run `npm run match-slides -- slides.json transcript.json alignment.json`.
7. Review every mapping marked `reviewRequired`; lexical scoring is evidence for
   triage, not a substitute for human semantic review.
8. Build the visual timeline from accepted word timestamps without cutting,
   splicing or retiming the approved narration master.
9. Verify final audio continuity, duration drift, captions and sampled frames.

The alignment report records narration ranges, selected slide, match score and
review status. Keep checksums, source metadata and the final timing manifest with
the private job evidence.

## Models and credentials

WhisperX and pyannote may download models at first use. Some diarisation models
require a Hugging Face account and acceptance of their model terms. Never commit
access tokens. Model availability is distinct from successful package installation.
