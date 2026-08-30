import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { remotionWebpackOverride } from "../src/remotion-renderer.js";

test("source Remotion entry resolves NodeNext .js imports to TypeScript files", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const serveUrl = await bundle({
    entryPoint: path.join(root, "packages", "remotion-compositor", "src", "index.tsx"),
    webpackOverride: remotionWebpackOverride,
  });

  assert.ok(serveUrl);
});
