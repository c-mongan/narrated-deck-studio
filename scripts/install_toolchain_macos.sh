#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v brew >/dev/null || { echo "Homebrew is required on macOS" >&2; exit 1; }
command -v uv >/dev/null || { echo "uv is required: https://docs.astral.sh/uv/" >&2; exit 1; }

brew install yt-dlp ffmpeg ffmpeg@7 sox mediainfo exiftool imagemagick mkvtoolnix micromamba tesseract libreoffice poppler jq go
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python -r requirements-media.txt
GOBIN="$HOME/.local/bin" go install github.com/steipete/songsee/cmd/songsee@latest

MFA_PREFIX="$HOME/.local/share/narrated-demo-toolkit/mfa"
micromamba create -y -p "$MFA_PREFIX" -c conda-forge montreal-forced-aligner

node scripts/toolchain.mjs
