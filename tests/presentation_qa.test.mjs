import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Real FFmpeg fixtures and stdlib Python; no speech provider or network calls.
const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const runner = fileURLToPath(new URL('./presentation_qa_cases.py', import.meta.url));
test('supplementary presentation QA rejects bad timing, audio and stale reviews', () => {
  const result = spawnSync(python, [runner], {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
  assert.equal(result.status, 0, result.error?.message ?? result.stdout + result.stderr);
});
