import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pins = JSON.parse(await readFile(path.join(root, "docs", "DEPENDENCY_PINS.json"), "utf8"));
const pin = pins.externalEngines.pptMaster;
const args = process.argv.slice(2);
const replace = args.includes("--replace");
const hostsArg = args.find((value) => value.startsWith("--hosts="))?.slice("--hosts=".length) ?? "codex,hermes";
const hosts = hostsArg.split(",").map((value) => value.trim()).filter(Boolean);
if (hosts.some((host) => !["codex", "hermes"].includes(host))) throw new Error("Hosts must be codex, hermes, or both");

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { cwd: options.cwd ?? root, encoding: "utf8", stdio: options.capture ? "pipe" : "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}${result.stderr ? `: ${result.stderr.trim()}` : ""}`);
  return result.stdout?.trim() ?? "";
}

async function exists(pathname) { return stat(pathname).then(() => true, () => false); }

const dataRoot = process.platform === "win32" && process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "NarratedDeckStudio", "engines")
  : path.join(os.homedir(), ".local", "share", "narrated-deck-studio", "engines");
const engineRoot = path.join(dataRoot, "ppt-master", pin.commit);
if (await exists(engineRoot)) {
  const current = run("git", ["rev-parse", "HEAD"], { cwd: engineRoot, capture: true });
  if (current !== pin.commit) throw new Error(`Existing PPT Master checkout has unexpected commit ${current}`);
} else {
  const staging = `${engineRoot}.installing`;
  await rm(staging, { recursive: true, force: true });
  await mkdir(path.dirname(engineRoot), { recursive: true });
  run("git", ["clone", "--filter=blob:none", "--no-checkout", pin.repository, staging]);
  run("git", ["checkout", "--detach", pin.commit], { cwd: staging });
  const current = run("git", ["rev-parse", "HEAD"], { cwd: staging, capture: true });
  if (current !== pin.commit) throw new Error(`PPT Master checkout verification failed: ${current}`);
  await mkdir(path.dirname(engineRoot), { recursive: true });
  await cp(staging, engineRoot, { recursive: true });
  await rm(staging, { recursive: true, force: true });
}

const sourceSkill = path.join(engineRoot, "skills", "ppt-master");
if (!await exists(path.join(sourceSkill, "SKILL.md"))) throw new Error("Pinned PPT Master checkout does not contain skills/ppt-master/SKILL.md");
for (const host of hosts) {
  const skillRoot = host === "codex" ? path.join(os.homedir(), ".codex", "skills") : path.join(os.homedir(), ".hermes", "skills");
  const destination = path.join(skillRoot, "ppt-master");
  if (await exists(destination)) {
    if (!replace) throw new Error(`${host} PPT Master skill already exists; pass --replace to refresh it`);
    await rm(destination, { recursive: true, force: true });
  }
  await mkdir(skillRoot, { recursive: true });
  await cp(sourceSkill, destination, { recursive: true });
  await writeFile(path.join(destination, ".narrated-deck-studio-pin.json"), `${JSON.stringify({ repository: pin.repository, tag: pin.tag, commit: pin.commit, installedAt: new Date().toISOString(), engineRoot }, null, 2)}\n`, { mode: 0o600 });
}

await writeFile(path.join(engineRoot, "narrated-deck-studio-install-receipt.json"), `${JSON.stringify({ schemaVersion: 1, repository: pin.repository, tag: pin.tag, commit: pin.commit, installedAt: new Date().toISOString(), hosts }, null, 2)}\n`, { mode: 0o600 });
console.log(`PPT Master ${pin.tag} (${pin.commit}) installed for ${hosts.join(" + ")}`);
console.log(`Engine: ${engineRoot}`);
