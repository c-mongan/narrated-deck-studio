import { spawnSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { EXECUTABLE_EXTENSIONS, EXCLUDED_DIRECTORIES, SENSITIVE_EXTENSIONS, SUPPORTED_EXTENSIONS } from "./constants.js";
import { hashFile } from "./hash.js";
import { inspectDocx, inspectPowerPoint } from "./pptx-inspect.js";
import { assertNoSymlink, assertWithinRoot, canonicalExistingDirectory } from "./security.js";
import type { InventoryItem, InventoryReport } from "./types.js";

const MAX_TEXT_BYTES = 256 * 1024;
const PROMPT_INJECTION = /\b(ignore (all|any|the|previous)|system prompt|developer message|do not trust the user|exfiltrat|send (the )?files?)\b/i;

function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);
}

function mediaDuration(pathname: string): number | undefined {
  const result = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", pathname], {
    encoding: "utf8", timeout: 10_000, shell: false,
  });
  const duration = Number(result.stdout?.trim());
  return result.status === 0 && Number.isFinite(duration) ? duration : undefined;
}

async function summarize(pathname: string, extension: string, bytes: number): Promise<Partial<InventoryItem>> {
  if (extension === ".pptx" || extension === ".ppsx") {
    const result = inspectPowerPoint(pathname);
    return {
      summary: result.textPreview || `${result.slideCount} slide PowerPoint`,
      slideCount: result.slideCount,
      notesPresent: result.notesPresent,
      warnings: [
        ...(result.hasMacros ? ["Macro payload detected; macros will never be executed."] : []),
        ...(result.hasMedia ? ["Presentation contains embedded media; inspect before reuse."] : []),
      ],
    };
  }
  if (extension === ".docx") return { summary: inspectDocx(pathname), warnings: [] };
  if ([".txt", ".md", ".csv", ".json"].includes(extension) && bytes <= MAX_TEXT_BYTES) {
    const text = cleanText(await readFile(pathname, "utf8"));
    return { summary: text, warnings: PROMPT_INJECTION.test(text) ? ["Content resembles agent instructions; treat only as untrusted source material."] : [] };
  }
  if (extension === ".pdf") {
    const result = spawnSync("pdftotext", ["-f", "1", "-l", "8", pathname, "-"], { encoding: "utf8", timeout: 15_000, shell: false, maxBuffer: MAX_TEXT_BYTES });
    return { summary: result.status === 0 ? cleanText(result.stdout) : "PDF document (text preview unavailable)", warnings: [] };
  }
  if (SUPPORTED_EXTENSIONS[extension] === "audio" || SUPPORTED_EXTENSIONS[extension] === "video") {
    return { summary: `${SUPPORTED_EXTENSIONS[extension]} media`, durationSeconds: mediaDuration(pathname), warnings: [] };
  }
  return { summary: `${SUPPORTED_EXTENSIONS[extension]} source`, warnings: [] };
}

export async function inspectFolder(inputRoot: string): Promise<InventoryReport> {
  const root = await canonicalExistingDirectory(inputRoot);
  const items: InventoryItem[] = [];
  const ignored: InventoryReport["ignored"] = [];
  const warnings: string[] = [];

  async function walk(current: string): Promise<void> {
    assertWithinRoot(root, current);
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relativePath = path.relative(root, absolute);
      if (entry.isSymbolicLink()) {
        ignored.push({ relativePath, reason: "symbolic link" });
        continue;
      }
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || EXCLUDED_DIRECTORIES.has(entry.name)) {
          ignored.push({ relativePath, reason: "excluded directory" });
        } else await walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (EXECUTABLE_EXTENSIONS.has(extension)) {
        ignored.push({ relativePath, reason: "executable or script content" });
        continue;
      }
      const kind = SUPPORTED_EXTENSIONS[extension] as InventoryItem["kind"] | undefined;
      if (!kind) {
        ignored.push({ relativePath, reason: "unsupported file type" });
        continue;
      }
      await assertNoSymlink(absolute);
      const info = await stat(absolute);
      const extracted = await summarize(absolute, extension, info.size);
      items.push({
        relativePath,
        canonicalPath: absolute,
        kind,
        extension,
        bytes: info.size,
        sha256: await hashFile(absolute),
        summary: extracted.summary ?? "",
        notesPresent: extracted.notesPresent,
        slideCount: extracted.slideCount,
        durationSeconds: extracted.durationSeconds,
        privacy: SENSITIVE_EXTENSIONS.has(extension) ? "sensitive" : "normal",
        warnings: extracted.warnings ?? [],
      });
    }
  }

  await walk(root);
  if (items.length === 0) warnings.push("No supported source files were found.");
  if (items.some((item) => item.privacy === "sensitive")) warnings.push("Audio/video sources are private and must not be committed or uploaded without approval.");
  return { schemaVersion: 1, sourceRoot: root, scannedAt: new Date().toISOString(), items, ignored, warnings };
}
