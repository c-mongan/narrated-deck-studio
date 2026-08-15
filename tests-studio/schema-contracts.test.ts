import assert from "node:assert/strict";
import test from "node:test";
import { validateJsonValue } from "../src/validation.js";

test("all public persisted contracts have executable JSON schemas", async () => {
  const now = new Date().toISOString();
  await validateJsonValue("inventory", { schemaVersion: 1, sourceRoot: "/tmp/source", scannedAt: now, items: [], ignored: [], warnings: [] });
  await validateJsonValue("series-plan", { schemaVersion: 1, createdAt: now, audience: "A", desiredAction: "B", style: "calm", voiceSource: "preset", disclosure: "AI", items: [{ id: "item-01", title: "Deck", purpose: "Explain", targetDurationSeconds: 60, wordBudget: 145, slideBudget: 4, sourcePriorities: [], sourceDecks: [], deckStrategy: "create-new", scriptStatus: "not-started", deliverables: ["pptx", "mp4"] }], conceptTerritories: ["a", "b", "c"].map((id) => ({ id, name: id, direction: id })), unresolvedQuestions: [] });
  await validateJsonValue("approval-receipt", { schemaVersion: 1, gate: "plan", subjectHash: "a".repeat(64), decision: "approved", actor: "Dad", decidedAt: now });
  await validateJsonValue("timeline", { schemaVersion: 1, itemId: "item-01", audioMaster: "/tmp/master.wav", audioSha256: "b".repeat(64), slides: [{ slide: 1, start: 0, end: 1, narration: "Hello", confidence: 1, reviewRequired: false }] });
  await validateJsonValue("release-report", { schemaVersion: 1, checkedAt: now, passed: false, blockers: ["native playback"], items: [], disclosurePresent: true, nativePlaybackRequired: true });
  await assert.rejects(validateJsonValue("approval-receipt", { schemaVersion: 1, gate: "agent-approved" }), /validation failed/);
});
