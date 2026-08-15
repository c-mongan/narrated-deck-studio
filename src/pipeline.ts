import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWriteJson, artifactHash, loadProject, saveProject } from "./project-store.js";
import { extractSlideTexts, inspectPowerPoint } from "./pptx-inspect.js";
import { runAllowed } from "./process.js";
import { generateVoiceboxTake } from "./voicebox.js";
import { hashFile } from "./hash.js";
import { writeCaptions, type CaptionCue } from "./captions.js";
import { composeNarratedSlides } from "./video-compositor.js";
import { renderNarratedSlidesWithRemotion } from "./remotion-renderer.js";
import { powerpointNarrationScript, type SlideTiming } from "./powerpoint-narration.js";
import type { ProjectManifest, SeriesPlan } from "./types.js";
import { validateJsonFile } from "./validation.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WCD_ROOT = path.join(REPO_ROOT, "packages", "world-class-decks");
const PYTHONPATH = path.join(WCD_ROOT, "src");

async function exists(pathname: string): Promise<boolean> { return stat(pathname).then(() => true, () => false); }
async function filesWithExtension(directory: string, extension: string): Promise<string[]> {
  if (!await exists(directory)) return [];
  return (await readdir(directory)).filter((name) => path.extname(name).toLowerCase() === extension).sort().map((name) => path.join(directory, name));
}

function pythonCommand(): string {
  if (process.env.NDS_PYTHON) return process.env.NDS_PYTHON;
  const isolated = process.platform === "win32"
    ? path.join(REPO_ROOT, ".venv", "Scripts", "python.exe")
    : path.join(REPO_ROOT, ".venv", "bin", "python");
  return existsSync(isolated) ? isolated : process.platform === "win32" ? "python" : "python3";
}

function requireApproval(manifest: ProjectManifest, gate: "plan" | "deck" | "voice"): void {
  if (!manifest.approvals[gate]) throw new Error(`${gate} approval is required before this stage`);
}

async function writeRequest(manifest: ProjectManifest, name: string, value: unknown): Promise<Record<string, unknown>> {
  const pathname = path.join(manifest.workspaceRoot, "review", name);
  await atomicWriteJson(pathname, value);
  return { ready: false, actionRequired: pathname };
}

export async function runDeckStage(manifest: ProjectManifest): Promise<Record<string, unknown>> {
  requireApproval(manifest, "plan");
  if (manifest.state !== "plan_approved") throw new Error(`Deck production requires state plan_approved, not ${manifest.state}`);
  const plan = JSON.parse(await readFile(path.join(manifest.workspaceRoot, "plan.json"), "utf8")) as SeriesPlan;
  const reviewItems: Array<Record<string, unknown>> = [];
  const missing: Array<Record<string, unknown>> = [];
  for (const item of plan.items) {
    const itemRoot = path.join(manifest.workspaceRoot, "work", item.id);
    const candidatesDir = path.join(itemRoot, "candidates");
    await mkdir(candidatesDir, { recursive: true });
    const workspace = path.join(itemRoot, "deck-workspace");
    if (!await exists(path.join(workspace, "brief.md"))) {
      runAllowed(pythonCommand(), ["-m", "world_class_decks.cli", "init-workspace", workspace], { cwd: WCD_ROOT, env: { ...process.env, PYTHONPATH } });
    }
    const candidates = await filesWithExtension(candidatesDir, ".pptx");
    if (candidates.length < 3) {
      missing.push({ itemId: item.id, title: item.title, candidatesFound: candidates.length, candidatesRequired: 3, candidatesDir, workspace, sourcePriorities: item.sourcePriorities, slideBudget: item.slideBudget, conceptTerritories: plan.conceptTerritories });
      continue;
    }
    const reviewed: Array<Record<string, unknown>> = [];
    for (const candidate of candidates) {
      const id = path.basename(candidate, ".pptx");
      const reportDir = path.join(itemRoot, "candidate-reports", id);
      const renderDir = path.join(reportDir, "renders");
      await mkdir(reportDir, { recursive: true });
      const auditPath = path.join(reportDir, "audit.json");
      try {
        runAllowed(pythonCommand(), ["-m", "world_class_decks.cli", "audit", candidate, "--output", auditPath], { cwd: WCD_ROOT, env: { ...process.env, PYTHONPATH } });
      } catch (error) {
        if (!await exists(auditPath)) throw error;
      }
      runAllowed(pythonCommand(), ["-m", "world_class_decks.cli", "render", candidate, renderDir], { cwd: WCD_ROOT, env: { ...process.env, PYTHONPATH } });
      const contactSheet = path.join(reportDir, "contact-sheet.png");
      runAllowed(pythonCommand(), ["-m", "world_class_decks.cli", "contact-sheet", renderDir, contactSheet], { cwd: WCD_ROOT, env: { ...process.env, PYTHONPATH } });
      const audit = JSON.parse(await readFile(auditPath, "utf8")) as { passed?: boolean };
      reviewed.push({ id, name: id.replace(/[-_]+/g, " "), path: candidate, auditPath, auditPassed: audit.passed === true, contactSheet: path.relative(manifest.workspaceRoot, contactSheet), direction: "Candidate supplied by the approved authoring workflow." });
    }
    reviewItems.push({ itemId: item.id, title: item.title, selectedCandidate: null, candidates: reviewed });
  }
  if (missing.length) return writeRequest(manifest, "deck-authoring-request.json", { schemaVersion: 1, message: "Create three genuinely different editable PowerPoint candidates for every listed item, then rerun the deck stage.", items: missing });
  const reviewPath = path.join(manifest.workspaceRoot, "review", "deck-review.json");
  await atomicWriteJson(reviewPath, { schemaVersion: 1, createdAt: new Date().toISOString(), items: reviewItems, requiredRepairLoop: true, nativePowerPointReviewRequired: true });
  manifest.state = "deck_ready";
  await saveProject(manifest);
  return { ready: true, reviewPath };
}

