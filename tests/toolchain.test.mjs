import test from 'node:test';
import assert from 'node:assert/strict';

import { TOOLCHAIN, assessToolchain, probeExecutable } from '../scripts/toolchain.mjs';

test('toolchain declares required, recommended, and optional production tools', () => {
  const names = new Set(TOOLCHAIN.map((tool) => tool.name));
  for (const name of [
    'yt-dlp', 'ffmpeg', 'ffprobe', 'node', 'python3', 'jq', 'voicebox',
    'soffice', 'pdftoppm', 'whisperx', 'demucs', 'pyannote',
    'scenedetect', 'sox', 'mediainfo', 'exiftool', 'tesseract',
    'songsee', 'mfa', 'magick', 'mkvmerge'
  ]) {
    assert.equal(names.has(name), true, `${name} must be declared`);
  }

  assert.equal(TOOLCHAIN.find((tool) => tool.name === 'yt-dlp').tier, 'required');
  assert.equal(TOOLCHAIN.find((tool) => tool.name === 'voicebox').tier, 'required');
  assert.equal(TOOLCHAIN.find((tool) => tool.name === 'whisperx').tier, 'recommended');
  assert.equal(TOOLCHAIN.find((tool) => tool.name === 'mfa').tier, 'optional');
});

test('executable probe rejects a binary that exits unsuccessfully', () => {
  assert.equal(probeExecutable('/usr/bin/true', []), true);
  assert.equal(probeExecutable('/usr/bin/false', []), false);
});

test('assessment reports ready and missing tools by tier', () => {
  const available = new Map([
    ['yt-dlp', '/opt/homebrew/bin/yt-dlp'],
    ['ffmpeg', '/opt/homebrew/bin/ffmpeg'],
    ['ffprobe', '/opt/homebrew/bin/ffprobe'],
  ]);
  const report = assessToolchain((name) => available.get(name) ?? null);

  assert.equal(report.tools.find((tool) => tool.name === 'ffmpeg').ready, true);
  assert.equal(report.tools.find((tool) => tool.name === 'whisperx').ready, false);
  assert.ok(report.summary.required.ready >= 3);
  assert.ok(report.summary.recommended.missing >= 1);
});
