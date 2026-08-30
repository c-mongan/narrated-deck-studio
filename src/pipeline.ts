import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
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
import { validateJsonFile, validateJsonValue } from "./validation.js";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = existsSync(path.join(MODULE_ROOT, "package.json")) ? MODULE_ROOT : path.resolve(MODULE_ROOT, "..");
const WCD_ROOT = path.join(REPO_ROOT, "packages", "world-class-decks");
const PYTHONPATH = path.join(WCD_ROOT, "src");
const PPT_MASTER_PIN = "0c0bdaf0dd953afc2c00322e92f26dc02fc1c51f";

function pptMasterHome(): string {
  if (process.env.NDS_PPT_MASTER_HOME) return process.env.NDS_PPT_MASTER_HOME;
  const base = process.platform === "win32" && process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "NarratedDeckStudio", "engines")
    : path.join(process.env.HOME ?? "", ".local", "share", "narrated-deck-studio", "engines");
  return path.join(base, "ppt-master", PPT_MASTER_PIN);
}

async function exists(pathname: string): Promise<boolean> { return stat(pathname).then(() => true, () => false); }
async function filesWithExtension(directory: string, extension: string): Promise<string[]> {
  if (!await exists(directory)) return [];
  return (await readdir(directory)).filter((name) => path.extname(name).toLowerCase() === extension).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((name) => path.join(directory, name));
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
      missing.push({ itemId: item.id, title: item.title, candidatesFound: candidates.length, candidatesRequired: 3, candidatesDir, workspace, sourcePriorities: item.sourcePriorities, slideBudget: item.slideBudget, conceptTerritories: plan.conceptTerritories, pptMaster: { home: pptMasterHome(), commit: PPT_MASTER_PIN }, requirements: ["Use the installed PPT Master skill and exact pinned engine", "Keep every element editable and native where practical", "Add useful speaker notes to every narrated slide", "Create three genuinely different creative territories", "Never overwrite source material"] });
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
      const inspection = inspectPowerPoint(candidate);
      reviewed.push({ id, name: id.replace(/[-_]+/g, " "), path: candidate, auditPath, auditPassed: audit.passed === true, notesPresent: inspection.notesPresent, slideCount: inspection.slideCount, contactSheet: path.relative(manifest.workspaceRoot, contactSheet), direction: "Candidate supplied by the approved authoring workflow." });
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
  const cancelFile = path.join(manifest.workspaceRoot, "private", "cancel-running");
  await rm(cancelFile, { force: true });
  const reviewItems: Array<Record<string, unknown>> = [];
  const missingScripts: string[] = [];
  for (const item of manifest.seriesItems) {
    const scriptPath = path.join(manifest.workspaceRoot, "work", item.id, "script.txt");
    if (!await exists(scriptPath)) { missingScripts.push(scriptPath); continue; }
    const takesDir = path.join(manifest.workspaceRoot, "private", item.id, "takes");
    await mkdir(takesDir, { recursive: true, mode: 0o700 });
    const scriptText = await readFile(scriptPath, "utf8");
    const scriptSha256 = await hashFile(scriptPath);
    const calibrationScript = path.join(manifest.workspaceRoot, "private", item.id, "calibration.txt");
    const calibrationAudio = path.join(manifest.workspaceRoot, "private", item.id, "calibration.wav");
    if (!await exists(calibrationScript)) await writeFile(calibrationScript, `${scriptText.trim().split(/\s+/).slice(0, 80).join(" ")}\n`, { mode: 0o600 });
    if (!await exists(calibrationAudio)) {
      if (!profileId) return writeRequest(manifest, "voice-generation-request.json", { schemaVersion: 1, message: "Configure the private Voicebox profile ID to create the required calibration and two full takes. It must never be saved in this project.", itemId: item.id, scriptPath, calibrationScript, takesDir });
      const generated = await generateVoiceboxTake({ profileId, scriptPath: calibrationScript, outputPath: calibrationAudio, seed: 41, cancelFile });
      await atomicWriteJson(`${calibrationAudio}.provenance.json`, { schemaVersion: 1, kind: "calibration", ...generated, generationId: generated.generationId, scriptSha256: await hashFile(calibrationScript), masterSha256: await hashFile(calibrationAudio), createdAt: new Date().toISOString() });
    }
    let takes = await filesWithExtension(takesDir, ".wav");
    if (takes.length < 2) {
      if (!profileId) return writeRequest(manifest, "voice-generation-request.json", { schemaVersion: 1, message: "Configure the private Voicebox profile ID, then rerun. It must never be saved in this project.", itemId: item.id, scriptPath, takesDir });
      for (let index = takes.length; index < 2; index += 1) {
        const outputPath = path.join(takesDir, `take-${index + 1}.wav`);
        const generated = await generateVoiceboxTake({ profileId, scriptPath, outputPath, seed: 42 + index, cancelFile });
        await atomicWriteJson(`${outputPath}.provenance.json`, { schemaVersion: 1, kind: "continuous-full-take", ...generated, generationId: generated.generationId, scriptSha256, masterSha256: await hashFile(outputPath), createdAt: new Date().toISOString() });
      }
      takes = await filesWithExtension(takesDir, ".wav");
    }
    const takeReports: Array<Record<string, unknown>> = [];
    for (const take of takes.slice(0, 6)) {
      const analysis = runAllowed("node", [path.join(REPO_ROOT, "scripts", "analyze_voice_naturalness.mjs"), take, scriptPath], { cwd: REPO_ROOT });
      const report = JSON.parse(analysis) as Record<string, unknown>;
      const reportPath = `${take}.analysis.json`;
      await atomicWriteJson(reportPath, report);
      const provenancePath = `${take}.provenance.json`;
      if (!await exists(provenancePath)) await atomicWriteJson(provenancePath, { schemaVersion: 1, kind: "continuous-full-take", engine: "external-authorized-fixture", modelSize: "unknown", voiceboxVersion: "unknown", seed: null, scriptSha256, masterSha256: await hashFile(take), createdAt: new Date().toISOString() });
      takeReports.push({ id: path.basename(take, ".wav"), preview: path.relative(manifest.workspaceRoot, take), sha256: await hashFile(take), analysis: path.relative(manifest.workspaceRoot, reportPath), provenance: path.relative(manifest.workspaceRoot, provenancePath), summary: "Blind-listen for identity, warmth, pronunciation, pace, noise and emotional fit." });
    }
    reviewItems.push({ itemId: item.id, title: item.title, calibration: { preview: path.relative(manifest.workspaceRoot, calibrationAudio), sha256: await hashFile(calibrationAudio) }, selectedTake: null, takes: takeReports });
  }
  if (missingScripts.length) return writeRequest(manifest, "script-request.json", { schemaVersion: 1, message: "Write and review one natural spoken script per presentation within its word budget.", paths: missingScripts });
  const reviewPath = path.join(manifest.workspaceRoot, "review", "voice-review.json");
  await atomicWriteJson(reviewPath, { schemaVersion: 1, createdAt: new Date().toISOString(), disclosure: "Narration is AI-generated with the speaker's permission.", items: reviewItems });
  manifest.state = "voice_ready";
  await saveProject(manifest);
  return { ready: true, reviewPath };
}

