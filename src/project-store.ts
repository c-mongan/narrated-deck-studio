import { appendFile, chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { APPROVAL_GATES, type ApprovalGate, type ApprovalReceipt, type InventoryReport, type PlanAnswers, type ProjectManifest, type ProjectState, type SeriesPlan } from "./types.js";
import { gateArtifact, INVENTORY_FILE, MANIFEST_FILE, PLAN_FILE, RECEIPTS_FILE, WORKSPACE_DIR } from "./constants.js";
import { hashFile, hashJson } from "./hash.js";
import { canonicalExistingDirectory, ensurePrivateDirectory, safeProjectId } from "./security.js";
import { validateJsonFile } from "./validation.js";

const STATE_FOR_APPROVAL: Record<ApprovalGate, ProjectState> = {
  plan: "plan_approved",
  deck: "deck_approved",
  voice: "voice_approved",
  release: "release_approved",
};

const REQUIRED_STATE: Record<ApprovalGate, ProjectState[]> = {
  plan: ["planned"],
  deck: ["deck_ready"],
  voice: ["voice_ready"],
  release: ["assembled"],
};

const INVALIDATION_ORDER: Record<ApprovalGate, ApprovalGate[]> = {
  plan: ["plan", "deck", "voice", "release"],
  deck: ["deck", "voice", "release"],
  voice: ["voice", "release"],
  release: ["release"],
};

export async function atomicWriteJson(pathname: string, value: unknown, mode = 0o600): Promise<void> {
  await mkdir(path.dirname(pathname), { recursive: true });
  const temporary = `${pathname}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode });
  await rename(temporary, pathname);
  if (process.platform !== "win32") await chmod(pathname, mode);
}

export async function createProject(sourceInput: string, workspaceInput?: string): Promise<ProjectManifest> {
  const sourceRoot = await canonicalExistingDirectory(sourceInput);
  if (!workspaceInput && await stat(path.join(sourceRoot, ".git")).then(() => true, () => false)) {
    throw new Error("A Git-managed source folder requires an explicit workspace outside the source tree");
  }
  const workspaceRoot = path.resolve(workspaceInput ?? path.join(sourceRoot, WORKSPACE_DIR));
  if (workspaceRoot === sourceRoot) throw new Error("The project workspace cannot replace the selected source folder");
  await ensurePrivateDirectory(workspaceRoot);
  for (const directory of ["private", "work", "review", "reports", "deliverables", "renders", "captions"]) {
    await ensurePrivateDirectory(path.join(workspaceRoot, directory));
  }
  const now = new Date().toISOString();
  const manifest: ProjectManifest = {
    schemaVersion: 1,
    projectId: `${safeProjectId(path.basename(sourceRoot))}-${randomUUID().slice(0, 8)}`,
    createdAt: now,
    updatedAt: now,
    sourceRoot,
    workspaceRoot,
    audience: "",
    desiredAction: "",
    outputCount: 1,
    brandConstraints: [],
    style: "clear, calm and professionally edited",
    voice: { sourceType: "local-audio", permissionConfirmed: false, sourceAuthorized: false },
    deliveryFormats: ["pptx", "ppsx", "mp4", "vtt", "srt"],
    state: "discovered",
    approvals: {},
    seriesItems: [],
  };
  await atomicWriteJson(path.join(workspaceRoot, MANIFEST_FILE), manifest);
  return manifest;
}

export async function loadProject(workspaceInput: string): Promise<ProjectManifest> {
  const workspaceRoot = path.resolve(workspaceInput);
  const manifestPath = path.join(workspaceRoot, MANIFEST_FILE);
  await validateJsonFile("project-manifest", manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ProjectManifest;
  if (manifest.schemaVersion !== 1 || manifest.workspaceRoot !== workspaceRoot) throw new Error("Invalid or relocated project manifest");
  return manifest;
}

export async function saveProject(manifest: ProjectManifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  await atomicWriteJson(path.join(manifest.workspaceRoot, MANIFEST_FILE), manifest);
}

export async function saveInventory(manifest: ProjectManifest, inventory: InventoryReport): Promise<void> {
  if (inventory.sourceRoot !== manifest.sourceRoot) throw new Error("Inventory root does not match project source root");
  await atomicWriteJson(path.join(manifest.workspaceRoot, INVENTORY_FILE), inventory);
}

export async function savePlan(manifest: ProjectManifest, plan: SeriesPlan, answers?: PlanAnswers): Promise<void> {
  if (manifest.approvals.plan) await invalidateApprovals(manifest, "plan", "Series plan changed");
  manifest.audience = plan.audience;
  manifest.desiredAction = plan.desiredAction;
  manifest.outputCount = plan.items.length;
  manifest.seriesItems = plan.items;
  manifest.style = plan.style;
  manifest.voice.sourceType = plan.voiceSource;
  if (answers) {
    manifest.voice.sourceReference = answers.voiceReference;
    manifest.voice.speakerAlias = answers.speakerAlias;
    manifest.voice.permissionConfirmed = answers.permissionConfirmed === true;
    manifest.voice.sourceAuthorized = answers.sourceAuthorized === true;
    manifest.voice.consentEvidenceLocation = answers.consentEvidenceLocation;
  }
  manifest.state = "planned";
  await atomicWriteJson(path.join(manifest.workspaceRoot, PLAN_FILE), plan);
  await saveProject(manifest);
}

async function appendReceipt(manifest: ProjectManifest, receipt: ApprovalReceipt): Promise<void> {
  const pathname = path.join(manifest.workspaceRoot, RECEIPTS_FILE);
  await appendFile(pathname, `${JSON.stringify(receipt)}\n`, { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") await chmod(pathname, 0o600);
}

export async function artifactHash(manifest: ProjectManifest, gate: ApprovalGate): Promise<string> {
  const pathname = gateArtifact(manifest.workspaceRoot, gate);
  await stat(pathname);
  return hashFile(pathname);
}

export async function approveGate(manifest: ProjectManifest, gate: ApprovalGate, actor: string, expectedHash: string): Promise<void> {
  if (!REQUIRED_STATE[gate].includes(manifest.state)) throw new Error(`${gate} cannot be approved while project state is ${manifest.state}`);
  const subject = JSON.parse(await readFile(gateArtifact(manifest.workspaceRoot, gate), "utf8")) as Record<string, unknown>;
  if (gate === "plan" && Array.isArray(subject.unresolvedQuestions) && subject.unresolvedQuestions.length > 0) {
    throw new Error("The plan still has unanswered questions");
  }
  if (gate === "deck") {
    const items = Array.isArray(subject.items) ? subject.items as Array<Record<string, unknown>> : [];
    if (items.length === 0 || items.some((item) => !item.selectedCandidate)) throw new Error("Choose one deck candidate for every presentation before approval");
    for (const item of items) {
      const candidates = Array.isArray(item.candidates) ? item.candidates as Array<Record<string, unknown>> : [];
      const selected = candidates.find((candidate) => candidate.id === item.selectedCandidate);
      if (!selected || selected.auditPassed !== true) throw new Error("Every selected deck must pass deterministic audit before approval");
    }
  }
  if (gate === "voice") {
    const items = Array.isArray(subject.items) ? subject.items as Array<Record<string, unknown>> : [];
    if (items.length === 0 || items.some((item) => !item.selectedTake)) throw new Error("Choose one voice take for every presentation before approval");
  }
  if (gate === "release" && subject.passed !== true) throw new Error("Release checks must pass before approval");
  const actualHash = await artifactHash(manifest, gate);
  if (actualHash !== expectedHash) throw new Error("Approval subject changed; refresh the review before approving");
  const decidedAt = new Date().toISOString();
  manifest.approvals[gate] = { subjectHash: actualHash, approvedAt: decidedAt, actor };
  manifest.state = STATE_FOR_APPROVAL[gate];
  await appendReceipt(manifest, { schemaVersion: 1, gate, subjectHash: actualHash, decision: "approved", actor, decidedAt });
  await saveProject(manifest);
}

export async function invalidateApprovals(manifest: ProjectManifest, from: ApprovalGate, reason: string): Promise<void> {
  const now = new Date().toISOString();
  for (const gate of INVALIDATION_ORDER[from]) {
    const existing = manifest.approvals[gate];
    if (!existing) continue;
    delete manifest.approvals[gate];
    await appendReceipt(manifest, {
      schemaVersion: 1, gate, subjectHash: existing.subjectHash, decision: "invalidated",
      actor: "system", decidedAt: now, reason,
    });
  }
  const index = APPROVAL_GATES.indexOf(from);
  manifest.state = index === 0 ? "planned" : index === 1 ? "plan_approved" : index === 2 ? "deck_approved" : "assembled";
  await saveProject(manifest);
}

export function publicProjectStatus(manifest: ProjectManifest): Record<string, unknown> {
  return {
    schemaVersion: manifest.schemaVersion,
    projectId: manifest.projectId,
    sourceRoot: manifest.sourceRoot,
    workspaceRoot: manifest.workspaceRoot,
    audience: manifest.audience,
    desiredAction: manifest.desiredAction,
    outputCount: manifest.outputCount,
    style: manifest.style,
    deliveryFormats: manifest.deliveryFormats,
    state: manifest.state,
    approvals: manifest.approvals,
    seriesItems: manifest.seriesItems,
    voice: {
      sourceType: manifest.voice.sourceType,
      speakerAlias: manifest.voice.speakerAlias,
      permissionConfirmed: manifest.voice.permissionConfirmed,
      sourceAuthorized: manifest.voice.sourceAuthorized,
    },
  };
}

export function approvalSummaryHash(value: unknown): string {
  return hashJson(value);
}
