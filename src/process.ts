import { spawnSync } from "node:child_process";
import path from "node:path";

const ALLOWED = new Set(["node", "node.exe", "python", "python.exe", "python3", "pwsh", "powershell", "powershell.exe"]);

export function runAllowed(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {}): string {
  const base = path.basename(command).toLowerCase();
  if (!ALLOWED.has(base)) throw new Error(`Command is not allowlisted: ${base}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    shell: false,
    timeout: options.timeoutMs ?? 30 * 60_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${base} failed (${result.status}): ${(result.stderr || result.stdout).slice(-8000)}`);
  return result.stdout;
}
