#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const TOOLCHAIN = Object.freeze([
  { name: 'yt-dlp', tier: 'required', purpose: 'authorised YouTube ingestion', probeArgs: ['--version'] },
  { name: 'ffmpeg', tier: 'required', purpose: 'media conversion and assembly', probeArgs: ['-version'] },
  { name: 'ffprobe', tier: 'required', purpose: 'stream and timing verification', probeArgs: ['-version'] },
  { name: 'node', tier: 'required', purpose: 'toolkit and deck scripts', probeArgs: ['--version'] },
  { name: 'python3', tier: 'required', purpose: 'alignment and ML tools', probeArgs: ['--version'], windowsCommand: 'python' },
  { name: 'jq', tier: 'required', purpose: 'manifest and API processing', probeArgs: ['--version'] },
  { name: 'voicebox', tier: 'required', purpose: 'authorised local voice cloning service' },
  { name: 'soffice', tier: 'required', purpose: 'PowerPoint rendering', probeArgs: ['--version'] },
  { name: 'pdftoppm', tier: 'required', purpose: 'slide-image rendering', probeArgs: ['-v'] },
  { name: 'whisperx', tier: 'recommended', purpose: 'word-level forced alignment', probeArgs: ['--help'] },
  { name: 'demucs', tier: 'recommended', purpose: 'speech and music separation', probeArgs: ['--help'] },
  { name: 'pyannote', tier: 'recommended', purpose: 'speaker diarisation', command: 'pyannote-check' },
  { name: 'scenedetect', tier: 'recommended', purpose: 'slide and scene boundaries', probeArgs: ['version'] },
  { name: 'sox', tier: 'recommended', purpose: 'audio measurement', probeArgs: ['--version'] },
  { name: 'mediainfo', tier: 'recommended', purpose: 'independent media inspection', probeArgs: ['--Version'] },
  { name: 'exiftool', tier: 'recommended', purpose: 'source metadata and provenance', probeArgs: ['-ver'] },
  { name: 'tesseract', tier: 'recommended', purpose: 'frame and slide OCR', probeArgs: ['--version'] },
  { name: 'songsee', tier: 'recommended', purpose: 'audio feature visualisation', probeArgs: ['--help'] },
  { name: 'mfa', tier: 'optional', purpose: 'phoneme-level forced alignment' },
  { name: 'magick', tier: 'optional', purpose: 'contact sheets and image transforms', probeArgs: ['-version'] },
  { name: 'mkvmerge', tier: 'optional', purpose: 'container inspection and repair', probeArgs: ['--version'] },
]);

export function probeExecutable(path, args = ['--version'], env = process.env) {
  const result = spawnSync(path, args, { stdio: 'ignore', env });
  return result.status === 0;
}

export function verifyToolPath(tool, path) {
  if (!path || !existsSync(path)) return null;
  const cleanEnv = { ...process.env };
  delete cleanEnv.PYTHONPATH;
  return probeExecutable(path, tool.probeArgs ?? ['--version'], cleanEnv) ? path : null;
}

export function toolPathCandidates(tool, platform = process.platform) {
  const command = platform === 'win32'
    ? (tool.windowsCommand ?? tool.command ?? tool.name)
    : (tool.command ?? tool.name);
  if (platform === 'win32') {
    return [
      join(PROJECT_ROOT, '.venv', 'Scripts', `${command}.exe`),
      join(process.env.HOME ?? process.env.USERPROFILE ?? '', '.local', 'bin', `${command}.exe`),
    ];
  }
  return [
    join(PROJECT_ROOT, '.venv', 'bin', command),
    join(process.env.HOME ?? '', '.local', 'bin', command),
  ];
}

function locateOnPath(command) {
  const result = process.platform === 'win32'
    ? spawnSync('where.exe', [command], { encoding: 'utf8' })
    : spawnSync('sh', ['-lc', `command -v "${command}"`], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? null;
}

function resolveInstalledTool(tool) {
  if (tool.name === 'voicebox') {
    const url = process.env.VOICEBOX_URL ?? 'http://127.0.0.1:17493';
    const result = spawnSync('curl', ['-fsS', '--max-time', '3', `${url}/health`], { encoding: 'utf8' });
    if (result.status !== 0) return null;
    try {
      return JSON.parse(result.stdout).status === 'healthy' ? url : null;
    } catch {
      return null;
    }
  }
  if (tool.name === 'pyannote') {
    const python = process.platform === 'win32'
      ? join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe')
      : join(PROJECT_ROOT, '.venv', 'bin', 'python');
    if (!existsSync(python)) return null;
    const cleanEnv = { ...process.env };
    delete cleanEnv.PYTHONPATH;
    const result = spawnSync(python, ['-c', 'import pyannote.audio'], { stdio: 'ignore', env: cleanEnv });
    return result.status === 0 ? `${python} (pyannote.audio)` : null;
  }
  if (tool.name === 'mfa') {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    const mfaRoot = join(home, '.local', 'share', 'narrated-demo-toolkit', 'mfa');
    const mfa = process.platform === 'win32'
      ? join(mfaRoot, 'Scripts', 'mfa.exe')
      : join(mfaRoot, 'bin', 'mfa');
    if (existsSync(mfa)) {
      const cleanEnv = { ...process.env };
      delete cleanEnv.PYTHONPATH;
      const result = spawnSync(mfa, ['version'], { stdio: 'ignore', env: cleanEnv });
      return result.status === 0 ? mfa : null;
    }
  }
  const command = process.platform === 'win32'
    ? (tool.windowsCommand ?? tool.command ?? tool.name)
    : (tool.command ?? tool.name);
  for (const candidate of toolPathCandidates(tool)) {
    const verified = verifyToolPath(tool, candidate);
    if (verified) return verified;
  }
  return verifyToolPath(tool, locateOnPath(command));
}

export function assessToolchain(resolveTool = null) {
  const tools = TOOLCHAIN.map((tool) => {
    const path = resolveTool ? resolveTool(tool.command ?? tool.name) : resolveInstalledTool(tool);
    return { ...tool, path, ready: Boolean(path) };
  });
  const summary = Object.fromEntries(['required', 'recommended', 'optional'].map((tier) => {
    const selected = tools.filter((tool) => tool.tier === tier);
    return [tier, {
      ready: selected.filter((tool) => tool.ready).length,
      missing: selected.filter((tool) => !tool.ready).length,
      total: selected.length,
    }];
  }));
  return { tools, summary };
}

export function formatReport(report) {
  const lines = ['Narrated Demo Toolkit dependency report', ''];
  for (const tier of ['required', 'recommended', 'optional']) {
    lines.push(`${tier.toUpperCase()} (${report.summary[tier].ready}/${report.summary[tier].total})`);
    for (const tool of report.tools.filter((item) => item.tier === tier)) {
      lines.push(`${tool.ready ? '✓' : '✗'} ${tool.name.padEnd(12)} ${tool.purpose}${tool.path ? ` — ${tool.path}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = assessToolchain();
  console.log(formatReport(report));
  process.exitCode = report.summary.required.missing === 0 ? 0 : 1;
}
