import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {commitProductArtifact} from './product-artifact-store.mjs';
import {stableJson, withProductStoreLock} from './product-artifact-utils.mjs';
import {loadCurrentProduct, persistProductModel} from './product-model.mjs';

const fixtureRoot = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);
const lockName = '.product-store.lock';

function temporary(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

function inputs(root) {
  const proposalPath = path.join(root, 'product-model-proposal.json');
  const sourcePath = path.join(root, 'product-description.md');
  fs.copyFileSync(new URL('product-model-proposal.json', fixtureRoot), proposalPath);
  fs.copyFileSync(new URL('product-description.md', fixtureRoot), sourcePath);
  return {proposalPath, sourcePath};
}

function deadPid() {
  for (const pid of [2_147_483_647, 1_073_741_823, 999_999_937]) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error?.code === 'ESRCH') return pid;
    }
  }
  throw new Error('Could not identify a definitively absent process for the stale-lock test');
}

test('a live store lock excludes nested work and is released after successful work', t => {
  const root = temporary(t, 'product-store-live-lock-');
  const lockPath = path.join(root, lockName);
  withProductStoreLock(root, () => {
    assert.equal(fs.existsSync(lockPath), true);
    assert.throws(
      () => withProductStoreLock(root, () => assert.fail('nested transaction must not run')),
      /locked by live or unknown process/u,
    );
  });
  assert.equal(fs.existsSync(lockPath), false);
  assert.equal(withProductStoreLock(root, () => 'next transaction'), 'next transaction');
});

test('a definitively dead owner is quarantined before a new store lock is acquired', t => {
  const root = temporary(t, 'product-store-stale-lock-');
  const lockPath = path.join(root, lockName);
  fs.writeFileSync(lockPath, stableJson({
    schemaVersion: '1.0',
    kind: 'product-store-lock',
    pid: deadPid(),
    token: '0123456789abcdef0123456789abcdef',
  }));

  let observedOwner;
  withProductStoreLock(root, () => {
    observedOwner = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  });
  assert.equal(observedOwner.pid, process.pid);
  assert.notEqual(observedOwner.token, '0123456789abcdef0123456789abcdef');
  assert.equal(fs.existsSync(lockPath), false);
  assert.deepEqual(fs.readdirSync(root), []);
});

test('thrown transaction work releases only its own lock and permits a retry', t => {
  const root = temporary(t, 'product-store-thrown-lock-');
  const lockPath = path.join(root, lockName);
  assert.throws(
    () => withProductStoreLock(root, () => { throw new Error('simulated transaction failure'); }),
    /simulated transaction failure/u,
  );
  assert.equal(fs.existsSync(lockPath), false);
  assert.equal(withProductStoreLock(root, () => 42), 42);
});

test('a transaction never removes a lock whose ownership token changed', t => {
  const root = temporary(t, 'product-store-changed-lock-');
  const lockPath = path.join(root, lockName);
  assert.throws(
    () => withProductStoreLock(root, () => {
      const replacement = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      replacement.token = 'fedcba9876543210fedcba9876543210';
      fs.writeFileSync(lockPath, stableJson(replacement));
    }),
    /lock ownership changed before release/u,
  );
  const retained = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert.equal(retained.token, 'fedcba9876543210fedcba9876543210');
});

test('model and artifact commits fail closed when their shared store lock is held', t => {
  const root = temporary(t, 'product-store-commit-lock-');
  const outputRoot = path.join(root, 'product');
  const modelInputs = inputs(root);
  const modelOptions = {
    ...modelInputs,
    sourceLabel: 'briefs/field-journal/product-description.md',
    outputRoot,
  };

  withProductStoreLock(outputRoot, () => {
    assert.throws(() => persistProductModel(modelOptions), /locked by live or unknown process/u);
    assert.equal(fs.existsSync(path.join(outputRoot, 'current.json')), false);
  });
  persistProductModel(modelOptions);
  const currentPath = path.join(outputRoot, 'current.json');
  const chain = loadCurrentProduct(currentPath);
  const dependency = chain.model.recordIndex.find(record => record.id === 'create-observations');
  assert.ok(dependency);
  const proposalPath = path.join(root, 'artifact-proposal.json');
  fs.writeFileSync(proposalPath, stableJson({
    schemaVersion: '1.0',
    kind: 'product-artifact-proposal',
    id: 'experience-plan',
    artifactKind: 'product-experience-plan',
    owner: 'ux',
    artifactSchemaVersion: '1.0',
    status: 'accepted',
    consumerDomains: ['prd', 'ux'],
    scopeRefs: [dependency.id],
    coverageRefs: [dependency.id],
    gapRefs: [],
    lockRefs: [],
    recordDependencies: [{id: dependency.id, materialSha256: dependency.materialSha256}],
    artifactDependencies: [],
    producer: {id: 'ux-planner', contractVersion: '1.0', method: 'structured-assessment'},
    resources: [],
    payload: {summary: 'A reusable experience plan.'},
  }));
  const before = fs.readFileSync(currentPath);
  withProductStoreLock(outputRoot, () => {
    assert.throws(() => commitProductArtifact({
      currentPath,
      baseSnapshotSha256: chain.current.snapshot.sha256,
      proposalPath,
    }), /locked by live or unknown process/u);
    assert.deepEqual(fs.readFileSync(currentPath), before);
  });
});
