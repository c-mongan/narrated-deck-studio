import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const arguments_ = process.argv.slice(2);
const replace = arguments_.includes("--replace");
const skipBuild = arguments_.includes("--skip-build");
const hostsArg = arguments_.find((value) => value.startsWith("--hosts="))?.slice("--hosts=".length) ?? "codex,hermes";
const hosts = hostsArg.split(",").map((value) => value.trim()).filter(Boolean);
if (hosts.some((host) => !["codex", "hermes"].includes(host))) throw new Error("Hosts must be codex, hermes, or both");

function run(command, args, options = {}) {
  const stdio = options.input ? ["pipe", "inherit", "inherit"] : options.capture ? "pipe" : "inherit";
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", stdio, input: options.input, shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) throw new Error(`${command} failed with status ${result.status}`);
  return result;
}

async function exists(pathname) { return stat(pathname).then(() => true, () => false); }

function nodeExecutable() {
  const lookup = run(process.platform === "win32" ? "where.exe" : "which", ["node"], { capture: true });
  const resolved = lookup.stdout.split(/\r?\n/).map((value) => value.trim()).find(Boolean);
  if (!resolved) throw new Error("Node 20 or newer must be available on PATH");
  const major = Number(run(resolved, ["-p", "process.versions.node.split('.')[0]"], { capture: true }).stdout.trim());
  if (!Number.isInteger(major) || major < 20) throw new Error(`Narrated Deck Studio requires Node 20 or newer; found ${major}`);
  return resolved;
}

if (!skipBuild) run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "mcp:build"]);
const builtServer = path.join(root, "mcpb", "server");
if (!await exists(path.join(builtServer, "src", "mcp-server.js"))) throw new Error("Build the MCP runtime before installing hosts");

const dataRoot = process.platform === "win32" && process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "NarratedDeckStudio")
  : path.join(os.homedir(), ".local", "share", "narrated-deck-studio");
const installRoot = path.join(dataRoot, pkg.version);
if (await exists(installRoot)) {
  if (!replace) throw new Error(`Version ${pkg.version} is already installed; pass --replace to refresh it`);
  await rm(installRoot, { recursive: true, force: true });
}
await mkdir(installRoot, { recursive: true, mode: 0o700 });
await cp(builtServer, path.join(installRoot, "server"), { recursive: true });
const entry = path.join(installRoot, "server", "src", "mcp-server.js");
const nodePath = nodeExecutable();

for (const host of hosts) {
  const skillRoot = host === "codex" ? path.join(os.homedir(), ".codex", "skills") : path.join(os.homedir(), ".hermes", "skills");
  const skillDestination = path.join(skillRoot, "narrated-deck-studio");
  if (await exists(skillDestination)) {
    if (!replace) throw new Error(`${host} skill already exists; pass --replace to refresh it`);
    await rm(skillDestination, { recursive: true, force: true });
  }
  await mkdir(skillRoot, { recursive: true });
  await cp(path.join(root, "skills", "narrated-deck-studio"), skillDestination, { recursive: true });

  if (host === "codex") {
    const current = run("codex", ["mcp", "get", "narrated-deck-studio"], { allowFailure: true, capture: true });
    if (current.status === 0) {
      if (!replace) throw new Error("Codex MCP entry already exists; pass --replace to refresh it");
      run("codex", ["mcp", "remove", "narrated-deck-studio"]);
    }
    run("codex", ["mcp", "add", "narrated-deck-studio", "--", nodePath, entry]);
  } else {
    if (replace) run("hermes", ["mcp", "remove", "narrated-deck-studio"], { allowFailure: true });
    run("hermes", ["mcp", "add", "narrated-deck-studio", "--command", nodePath, "--args", entry], { input: "Y\n" });
    const verified = run("hermes", ["mcp", "test", "narrated-deck-studio"], { capture: true, allowFailure: true });
    if (verified.status !== 0 || !verified.stdout.includes("Connected")) throw new Error("Hermes did not persist or connect the MCP server");
  }
}

await writeFile(path.join(installRoot, "install-receipt.json"), `${JSON.stringify({ schemaVersion: 1, version: pkg.version, installedAt: new Date().toISOString(), hosts, entry, nodePath }, null, 2)}\n`, { mode: 0o600 });
console.log(`Narrated Deck Studio ${pkg.version} installed for ${hosts.join(" + ")}`);
console.log(`Runtime: ${installRoot}`);
