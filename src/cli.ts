#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { createProject, loadProject, publicProjectStatus, saveInventory, savePlan } from "./project-store.js";
import { inspectFolder } from "./inventory.js";
import { draftSeriesPlan, inventoryPlainEnglish } from "./series-planner.js";
import { startReviewServer } from "./review-server.js";
import { exportDeliverables, runApprovedStage, runReleaseChecks } from "./pipeline.js";
import { requestRevision } from "./revisions.js";
import type { PlanAnswers } from "./types.js";

const program = new Command();
program.name("nds").description("Consent-first narrated PowerPoint studio").version("0.3.0");

program.command("init").argument("<source-folder>").option("--workspace <folder>").action(async (source, options) => print(await createProject(source, options.workspace)));
program.command("inspect").argument("<workspace>").action(async (workspace) => {
  const manifest = await loadProject(path.resolve(workspace));
  const inventory = await inspectFolder(manifest.sourceRoot);
  await saveInventory(manifest, inventory);
  print({ summary: inventoryPlainEnglish(inventory), inventory });
});
program.command("plan").argument("<workspace>").requiredOption("--answers <json-file>").action(async (workspace, options) => {
  const manifest = await loadProject(path.resolve(workspace));
  const inventory = JSON.parse(await readFile(path.join(manifest.workspaceRoot, "inventory.json"), "utf8"));
  const answers = JSON.parse(await readFile(path.resolve(options.answers), "utf8")) as PlanAnswers;
  const plan = draftSeriesPlan(inventory, answers);
  await savePlan(manifest, plan, answers);
  print(plan);
});
program.command("status").argument("<workspace>").action(async (workspace) => print(publicProjectStatus(await loadProject(path.resolve(workspace)))));
program.command("review").argument("<workspace>").option("--port <port>", "loopback port", Number, 0).action(async (workspace, options) => {
  const handle = await startReviewServer(path.resolve(workspace), "127.0.0.1", options.port);
  console.log(`Review page: ${handle.url}`);
  await new Promise(() => undefined);
});
program.command("stage").argument("<workspace>").argument("<stage>").action(async (workspace, stage) => {
  if (!new Set(["deck", "voice", "assemble"]).has(stage)) throw new Error("Stage must be deck, voice or assemble");
  print(await runApprovedStage(path.resolve(workspace), stage));
});
program.command("revise").argument("<workspace>").argument("<target>").argument("<instruction>").option("--cancel-running").action(async (workspace, target, instruction, options) => {
  const manifest = await loadProject(path.resolve(workspace));
  await requestRevision(manifest, target, instruction, "user", options.cancelRunning === true);
  print({ revisionRequested: true, target });
});
program.command("qa").argument("<workspace>").action(async (workspace) => print(await runReleaseChecks(await loadProject(path.resolve(workspace)))));
program.command("export").argument("<workspace>").action(async (workspace) => print(await exportDeliverables(await loadProject(path.resolve(workspace)))));

program.parseAsync(process.argv).catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });

function print(value: unknown): void { console.log(JSON.stringify(value, null, 2)); }
