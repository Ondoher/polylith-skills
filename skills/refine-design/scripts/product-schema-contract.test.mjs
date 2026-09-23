import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  loadSnapshotArtifacts,
  validateProductArtifact,
} from './product-artifact-contract.mjs';
import {commitProductArtifact} from './product-artifact-store.mjs';
import {
  calculateProductContextMaterialSha256,
  resolveProductContext,
  validateProductContext,
} from './product-context.mjs';
import {
  loadCurrentProduct,
  persistProductModel,
  validateCurrentPointer,
  validateProductModel,
  validateProductSnapshot,
} from './product-model.mjs';

const references = new URL('../references/', import.meta.url);
const fixtureRoot = new URL('fixtures/product-model/field-journal/', references);
const schemaDocuments = new Map(
  [
    'product-model-schema-1.0.json',
    'product-artifact-schema-1.0.json',
    'product-context-schema-1.0.json',
  ].map(name => [name, JSON.parse(fs.readFileSync(new URL(name, references), 'utf8'))]),
);

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pointerValue(document, fragment, label) {
  if (!fragment || fragment === '#') return document;
  if (!fragment.startsWith('#/')) throw new Error(`Unsupported schema fragment ${fragment} in ${label}`);
  return fragment.slice(2).split('/').reduce((value, segment) => {
    const key = segment.replaceAll('~1', '/').replaceAll('~0', '~');
    assert.ok(value && Object.hasOwn(value, key), `Unresolved schema reference ${label}`);
    return value[key];
  }, document);
}

function resolveReference(reference, currentName) {
  const [fileName, fragment = ''] = reference.split('#', 2);
  const targetName = fileName || currentName;
  const document = schemaDocuments.get(targetName);
  if (!document) throw new Error(`Unsupported schema document ${targetName}`);
  return {schema: pointerValue(document, fragment ? `#${fragment}` : '', reference), documentName: targetName};
}

function matchesType(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'null') return value === null;
  return typeof value === type;
}

function contractErrors(schema, value, pathLabel, documentName) {
  if (schema === true) return [];
  if (schema === false) return [`${pathLabel} is forbidden`];

  if (schema.$ref) {
    const resolved = resolveReference(schema.$ref, documentName);
    const errors = contractErrors(resolved.schema, value, pathLabel, resolved.documentName);
    const siblings = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== '$ref'));
    if (Object.keys(siblings).length) errors.push(...contractErrors(siblings, value, pathLabel, documentName));
    return errors;
  }

  const errors = [];
  if ('const' in schema && !sameValue(value, schema.const)) errors.push(`${pathLabel} does not match const`);
  if (schema.enum && !schema.enum.some(candidate => sameValue(value, candidate))) errors.push(`${pathLabel} is not in enum`);

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(type => matchesType(value, type))) return [...errors, `${pathLabel} has the wrong type`];
  }

  for (const branch of schema.allOf ?? []) errors.push(...contractErrors(branch, value, pathLabel, documentName));
  if (schema.anyOf && !schema.anyOf.some(branch => contractErrors(branch, value, pathLabel, documentName).length === 0)) {
    errors.push(`${pathLabel} matches no anyOf branch`);
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter(branch => contractErrors(branch, value, pathLabel, documentName).length === 0).length;
    if (matches !== 1) errors.push(`${pathLabel} must match exactly one oneOf branch (matched ${matches})`);
  }
  if (schema.if) {
    const branch = contractErrors(schema.if, value, pathLabel, documentName).length === 0 ? schema.then : schema.else;
    if (branch) errors.push(...contractErrors(branch, value, pathLabel, documentName));
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${pathLabel} is shorter than minLength`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${pathLabel} is longer than maxLength`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${pathLabel} does not match pattern`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${pathLabel} is below minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${pathLabel} is above maximum`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${pathLabel} has too few items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${pathLabel} has too many items`);
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) {
      errors.push(`${pathLabel} has duplicate items`);
    }
    if (schema.items) value.forEach((item, index) => {
      errors.push(...contractErrors(schema.items, item, `${pathLabel}[${index}]`, documentName));
    });
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${pathLabel}.${key} is required`);
    }
    if (schema.maxProperties !== undefined && Object.keys(value).length > schema.maxProperties) {
      errors.push(`${pathLabel} has too many properties`);
    }
    for (const [key, child] of Object.entries(value)) {
      if (schema.propertyNames) errors.push(...contractErrors(schema.propertyNames, key, `${pathLabel}.{propertyName}`, documentName));
      if (schema.properties?.[key]) {
        errors.push(...contractErrors(schema.properties[key], child, `${pathLabel}.${key}`, documentName));
      } else if (schema.additionalProperties === false) {
        errors.push(`${pathLabel}.${key} is not allowed`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...contractErrors(schema.additionalProperties, child, `${pathLabel}.${key}`, documentName));
      }
    }
  }
  return errors;
}

