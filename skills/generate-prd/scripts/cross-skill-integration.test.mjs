import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { generatePrd } from './generate-prd.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillsRoot = path.resolve(scriptsDirectory, '..', '..');
const installedRefineRoot = path.join(skillsRoot, 'refine-design');
const stagedRefineRoot = path.join(skillsRoot, 'refine-design-full');
const refineRoot = existsSync(installedRefineRoot)
  ? installedRefineRoot
  : stagedRefineRoot;
const productModelModule = path.join(refineRoot, 'scripts', 'product-model.mjs');
const productArtifactStoreModule = path.join(refineRoot, 'scripts', 'product-artifact-store.mjs');
const productContextModule = path.join(refineRoot, 'scripts', 'product-context.mjs');
const fixtureRoot = path.join(
  refineRoot,
  'references',
  'fixtures',
  'product-model',
  'field-journal',
);
const siblingInputs = [
  productModelModule,
  productContextModule,
  path.join(fixtureRoot, 'product-description.md'),
  path.join(fixtureRoot, 'product-model-proposal.json'),
];
const siblingAvailable = siblingInputs.every(existsSync);
const sliceTwoAvailable = siblingAvailable && existsSync(productArtifactStoreModule);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function clone(value) {
  return structuredClone(value);
}

function currentBase(chain) {
  return {
    snapshotSha256: chain.current.snapshot.sha256,
    modelSha256: chain.snapshot.productModel.sha256,
    revision: chain.model.revision,
  };
}

function continuedIdentities(proposal) {
  return proposal.identityClaims.map((claim) => ({
    recordRef: claim.recordRef,
    kind: 'continued',
    previousRef: claim.recordRef,
    supersedesRefs: [],
  }));
}

function recordIndex(chain) {
  return new Map(chain.model.recordIndex.map((record) => [record.id, record]));
}

function artifactEntry(chain, id) {
  const entry = chain.snapshot.artifacts.find((candidate) => candidate.id === id);
  assert.ok(entry, `Expected current snapshot artifact ${id}`);
  return entry;
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function fileMap(root) {
  const result = new Map();
  async function visit(directory, prefix = '') {
    for (const entry of (await readdir(directory, { withFileTypes: true }))
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute, relative);
      } else {
        result.set(relative, await readFile(absolute));
      }
    }
  }
  await visit(root);
  return result;
}

test('publishes twice from a detached immutable context after its product store and source are removed', {
  skip: siblingAvailable
    ? false
    : 'refine-design sibling modules or neutral Field Journal fixture are not installed',
}, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-cross-skill-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const inputs = path.join(root, 'inputs');
  const store = path.join(root, 'product-store');
  const detached = path.join(root, 'detached');
  await mkdir(inputs, { recursive: true });
  await mkdir(detached, { recursive: true });

  const sourcePath = path.join(inputs, 'product-description.md');
  const proposalPath = path.join(inputs, 'product-model-proposal.json');
  await cp(path.join(fixtureRoot, 'product-description.md'), sourcePath);
  await cp(path.join(fixtureRoot, 'product-model-proposal.json'), proposalPath);

  const { persistProductModel } = await import(pathToFileURL(productModelModule).href);
  const { resolveProductContext } = await import(pathToFileURL(productContextModule).href);
  persistProductModel({
    proposalPath,
    sourcePath,
    sourceLabel: 'product-description.md',
    outputRoot: store,
  });
  const resolved = resolveProductContext({
    currentPath: path.join(store, 'current.json'),
  });
  assert.equal(
    resolved.path,
    `contexts/prd/${resolved.materialSha256}/context.json`,
  );

  const immutableContext = path.join(store, ...resolved.path.split('/'));
  const detachedContext = path.join(detached, 'prd-context.json');
  await cp(immutableContext, detachedContext);
  const contextBytes = await readFile(detachedContext);
  const context = JSON.parse(contextBytes.toString('utf8'));

  await rm(store, { recursive: true, force: true });
  await rm(inputs, { recursive: true, force: true });
  assert.equal(existsSync(store), false);
  assert.equal(existsSync(sourcePath), false);

  const outputA = path.join(root, 'published-a');
  const outputB = path.join(root, 'published-b');
  const receiptA = await generatePrd({
    contextPath: detachedContext,
    outputDirectory: outputA,
  });
  const receiptB = await generatePrd({
    contextPath: detachedContext,
    outputDirectory: outputB,
  });

  assert.equal(receiptA.context.id, context.contextId);
  assert.equal(receiptA.context.byteSha256, sha256(contextBytes));
  assert.equal(receiptA.context.materialSha256, context.materialSha256);
  assert.deepEqual(receiptA.sourceSnapshot, context.sourceSnapshot);
  assert.deepEqual(receiptA.productModel, {
    id: context.productModel.id,
    revision: context.productModel.revision,
    sha256: context.productModel.sha256,
  });
  assert.deepEqual(receiptB, receiptA);

  const filesA = await fileMap(outputA);
  const filesB = await fileMap(outputB);
  assert.deepEqual([...filesA.keys()], [
    'assets/product.css',
    'index.html',
    'publication-receipt.json',
  ]);
  for (const [name, bytes] of filesA) {
    assert.equal(bytes.equals(filesB.get(name)), true, `${name} must be byte-identical`);
  }
});

