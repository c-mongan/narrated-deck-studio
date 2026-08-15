#!/usr/bin/env bash
set -euo pipefail

voicebox_server="${VOICEBOX_SERVER:-/Applications/Voicebox.app/Contents/MacOS/voicebox-server}"
voicebox_host="${VOICEBOX_HOST:-127.0.0.1}"
voicebox_port="${VOICEBOX_PORT:-17493}"
voicebox_data="${VOICEBOX_DATA_DIR:-$HOME/Library/Application Support/sh.voicebox.app}"

if [[ ! -x "$voicebox_server" ]]; then
  echo "Voicebox server not found at: $voicebox_server" >&2
  exit 1
fi

exec "$voicebox_server" \
  --host "$voicebox_host" \
  --port "$voicebox_port" \
  --data-dir "$voicebox_data"
