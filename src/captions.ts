import { writeFile } from "node:fs/promises";

export interface CaptionCue { start: number; end: number; text: string }

function timestamp(seconds: number, separator: "." | ","): string {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds % 3_600_000 / 60_000);
  const secs = Math.floor(milliseconds % 60_000 / 1000);
  const ms = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}${separator}${String(ms).padStart(3, "0")}`;
}

export function toSrt(cues: CaptionCue[]): string {
  return `${cues.map((cue, index) => `${index + 1}\n${timestamp(cue.start, ",")} --> ${timestamp(cue.end, ",")}\n${cue.text.trim()}\n`).join("\n")}\n`;
}

export function toVtt(cues: CaptionCue[]): string {
  return `WEBVTT\n\n${cues.map((cue) => `${timestamp(cue.start, ".")} --> ${timestamp(cue.end, ".")}\n${cue.text.trim()}\n`).join("\n")}\n`;
}

export async function writeCaptions(cues: CaptionCue[], srtPath: string, vttPath: string): Promise<void> {
  let previousEnd = 0;
  for (const cue of cues) {
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < previousEnd || cue.end <= cue.start) throw new Error("Caption cues must be chronological and non-overlapping");
    previousEnd = cue.end;
  }
  await writeFile(srtPath, toSrt(cues), { mode: 0o600 });
  await writeFile(vttPath, toVtt(cues), { mode: 0o600 });
}
