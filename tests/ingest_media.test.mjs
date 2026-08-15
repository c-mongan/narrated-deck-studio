import test from 'node:test';
import assert from 'node:assert/strict';

import { parseIngestArgs, buildIngestPlan } from '../scripts/ingest_media.mjs';

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

test('YouTube plan captures metadata, subtitles and source audio', () => {
  const options = parseIngestArgs([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '--output', '/tmp/job', '--speaker-consent'
  ]);
  const plan = buildIngestPlan(options);
  assert.equal(plan.kind, 'youtube');
  assert.equal(plan.commands[0].command, 'yt-dlp');
  assert.ok(plan.commands[0].args.includes('--write-info-json'));
  assert.ok(plan.commands[0].args.includes('--write-subs'));
});
