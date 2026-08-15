import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = process.platform === "win32" ? ["python", "py"] : [process.env.NDS_PYTHON, "python3", "python"].filter(Boolean);
let last;
for (const command of candidates) {
  const args = command === "py" ? ["-3.11", "-m", "pytest", "-q", "packages/world-class-decks/tests"] : ["-m", "pytest", "-q", "packages/world-class-decks/tests"];
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PYTHONPATH: path.join(root, "packages", "world-class-decks", "src") },
  });
  if (!result.error) process.exit(result.status ?? 1);
  last = result.error;
}
throw last ?? new Error("Python 3.11 is required");
