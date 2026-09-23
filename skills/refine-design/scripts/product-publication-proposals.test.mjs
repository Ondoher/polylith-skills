import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {createPublicationArtifactProposal} from './product-publication-proposals.mjs';
import {persistProductModel, loadCurrentProduct} from './product-model.mjs';
import {commitProductArtifact} from './product-artifact-store.mjs';
import {resolveProductContext} from './product-context.mjs';
import {decodePublicationDocument} from './product-publication-payload.mjs';
import {publishArtifactResourceFiles, verifyArtifactResourceFiles} from './product-publication-package.mjs';
import {sha256} from './product-artifact-utils.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';
import {createDefaultReviewConfig} from './design-language-review-pages.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'publication-proposals-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const store = path.join(root, 'product');
  const productFixture = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);
  persistProductModel({proposalPath: new URL('product-model-proposal.json', productFixture), sourcePath: new URL('product-description.md', productFixture), sourceLabel: 'brief/product-description.md', outputRoot: store});
  const design = JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json', import.meta.url)));
  delete design.baseRevision;
  Object.assign(design, {id: 'example-design', revision: 1, decisions: []});
  design.theme.id = 'example-theme';
  const sources = {ux: createUxTestSpec(), designLanguage: design, reviewLayout: createDefaultReviewConfig(), ui: JSON.parse(fs.readFileSync(new URL('../references/ui-composition-proposal.json', import.meta.url))), component: JSON.parse(fs.readFileSync(new URL('../references/component-design-proposal.json', import.meta.url)))};
  for (const [name, document] of Object.entries(sources)) fs.writeFileSync(path.join(root, `${name}.json`), JSON.stringify(document));
  return {root, assetRoot: root, store, currentPath: path.join(store, 'current.json')};
}

function request(id, artifactKind, overrides = {}) {
  return {id, artifactKind, status: 'accepted', scopeRefs: ['organize-expeditions'], coverageRefs: ['organize-expeditions'], gapRefs: [], lockRefs: [], artifactDependencyIds: [], encoding: 'gzip-base64', sources: {}, publication: null, ...overrides};
}

function commit(environment, request_) {
  const result = createPublicationArtifactProposal({...environment, sourceRoot: environment.root, request: request_});
  const file = path.join(environment.root, `${request_.id}.proposal.json`);
  fs.writeFileSync(file, JSON.stringify(result.proposal));
  publishArtifactResourceFiles(result.files, {outputRoot: environment.root});
  commitProductArtifact({currentPath: environment.currentPath, baseSnapshotSha256: result.baseSnapshotSha256, proposalPath: file, resourceRoot: environment.root});
  return result.proposal;
}

test('produces validated UX, design-language, UI, repeatable component and explicit manifest proposals', t => {
  const environment = fixture(t);
  commit(environment, request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}}));
  commit(environment, request('publication-foundations', 'design-language', {sources: {designLanguage: 'designLanguage.json', reviewLayout: 'reviewLayout.json'}}));
  const sources = {ux: 'ux.json', designLanguage: 'designLanguage.json', ui: 'ui.json'};
  commit(environment, request('publication-ui', 'ui-composition', {sources, artifactDependencyIds: ['publication-ux', 'publication-foundations']}));
  commit(environment, request('publication-component', 'component-design', {sources: {...sources, component: 'component.json'}, artifactDependencyIds: ['publication-ux', 'publication-foundations', 'publication-ui']}));
  const publication = {schemaVersion: '1.0', uxArtifactId: 'publication-ux', designLanguageArtifactId: 'publication-foundations', uiArtifactId: 'publication-ui', componentArtifactIds: ['publication-component']};
  const manifest = commit(environment, request('publication-manifest', 'prd-publication', {encoding: 'json', publication, artifactDependencyIds: ['publication-ux', 'publication-foundations', 'publication-ui', 'publication-component']}));
  assert.deepEqual(decodePublicationDocument(manifest.payload).document, publication);
  assert.deepEqual(manifest.resources, []);
  const context = resolveProductContext({currentPath: environment.currentPath});
  assert.equal(context.path, `contexts/prd/${context.materialSha256}/context.json`);
  assert.equal(context.context.artifacts.length, 5);
  assert.equal(loadCurrentProduct(environment.currentPath).snapshot.artifacts.length, 5);
});

