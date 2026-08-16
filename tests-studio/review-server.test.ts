import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createProject, savePlan } from "../src/project-store.js";
import { startReviewServer } from "../src/review-server.js";
import type { SeriesPlan } from "../src/types.js";

test("review server is token protected and records plan approval", async () => {
  const source = await mkdtemp(path.join(os.tmpdir(), "nds-review-"));
  const manifest = await createProject(source);
  const plan: SeriesPlan = { schemaVersion: 1, createdAt: new Date().toISOString(), audience: "Dad", desiredAction: "Learn", style: "calm", voiceSource: "preset", disclosure: "AI", conceptTerritories: ["one", "two", "three"].map((id) => ({ id, name: id, direction: id })), unresolvedQuestions: [], items: [{ id: "item-01", title: "One", purpose: "Learn", targetDurationSeconds: 60, wordBudget: 145, slideBudget: 4, sourcePriorities: [], deckStrategy: "create-new", scriptStatus: "not-started", deliverables: ["pptx"] }] };
  await savePlan(manifest, plan);
  const handle = await startReviewServer(manifest.workspaceRoot);
  try {
    const parsed = new URL(handle.url);
    const denied = await fetch(`${parsed.origin}/`);
    assert.equal(denied.status, 403);
    const page = await fetch(handle.url);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /What this series will make/);
    assert.match(html, /Show technical details/);
    assert.doesNotMatch(html, /<h2>Details<\/h2>/);
    const hash = html.match(/name="hash" value="([a-f0-9]{64})"/)?.[1];
    assert.ok(hash);
    const approved = await fetch(`${parsed.origin}/approve?token=${parsed.searchParams.get("token")}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ gate: "plan", hash: hash!, actor: "Dad" }), redirect: "manual" });
    assert.equal(approved.status, 303);
  } finally { await handle.close(); }
});
