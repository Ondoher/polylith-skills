import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {buildArtifactPublication} from './publication-artifacts.mjs';
import {
  calculateProductArtifactMaterialSha256,
  calculateProductContextMaterialSha256,
  generatePrd,
} from './generate-prd.mjs';
import {encodePublicationDocument} from './product-publication-payload.mjs';
import {createUxTestSpec} from '../test-fixtures/ux-test-fixture.mjs';

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`../test-fixtures/${name}`, import.meta.url), 'utf8'));

function designLanguage() {
  const {baseRevision: _baseRevision, ...document} = fixture('design-language-proposal.json');
  document.theme.id = 'example-theme';
  return {...document, id: 'example-design', revision: 1, status: 'accepted', decisions: []};
}

function reviewLayout() {
  return {
    version: 7,
    title: 'Field Journal Design Language',
    visualDirection: 'A quiet utilitarian application surface.',
    layoutNotes: 'Grid owns major regions and compact actions use flex layout.',
    spacing: {scale: [4, 8, 12, 16, 24], groupGap: 8, regionPadding: 16, regionGap: 24, status: 'defaulted', fieldGap: 16, helperGap: 4, helperLineHeight: 16},
    layout: {version: 1, status: 'defaulted', fieldHeight: 40, fieldPaddingX: 12, buttonHeight: 44, buttonPaddingX: 16, labelGap: 8, dialogWidth: 480, typeRoles: {heading: 'heading', body: 'body', label: 'supporting', supporting: 'supporting', button: 'body'}},
  };
}

function artifact(id, artifactKind, artifactSchemaVersion, document, artifactDependencies = [], encoding = 'json', resources = []) {
  const value = {
    schemaVersion: '1.0',
    kind: 'product-artifact',
    id,
    artifactKind,
    owner: artifactKind === 'ux-design' ? 'ux' : artifactKind === 'prd-publication' ? 'product' : 'ui',
    artifactSchemaVersion,
    revision: 1,
    status: 'accepted',
    consumerDomains: ['prd'],
    scopeRefs: ['field-journal'],
    coverageRefs: ['field-journal'],
    gapRefs: [],
    lockRefs: [],
    recordDependencies: [{id: 'field-journal', materialSha256: '5'.repeat(64)}],
    artifactDependencies,
    producer: {id: 'fixture-builder', contractVersion: '1.0', method: 'test-fixture'},
    resources,
    payload: encodePublicationDocument(document, {encoding}),
    materialSha256: 'pending',
    change: {kind: 'added', previousRevision: null, previousMaterialSha256: null},
  };
  value.materialSha256 = calculateProductArtifactMaterialSha256(value);
  return value;
}

