import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {publishUiCompositionHtml as publishUiCompositionHtmlRaw} from './ui-composition-html.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';

const fixtureFile = new URL('../references/ui-composition-proposal.json', import.meta.url);
const designFixtureFile = new URL('../references/extras-proposal.json', import.meta.url);
const fixture = () => JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
const folder = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ui-composition-html-'));

function publishUiCompositionHtml(uiFile, uxFile, designFile, output, options = {}) {
  return publishUiCompositionHtmlRaw(uiFile, uxFile, designFile, output, {
    sourceRoot: path.dirname(path.resolve(uiFile)),
    ...options,
  });
}

function ux() {
  return createUxTestSpec();
}

function design() {
  const {baseRevision: _baseRevision, ...proposal} = JSON.parse(fs.readFileSync(designFixtureFile, 'utf8'));
  proposal.theme.id = 'example-theme';
  return {...proposal, id: 'example-design', revision: 1, status: 'accepted', decisions: []};
}

function sources(base, ui = fixture(), uxSource = ux()) {
  const uiFile = path.join(base, 'ui.json');
  const uxFile = path.join(base, 'ux.json');
  const designFile = path.join(base, 'design.json');
  fs.writeFileSync(uiFile, `${JSON.stringify(ui, null, 2)}\n`);
  fs.writeFileSync(uxFile, `${JSON.stringify(uxSource, null, 2)}\n`);
  fs.writeFileSync(designFile, `${JSON.stringify(design(), null, 2)}\n`);
  return {uiFile, uxFile, designFile};
}

function snapshot(output) {
  return ['comps/index.html', 'comps/records-viewing.html', 'comps/records-viewing-annotated.html', 'assets/composition.css', 'ui/render-report.json']
    .map(relative => [relative, fs.readFileSync(path.join(output, relative))]);
}

function sceneMarkup(html) {
  const start = html.indexOf('<div class="ui-viewport"');
  const end = html.lastIndexOf('</div>\n    </section>');
  return html.slice(start, end);
}

test('publishes deterministic clean and annotated HTML from one scene tree', () => {
  const base = folder();
  const input = sources(base);
  const output = path.join(base, 'prd');
  const first = publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output);
  const before = snapshot(output);
  const clean = before[1][1].toString();
  const annotated = before[2][1].toString();

  assert.equal(first.rendererVersion, 'ui-composition-html-2.0');
  assert.equal(first.counts.scenes, 1);
  assert.equal(first.counts.placeholders, 1);
  assert.match(clean, /ui-page--clean/);
  assert.match(annotated, /ui-page--annotated/);
  assert.match(clean, /clean product wireframe/);
  assert.match(clean, /Partial UI wireframe/);
  assert.match(clean, /<section id="scene" class="ui-viewport-frame"/);
  assert.match(clean, /role="img" aria-label="Record list — placeholder"/);
  assert.equal(sceneMarkup(clean), sceneMarkup(annotated));
  assert.match(before[3][1].toString(), /\.ui-page--annotated \[data-ui-annotation\]::before/);
  assert.match(clean, /data-ui-measurement="padding 16px · gap 16px · 1c×2r"/);
  assert.match(before[3][1].toString(), /\[data-ui-measurement\]::after/);
  assert.match(before[3][1].toString(), /#scene:target \{ zoom: \.86; \}/);
  assert.match(before[3][1].toString(), /\.ui-button:disabled, \.ui-icon-button:disabled/);
  assert.match(before[3][1].toString(), /\.ui-text-field input:disabled/);

  publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output);
  assert.deepEqual(snapshot(output), before);
});

