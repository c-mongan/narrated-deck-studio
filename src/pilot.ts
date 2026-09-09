import { copyFile, mkdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { atomicWriteJson, loadProject } from "./project-store.js";
import { hashFile } from "./hash.js";
import { extractPowerPointSlideContent } from "./pptx-inspect.js";
import { assertNoSymlink, assertWithinRoot } from "./security.js";
import type { ProjectManifest } from "./types.js";

export type PilotFlagCategory = "missing-notes" | "dense-slide" | "chart" | "names-and-numbers" | "sparse-slide" | "layout-change";

export interface PilotSlide {
  slide: number;
  title: string;
  narration: string;
  narrationSource: "speaker-notes" | "drafted-from-slide";
  wordCount: number;
  flags: Array<{ category: PilotFlagCategory; message: string }>;
  representative: boolean;
  reviewStatus: "ready" | "needs-review" | "revised";
}

export interface PilotItem {
  itemId: string;
  title: string;
  sourceDeck: string;
  sourceSha256: string;
  slideCount: number;
  slides: PilotSlide[];
  representativeSlides: number[];
  interventionCount: number;
  previewAudio?: { path: string; sha256: string; kind: "deterministic-test" | "authorized-voice" };
}

export interface PilotPackage {
  schemaVersion: 1;
  createdAt: string;
  status: "draft-review-only";
  disclaimer: string;
  items: PilotItem[];
  failureCategories: Record<PilotFlagCategory, number>;
}

function words(value: string): string[] { return value.trim().split(/\s+/).filter(Boolean); }
function sentence(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "Explain the purpose of this slide and the decision it supports.";
  return `This slide highlights ${compact.replace(/[.!?]+$/, "")}.`;
}
function titleFor(text: string, slide: number): string {
  const first = text.split(/(?<=[.!?])\s+|\s{2,}/)[0]?.trim();
  return first?.slice(0, 90) || `Slide ${slide}`;
}

function flagsFor(text: string, notes: string, chartCount: number, layoutChanged: boolean): PilotSlide["flags"] {
  const result: PilotSlide["flags"] = [];
  const count = words(text).length;
  if (!notes.trim()) result.push({ category: "missing-notes", message: "Speaker notes are missing; narration was drafted from visible slide text." });
  if (count > 80) result.push({ category: "dense-slide", message: `Dense slide (${count} words) needs pacing or editorial reduction review.` });
  if (count < 4) result.push({ category: "sparse-slide", message: "Very little extractable text; verify the intended visual claim." });
  if (chartCount > 0) result.push({ category: "chart", message: `${chartCount} chart${chartCount === 1 ? "" : "s"} detected; verify that narration explains the visible evidence.` });
  if (/\b(?:\d[\d,.%€$£-]*|[A-Z][a-z]+\s+[A-Z][a-z]+)\b/.test(`${text} ${notes}`)) result.push({ category: "names-and-numbers", message: "Names or numbers detected; pronunciation and factual readback need review." });
  if (layoutChanged) result.push({ category: "layout-change", message: "Layout differs from the preceding slide; include it in visual preview coverage." });
  return result;
}

function chooseRepresentatives(slides: PilotSlide[], maximum = 3): number[] {
  if (!slides.length) return [];
  const ranked = [...slides].sort((a, b) => b.flags.length - a.flags.length || a.slide - b.slide);
  const selected = new Set<number>([slides[0]!.slide]);
  for (const slide of ranked) { if (selected.size >= maximum) break; selected.add(slide.slide); }
  return [...selected].sort((a, b) => a - b);
}

function requirePilotStage(manifest: ProjectManifest): void {
  if (!new Set(["planned", "plan_approved"]).has(manifest.state)) throw new Error(`Pilot work requires a drafted or approved plan, not ${manifest.state}`);
}

async function buildItem(manifest: ProjectManifest, itemId: string): Promise<PilotItem> {
  const planItem = manifest.seriesItems.find((item) => item.id === itemId);
  if (!planItem) throw new Error(`Unknown series item ${itemId}`);
  const sourceDeck = planItem.sourceDeck ?? planItem.sourceDecks?.[0];
  if (!sourceDeck) throw new Error(`Pilot preparation requires an existing PowerPoint for ${itemId}`);
  const absolute = await realpath(path.resolve(manifest.sourceRoot, sourceDeck));
  assertWithinRoot(manifest.sourceRoot, absolute);
  const content = extractPowerPointSlideContent(absolute);
  const slides: PilotSlide[] = content.map((slide, index) => {
    const notes = slide.notes.trim();
    const narration = notes || sentence(slide.text);
    return {
      slide: slide.slide,
      title: titleFor(slide.text, slide.slide),
      narration,
      narrationSource: notes ? "speaker-notes" : "drafted-from-slide",
      wordCount: words(narration).length,
      flags: flagsFor(slide.text, notes, slide.chartCount, index > 0 && content[index - 1]!.layout !== slide.layout),
      representative: false,
      reviewStatus: "ready",
    };
  });
  for (const slide of slides) if (slide.flags.length) slide.reviewStatus = "needs-review";
  const representativeSlides = chooseRepresentatives(slides);
  for (const slide of slides) slide.representative = representativeSlides.includes(slide.slide);
  return { itemId, title: planItem.title, sourceDeck, sourceSha256: await hashFile(absolute), slideCount: slides.length, slides, representativeSlides, interventionCount: slides.filter((slide) => slide.flags.length > 0).length };
}

export async function preparePilot(workspace: string): Promise<{ reviewPath: string; exportPath: string; pilot: PilotPackage }> {
  const manifest = await loadProject(path.resolve(workspace));
  requirePilotStage(manifest);
  const items = await Promise.all(manifest.seriesItems.map((item) => buildItem(manifest, item.id)));
  const failureCategories = Object.fromEntries(["missing-notes", "dense-slide", "chart", "names-and-numbers", "sparse-slide", "layout-change"].map((category) => [category, items.flatMap((item) => item.slides).filter((slide) => slide.flags.some((flag) => flag.category === category)).length])) as Record<PilotFlagCategory, number>;
  const pilot: PilotPackage = { schemaVersion: 1, createdAt: new Date().toISOString(), status: "draft-review-only", disclaimer: "This representative pilot is not an approval receipt or a final managed release.", items, failureCategories };
  const reviewPath = path.join(manifest.workspaceRoot, "review", "pilot-review.json");
  const exportPath = path.join(manifest.workspaceRoot, "deliverables", "pilot-package.json");
  await atomicWriteJson(reviewPath, pilot);
  await atomicWriteJson(exportPath, pilot);
  return { reviewPath, exportPath, pilot };
}

export async function attachPilotPreview(workspace: string, itemId: string, audioInput: string, kind: "deterministic-test" | "authorized-voice", permissionConfirmed = false): Promise<Record<string, unknown>> {
  const manifest = await loadProject(path.resolve(workspace));
  requirePilotStage(manifest);
  if (kind === "authorized-voice" && !permissionConfirmed) throw new Error("Explicit permission is required for an authorized-voice pilot preview");
  const input = await realpath(path.resolve(audioInput));
  await assertNoSymlink(input);
  if (!(await stat(input)).isFile() || !new Set([".wav", ".mp3", ".m4a"]).has(path.extname(input).toLowerCase())) throw new Error("Pilot preview must be a WAV, MP3 or M4A file");
  const reviewPath = path.join(manifest.workspaceRoot, "review", "pilot-review.json");
  const pilot = JSON.parse(await readFile(reviewPath, "utf8")) as PilotPackage;
  const item = pilot.items.find((candidate) => candidate.itemId === itemId);
  if (!item) throw new Error(`Unknown pilot item ${itemId}`);
  const directory = path.join(manifest.workspaceRoot, "private", itemId, "pilot");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const output = path.join(directory, `representative-preview${path.extname(input).toLowerCase()}`);
  await copyFile(input, output);
  item.previewAudio = { path: path.relative(manifest.workspaceRoot, output), sha256: await hashFile(output), kind };
  await atomicWriteJson(reviewPath, pilot);
  await atomicWriteJson(path.join(manifest.workspaceRoot, "deliverables", "pilot-package.json"), pilot);
  return { attached: true, itemId, preview: item.previewAudio.path, sha256: item.previewAudio.sha256, releaseGateAdvanced: false };
}

export async function revisePilotNarration(workspace: string, itemId: string, slideNumber: number, narration: string): Promise<Record<string, unknown>> {
  const manifest = await loadProject(path.resolve(workspace));
  requirePilotStage(manifest);
  if (!narration.trim()) throw new Error("Revised narration cannot be empty");
  const reviewPath = path.join(manifest.workspaceRoot, "review", "pilot-review.json");
  const pilot = JSON.parse(await readFile(reviewPath, "utf8")) as PilotPackage;
  const item = pilot.items.find((candidate) => candidate.itemId === itemId);
  if (!item) throw new Error(`Unknown pilot item ${itemId}`);
  const source = await realpath(path.resolve(manifest.sourceRoot, item.sourceDeck));
  assertWithinRoot(manifest.sourceRoot, source);
  if (await hashFile(source) !== item.sourceSha256) throw new Error("The source PowerPoint changed; prepare a fresh pilot before revising narration");
  const slide = item.slides.find((candidate) => candidate.slide === slideNumber);
  if (!slide) throw new Error(`Unknown slide ${slideNumber} for ${itemId}`);
  slide.narration = narration.trim();
  slide.wordCount = words(slide.narration).length;
  slide.reviewStatus = "revised";
  await atomicWriteJson(reviewPath, pilot);
  await atomicWriteJson(path.join(manifest.workspaceRoot, "deliverables", "pilot-package.json"), pilot);
  return { revised: true, itemId, slide: slideNumber, reviewStatus: slide.reviewStatus, approvalStateChanged: false };
}