function fullArtifactSet({image} = {}) {
  const ux = artifact('ux-current', 'ux-design', '0.2', createUxTestSpec(), [], 'gzip-base64');
  const design = artifact('design-current', 'design-language', '0.14', {
    designLanguage: designLanguage(),
    reviewLayout: reviewLayout(),
  });
  const uiDocument = fixture('ui-composition.json');
  let uiResources = [];
  if (image) {
    uiDocument.assets = [{
      id: 'sample-frame', kind: 'image', status: 'accepted', path: 'media/sample-frame.png', mimeType: 'image/png',
      widthPx: 1, heightPx: 1, sha256: image.sha256,
    }];
    uiDocument.templates[1] = {
      id: 'item-image', name: 'Item image', kind: 'image', version: '1', status: 'accepted', availability: 'available', interaction: 'behavioral',
      html: {renderer: 'image', element: 'div', className: 'ui-image-viewport'}, supportedStates: ['available'],
      parameters: [{id: 'assetId', required: true}, {id: 'accessibleLabel', required: true}, {id: 'fitMode', required: true}, {id: 'scale', required: false}, {id: 'offsetX', required: false}, {id: 'offsetY', required: false}],
      sizing: {width: 'fill', height: 'fixed', heightPx: 240},
    };
    const node = uiDocument.scenes[0].root.children[1];
    node.templateRef = {id: 'item-image', version: '1'};
    node.parameters = {assetId: 'sample-frame', accessibleLabel: 'Sample observation frame', fitMode: 'contain'};
    node.assetRefs = ['sample-frame'];
    delete node.placeholder;
    uiDocument.scenes[0].completeness = 'complete';
    uiDocument.scenes[0].unspecifiedRequirementRefs = [];
    uiDocument.unspecifiedRequirements = [];
    uiResources = [{
      id: 'sample-frame', logicalPath: 'media/sample-frame.png', path: `artifact-resources/${image.sha256}.png`,
      mediaType: 'image/png', byteLength: image.bytes.byteLength, sha256: image.sha256,
    }];
  }
  const ui = artifact('ui-current', 'ui-composition', '0.2', uiDocument, [], 'json', uiResources);
  const component = image ? null : artifact('component-current', 'component-design', '0.2', fixture('component-design.json'), [], 'gzip-base64');
  const selected = [ux, design, ui, ...(component ? [component] : [])];
  const manifest = artifact('publication-current', 'prd-publication', '1.0', {
    schemaVersion: '1.0',
    uxArtifactId: ux.id,
    designLanguageArtifactId: design.id,
    uiArtifactId: ui.id,
    componentArtifactIds: component ? [component.id] : [],
  }, selected.map((entry) => ({id: entry.id, revision: entry.revision, materialSha256: entry.materialSha256})));
  return [...selected, manifest];
}

function contextFixture(options = {}) {
  const context = {
    schemaVersion: '1.0',
    contextId: 'pending',
    consumer: 'prd',
    sourceSnapshot: {id: 'field-journal-snapshot', revision: 1, sha256: '2'.repeat(64)},
    productModel: {id: 'field-journal', revision: 1, status: 'accepted', sha256: '3'.repeat(64), materialSha256: '4'.repeat(64)},
    scopeRefs: ['field-journal'],
    product: {
      id: 'field-journal', name: 'Field Journal', status: 'accepted', owner: 'product', materialSha256: '5'.repeat(64),
      purpose: {id: 'field-journal-purpose', summary: 'Preserve field observations.', status: 'accepted', owner: 'product', materialSha256: '6'.repeat(64)},
      users: [{id: 'researcher', name: 'Researcher', description: 'A person maintaining observations.', status: 'accepted', owner: 'product', materialSha256: '7'.repeat(64)}],
    },
    capabilities: [],
    gaps: [],
    artifacts: fullArtifactSet(options),
    locks: [],
    exclusions: [],
    provenance: {sourceId: 'human-product-source', sourceRevision: 1, sourceSha256: '8'.repeat(64)},
    materialSha256: 'pending',
  };
  context.materialSha256 = calculateProductContextMaterialSha256(context);
  context.contextId = `prd-context-${context.materialSha256.slice(0, 12)}`;
  return context;
}

test('builds the complete linked static PRD from one explicit artifact manifest', () => {
  const publication = buildArtifactPublication({artifacts: fullArtifactSet()});
  const expected = [
    'index.html',
    'design-language/index.html',
    'components/index.html',
    'comps/records-viewing.html',
    'component-comps/record-list-available.html',
    'assets/prd.css',
    'assets/product.css',
    'render-report.json',
  ];
  for (const relativePath of expected) assert.ok(publication.files.has(relativePath), relativePath);
  const index = publication.files.get('index.html').toString('utf8');
  assert.match(index, /Field Journal/);
  assert.match(index, /Product comps/);
  assert.match(index, /component-comps\/index\.html/);
  assert.doesNotMatch(index, /<iframe/iu);
  assert.deepEqual(publication.resources, []);
});

test('does not infer a full-publication role when the manifest is absent', () => {
  assert.equal(buildArtifactPublication({artifacts: fullArtifactSet().slice(0, -1)}), null);
});

