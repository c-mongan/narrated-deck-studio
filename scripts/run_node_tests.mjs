import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tests = readdirSync(path.join(root, "tests"), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
  .map((entry) => path.join("tests", entry.name))
  .sort();

if (tests.length === 0) throw new Error("No legacy Node test files were found");
const result = spawnSync(process.execPath, ["--test", ...tests], { cwd: root, stdio: "inherit", shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
