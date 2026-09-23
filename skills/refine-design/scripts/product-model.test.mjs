import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {loadCurrentProduct, persistProductModel} from './product-model.mjs';

const fixtureRoot = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);
const fixtureProposal = () => JSON.parse(fs.readFileSync(new URL('product-model-proposal.json', fixtureRoot), 'utf8'));
const fixtureSource = () => fs.readFileSync(new URL('product-description.md', fixtureRoot));

function temporary(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

function writeInputs(root, proposal, source) {
  const proposalPath = path.join(root, 'proposal.json');
  const sourcePath = path.join(root, 'product-description.md');
  fs.writeFileSync(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`);
  fs.writeFileSync(sourcePath, source);
  return {proposalPath, sourcePath};
}

function persist(root, proposal = fixtureProposal(), source = fixtureSource(), authority) {
  const outputRoot = path.join(root, 'product');
  const input = writeInputs(root, proposal, source);
  const result = persistProductModel({
    ...input,
    sourceLabel: 'briefs/field-journal/product-description.md',
    outputRoot,
    authority,
  });
  return {result, outputRoot, chain: loadCurrentProduct(path.join(outputRoot, 'current.json'))};
}

function updateProposal(chain, mutator = () => {}) {
  const proposal = fixtureProposal();
  proposal.base = {
    snapshotSha256: chain.current.snapshot.sha256,
    modelSha256: chain.snapshot.productModel.sha256,
    revision: chain.model.revision,
  };
  proposal.identityClaims = proposal.identityClaims.map(claim => ({
    recordRef: claim.recordRef,
    kind: 'continued',
    previousRef: claim.recordRef,
    supersedesRefs: [],
  }));
  mutator(proposal);
  return proposal;
}

function replaceLine(source, from, to) {
  return Buffer.from(source.toString('utf8').replace(from, to));
}

test('initial commit assigns revisions and binds the canonical record and snapshot inventory', t => {
  const root = temporary(t, 'product-model-initial-');
  const {result, chain} = persist(root);

  assert.equal(chain.model.revision, 1);
  assert.equal(chain.model.source.revision, 1);
  assert.equal(chain.model.source.previousSha256, null);
  assert.equal(chain.model.parent, null);
  assert.equal(chain.model.changeSet.classification, 'initial');
  assert.equal(chain.model.recordIndex.length, 7);
  assert.equal(chain.model.recordIndex.every(record => record.introducedRevision === 1), true);
  assert.equal(chain.model.recordIndex.every(record => record.materialSha256.length === 64), true);
  assert.equal(chain.model.materialSha256, chain.snapshot.productModel.materialSha256);
  assert.equal(chain.snapshot.revision, 1);
  assert.equal(chain.snapshot.parent, null);
  assert.deepEqual(chain.snapshot.artifacts, []);
  assert.deepEqual(chain.artifacts, []);
  assert.deepEqual(chain.sourceBytes, fixtureSource());
  assert.equal(result.current.changed, true);
});

test('exact replay returns the existing snapshot and canonical collection ordering ignores proposal order', t => {
  const root = temporary(t, 'product-model-replay-');
  const first = persist(root);
  const replayProposal = fixtureProposal();
  replayProposal.users.reverse();
  replayProposal.capabilities.reverse();
  replayProposal.gaps.reverse();
  const replay = persist(root, replayProposal);

  assert.equal(replay.result.revision, 1);
  assert.equal(replay.result.productModel.created, false);
  assert.equal(replay.result.snapshot.created, false);
  assert.equal(replay.result.current.changed, false);
  assert.equal(replay.chain.snapshot.revision, 1);
  assert.equal(replay.chain.current.snapshot.sha256, first.chain.current.snapshot.sha256);
});

test('source-only update preserves every material identity while advancing source, model, and snapshot revisions', t => {
  const root = temporary(t, 'product-model-source-only-');
  const first = persist(root);
  const source = replaceLine(fixtureSource(), 'away from a desk.', 'away from a desk. ');
  const proposal = updateProposal(first.chain);
  const second = persist(root, proposal, source);

  assert.equal(second.chain.model.revision, 2);
  assert.equal(second.chain.model.source.revision, 2);
  assert.equal(second.chain.model.source.previousSha256, first.chain.model.source.sha256);
  assert.equal(second.chain.model.changeSet.classification, 'source-only');
  assert.equal(second.chain.model.changeSet.records.every(change => change.classification === 'unchanged'), true);
  assert.deepEqual(second.chain.model.recordIndex.map(record => record.materialSha256), first.chain.model.recordIndex.map(record => record.materialSha256));
  assert.deepEqual(second.chain.model.recordIndex.map(record => record.materialSource), first.chain.model.recordIndex.map(record => record.materialSource));
  assert.equal(second.chain.snapshot.revision, 2);
  assert.equal(second.chain.snapshot.parent.sha256, first.chain.current.snapshot.sha256);
});

test('material update changes only the affected record identity and carries unchanged material sources forward', t => {
  const root = temporary(t, 'product-model-material-');
  const first = persist(root);
  const source = replaceLine(
    fixtureSource(),
    'Researchers can create dated observations with a title and notes.',
    'Researchers can create timestamped observations with a title and detailed notes.',
  );
  const proposal = updateProposal(first.chain, value => {
    value.capabilities.find(record => record.id === 'create-observations').description = 'Create a timestamped observation with a title and detailed notes.';
  });
  const second = persist(root, proposal, source);
  const changes = new Map(second.chain.model.changeSet.records.map(change => [change.id, change]));
  const before = new Map(first.chain.model.recordIndex.map(record => [record.id, record]));
  const after = new Map(second.chain.model.recordIndex.map(record => [record.id, record]));

  assert.equal(second.chain.model.changeSet.classification, 'material');
  assert.equal(changes.get('create-observations').classification, 'changed');
  assert.equal(after.get('create-observations').materialSource.revision, 2);
  for (const [id, prior] of before) {
    if (id === 'create-observations') continue;
    assert.equal(changes.get(id).classification, 'unchanged');
    assert.equal(after.get(id).materialSha256, prior.materialSha256);
    assert.deepEqual(after.get(id).materialSource, prior.materialSource);
  }
  assert.equal(second.chain.model.parent.sha256, first.chain.snapshot.productModel.sha256);
});

test('lock authority is consumed only for the target lock and exact reaffirmation needs no grant', t => {
  const root = temporary(t, 'product-model-lock-');
  const proposal = fixtureProposal();
  proposal.purpose.status = 'locked';
  const authority = {
    schemaVersion: '1.0',
    kind: 'product-lock-authority',
    grants: [{recordRef: 'field-journal-purpose', owner: 'product', instruction: 'Lock the agreed product purpose.'}],
  };
  const first = persist(root, proposal, fixtureSource(), authority);
  assert.deepEqual(first.chain.model.authorityReceipts, authority.grants);
  assert.equal(first.chain.model.recordIndex.find(record => record.id === 'field-journal-purpose').status, 'locked');

  const replay = persist(root, proposal);
  assert.equal(replay.result.current.changed, false);
  assert.equal(replay.chain.model.revision, 1);
});

test('an update replay must still bind the exact current base', t => {
  const root = temporary(t, 'product-model-replay-base-');
  const first = persist(root);
  const source = replaceLine(fixtureSource(), 'away from a desk.', 'away from a desk. ');
  const proposal = updateProposal(first.chain);
  persist(root, proposal, source);

  assert.throws(() => persist(root, proposal, source), /base does not match the exact current/u);
});

test('semantic changes cannot be committed against unchanged exact source bytes', t => {
  const root = temporary(t, 'product-model-source-authority-');
  const first = persist(root);
  const proposal = updateProposal(first.chain, value => {
    value.capabilities.find(record => record.id === 'create-observations').description = 'A different interpretation without a source edit.';
  });

  assert.throws(() => persist(root, proposal), /Semantic product-model changes require changed exact source bytes/u);
});