test('preserves unaffected artifacts across living updates and publishes a valid partial snapshot deterministically', {
  skip: sliceTwoAvailable
    ? false
    : 'Slice 2 product-model, artifact-store, context, or neutral Field Journal inputs are not installed',
}, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-living-update-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const inputs = path.join(root, 'inputs');
  const store = path.join(root, 'product-store');
  const detached = path.join(root, 'detached');
  await mkdir(inputs, { recursive: true });
  await mkdir(detached, { recursive: true });

  const sourcePath = path.join(inputs, 'product-description.md');
  const proposalPath = path.join(inputs, 'product-model-proposal.json');
  const observationArtifactPath = path.join(inputs, 'observation-artifact.json');
  const expeditionArtifactPath = path.join(inputs, 'expedition-artifact.json');
  const initialSource = await readFile(path.join(fixtureRoot, 'product-description.md'), 'utf8');
  const initialProposal = JSON.parse(await readFile(
    path.join(fixtureRoot, 'product-model-proposal.json'),
    'utf8',
  ));
  await writeFile(sourcePath, initialSource, 'utf8');
  await writeJson(proposalPath, initialProposal);

  const {
    loadCurrentProduct,
    persistProductModel,
  } = await import(pathToFileURL(productModelModule).href);
  const { commitProductArtifact } = await import(pathToFileURL(productArtifactStoreModule).href);
  const { resolveProductContext } = await import(pathToFileURL(productContextModule).href);
  const currentPath = path.join(store, 'current.json');

  persistProductModel({
    proposalPath,
    sourcePath,
    sourceLabel: 'product-description.md',
    outputRoot: store,
  });
  let chain = loadCurrentProduct(currentPath);
  assert.equal(chain.model.revision, 1);
  assert.equal(chain.model.changeSet.classification, 'initial');
  const initialRecords = recordIndex(chain);

  const artifactProposal = ({ id, capabilityId, summary }) => ({
    schemaVersion: '1.0',
    kind: 'product-artifact-proposal',
    id,
    artifactKind: 'product-experience-plan',
    owner: 'ux',
    artifactSchemaVersion: '1.0',
    status: 'accepted',
    consumerDomains: ['prd', 'ux'],
    scopeRefs: [capabilityId],
    coverageRefs: [capabilityId],
    gapRefs: [],
    lockRefs: [],
    recordDependencies: [{
      id: capabilityId,
      materialSha256: initialRecords.get(capabilityId).materialSha256,
    }],
    artifactDependencies: [],
    producer: {
      id: 'ux-planner',
      contractVersion: '1.0',
      method: 'structured-assessment',
    },
    resources: [],
    payload: { summary },
  });

  await writeJson(observationArtifactPath, artifactProposal({
    id: 'observation-experience',
    capabilityId: 'create-observations',
    summary: 'A focused path for recording one field observation.',
  }));
  const observationCommit = commitProductArtifact({
    currentPath,
    baseSnapshotSha256: chain.current.snapshot.sha256,
    proposalPath: observationArtifactPath,
  });
  chain = loadCurrentProduct(currentPath);
  assert.equal(observationCommit.artifact.created, true);

  await writeJson(expeditionArtifactPath, artifactProposal({
    id: 'expedition-experience',
    capabilityId: 'organize-expeditions',
    summary: 'A focused path for reviewing observations by expedition.',
  }));
  const expeditionCommit = commitProductArtifact({
    currentPath,
    baseSnapshotSha256: chain.current.snapshot.sha256,
    proposalPath: expeditionArtifactPath,
  });
  chain = loadCurrentProduct(currentPath);
  assert.equal(expeditionCommit.artifact.created, true);

  const observationBefore = artifactEntry(chain, 'observation-experience');
  const expeditionBefore = artifactEntry(chain, 'expedition-experience');
  const observationBytes = await readFile(path.join(store, ...observationBefore.content.path.split('/')));
  const expeditionBytes = await readFile(path.join(store, ...expeditionBefore.content.path.split('/')));
  assert.equal(observationBefore.dependencyState.status, 'current');
  assert.equal(expeditionBefore.dependencyState.status, 'current');

  const sourceOnlySource = initialSource.replace(
    'Field Journal helps field researchers preserve observations while they are working away from a desk.',
    'Field Journal supports field researchers in preserving observations while they work away from a desk.',
  );
  assert.notEqual(sourceOnlySource, initialSource);
  const sourceOnlyProposal = clone(initialProposal);
  sourceOnlyProposal.base = currentBase(chain);
  sourceOnlyProposal.identityClaims = continuedIdentities(sourceOnlyProposal);
  sourceOnlyProposal.sourceClaimLineage = [];
  await writeFile(sourcePath, sourceOnlySource, 'utf8');
  await writeJson(proposalPath, sourceOnlyProposal);

  persistProductModel({
    proposalPath,
    sourcePath,
    sourceLabel: 'product-description.md',
    outputRoot: store,
  });
  chain = loadCurrentProduct(currentPath);
  assert.equal(chain.model.revision, 2);
  assert.equal(chain.model.changeSet.classification, 'source-only');
  assert.ok(chain.model.changeSet.records.every((record) => record.classification === 'unchanged'));
  const sourceOnlyRecords = recordIndex(chain);
  assert.deepEqual([...sourceOnlyRecords.keys()], [...initialRecords.keys()]);
  for (const [id, initial] of initialRecords) {
    assert.equal(sourceOnlyRecords.get(id).materialSha256, initial.materialSha256, `${id} must retain material identity`);
  }

  const observationAfterSourceOnly = artifactEntry(chain, 'observation-experience');
  const expeditionAfterSourceOnly = artifactEntry(chain, 'expedition-experience');
  assert.deepEqual(observationAfterSourceOnly, observationBefore);
  assert.deepEqual(expeditionAfterSourceOnly, expeditionBefore);
  assert.equal(
    (await readFile(path.join(store, ...observationAfterSourceOnly.content.path.split('/')))).equals(observationBytes),
    true,
  );
  assert.equal(
    (await readFile(path.join(store, ...expeditionAfterSourceOnly.content.path.split('/')))).equals(expeditionBytes),
    true,
  );

  const materialSource = sourceOnlySource
    .replace(
      'Researchers can create dated observations with a title and notes.',
      'Researchers can create dated observations with a title, notes, and optional coordinates.',
    )
    .replace(
      'It is not yet decided whether an expedition can be shared with another researcher.',
      'It is not yet decided whether an expedition can be shared with another researcher.\nIt is not yet decided whether coordinates should be captured automatically.',
    );
  assert.notEqual(materialSource, sourceOnlySource);
  const materialProposal = clone(sourceOnlyProposal);
  materialProposal.base = currentBase(chain);
  const observationCapability = materialProposal.capabilities.find(
    (capability) => capability.id === 'create-observations',
  );
  observationCapability.description = 'Create a dated observation with a title, notes, and optional coordinates.';
  materialProposal.gaps.push({
    id: 'observation-location-policy',
    kind: 'open-question',
    question: 'Should coordinates be captured automatically for a new observation?',
    impact: 'The answer changes how location information enters an observation.',
    status: 'unresolved',
    owner: 'product',
    consumerDomains: [
      'prd',
      'ux',
      'system-architecture',
      'technical-documentation',
      'implementation-planning',
    ],
    capabilityRefs: ['create-observations'],
    provenance: { sourceClaimRefs: ['claim-observation-location-policy'] },
  });
  materialProposal.sourceClaims.find(
    (claim) => claim.id === 'claim-create-observations',
  ).summary = 'The source requires dated observations with titles, notes, and optional coordinates.';
  materialProposal.sourceClaims.push({
    id: 'claim-observation-location-policy',
    startLine: 12,
    endLine: 12,
    summary: 'The source leaves automatic coordinate capture unresolved.',
    disposition: 'unresolved',
    recordRefs: ['observation-location-policy'],
  });
  materialProposal.identityClaims.push({
    recordRef: 'observation-location-policy',
    kind: 'new',
    previousRef: null,
    supersedesRefs: [],
  });
  materialProposal.sourceClaimLineage = [];
  await writeFile(sourcePath, materialSource, 'utf8');
  await writeJson(proposalPath, materialProposal);

  persistProductModel({
    proposalPath,
    sourcePath,
    sourceLabel: 'product-description.md',
    outputRoot: store,
  });
  chain = loadCurrentProduct(currentPath);
  assert.equal(chain.model.revision, 3);
  assert.equal(chain.model.status, 'partial');
  assert.equal(chain.model.changeSet.classification, 'material');
  const materialChanges = new Map(chain.model.changeSet.records.map((record) => [record.id, record]));
  assert.equal(materialChanges.get('create-observations').classification, 'changed');
  assert.equal(materialChanges.get('observation-location-policy').classification, 'introduced');
  assert.equal(materialChanges.get('organize-expeditions').classification, 'unchanged');
  assert.equal(chain.model.sourceClaims.at(-1).id, 'claim-observation-location-policy');

  const observationAfterMaterial = artifactEntry(chain, 'observation-experience');
  const expeditionAfterMaterial = artifactEntry(chain, 'expedition-experience');
  assert.equal(observationAfterMaterial.dependencyState.status, 'stale');
  assert.deepEqual(observationAfterMaterial.dependencyState.reasons, [
    'record:create-observations:material-changed',
  ]);
  assert.equal(expeditionAfterMaterial.dependencyState.status, 'current');
  assert.deepEqual(observationAfterMaterial.content, observationBefore.content);
  assert.deepEqual(expeditionAfterMaterial, expeditionBefore);
  assert.equal(
    (await readFile(path.join(store, ...observationAfterMaterial.content.path.split('/')))).equals(observationBytes),
    true,
  );
  assert.equal(
    (await readFile(path.join(store, ...expeditionAfterMaterial.content.path.split('/')))).equals(expeditionBytes),
    true,
  );

  const resolved = resolveProductContext({ currentPath });
  assert.equal(resolved.context.productModel.revision, 3);
  assert.equal(resolved.context.productModel.status, 'partial');
  assert.equal(resolved.context.product.status, 'partial');
  assert.equal(
    resolved.context.capabilities.find((capability) => capability.id === 'create-observations').description,
    'Create a dated observation with a title, notes, and optional coordinates.',
  );
  assert.ok(resolved.context.gaps.some((gap) => gap.id === 'observation-location-policy'));
  assert.deepEqual(resolved.context.artifacts.map((artifact) => artifact.id), ['expedition-experience']);
  assert.deepEqual(resolved.context.exclusions, [{
    id: 'observation-experience',
    artifactKind: 'product-experience-plan',
    revision: 1,
    status: 'accepted',
    outcome: 'stale',
    materialSha256: observationBefore.content.materialSha256,
    reasons: ['record:create-observations:material-changed'],
  }]);

  const immutableContext = path.join(store, ...resolved.path.split('/'));
  const detachedContext = path.join(detached, 'prd-context.json');
  await cp(immutableContext, detachedContext);
  const contextBytes = await readFile(detachedContext);
  const context = JSON.parse(contextBytes.toString('utf8'));
  await rm(store, { recursive: true, force: true });
  await rm(inputs, { recursive: true, force: true });

  const outputA = path.join(root, 'published-a');
  const outputB = path.join(root, 'published-b');
  const receiptA = await generatePrd({ contextPath: detachedContext, outputDirectory: outputA });
  const receiptB = await generatePrd({ contextPath: detachedContext, outputDirectory: outputB });
  assert.deepEqual(receiptB, receiptA);
  assert.equal(receiptA.context.id, context.contextId);
  assert.equal(receiptA.context.byteSha256, sha256(contextBytes));
  assert.deepEqual(receiptA.sourceSnapshot, context.sourceSnapshot);
  assert.equal(receiptA.productModel.revision, 3);

  const filesA = await fileMap(outputA);
  const filesB = await fileMap(outputB);
  for (const [name, bytes] of filesA) {
    assert.equal(bytes.equals(filesB.get(name)), true, `${name} must be byte-identical`);
  }
  const html = filesA.get('index.html').toString('utf8');
  assert.match(html, /optional coordinates/u);
  assert.match(html, /Should coordinates be captured automatically/u);
  assert.match(html, /observation-experience/u);
  assert.match(html, /stale/u);
  assert.match(html, /Product model: field-journal revision 3 \(partial\)/u);
});
