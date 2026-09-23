import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  loadCurrentProduct,
  persistProductModel,
  PRODUCT_MODEL_MAX_INPUT_BYTES,
  PRODUCT_MODEL_MAX_SOURCE_LINES,
  validateCurrentPointer,
  validateProductModel,
  validateProductSnapshot,
} from './product-model.mjs';

const fixtureRoot = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);
const fixtureProposal = () => JSON.parse(fs.readFileSync(new URL('product-model-proposal.json', fixtureRoot), 'utf8'));
const fixtureSource = () => fs.readFileSync(new URL('product-description.md', fixtureRoot));

function temporary(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

function inputs(root, proposal = fixtureProposal(), source = fixtureSource()) {
  const proposalPath = path.join(root, 'proposal.json');
  const sourcePath = path.join(root, 'product-description.md');
  fs.writeFileSync(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`);
  fs.writeFileSync(sourcePath, source);
  return {proposalPath, sourcePath};
}

function persist(root, proposal = fixtureProposal(), source = fixtureSource(), sourceLabel = 'briefs/field-journal/product-description.md') {
  const paths = inputs(root, proposal, source);
  const outputRoot = path.join(root, 'product');
  const result = persistProductModel({...paths, sourceLabel, outputRoot});
  return {result, outputRoot, chain: loadCurrentProduct(path.join(outputRoot, 'current.json')), paths};
}

test('source claims partition exact source lines and remain bidirectionally bound to records', t => {
  const root = temporary(t, 'product-established-claims-');
  const missingLine = fixtureProposal();
  missingLine.sourceClaims.at(-1).startLine = 10;
  assert.throws(() => persist(root, missingLine), /partition every source line exactly once/u);

  const oneWay = fixtureProposal();
  oneWay.capabilities[0].provenance.sourceClaimRefs = ['claim-users'];
  assert.throws(() => persist(root, oneWay), /must reference each other/u);
  assert.equal(fs.existsSync(path.join(root, 'product', 'current.json')), false);
});

test('persisted claims retain disposition cardinality rules', t => {
  const root = temporary(t, 'product-established-cardinality-');
  const {chain} = persist(root);
  const missingRefs = structuredClone(chain.model);
  missingRefs.sourceClaims[0].recordRefs = [];
  assert.throws(() => validateProductModel(missingRefs), /must not be empty for disposition incorporated/u);

  const classified = structuredClone(chain.model);
  classified.sourceClaims[0].disposition = 'unclassified';
  assert.throws(() => validateProductModel(classified), /must be empty for an unclassified claim/u);
});

test('persisted paths and source identity remain bound to their content roles', t => {
  const root = temporary(t, 'product-established-role-paths-');
  const {chain} = persist(root);

  const badSource = structuredClone(chain.model);
  badSource.source.id = 'alternate-source';
  assert.throws(() => validateProductModel(badSource), /must be product-description/u);

  const badSourcePath = structuredClone(chain.model);
  badSourcePath.source.path = `sources/${'0'.repeat(64)}/product-description.md`;
  assert.throws(() => validateProductModel(badSourcePath), /content-addressed by its source SHA-256/u);

  const badModelPath = structuredClone(chain.snapshot);
  badModelPath.productModel.path = `models/1-${'0'.repeat(64)}/product-model.json`;
  assert.throws(() => validateProductSnapshot(badModelPath), /content-addressed by its revision and SHA-256/u);

  const badSnapshotPath = structuredClone(chain.current);
  badSnapshotPath.snapshot.path = `snapshots/${'0'.repeat(64)}/product-snapshot.json`;
  assert.throws(() => validateCurrentPointer(badSnapshotPath), /content-addressed by its SHA-256/u);
});

test('contract objects are closed and source labels are portable relative paths', t => {
  const root = temporary(t, 'product-established-closed-');
  const extra = fixtureProposal();
  extra.productSpecificShortcut = true;
  assert.throws(() => persist(root, extra), /unsupported field productSpecificShortcut/u);
  assert.throws(() => persist(root, fixtureProposal(), fixtureSource(), '../outside.md'), /safe relative path segments|portable relative label/u);
  assert.throws(() => persist(root, fixtureProposal(), fixtureSource(), 'C:/outside.md'), /safe relative path segments|portable relative label/u);
  assert.equal(fs.existsSync(path.join(root, 'product', 'current.json')), false);
});

test('source capture preserves CRLF bytes and binds claim ranges to those exact bytes', t => {
  const root = temporary(t, 'product-established-crlf-');
  const crlf = Buffer.from(fixtureSource().toString('utf8').replaceAll('\n', '\r\n'));
  const {chain} = persist(root, fixtureProposal(), crlf);
  assert.deepEqual(chain.sourceBytes, crlf);
  assert.equal(chain.model.source.byteLength, crlf.length);
  assert.equal(chain.model.sourceClaims.at(-1).sourceRange.endByteExclusive, crlf.length);
});

test('proposal and source reads reject bytes beyond the documented bound before parsing or decoding', t => {
  const root = temporary(t, 'product-established-input-bounds-');
  const outputRoot = path.join(root, 'product');
  const sourcePath = path.join(root, 'product-description.md');
  const proposalPath = path.join(root, 'proposal.json');
  fs.writeFileSync(sourcePath, fixtureSource());
  fs.writeFileSync(proposalPath, Buffer.alloc(PRODUCT_MODEL_MAX_INPUT_BYTES + 1, 0x7b));
  assert.throws(
    () => persistProductModel({proposalPath, sourcePath, sourceLabel: 'product-description.md', outputRoot}),
    /proposal exceeds the 4194304-byte limit/u,
  );

  fs.writeFileSync(proposalPath, `${JSON.stringify(fixtureProposal())}\n`);
  fs.writeFileSync(sourcePath, Buffer.alloc(PRODUCT_MODEL_MAX_INPUT_BYTES + 1, 0xff));
  assert.throws(
    () => persistProductModel({proposalPath, sourcePath, sourceLabel: 'product-description.md', outputRoot}),
    /product description exceeds the 4194304-byte limit/u,
  );
  assert.equal(fs.existsSync(path.join(outputRoot, 'current.json')), false);
});

test('source descriptions reject more than the documented line bound', t => {
  const root = temporary(t, 'product-established-line-bound-');
  const source = Buffer.from('x\n'.repeat(PRODUCT_MODEL_MAX_SOURCE_LINES + 1));
  assert.throws(() => persist(root, fixtureProposal(), source), /exceeds the 100000-line limit/u);
  assert.equal(fs.existsSync(path.join(root, 'product', 'current.json')), false);
});

test('a malformed update preserves the exact current pointer and revision', t => {
  const root = temporary(t, 'product-established-invalid-atomic-');
  const initial = persist(root);
  const currentPath = path.join(initial.outputRoot, 'current.json');
  const before = fs.readFileSync(currentPath);
  fs.writeFileSync(initial.paths.proposalPath, '{"schemaVersion":"1.0",');

  assert.throws(
    () => persistProductModel({
      ...initial.paths,
      sourceLabel: 'briefs/field-journal/product-description.md',
      outputRoot: initial.outputRoot,
    }),
    /valid JSON/u,
  );
  assert.deepEqual(fs.readFileSync(currentPath), before);
  assert.equal(loadCurrentProduct(currentPath).model.revision, 1);
});

test('a linked product root is rejected', {skip: process.platform !== 'win32'}, t => {
  const root = temporary(t, 'product-established-link-');
  const actual = path.join(root, 'actual');
  fs.mkdirSync(actual);
  const linked = path.join(root, 'linked');
  fs.symlinkSync(actual, linked, 'junction');
  const paths = inputs(root);
  assert.throws(
    () => persistProductModel({...paths, sourceLabel: 'product-description.md', outputRoot: linked}),
    /linked product artifact root/u,
  );
});

test('a junction in an existing output-root ancestor is rejected', {skip: process.platform !== 'win32'}, t => {
  const root = temporary(t, 'product-established-ancestor-link-');
  const actual = path.join(root, 'actual');
  fs.mkdirSync(actual);
  const linkedAncestor = path.join(root, 'linked-ancestor');
  fs.symlinkSync(actual, linkedAncestor, 'junction');
  const outputRoot = path.join(linkedAncestor, 'nested-product');
  const paths = inputs(root);
  assert.throws(
    () => persistProductModel({...paths, sourceLabel: 'product-description.md', outputRoot}),
    /linked product artifact root/u,
  );
  assert.equal(fs.existsSync(outputRoot), false);
});