function assertVoiceAuthorization(manifest: ProjectManifest): void {
  if (manifest.voice.sourceType === "preset") return;
  if (!manifest.voice.permissionConfirmed || !manifest.voice.consentEvidenceLocation || !manifest.voice.speakerAlias) throw new Error("Speaker permission, alias and private evidence location are required");
  if (manifest.voice.sourceType === "authorized-youtube" && !manifest.voice.sourceAuthorized) throw new Error("YouTube source authorization is required separately from speaker permission");
}

export async function runVoiceStage(manifest: ProjectManifest): Promise<Record<string, unknown>> {
  requireApproval(manifest, "deck");
  if (manifest.state !== "deck_approved") throw new Error(`Voice production requires state deck_approved, not ${manifest.state}`);
  assertVoiceAuthorization(manifest);
  const profileId = process.env.VOICEBOX_PROFILE_ID;
  const reviewItems: Array<Record<string, unknown>> = [];
  const missingScripts: string[] = [];
  for (const item of manifest.seriesItems) {
    const scriptPath = path.join(manifest.workspaceRoot, "work", item.id, "script.txt");
    if (!await exists(scriptPath)) { missingScripts.push(scriptPath); continue; }
    const takesDir = path.join(manifest.workspaceRoot, "private", item.id, "takes");
    await mkdir(takesDir, { recursive: true, mode: 0o700 });
    let takes = await filesWithExtension(takesDir, ".wav");
    if (takes.length < 2) {
      if (!profileId) return writeRequest(manifest, "voice-generation-request.json", { schemaVersion: 1, message: "Configure the private Voicebox profile ID, then rerun. It must never be saved in this project.", itemId: item.id, scriptPath, takesDir });
      for (let index = takes.length; index < 2; index += 1) {
        const outputPath = path.join(takesDir, `take-${index + 1}.wav`);
        await generateVoiceboxTake({ profileId, scriptPath, outputPath, seed: 42 + index });
      }
      takes = await filesWithExtension(takesDir, ".wav");
    }
    const takeReports: Array<Record<string, unknown>> = [];
    for (const take of takes.slice(0, 6)) {
      const analysis = runAllowed("node", [path.join(REPO_ROOT, "scripts", "analyze_voice_naturalness.mjs"), take, scriptPath], { cwd: REPO_ROOT });
      const report = JSON.parse(analysis) as Record<string, unknown>;
      const reportPath = `${take}.analysis.json`;
      await atomicWriteJson(reportPath, report);
      takeReports.push({ id: path.basename(take, ".wav"), preview: path.relative(manifest.workspaceRoot, take), sha256: await hashFile(take), analysis: path.relative(manifest.workspaceRoot, reportPath), summary: "Blind-listen for identity, warmth, pronunciation, pace, noise and emotional fit." });
    }
    reviewItems.push({ itemId: item.id, title: item.title, selectedTake: null, takes: takeReports });
  }
  if (missingScripts.length) return writeRequest(manifest, "script-request.json", { schemaVersion: 1, message: "Write and review one natural spoken script per presentation within its word budget.", paths: missingScripts });
  const reviewPath = path.join(manifest.workspaceRoot, "review", "voice-review.json");
  await atomicWriteJson(reviewPath, { schemaVersion: 1, createdAt: new Date().toISOString(), disclosure: "Narration is AI-generated with the speaker's permission.", items: reviewItems });
  manifest.state = "voice_ready";
  await saveProject(manifest);
  return { ready: true, reviewPath };
}

