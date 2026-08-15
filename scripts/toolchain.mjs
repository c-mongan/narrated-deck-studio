#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const TOOLCHAIN = Object.freeze([
  { name: 'yt-dlp', tier: 'required', purpose: 'authorised YouTube ingestion' },
  { name: 'ffmpeg', tier: 'required', purpose: 'media conversion and assembly' },
  { name: 'ffprobe', tier: 'required', purpose: 'stream and timing verification' },
  { name: 'node', tier: 'required', purpose: 'toolkit and deck scripts' },
  { name: 'python3', tier: 'required', purpose: 'alignment and ML tools' },
  { name: 'jq', tier: 'required', purpose: 'manifest and API processing' },
  { name: 'voicebox', tier: 'required', purpose: 'authorised local voice cloning service' },
  { name: 'soffice', tier: 'required', purpose: 'PowerPoint rendering' },
  { name: 'pdftoppm', tier: 'required', purpose: 'slide-image rendering' },
  { name: 'whisperx', tier: 'recommended', purpose: 'word-level forced alignment' },
  { name: 'demucs', tier: 'recommended', purpose: 'speech and music separation' },
  { name: 'pyannote', tier: 'recommended', purpose: 'speaker diarisation', command: 'pyannote-check' },
  { name: 'scenedetect', tier: 'recommended', purpose: 'slide and scene boundaries' },
  { name: 'sox', tier: 'recommended', purpose: 'audio measurement' },
  { name: 'mediainfo', tier: 'recommended', purpose: 'independent media inspection' },
  { name: 'exiftool', tier: 'recommended', purpose: 'source metadata and provenance' },
  { name: 'tesseract', tier: 'recommended', purpose: 'frame and slide OCR' },
  { name: 'songsee', tier: 'recommended', purpose: 'audio feature visualisation' },
  { name: 'mfa', tier: 'optional', purpose: 'phoneme-level forced alignment' },
  { name: 'magick', tier: 'optional', purpose: 'contact sheets and image transforms' },
  { name: 'mkvmerge', tier: 'optional', purpose: 'container inspection and repair' },
]);

export function probeExecutable(path, args = ['--version']) {
  const result = spawnSync(path, args, { stdio: 'ignore' });
  return result.status === 0;
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
    const python = join(PROJECT_ROOT, '.venv', 'bin', 'python');
    if (!existsSync(python)) return null;
    const cleanEnv = { ...process.env };
    delete cleanEnv.PYTHONPATH;
    const result = spawnSync(python, ['-c', 'import pyannote.audio'], { stdio: 'ignore', env: cleanEnv });
    return result.status === 0 ? `${python} (pyannote.audio)` : null;
  }
  if (tool.name === 'mfa') {
    const mfa = join(process.env.HOME ?? '', '.local', 'share', 'narrated-demo-toolkit', 'mfa', 'bin', 'mfa');
    if (existsSync(mfa)) {
      const cleanEnv = { ...process.env };
      delete cleanEnv.PYTHONPATH;
      const result = spawnSync(mfa, ['version'], { stdio: 'ignore', env: cleanEnv });
      return result.status === 0 ? mfa : null;
    }
  }
  const command = tool.command ?? tool.name;
  const local = join(PROJECT_ROOT, '.venv', 'bin', command);
  if (existsSync(local)) return local;
  const userLocal = join(process.env.HOME ?? '', '.local', 'bin', command);
  if (existsSync(userLocal)) return userLocal;
  const result = spawnSync('sh', ['-lc', `command -v "${command}"`], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  const path = result.stdout.trim();
  if (['ffmpeg', 'ffprobe'].includes(tool.name) && !probeExecutable(path, ['-version'])) return null;
  return path;
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