test('renders a bounded choice group with semantic tabs from one UX binding', () => {
  const base = folder();
  const ui = fixture();
  const template = ui.templates[1];
  template.id = 'workspace-choice';
  template.name = 'Workspace choice';
  template.kind = 'choice-group';
  template.status = 'accepted';
  template.availability = 'available';
  template.html = {renderer: 'choice-group', element: 'nav', className: 'ui-choice-group'};
  template.parameters = [
    {id: 'label', required: true}, {id: 'presentation', required: true}, {id: 'options', required: true},
    {id: 'selectedId', required: false}, {id: 'disabled', required: false},
  ];
  template.sizing = {width: 'fill', height: 'content'};
  const node = ui.scenes[0].root.children[1];
  node.templateRef = {id: template.id, version: template.version};
  node.parameters = {
    label: 'Workspace', presentation: 'tabs',
    options: [{id: 'library', label: 'Library'}, {id: 'editor', label: 'Editor'}], selectedId: 'editor',
  };
  delete node.placeholder;
  ui.scenes[0].completeness = 'complete';
  ui.scenes[0].unspecifiedRequirementRefs = [];
  ui.unspecifiedRequirements = [];
  const input = sources(base, ui);
  const output = path.join(base, 'prd');
  publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output);
  const clean = fs.readFileSync(path.join(output, 'comps/records-viewing.html'), 'utf8');
  assert.match(clean, /role="tablist" aria-label="Workspace"/);
  assert.match(clean, /role="tab" aria-selected="true"><span>Editor<\/span>/);
  assert.equal((clean.match(/data-ui-node="record-list-instance"/g) ?? []).length, 1);
});

test('renders ordered list choice headings without adding UX bindings', () => {
  const base = folder();
  const ui = fixture();
  const template = ui.templates[1];
  template.id = 'content-choice';
  template.name = 'Content choice';
  template.kind = 'choice-group';
  template.status = 'accepted';
  template.availability = 'available';
  template.html = {renderer: 'choice-group', element: 'div', className: 'ui-choice-group'};
  template.parameters = [
    {id: 'label', required: true}, {id: 'presentation', required: true}, {id: 'options', required: true},
    {id: 'selectedId', required: false}, {id: 'disabled', required: false},
  ];
  template.sizing = {width: 'fill', height: 'content'};
  const node = ui.scenes[0].root.children[1];
  node.templateRef = {id: template.id, version: template.version};
  node.parameters = {
    label: 'Content', presentation: 'list', selectedId: 'clip-a',
    options: [
      {id: 'source-a', label: 'Coast.mov', group: 'Video Files'},
      {id: 'clip-a', label: 'Opening shot', group: 'Clips'},
      {id: 'clip-b', label: 'Closing shot', group: 'Clips'},
    ],
  };
  delete node.placeholder;
  ui.scenes[0].completeness = 'complete';
  ui.scenes[0].unspecifiedRequirementRefs = [];
  ui.unspecifiedRequirements = [];
  const input = sources(base, ui);
  const output = path.join(base, 'prd');
  publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output);
  const clean = fs.readFileSync(path.join(output, 'comps/records-viewing.html'), 'utf8');
  assert.equal((clean.match(/class="ui-choice-group__heading"/g) ?? []).length, 2);
  assert.match(clean, />Video Files<\/div>/);
  assert.match(clean, />Clips<\/div>/);
  assert.equal((clean.match(/role="option"/g) ?? []).length, 3);
});

