---
name: narrated-product-demo
description: Orchestrate a consented cloned voice, simple narration, real product footage, semantic alignment, accessible annotations, captions, and release QA into a board-ready walkthrough.
---

# Narrated Product Demo

This is the end-to-end entrypoint. Follow the linked skills; do not bypass their
consent or immutable-audio rules.

## Phase 1: define the story

1. Name the audience and one decision the video should help them make.
2. Choose a small real journey: problem, public/member experience, admin action,
   result, and honest readiness boundary.
3. Write in simple spoken language. Explain jargon before using it.
4. Make one screen topic per paragraph and one chapter per user job.

## Phase 2: create the narration

Follow `../voice-clone-studio/SKILL.md`. When the source is a voice message or an
authorised YouTube video, also follow `../forensic-slide-alignment/SKILL.md` for
consent-gated ingestion, speaker isolation, measured word timing and provenance.

Stop unless speaker permission is recorded privately. Generate audition clips,
then at least two full continuous takes. Approve one natural take and checksum it.
Do not slow a poor take aggressively and do not splice an approved master.

## Phase 3: capture evidence

Record the real product at a readable resolution. Capture clean end-to-end flows,
including success and useful safety/error states. Remove credentials and personal
data. Slides and diagrams may clarify context but cannot replace product proof.

## Phase 4: align and assemble

Follow `../video-narration-sync/SKILL.md`.

Force-align the transcript. Populate the chapter manifest. Arrange visuals around
the immutable master. Add large plain labels, one readable tooltip at a time,
selectable captions, and deliberate holds. Use comparisons only when they help the
viewer understand an improvement.

## Phase 5: audit like a first-time viewer

1. Watch once without sound: is every action understandable?
2. Listen once without video: is the story understandable?
3. Watch at normal speed on a laptop and phone-sized viewport.
4. Check chapter start/middle/end frames and export a timestamped contact sheet.
5. Run job-manifest validation and audio-continuity verification.
6. Have a person unfamiliar with the product explain what happened after viewing.
7. Fix confusing language, fast transitions, tiny labels, inaccurate claims,
   obstructed controls, and missing readiness boundaries.

## Delivery bundle

- final H.264/AAC MP4 with selectable captions
- caption file and approved narration script
- editable slides/diagrams, if used
- redacted chapter manifest and QA report
- private job manifest, consent evidence, references, and checksums stored outside git
- clear AI narration disclosure
