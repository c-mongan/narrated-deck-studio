import { chmod, lstat, mkdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

export async function canonicalExistingDirectory(input: string): Promise<string> {
  const resolved = await realpath(path.resolve(input));
  const info = await stat(resolved);
  if (!info.isDirectory()) throw new Error(`Expected a directory: ${input}`);
  return resolved;
}

export function assertWithinRoot(root: string, candidate: string): void {
  const relative = path.relative(root, candidate);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return;
  throw new Error(`Path escapes the approved project root: ${candidate}`);
}

export async function assertNoSymlink(pathname: string): Promise<void> {
  const info = await lstat(pathname);
  if (info.isSymbolicLink()) throw new Error(`Symbolic links are not permitted: ${pathname}`);
}

export async function ensurePrivateDirectory(pathname: string): Promise<void> {
  await mkdir(pathname, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") await chmod(pathname, 0o700);
}

export function assertLoopbackHost(host: string): void {
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(host)) {
    throw new Error("Review and voice services must bind to loopback only");
  }
}

export function safeProjectId(value: string): string {
  const clean = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return clean || "narrated-deck-project";
}
