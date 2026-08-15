import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { ApprovalGate, ProjectManifest } from "./types.js";
import { invalidateApprovals } from "./project-store.js";

const TARGET_GATE: Record<string, ApprovalGate> = { plan: "plan", deck: "deck", script: "voice", voice: "voice", timeline: "release", release: "release" };

export async function requestRevision(manifest: ProjectManifest, target: string, instruction: string, actor = "user"): Promise<void> {
  const gate = TARGET_GATE[target];
  if (!gate) throw new Error(`Unsupported revision target: ${target}`);
  if (!instruction.trim()) throw new Error("Revision instructions cannot be empty");
  const pathname = path.join(manifest.workspaceRoot, "review", "revisions.ndjson");
  await mkdir(path.dirname(pathname), { recursive: true });
  await appendFile(pathname, `${JSON.stringify({ requestedAt: new Date().toISOString(), actor, target, instruction })}\n`, { mode: 0o600 });
  await invalidateApprovals(manifest, gate, `${target} revision requested`);
}
