# Tested Toolchain Versions

Compatibility baseline captured on 2026-08-15 (macOS, Apple Silicon).

The Python graph is immutable in `requirements-media.lock`: every transitive
version and distribution hash is recorded. Songsee and MFA are pinned directly
by the installer. Homebrew does not provide immutable historical bottles for
unversioned formulae, so the installer may resolve newer native tools; the
doctor executes every resolved binary and this baseline records the exact set
used for release verification.

| Component | Verified version |
|---|---:|
| yt-dlp | 2026.7.4 |
| FFmpeg | 9.0.1 |
| FFmpeg compatibility libraries | 7.1.5_2 |
| SoX | 14.4.2_6 |
| MediaInfo | 26.05 |
| ExifTool | 13.55_1 |
| ImageMagick | 7.1.2-29 |
| MKVToolNix | 100.0_1 |
| micromamba | 2.8.1 |
| Tesseract | 5.5.3 |
| Poppler | 25.12.0 |
| jq | 1.8.1 |
| Go | 1.26.3 |
| LibreOffice | 26.2.5 |
| Songsee | v0.1.1 |
| Montreal Forced Aligner | 3.4.1 |

To reproduce the Python environment exactly:

```bash
uv venv --python 3.11 .venv
uv pip sync --python .venv/bin/python requirements-media.lock
```

To refresh the lock intentionally after changing direct requirements:

```bash
uv pip compile requirements-media.txt --python .venv/bin/python \
  --generate-hashes -o requirements-media.lock
```
