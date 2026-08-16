import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tests = readdirSync(path.join(root, "tests-studio"), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.ts"))
  .map((entry) => path.join("tests-studio", entry.name))
  .sort();

if (tests.length === 0) throw new Error("No studio TypeScript test files were found");
const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const result = spawnSync(process.execPath, [tsxCli, "--test", ...tests], { cwd: root, stdio: "inherit", shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
