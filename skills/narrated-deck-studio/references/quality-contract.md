# Supplementary film QA contract

This helper is a local check for a **measured, already rendered film**. It does not render a presentation, authorize release, replace consent, prove native PowerPoint playback, or decide whether narration is accurate. Use it alongside the existing application release checks when those apply.

Run from any directory with Python 3.10+ and FFmpeg/ffprobe on PATH:

```sh
python /path/to/skill/scripts/presentation_qa.py audit /private/project/film.json /private/project/qa-v1
```

The output directory must be new so old frame reviews cannot silently survive a rerender. The helper creates a report, one final-film frame per cue and an incomplete visual-review template. It fails on a changed master, invalid timing, wrong stream contract, speech differing from the master or missing speech. Reports and media remain private. No Python packages are required.

## Manifest

Paths are relative to the manifest (absolute paths also work). All times are measured **final-film seconds**. `visualStart`/`visualEnd` describe when the settled evidence supports the narration, not the whole chapter. Include every spoken passage, with unique cue IDs. Sample the decisive state inside the spoken interval. `readingHoldSeconds` is a minimum required hold after the speech. Use a positive project-appropriate minimum; the helper prevents a later cue from consuming it, allowing at most 50 ms for frame rounding.

```json
{
  "schemaVersion": 1,
  "film": "deliverables/film.mp4",
  "master": "private/selected-master.wav",
  "masterSha256": "replace-with-the-selected-master-sha256",
  "durationSeconds": 24,
  "width": 1920,
  "height": 1080,
  "subtitleTracks": 0,
  "chapterCount": 0,
  "cues": [
    {
      "id": "find-report",
      "speechStart": 1,
      "speechEnd": 7,
      "visualStart": 0.5,
      "visualEnd": 10,
      "readingHoldSeconds": 2,
      "sampleSeconds": 4,
      "expectedState": "The named report and result count are both visible"
    },
    {
      "id": "read-report",
      "speechStart": 12,
      "speechEnd": 20,
      "visualStart": 11,
      "visualEnd": 24,
      "readingHoldSeconds": 3,
      "sampleSeconds": 16,
      "expectedState": "The matching PDF page and diagram labels are readable"
    }
  ]
}
```

This is a format example, not preverified evidence. The script requires actual files, a valid hash and exact measured values. `subtitleTracks` counts streams; it does not detect burned-in subtitles. `chapterCount` counts container chapters, not slides. The master includes intentional silent holds and matches the film duration within 100 ms; selected speech must match at time zero within the waveform test's sensitivity. The default correlation floor is 0.99 at a 6 kHz mono comparison rate, suitable for speech encoded to AAC; it is a signal test, not a voice-identity test. Inspect failures rather than lowering the threshold to conceal retiming.

## Visual-review readback

Open every generated frame and compare it to `expectedState`. Review critical views at full size; check relevant action/transition intervals in playback separately. Fill `review.json` only after actually inspecting the associated frames: set each cue's `reviewed` to true and write a concrete observation. Set `scope` to the review actually performed. Keep the generated hashes unchanged.

```sh
python /path/to/skill/scripts/presentation_qa.py release /private/project/film.json /private/project/qa-v1
```

This checks current manifest/film/master/frame hashes and complete frame-review coverage. It writes `release-review.json` with the scope and explicit limits. It does **not** certify full playback or human listening; those need separate evidence and all product/runtime gates still apply. Do not fill review fields automatically because the numerical checks passed. If an artifact changes, audit into a new directory and perform affected review again.

## Evidence to keep beside this report

- Source provenance and environment; exact consent/selection status privately.
- Measured capture timestamps and render/cache keys.
- Speech-content review, including ambiguous names/numbers and any ASR limitations.
- Clipping and dropout checks, with intentional silence separated from missing speech.
- All narrated-state frames plus critical transition/playback observations.
- Native PowerPoint checks for PPTX/PPSX when requested.
- Delivered derivative checksum, provider readback and truthful playback scope.

Keep failed and superseded reports. A QA JSON file is an auditable record of checks and observations, not a tamper-proof certificate or an approval token.
