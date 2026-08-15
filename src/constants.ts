import path from "node:path";

export const WORKSPACE_DIR = ".narrated-deck-studio";
export const MANIFEST_FILE = "project.json";
export const INVENTORY_FILE = "inventory.json";
export const PLAN_FILE = "plan.json";
export const RECEIPTS_FILE = "receipts.ndjson";

export const EXCLUDED_DIRECTORIES = new Set([
  ".git", ".svn", ".hg", "node_modules", ".venv", "venv", "dist", "build",
  "coverage", ".pytest_cache", "__pycache__", WORKSPACE_DIR,
]);

export const EXECUTABLE_EXTENSIONS = new Set([
  ".app", ".bat", ".bin", ".cmd", ".com", ".dll", ".dmg", ".exe", ".js",
  ".mjs", ".msi", ".pkg", ".ps1", ".py", ".scr", ".sh", ".vbs",
]);

export const SUPPORTED_EXTENSIONS: Record<string, string> = {
  ".pptx": "powerpoint", ".ppsx": "powerpoint",
  ".pdf": "document", ".docx": "document", ".odt": "document", ".rtf": "document",
  ".txt": "text", ".md": "text",
  ".json": "data", ".csv": "data", ".xlsx": "data",
  ".wav": "audio", ".mp3": "audio", ".m4a": "audio", ".flac": "audio", ".aac": "audio", ".ogg": "audio",
  ".mp4": "video", ".mov": "video", ".webm": "video", ".mkv": "video",
  ".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image", ".svg": "image",
};

export const SENSITIVE_EXTENSIONS = new Set([
  ".wav", ".mp3", ".m4a", ".flac", ".aac", ".ogg", ".mp4", ".mov", ".webm", ".mkv",
]);

export const gateArtifact = (workspaceRoot: string, gate: string): string => {
  const names: Record<string, string> = {
    plan: PLAN_FILE,
    deck: path.join("review", "deck-review.json"),
    voice: path.join("review", "voice-review.json"),
    release: path.join("reports", "release-report.json"),
  };
  if (!names[gate]) throw new Error(`Unknown approval gate: ${gate}`);
  return path.join(workspaceRoot, names[gate]);
};
