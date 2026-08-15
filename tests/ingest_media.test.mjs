import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  parseIngestArgs, buildIngestPlan, executePlan, windowsPrivacyArgs,
} from '../scripts/ingest_media.mjs';

test('voice-reference ingestion requires explicit speaker consent', () => {
  const options = parseIngestArgs(['message.m4a', '--output', '/tmp/job', '--voice-reference']);
  assert.throws(() => buildIngestPlan(options), /speaker consent/i);
});

test('local voice message plan normalises to a mono 24 kHz wav', () => {
  const options = parseIngestArgs([
    'message.m4a', '--output', '/tmp/job', '--voice-reference', '--speaker-consent'
  ]);
  const plan = buildIngestPlan(options);
  assert.equal(plan.kind, 'local');
  assert.equal(plan.commands[0].command, 'ffmpeg');
  assert.ok(plan.commands[0].args.includes('24000'));
  assert.ok(plan.commands[0].args.at(-1).endsWith('reference.wav'));
});

test('YouTube ingestion requires a separate source-authorization affirmation', () => {
  const options = parseIngestArgs([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '--output', '/tmp/job', '--speaker-consent'
  ]);
  assert.throws(() => buildIngestPlan(options), /source authorization/i);
});

test('YouTube plan captures metadata, subtitles and source audio', () => {
  const options = parseIngestArgs([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '--output', '/tmp/job',
    '--speaker-consent', '--source-authorized'
  ]);
  const plan = buildIngestPlan(options);
  assert.equal(plan.kind, 'youtube');
  assert.equal(plan.commands[0].command, 'yt-dlp');
  assert.ok(plan.commands[0].args.includes('--write-info-json'));
  assert.ok(plan.commands[0].args.includes('--write-subs'));
});

test('rejects output paths inside the repository', () => {
  const options = parseIngestArgs([
    'message.m4a', '--output', join(process.cwd(), 'private-job'),
    '--voice-reference', '--speaker-consent'
  ]);
  assert.throws(() => buildIngestPlan(options), /outside the repository/i);
});

test('execution tightens permissions and redacts private command arguments', () => {
  const root = mkdtempSync(join(tmpdir(), 'narrated-ingest-'));
  const output = join(root, 'existing');
  mkdirSync(output, { mode: 0o755 });
  const privateFile = join(output, 'reference.wav');
  const plan = {
    kind: 'local',
    output,
    commands: [{
      command: process.execPath,
      args: ['-e', "require('node:fs').writeFileSync(process.argv[1], '')", privateFile],
    }],
  };

  executePlan(plan, '/private/input/person-message.m4a');

  if (process.platform !== 'win32') {
    assert.equal(statSync(output).mode & 0o777, 0o700);
    assert.equal(statSync(privateFile).mode & 0o777, 0o600);
  }
  const manifest = readFileSync(join(output, 'ingest-manifest.json'), 'utf8');
  assert.equal(manifest.includes('/private/input'), false);
  assert.equal(manifest.includes(root), false);
});

test('Windows privacy ACL grants only the current user inherited file control', () => {
  assert.deepEqual(
    windowsPrivacyArgs('C:\\private\\job', 'Alice'),
    ['C:\\private\\job', '/inheritance:r', '/grant:r', 'Alice:(OI)(CI)F'],
  );
  assert.throws(() => windowsPrivacyArgs('C:\\private\\job', ''), /USERNAME/);
});

test('execution rejects symbolic links in private output trees', {
  skip: process.platform === 'win32' ? 'Windows symlink creation needs elevated developer permissions' : false,
}, () => {
  const root = mkdtempSync(join(tmpdir(), 'narrated-symlink-'));
  const output = join(root, 'output');
  mkdirSync(output, { mode: 0o700 });
  symlinkSync('/tmp', join(output, 'escape'));
  assert.throws(
    () => executePlan({ kind: 'local', output, commands: [] }, 'message.m4a'),
    /symbolic link/i,
  );
});
