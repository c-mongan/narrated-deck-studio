import assert from "node:assert/strict";
import test from "node:test";
import { draftSeriesPlan } from "../src/series-planner.js";
import type { InventoryReport } from "../src/types.js";

const inventory: InventoryReport = {
  schemaVersion: 1, sourceRoot: "/tmp/source", scannedAt: new Date().toISOString(), ignored: [], warnings: [],
  items: [{ relativePath: "existing.pptx", canonicalPath: "/tmp/source/existing.pptx", kind: "powerpoint", extension: ".pptx", bytes: 10, sha256: "a".repeat(64), summary: "Deck", slideCount: 5, notesPresent: true, privacy: "normal", warnings: [] }],
};

test("planner distributes a total duration without losing seconds", () => {
  const plan = draftSeriesPlan(inventory, { audience: "Older first-time users", desiredAction: "Understand the service", outputCount: 3, sourceGroups: [["existing.pptx"], ["existing.pptx"], ["existing.pptx"]], totalDurationSeconds: 901, voiceSource: "preset" });
  assert.equal(plan.items.reduce((sum, item) => sum + item.targetDurationSeconds, 0), 901);
  assert.equal(plan.items[0]?.deckStrategy, "enhance-existing");
  assert.equal(plan.items[0]?.wordBudget, Math.floor(plan.items[0]!.targetDurationSeconds * 145 / 60));
  assert.equal(plan.unresolvedQuestions.length, 0);
});

test("planner requires one duration per requested output", () => {
  assert.throws(() => draftSeriesPlan(inventory, { audience: "A", desiredAction: "B", outputCount: 2, sourceGroups: [["existing.pptx"], ["existing.pptx"]], perOutputDurationSeconds: [60] }), /every output/);
});

test("planner defaults to one narrated deliverable set per PowerPoint", () => {
  const multiDeckInventory: InventoryReport = {
    ...inventory,
    items: ["Sales Q1.pptx", "Sales Q2.pptx", "Sales Q3.pptx"].map((relativePath, index) => ({
      ...inventory.items[0]!, relativePath, canonicalPath: `/tmp/source/${relativePath}`, sha256: String(index + 1).repeat(64),
    })),
  };
  const plan = draftSeriesPlan(multiDeckInventory, { audience: "Leadership", desiredAction: "Understand each quarter", voiceSource: "preset" });
  assert.equal(plan.items.length, 3);
  assert.deepEqual(plan.items.map((item) => item.sourceDeck), ["Sales Q1.pptx", "Sales Q2.pptx", "Sales Q3.pptx"]);
  assert.deepEqual(plan.items.map((item) => item.title), ["Sales Q1", "Sales Q2", "Sales Q3"]);
  assert.ok(plan.items.every((item) => item.deliverables.includes("mp4")));
});

test("custom grouping cannot silently drop a discovered PowerPoint", () => {
  const multiDeckInventory: InventoryReport = {
    ...inventory,
    items: ["one.pptx", "two.pptx"].map((relativePath, index) => ({ ...inventory.items[0]!, relativePath, canonicalPath: `/tmp/${relativePath}`, sha256: String(index + 1).repeat(64) })),
  };
  assert.throws(() => draftSeriesPlan(multiDeckInventory, { audience: "A", desiredAction: "B", outputMode: "custom", sourceGroups: [["one.pptx"]], voiceSource: "preset" }), /cannot silently omit/);
});