async function selectedPaths(manifest: ProjectManifest): Promise<Array<{ itemId: string; deck: string; audio: string }>> {
  const deckReview = JSON.parse(await readFile(path.join(manifest.workspaceRoot, "review", "deck-review.json"), "utf8")) as { items: Array<{ itemId: string; selectedCandidate: string; candidates: Array<{ id: string; path: string }> }> };
  const voiceReview = JSON.parse(await readFile(path.join(manifest.workspaceRoot, "review", "voice-review.json"), "utf8")) as { items: Array<{ itemId: string; selectedTake: string; takes: Array<{ id: string; preview: string }> }> };
  return manifest.seriesItems.map((item) => {
    const deckItem = deckReview.items.find((entry) => entry.itemId === item.id);
    const voiceItem = voiceReview.items.find((entry) => entry.itemId === item.id);
    const deck = deckItem?.candidates.find((entry) => entry.id === deckItem.selectedCandidate)?.path;
    const audioRelative = voiceItem?.takes.find((entry) => entry.id === voiceItem.selectedTake)?.preview;
    if (!deck || !audioRelative) throw new Error(`Approved deck/voice selection is missing for ${item.id}`);
    return { itemId: item.id, deck, audio: path.resolve(manifest.workspaceRoot, audioRelative) };
  });
}

async function createAlignmentRequest(manifest: ProjectManifest, itemId: string, deck: string, audio: string): Promise<string> {
  const itemRoot = path.join(manifest.workspaceRoot, "work", itemId);
  const slidesPath = path.join(itemRoot, "slides.json");
  await atomicWriteJson(slidesPath, extractSlideTexts(deck));
  const alignmentPath = path.join(itemRoot, "timeline.json");
  await atomicWriteJson(path.join(itemRoot, "alignment-request.json"), {
    schemaVersion: 1, audioMaster: audio, slides: slidesPath, output: alignmentPath,
    requiredOutput: { schemaVersion: 1, itemId, audioMaster: audio, audioSha256: await hashFile(audio), slides: "Array of schema-valid monotonic slide mappings" },
    instructions: "Run WhisperX against the exact approved master and script, then the monotonic slide matcher. Human-review every weak or semantically wrong mapping and save the approved version at output.",
  });
  return alignmentPath;
}

