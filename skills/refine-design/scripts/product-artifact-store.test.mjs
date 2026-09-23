import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {loadSnapshotArtifacts} from './product-artifact-contract.mjs';
import {commitProductArtifact} from './product-artifact-store.mjs';
import {loadCurrentProduct, persistProductModel} from './product-model.mjs';

const fixtureRoot = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);

function temporary(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

function initialize(t) {
  const root = temporary(t, 'product-artifact-store-');
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

function writeProposal(root, name, value) {
  const file = path.join(root, `${name}.json`);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

function dependency(chain, id) {
  const record = chain.model.recordIndex.find(item => item.id === id);
  assert.ok(record, `Expected record ${id}`);
  return {id: record.id, materialSha256: record.materialSha256};
}

function proposal({id, status, scopeRefs, coverageRefs, gapRefs = [], dependencies, payload}) {
  return {
    schemaVersion: '1.0',
    kind: 'product-artifact-proposal',
    id,
    artifactKind: 'product-experience-plan',
    owner: 'ux',
    artifactSchemaVersion: '1.0',
    status,
    consumerDomains: ['prd', 'ux', 'ui', 'implementation-planning'],
    scopeRefs,
    coverageRefs,
    gapRefs,
    lockRefs: [],
    recordDependencies: dependencies,
    artifactDependencies: [],
    producer: {id: 'ux-planner', contractVersion: '1.0', method: 'structured-assessment'},
    resources: [],
    payload,
  };
}

test('commits accepted and partial artifacts without changing the parsed product model', t => {
  const initialized = initialize(t);
  const originalModel = initialized.chain.snapshot.productModel;
  const accepted = proposal({
    id: 'prd-experience',
    status: 'accepted',
    scopeRefs: ['create-observations'],
    coverageRefs: ['create-observations'],
    dependencies: [dependency(initialized.chain, 'create-observations')],
    payload: {sections: [{id: 'observation-flow', title: 'Create an observation'}]},
  });
  const acceptedResult = commitProductArtifact({
    currentPath: initialized.currentPath,
    baseSnapshotSha256: initialized.chain.current.snapshot.sha256,
    proposalPath: writeProposal(initialized.root, 'accepted-artifact', accepted),
  });
  const afterAccepted = loadCurrentProduct(initialized.currentPath);

  assert.equal(acceptedResult.change, 'added');
  assert.equal(afterAccepted.snapshot.revision, initialized.chain.snapshot.revision + 1);
  assert.deepEqual(afterAccepted.snapshot.productModel, originalModel);
  assert.equal(afterAccepted.snapshot.artifacts[0].dependencyState.status, 'current');

  const partial = proposal({
    id: 'sharing-experience',
    status: 'partial',
    scopeRefs: ['organize-expeditions'],
    coverageRefs: ['organize-expeditions'],
    gapRefs: ['expedition-sharing-policy'],
    dependencies: [
      dependency(afterAccepted, 'organize-expeditions'),
      dependency(afterAccepted, 'expedition-sharing-policy'),
    ],
    payload: {summary: 'The local organization flow is defined; sharing remains unresolved.'},
  });
  const partialResult = commitProductArtifact({
    currentPath: initialized.currentPath,
    baseSnapshotSha256: afterAccepted.current.snapshot.sha256,
    proposalPath: writeProposal(initialized.root, 'partial-artifact', partial),
  });
  const afterPartial = loadCurrentProduct(initialized.currentPath);
  const loaded = loadSnapshotArtifacts(afterPartial.root, afterPartial.snapshot.artifacts);
  const partialArtifact = loaded.find(item => item.artifact.id === 'sharing-experience');

  assert.equal(partialResult.change, 'added');
  assert.equal(partialArtifact.artifact.status, 'partial');
  assert.deepEqual(partialArtifact.artifact.gapRefs, ['expedition-sharing-policy']);
  assert.equal(partialArtifact.entry.dependencyState.status, 'current');
  assert.deepEqual(afterPartial.snapshot.productModel, originalModel);

  const locked = proposal({
    id: 'glossary-experience',
    status: 'locked',
    scopeRefs: ['review-glossary'],
    coverageRefs: ['review-glossary'],
    dependencies: [dependency(afterPartial, 'review-glossary')],
    payload: {summary: 'The approved glossary experience is protected from incidental changes.'},
  });
  commitProductArtifact({
    currentPath: initialized.currentPath,
    baseSnapshotSha256: afterPartial.current.snapshot.sha256,
    proposalPath: writeProposal(initialized.root, 'locked-artifact', locked),
    authority: {artifactId: 'glossary-experience', owner: 'ux', action: 'lock-artifact'},
  });
  const afterLocked = loadCurrentProduct(initialized.currentPath);
  const lockedEntry = afterLocked.snapshot.artifacts.find(item => item.id === 'glossary-experience');
  assert.equal(lockedEntry.status, 'locked');
  assert.equal(lockedEntry.dependencyState.status, 'current');
});

test('an exact artifact replay is a no-op against the latest snapshot', t => {
  const initialized = initialize(t);
  const accepted = proposal({
    id: 'prd-experience',
    status: 'accepted',
    scopeRefs: ['create-observations'],
    coverageRefs: ['create-observations'],
    dependencies: [dependency(initialized.chain, 'create-observations')],
    payload: {sections: [{id: 'observation-flow', title: 'Create an observation'}]},
  });
  const proposalPath = writeProposal(initialized.root, 'accepted-artifact', accepted);
  commitProductArtifact({
    currentPath: initialized.currentPath,
    baseSnapshotSha256: initialized.chain.current.snapshot.sha256,
    proposalPath,
  });
  const beforeReplay = loadCurrentProduct(initialized.currentPath);
  const currentBytes = fs.readFileSync(initialized.currentPath);
  const replay = commitProductArtifact({
    currentPath: initialized.currentPath,
    baseSnapshotSha256: beforeReplay.current.snapshot.sha256,
    proposalPath,
  });

  assert.equal(replay.change, 'unchanged');
  assert.equal(replay.artifact.created, false);
  assert.equal(replay.snapshot.created, false);
  assert.equal(replay.current.changed, false);
  assert.deepEqual(fs.readFileSync(initialized.currentPath), currentBytes);
});

test('persists coherent modified and superseded history bindings', t => {
  const initialized = initialize(t);
  const initial = proposal({
    id: 'lifecycle-experience',
    status: 'accepted',
    scopeRefs: ['create-observations'],
    coverageRefs: ['create-observations'],
    dependencies: [dependency(initialized.chain, 'create-observations')],
    payload: {summary: 'Initial experience.'},
  });
  commitProductArtifact({
    currentPath: initialized.currentPath,
    baseSnapshotSha256: initialized.chain.current.snapshot.sha256,
    proposalPath: writeProposal(initialized.root, 'lifecycle-initial', initial),
  });
  let chain = loadCurrentProduct(initialized.currentPath);
  let loaded = loadSnapshotArtifacts(chain.root, chain.snapshot.artifacts)
    .find(item => item.artifact.id === initial.id).artifact;
  const initialMaterial = loaded.materialSha256;

  const modified = structuredClone(initial);
  modified.payload.summary = 'Revised experience.';
  commitProductArtifact({
    currentPath: initialized.currentPath,
    baseSnapshotSha256: chain.current.snapshot.sha256,
    proposalPath: writeProposal(initialized.root, 'lifecycle-modified', modified),
  });
  chain = loadCurrentProduct(initialized.currentPath);
  loaded = loadSnapshotArtifacts(chain.root, chain.snapshot.artifacts)
    .find(item => item.artifact.id === initial.id).artifact;
  assert.equal(loaded.revision, 2);
  assert.deepEqual(loaded.change, {
    kind: 'modified',
    previousRevision: 1,
    previousMaterialSha256: initialMaterial,
  });
  assert.notEqual(loaded.materialSha256, initialMaterial);
  const modifiedMaterial = loaded.materialSha256;

  const superseded = structuredClone(modified);
  superseded.status = 'superseded';
  commitProductArtifact({
    currentPath: initialized.currentPath,
    baseSnapshotSha256: chain.current.snapshot.sha256,
    proposalPath: writeProposal(initialized.root, 'lifecycle-superseded', superseded),
  });
  chain = loadCurrentProduct(initialized.currentPath);
  loaded = loadSnapshotArtifacts(chain.root, chain.snapshot.artifacts)
    .find(item => item.artifact.id === initial.id).artifact;
  assert.equal(loaded.revision, 3);
  assert.equal(loaded.status, 'superseded');
  assert.deepEqual(loaded.change, {
    kind: 'superseded',
    previousRevision: 2,
    previousMaterialSha256: modifiedMaterial,
  });
  assert.notEqual(loaded.materialSha256, modifiedMaterial);
});
