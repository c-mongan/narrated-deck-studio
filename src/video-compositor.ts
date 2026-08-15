import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SlideTiming } from "./powerpoint-narration.js";

function ffconcatPath(value: string): string { return value.replace(/'/g, "'\\''"); }

export async function composeNarratedSlides(options: {
  images: string[];
  timings: SlideTiming[];
  audioMaster: string;
  captions?: string;
  output: string;
}): Promise<void> {
  if (options.images.length !== options.timings.length) throw new Error("One rendered image is required for every timed slide");
  await mkdir(path.dirname(options.output), { recursive: true });
  const concatPath = path.join(path.dirname(options.output), `${path.basename(options.output)}.slides.ffconcat`);
  const lines = ["ffconcat version 1.0"];
  for (let index = 0; index < options.images.length; index += 1) {
    const duration = options.timings[index]!.end - options.timings[index]!.start;
    if (!(duration > 0)) throw new Error("Slide durations must be positive");
    lines.push(`file '${ffconcatPath(path.resolve(options.images[index]!))}'`, `duration ${duration.toFixed(6)}`);
  }
  lines.push(`file '${ffconcatPath(path.resolve(options.images.at(-1)!))}'`);
  await writeFile(concatPath, `${lines.join("\n")}\n`, { mode: 0o600 });
  const args = ["-hide_banner", "-nostdin", "-y", "-safe", "0", "-f", "concat", "-i", concatPath, "-i", options.audioMaster];
  const filters = ["scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,format=yuv420p"];
  if (options.captions) filters.push(`subtitles=${options.captions.replace(/([\\:'])/g, "\\$1")}`);
  args.push("-vf", filters.join(","), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", options.output);
  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"], shell: false });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-20_000); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg composition failed (${code}): ${stderr}`)));
  });
}
