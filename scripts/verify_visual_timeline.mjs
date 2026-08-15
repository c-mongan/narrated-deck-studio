import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const [video, renders, timingsJson] = process.argv.slice(2);
if (!video || !renders || !timingsJson) throw new Error("usage: verify_visual_timeline.mjs VIDEO RENDERS TIMINGS_JSON");
const timings = JSON.parse(timingsJson);
const images = readdirSync(renders).filter((name) => /\.png$/i.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((name) => path.join(renders, name));
if (images.length !== timings.length) throw new Error("render count does not match timeline");
const temporary = mkdtempSync(path.join(os.tmpdir(), "nds-visual-timeline-"));
const samples = [];
try {
  for (let index = 0; index < timings.length; index += 1) {
    const timing = timings[index];
    const sampleTime = Number(timing.start) + (Number(timing.end) - Number(timing.start)) / 2;
    const frame = path.join(temporary, `frame-${index + 1}.png`);
    const extract = spawnSync("ffmpeg", ["-v", "error", "-ss", sampleTime.toFixed(3), "-i", video, "-frames:v", "1", "-y", frame], { encoding: "utf8", shell: false });
    if (extract.status !== 0) throw new Error(extract.stderr || "frame extraction failed");
    const compare = spawnSync("ffmpeg", ["-hide_banner", "-i", frame, "-i", images[index], "-lavfi", "[0:v]scale=320:180[v];[1:v]scale=320:180[s];[v][s]ssim", "-f", "null", "-"], { encoding: "utf8", shell: false });
    const match = `${compare.stderr}\n${compare.stdout}`.match(/All:([0-9.]+)/);
    const ssim = Number(match?.[1]);
    if (compare.status !== 0 || !Number.isFinite(ssim)) throw new Error("SSIM comparison failed");
    samples.push({ slide: index + 1, sampleTime, ssim });
  }
} finally { rmSync(temporary, { recursive: true, force: true }); }
const passed = samples.every((sample) => sample.ssim >= 0.35);
console.log(JSON.stringify({ passed, threshold: 0.35, samples }, null, 2));
if (!passed) process.exit(1);
