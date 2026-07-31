# Dependency and model licensing notes

The MIT licence in this repository covers only the original scripts and text in
this repository. Tools and model weights keep their own licences.

- FFmpeg builds vary by enabled libraries and licence configuration.
- Qwen3-TTS and Voicebox must be reviewed using the exact version deployed.
- Chatterbox includes responsible-AI watermarking; review its current licence.
- F5-TTS code and pretrained model weights have different terms. Its published
  pretrained weights have been described as non-commercial; do not assume they
  are suitable for commercial or board deliverables.
- WhisperX, faster-whisper, wav2vec2 alignment models, Montreal Forced Aligner,
  and Rubber Band must each be reviewed for the versions and models installed.

Record exact versions and licences in every production job manifest.
