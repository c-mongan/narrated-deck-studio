"""Force-align an approved narration script to its immutable audio master."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 6:
        raise SystemExit("usage: align_approved_script.py AUDIO SCRIPT OUTPUT LANGUAGE DEVICE")
    audio_path, script_path, output_path, language, device = sys.argv[1:]
    import whisperx

    text = Path(script_path).read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError("approved script is empty")
    audio = whisperx.load_audio(audio_path)
    duration = len(audio) / 16000
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]
    weights = [max(1, len(sentence.split())) for sentence in sentences]
    total = sum(weights)
    cursor = 0.0
    segments = []
    for index, (sentence, weight) in enumerate(zip(sentences, weights)):
        end = duration if index == len(sentences) - 1 else cursor + duration * weight / total
        segments.append({"text": sentence, "start": cursor, "end": end})
        cursor = end
    model, metadata = whisperx.load_align_model(language_code=language, device=device)
    result = whisperx.align(segments, model, metadata, audio, device, return_char_alignments=False)
    Path(output_path).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
