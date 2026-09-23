import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  loadSnapshotArtifacts,
  reclassifySnapshotArtifacts,
  validateProductArtifact,
} from './product-artifact-contract.mjs';
import {sha256, stableJson} from './product-artifact-utils.mjs';

const hashes = {
  a: 'a'.repeat(64),
  b: 'b'.repeat(64),
  c: 'c'.repeat(64),
  d: 'd'.repeat(64),
  e: 'e'.repeat(64),
  f: 'f'.repeat(64),
};

function temporary(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

function entry({id, status = 'accepted', recordId, recordHash, artifactDependency}) {
  const contentHash = id === 'artifact-a' ? hashes.d : id === 'artifact-b' ? hashes.e : hashes.f;
  return {
    id,
    artifactKind: 'planning-view',
    owner: 'ux',
    artifactSchemaVersion: '1.0',
    revision: 1,
    status,
    consumerDomains: ['prd', 'ux'],
    scopeRefs: [recordId],
    coverageRefs: [recordId],
    gapRefs: [],
    lockRefs: [],
    recordDependencies: [{id: recordId, materialSha256: recordHash}],
    artifactDependencies: artifactDependency ? [artifactDependency] : [],
    producer: {id: 'ux-planner', contractVersion: '1.0', method: 'structured-assessment'},
    resources: [],
    change: {kind: 'added', previousRevision: null, previousMaterialSha256: null},
    content: {
      path: `artifacts/ux/${id}/1-${contentHash}.json`,
      sha256: contentHash,
      materialSha256: contentHash,
    },
    dependencyState: {status: 'current', reasons: []},
  };
}

function persistedArtifact({
  revision = 1,
  status = 'accepted',
  payload = {summary: 'A bounded experience.'},
  change = {kind: 'added', previousRevision: null, previousMaterialSha256: null},
} = {}) {
  const material = {
    id: 'experience-plan',
    artifactKind: 'planning-view',
    owner: 'ux',
    artifactSchemaVersion: '1.0',
    status,
    consumerDomains: ['prd', 'ux'],
    scopeRefs: ['record-a'],
    coverageRefs: ['record-a'],
    gapRefs: [],
    lockRefs: [],
    recordDependencies: [{id: 'record-a', materialSha256: hashes.a}],
    artifactDependencies: [],
    producer: {id: 'ux-planner', contractVersion: '1.0', method: 'structured-assessment'},
    resources: [],
    payload,
  };
  const materialSha256 = sha256(Buffer.from(stableJson(material)));
  const resolvedChange = {
    ...change,
    previousMaterialSha256: change.previousMaterialSha256 === 'current'
      ? materialSha256
      : change.previousMaterialSha256,
  };
  return {
    schemaVersion: '1.0',
    kind: 'product-artifact',
    id: material.id,
    artifactKind: material.artifactKind,
    owner: material.owner,
    artifactSchemaVersion: material.artifactSchemaVersion,
    revision,
    status: material.status,
    consumerDomains: material.consumerDomains,
    scopeRefs: material.scopeRefs,
    coverageRefs: material.coverageRefs,
    gapRefs: material.gapRefs,
    lockRefs: material.lockRefs,
    recordDependencies: material.recordDependencies,
    artifactDependencies: material.artifactDependencies,
    producer: material.producer,
    resources: material.resources,
    payload: material.payload,
    materialSha256,
    change: resolvedChange,
  };
}

test('record changes selectively stale direct and transitive dependents while preserving unrelated entries', () => {
  const artifactA = entry({id: 'artifact-a', recordId: 'record-a', recordHash: hashes.a});
  const artifactB = entry({id: 'artifact-b', recordId: 'record-b', recordHash: hashes.b});
  const artifactC = entry({
    id: 'artifact-c',
    recordId: 'record-b',
    recordHash: hashes.b,
    artifactDependency: {id: 'artifact-a', revision: 1, materialSha256: artifactA.content.materialSha256},
  });
  const artifactD = entry({
    id: 'artifact-d',
    status: 'locked',
    recordId: 'record-b',
    recordHash: hashes.b,
    artifactDependency: {id: 'artifact-c', revision: 1, materialSha256: artifactC.content.materialSha256},
  });
  const nextRecords = [
    {id: 'record-a', kind: 'capability', status: 'accepted', materialSha256: hashes.c},
    {id: 'record-b', kind: 'capability', status: 'accepted', materialSha256: hashes.b},
  ];

  const result = reclassifySnapshotArtifacts([artifactD, artifactB, artifactC, artifactA], nextRecords);
  const byId = new Map(result.map(item => [item.id, item]));

  assert.deepEqual(byId.get('artifact-a').dependencyState, {
    status: 'stale',
    reasons: ['record:record-a:material-changed'],
  });
  assert.deepEqual(byId.get('artifact-b').dependencyState, {status: 'current', reasons: []});
  assert.deepEqual(byId.get('artifact-c').dependencyState, {
    status: 'stale',
    reasons: ['artifact:artifact-a:stale'],
  });
  assert.deepEqual(byId.get('artifact-d').dependencyState, {
    status: 'locked-conflict',
    reasons: ['artifact:artifact-c:stale'],
  });
  assert.equal(byId.get('artifact-b').content.path, artifactB.content.path);
  assert.equal(byId.get('artifact-b').content.sha256, artifactB.content.sha256);
});

test('loads a canonical artifact through its exact snapshot binding', t => {
  const root = temporary(t, 'product-artifact-contract-');
  const material = {
    id: 'experience-plan',
    artifactKind: 'planning-view',
    owner: 'ux',
    artifactSchemaVersion: '1.0',
    status: 'accepted',
    consumerDomains: ['prd', 'ux'],
    scopeRefs: ['record-a'],
    coverageRefs: ['record-a'],
    gapRefs: [],
    lockRefs: [],
    recordDependencies: [{id: 'record-a', materialSha256: hashes.a}],
    artifactDependencies: [],
    producer: {id: 'ux-planner', contractVersion: '1.0', method: 'structured-assessment'},
    resources: [],
    payload: {sections: [{id: 'primary-flow', title: 'Primary flow'}]},
  };
  const artifact = {
    schemaVersion: '1.0',
    kind: 'product-artifact',
    id: material.id,
    artifactKind: material.artifactKind,
    owner: material.owner,
    artifactSchemaVersion: material.artifactSchemaVersion,
    revision: 1,
    status: material.status,
    consumerDomains: material.consumerDomains,
    scopeRefs: material.scopeRefs,
    coverageRefs: material.coverageRefs,
    gapRefs: material.gapRefs,
    lockRefs: material.lockRefs,
    recordDependencies: material.recordDependencies,
    artifactDependencies: material.artifactDependencies,
    producer: material.producer,
    resources: material.resources,
    payload: material.payload,
    materialSha256: sha256(Buffer.from(stableJson(material))),
    change: {kind: 'added', previousRevision: null, previousMaterialSha256: null},
  };
  const bytes = Buffer.from(stableJson(artifact));
  const byteSha256 = sha256(bytes);
  const storedPath = `artifacts/ux/experience-plan/1-${byteSha256}.json`;
  const file = path.join(root, ...storedPath.split('/'));
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, bytes);
  const snapshotEntry = {
    ...material,
    payload: undefined,
  };
  delete snapshotEntry.payload;
  snapshotEntry.revision = 1;
  snapshotEntry.change = artifact.change;
  snapshotEntry.content = {path: storedPath, sha256: byteSha256, materialSha256: artifact.materialSha256};
  snapshotEntry.dependencyState = {status: 'current', reasons: []};

  const [loaded] = loadSnapshotArtifacts(root, [snapshotEntry]);

  assert.deepEqual(loaded.bytes, bytes);
  assert.deepEqual(loaded.artifact, artifact);
  assert.equal(loaded.entry.content.path, storedPath);
});

