import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { narratedDurationInFrames } from "../packages/remotion-compositor/src/NarratedSlides.js";
import { remotionWebpackOverride } from "../src/remotion-renderer.js";

test("Remotion duration preserves the full approved audio master", () => {
  assert.equal(narratedDurationInFrames({
    fps: 30,
    durationSeconds: 43.04,
    audioMaster: "master.wav",
    slides: [{ image: "slide.png", start: 29.65, end: 42.539 }],
    captions: [],
  }), 1290);
});

test("source Remotion entry resolves NodeNext .js imports to TypeScript files", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const serveUrl = await bundle({
    entryPoint: path.join(root, "packages", "remotion-compositor", "src", "index.tsx"),
    webpackOverride: remotionWebpackOverride,
  });

  assert.ok(serveUrl);
});
