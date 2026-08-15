---
name: forensic-slide-alignment
description: Use when matching authorised narration to PowerPoint slides with measured word timing, confidence scores, provenance and human review.
version: 1.0.0
author: Narrated Demo Toolkit
license: MIT
metadata:
  hermes:
    tags: [audio, powerpoint, alignment, provenance, video]
    related_skills: [voice-clone-studio, video-narration-sync, narrated-product-demo]
---

# Forensic Slide Alignment

## Overview

Build an auditable narration-to-slide timeline. “Forensic” means reproducible
source provenance, checksums, measured timestamps and reviewable calculations. It
does not mean biometric speaker identification or legal proof of identity.

## When to use

Use for a consented voice message or authorised YouTube source that must become a
Voicebox narration, PowerPoint deck and accurately synchronised video.

Do not use public availability as permission to clone a speaker. Stop unless the
speaker has explicitly authorised the intended synthetic use.

## Workflow

1. **Gate consent.** Record scope, verifier and disclosure in the private job
   manifest. Completion: the intended voice, audience and use are all covered.
2. **Ingest privately.** Run `npm run ingest -- SOURCE --output PRIVATE_DIR
   --voice-reference --speaker-consent`. Completion: WAV, source metadata and
   ingest manifest exist outside git.
3. **Clean the reference.** Use Demucs for music/effects and pyannote.audio for
   multi-speaker material. Completion: one authorised speaker, no overlapping
   speech, no misleading edits and an exact transcript.
4. **Generate with Voicebox.** Follow `../voice-clone-studio/SKILL.md`. Approve one
   continuous master; store its checksum and generation provenance privately.
5. **Align words.** Run WhisperX on that exact master and approved transcript.
   Use MFA only for passages where phoneme precision is needed. Completion: every
   spoken sentence has measured start/end timestamps and low-confidence words are
   listed for review.
6. **Prepare slides.** Create or import the `.pptx`, extract slide text, render via
   LibreOffice to PDF and Poppler to images. Completion: extracted text and every
   rendered slide have been reviewed for missing or clipped content.
7. **Calculate candidates.** Run `npm run match-slides -- slides.json
   transcript.json alignment.json`. Completion: every narration segment maps to a
   monotonically ordered slide with a score and review flag.
8. **Review semantics.** Manually accept or correct every weak match and any strong
   lexical match whose meaning is wrong. Completion: no `reviewRequired` mapping
   remains unresolved.
9. **Build around audio.** Treat the approved master as immutable. Change slide
   holds, transitions, labels and footage—not narration order or speed.
10. **Verify.** Run audio-continuity checks, compare master/final duration, inspect
    captions and sample start/middle/end frames for every chapter. Completion:
    timing drift is within the project gate and every sentence matches the visible
    subject.

## Evidence bundle

- source locator or redacted filename plus SHA-256
- extraction command and metadata
- permission record and disclosure decision
- Voicebox model/settings, opaque profile alias and generation ID
- approved script and master checksum
- WhisperX/MFA timing output with confidence data
- slide text, slide renders and alignment report
- final captions, chapter manifest, contact sheet and continuity report

Keep private speaker data, profile IDs, recordings and unreleased footage outside
GitHub.

## Common pitfalls

1. **Lexical score presented as semantic truth.** Scores prioritise review; a person
   must confirm the slide actually supports the sentence.
2. **Diarisation treated as identity proof.** It separates speaker turns; it does
   not prove who a person is.
3. **Narration repaired in editing.** Reject and regenerate a bad take rather than
   splicing or heavily stretching the approved master.
4. **Model download mistaken for readiness.** Run a short real alignment before a
   production job; package installation alone is not evidence that gated models
   or credentials work.
5. **Source permissions omitted.** Download rights and voice-cloning permission are
   separate requirements.

## Verification checklist

- [ ] `npm run doctor` reports every required and recommended dependency ready
- [ ] speaker permission covers the exact synthetic use
- [ ] source and approved-master checksums recorded
- [ ] all low-confidence words and slide mappings reviewed
- [ ] narration master remains one continuous unmodified input
- [ ] captions and visual timeline derive from the accepted alignment
- [ ] final combined, audio-only and visual-only reviews pass
