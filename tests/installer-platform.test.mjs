import assert from 'node:assert/strict';
import test from 'node:test';
import {installerPlatform} from '../scripts/installer-platform.mjs';

test('selects Windows junction and command-shell adapters', () => {
  const policy = installerPlatform('win32', {ComSpec: 'C:\\Windows\\System32\\cmd.exe'});
  assert.equal(policy.caseInsensitivePaths, true);
  assert.equal(policy.directoryLinkType, 'junction');
  assert.equal(policy.recordedLinkType, 'junction');
  assert.equal(policy.directoryLinkRemovalFallback, 'rmdir');
  assert.equal(policy.dependencyCommand.command, 'C:\\Windows\\System32\\cmd.exe');
  assert.deepEqual(policy.dependencyCommand.args, ['/d', '/s', '/c', 'npm ci --ignore-scripts']);
});

for (const platform of ['darwin', 'linux']) {
  test(`selects POSIX symlink and direct npm adapters for ${platform}`, () => {
    const policy = installerPlatform(platform, {});
    assert.equal(policy.caseInsensitivePaths, false);
    assert.equal(policy.directoryLinkType, 'dir');
    assert.equal(policy.recordedLinkType, 'symbolic-link');
    assert.equal(policy.directoryLinkRemovalFallback, 'none');
    assert.equal(policy.dependencyCommand.command, 'npm');
    assert.deepEqual(policy.dependencyCommand.args, ['ci', '--ignore-scripts']);
  });
}

