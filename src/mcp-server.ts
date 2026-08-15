#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createProject, loadProject, publicProjectStatus, saveInventory, savePlan } from "./project-store.js";
import { inspectFolder } from "./inventory.js";
import { draftSeriesPlan, inventoryPlainEnglish } from "./series-planner.js";
import { startReviewServer, type ReviewServerHandle } from "./review-server.js";
import { exportDeliverables, runApprovedStage, runReleaseChecks } from "./pipeline.js";
import { requestRevision } from "./revisions.js";

const server = new McpServer({ name: "narrated-deck-studio", version: "0.3.0" });
const reviewServers = new Map<string, ReviewServerHandle>();

function result(value: unknown) { return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], structuredContent: value as Record<string, unknown> }; }
function toolError(error: unknown) { return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }], isError: true }; }

server.tool("inspect_folder", "Safely inventory a user-approved folder and create or refresh its local project workspace.", {
  sourceFolder: z.string().min(1), workspace: z.string().optional(),
}, async ({ sourceFolder, workspace }) => {
  try {
    const manifest = workspace ? await loadProject(path.resolve(workspace)) : await createProject(path.resolve(sourceFolder));
    if (manifest.sourceRoot !== await (await import("node:fs/promises")).realpath(path.resolve(sourceFolder))) throw new Error("Source folder does not match the existing project");
    const inventory = await inspectFolder(manifest.sourceRoot);
    await saveInventory(manifest, inventory);
    return result({ workspace: manifest.workspaceRoot, summary: inventoryPlainEnglish(inventory), warnings: inventory.warnings, items: inventory.items });
  } catch (error) { return toolError(error); }
});

server.tool("draft_series_plan", "Draft the series plan after asking the user about audience, outcome, output count, time and voice source. This never approves the plan.", {
  workspace: z.string().min(1), audience: z.string(), desiredAction: z.string(), outputCount: z.number().int().min(1).max(24).optional(),
  outputMode: z.enum(["auto", "one-per-powerpoint", "custom"]).optional(),
  sourceGroups: z.array(z.array(z.string().min(1)).min(1)).optional(),
  totalDurationSeconds: z.number().min(30).optional(), perOutputDurationSeconds: z.array(z.number().min(30)).optional(),
  style: z.string().optional(), voiceSource: z.enum(["local-audio", "authorized-youtube", "preset"]).optional(),
  voiceReference: z.string().optional(), speakerAlias: z.string().optional(), permissionConfirmed: z.boolean().optional(),
  sourceAuthorized: z.boolean().optional(), consentEvidenceLocation: z.string().optional(),
}, async ({ workspace, ...answers }) => {
  try {
    const manifest = await loadProject(path.resolve(workspace));
    const inventory = JSON.parse(await readFile(path.join(manifest.workspaceRoot, "inventory.json"), "utf8"));
    const plan = draftSeriesPlan(inventory, answers);
    await savePlan(manifest, plan, answers);
    return result({ plan, message: "The plan is waiting for explicit human approval in the review page." });
  } catch (error) { return toolError(error); }
});

server.tool("get_project_status", "Return redacted project state without private profile IDs or consent evidence.", { workspace: z.string().min(1) }, async ({ workspace }) => {
  try { return result(publicProjectStatus(await loadProject(path.resolve(workspace)))); } catch (error) { return toolError(error); }
});

server.tool("open_review", "Open the loopback-only human review page. Approval occurs only through this page, never through an agent tool.", { workspace: z.string().min(1) }, async ({ workspace }) => {
  try {
    const root = path.resolve(workspace);
    let handle = reviewServers.get(root);
    if (!handle) { handle = await startReviewServer(root); reviewServers.set(root, handle); }
    return result({ url: handle.url, message: "Ask the user to open this local page and review the waiting gate." });
  } catch (error) { return toolError(error); }
});

server.tool("run_approved_stage", "Run one bounded production stage. It fails closed unless its human approval and required external artifacts exist.", {
  workspace: z.string().min(1), stage: z.enum(["deck", "voice", "assemble"]),
}, async ({ workspace, stage }) => { try { return result(await runApprovedStage(path.resolve(workspace), stage)); } catch (error) { return toolError(error); } });

server.tool("request_revision", "Record a conversational edit request and invalidate affected downstream approvals.", {
  workspace: z.string().min(1), target: z.enum(["plan", "deck", "script", "voice", "timeline", "release"]), instruction: z.string().min(1), actor: z.string().optional(), cancelRunning: z.boolean().optional(),
}, async ({ workspace, target, instruction, actor, cancelRunning }) => {
  try { const manifest = await loadProject(path.resolve(workspace)); await requestRevision(manifest, target, instruction, actor, cancelRunning === true); return result({ revisionRequested: true, target, state: manifest.state, cancellationRequested: cancelRunning === true }); } catch (error) { return toolError(error); }
});

server.tool("run_release_checks", "Run deterministic release checks and create the artifact reviewed at approval 4.", { workspace: z.string().min(1) }, async ({ workspace }) => {
  try { return result(await runReleaseChecks(await loadProject(path.resolve(workspace)))); } catch (error) { return toolError(error); }
});

server.tool("export_deliverables", "Write the final release manifest only after approval 4.", { workspace: z.string().min(1) }, async ({ workspace }) => {
  try { return result(await exportDeliverables(await loadProject(path.resolve(workspace)))); } catch (error) { return toolError(error); }
});

await server.connect(new StdioServerTransport());
