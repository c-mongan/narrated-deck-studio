import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertLoopback, defaultDataDir, voiceboxCandidates,
} from '../scripts/start_voicebox_server.mjs';

test('Voicebox launcher rejects non-loopback network binding', () => {
  assert.throws(() => assertLoopback('0.0.0.0'), /non-loopback/i);
  assert.throws(() => assertLoopback('192.168.1.20'), /non-loopback/i);
});

test('Voicebox launcher permits explicit loopback hosts', () => {
  for (const host of ['127.0.0.1', 'localhost', '::1']) {
    assert.doesNotThrow(() => assertLoopback(host));
  }
});

test('Windows Voicebox paths use Windows application-data locations', () => {
  const env = {
    LOCALAPPDATA: 'C:\\Users\\Alice\\AppData\\Local',
    APPDATA: 'C:\\Users\\Alice\\AppData\\Roaming',
    USERPROFILE: 'C:\\Users\\Alice',
  };
  assert.ok(voiceboxCandidates('win32', env).some((path) => /voicebox-server\.exe$/i.test(path)));
  assert.match(defaultDataDir('win32', env), /sh\.voicebox\.app$/);
});

test('VOICEBOX_SERVER explicitly overrides platform discovery', () => {
  assert.deepEqual(
    voiceboxCandidates('win32', { VOICEBOX_SERVER: 'D:\\Voicebox\\server.exe' }),
    ['D:\\Voicebox\\server.exe'],
  );
});