function assertMatches(documentName, value, label) {
  assert.deepEqual(contractErrors(schemaDocuments.get(documentName), value, '$', documentName), [], label);
}

function assertRejected(documentName, value, label) {
  assert.notEqual(contractErrors(schemaDocuments.get(documentName), value, '$', documentName).length, 0, label);
}

function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'product-schema-contract-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

function createStore(t) {
  const root = temporary(t);
  const outputRoot = path.join(root, 'product');
  persistProductModel({
    proposalPath: new URL('product-model-proposal.json', fixtureRoot),
    sourcePath: new URL('product-description.md', fixtureRoot),
    sourceLabel: 'briefs/field-journal/product-description.md',
    outputRoot,
  });
  return {root, outputRoot, currentPath: path.join(outputRoot, 'current.json')};
}

function artifactProposal(chain) {
  const capability = chain.model.recordIndex.find(record => record.id === 'organize-expeditions');
  assert.ok(capability);
  return {
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
    recordDependencies: [{id: capability.id, materialSha256: capability.materialSha256}],
    artifactDependencies: [],
    producer: {id: 'ux-planner', contractVersion: '1.0', method: 'assessment'},
    resources: [],
    payload: {summary: 'Review observations in an expedition workspace.'},
  };
}

function commitArtifact(root, currentPath, proposal) {
  const proposalPath = path.join(root, 'artifact-proposal.json');
  fs.writeFileSync(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`);
  const chain = loadCurrentProduct(currentPath);
  return commitProductArtifact({
    currentPath,
    baseSnapshotSha256: chain.current.snapshot.sha256,
    proposalPath,
  });
}

test('product model schema accepts the emitted model chain, including external artifact entries', t => {
  const store = createStore(t);
  let chain = loadCurrentProduct(store.currentPath);
  const proposal = artifactProposal(chain);
  assertMatches('product-artifact-schema-1.0.json', proposal, 'artifact proposal');
  commitArtifact(store.root, store.currentPath, proposal);
  chain = loadCurrentProduct(store.currentPath);

  assertMatches('product-model-schema-1.0.json', chain.model, 'product model');
  assertMatches('product-model-schema-1.0.json', chain.snapshot, 'product snapshot');
  assertMatches('product-model-schema-1.0.json', chain.current, 'current pointer');
  assert.deepEqual(validateProductModel(chain.model), chain.model);
  assert.deepEqual(validateProductSnapshot(chain.snapshot), chain.snapshot);
  assert.deepEqual(validateCurrentPointer(chain.current), chain.current);

  const [loaded] = loadSnapshotArtifacts(chain.root, chain.snapshot.artifacts);
  assertMatches('product-artifact-schema-1.0.json', loaded.artifact, 'persisted artifact');
  assertMatches('product-artifact-schema-1.0.json', loaded.entry, 'artifact snapshot entry');
  assert.deepEqual(validateProductArtifact(loaded.artifact), loaded.artifact);
});

test('product context schema accepts a self-contained context with a current artifact', t => {
  const store = createStore(t);
  const chain = loadCurrentProduct(store.currentPath);
  commitArtifact(store.root, store.currentPath, artifactProposal(chain));
  const {context} = resolveProductContext({currentPath: store.currentPath});

  assertMatches('product-context-schema-1.0.json', context, 'PRD product context');
  assert.deepEqual(validateProductContext(context), context);
  assert.equal(context.materialSha256, calculateProductContextMaterialSha256(context));
  assert.deepEqual(context.artifacts.map(artifact => artifact.id), ['expedition-ux']);
});

test('machine schemas and imperative validators reject representative structural drift', t => {
  const store = createStore(t);
  let chain = loadCurrentProduct(store.currentPath);
  commitArtifact(store.root, store.currentPath, artifactProposal(chain));
  chain = loadCurrentProduct(store.currentPath);
  const [loaded] = loadSnapshotArtifacts(chain.root, chain.snapshot.artifacts);
  const {context} = resolveProductContext({currentPath: store.currentPath});

  const modelDrift = structuredClone(chain.model);
  modelDrift.unexpected = true;
  assertRejected('product-model-schema-1.0.json', modelDrift, 'model unknown field');
  assert.throws(() => validateProductModel(modelDrift), /unsupported field unexpected/u);

  const priorStatusDrift = structuredClone(chain.model);
  priorStatusDrift.changeSet.records[0].previousStatus = 'invented';
  assertRejected('product-model-schema-1.0.json', priorStatusDrift, 'record change previous status enum');
  assert.throws(() => validateProductModel(priorStatusDrift), /previousStatus has unsupported value invented/u);

  const snapshotDrift = structuredClone(chain.snapshot);
  snapshotDrift.productModel.revision = 0;
  assertRejected('product-model-schema-1.0.json', snapshotDrift, 'snapshot invalid revision');
  assert.throws(() => validateProductSnapshot(snapshotDrift));

  const artifactDrift = structuredClone(loaded.artifact);
  delete artifactDrift.producer;
  assertRejected('product-artifact-schema-1.0.json', artifactDrift, 'artifact missing producer');
  assert.throws(() => validateProductArtifact(artifactDrift));

  const artifactHistoryDrift = structuredClone(loaded.artifact);
  artifactHistoryDrift.revision = 2;
  assertRejected('product-artifact-schema-1.0.json', artifactHistoryDrift, 'added artifact at revision 2');
  assert.throws(() => validateProductArtifact(artifactHistoryDrift), /added is valid only for revision 1/u);

  const snapshotHistoryDrift = structuredClone(loaded.entry);
  snapshotHistoryDrift.revision = 2;
  snapshotHistoryDrift.content.path = snapshotHistoryDrift.content.path.replace('/1-', '/2-');
  assertRejected('product-artifact-schema-1.0.json', snapshotHistoryDrift, 'added snapshot entry at revision 2');

  const contextDrift = structuredClone(context);
  contextDrift.consumer = 'ui';
  assertRejected('product-context-schema-1.0.json', contextDrift, 'context wrong consumer');
  assert.throws(() => validateProductContext(contextDrift));

  const contextHistoryDrift = structuredClone(context);
  contextHistoryDrift.artifacts[0].revision = 2;
  assertRejected('product-context-schema-1.0.json', contextHistoryDrift, 'context added artifact at revision 2');
  assert.throws(() => validateProductContext(contextHistoryDrift), /added is valid only for revision 1/u);

  const contextBindingDrift = structuredClone(context);
  contextBindingDrift.artifacts[0].recordDependencies = [];
  assert.throws(
    () => validateProductContext(contextBindingDrift),
    /lacks an exact record dependency binding/u,
  );
});

test('all schema references resolve within the three versioned contract documents', () => {
  for (const [documentName, document] of schemaDocuments) {
    const visit = value => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== 'object') return;
      if (value.$ref) assert.doesNotThrow(() => resolveReference(value.$ref, documentName), `${documentName}: ${value.$ref}`);
      Object.values(value).forEach(visit);
    };
    visit(document);
  }
});
