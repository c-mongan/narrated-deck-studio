import fs from "node:fs";
import { spawnSync } from "node:child_process";

const [audioPath, scriptPath] = process.argv.slice(2);
if (!audioPath) {
  console.error("Usage: node analyze_voice_naturalness.mjs AUDIO [SCRIPT.txt]");
  process.exit(2);
}

function run(command, args, encoding = "utf8") {
  const result = spawnSync(command, args, { encoding, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr?.toString() || `${command} failed`);
  return result;
}

const probe = JSON.parse(run("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate,channels,duration,codec_name:format=duration", "-of", "json", audioPath]).stdout);
const stream = probe.streams?.[0];
if (!stream) throw new Error("No audio stream found.");
const sampleRate = Number(stream.sample_rate);
const pcm = run("ffmpeg", ["-v", "error", "-i", audioPath, "-map", "0:a:0", "-ac", "1", "-ar", String(sampleRate), "-f", "f32le", "pipe:1"], null).stdout;
const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));

let sum = 0;
let sumSquares = 0;
let peak = 0;
let clipped = 0;
let zeroRun = 0;
let longestZeroRun = 0;
let longestZeroRunEnd = 0;
let maximumJump = 0;
const jumps = [];
for (let i = 0; i < samples.length; i += 1) {
  const value = samples[i];
  sum += value;
  sumSquares += value * value;
  peak = Math.max(peak, Math.abs(value));
  if (Math.abs(value) >= 0.999) clipped += 1;
  if (value === 0) {
    zeroRun += 1;
    if (zeroRun > longestZeroRun) {
      longestZeroRun = zeroRun;
      longestZeroRunEnd = i + 1;
    }
  } else zeroRun = 0;
  if (i > 0) {
    const jump = Math.abs(value - samples[i - 1]);
    maximumJump = Math.max(maximumJump, jump);
    if (i % 24 === 0) jumps.push(jump);
  }
}
jumps.sort((a, b) => a - b);
const percentile = (values, fraction) => values[Math.min(values.length - 1, Math.floor(values.length * fraction))] ?? 0;
const jumpP999 = percentile(jumps, 0.999);

const windowSize = Math.max(1, Math.round(sampleRate * 0.02));
const windowDb = [];
for (let start = 0; start < samples.length; start += windowSize) {
  let squares = 0;
  const end = Math.min(samples.length, start + windowSize);
  for (let i = start; i < end; i += 1) squares += samples[i] * samples[i];
  windowDb.push(20 * Math.log10(Math.max(Math.sqrt(squares / (end - start)), 1e-9)));
}
windowDb.sort((a, b) => a - b);

const silenceLog = run("ffmpeg", ["-hide_banner", "-i", audioPath, "-af", "silencedetect=noise=-36dB:d=0.12", "-f", "null", "-"], "utf8").stderr;
const pauses = [...silenceLog.matchAll(/silence_duration: ([0-9.]+)/g)].map((match) => Number(match[1]));
const duration = Number(stream.duration ?? probe.format?.duration);
const words = scriptPath ? (fs.readFileSync(scriptPath, "utf8").trim().match(/[\p{L}\p{N}’'-]+/gu) ?? []).length : null;
const wordsPerMinute = words === null ? null : (words * 60) / duration;
const zeroAtEdge = longestZeroRunEnd === samples.length || longestZeroRunEnd - longestZeroRun === 0;

const metrics = {
  duration_seconds: Number(duration.toFixed(6)),
  codec: stream.codec_name,
  sample_rate: sampleRate,
  channels: Number(stream.channels),
  peak_dbfs: Number((20 * Math.log10(Math.max(peak, 1e-9))).toFixed(2)),
  rms_dbfs: Number((20 * Math.log10(Math.max(Math.sqrt(sumSquares / samples.length), 1e-9))).toFixed(2)),
  dc_offset: Number((sum / samples.length).toFixed(7)),
  clipped_sample_percent: Number(((clipped / samples.length) * 100).toFixed(6)),
  longest_digital_zero_seconds: Number((longestZeroRun / sampleRate).toFixed(6)),
  longest_digital_zero_start_seconds: Number(((longestZeroRunEnd - longestZeroRun) / sampleRate).toFixed(6)),
  longest_digital_zero_at_file_edge: zeroAtEdge,
  maximum_adjacent_sample_jump: Number(maximumJump.toFixed(6)),
  jump_outlier_ratio: Number((maximumJump / Math.max(jumpP999, 1e-9)).toFixed(2)),
  window_dynamic_range_db_p95_p10: Number((percentile(windowDb, 0.95) - percentile(windowDb, 0.1)).toFixed(2)),
  detected_pauses_over_120ms_at_minus36db: pauses.length,
  detected_pause_seconds: Number(pauses.reduce((total, value) => total + value, 0).toFixed(3)),
  script_words: words,
  words_per_minute: wordsPerMinute === null ? null : Number(wordsPerMinute.toFixed(1)),
};

const findings = [];
if (metrics.clipped_sample_percent > 0.001) findings.push("possible clipping");
if (Math.abs(metrics.dc_offset) > 0.01) findings.push("high DC offset");
if (metrics.longest_digital_zero_seconds > 0.02 && !zeroAtEdge) findings.push("internal digital-zero gap may indicate an edit or dropout");
if (metrics.jump_outlier_ratio > 12 && metrics.maximum_adjacent_sample_jump > 0.5) findings.push("abrupt waveform jump needs listening review");
if (metrics.words_per_minute !== null && metrics.words_per_minute > 190) findings.push("pace is fast for a general or older audience");
if (metrics.words_per_minute !== null && metrics.words_per_minute < 105) findings.push("pace is unusually slow");

console.log(JSON.stringify({
  passed_technical_checks: findings.every((finding) => finding.includes("pace")),
  metrics,
  findings,
  interpretation: "Metrics detect artifacts and pacing risks; they cannot prove a synthetic voice sounds human. Final approval requires blind listening against authorised references.",
}, null, 2));
