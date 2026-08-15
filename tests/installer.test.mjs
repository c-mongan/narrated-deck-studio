import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const installer = readFileSync(new URL('../scripts/install_toolchain_macos.sh', import.meta.url), 'utf8');
const windowsInstaller = readFileSync(new URL('../scripts/install_toolchain_windows.ps1', import.meta.url), 'utf8');
const lock = readFileSync(new URL('../requirements-media.lock', import.meta.url), 'utf8');

test('installer uses locked and pinned media dependencies', () => {
  assert.match(installer, /uv pip sync .*requirements-media\.lock/);
  assert.match(lock, /whisperx==3\.8\.6/);
  assert.match(lock, /--hash=sha256:/);
  assert.match(installer, /songsee\/cmd\/songsee@v0\.1\.1/);
  assert.match(installer, /montreal-forced-aligner=3\.4\.1/);
  assert.doesNotMatch(installer, /@latest/);
});

test('Windows installer uses winget plus the same pinned dependency graph', () => {
  assert.match(windowsInstaller, /winget install/);
  assert.match(windowsInstaller, /requirements-media\.lock/);
  assert.match(windowsInstaller, /songsee\/cmd\/songsee@v0\.1\.1/);
  assert.match(windowsInstaller, /montreal-forced-aligner=3\.4\.1/);
  assert.match(windowsInstaller, /'MediaArea\.MediaInfo'/);
  assert.doesNotMatch(windowsInstaller, /MediaArea\.MediaInfo\.GUI/);
  assert.match(windowsInstaller, /recommendedPackages\) \{ Install-WingetPackage -Id \$package -Optional \}/);
  assert.doesNotMatch(windowsInstaller, /Invoke-Expression|@latest/i);
});

test('MFA installation is repeatable for existing environments', () => {
  assert.match(installer, /if \[\[ -x "\$MFA_PREFIX\/bin\/mfa" \]\]/);
  assert.match(installer, /micromamba install -y -p/);
  assert.match(installer, /micromamba create -y -p/);
});
