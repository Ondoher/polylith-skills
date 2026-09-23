import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {commitProductArtifact} from './product-artifact-store.mjs';
import {
  loadCurrentProduct,
  persistProductModel,
  validateCurrentPointer,
  validateProductSnapshot,
} from './product-model.mjs';
import {sha256, stableJson} from './product-artifact-utils.mjs';

const fixtureRoot = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);

function temporary(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

function initialize(t, suffix) {
  const root = temporary(t, `product-artifact-finalization-${suffix}-`);
  const proposalPath = path.join(root, 'product-model-proposal.json');
  const sourcePath = path.join(root, 'product-description.md');
  fs.copyFileSync(new URL('product-model-proposal.json', fixtureRoot), proposalPath);
  fs.copyFileSync(new URL('product-description.md', fixtureRoot), sourcePath);
  const outputRoot = path.join(root, 'product');
  persistProductModel({
    proposalPath,
    sourcePath,
    sourceLabel: 'briefs/field-journal/product-description.md',
    outputRoot,
  });
  const currentPath = path.join(outputRoot, 'current.json');
  return {root, outputRoot, currentPath, chain: loadCurrentProduct(currentPath)};
}

function writeJson(root, name, value) {
  const file = path.join(root, `${name}.json`);
  fs.writeFileSync(file, stableJson(value));
  return file;
}

function recordDependency(chain, id) {
  const record = chain.model.recordIndex.find(item => item.id === id);
  assert.ok(record, `Expected product record ${id}`);
  return {id: record.id, materialSha256: record.materialSha256};
}

function artifactDependency(entry) {
  return {
    id: entry.id,
    revision: entry.revision,
    materialSha256: entry.content.materialSha256,
  };
}

function proposal({
  id,
  status = 'accepted',
  scopeRef = 'create-observations',
  gapRefs = [],
  recordDependencies,
  artifactDependencies = [],
  payload = {summary: 'A bounded product experience.'},
}) {
  return {
    schemaVersion: '1.0',
    kind: 'product-artifact-proposal',
    id,
    artifactKind: 'product-experience-plan',
    owner: 'ux',
    artifactSchemaVersion: '1.0',
    status,
    consumerDomains: ['prd', 'ux', 'implementation-planning'],
    scopeRefs: [scopeRef],
    coverageRefs: [scopeRef],
    gapRefs,
    lockRefs: [],
    recordDependencies,
    artifactDependencies,
    producer: {id: 'ux-planner', contractVersion: '1.0', method: 'structured-assessment'},
    resources: [],
    payload,
  };
}

function commit(initialized, chain, name, value, extra = {}) {
  return commitProductArtifact({
    currentPath: initialized.currentPath,
    baseSnapshotSha256: chain.current.snapshot.sha256,
    proposalPath: writeJson(initialized.root, name, value),
    ...extra,
  });
}

test('product-artifact finalization rejects invalid state and preserves atomic recovery', async t => {
  await t.test('rejects a stale base after an intervening artifact commit', t => {
    const initialized = initialize(t, 'stale-base');
    const first = proposal({
      id: 'observation-experience',
      recordDependencies: [recordDependency(initialized.chain, 'create-observations')],
    });
    commit(initialized, initialized.chain, 'first', first);
    const currentAfterFirst = fs.readFileSync(initialized.currentPath);
    const second = proposal({
      id: 'expedition-experience',
      scopeRef: 'organize-expeditions',
      recordDependencies: [recordDependency(initialized.chain, 'organize-expeditions')],
    });

    assert.throws(
      () => commit(initialized, initialized.chain, 'stale-second', second),
      /base snapshot is no longer current/u,
    );
    assert.deepEqual(fs.readFileSync(initialized.currentPath), currentAfterFirst);
  });

  await t.test('requires current-owner authority to create, change, or unlock a locked artifact', t => {
    const initialized = initialize(t, 'locked-authority');
    const locked = proposal({
      id: 'locked-experience',
      status: 'locked',
      recordDependencies: [recordDependency(initialized.chain, 'create-observations')],
    });
    const currentBefore = fs.readFileSync(initialized.currentPath);

    assert.throws(
      () => commit(initialized, initialized.chain, 'unauthorized-lock', locked),
      /explicit current-owner authority/u,
    );
    assert.deepEqual(fs.readFileSync(initialized.currentPath), currentBefore);

    commit(initialized, initialized.chain, 'authorized-lock', locked, {
      authority: {artifactId: locked.id, owner: 'ux', action: 'lock-artifact'},
    });
    const afterLock = loadCurrentProduct(initialized.currentPath);
    const lockedCurrent = fs.readFileSync(initialized.currentPath);
    const changed = structuredClone(locked);
    changed.payload.summary = 'An incidental change to protected material.';
    assert.throws(
      () => commit(initialized, afterLock, 'unauthorized-change', changed),
      /explicit current-owner authority/u,
    );
    const unlocked = structuredClone(locked);
    unlocked.status = 'accepted';
    assert.throws(
      () => commit(initialized, afterLock, 'unauthorized-unlock', unlocked),
      /explicit current-owner authority/u,
    );
    assert.deepEqual(fs.readFileSync(initialized.currentPath), lockedCurrent);

    commit(initialized, afterLock, 'authorized-change', changed, {
      authority: {artifactId: locked.id, owner: 'ux', action: 'modify-locked-artifact'},
    });
    const afterChange = loadCurrentProduct(initialized.currentPath);
    const changedEntry = afterChange.snapshot.artifacts.find(item => item.id === locked.id);
    assert.equal(changedEntry.status, 'locked');
    assert.equal(changedEntry.revision, 2);

    const authorizedUnlock = structuredClone(changed);
    authorizedUnlock.status = 'accepted';
    commit(initialized, afterChange, 'authorized-unlock', authorizedUnlock, {
      authority: {artifactId: locked.id, owner: 'ux', action: 'modify-locked-artifact'},
    });
    const afterUnlock = loadCurrentProduct(initialized.currentPath);
    const unlockedEntry = afterUnlock.snapshot.artifacts.find(item => item.id === locked.id);
    assert.equal(unlockedEntry.status, 'accepted');
    assert.equal(unlockedEntry.revision, 3);
  });

  await t.test('rejects missing record and artifact dependencies and a dependency cycle', t => {
    const initialized = initialize(t, 'dependency-closure');
    const missingRecord = proposal({
      id: 'missing-record-experience',
      scopeRef: 'missing-record',
      recordDependencies: [{id: 'missing-record', materialSha256: 'a'.repeat(64)}],
    });
    assert.throws(
      () => commit(initialized, initialized.chain, 'missing-record', missingRecord),
      /missing product record/u,
    );

    const missingArtifact = proposal({
      id: 'missing-artifact-experience',
      recordDependencies: [recordDependency(initialized.chain, 'create-observations')],
      artifactDependencies: [{id: 'missing-artifact', revision: 1, materialSha256: 'b'.repeat(64)}],
    });
    assert.throws(
      () => commit(initialized, initialized.chain, 'missing-artifact', missingArtifact),
      /missing artifact/u,
    );

    const artifactA = proposal({
      id: 'experience-a',
      recordDependencies: [recordDependency(initialized.chain, 'create-observations')],
    });
    commit(initialized, initialized.chain, 'artifact-a', artifactA);
    const afterA = loadCurrentProduct(initialized.currentPath);
    const entryA = afterA.snapshot.artifacts.find(item => item.id === artifactA.id);
    const artifactB = proposal({
      id: 'experience-b',
      scopeRef: 'organize-expeditions',
      recordDependencies: [recordDependency(afterA, 'organize-expeditions')],
      artifactDependencies: [artifactDependency(entryA)],
    });
    commit(initialized, afterA, 'artifact-b', artifactB);
    const afterB = loadCurrentProduct(initialized.currentPath);
    const entryB = afterB.snapshot.artifacts.find(item => item.id === artifactB.id);
    const cyclicA = structuredClone(artifactA);
    cyclicA.artifactDependencies = [artifactDependency(entryB)];
    cyclicA.payload.summary = 'A change that would close a dependency cycle.';
    const currentBeforeCycle = fs.readFileSync(initialized.currentPath);

    assert.throws(
      () => commit(initialized, afterB, 'cyclic-a', cyclicA),
      /dependency cycle/u,
    );
    assert.deepEqual(fs.readFileSync(initialized.currentPath), currentBeforeCycle);
  });

  await t.test('detects tampered artifact bytes and a tampered snapshot binding', t => {
    const initialized = initialize(t, 'tampering');
    const artifact = proposal({
      id: 'tamper-target',
      recordDependencies: [recordDependency(initialized.chain, 'create-observations')],
    });
    commit(initialized, initialized.chain, 'tamper-target', artifact);
    const chain = loadCurrentProduct(initialized.currentPath);
    const entry = chain.snapshot.artifacts.find(item => item.id === artifact.id);
    const artifactFile = path.join(chain.root, ...entry.content.path.split('/'));
    const originalArtifactBytes = fs.readFileSync(artifactFile);
    fs.writeFileSync(artifactFile, Buffer.concat([originalArtifactBytes, Buffer.from(' ')]));
    assert.throws(() => loadCurrentProduct(initialized.currentPath), /hash mismatch/u);
    fs.writeFileSync(artifactFile, originalArtifactBytes);

    const tamperedSnapshot = structuredClone(chain.snapshot);
    tamperedSnapshot.artifacts.find(item => item.id === artifact.id).content.materialSha256 = '0'.repeat(64);
    const normalizedSnapshot = validateProductSnapshot(tamperedSnapshot);
    const snapshotBytes = Buffer.from(stableJson(normalizedSnapshot));
    const snapshotSha256 = sha256(snapshotBytes);
    const snapshotPath = `snapshots/${snapshotSha256}/product-snapshot.json`;
    const snapshotFile = path.join(chain.root, ...snapshotPath.split('/'));
    fs.mkdirSync(path.dirname(snapshotFile), {recursive: true});
    fs.writeFileSync(snapshotFile, snapshotBytes);
    const current = validateCurrentPointer({
      schemaVersion: '1.0',
      kind: 'product-current',
      snapshot: {
        id: normalizedSnapshot.id,
        revision: normalizedSnapshot.revision,
        path: snapshotPath,
        sha256: snapshotSha256,
      },
    });
    fs.writeFileSync(initialized.currentPath, stableJson(current));
    assert.throws(() => loadCurrentProduct(initialized.currentPath), /material digest does not match its snapshot entry/u);
  });

});
