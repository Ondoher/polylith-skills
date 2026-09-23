import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PRODUCT_CONTEXT_MAX_BYTES,
  calculateProductContextMaterialSha256,
  resolveProductContext,
  validateProductContext,
} from './product-context.mjs';
import {
  PRODUCT_CONTEXT_MAX_ARRAY_LENGTH,
  PRODUCT_CONTEXT_MAX_TEXT_LENGTH,
} from './product-context-contract.mjs';
import {commitProductArtifact} from './product-artifact-store.mjs';
import {loadCurrentProduct, persistProductModel} from './product-model.mjs';

const fixtureRoot = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);
const fixtureProposalPath = new URL('product-model-proposal.json', fixtureRoot);
const fixtureSourcePath = new URL('product-description.md', fixtureRoot);
function temporary(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

function store(root) {
  const outputRoot = path.join(root, 'product');
  persistProductModel({
    proposalPath: fixtureProposalPath,
    sourcePath: fixtureSourcePath,
    sourceLabel: 'briefs/field-journal/product-description.md',
    outputRoot,
  });
  return outputRoot;
}

function storedContextPath(productRoot, result) {
  return path.join(productRoot, ...result.path.split('/'));
}

function rebind(context) {
  context.materialSha256 = calculateProductContextMaterialSha256(context);
  context.contextId = `prd-context-${context.materialSha256.slice(0, 12)}`;
  return context;
}

function artifactProposal(chain, overrides = {}) {
  const index = new Map(chain.model.recordIndex.map(record => [record.id, record]));
  const capability = index.get('organize-expeditions');
  const proposal = {
    schemaVersion: '1.0',
    kind: 'product-artifact-proposal',
    id: 'expedition-ux',
    artifactKind: 'experience-summary',
    owner: 'ux',
    artifactSchemaVersion: '1.0',
    status: 'accepted',
    consumerDomains: ['prd', 'ux'],
    scopeRefs: ['organize-expeditions'],
    coverageRefs: ['organize-expeditions'],
    gapRefs: [],
    lockRefs: [],
    recordDependencies: [{
      id: 'organize-expeditions',
      materialSha256: capability.materialSha256,
    }],
    artifactDependencies: [],
    producer: {id: 'ux-planner', contractVersion: '1.0', method: 'assessment'},
    resources: [],
    payload: {summary: 'Review observations in an expedition workspace.'},
    ...overrides,
  };
  return proposal;
}

function commitArtifact(productRoot, proposal) {
  const currentPath = path.join(productRoot, 'current.json');
  const chain = loadCurrentProduct(currentPath);
  const proposalPath = path.join(productRoot, `${proposal.id}-proposal.json`);
  fs.writeFileSync(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`);
  try {
    return commitProductArtifact({
      currentPath,
      baseSnapshotSha256: chain.current.snapshot.sha256,
      proposalPath,
    });
  } finally {
    fs.rmSync(proposalPath, {force: true});
  }
}

test('resolves the exact self-contained PRD context contract', t => {
  const root = temporary(t, 'product-context-full-');
  const productRoot = store(root);
  const result = resolveProductContext({currentPath: path.join(productRoot, 'current.json')});
  const contextPath = storedContextPath(productRoot, result);
  const context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));

  assert.deepEqual(Object.keys(context), [
    'schemaVersion', 'contextId', 'consumer', 'sourceSnapshot', 'productModel', 'scopeRefs',
    'product', 'capabilities', 'gaps', 'artifacts', 'locks', 'exclusions', 'provenance',
    'materialSha256',
  ]);
  assert.equal(validateProductContext(context), context);
  assert.equal(context.product.name, 'Field Journal');
  assert.equal(context.product.purpose.summary, 'Help field researchers preserve observations while working away from a desk.');
  assert.equal(context.product.purpose.status, 'accepted');
  assert.equal(context.product.users[0].owner, 'product');
  assert.equal(context.sourceSnapshot.revision, 1);
  assert.equal(context.productModel.materialSha256.length, 64);
  assert.equal(context.capabilities.length, 3);
  assert.equal(context.gaps[0].kind, 'open-question');
  assert.deepEqual(context.artifacts, []);
  assert.deepEqual(context.exclusions, []);
  assert.equal(context.materialSha256, calculateProductContextMaterialSha256(context));
  assert.equal(context.contextId, `prd-context-${context.materialSha256.slice(0, 12)}`);
  assert.equal(JSON.stringify(context).includes('product-description.md'), false);
  assert.equal(JSON.stringify(context).includes('sourceClaims'), false);
  assert.equal(result.sha256.length, 64);
  assert.equal(result.path, `contexts/prd/${context.materialSha256}/context.json`);
  assert.equal(result.created, true);
});

test('includes a current partial PRD artifact with its explicit gap and snapshot revision', t => {
  const root = temporary(t, 'product-context-partial-artifact-');
  const productRoot = store(root);
  const chain = loadCurrentProduct(path.join(productRoot, 'current.json'));
  const gap = chain.model.recordIndex.find(record => record.id === 'expedition-sharing-policy');
  const proposal = artifactProposal(chain, {
    status: 'partial',
    scopeRefs: ['expedition-sharing-policy', 'organize-expeditions'],
    gapRefs: ['expedition-sharing-policy'],
    recordDependencies: [
      {
        id: 'expedition-sharing-policy',
        materialSha256: gap.materialSha256,
      },
      ...artifactProposal(chain).recordDependencies,
    ],
    payload: {
      summary: 'Review observations in an expedition workspace.',
      unresolved: 'Sharing behavior still needs a product decision.',
    },
  });
  commitArtifact(productRoot, proposal);

  const {context} = resolveProductContext({currentPath: path.join(productRoot, 'current.json')});

  assert.equal(context.sourceSnapshot.revision, 2);
  assert.equal(context.productModel.revision, 1);
  assert.equal(context.artifacts.length, 1);
  assert.equal(context.artifacts[0].id, 'expedition-ux');
  assert.equal(context.artifacts[0].status, 'partial');
  assert.deepEqual(context.artifacts[0].gapRefs, ['expedition-sharing-policy']);
  assert.deepEqual(context.exclusions, []);
  assert.equal(JSON.stringify(context).includes('/artifacts/'), false);
  assert.equal(validateProductContext(context), context);
});

test('lists a stale relevant artifact without copying its payload', t => {
  const root = temporary(t, 'product-context-stale-artifact-');
  const productRoot = store(root);
  let chain = loadCurrentProduct(path.join(productRoot, 'current.json'));
  commitArtifact(productRoot, artifactProposal(chain));
  chain = loadCurrentProduct(path.join(productRoot, 'current.json'));
  const dependency = chain.artifacts.find(item => item.artifact.id === 'expedition-ux').artifact;
  commitArtifact(productRoot, artifactProposal(chain, {
    id: 'prd-overview',
    artifactKind: 'prd-section',
    owner: 'product',
    consumerDomains: ['prd'],
    artifactDependencies: [{
      id: dependency.id,
      revision: dependency.revision,
      materialSha256: dependency.materialSha256,
    }],
    payload: {secret: 'excluded-secret-payload'},
  }));
  chain = loadCurrentProduct(path.join(productRoot, 'current.json'));
  commitArtifact(productRoot, artifactProposal(chain, {
    payload: {summary: 'A materially revised expedition workspace.'},
  }));

  const {context} = resolveProductContext({currentPath: path.join(productRoot, 'current.json')});

  assert.deepEqual(context.artifacts.map(artifact => artifact.id), ['expedition-ux']);
  assert.deepEqual(context.exclusions.map(exclusion => ({
    id: exclusion.id,
    outcome: exclusion.outcome,
  })), [{id: 'prd-overview', outcome: 'stale'}]);
  assert.match(context.exclusions[0].reasons.join(' '), /artifact:expedition-ux:material-changed/u);
  assert.equal(JSON.stringify(context).includes('excluded-secret-payload'), false);
  assert.equal(validateProductContext(context), context);
});

test('refuses a PRD artifact whose transitive dependency is not available to PRD', t => {
  const root = temporary(t, 'product-context-private-dependency-');
  const productRoot = store(root);
  let chain = loadCurrentProduct(path.join(productRoot, 'current.json'));
  commitArtifact(productRoot, artifactProposal(chain, {
    id: 'technical-analysis',
    artifactKind: 'engineering-analysis',
    owner: 'system-architecture',
    consumerDomains: ['system-architecture'],
    payload: {internal: 'technical-only evidence'},
  }));
  chain = loadCurrentProduct(path.join(productRoot, 'current.json'));
  const dependency = chain.artifacts.find(item => item.artifact.id === 'technical-analysis').artifact;
  commitArtifact(productRoot, artifactProposal(chain, {
    id: 'prd-overview',
    artifactKind: 'prd-section',
    owner: 'product',
    consumerDomains: ['prd'],
    artifactDependencies: [{
      id: dependency.id,
      revision: dependency.revision,
      materialSha256: dependency.materialSha256,
    }],
    payload: {summary: 'A publishable overview.'},
  }));

  assert.throws(
    () => resolveProductContext({currentPath: path.join(productRoot, 'current.json')}),
    /depends on non-PRD artifact technical-analysis/u,
  );
});

test('scoped resolution includes required records and excludes unrelated capabilities', t => {
  const root = temporary(t, 'product-context-scope-');
  const productRoot = store(root);
  const {context} = resolveProductContext({
    currentPath: path.join(productRoot, 'current.json'),
    scope: ['organize-expeditions'],
  });

  assert.deepEqual(context.scopeRefs, ['organize-expeditions']);
  assert.deepEqual(context.product.users.map(user => user.id), ['field-researcher']);
  assert.deepEqual(context.capabilities.map(capability => capability.id), ['organize-expeditions']);
  assert.deepEqual(context.gaps.map(gap => gap.id), ['expedition-sharing-policy']);
  assert.deepEqual(context.gaps[0].affectsRefs, ['organize-expeditions']);
});

test('scoped resolution does not import a multi-scope artifact or its unrelated product records', t => {
  const root = temporary(t, 'product-context-artifact-scope-');
  const productRoot = store(root);
  const chain = loadCurrentProduct(path.join(productRoot, 'current.json'));
  const index = new Map(chain.model.recordIndex.map(record => [record.id, record]));
  commitArtifact(productRoot, artifactProposal(chain, {
    scopeRefs: ['create-observations', 'organize-expeditions'],
    coverageRefs: ['create-observations', 'organize-expeditions'],
    recordDependencies: ['create-observations', 'organize-expeditions'].map(id => ({
      id,
      materialSha256: index.get(id).materialSha256,
    })),
    payload: {
      summary: 'A combined design spanning two independent capabilities.',
      unrelatedDetail: 'content outside the requested expedition scope',
    },
  }));

  const {context} = resolveProductContext({
    currentPath: path.join(productRoot, 'current.json'),
    scope: ['organize-expeditions'],
  });

  assert.deepEqual(context.capabilities.map(capability => capability.id), ['organize-expeditions']);
  assert.deepEqual(context.artifacts, []);
  assert.equal(JSON.stringify(context).includes('content outside the requested expedition scope'), false);
  assert.equal(validateProductContext(context), context);
});

test('producer rejects an aggregate context above the shared byte limit before persistence', t => {
  const root = temporary(t, 'product-context-byte-limit-');
  const productRoot = store(root);
  const chain = loadCurrentProduct(path.join(productRoot, 'current.json'));
  const chunk = 'x'.repeat(32_768);
  commitArtifact(productRoot, artifactProposal(chain, {
    payload: {chunks: Array.from({length: 65}, () => chunk)},
  }));

  assert.throws(
    () => resolveProductContext({currentPath: path.join(productRoot, 'current.json')}),
    new RegExp(`${PRODUCT_CONTEXT_MAX_BYTES}-byte aggregate limit`, 'u'),
  );
  assert.equal(fs.existsSync(path.join(productRoot, 'contexts')), false);
});

test('a saved context remains valid after its source and model store are unavailable', t => {
  const root = temporary(t, 'product-context-portable-');
  const productRoot = store(root);
  const result = resolveProductContext({currentPath: path.join(productRoot, 'current.json')});
  const bytes = fs.readFileSync(storedContextPath(productRoot, result));
  const exported = path.join(root, 'exported-prd-context.json');
  fs.writeFileSync(exported, bytes);
  fs.rmSync(productRoot, {recursive: true, force: true});

  const context = JSON.parse(fs.readFileSync(exported, 'utf8'));
  assert.equal(validateProductContext(context), context);
  assert.equal(context.product.users[0].id, 'field-researcher');
});

test('identical resolution is byte-stable and does not replace the output', t => {
  const root = temporary(t, 'product-context-replay-');
  const productRoot = store(root);
  const first = resolveProductContext({currentPath: path.join(productRoot, 'current.json')});
  const contextPath = storedContextPath(productRoot, first);
  const before = fs.readFileSync(contextPath);
  const mtime = fs.statSync(contextPath).mtimeMs;
  const second = resolveProductContext({currentPath: path.join(productRoot, 'current.json')});

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.path, first.path);
  assert.deepEqual(fs.readFileSync(contextPath), before);
  assert.equal(fs.statSync(contextPath).mtimeMs, mtime);
});

test('tampered source-chain input fails before replacing an existing context', t => {
  const root = temporary(t, 'product-context-tamper-');
  const productRoot = store(root);
  const result = resolveProductContext({currentPath: path.join(productRoot, 'current.json')});
  const contextPath = storedContextPath(productRoot, result);
  const before = fs.readFileSync(contextPath);
  const current = JSON.parse(fs.readFileSync(path.join(productRoot, 'current.json'), 'utf8'));
  const snapshot = JSON.parse(fs.readFileSync(path.join(productRoot, ...current.snapshot.path.split('/')), 'utf8'));
  const modelPath = path.join(productRoot, ...snapshot.productModel.path.split('/'));
  fs.appendFileSync(modelPath, ' ');

  assert.throws(
    () => resolveProductContext({currentPath: path.join(productRoot, 'current.json')}),
    /hash mismatch/u,
  );
  assert.deepEqual(fs.readFileSync(contextPath), before);
});

test('context validation rejects unknown fields, broken references, and stale material hashes', t => {
  const root = temporary(t, 'product-context-invalid-');
  const productRoot = store(root);
  const valid = resolveProductContext({currentPath: path.join(productRoot, 'current.json')}).context;

  assert.throws(() => validateProductContext({...valid, inferredDesign: true}), /must contain exactly/u);
  const missing = structuredClone(valid);
  missing.gaps[0].affectsRefs = ['missing-capability'];
  assert.throws(() => validateProductContext(missing), /affects missing record/u);
  const stale = structuredClone(valid);
  stale.product.name = 'Changed without rebinding';
  assert.throws(() => validateProductContext(stale), /materialSha256 does not match/u);
});

test('resolver rejects unsupported consumers without creating output', t => {
  const root = temporary(t, 'product-context-consumer-');
  const productRoot = store(root);
  assert.throws(
    () => resolveProductContext({currentPath: path.join(productRoot, 'current.json'), consumer: 'implementation-planning'}),
    /Unsupported product-context consumer/u,
  );
  assert.equal(fs.existsSync(path.join(productRoot, 'contexts')), false);
});

test('shared context contract enforces identifier, text, array, enum, and safe-integer bounds', t => {
  const root = temporary(t, 'product-context-bounds-');
  const productRoot = store(root);
  const valid = resolveProductContext({currentPath: path.join(productRoot, 'current.json')}).context;

  const maximumText = structuredClone(valid);
  maximumText.product.name = 'x'.repeat(PRODUCT_CONTEXT_MAX_TEXT_LENGTH);
  assert.equal(validateProductContext(rebind(maximumText)), maximumText);

  const oversizedText = structuredClone(valid);
  oversizedText.product.name = 'x'.repeat(PRODUCT_CONTEXT_MAX_TEXT_LENGTH + 1);
  assert.throws(() => validateProductContext(oversizedText), /no longer than/u);

  const oversizedArray = structuredClone(valid);
  oversizedArray.product.users = Array.from({length: PRODUCT_CONTEXT_MAX_ARRAY_LENGTH + 1}, () => ({id: 'user', description: 'User'}));
  assert.throws(() => validateProductContext(oversizedArray), /at most 10000 entries/u);

  const unsafeRevision = structuredClone(valid);
  unsafeRevision.productModel.revision = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => validateProductContext(unsafeRevision), /positive safe integer/u);

  const unsafeId = structuredClone(valid);
  unsafeId.capabilities[0].id = 'Uppercase-ID';
  assert.throws(() => validateProductContext(unsafeId), /lowercase hyphenated ID/u);

  const unknownStatus = structuredClone(valid);
  unknownStatus.capabilities[0].status = 'proposed';
  assert.throws(() => validateProductContext(unknownStatus), /unsupported value proposed/u);
});
