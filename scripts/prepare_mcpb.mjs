import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = path.join(root, "mcpb", "server");
await rm(server, { recursive: true, force: true });
await mkdir(server, { recursive: true });
await cp(path.join(root, "dist", "src"), path.join(server, "src"), { recursive: true });
await cp(path.join(root, "schemas"), path.join(server, "schemas"), { recursive: true });
await cp(path.join(root, "scripts"), path.join(server, "scripts"), { recursive: true, filter: (source) => !source.endsWith("prepare_mcpb.mjs") });
await cp(path.join(root, "dist", "packages", "remotion-compositor"), path.join(server, "packages", "remotion-compositor"), { recursive: true });
await cp(path.join(root, "packages", "world-class-decks"), path.join(server, "packages", "world-class-decks"), { recursive: true });
await writeFile(path.join(server, "package.json"), `${JSON.stringify({
  name: "narrated-deck-studio-mcp-runtime",
  version: "0.2.0",
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
execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: server, stdio: "inherit" });
