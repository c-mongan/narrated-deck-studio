import assert from "node:assert/strict";
import test from "node:test";
import { draftSeriesPlan } from "../src/series-planner.js";
import type { InventoryReport } from "../src/types.js";

const inventory: InventoryReport = {
  schemaVersion: 1, sourceRoot: "/tmp/source", scannedAt: new Date().toISOString(), ignored: [], warnings: [],
  items: [{ relativePath: "existing.pptx", canonicalPath: "/tmp/source/existing.pptx", kind: "powerpoint", extension: ".pptx", bytes: 10, sha256: "a".repeat(64), summary: "Deck", slideCount: 5, notesPresent: true, privacy: "normal", warnings: [] }],
};

test("planner distributes a total duration without losing seconds", () => {
  const plan = draftSeriesPlan(inventory, { audience: "Older first-time users", desiredAction: "Understand the service", outputCount: 3, totalDurationSeconds: 901, voiceSource: "preset" });
  assert.equal(plan.items.reduce((sum, item) => sum + item.targetDurationSeconds, 0), 901);
  assert.equal(plan.items[0]?.deckStrategy, "enhance-existing");
  assert.equal(plan.items[0]?.wordBudget, Math.floor(plan.items[0]!.targetDurationSeconds * 145 / 60));
  assert.equal(plan.unresolvedQuestions.length, 0);
});

test("planner requires one duration per requested output", () => {
  assert.throws(() => draftSeriesPlan(inventory, { audience: "A", desiredAction: "B", outputCount: 2, perOutputDurationSeconds: [60] }), /every output/);
});
