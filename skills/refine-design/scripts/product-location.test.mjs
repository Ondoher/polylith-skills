import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {resolveProductLocation} from './product-location.mjs';
import {persistProductModel, loadCurrentProduct} from './product-model.mjs';
import {resolveProductContext} from './product-context.mjs';

function repository(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'product-location-')));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, '.git'));
  return root;
}

test('location preserves the confirmed name beneath the repository root without creating data', t => {
  const root = repository(t);
  const location = resolveProductLocation({repositoryRoot: root, productName: 'Field Journal'});
  assert.equal(location.productRoot, path.join(root, 'product', 'Field Journal'));
  assert.equal(location.currentPath, path.join(location.productRoot, 'current.json'));
  assert.equal(location.publicationRoot, path.join(location.productRoot, 'prd'));
  assert.equal(fs.existsSync(path.join(root, 'product')), false);
  fs.mkdirSync(path.join(root, 'documentation'));
  assert.throws(() => resolveProductLocation({repositoryRoot: path.join(root, 'documentation'), productName: 'Field Journal'}), /repository root/);
});

test('missing and unsafe names require clarification rather than a guessed path', t => {
  const root = repository(t);
  for (const productName of [undefined, '', ' ', '../other', 'a/b', 'a\\b', 'C:other', 'CON', 'nul.txt', 'name.', ' name', 'name ', 'a'.repeat(101)]) {
    assert.throws(() => resolveProductLocation({repositoryRoot: root, productName}), /Ask the owner/);
  }
  assert.equal(fs.existsSync(path.join(root, 'product')), false);
});

test('location rejects file, case-only, and linked directory collisions', t => {
  const root = repository(t);
  const product = path.join(root, 'product');
  fs.writeFileSync(product, 'owned file');
  assert.throws(() => resolveProductLocation({repositoryRoot: root, productName: 'Journal'}), /ordinary directories/);
  fs.unlinkSync(product);
  fs.mkdirSync(product);
  fs.mkdirSync(path.join(product, 'journal'));
  assert.throws(() => resolveProductLocation({repositoryRoot: root, productName: 'Journal'}), /collides/);
  const outside = path.join(root, 'elsewhere');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(product, 'Linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => resolveProductLocation({repositoryRoot: root, productName: 'Linked'}), /ordinary directories/);
});

test('model and detached context persist under the resolved named product while the human source stays in place', t => {
  const root = repository(t);
  const fixture = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);
  fs.mkdirSync(path.join(root, 'briefs'));
  const source = path.join(root, 'briefs', 'product-description.md');
  const bytes = fs.readFileSync(new URL('product-description.md', fixture));
  fs.writeFileSync(source, bytes);
  const proposal = path.join(root, 'proposal.json');
  fs.copyFileSync(new URL('product-model-proposal.json', fixture), proposal);
  const location = resolveProductLocation({repositoryRoot: root, productName: 'Field Journal'});
  persistProductModel({proposalPath: proposal, sourcePath: source, sourceLabel: 'briefs/product-description.md', outputRoot: location.productRoot});
  const chain = loadCurrentProduct(location.currentPath);
  assert.equal(chain.model.name, 'Field Journal');
  const context = resolveProductContext({currentPath: location.currentPath});
  assert.equal(fs.existsSync(path.join(location.productRoot, context.path)), true);
  assert.deepEqual(fs.readFileSync(source), bytes);
  assert.equal(fs.existsSync(path.join(root, 'briefs', 'current.json')), false);
});