test('detached context packages retain only verified declared resources after the store is removed', t => {
  const environment = fixture(t);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  fs.mkdirSync(path.join(environment.root, 'images'));
  fs.writeFileSync(path.join(environment.root, 'images/pixel.png'), png);
  fs.writeFileSync(path.join(environment.root, 'images/unrelated.png'), png);
  const uiPath = path.join(environment.root, 'ui.json');
  const ui = JSON.parse(fs.readFileSync(uiPath));
  ui.assets.push({id: 'sample', kind: 'image', status: 'accepted', path: 'images/pixel.png', mimeType: 'image/png', widthPx: 1, heightPx: 1, sha256: sha256(png)});
  fs.writeFileSync(uiPath, JSON.stringify(ui));
  commit(environment, request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}}));
  commit(environment, request('publication-foundations', 'design-language', {sources: {designLanguage: 'designLanguage.json', reviewLayout: 'reviewLayout.json'}}));
  commit(environment, request('publication-ui', 'ui-composition', {sources: {ux: 'ux.json', designLanguage: 'designLanguage.json', ui: 'ui.json'}, artifactDependencyIds: ['publication-ux', 'publication-foundations']}));
  const result = resolveProductContext({currentPath: environment.currentPath});
  const detached = path.join(environment.root, 'detached');
  fs.cpSync(path.dirname(path.join(environment.store, result.path)), detached, {recursive: true});
  const before = fs.readFileSync(path.join(detached, 'context.json'));
  const replay = resolveProductContext({currentPath: environment.currentPath});
  assert.equal(replay.created, false);
  assert.deepEqual(fs.readFileSync(path.join(environment.store, result.path)), before);
  fs.rmSync(environment.store, {recursive: true});
  const context = JSON.parse(before);
  const resources = context.artifacts.find(artifact => artifact.id === 'publication-ui').resources;
  assert.deepEqual(verifyArtifactResourceFiles(resources, {resourceRoot: detached})[0].bytes, png);
  assert.deepEqual(fs.readdirSync(path.join(detached, 'artifact-resources')), [`${sha256(png)}.png`]);
  assert.equal(before.includes(Buffer.from(environment.root)), false);
});

test('producer rejects noncurrent design versions and mismatched dependency documents before proposals', t => {
  const environment = fixture(t);
  const uxFile = path.join(environment.root, 'ux.json');
  const ux = JSON.parse(fs.readFileSync(uxFile));
  for (const schemaVersion of ['0.1', '0.3']) {
    fs.writeFileSync(uxFile, JSON.stringify({...ux, schemaVersion}));
    assert.throws(() => createPublicationArtifactProposal({...environment, sourceRoot: environment.root, request: request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}})}), /schema.*version/i);
  }
  fs.writeFileSync(uxFile, JSON.stringify(ux));
  commit(environment, request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}}));
  commit(environment, request('publication-foundations', 'design-language', {sources: {designLanguage: 'designLanguage.json', reviewLayout: 'reviewLayout.json'}}));
  ux.title = 'A different current source';
  fs.writeFileSync(uxFile, JSON.stringify(ux));
  assert.throws(() => createPublicationArtifactProposal({...environment, sourceRoot: environment.root, request: request('publication-ui', 'ui-composition', {sources: {ux: 'ux.json', designLanguage: 'designLanguage.json', ui: 'ui.json'}, artifactDependencyIds: ['publication-ux', 'publication-foundations']})}), /differs from its exact artifact dependency/);
});

test('resource failures preserve the current pointer and prevent context publication', t => {
  const environment = fixture(t);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  fs.writeFileSync(path.join(environment.root, 'pixel.png'), png);
  const uiFile = path.join(environment.root, 'ui.json');
  const ui = JSON.parse(fs.readFileSync(uiFile));
  ui.assets.push({id: 'sample', kind: 'image', status: 'accepted', path: 'pixel.png', mimeType: 'image/png', widthPx: 1, heightPx: 1, sha256: sha256(png)});
  fs.writeFileSync(uiFile, JSON.stringify(ui));
  commit(environment, request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}}));
  commit(environment, request('publication-foundations', 'design-language', {sources: {designLanguage: 'designLanguage.json', reviewLayout: 'reviewLayout.json'}}));
  const result = createPublicationArtifactProposal({...environment, sourceRoot: environment.root, request: request('publication-ui', 'ui-composition', {sources: {ux: 'ux.json', designLanguage: 'designLanguage.json', ui: 'ui.json'}, artifactDependencyIds: ['publication-ux', 'publication-foundations']})});
  const proposalPath = path.join(environment.root, 'resource-proposal.json');
  fs.writeFileSync(proposalPath, JSON.stringify(result.proposal));
  const options = {currentPath: environment.currentPath, proposalPath, baseSnapshotSha256: result.baseSnapshotSha256, resourceRoot: environment.root};
  const before = fs.readFileSync(environment.currentPath);
  assert.throws(() => commitProductArtifact(options), /ENOENT/);
  assert.deepEqual(fs.readFileSync(environment.currentPath), before);
  publishArtifactResourceFiles(result.files, {outputRoot: environment.root});
  const resourcePath = result.proposal.resources[0].path;
  const inputFile = path.join(environment.root, resourcePath);
  const tampered = Buffer.from(png);
  tampered[tampered.length - 1] ^= 1;
  fs.writeFileSync(inputFile, tampered);
  assert.throws(() => commitProductArtifact(options), /hash|sha-?256/i);
  assert.deepEqual(fs.readFileSync(environment.currentPath), before);
  assert.equal(fs.existsSync(path.join(environment.store, 'artifact-resources')), false);
  fs.writeFileSync(inputFile, png);
  commitProductArtifact(options);
  const storedFile = path.join(environment.store, resourcePath);
  fs.writeFileSync(storedFile, tampered);
  assert.throws(() => resolveProductContext({currentPath: environment.currentPath}), /hash|sha-?256/i);
  assert.equal(fs.existsSync(path.join(environment.store, 'contexts')), false);
});
