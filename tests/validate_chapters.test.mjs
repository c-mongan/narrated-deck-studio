import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateChapters } from "../scripts/validate_chapters.mjs";

test("example chapter manifest is valid", () => {
  const manifest = JSON.parse(fs.readFileSync(new URL("../templates/chapter-manifest.example.json", import.meta.url)));
  assert.deepEqual(validateChapters(manifest), []);
});

test("overlaps, excessive labels, and unreadable tooltips fail", () => {
  const manifest = {
    schema_version: 1,
    audio_master: "/private/master.wav",
    audio_sha256: "a".repeat(64),
    chapters: [
      { id: "a", title: "A", audio_start: 0, audio_end: 5, source_video: "x", minimum_readable_seconds: 3, speed: "normal" },
      { id: "b", title: "B", audio_start: 4, audio_end: 8, source_video: "x", minimum_readable_seconds: 3, speed: "slow", labels: [{}, {}, {}, {}], tooltip: { text: "This needs more reading time", start: 0, end: 1 } }
    ]
  };
  const errors = validateChapters(manifest);
  assert(errors.some((error) => error.includes("overlaps")));
  assert(errors.some((error) => error.includes("three labels")));
  assert(errors.some((error) => error.includes("long enough")));
});
