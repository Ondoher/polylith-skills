import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {guardDesignLocks} from './design-lock.mjs';

function write(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

test('requires an explicit user reason to create a lock', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'design-lock-create-'));
  const file = path.join(directory, 'design.json');
  const design = {id: 'surface', status: 'locked', title: 'Stable surface'};
  assert.throws(() => guardDesignLocks(file, design), /explicit current user lock request/);
  assert.doesNotThrow(() => guardDesignLocks(file, design, {lockReason: 'User requested this surface be locked.'}));
});

test('preserves a locked document until the user explicitly requests its change', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'design-lock-document-'));
  const file = path.join(directory, 'design.json');
  const locked = {id: 'surface-comp', status: 'locked', revision: '1', sourceRevision: 'ux-4'};
  write(file, locked);
  assert.doesNotThrow(() => guardDesignLocks(file, structuredClone(locked)));
  const changed = {...locked, sourceRevision: 'ux-5'};
  assert.throws(() => guardDesignLocks(file, changed), /Locked design \$ cannot change/);
  assert.doesNotThrow(() => guardDesignLocks(file, changed, {lockedChangeReason: 'User requested the locked comp use UX revision 5.'}));
  assert.throws(() => guardDesignLocks(file, {...locked, status: 'accepted'}), /Locked design \$ cannot change/);
});

test('protects a locked record inside an otherwise editable accepted design', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'design-lock-record-'));
  const file = path.join(directory, 'design.json');
  const saved = {
    id: 'product',
    status: 'accepted',
    surfaces: [
      {id: 'locked-editor', status: 'locked', title: 'Editor'},
      {id: 'editable-library', status: 'accepted', title: 'Library'}
    ]
  };
  write(file, saved);
  const ordinaryChange = structuredClone(saved);
  ordinaryChange.surfaces[1].title = 'Media library';
  assert.doesNotThrow(() => guardDesignLocks(file, ordinaryChange));
  const lockedChange = structuredClone(saved);
  lockedChange.surfaces[0].title = 'Revised editor';
  assert.throws(() => guardDesignLocks(file, lockedChange), /locked-editor/);
});

