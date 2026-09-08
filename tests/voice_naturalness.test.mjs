import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

// PCM fixture: long edge padding must not hide a shorter internal dropout.
test("internal digital silence remains detectable behind longer edge padding", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nds-voice-audit-"));
  try {
    const rate = 16000, count = rate * 2;
    for (const dropout of [false, true]) {
      const wav = Buffer.alloc(44 + count * 2);
      wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
      wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
      wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(count * 2, 40);
      for (let i = 0; i < count; i++) {
        const silent = i < rate / 4 || i >= count - rate / 4 || (dropout && i >= rate && i < rate * 1.05);
        wav.writeInt16LE(silent ? 0 : Math.round(5000 * Math.sin(2 * Math.PI * 127 * i / rate)), 44 + i * 2);
      }
      const audio = path.join(dir, "fixture.wav"); writeFileSync(audio, wav);
      const result = spawnSync(process.execPath, ["scripts/analyze_voice_naturalness.mjs", audio], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.passed_technical_checks, !dropout);
      assert.equal(report.findings.some(x => x.includes("internal digital-zero")), dropout);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
