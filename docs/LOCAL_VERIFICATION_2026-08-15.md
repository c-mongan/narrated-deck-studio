# Local verification — 2026-08-15

This file records evidence from the current macOS development machine. It is not a production, Cowork, Windows or native PowerPoint release claim.

## Verified locally

- Narrated Deck Studio 0.3.0 installed as the same eight-tool stdio MCP runtime for Codex and Hermes Agent.
- Hermes connected to the runtime and enumerated all eight tools; Codex persisted the enabled server registration.
- The portable Narrated Deck Studio skill is installed for both hosts.
- PPT Master v2.8.0 is installed for both hosts from exact commit `0c0bdaf0dd953afc2c00322e92f26dc02fc1c51f`; install receipts record the checkout and skill source.
- Required media/toolchain checks are 9/9, including loopback Voicebox, FFmpeg, LibreOffice and PDF rendering.
- TypeScript, legacy narration, studio, World Class Decks, schemas, MCP smoke and packaging tests pass; the npm high-severity audit reports zero vulnerabilities.

## Not verified on this machine

- Microsoft PowerPoint is not installed, so editable narration embedding, PPSX autoplay and playback fidelity cannot receive native macOS evidence here.
- WhisperX, Demucs, pyannote, scenedetect and MFA are not installed in the current isolated Python environment. The executable WhisperX adapter and fail-closed review gate are implemented, but a real aligned narration has not run here.
- The machine has limited free disk space, so the large locked media environment was not installed automatically.
- Cowork is not installed. MCPB packaging is validated, but signing and clean Cowork installation remain external release gates.
- Dad has not yet completed the zero-terminal first-user acceptance scenarios.
