#!/usr/bin/env node

import {
  chmodSync, existsSync, mkdirSync, readdirSync, realpathSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function parseIngestArgs(argv) {
  const options = {
    source: null,
    output: null,
    voiceReference: false,
    speakerConsent: false,
    sourceAuthorized: false,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--') && !options.source) options.source = value;
    else if (value === '--output') options.output = argv[++index];
    else if (value === '--voice-reference') options.voiceReference = true;
    else if (value === '--speaker-consent') options.speakerConsent = true;
    else if (value === '--source-authorized') options.sourceAuthorized = true;
    else if (value === '--dry-run') options.dryRun = true;
    else throw new Error(`Unknown or misplaced argument: ${value}`);
  }
  if (!options.source) throw new Error('A local media file or YouTube URL is required');
  if (!options.output) throw new Error('--output must point to a private job directory outside the repository');
  return options;
}

function isYouTube(source) {
  try {
    const host = new URL(source).hostname.replace(/^www\./, '');
    return host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com');
  } catch {
    return false;
  }
}

function canonicalPath(path) {
  let ancestor = resolve(path);
  const suffix = [];
  while (!existsSync(ancestor)) {
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    suffix.unshift(basename(ancestor));
    ancestor = parent;
  }
  return resolve(realpathSync(ancestor), ...suffix);
}

function assertPrivateDestination(path) {
  const destination = canonicalPath(path);
  const rel = relative(PROJECT_ROOT, destination);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
    throw new Error('Output must be outside the repository private-data boundary');
  }
  return destination;
}

export function buildIngestPlan(options) {
  if (options.voiceReference && !options.speakerConsent) {
    throw new Error('Voice-reference ingestion requires explicit speaker consent');
  }
  const youtube = isYouTube(options.source);
  if (youtube && !options.sourceAuthorized) {
    throw new Error('YouTube ingestion requires explicit source authorization');
  }
  const output = assertPrivateDestination(options.output);
  if (youtube) {
    const target = join(output, options.voiceReference ? 'reference.%(ext)s' : 'source.%(ext)s');
    return {
      kind: 'youtube', output,
      commands: [{
        command: 'yt-dlp',
        args: [
          '--no-playlist', '--write-info-json', '--write-subs', '--write-auto-subs',
          '--sub-langs', 'all,-live_chat', '-x', '--audio-format', 'wav',
          '--audio-quality', '0', '-o', target, options.source,
        ],
      }],
    };
  }
  const target = join(output, options.voiceReference ? 'reference.wav' : 'source.wav');
  return {
    kind: 'local', output,
    commands: [{
      command: 'ffmpeg',
      args: ['-hide_banner', '-nostdin', '-y', '-i', resolve(options.source), '-vn', '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', target],
    }],
  };
}

function hardenTree(path) {
  if (process.platform !== 'win32') chmodSync(path, 0o700);
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed in private output: ${entry.name}`);
    }
    if (entry.isDirectory()) hardenTree(child);
    else if (process.platform !== 'win32') chmodSync(child, 0o600);
  }
}

export function parseWhoamiSid(output) {
  const match = String(output).trim().match(/,"(S-1-(?:\d+-)+\d+)"$/i);
  if (!match) throw new Error('Unable to determine the current Windows user SID');
  return match[1];
}

function currentWindowsUserSid() {
  const result = spawnSync('whoami.exe', ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('whoami could not determine the current Windows user SID');
  return parseWhoamiSid(result.stdout);
}

const WINDOWS_PRIVATE_ACL_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($env:NDT_PRIVATE_ROOT)
$sid = [System.Security.Principal.SecurityIdentifier]::new($env:NDT_PRIVATE_SID)
function Set-PrivateAcl([string] $literalPath) {
  $item = Get-Item -LiteralPath $literalPath -Force
  if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "Reparse points are not allowed in private output"
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

function hardenPrivateOutput(path) {
  hardenTree(path);
  if (process.platform === 'win32') {
    const sid = currentWindowsUserSid();
    const result = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_PRIVATE_ACL_SCRIPT],
      {
        stdio: 'inherit',
        shell: false,
        env: { ...process.env, NDT_PRIVATE_ROOT: path, NDT_PRIVATE_SID: sid },
      },
    );
    if (result.status !== 0) throw new Error(`Windows private ACL enforcement failed with exit code ${result.status}`);
  }
}

function runPrivateStep(step) {
  const previousUmask = process.platform === 'win32' ? null : process.umask(0o077);
  try {
    return spawnSync(step.command, step.args, { stdio: 'inherit', shell: false });
  } finally {
    if (previousUmask !== null) process.umask(previousUmask);
  }
}

export function redactPlan(plan) {
  return {
    kind: plan.kind,
    output: '<private-output>',
    commands: plan.commands.map((step) => ({
      command: basename(step.command),
      arguments: '<redacted>',
    })),
  };
}

export function executePlan(plan, source) {
  mkdirSync(plan.output, { recursive: true, mode: 0o700 });
  hardenPrivateOutput(plan.output);
  for (const step of plan.commands) {
    const result = runPrivateStep(step);
    if (result.status !== 0) throw new Error(`${step.command} failed with exit code ${result.status}`);
  }
  hardenPrivateOutput(plan.output);
  const manifest = {
    createdAt: new Date().toISOString(),
    source: isYouTube(source) ? 'authorized-youtube-source' : 'local-media-source',
    sourceKind: plan.kind,
    commands: plan.commands.map((step) => ({ command: basename(step.command) })),
    note: 'Speaker permission evidence and private profile identifiers must remain outside git.',
  };
  writeFileSync(join(plan.output, 'ingest-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  hardenPrivateOutput(plan.output);
}

function usage() {
  return 'Usage: node scripts/ingest_media.mjs SOURCE --output PRIVATE_DIR [--voice-reference --speaker-consent] [--source-authorized for YouTube] [--dry-run]';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const options = parseIngestArgs(process.argv.slice(2));
    const plan = buildIngestPlan(options);
    if (options.dryRun) console.log(JSON.stringify(redactPlan(plan), null, 2));
    else executePlan(plan, options.source);
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 1;
  }
}
