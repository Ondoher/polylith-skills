import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry = () => JSON.parse(fs.readFileSync(new URL('../references/design-language-normalization.json', import.meta.url), 'utf8'));

test('normalization presets have stable unique identities and bounded values', () => {
  const value = registry();
  assert.equal(value.schemaVersion, 1);
  assert.equal(value.baseUnitPx, 4);
  assert.equal(new Set(value.presets.map(preset => preset.id)).size, value.presets.length);
  for (const preset of value.presets) {
    assert.match(preset.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(preset.matches.length > 0);
  }
  const palette = value.presets.find(preset => preset.id === 'periwinkle-identity-v1');
  assert.deepEqual(palette.identityMemberIds, ['primary-action', 'periwinkle-soft']);
  assert.deepEqual(palette.members.map(member => member.value), ['#6467C7', '#CCCCFF']);
  assert.match(palette.members[0].purposeTemplate, /\{appName\}/);
  assert.match(palette.identityRationaleTemplate, /\{appName\}/);
  assert.equal(value.presets.find(preset => preset.id === 'rounded-button-v1').radiusPx, 12);
  assert.equal(value.presets.find(preset => preset.id === 'slightly-roomier-button-v1').heightDeltaPx, 4);
  const surface = value.presets.find(preset => preset.id === 'periwinkle-off-white-surface-v1');
  assert.equal(surface.value, '#F7F7FC');
  assert.equal(surface.role, 'surface');
  assert.ok(surface.researchReferences.length >= 2);
  assert.ok(surface.researchReferences.every(reference => reference.url.startsWith('https://')));
});