test('publishes a validated image viewport as one deterministic media asset', (t) => {
  const base = folder();
  const ui = fixture();
  const fileName = `.ui-composition-image-${process.pid}-${Date.now()}.png`;
  const filePath = path.join(process.cwd(), fileName);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  fs.writeFileSync(filePath, png);
  t.after(() => fs.rmSync(filePath, {force: true}));
  ui.assets = [{
    id: 'sample-frame', kind: 'image', status: 'accepted', path: fileName, mimeType: 'image/png', widthPx: 1, heightPx: 1,
    sha256: createHash('sha256').update(png).digest('hex'),
  }];
  ui.templates[1] = {
    id: 'item-image', name: 'Item image', kind: 'image', version: '1', status: 'accepted', availability: 'available',
    interaction: 'behavioral',
    html: {renderer: 'image', element: 'div', className: 'ui-image-viewport'}, supportedStates: ['available'],
    parameters: [
      {id: 'assetId', required: true}, {id: 'accessibleLabel', required: true}, {id: 'fitMode', required: true},
      {id: 'scale', required: false}, {id: 'offsetX', required: false}, {id: 'offsetY', required: false},
    ],
    sizing: {width: 'fill', height: 'fixed', heightPx: 240},
  };
  const node = ui.scenes[0].root.children[1];
  node.templateRef = {id: 'item-image', version: '1'};
  node.parameters = {assetId: 'sample-frame', accessibleLabel: 'Sample frame', fitMode: 'contain', scale: 2, offsetX: -4, offsetY: 3};
  node.assetRefs = ['sample-frame'];
  delete node.placeholder;
  ui.scenes[0].completeness = 'complete';
  ui.scenes[0].root.surfaceTreatment = 'elevation-1';
  ui.scenes[0].unspecifiedRequirementRefs = [];
  ui.unspecifiedRequirements = [];
  const input = sources(base, ui);
  const output = path.join(base, 'prd');
  assert.throws(
    () => publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output),
    /missing below its asset root/,
  );
  fs.writeFileSync(path.join(base, fileName), png);
  const report = publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output);
  const mediaRelative = report.files.find(relative => relative.startsWith('assets/ui-media/'));
  const clean = fs.readFileSync(path.join(output, 'comps/records-viewing.html'), 'utf8');
  assert.ok(mediaRelative);
  assert.deepEqual(fs.readFileSync(path.join(output, mediaRelative)), png);
  assert.match(clean, /class="ui-template ui-image-viewport/);
  assert.match(clean, /class="ui-scene-root ui-surface-elevation-1"/);
  assert.match(clean, /aria-label="Sample frame"/);
  assert.match(clean, /src="\.\.\/assets\/ui-media\//);
  assert.match(clean, /transform:translate\(-4px,3px\) scale\(2\)/);
  publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output);
  assert.deepEqual(fs.readFileSync(path.join(output, mediaRelative)), png);
});

test('invalid UI input preserves a prior valid publication', () => {
  const base = folder();
  const input = sources(base);
  const output = path.join(base, 'prd');
  publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output);
  const before = snapshot(output);
  const invalid = fixture();
  invalid.scenes[0].state = 'missing-state';
  fs.writeFileSync(input.uiFile, JSON.stringify(invalid));
  assert.throws(() => publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output), /not declared by its UX subject/);
  assert.deepEqual(snapshot(output), before);
});

test('refuses unowned output and linked roots', () => {
  const base = folder();
  const input = sources(base);
  const unowned = path.join(base, 'unowned');
  fs.mkdirSync(path.join(unowned, 'comps'), {recursive: true});
  fs.writeFileSync(path.join(unowned, 'comps', 'index.html'), '<h1>Owner file</h1>');
  assert.throws(() => publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, unowned), /unowned generated file/);

  const actual = path.join(base, 'actual');
  const linked = path.join(base, 'linked');
  fs.mkdirSync(actual);
  fs.symlinkSync(actual, linked, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, linked), /linked output root/);
  assert.deepEqual(fs.readdirSync(actual), []);
});

test('renders a transient dialog semantically and documents its interaction contract', () => {
  const base = folder();
  const ui = fixture();
  const uxSource = ux();
  uxSource.surfaces[0].kind = 'dialog';
  ui.scenes[0].transientBehavior = {
    presentation: 'dialog',
    focusOrder: ['record-list-instance'],
    initialFocusRef: 'record-list-instance',
    initialFocusRationale: 'First task control.',
    returnFocusRef: 'open-editor-dialog',
    actionGroupRef: 'records-layout',
    cancellation: {escape: 'dismiss', outside: 'ignore', result: 'Dismiss without saving.'},
    height: {mode: 'content', maxPx: 560}
  };
  const input = sources(base, ui, uxSource);
  const output = path.join(base, 'prd');
  publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output);
  const clean = fs.readFileSync(path.join(output, 'comps/records-viewing.html'), 'utf8');
  const annotated = fs.readFileSync(path.join(output, 'comps/records-viewing-annotated.html'), 'utf8');
  assert.match(clean, /<dialog class="ui-scene-root/);
  assert.match(clean, /data-ui-transient="dialog" open aria-modal="true"/);
  assert.doesNotMatch(clean, /Transient interaction contract/);
  assert.match(annotated, /Transient interaction contract/);
  assert.match(annotated, /Content driven, max 560px/);
});
