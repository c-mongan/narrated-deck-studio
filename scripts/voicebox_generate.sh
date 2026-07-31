#!/usr/bin/env bash
set -euo pipefail

if [[ "${VOICE_PERMISSION_CONFIRMED:-}" != "yes" ]]; then
  echo "Set VOICE_PERMISSION_CONFIRMED=yes only after speaker approval." >&2
  exit 2
fi

: "${VOICEBOX_PROFILE_ID:?Set VOICEBOX_PROFILE_ID outside git}"
: "${VOICEBOX_TEXT_FILE:?Set VOICEBOX_TEXT_FILE}"
: "${VOICEBOX_OUTPUT_FILE:?Set VOICEBOX_OUTPUT_FILE outside git}"

voicebox_url="${VOICEBOX_URL:-http://127.0.0.1:17493}"
voicebox_engine="${VOICEBOX_ENGINE:-qwen}"
voicebox_model="${VOICEBOX_MODEL:-qwen-tts-1.7B}"
voicebox_seed="${VOICEBOX_SEED:-42}"
voicebox_chunk_chars="${VOICEBOX_CHUNK_CHARS:-360}"
voicebox_crossfade_ms="${VOICEBOX_CROSSFADE_MS:-80}"

curl -fsS "${voicebox_url}/health" >/dev/null
request_file="$(mktemp)"
trap 'rm -f "$request_file"' EXIT

jq -n --rawfile text "$VOICEBOX_TEXT_FILE" \
  --arg profile_id "$VOICEBOX_PROFILE_ID" \
  --arg engine "$voicebox_engine" \
  --arg model "$voicebox_model" \
  --argjson seed "$voicebox_seed" \
  --argjson max_chunk_chars "$voicebox_chunk_chars" \
  --argjson crossfade "$voicebox_crossfade_ms" \
  '{text:$text,profile_id:$profile_id,language:"en",engine:$engine,model:$model,seed:$seed,max_chunk_chars:$max_chunk_chars,crossfade:$crossfade,normalize:true}' >"$request_file"

generation_id="$(curl -fsS -X POST "${voicebox_url}/generate" -H "Content-Type: application/json" --data-binary "@${request_file}" | jq -r '.id')"
if [[ -z "$generation_id" || "$generation_id" == "null" ]]; then
  echo "Voicebox did not return a generation id." >&2
  exit 3
fi

while true; do
  state="$(curl -fsS "${voicebox_url}/history/${generation_id}" | jq -r '.status // .state // "unknown"')"
  case "$state" in
    completed|complete|success) break ;;
    failed|error|cancelled) echo "Generation ${generation_id} ended with ${state}." >&2; exit 4 ;;
  esac
  sleep 2
done

curl -fsS "${voicebox_url}/audio/${generation_id}" -o "$VOICEBOX_OUTPUT_FILE"
echo "$generation_id"
