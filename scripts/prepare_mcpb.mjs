import { cp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = path.join(root, "mcpb", "server");
const nonce = `${process.pid}-${Date.now()}`;
const staging = `${server}.staging-${nonce}`;
const previous = `${server}.previous-${nonce}`;
const cacheDirectories = new Set([".mypy_cache", ".pytest_cache", ".ruff_cache", "__pycache__"]);
function runtimeSourceFilter(source) {
  const parts = source.split(path.sep);
  return !parts.some((part) => cacheDirectories.has(part)) && !source.endsWith(".pyc") && !source.endsWith(".pyo");
}
await rm(staging, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
await mkdir(staging, { recursive: true });
await cp(path.join(root, "dist", "src"), path.join(staging, "src"), { recursive: true });
await cp(path.join(root, "schemas"), path.join(staging, "schemas"), { recursive: true });
await cp(path.join(root, "scripts"), path.join(staging, "scripts"), { recursive: true, filter: (source) => !source.endsWith("prepare_mcpb.mjs") });
await cp(path.join(root, "dist", "packages", "remotion-compositor"), path.join(staging, "packages", "remotion-compositor"), { recursive: true });
await cp(path.join(root, "packages", "world-class-decks"), path.join(staging, "packages", "world-class-decks"), { recursive: true, filter: runtimeSourceFilter });
await writeFile(path.join(staging, "package.json"), `${JSON.stringify({
  name: "narrated-deck-studio-mcp-runtime",
  version: "0.3.0",
  private: true,
  type: "module",
  dependencies: {
    "@modelcontextprotocol/sdk": "1.30.0",
    "@remotion/bundler": "4.0.512",
    "@remotion/renderer": "4.0.512",
    "adm-zip": "0.6.0",
    "ajv": "8.17.1",
    "ajv-formats": "3.0.1",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "remotion": "4.0.512",
    "zod": "3.25.76"
  }
}, null, 2)}\n`);
execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: staging, stdio: "inherit" });
try {
  await rename(server, previous);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await rename(staging, server);
await rm(previous, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
