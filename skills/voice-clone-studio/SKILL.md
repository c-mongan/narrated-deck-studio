---
name: voice-clone-studio
description: Create permission-safe, natural cloned narration with local generation, blind take selection, provenance, and an immutable continuous master.
---

# Voice Clone Studio

Use this only when the speaker has explicitly permitted the proposed voice use.

## Non-negotiable safety gate

1. Record permission scope and verifier in a private job manifest.
2. Reject deception, fraud, political persuasion, authentication bypass, or any
   attempt to present synthetic speech as live speech.
3. Add an AI-generated narration disclosure to the deliverable.
4. Keep references local unless the speaker specifically approves a cloud tool.

## Reference preparation

Select two or three 10–30 second samples containing one speaker, natural pace,
minimal noise, no music, and no overlapping speech. Verify exact transcripts.
Match the reference's delivery to the desired narration; a fast reference usually
produces a fast clone. Avoid aggressive denoising or pitch manipulation.

## Generation and selection

1. Write short spoken sentences with one idea per breath.
2. Use chapter-sized test generations only to audition wording, pronunciation,
   reference samples, and engine settings.
3. Generate at least two full-script continuous takes using different seeds.
4. Blind-score identity, naturalness, pronunciation, pace, noise, and emotional
   fit. Reject unstable or incomplete takes.
5. Select one returned audio file as the immutable master. Do not assemble the
   approved master from chapter files or repair it by cutting and splicing.
6. Apply only light loudness normalisation. Treat tempo changes beyond about 8%
   as failed generation and regenerate at a natural pace.
7. Save engine/model/version, seed, settings, references by opaque alias,
   generation ID, script checksum, master checksum, and approval decision.

An engine may internally process text in chunks. “Continuous master” here means
one complete generated take returned by the engine and used whole throughout
editing, with no editorial trimming, rearrangement, concatenation, or crossfade.

## Engine comparison

- Start with Qwen3-TTS 1.7B Base when locally available.
- A/B against Chatterbox if pacing or expression is weak. Its watermark is a
  useful responsible-use feature.
- Do not use F5-TTS pretrained weights for commercial work without licence
  review; code and weights have different terms.
- Consider TADA for unusually long narration only after local evaluation.

Do not download multi-gigabyte models without checking storage and approval.

## Final QA

- spoken words match the approved script
- speaker permission and disclosure are present
- no skipped words, clicks, clipping, unstable pitch, or artificial pauses
- duration, sample rate, channels, loudness, and checksum are recorded
- selected master is one complete generated file
- rejected takes are clearly separated and retained only as agreed

Run `../../scripts/analyze_voice_naturalness.mjs MASTER.wav SCRIPT.txt` before
editing. Review clipping, DC offset, internal digital-zero gaps, abrupt waveform
jumps, dynamic range, pause structure, and words per minute. Preserve the
engine's natural speed; if pace is unsuitable, reject and regenerate the take
instead of repairing it with a large tempo change.

Forensic metrics can find artifacts but cannot prove a voice sounds human.
Blind listening against authorised references remains mandatory. Compare takes
without telling reviewers which engine or seed produced each one.

Use `../../scripts/voicebox_generate.sh` for reproducible Voicebox generation.
Never place its profile ID, input recording, or output inside this repository.

## Sources

- https://docs.voicebox.sh/overview/voice-cloning
- https://github.com/jamiepine/voicebox
- https://github.com/QwenLM/Qwen3-TTS
- https://github.com/resemble-ai/chatterbox
- https://github.com/SWivid/F5-TTS
