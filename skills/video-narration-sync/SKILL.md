---
name: video-narration-sync
description: Synchronise an immutable narration master to screens, slides, labels, tooltips, captions, and speed ramps using forced alignment and frame-level QA.
---

# Video Narration Sync

Use this when every narrated idea must appear beside the correct product screen.

## Core rule

The approved narration is the immutable timeline. Never trim, cut, reorder,
concatenate, crossfade, or chapter-map its audio. Change only the video, slides,
labels, tooltips, cursor timing, captions, and visual speed.

## Workflow

1. Write one screen topic per narration paragraph using plain language.
2. Approve a single continuous narration master and save its SHA-256 checksum.
3. Force-align the approved transcript to the master. Prefer WhisperX word
   timestamps; use Montreal Forced Aligner when phoneme precision is needed.
4. Build a chapter manifest based on measured word/sentence timestamps, not word
   counts. Include audio and source-video ranges, readable holds, speed mode,
   labels, tooltip, and caption ranges.
5. Stretch or compress each visual chapter separately. Never apply one global
   speed factor to the full video.
6. Preserve narration speed by default. Give viewers more time through visual
   holds, earlier explanatory screens, simpler text, or a regenerated natural
   take; never slow the approved master to repair visual pacing.
7. Keep dedicated title cards visible for at least five seconds when the audio
   chapter permits it, and settled application screens visible for at least
   three seconds.
8. Show at most one tooltip and three small labels simultaneously. Keep labels
   short; make the tooltip explain why the visible control matters.
9. Use a 0.8–1.25 second visual crossfade between a slide and its product screen
   when a calmer transition is wanted. Subtract the overlap from visual timing;
   never extend, cut, or retime audio to accommodate the transition.
10. Mux the unmodified master from time zero as one full input.

## Visual timing modes

- `hold`: freeze while important writing is read
- `slow`: 0.75x–0.9x around an important action
- `normal`: 1x when the viewer follows normal use
- `skip`: remove or accelerate loading, dead time, and repeated scrolling

Keep cursor movement natural. Apply speed changes between actions, not halfway
through a click. Real screens are primary evidence; use slides or diagrams only
to introduce, clarify, compare, or summarise.

## Accessible pacing defaults

- Target 135–150 spoken words per minute for a general or older audience and
  use 165 WPM as a practical ceiling. Reject narration above 180 WPM for this
  use case.
- Hold a simple establishing screen for 6–8 seconds.
- Allow 10–15 seconds for one normal product screen and action.
- Allow 15–25 seconds for a complex admin screen, or split it into separate
  visible beats.
- Hold a settled screen 1.5–2.5 seconds before detail and 2–4 seconds after the
  result.
- Keep ordinary transitions around 0.6–1.0 seconds and meaningful browser
  interaction near 1x, with roughly 1.15x as the ceiling.

The screen values are conservative production heuristics, not universal
standards. Validate them with older and first-time viewers.

## QA gate

- sample the start, middle, and end of every chapter
- visible subject matches the spoken subject at all samples
- labels point to the intended control and do not hide it
- tooltip reading time is at least five seconds and roughly 15 characters/second
- captions match the same forced-alignment timeline
- final sentence and final card both complete before the video ends
- one full audio input is mapped from time zero
- assembly contains no `atrim`, audio `concat`, `acrossfade`, or chapter audio maps
- narration retains the approved master speed and duration
- transition overlap is represented in the chapter manifest
- duration differs from the approved master by no more than 50 ms
- no audio packet timestamp gap exceeds two encoded frames
- codecs, resolution, loudness, clipping, captions, and contact sheet pass review

Run:

```bash
node ../../scripts/verify_audio_continuity.mjs MASTER.wav FINAL.mp4
```

## Sources

- https://github.com/m-bain/whisperX
- https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner
- https://ffmpeg.org/ffmpeg-filters.html
- https://www.section508.gov/create/captions-transcripts/
- https://www.w3.org/WAI/older-users/developing/
- https://www.w3.org/WAI/WCAG20/Understanding/enough-time
- https://pubmed.ncbi.nlm.nih.gov/31580758/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9762622/