test('publishes the manifest-selected site atomically and receipts every recursive output', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-prd-full-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const contextPath = path.join(root, 'context.json');
  const outputDirectory = path.join(root, 'prd');
  fs.writeFileSync(contextPath, `${JSON.stringify(contextFixture(), null, 2)}\n`, 'utf8');

  const receipt = await generatePrd({contextPath, outputDirectory});
  assert.ok(receipt.files.length > 10);
  assert.deepEqual(receipt.resources, []);
  const paths = receipt.files.map((file) => file.path);
  assert.deepEqual(paths, [...paths].sort());
  for (const record of receipt.files) {
    const bytes = fs.readFileSync(path.join(outputDirectory, ...record.path.split('/')));
    assert.equal(bytes.byteLength, record.bytes, record.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, record.path);
  }
  assert.match(fs.readFileSync(path.join(outputDirectory, 'index.html'), 'utf8'), /Product comps/);

  const before = Object.fromEntries(receipt.files.map(({path: relativePath, sha256}) => [relativePath, sha256]));
  const replay = await generatePrd({contextPath, outputDirectory});
  assert.deepEqual(Object.fromEntries(replay.files.map(({path: relativePath, sha256}) => [relativePath, sha256])), before);

  const protectedIndex = fs.readFileSync(path.join(outputDirectory, 'index.html'));
  const unownedDirectory = path.join(outputDirectory, 'unowned', 'empty');
  fs.mkdirSync(unownedDirectory, {recursive: true});
  await assert.rejects(generatePrd({contextPath, outputDirectory}), /directories not owned/iu);
  assert.deepEqual(fs.readFileSync(path.join(outputDirectory, 'index.html')), protectedIndex);
  fs.rmSync(path.join(outputDirectory, 'unowned'), {recursive: true});

  const compact = contextFixture();
  compact.artifacts = [];
  compact.materialSha256 = calculateProductContextMaterialSha256(compact);
  compact.contextId = `prd-context-${compact.materialSha256.slice(0, 12)}`;
  const compactPath = path.join(root, 'compact-context.json');
  fs.writeFileSync(compactPath, `${JSON.stringify(compact, null, 2)}\n`, 'utf8');
  const replacement = await generatePrd({contextPath: compactPath, outputDirectory});
  assert.deepEqual(replacement.files.map(({path: relativePath}) => relativePath), ['assets/product.css', 'index.html']);
  assert.equal(fs.existsSync(path.join(outputDirectory, 'comps')), false);
});

test('publishes only context-declared resource bytes and preserves output when their digest changes', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-prd-resource-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const resourceDirectory = path.join(root, 'artifact-resources');
  const resourcePath = path.join(resourceDirectory, `${sha256}.png`);
  fs.mkdirSync(resourceDirectory);
  fs.writeFileSync(resourcePath, bytes);
  const contextPath = path.join(root, 'context.json');
  const outputDirectory = path.join(root, 'prd');
  fs.writeFileSync(contextPath, `${JSON.stringify(contextFixture({image: {bytes, sha256}}), null, 2)}\n`, 'utf8');

  const receipt = await generatePrd({contextPath, outputDirectory});
  assert.deepEqual(receipt.resources, [{
    artifactId: 'ui-current',
    id: 'sample-frame',
    logicalPath: 'media/sample-frame.png',
    path: `artifact-resources/${sha256}.png`,
    mediaType: 'image/png',
    byteLength: bytes.byteLength,
    sha256,
  }]);
  const emitted = receipt.files.find((file) => file.path.startsWith('assets/ui-media/'));
  assert.ok(emitted);
  assert.deepEqual(fs.readFileSync(path.join(outputDirectory, ...emitted.path.split('/'))), bytes);
  const before = fs.readFileSync(path.join(outputDirectory, 'index.html'));

  const tampered = Buffer.from(bytes);
  tampered[tampered.length - 1] ^= 1;
  fs.writeFileSync(resourcePath, tampered);
  await assert.rejects(generatePrd({contextPath, outputDirectory}), /hash does not match|bytes do not match/iu);
  assert.deepEqual(fs.readFileSync(path.join(outputDirectory, 'index.html')), before);
});
