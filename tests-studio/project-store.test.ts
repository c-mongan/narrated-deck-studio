import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { approveGate, artifactHash, createProject, invalidateApprovals, savePlan } from "../src/project-store.js";
import { requestRevision } from "../src/revisions.js";
import type { SeriesPlan } from "../src/types.js";

async function plannedProject() {
  const source = await mkdtemp(path.join(os.tmpdir(), "nds-project-"));
  const manifest = await createProject(source);
  const plan: SeriesPlan = { schemaVersion: 1, createdAt: new Date().toISOString(), audience: "Dad", desiredAction: "Understand", style: "calm", voiceSource: "preset", disclosure: "AI voice", conceptTerritories: ["one", "two", "three"].map((id) => ({ id, name: id, direction: id })), unresolvedQuestions: [], items: [{ id: "item-01", title: "One", purpose: "Explain", targetDurationSeconds: 60, wordBudget: 145, slideBudget: 4, sourcePriorities: [], deckStrategy: "create-new", scriptStatus: "not-started", deliverables: ["pptx"] }] };
  await savePlan(manifest, plan);
  return manifest;
}

test("approval is bound to the exact artifact and invalidation is downstream", async () => {
  const manifest = await plannedProject();
  const hash = await artifactHash(manifest, "plan");
  await approveGate(manifest, "plan", "Dad", hash);
  assert.equal(manifest.state, "plan_approved");
  assert.ok(manifest.approvals.plan);
  await invalidateApprovals(manifest, "plan", "changed");
  assert.equal(manifest.state, "planned");
  assert.equal(manifest.approvals.plan, undefined);
});

test("stale approval hashes fail closed", async () => {
  const manifest = await plannedProject();
  await assert.rejects(approveGate(manifest, "plan", "Dad", "0".repeat(64)), /changed/);
});

test("Git-managed source folders require an external private workspace", async () => {
  const source = await mkdtemp(path.join(os.tmpdir(), "nds-git-source-"));
  await mkdir(path.join(source, ".git"));
  await assert.rejects(createProject(source), /explicit workspace/);
  const workspace = await mkdtemp(path.join(os.tmpdir(), "nds-external-workspace-"));
  const manifest = await createProject(source, workspace);
  assert.equal(manifest.workspaceRoot, workspace);
});

test("a conversational revision can cancel an in-flight local generation", async () => {
  const manifest = await plannedProject();
  const hash = await artifactHash(manifest, "plan");
  await approveGate(manifest, "plan", "Dad", hash);
  await requestRevision(manifest, "plan", "Use a shorter series", "Dad", true);
  const marker = path.join(manifest.workspaceRoot, "private", "cancel-running");
  if (process.platform !== "win32") assert.equal((await stat(marker)).mode & 0o777, 0o600);
  assert.match(await readFile(marker, "utf8"), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(manifest.approvals.plan, undefined);
  assert.equal(manifest.state, "planned");
});
