import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {applyProposal} from './design-language.mjs';
import {validateReviewConfig} from './design-language-review-pages.mjs';
import {validateProductContext} from './product-context.mjs';
import {persistProductModel} from './product-model.mjs';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const currentDesignFixture = path.join(skillRoot, 'references', 'extras-proposal.json');
const layoutDefaultsFixture = path.join(skillRoot, 'references', 'layout-defaults.json');
const productFixtureRoot = path.join(skillRoot, 'references', 'fixtures', 'product-model', 'field-journal');

function temporary(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

function currentDesign() {
  return JSON.parse(fs.readFileSync(currentDesignFixture, 'utf8'));
}

function currentReviewLayout() {
  return {
    version: 7,
    title: 'Greenfield review',
    visualDirection: null,
    layoutNotes: null,
    spacing: {
      scale: [4, 8, 12, 16, 24],
      groupGap: 8,
      regionPadding: 16,
      regionGap: 24,
      status: 'defaulted',
      fieldGap: 16,
      helperGap: 4,
      helperLineHeight: 20,
    },
    layout: JSON.parse(fs.readFileSync(layoutDefaultsFixture, 'utf8')),
  };
}

test('design-language rejects earlier and later schemas before writing', t => {
  const historical = Array.from({length: 13}, (_, index) => `0.${index + 1}`);
  for (const schemaVersion of [...historical, '0.15']) {
    const output = temporary(t, `greenfield-design-${schemaVersion.replace('.', '-')}-`);
    const proposal = currentDesign();
    proposal.schemaVersion = schemaVersion;
    assert.throws(
      () => applyProposal(output, proposal),
      /Unsupported design-language schemaVersion; expected 0\.14/u,
    );
    assert.deepEqual(fs.readdirSync(output), []);
  }
});

test('review-layout rejects earlier and later versions before writing', t => {
  for (const version of [1, 2, 3, 4, 5, 6, 8]) {
    const output = temporary(t, `greenfield-review-layout-${version}-`);
    const reviewLayout = currentReviewLayout();
    reviewLayout.version = version;
    assert.throws(
      () => validateReviewConfig(reviewLayout),
      /Unsupported review layout version; expected 7/u,
    );
    assert.throws(
      () => applyProposal(output, currentDesign(), {reviewLayout}),
      /Unsupported review layout version; expected 7/u,
    );
    assert.deepEqual(fs.readdirSync(output), []);
  }
});

test('product-model rejects earlier and later schemas before creating its store', t => {
  for (const schemaVersion of ['0.9', '1.1']) {
    const root = temporary(t, `greenfield-model-${schemaVersion.replace('.', '-')}-`);
    const proposal = JSON.parse(fs.readFileSync(path.join(productFixtureRoot, 'product-model-proposal.json'), 'utf8'));
    proposal.schemaVersion = schemaVersion;
    const proposalPath = path.join(root, 'proposal.json');
    fs.writeFileSync(proposalPath, `${JSON.stringify(proposal)}\n`);
    const outputRoot = path.join(root, 'product');
    assert.throws(
      () => persistProductModel({
        proposalPath,
        sourcePath: path.join(productFixtureRoot, 'product-description.md'),
        sourceLabel: 'product-description.md',
        outputRoot,
      }),
      /schema(?:Version| 1\.0)/u,
    );
    assert.equal(fs.existsSync(outputRoot), false);
  }
});

test('product-context rejects earlier and later schemas without mutating input', () => {
  const sample = {
    schemaVersion: '1.0',
    contextId: 'prd-context-000000000000',
    consumer: 'prd',
    sourceSnapshot: {id: 'sample-r1', sha256: '0'.repeat(64)},
    productModel: {id: 'sample', revision: 1, status: 'accepted', sha256: '1'.repeat(64)},
    scopeRefs: [],
    product: {id: 'sample', name: 'Sample', purpose: 'Demonstrate validation.', users: []},
    capabilities: [],
    gaps: [],
    provenance: {sourceId: 'product-description', sourceSha256: '2'.repeat(64)},
    materialSha256: '3'.repeat(64),
  };
  for (const schemaVersion of ['0.9', '1.1']) {
    const candidate = {...sample, schemaVersion};
    const before = structuredClone(candidate);
    assert.throws(() => validateProductContext(candidate), /schemaVersion/u);
    assert.deepEqual(candidate, before);
  }
});

test('package exposes named test tiers without wildcard expansion', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(skillRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts.test, 'npm run test:fast');
  for (const tier of ['test:fast', 'test:design', 'test:renderer', 'test:design:full', 'test:full']) {
    assert.equal(typeof packageJson.scripts[tier], 'string', `${tier} must be a named test tier`);
  }
  for (const command of Object.values(packageJson.scripts)) {
    assert.doesNotMatch(command, /\*\.test\.mjs|scripts\/\*/u);
  }
});
