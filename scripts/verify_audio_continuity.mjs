import { spawnSync } from "node:child_process";

const [masterPath, finalPath] = process.argv.slice(2);
if (!masterPath || !finalPath) {
  console.error("Usage: node verify_audio_continuity.mjs MASTER_AUDIO FINAL_VIDEO");
  process.exit(2);
}

function ffprobe(args) {
  const result = spawnSync("ffprobe", ["-v", "error", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr || "ffprobe failed");
  return result.stdout.trim();
}

function duration(path, selector = "format") {
  if (selector === "audio") {
    return Number(ffprobe(["-select_streams", "a:0", "-show_entries", "stream=duration", "-of", "default=nw=1:nk=1", path]));
  }
  return Number(ffprobe(["-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path]));
}

const masterDuration = duration(masterPath);
let finalDuration = duration(finalPath, "audio");
if (!Number.isFinite(finalDuration)) finalDuration = duration(finalPath);
const durationDifference = Math.abs(masterDuration - finalDuration);
const packetJson = JSON.parse(ffprobe([
  "-select_streams", "a:0", "-show_packets",
  "-show_entries", "packet=pts_time,duration_time", "-of", "json", finalPath,
]));

let largestGap = 0;
let previousEnd = null;
for (const packet of packetJson.packets ?? []) {
  const start = Number(packet.pts_time);
  const packetDuration = Number(packet.duration_time);
  if (!Number.isFinite(start) || !Number.isFinite(packetDuration)) continue;
  if (previousEnd !== null) largestGap = Math.max(largestGap, start - previousEnd);
  previousEnd = start + packetDuration;
}

const packets = packetJson.packets?.length ?? 0;
const nominalFrame = packets > 0 ? finalDuration / packets : 0;
const allowedGap = Math.max(0.05, nominalFrame * 2);
const passed = durationDifference <= 0.05 && largestGap <= allowedGap;
console.log(JSON.stringify({ passed, masterDuration, finalDuration, durationDifference, packets, largestGap, allowedGap }, null, 2));
if (!passed) process.exit(1);
