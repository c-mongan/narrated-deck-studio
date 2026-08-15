import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseIngestArgs, buildIngestPlan, executePlan, parseWhoamiSid, redactPlan,
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

test('Windows SID parser rejects names and accepts a current-user SID', () => {
  assert.equal(parseWhoamiSid('"DESKTOP\\Alice","S-1-5-21-10-20-30-1001"\r\n'), 'S-1-5-21-10-20-30-1001');
  assert.throws(() => parseWhoamiSid('Alice'), /SID/i);
});

test('manifest and dry-run representations redact URLs and absolute paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'narrated-redaction-'));
  const output = join(root, 'private-output');
  const secret = 'PRIVATE_VIDEO_TOKEN_48392';
  const source = `https://www.youtube.com/watch?v=${secret}&auth=hidden`;
  const plan = buildIngestPlan(parseIngestArgs([
    source, '--output', output, '--source-authorized', '--dry-run',
  ]));
  const redacted = JSON.stringify(redactPlan(plan));
  assert.equal(redacted.includes(secret), false);
  assert.equal(redacted.includes(output), false);
  assert.equal(redacted.includes('auth=hidden'), false);

  executePlan({ kind: 'youtube', output, commands: [] }, source);
  const manifest = readFileSync(join(output, 'ingest-manifest.json'), 'utf8');
  assert.equal(manifest.includes(secret), false);
  assert.equal(manifest.includes('auth=hidden'), false);
  assert.equal(manifest.includes(root), false);
  assert.match(manifest, /"source": "authorized-youtube-source"/);
});

test('CLI dry-run never prints private source or output arguments', () => {
  const root = mkdtempSync(join(tmpdir(), 'narrated-cli-redaction-'));
  const output = join(root, 'private-output');
  const secret = 'DRY_RUN_SECRET_72519';
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL('../scripts/ingest_media.mjs', import.meta.url)),
    `https://youtu.be/${secret}?token=hidden`, '--output', output,
    '--source-authorized', '--dry-run',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes(secret), false);
  assert.equal(result.stdout.includes(output), false);
  assert.equal(result.stdout.includes('token=hidden'), false);
  assert.match(result.stdout, /<redacted>/);
});

test('Windows hardening removes broad explicit ACLs from existing nested data', {
  skip: process.platform !== 'win32' ? 'requires native Windows ACLs' : false,
}, () => {
  const root = mkdtempSync(join(tmpdir(), 'narrated-acl-'));
  const nested = join(root, 'nested');
  mkdirSync(nested);
  writeFileSync(join(nested, 'private.txt'), 'private');
  const grant = spawnSync('icacls.exe', [root, '/grant', '*S-1-1-0:(OI)(CI)R', '/T'], { encoding: 'utf8' });
  assert.equal(grant.status, 0, grant.stderr);

  const hasEveryone = (expected) => {
    const script = [
      '$found=$false',
      '$items=@(Get-Item -LiteralPath $env:NDT_ACL_ROOT)+@(Get-ChildItem -LiteralPath $env:NDT_ACL_ROOT -Force -Recurse)',
      'foreach($item in $items){$rules=$item.GetAccessControl().GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]);foreach($rule in $rules){if($rule.IdentityReference.Value -eq "S-1-1-0"){$found=$true}}}',
      `if($found -eq $${expected ? 'true' : 'false'}){exit 0}else{exit 1}`,
    ].join(';');
    return spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { env: { ...process.env, NDT_ACL_ROOT: root } },
    ).status;
  };
  assert.equal(hasEveryone(true), 0, 'fixture must contain an explicit Everyone ACE');
  executePlan({ kind: 'local', output: root, commands: [] }, 'private-input.m4a');
  assert.equal(hasEveryone(false), 0, 'Everyone ACE must be removed recursively');
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