export async function runAssembleStage(manifest: ProjectManifest): Promise<Record<string, unknown>> {
  requireApproval(manifest, "voice");
  if (manifest.state !== "voice_approved") throw new Error(`Assembly requires state voice_approved, not ${manifest.state}`);
  const selections = await selectedPaths(manifest);
  const missingAlignment: string[] = [];
  for (const selected of selections) {
    const alignmentPath = await createAlignmentRequest(manifest, selected.itemId, selected.deck, selected.audio);
    if (!await exists(alignmentPath)) missingAlignment.push(alignmentPath);
  }
  if (missingAlignment.length) return writeRequest(manifest, "alignment-review-request.json", { schemaVersion: 1, message: "Measured WhisperX alignment and human semantic review are required before assembly.", outputs: missingAlignment });

  const assembled: Array<Record<string, unknown>> = [];
  for (const selected of selections) {
    const itemRoot = path.join(manifest.workspaceRoot, "work", selected.itemId);
    const timelinePath = path.join(itemRoot, "timeline.json");
    await validateJsonFile("timeline", timelinePath);
    const alignment = JSON.parse(await readFile(timelinePath, "utf8")) as { audioSha256: string; slides: Array<{ slide: number; start: number; end: number; narration: string; confidence: number; reviewRequired: boolean }> };
    if (alignment.audioSha256 !== await hashFile(selected.audio)) throw new Error(`${selected.itemId} timeline does not reference the approved audio master`);
    if (!Array.isArray(alignment.slides) || alignment.slides.some((entry) => entry.reviewRequired)) throw new Error(`${selected.itemId} has unresolved alignment mappings`);
    const slideCount = inspectPowerPoint(selected.deck).slideCount;
    const timings: SlideTiming[] = [];
    for (let slide = 1; slide <= slideCount; slide += 1) {
      const mappings = alignment.slides.filter((entry) => entry.slide === slide);
      if (mappings.length === 0) throw new Error(`${selected.itemId} slide ${slide} has no approved narration timing`);
      timings.push({ slide, start: Math.min(...mappings.map((entry) => entry.start)), end: Math.max(...mappings.map((entry) => entry.end)) });
    }
    for (let index = 1; index < timings.length; index += 1) if (timings[index]!.start < timings[index - 1]!.end) throw new Error("Slide timings overlap");
    const cues: CaptionCue[] = alignment.slides.map((entry) => ({ start: entry.start, end: entry.end, text: entry.narration }));
    const captionsDir = path.join(manifest.workspaceRoot, "captions", selected.itemId);
    const deliverablesDir = path.join(manifest.workspaceRoot, "deliverables", selected.itemId);
    await mkdir(captionsDir, { recursive: true }); await mkdir(deliverablesDir, { recursive: true });
    const srt = path.join(captionsDir, `${selected.itemId}.srt`); const vtt = path.join(captionsDir, `${selected.itemId}.vtt`);
    await writeCaptions(cues, srt, vtt);
    const renderRoot = path.join(itemRoot, "selected-renders");
    runAllowed(pythonCommand(), ["-m", "world_class_decks.cli", "render", selected.deck, renderRoot], { cwd: WCD_ROOT, env: { ...process.env, PYTHONPATH } });
    const images = await filesWithExtension(renderRoot, ".png");
    const mp4 = path.join(deliverablesDir, `${selected.itemId}.mp4`);
    if ((process.env.NDS_VIDEO_ENGINE ?? "remotion") === "remotion") {
      await renderNarratedSlidesWithRemotion({ images, timings, audioMaster: selected.audio, captions: cues, output: mp4 });
    } else {
      await composeNarratedSlides({ images, timings, audioMaster: selected.audio, captions: srt, output: mp4 });
    }
    const pptx = path.join(deliverablesDir, `${selected.itemId}.pptx`); const ppsx = path.join(deliverablesDir, `${selected.itemId}.ppsx`);
    const scriptPath = path.join(itemRoot, "apply-narration.ps1");
    await writeFile(scriptPath, powerpointNarrationScript(selected.deck, selected.audio, timings, pptx, ppsx), { mode: 0o600 });
    let nativeApplied = false;
    if (process.platform === "win32") {
      runAllowed("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { timeoutMs: 60 * 60_000 });
      nativeApplied = await exists(pptx) && await exists(ppsx);
    }
    assembled.push({ itemId: selected.itemId, deck: selected.deck, audioMaster: selected.audio, audioSha256: await hashFile(selected.audio), timings, captions: { srt, vtt }, mp4, pptx, ppsx, nativeApplied, nativeScript: scriptPath });
  }
  await atomicWriteJson(path.join(manifest.workspaceRoot, "reports", "assembly.json"), { schemaVersion: 1, createdAt: new Date().toISOString(), items: assembled });
  manifest.state = "assembled";
  await saveProject(manifest);
  return { ready: true, items: assembled };
}

export async function runReleaseChecks(manifest: ProjectManifest): Promise<Record<string, unknown>> {
  const assemblyPath = path.join(manifest.workspaceRoot, "reports", "assembly.json");
  const blockers: string[] = [];
  const items: Array<Record<string, unknown>> = [];
  if (!await exists(assemblyPath)) blockers.push("Assembly report is missing");
  else {
    const assembly = JSON.parse(await readFile(assemblyPath, "utf8")) as { items: Array<Record<string, unknown>> };
    for (const item of assembly.items) {
      const missing: string[] = [];
      for (const key of ["mp4", "pptx", "ppsx"] as const) if (typeof item[key] !== "string" || !await exists(String(item[key]))) missing.push(key);
      if (item.nativeApplied !== true) blockers.push(`${item.itemId}: native PowerPoint narration has not been applied and verified`);
      if (missing.length) blockers.push(`${item.itemId}: missing ${missing.join(", ")}`);
      let audioContinuity: Record<string, unknown> | null = null;
      if (!missing.includes("mp4") && typeof item.audioMaster === "string" && await exists(item.audioMaster)) {
        try {
          audioContinuity = JSON.parse(runAllowed("node", [path.join(REPO_ROOT, "scripts", "verify_audio_continuity.mjs"), item.audioMaster, String(item.mp4)], { cwd: REPO_ROOT }));
        } catch (error) {
          blockers.push(`${item.itemId}: audio continuity or 50 ms duration/start tolerance failed`);
        }
      } else blockers.push(`${item.itemId}: approved audio master is unavailable for continuity verification`);
      const target = manifest.seriesItems.find((seriesItem) => seriesItem.id === item.itemId)?.targetDurationSeconds;
      if (target && audioContinuity && Number(audioContinuity.masterDuration) > target + 0.05) blockers.push(`${item.itemId}: approved master exceeds the ${target}s duration limit`);
      const packageIntegrity: Record<string, unknown> = {};
      for (const key of ["pptx", "ppsx"] as const) {
        if (!missing.includes(key)) {
          try { packageIntegrity[key] = inspectPowerPoint(String(item[key])).slideCount > 0; }
          catch { packageIntegrity[key] = false; blockers.push(`${item.itemId}: ${key.toUpperCase()} package integrity failed`); }
        }
      }
      const checksums: Record<string, string> = {};
      for (const key of ["mp4", "pptx", "ppsx"] as const) if (!missing.includes(key)) checksums[key] = await hashFile(String(item[key]));
      items.push({ itemId: item.itemId, missing, nativeApplied: item.nativeApplied, audioSha256: item.audioSha256, audioContinuity, packageIntegrity, checksums });
    }
  }
  const report = { schemaVersion: 1, checkedAt: new Date().toISOString(), passed: blockers.length === 0, blockers, items, disclosurePresent: true, nativePlaybackRequired: true };
  const reportPath = path.join(manifest.workspaceRoot, "reports", "release-report.json");
  await atomicWriteJson(reportPath, report);
  return { ...report, reportPath };
}

export async function exportDeliverables(manifest: ProjectManifest): Promise<Record<string, unknown>> {
  if (!manifest.approvals.release || manifest.state !== "release_approved") throw new Error("Final release approval is required before export");
  const root = path.join(manifest.workspaceRoot, "deliverables");
  const output: Array<{ path: string; sha256: string }> = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) output.push({ path: absolute, sha256: await hashFile(absolute) });
    }
  }
  await walk(root);
  await atomicWriteJson(path.join(root, "release-manifest.json"), { schemaVersion: 1, projectId: manifest.projectId, exportedAt: new Date().toISOString(), files: output });
  manifest.state = "delivered";
  await saveProject(manifest);
  return { delivered: true, root, files: output };
}

export async function runApprovedStage(workspaceRoot: string, stage: "deck" | "voice" | "assemble"): Promise<Record<string, unknown>> {
  const manifest = await loadProject(workspaceRoot);
  if (stage === "deck") return runDeckStage(manifest);
  if (stage === "voice") return runVoiceStage(manifest);
  return runAssembleStage(manifest);
}