test('accepts coherent artifact histories and rejects impossible revision, status, and material claims', () => {
  const added = persistedArtifact();
  const modified = persistedArtifact({
    revision: 2,
    payload: {summary: 'A materially changed experience.'},
    change: {kind: 'modified', previousRevision: 1, previousMaterialSha256: added.materialSha256},
  });
  const unchanged = persistedArtifact({
    revision: 2,
    change: {kind: 'unchanged', previousRevision: 1, previousMaterialSha256: 'current'},
  });
  const superseded = persistedArtifact({
    revision: 2,
    status: 'superseded',
    change: {kind: 'superseded', previousRevision: 1, previousMaterialSha256: added.materialSha256},
  });

  for (const artifact of [added, modified, unchanged, superseded]) {
    assert.deepEqual(validateProductArtifact(artifact), artifact);
  }

  assert.throws(
    () => validateProductArtifact({...added, revision: 2}),
    /added is valid only for revision 1/u,
  );
  assert.throws(
    () => validateProductArtifact({
      ...modified,
      change: {...modified.change, previousRevision: 2},
    }),
    /must bind revision 1/u,
  );
  assert.throws(
    () => validateProductArtifact({
      ...unchanged,
      change: {...unchanged.change, previousMaterialSha256: hashes.b},
    }),
    /unchanged must retain/u,
  );
  assert.throws(
    () => validateProductArtifact({
      ...modified,
      change: {...modified.change, previousMaterialSha256: modified.materialSha256},
    }),
    /modified must change/u,
  );
  assert.throws(
    () => validateProductArtifact({...modified, status: 'superseded'}),
    /superseded must occur together/u,
  );
  assert.throws(
    () => validateProductArtifact({...superseded, status: 'accepted'}),
    /superseded must occur together/u,
  );

  const impossibleEntry = entry({id: 'artifact-a', recordId: 'record-a', recordHash: hashes.a});
  impossibleEntry.revision = 2;
  impossibleEntry.content.path = impossibleEntry.content.path.replace('/1-', '/2-');
  assert.throws(
    () => reclassifySnapshotArtifacts([impossibleEntry], [{
      id: 'record-a', kind: 'capability', status: 'accepted', materialSha256: hashes.a,
    }]),
    /added is valid only for revision 1/u,
  );
});
