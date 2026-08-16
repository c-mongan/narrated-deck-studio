import { chmod, lstat, mkdir, realpath, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const WINDOWS_PRIVATE_ACL_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($env:NDS_PRIVATE_ROOT)
$sid = [System.Security.Principal.SecurityIdentifier]::new($env:NDS_PRIVATE_SID)
function Set-PrivateAcl([string] $literalPath) {
  $item = Get-Item -LiteralPath $literalPath -Force
  if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "Reparse points are not allowed in private workspace"
  }
  if ($item.PSIsContainer) {
    $acl = [System.Security.AccessControl.DirectorySecurity]::new()
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      [System.Security.AccessControl.FileSystemRights]::FullControl,
      ([System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [System.Security.AccessControl.InheritanceFlags]::ObjectInherit),
      [System.Security.AccessControl.PropagationFlags]::None,
      [System.Security.AccessControl.AccessControlType]::Allow
    )
  } else {
    $acl = [System.Security.AccessControl.FileSecurity]::new()
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      [System.Security.AccessControl.FileSystemRights]::FullControl,
      [System.Security.AccessControl.AccessControlType]::Allow
    )
  }
  $acl.SetAccessRuleProtection($true, $false)
  $acl.SetOwner($sid)
  [void] $acl.AddAccessRule($rule)
  $item.SetAccessControl($acl)
}
Set-PrivateAcl $root
Get-ChildItem -LiteralPath $root -Force -Recurse | ForEach-Object {
  Set-PrivateAcl $_.FullName
}
`;

async function hardenWindowsPrivateTree(pathname: string): Promise<void> {
  const { stdout } = await execFileAsync("whoami.exe", ["/user", "/fo", "csv", "/nh"], { encoding: "utf8" });
  const match = stdout.trim().match(/,"(S-1-(?:\d+-)+\d+)"$/i);
  if (!match) throw new Error("Unable to determine the current Windows user SID");
  await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_PRIVATE_ACL_SCRIPT],
    { env: { ...process.env, NDS_PRIVATE_ROOT: pathname, NDS_PRIVATE_SID: match[1] } },
  );
}

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
  if (process.platform === "win32") await hardenWindowsPrivateTree(pathname);
  else await chmod(pathname, 0o700);
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