async function selectedPaths(manifest: ProjectManifest): Promise<Array<{ itemId: string; deck: string; audio: string; contactSheet?: string; provenance?: string }>> {
  const deckReview = JSON.parse(await readFile(path.join(manifest.workspaceRoot, "review", "deck-review.json"), "utf8")) as { items: Array<{ itemId: string; selectedCandidate: string; candidates: Array<{ id: string; path: string; contactSheet?: string }> }> };
  const voiceReview = JSON.parse(await readFile(path.join(manifest.workspaceRoot, "review", "voice-review.json"), "utf8")) as { items: Array<{ itemId: string; selectedTake: string; takes: Array<{ id: string; preview: string }> }> };
  return manifest.seriesItems.map((item) => {
    const deckItem = deckReview.items.find((entry) => entry.itemId === item.id);
    const voiceItem = voiceReview.items.find((entry) => entry.itemId === item.id);
    const deckCandidate = deckItem?.candidates.find((entry) => entry.id === deckItem.selectedCandidate);
    const voiceTake = voiceItem?.takes.find((entry) => entry.id === voiceItem.selectedTake) as { preview?: string; provenance?: string } | undefined;
    const deck = deckCandidate?.path;
    const audioRelative = voiceTake?.preview;
    if (!deck || !audioRelative) throw new Error(`Approved deck/voice selection is missing for ${item.id}`);
    return { itemId: item.id, deck, audio: path.resolve(manifest.workspaceRoot, audioRelative), contactSheet: deckCandidate?.contactSheet ? path.resolve(manifest.workspaceRoot, deckCandidate.contactSheet) : undefined, provenance: voiceTake?.provenance ? path.resolve(manifest.workspaceRoot, voiceTake.provenance) : undefined };
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

async function tryAutomaticAlignment(manifest: ProjectManifest, itemId: string, audio: string, timelinePath: string): Promise<{ ran: boolean; reviewRequired: number; error?: string }> {
  const itemRoot = path.join(manifest.workspaceRoot, "work", itemId);
  const scriptPath = path.join(itemRoot, "script.txt");
  const transcriptPath = path.join(itemRoot, "whisperx-approved-script.json");
  const matchPath = path.join(itemRoot, "monotonic-match.json");
  try {
    runAllowed(pythonCommand(), ["-c", "import whisperx"], { cwd: REPO_ROOT, timeoutMs: 30_000 });
  } catch {
    return { ran: false, reviewRequired: 0, error: "WhisperX is not installed in the isolated Python environment" };
  }
  try {
    runAllowed(pythonCommand(), [path.join(REPO_ROOT, "scripts", "align_approved_script.py"), audio, scriptPath, transcriptPath, process.env.NDS_ALIGNMENT_LANGUAGE ?? "en", process.env.NDS_ALIGNMENT_DEVICE ?? "cpu"], { cwd: REPO_ROOT, timeoutMs: 2 * 60 * 60_000 });
    runAllowed("node", [path.join(REPO_ROOT, "scripts", "match_slides.mjs"), path.join(itemRoot, "slides.json"), transcriptPath, matchPath], { cwd: REPO_ROOT });
    const matched = JSON.parse(await readFile(matchPath, "utf8")) as { mappings: Array<{ slide: number; start: number; end: number; narration: string; score: number; reviewRequired: boolean }> };
    const timeline = { schemaVersion: 1, itemId, audioMaster: audio, audioSha256: await hashFile(audio), slides: matched.mappings.map((entry) => ({ slide: entry.slide, start: entry.start, end: entry.end, narration: entry.narration, confidence: entry.score, reviewRequired: entry.reviewRequired, transition: "fade" })) };
    await validateJsonValue("timeline", timeline);
    await atomicWriteJson(timelinePath, timeline);
    return { ran: true, reviewRequired: timeline.slides.filter((entry) => entry.reviewRequired).length };
  } catch (error) {
    return { ran: false, reviewRequired: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function runAssembleStage(manifest: ProjectManifest): Promise<Record<string, unknown>> {
  requireApproval(manifest, "voice");
  if (manifest.state !== "voice_approved") throw new Error(`Assembly requires state voice_approved, not ${manifest.state}`);
  const selections = await selectedPaths(manifest);
  const missingAlignment: string[] = [];
  const alignmentResults: Array<Record<string, unknown>> = [];
  for (const selected of selections) {
    const alignmentPath = await createAlignmentRequest(manifest, selected.itemId, selected.deck, selected.audio);
    if (!await exists(alignmentPath)) {
      const result = await tryAutomaticAlignment(manifest, selected.itemId, selected.audio, alignmentPath);
      alignmentResults.push({ itemId: selected.itemId, ...result });
      if (!await exists(alignmentPath) || result.reviewRequired > 0) missingAlignment.push(alignmentPath);
    }
  }
  if (missingAlignment.length) return writeRequest(manifest, "alignment-review-request.json", { schemaVersion: 1, message: "Measured WhisperX alignment and human semantic review are required before assembly. Resolve every reviewRequired flag without changing the approved audio master.", outputs: missingAlignment, automaticAlignment: alignmentResults });

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
    const deliverableSrt = path.join(deliverablesDir, `${selected.itemId}.srt`); const deliverableVtt = path.join(deliverablesDir, `${selected.itemId}.vtt`);
    await copyFile(srt, deliverableSrt); await copyFile(vtt, deliverableVtt);
    const approvedScript = path.join(deliverablesDir, `${selected.itemId}-approved-script.txt`);
    await copyFile(path.join(itemRoot, "script.txt"), approvedScript);
    let contactSheet: string | undefined;
    if (selected.contactSheet && await exists(selected.contactSheet)) { contactSheet = path.join(deliverablesDir, `${selected.itemId}-contact-sheet.png`); await copyFile(selected.contactSheet, contactSheet); }
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
    const privateProvenance = path.join(manifest.workspaceRoot, "private", selected.itemId, "provenance-bundle.json");
    await atomicWriteJson(privateProvenance, { schemaVersion: 1, itemId: selected.itemId, deck: { path: selected.deck, sha256: await hashFile(selected.deck) }, audio: { path: selected.audio, sha256: await hashFile(selected.audio), generationProvenance: selected.provenance }, timeline: { path: timelinePath, sha256: await hashFile(timelinePath) }, createdAt: new Date().toISOString() });
    assembled.push({ itemId: selected.itemId, deck: selected.deck, audioMaster: selected.audio, audioSha256: await hashFile(selected.audio), timings, captions: { srt: deliverableSrt, vtt: deliverableVtt }, approvedScript, contactSheet, privateProvenance, selectedRenders: renderRoot, mp4, pptx, ppsx, nativeApplied, nativeScript: scriptPath });
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
    const assembledIds = new Set(assembly.items.map((item) => String(item.itemId)));
    for (const expected of manifest.seriesItems) if (!assembledIds.has(expected.id)) blockers.push(`${expected.id}: series item is missing from assembly`);
    for (const item of assembly.items) {
      const missing: string[] = [];
      for (const key of ["mp4", "pptx", "ppsx", "approvedScript", "contactSheet"] as const) if (typeof item[key] !== "string" || !await exists(String(item[key]))) missing.push(key);
      const captions = item.captions as Record<string, unknown> | undefined;
      for (const key of ["srt", "vtt"] as const) if (typeof captions?.[key] !== "string" || !await exists(String(captions[key]))) missing.push(key);
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
      let visualTimeline: Record<string, unknown> | null = null;
      if (!missing.includes("mp4") && typeof item.selectedRenders === "string" && Array.isArray(item.timings)) {
        try { visualTimeline = JSON.parse(runAllowed("node", [path.join(REPO_ROOT, "scripts", "verify_visual_timeline.mjs"), String(item.mp4), item.selectedRenders, JSON.stringify(item.timings)], { cwd: REPO_ROOT })); }
        catch { blockers.push(`${item.itemId}: sampled video frames do not match the approved slide timeline`); }
      } else blockers.push(`${item.itemId}: rendered-slide evidence is missing for visual timeline verification`);
      items.push({ itemId: item.itemId, missing, nativeApplied: item.nativeApplied, audioSha256: item.audioSha256, audioContinuity, visualTimeline, packageIntegrity, checksums });
    }
  }
  const report = { schemaVersion: 1, checkedAt: new Date().toISOString(), passed: blockers.length === 0, blockers, items, disclosurePresent: true, nativePlaybackRequired: true };
  await validateJsonValue("release-report", report);
  const reportPath = path.join(manifest.workspaceRoot, "reports", "release-report.json");
  await atomicWriteJson(reportPath, report);
  return { ...report, reportPath };
}

export async function exportDeliverables(manifest: ProjectManifest): Promise<Record<string, unknown>> {
  if (!manifest.approvals.release || manifest.state !== "release_approved") throw new Error("Final release approval is required before export");
  const root = path.join(manifest.workspaceRoot, "deliverables");
  const releaseReport = JSON.parse(await readFile(path.join(manifest.workspaceRoot, "reports", "release-report.json"), "utf8")) as Record<string, unknown>;
  await atomicWriteJson(path.join(root, "release-report.redacted.json"), releaseReport);
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
