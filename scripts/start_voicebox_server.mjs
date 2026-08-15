#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function assertLoopback(host) {
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`Refusing non-loopback Voicebox host '${host}'. Voicebox must remain local.`);
  }
}

export function voiceboxCandidates(platform = process.platform, env = process.env) {
  if (env.VOICEBOX_SERVER) return [env.VOICEBOX_SERVER];
  if (platform === 'darwin') {
    return ['/Applications/Voicebox.app/Contents/MacOS/voicebox-server'];
  }
  if (platform === 'win32') {
    return [
      join(env.LOCALAPPDATA ?? '', 'Programs', 'Voicebox', 'voicebox-server.exe'),
      join(env.LOCALAPPDATA ?? '', 'Voicebox', 'voicebox-server.exe'),
      join(env.ProgramFiles ?? '', 'Voicebox', 'voicebox-server.exe'),
    ].filter((path) => path && !path.startsWith('Voicebox'));
  }
  return [];
}

export function defaultDataDir(platform = process.platform, env = process.env) {
  const home = env.HOME ?? env.USERPROFILE ?? homedir();
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'sh.voicebox.app');
  if (platform === 'win32') return join(env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'sh.voicebox.app');
  return join(home, '.local', 'share', 'voicebox');
}

export function main() {
  const host = process.env.VOICEBOX_HOST ?? '127.0.0.1';
  const port = process.env.VOICEBOX_PORT ?? '17493';
  assertLoopback(host);
  const server = voiceboxCandidates().find(existsSync);
  if (!server) {
    throw new Error('Voicebox server not found. Install Voicebox or set VOICEBOX_SERVER to its executable.');
  }
  const dataDir = process.env.VOICEBOX_DATA_DIR ?? defaultDataDir();
  const result = spawnSync(server, ['--host', host, '--port', port, '--data-dir', dataDir], {
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
