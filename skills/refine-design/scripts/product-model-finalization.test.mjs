import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {commitProductArtifact} from './product-artifact-store.mjs';
import {loadCurrentProduct, persistProductModel, validateProductModel} from './product-model.mjs';
import {sha256, stableJson} from './product-artifact-utils.mjs';

const fixtureRoot = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);
const fixtureProposal = () => JSON.parse(fs.readFileSync(new URL('product-model-proposal.json', fixtureRoot), 'utf8'));
const fixtureSource = () => fs.readFileSync(new URL('product-description.md', fixtureRoot));

function temporary(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

function inputs(root, proposal, source) {
  const proposalPath = writeJson(path.join(root, 'proposal.json'), proposal);
  const sourcePath = path.join(root, 'product-description.md');
  fs.writeFileSync(sourcePath, source);
  return {proposalPath, sourcePath};
}

function persist(root, proposal = fixtureProposal(), source = fixtureSource(), authority) {
  const outputRoot = path.join(root, 'product');
  const paths = inputs(root, proposal, source);
  const result = persistProductModel({
    ...paths,
    sourceLabel: 'briefs/field-journal/product-description.md',
    outputRoot,
    authority,
  });
  return {result, outputRoot, chain: loadCurrentProduct(path.join(outputRoot, 'current.json')), paths};
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

function replaceText(source, from, to) {
  const next = source.toString('utf8').replace(from, to);
  assert.notEqual(next, source.toString('utf8'), `Expected source text ${JSON.stringify(from)}`);
  return Buffer.from(next);
}

function currentPath(outputRoot) {
  return path.join(outputRoot, 'current.json');
}

function rewriteCurrentModel(stored, mutator) {
  const model = structuredClone(stored.chain.model);
  mutator(model);
  const modelBytes = Buffer.from(stableJson(model));
  const modelSha256 = sha256(modelBytes);
  const modelStoredPath = `models/${model.revision}-${modelSha256}/product-model.json`;
  fs.mkdirSync(path.dirname(path.join(stored.outputRoot, modelStoredPath)), {recursive: true});
  fs.writeFileSync(path.join(stored.outputRoot, modelStoredPath), modelBytes);

  const snapshot = structuredClone(stored.chain.snapshot);
  snapshot.source = model.source;
  snapshot.productModel.path = modelStoredPath;
  snapshot.productModel.sha256 = modelSha256;
  snapshot.productModel.materialSha256 = model.materialSha256;
  snapshot.productModel.recordIndexSha256 = sha256(Buffer.from(stableJson(model.recordIndex)));
  const snapshotBytes = Buffer.from(stableJson(snapshot));
  const snapshotSha256 = sha256(snapshotBytes);
  const snapshotStoredPath = `snapshots/${snapshotSha256}/product-snapshot.json`;
  fs.mkdirSync(path.dirname(path.join(stored.outputRoot, snapshotStoredPath)), {recursive: true});
  fs.writeFileSync(path.join(stored.outputRoot, snapshotStoredPath), snapshotBytes);

  const current = structuredClone(stored.chain.current);
  current.snapshot.path = snapshotStoredPath;
  current.snapshot.sha256 = snapshotSha256;
  fs.writeFileSync(currentPath(stored.outputRoot), stableJson(current));
  return {model, modelSha256};
}

function sourceOnlyUpdate(root, initial, from = 'away from a desk.', to = 'away from a desk. ') {
  return persist(root, updateProposal(initial.chain), replaceText(fixtureSource(), from, to));
}

function artifactProposal(chain) {
  const dependency = chain.model.recordIndex.find(record => record.id === 'create-observations');
  return {
    schemaVersion: '1.0',
    kind: 'product-artifact-proposal',
    id: 'observation-experience',
    artifactKind: 'product-experience-plan',
    owner: 'ux',
    artifactSchemaVersion: '1.0',
    status: 'accepted',
    consumerDomains: ['prd', 'ux'],
    scopeRefs: ['create-observations'],
    coverageRefs: ['create-observations'],
    gapRefs: [],
    lockRefs: [],
    recordDependencies: [{id: dependency.id, materialSha256: dependency.materialSha256}],
    artifactDependencies: [],
    producer: {id: 'ux-planner', contractVersion: '1.0', method: 'structured-assessment'},
    resources: [],
    payload: {summary: 'Create an observation.'},
  };
}

function lockAuthority(recordRef, instruction) {
  return {
    schemaVersion: '1.0',
    kind: 'product-lock-authority',
    grants: [{recordRef, owner: 'product', instruction}],
  };
}

test('model update rejects a stale base after an artifact-only snapshot advance', t => {
  const root = temporary(t, 'product-final-stale-artifact-base-');
  const initial = persist(root);
  const proposal = updateProposal(initial.chain);
  const source = replaceText(fixtureSource(), 'away from a desk.', 'away from a desk. ');
  const artifactPath = writeJson(path.join(root, 'artifact.json'), artifactProposal(initial.chain));

  commitProductArtifact({
    currentPath: currentPath(initial.outputRoot),
    baseSnapshotSha256: initial.chain.current.snapshot.sha256,
    proposalPath: artifactPath,
  });

  assert.throws(() => persist(root, proposal, source), /base does not match the exact current model and snapshot/u);
});

test('record identity accounting rejects omission, re-ID, and reuse across record kinds', async t => {
  await t.test('omitted prior record', () => {
    const root = temporary(t, 'product-final-omitted-record-');
    const initial = persist(root);
    const proposal = updateProposal(initial.chain, value => {
      value.gaps = [];
      value.identityClaims = value.identityClaims.filter(claim => claim.recordRef !== 'expedition-sharing-policy');
      const claim = value.sourceClaims.find(item => item.id === 'claim-expedition-sharing');
      claim.disposition = 'unclassified';
      claim.recordRefs = [];
    });
    const source = replaceText(fixtureSource(), 'It is not yet decided whether', 'The description still does not decide whether');
    assert.throws(() => persist(root, proposal, source), /Previous semantic record expedition-sharing-policy must remain/u);
  });

  await t.test('re-identified prior record', () => {
    const root = temporary(t, 'product-final-reid-record-');
    const initial = persist(root);
    const proposal = updateProposal(initial.chain, value => {
      const capability = value.capabilities.find(record => record.id === 'create-observations');
      capability.id = 'record-observations';
      capability.provenance.sourceClaimRefs = ['claim-create-observations'];
      value.sourceClaims.find(claim => claim.id === 'claim-create-observations').recordRefs = ['record-observations'];
      value.identityClaims = value.identityClaims.filter(claim => claim.recordRef !== 'create-observations');
      value.identityClaims.push({recordRef: 'record-observations', kind: 'new', previousRef: null, supersedesRefs: []});
    });
    const source = replaceText(fixtureSource(), 'create dated observations', 'record dated observations');
    assert.throws(() => persist(root, proposal, source), /Previous semantic record create-observations must remain/u);
  });

  await t.test('prior ID reused for another kind', () => {
    const root = temporary(t, 'product-final-type-reuse-');
    const initial = persist(root);
    const proposal = updateProposal(initial.chain, value => {
      const user = value.users.shift();
      for (const capability of value.capabilities) capability.userRefs = [];
      value.capabilities.push({
        id: user.id,
        name: user.name,
        description: user.description,
        outcome: 'The reused identity now incorrectly describes a capability.',
        status: user.status,
        owner: user.owner,
        consumerDomains: user.consumerDomains,
        userRefs: [],
        relatedCapabilityRefs: [],
        provenance: user.provenance,
      });
    });
    const source = replaceText(fixtureSource(), 'It is used by researchers', 'It is intended for researchers');
    assert.throws(() => persist(root, proposal, source), /Semantic record field-researcher cannot change kind/u);
  });
});

test('removed source claims require explicit successor lineage', t => {
  const root = temporary(t, 'product-final-claim-lineage-');
  const initial = persist(root);
  const proposal = updateProposal(initial.chain, value => {
    const claim = value.sourceClaims.find(item => item.id === 'claim-purpose');
    claim.id = 'claim-product-purpose';
    value.purpose.provenance.sourceClaimRefs = ['claim-product-purpose'];
  });
  const source = replaceText(fixtureSource(), 'Field Journal helps', 'Field Journal enables');

  assert.throws(() => persist(root, proposal, source), /sourceClaimLineage must account for removed source claim claim-purpose/u);
});

test('source-claim lineage persists an explicit split and merge in the change set', t => {
  const root = temporary(t, 'product-final-claim-lineage-success-');
  const initial = persist(root);
  const split = updateProposal(initial.chain, value => {
    const original = value.sourceClaims.find(claim => claim.id === 'claim-purpose');
    value.sourceClaims = value.sourceClaims.filter(claim => claim.id !== original.id);
    value.sourceClaims.push(
      {
        ...original,
        id: 'claim-product-heading',
        endLine: 2,
        summary: 'The source names the product.',
      },
      {
        ...original,
        id: 'claim-product-purpose',
        startLine: 3,
        summary: 'The source states the product purpose.',
      },
    );
    value.purpose.provenance.sourceClaimRefs = ['claim-product-heading', 'claim-product-purpose'];
    value.sourceClaimLineage = [{
      previousRef: 'claim-purpose',
      successorRefs: ['claim-product-heading', 'claim-product-purpose'],
    }];
  });
  const splitSource = replaceText(fixtureSource(), 'Field Journal helps', 'Field Journal enables');
  const afterSplit = persist(root, split, splitSource);
  const splitChanges = new Map(afterSplit.chain.model.changeSet.sourceClaims.map(change => [change.id, change]));
  assert.deepEqual(splitChanges.get('claim-product-heading'), {
    id: 'claim-product-heading',
    classification: 'succeeded',
    previousRefs: ['claim-purpose'],
  });
  assert.deepEqual(splitChanges.get('claim-product-purpose'), {
    id: 'claim-product-purpose',
    classification: 'succeeded',
    previousRefs: ['claim-purpose'],
  });

  const merge = updateProposal(afterSplit.chain, value => {
    const original = value.sourceClaims.find(claim => claim.id === 'claim-purpose');
    original.id = 'claim-purpose-recombined';
    value.purpose.provenance.sourceClaimRefs = ['claim-purpose-recombined'];
    value.sourceClaimLineage = [
      {previousRef: 'claim-product-heading', successorRefs: ['claim-purpose-recombined']},
      {previousRef: 'claim-product-purpose', successorRefs: ['claim-purpose-recombined']},
    ];
  });
  const mergeSource = replaceText(splitSource, 'Field Journal enables', 'Field Journal supports');
  const afterMerge = persist(root, merge, mergeSource);
  assert.deepEqual(
    afterMerge.chain.model.changeSet.sourceClaims.find(change => change.id === 'claim-purpose-recombined'),
    {
      id: 'claim-purpose-recombined',
      classification: 'succeeded',
      previousRefs: ['claim-product-heading', 'claim-product-purpose'],
    },
  );
});

test('a superseded record cannot be resurrected', t => {
  const root = temporary(t, 'product-final-resurrection-');
  const initial = persist(root);
  const retire = updateProposal(initial.chain, value => {
    value.capabilities.find(record => record.id === 'review-glossary').status = 'superseded';
    value.sourceClaims.find(claim => claim.id === 'claim-review-glossary').disposition = 'superseded';
  });
  const retiredSource = replaceText(
    fixtureSource(),
    'Researchers can review an alphabetical glossary of terms used in their observations.',
    'The glossary capability has been retired.',
  );
  const retired = persist(
    root,
    retire,
    retiredSource,
    lockAuthority('review-glossary', 'Retire the glossary capability.'),
  );
  const resurrect = updateProposal(retired.chain);
  const resurrectedSource = replaceText(retiredSource, 'has been retired.', 'is requested again.');

  assert.throws(() => persist(root, resurrect, resurrectedSource), /Superseded semantic record review-glossary cannot be reactivated/u);
});

test('record locks require current-owner authority to create, change, or unlock', async t => {
  await t.test('create', () => {
    const root = temporary(t, 'product-final-lock-create-');
    const proposal = fixtureProposal();
    proposal.purpose.status = 'locked';
    assert.throws(() => persist(root, proposal), /requires explicit lock authority from current owner product/u);
    assert.equal(fs.existsSync(path.join(root, 'product', 'current.json')), false);
  });

  await t.test('simultaneous owner transfer and lock uses the prior current owner', () => {
    const root = temporary(t, 'product-final-lock-owner-transfer-');
    const initial = persist(root);
    const proposal = updateProposal(initial.chain, value => {
      value.purpose.owner = 'ux';
      value.purpose.status = 'locked';
    });
    const source = replaceText(fixtureSource(), 'helps field researchers', 'continues helping field researchers');
    const candidateOwnerAuthority = {
      schemaVersion: '1.0',
      kind: 'product-lock-authority',
      grants: [{
        recordRef: 'field-journal-purpose',
        owner: 'ux',
        instruction: 'Transfer ownership and lock the purpose.',
      }],
    };

    assert.throws(
      () => persist(root, proposal, source, candidateOwnerAuthority),
      /requires explicit lock authority from current owner product/u,
    );
    assert.equal(loadCurrentProduct(currentPath(initial.outputRoot)).model.revision, 1);

    const authorized = persist(
      root,
      proposal,
      source,
      lockAuthority('field-journal-purpose', 'Authorize the ownership transfer and lock.'),
    );
    assert.equal(authorized.chain.model.purpose.owner, 'ux');
    assert.equal(authorized.chain.model.purpose.status, 'locked');
    assert.equal(authorized.chain.model.authorityReceipts[0].owner, 'product');
  });

  await t.test('material change', () => {
    const root = temporary(t, 'product-final-lock-change-');
    const proposal = fixtureProposal();
    proposal.purpose.status = 'locked';
    const locked = persist(root, proposal, fixtureSource(), lockAuthority('field-journal-purpose', 'Lock the agreed purpose.'));
    const changed = updateProposal(locked.chain, value => {
      value.purpose.status = 'locked';
      value.purpose.summary = 'A materially changed locked purpose.';
    });
    const source = replaceText(fixtureSource(), 'helps field researchers', 'supports field researchers');
    assert.throws(() => persist(root, changed, source), /requires explicit lock authority from current owner product/u);
  });

  await t.test('unlock', () => {
    const root = temporary(t, 'product-final-lock-unlock-');
    const proposal = fixtureProposal();
    proposal.purpose.status = 'locked';
    const locked = persist(root, proposal, fixtureSource(), lockAuthority('field-journal-purpose', 'Lock the agreed purpose.'));
    const unlocked = updateProposal(locked.chain, value => {
      value.purpose.status = 'accepted';
    });
    const source = replaceText(fixtureSource(), 'helps field researchers', 'continues to help field researchers');
    assert.throws(() => persist(root, unlocked, source), /requires explicit lock authority from current owner product/u);
  });

  await t.test('authorized material change and unlock', () => {
    const root = temporary(t, 'product-final-lock-authorized-lifecycle-');
    const proposal = fixtureProposal();
    proposal.purpose.status = 'locked';
    const locked = persist(root, proposal, fixtureSource(), lockAuthority('field-journal-purpose', 'Lock the agreed purpose.'));

    const changed = updateProposal(locked.chain, value => {
      value.purpose.status = 'locked';
      value.purpose.summary = 'Help field researchers preserve dependable observations away from a desk.';
    });
    const changedSource = replaceText(
      fixtureSource(),
      'helps field researchers preserve observations',
      'helps field researchers preserve dependable observations',
    );
    const authorizedChange = persist(
      root,
      changed,
      changedSource,
      lockAuthority('field-journal-purpose', 'Apply the requested material change to the locked purpose.'),
    );
    assert.equal(authorizedChange.chain.model.purpose.status, 'locked');
    assert.equal(authorizedChange.chain.model.authorityReceipts[0].recordRef, 'field-journal-purpose');

    const unlocked = updateProposal(authorizedChange.chain, value => {
      value.purpose.status = 'accepted';
      value.purpose.summary = 'Help field researchers preserve dependable observations away from a desk.';
    });
    const unlockedSource = replaceText(changedSource, 'while they are working', 'while they work');
    const authorizedUnlock = persist(
      root,
      unlocked,
      unlockedSource,
      lockAuthority('field-journal-purpose', 'Unlock the purpose as explicitly requested.'),
    );
    assert.equal(authorizedUnlock.chain.model.purpose.status, 'accepted');
    assert.equal(authorizedUnlock.chain.model.authorityReceipts[0].recordRef, 'field-journal-purpose');
  });
});

test('model completeness status must honestly match active gaps or unclassified claims', async t => {
  await t.test('partial without incomplete material', () => {
    const root = temporary(t, 'product-final-false-partial-');
    const proposal = fixtureProposal();
    proposal.gaps = [];
    proposal.identityClaims = proposal.identityClaims.filter(claim => claim.recordRef !== 'expedition-sharing-policy');
    const claim = proposal.sourceClaims.find(item => item.id === 'claim-expedition-sharing');
    claim.disposition = 'incorporated';
    claim.recordRefs = ['field-journal-purpose'];
    proposal.purpose.provenance.sourceClaimRefs.push('claim-expedition-sharing');
    assert.throws(() => persist(root, proposal), /partial product model must contain an active gap or unclassified source claim/u);
  });

  await t.test('accepted with incomplete material', () => {
    const root = temporary(t, 'product-final-false-accepted-');
    const proposal = fixtureProposal();
    proposal.status = 'accepted';
    assert.throws(() => persist(root, proposal), /active gaps or unclassified source claims must be partial/u);
  });
});

test('exact-byte loading detects tampering in current bindings and immediate ancestors', async t => {
  await t.test('bound source', () => {
    const root = temporary(t, 'product-final-tamper-source-');
    const stored = persist(root);
    fs.appendFileSync(path.join(stored.outputRoot, ...stored.chain.model.source.path.split('/')), 'tamper');
    assert.throws(() => loadCurrentProduct(currentPath(stored.outputRoot)), /snapshot source hash mismatch/u);
  });

  await t.test('bound model', () => {
    const root = temporary(t, 'product-final-tamper-model-');
    const stored = persist(root);
    fs.appendFileSync(path.join(stored.outputRoot, ...stored.chain.snapshot.productModel.path.split('/')), ' ');
    assert.throws(() => loadCurrentProduct(currentPath(stored.outputRoot)), /snapshot product model hash mismatch/u);
  });

  await t.test('bound snapshot', () => {
    const root = temporary(t, 'product-final-tamper-snapshot-');
    const stored = persist(root);
    fs.appendFileSync(path.join(stored.outputRoot, ...stored.chain.current.snapshot.path.split('/')), ' ');
    assert.throws(() => loadCurrentProduct(currentPath(stored.outputRoot)), /current snapshot hash mismatch/u);
  });

  await t.test('current pointer canonical bytes', () => {
    const root = temporary(t, 'product-final-tamper-current-');
    const stored = persist(root);
    fs.appendFileSync(currentPath(stored.outputRoot), ' ');
    assert.throws(() => loadCurrentProduct(currentPath(stored.outputRoot)), /Current pointer is not in canonical byte form/u);
  });

  await t.test('immediate model ancestor', () => {
    const root = temporary(t, 'product-final-tamper-parent-model-');
    const initial = persist(root);
    const proposal = updateProposal(initial.chain);
    const source = replaceText(fixtureSource(), 'away from a desk.', 'away from a desk. ');
    const updated = persist(root, proposal, source);
    const parent = updated.chain.model.parent;
    const parentPath = path.join(updated.outputRoot, 'models', `${parent.revision}-${parent.sha256}`, 'product-model.json');
    fs.appendFileSync(parentPath, ' ');
    assert.throws(() => loadCurrentProduct(currentPath(updated.outputRoot)), /parent product model hash mismatch/u);
  });

  await t.test('immediate snapshot ancestor', () => {
    const root = temporary(t, 'product-final-tamper-parent-snapshot-');
    const initial = persist(root);
    const proposal = updateProposal(initial.chain);
    const source = replaceText(fixtureSource(), 'away from a desk.', 'away from a desk. ');
    const updated = persist(root, proposal, source);
    const parent = updated.chain.snapshot.parent;
    const parentPath = path.join(updated.outputRoot, 'snapshots', parent.sha256, 'product-snapshot.json');
    fs.appendFileSync(parentPath, ' ');
    assert.throws(() => loadCurrentProduct(currentPath(updated.outputRoot)), /parent product snapshot hash mismatch/u);
  });
});

test('persisted record-change prior status is a closed enumerated value', t => {
  const root = temporary(t, 'product-final-prior-status-contract-');
  const initial = persist(root);
  const updated = sourceOnlyUpdate(root, initial);
  const unsupported = structuredClone(updated.chain.model);
  unsupported.changeSet.records[0].previousStatus = 'invented';
  assert.throws(() => validateProductModel(unsupported), /previousStatus has unsupported value invented/u);

  const open = structuredClone(updated.chain.model);
  open.changeSet.records[0].previousStatusReason = 'Not part of the contract.';
  assert.throws(() => validateProductModel(open), /has unsupported field previousStatusReason/u);
});

test('model loading validates every reconstructable semantic transition against the exact parent', async t => {
  await t.test('source previous digest', () => {
    const root = temporary(t, 'product-final-parent-source-binding-');
    const initial = persist(root);
    const updated = sourceOnlyUpdate(root, initial);
    rewriteCurrentModel(updated, model => {
      model.source.previousSha256 = '0'.repeat(64);
    });
    assert.throws(
      () => loadCurrentProduct(currentPath(updated.outputRoot)),
      /source revision or previous SHA-256 does not match its exact parent/u,
    );
  });

  await t.test('record previous status', () => {
    const root = temporary(t, 'product-final-parent-record-status-');
    const initial = persist(root);
    const updated = sourceOnlyUpdate(root, initial);
    rewriteCurrentModel(updated, model => {
      model.changeSet.records.find(change => change.id === 'field-researcher').previousStatus = 'locked';
    });
    assert.throws(
      () => loadCurrentProduct(currentPath(updated.outputRoot)),
      /previousStatus does not match its exact parent/u,
    );
  });

  await t.test('record previous material digest', () => {
    const root = temporary(t, 'product-final-parent-record-material-');
    const initial = persist(root);
    const proposal = updateProposal(initial.chain, value => {
      value.capabilities.find(record => record.id === 'create-observations').description = 'Capture timestamped field observations.';
    });
    const source = replaceText(fixtureSource(), 'create dated observations', 'create timestamped observations');
    const updated = persist(root, proposal, source);
    rewriteCurrentModel(updated, model => {
      model.changeSet.records.find(change => change.id === 'create-observations').previousMaterialSha256 = '0'.repeat(64);
    });
    assert.throws(
      () => loadCurrentProduct(currentPath(updated.outputRoot)),
      /previousMaterialSha256 does not match its exact parent/u,
    );
  });

  await t.test('unchanged record material source', () => {
    const root = temporary(t, 'product-final-parent-material-source-');
    const initial = persist(root);
    const updated = sourceOnlyUpdate(root, initial);
    rewriteCurrentModel(updated, model => {
      const entry = model.recordIndex.find(record => record.id === 'field-researcher');
      entry.materialSource = {
        revision: model.source.revision,
        sourceSha256: model.source.sha256,
        claimRefs: ['claim-users'],
      };
    });
    assert.throws(
      () => loadCurrentProduct(currentPath(updated.outputRoot)),
      /materialSource does not match its exact model transition/u,
    );
  });

  await t.test('source-claim predecessor lineage', () => {
    const root = temporary(t, 'product-final-parent-claim-lineage-');
    const initial = persist(root);
    const updated = sourceOnlyUpdate(root, initial);
    rewriteCurrentModel(updated, model => {
      const change = model.changeSet.sourceClaims.find(item => item.id === 'claim-purpose');
      change.classification = 'succeeded';
      change.previousRefs = ['claim-users'];
    });
    assert.throws(
      () => loadCurrentProduct(currentPath(updated.outputRoot)),
      /Retained source claim claim-purpose must name itself as an exact-parent predecessor/u,
    );
  });

  await t.test('consumed authority receipt', () => {
    const root = temporary(t, 'product-final-parent-authority-receipt-');
    const initial = persist(root);
    const proposal = updateProposal(initial.chain, value => {
      value.purpose.status = 'locked';
    });
    const source = replaceText(fixtureSource(), 'helps field researchers', 'continues helping field researchers');
    const updated = persist(
      root,
      proposal,
      source,
      lockAuthority('field-journal-purpose', 'Lock the agreed purpose.'),
    );
    rewriteCurrentModel(updated, model => {
      model.authorityReceipts = [];
    });
    assert.throws(
      () => loadCurrentProduct(currentPath(updated.outputRoot)),
      /authorityReceipts must exactly account for authority consumed/u,
    );
  });
});

test('model loading validates semantic transitions throughout the bound model ancestry', t => {
  const root = temporary(t, 'product-final-deep-model-ancestry-');
  const initial = persist(root);
  const secondSource = replaceText(fixtureSource(), 'away from a desk.', 'away from a desk. ');
  const second = persist(root, updateProposal(initial.chain), secondSource);
  const thirdSource = replaceText(secondSource, 'while they are working away', 'while they continue working away');
  const third = persist(root, updateProposal(second.chain), thirdSource);
  assert.equal(loadCurrentProduct(currentPath(third.outputRoot)).model.revision, 3);

  const tamperedParent = structuredClone(second.chain.model);
  tamperedParent.changeSet.records.find(change => change.id === 'field-researcher').previousStatus = 'locked';
  const parentBytes = Buffer.from(stableJson(tamperedParent));
  const parentSha256 = sha256(parentBytes);
  const parentPath = path.join(third.outputRoot, 'models', `${tamperedParent.revision}-${parentSha256}`, 'product-model.json');
  fs.mkdirSync(path.dirname(parentPath), {recursive: true});
  fs.writeFileSync(parentPath, parentBytes);
  rewriteCurrentModel(third, model => {
    model.parent.sha256 = parentSha256;
  });

  assert.throws(
    () => loadCurrentProduct(currentPath(third.outputRoot)),
    /previousStatus does not match its exact parent/u,
  );
});
