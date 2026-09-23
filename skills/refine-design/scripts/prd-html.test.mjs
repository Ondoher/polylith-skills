import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {applyProposal} from './design-language.mjs';
import {publishPrdHtml as publishPrdHtmlRaw} from './prd-html.mjs';
import {assessRefinementImpact} from './refinement-impact.mjs';
import {writeUxArtifacts} from './ux-design.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';

const designFixtureFile = new URL('../references/extras-proposal.json', import.meta.url);
const uiFixtureFile = new URL('../references/ui-composition-proposal.json', import.meta.url);
const componentFixtureFile = new URL('../references/component-design-proposal.json', import.meta.url);
const designFixture = () => JSON.parse(fs.readFileSync(designFixtureFile, 'utf8'));
const folder = () => fs.mkdtempSync(path.join(os.tmpdir(), 'prd-html-test-'));

function publishPrdHtml(uxFile, designFile, outputRoot, options = {}) {
    return publishPrdHtmlRaw(uxFile, designFile, outputRoot, {
        sourceRoot: path.dirname(path.resolve(uxFile)),
        ...options,
    });
}
const layoutFixture = () => ({
    version: 7,
    title: 'Fixture Design Language',
    visualDirection: 'Fixture direction',
    layoutNotes: 'Fixture layout notes',
    spacing: {scale: [4, 8, 12, 16, 24], groupGap: 8, regionPadding: 16, regionGap: 24, status: 'defaulted', fieldGap: 16, helperGap: 4, helperLineHeight: 16},
    layout: {version: 1, status: 'defaulted', fieldHeight: 40, fieldPaddingX: 12, buttonHeight: 44, buttonPaddingX: 16, labelGap: 8, dialogWidth: 480, typeRoles: {heading: 'heading', body: 'body', label: 'supporting', supporting: 'supporting', button: 'body'}},
});

function uxFixture() {
    const spec = createUxTestSpec();
    spec.id = 'fixture-ux';
    spec.title = 'Fixture UX';
    spec.revision = 'fixture-1';
    spec.assessment.description = 'Synthetic publisher fixture.';
    spec.sources[0] = {id: 'product', path: 'product-description.md', revision: '1', kind: 'human-owned product description'};
    spec.product = {name: 'Fixture Product', overview: 'A product with <structured> workflows and visible results.', users: ['A person completing the fixture task.']};
    spec.useCases[0].alternatives[0].status = 'unresolved';
    spec.features[0].questionRefs = ['recovery'];
    spec.useCases[0].questionRefs = ['recovery'];
    spec.surfaces[0].questionRefs = ['recovery'];
    spec.openQuestions = [{id: 'recovery', question: 'Which recovery choices are available?', owner: 'Product owner with UX guidance', why: 'The visible recovery flow is incomplete.', affects: ['update-record.alternatives'], status: 'open'}];
    return spec;
}

function sources(base) {
    const designBase = path.join(base, 'design');
    applyProposal(designBase, designFixture());
    const design = path.join(designBase, 'design-language', 'design-language.json');
    const layout = path.join(designBase, 'design-language', 'review-layout.json');
    fs.writeFileSync(layout, `${JSON.stringify(layoutFixture(), null, 2)}\n`);
    const ux = path.join(base, 'ux-spec.json');
    fs.writeFileSync(ux, `${JSON.stringify(uxFixture(), null, 2)}\n`);
    const designDocument = JSON.parse(fs.readFileSync(design, 'utf8'));
    const uiDocument = JSON.parse(fs.readFileSync(uiFixtureFile, 'utf8'));
    uiDocument.id = 'fixture-ui';
    uiDocument.sources[0] = {id: 'ux', kind: 'ux', path: 'ux-spec.json', documentId: 'fixture-ux', revision: 'fixture-1'};
    uiDocument.sources[1] = {id: 'design-language', kind: 'design-language', path: 'design-language.json', documentId: designDocument.id, revision: designDocument.revision};
    uiDocument.uxSource = {sourceId: 'ux', documentId: 'fixture-ux', revision: 'fixture-1'};
    uiDocument.designLanguageSource = {sourceId: 'design-language', documentId: designDocument.id, revision: designDocument.revision};
    uiDocument.scenes[0].themeRef = designDocument.theme.id;
    const ui = path.join(base, 'ui-spec.json');
    fs.writeFileSync(ui, `${JSON.stringify(uiDocument, null, 2)}\n`);
    const componentDocument = JSON.parse(fs.readFileSync(componentFixtureFile, 'utf8'));
    componentDocument.sources[0] = {id: 'ux', kind: 'ux', path: 'ux-spec.json', documentId: 'fixture-ux', revision: 'fixture-1'};
    componentDocument.sources[1] = {id: 'design-language', kind: 'design-language', path: 'design-language.json', documentId: designDocument.id, revision: designDocument.revision};
    componentDocument.uxSource = {sourceId: 'ux', documentId: 'fixture-ux', revision: 'fixture-1'};
    componentDocument.designLanguageSource = {sourceId: 'design-language', documentId: designDocument.id, revision: designDocument.revision};
    componentDocument.scenes[0].themeRef = designDocument.theme.id;
    const component = path.join(base, 'component-design.json');
    fs.writeFileSync(component, `${JSON.stringify(componentDocument, null, 2)}\n`);
    return {design, layout, ux, ui, component};
}

function snapshot(output) {
    return ['index.html', 'components/index.html', 'design-language/index.html', 'assets/prd.css', 'assets/product.css', 'render-report.json', 'design-language/render-report.json']
        .map((relative) => [relative, fs.readFileSync(path.join(output, relative))]);
}

test('publishes a linked deterministic PRD, design language, and component state catalog', () => {
    const base = folder();
    const input = sources(base);
    const lockedUx = JSON.parse(fs.readFileSync(input.ux, 'utf8'));
    lockedUx.application.areas[0].status = 'locked';
    fs.writeFileSync(input.ux, `${JSON.stringify(lockedUx, null, 2)}\n`);
    const output = path.join(base, 'prd');
    const first = publishPrdHtml(input.ux, input.design, output, {layoutFile: input.layout, uxLabel: 'ux/ux-spec.json', designLabel: 'ui/design-language.json'});
    const before = snapshot(output);
    const index = before.find(([name]) => name === 'index.html')[1].toString();
    const components = before.find(([name]) => name === 'components/index.html')[1].toString();
    const design = before.find(([name]) => name === 'design-language/index.html')[1].toString();

    assert.equal(first.rendererVersion, 'prd-html-1.8');
    assert.equal(first.designLanguage.rendererVersion, 'design-language-html-1.14');
    assert.equal(first.counts.features, 1);
    assert.equal(first.counts.openQuestions, 1);
    assert.equal(first.counts.unresolvedRecords, 1);
    assert.equal(first.counts.lockedRecords, 1);
    assert.equal(first.counts.uxActions, 3);
    assert.equal(first.counts.uxInteractionFrames, 5);
    assert.equal(first.counts.wireframedSurfaces, 1);
    assert.match(index, /Fixture Product/);
    assert.match(index, /A product with &lt;structured&gt; workflows/);
    assert.match(index, /Work surfaces/);
    assert.match(index, /Design state<\/dt><dd>accepted/);
    assert.match(index, /Locked design/);
    assert.match(index, /Visible response:/);
    assert.match(index, /Needs definition/);
    assert.match(index, /Which recovery choices are available/);
    assert.match(index, /class="uxw-collection"/);
    assert.match(index, /data-ux-frame="records-viewing"/);
    assert.match(index, /data-ux-action="open-record"/);
    assert.ok(index.indexOf('data-ux-frame="records-viewing"') < index.indexOf('<section id="use-cases"'));
    assert.match(before.find(([name]) => name === 'assets/product.css')[1].toString(), /--uxw-paper: #fff/);
    assert.doesNotMatch(index, /class="rd-status"|data-status=|>Accepted<|>Proposed</);
    assert.match(components, /Standard component states/);
    assert.match(components, /Command states/);
    assert.match(components, /Text fields and feedback/);
    assert.match(components, /Checkbox groups/);
    assert.match(components, /Selects/);
    assert.match(components, /Embedded-action fields/);
    assert.match(components, /aria-label="Show value"/);
    assert.doesNotMatch(components, /class="rd-status"|data-status=|>Accepted<|>Proposed</);
    assert.match(design, /href="\.\.\/index\.html">Product requirements/);
    assert.match(design, /href="\.\.\/components\/index\.html">Component states/);
    assert.ok(fs.existsSync(path.join(output, 'assets', 'fonts', 'roboto.ttf')));

    publishPrdHtml(input.ux, input.design, output, {layoutFile: input.layout, uxLabel: 'ux/ux-spec.json', designLabel: 'ui/design-language.json'});
    assert.deepEqual(snapshot(output), before);
});

test('persists an accepted structured UX change, scopes its impact, and republishes it without a separate acceptance gate', () => {
    const base = folder();
    const input = sources(base);
    const working = path.join(base, 'working');
    const first = writeUxArtifacts(input.ux, working);
    const previous = JSON.parse(fs.readFileSync(first.sourcePath, 'utf8'));
    publishPrdHtml(first.sourcePath, input.design, path.join(base, 'prd'), {layoutFile: input.layout});

    const changed = structuredClone(previous);
    changed.revision = 'fixture-2';
    changed.useCases[0].steps[0].response = 'The accepted updated value and save state appear immediately.';
    const proposal = path.join(base, 'changed-ux.json');
    fs.writeFileSync(proposal, `${JSON.stringify(changed, null, 2)}\n`);
    writeUxArtifacts(proposal, working);
    const current = JSON.parse(fs.readFileSync(first.sourcePath, 'utf8'));
    const impact = assessRefinementImpact(
        [{id: 'ux', revision: previous.revision, records: {'update-record': previous.useCases[0]}}],
        [{id: 'ux', revision: current.revision, records: {'update-record': current.useCases[0]}}],
        [{id: 'update-record-prd', dependencies: [{sourceId: 'ux', recordRefs: ['update-record']}]}]
    );
    assert.deepEqual(impact.stale, ['update-record-prd']);
    assert.equal(current.status, 'accepted');

    publishPrdHtml(first.sourcePath, input.design, path.join(base, 'prd'), {layoutFile: input.layout});
    const html = fs.readFileSync(path.join(base, 'prd', 'index.html'), 'utf8');
    assert.match(html, /The accepted updated value and save state appear immediately\./);
    assert.match(html, /Design state<\/dt><dd>accepted/);
});

test('integrates product comps and surface links from a validated UI specification', () => {
    const base = folder();
    const input = sources(base);
    const output = path.join(base, 'prd');
    const options = {layoutFile: input.layout, uiFile: input.ui, uiLabel: 'ui/ui-spec.json'};
    const first = publishPrdHtml(input.ux, input.design, output, options);
    const files = ['index.html', 'comps/index.html', 'comps/records-viewing.html', 'comps/records-viewing-annotated.html', 'assets/composition.css', 'ui/render-report.json'];
    const before = files.map(relative => [relative, fs.readFileSync(path.join(output, relative))]);
    const index = before[0][1].toString();

    assert.equal(first.counts.uiScenes, 1);
    assert.equal(first.counts.uiRenderRequests, 2);
    assert.equal(first.uiComposition.rendererVersion, 'ui-composition-html-2.0');
    assert.match(index, /Product comps/);
    assert.match(index, /<link rel="stylesheet" href="assets\/composition\.css">/);
    assert.match(index, /<figure class="prd-comp-inline"/);
    assert.ok(index.indexOf('data-ux-frame="records-viewing"') < index.indexOf('<figure class="prd-comp-inline"'));
    assert.match(index, /<div class="prd-comp-canvas ui-viewport"/);
    assert.match(index, /data-ui-scene="records-viewing"/);
    assert.doesNotMatch(index, /<iframe/);
    assert.match(index, /Partial UI wireframe/);
    assert.match(index, /href="comps\/records-viewing\.html">Clean wireframe/);
    assert.match(index, /href="comps\/records-viewing-annotated\.html">Annotated wireframe/);
    assert.doesNotMatch(index, /<section id="comps"/);
    assert.match(before[1][1].toString(), /Clean and annotated comps and partial wireframes generated from the same structured scenes/);
    assert.match(before[2][1].toString(), /<section id="scene" class="ui-viewport-frame"/);

    publishPrdHtml(input.ux, input.design, output, options);
    assert.deepEqual(files.map(relative => [relative, fs.readFileSync(path.join(output, relative))]), before);
});

test('publishes component comps and replaces only the matching surface placeholder', () => {
    const base = folder();
    const input = sources(base);
    const output = path.join(base, 'prd');
    const options = {layoutFile: input.layout, uiFile: input.ui, componentFile: input.component, componentLabel: 'ui/components/record-list.json'};
    const first = publishPrdHtml(input.ux, input.design, output, options);
    const surfaceComp = fs.readFileSync(path.join(output, 'comps', 'records-viewing.html'), 'utf8');
    const componentComp = fs.readFileSync(path.join(output, 'component-comps', 'record-list-available.html'), 'utf8');
    const report = JSON.parse(fs.readFileSync(path.join(output, 'render-report.json'), 'utf8'));

    assert.equal(first.componentDesign.rendererVersion, 'component-design-html-1.2');
    assert.equal(first.uiComposition.counts.resolvedPlaceholders, 1);
    assert.equal(first.uiComposition.counts.unresolvedPlaceholders, 0);
    assert.match(surfaceComp, /<div class="ui-complex-component" role="list" aria-label="Observation records">/);
    assert.match(surfaceComp, /data-ui-node="record-summary"/);
    assert.doesNotMatch(surfaceComp, /<iframe/);
    assert.doesNotMatch(surfaceComp, /Record list .* placeholder/);
    assert.match(componentComp, /data-ui-node="record-summary"/);
    assert.doesNotMatch(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), /<iframe/);
    assert.match(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), /component-comps\/index\.html">Component comps/);
    assert.equal(report.sources.component.label, 'ui/components/record-list.json');
    assert.equal(report.componentDesignReport, 'ui/components/record-list-component-render-report.json');
    assert.equal(report.counts.resolvedUiPlaceholders, 1);
    assert.ok(fs.existsSync(path.join(output, 'assets', 'component-composition.css')));
});

test('publishes and registers multiple independently owned component comps', () => {
    const base = folder();
    const input = sources(base);
    const ux = JSON.parse(fs.readFileSync(input.ux, 'utf8'));
    const secondUxComponent = structuredClone(ux.components[0]);
    secondUxComponent.id = 'record-list-secondary';
    secondUxComponent.name = 'Secondary record list';
    ux.components.push(secondUxComponent);
    ux.surfaces[0].componentRefs.push(secondUxComponent.id);
    ux.surfaces[0].regions[0].componentRefs.push(secondUxComponent.id);
    fs.writeFileSync(input.ux, `${JSON.stringify(ux, null, 2)}\n`);

    const ui = JSON.parse(fs.readFileSync(input.ui, 'utf8'));
    const secondTemplate = structuredClone(ui.templates.find(template => template.id === 'record-list-placeholder'));
    secondTemplate.id = 'record-list-secondary-placeholder';
    secondTemplate.name = 'Secondary record list';
    secondTemplate.interaction = 'presentational';
    ui.templates.push(secondTemplate);
    const contentRegion = ui.scenes[0].root;
    contentRegion.layout.rows = [{unit: 'content'}, {unit: 'fr', value: 1}, {unit: 'fr', value: 1}];
    const secondNode = structuredClone(contentRegion.children.find(node => node.id === 'record-list-instance'));
    secondNode.id = 'record-list-secondary-instance';
    secondNode.uxRef = secondUxComponent.id;
    secondNode.templateRef.id = secondTemplate.id;
    delete secondNode.interactionNodeRef;
    delete secondNode.actionRef;
    secondNode.placement.row = 3;
    secondNode.placeholder.label = 'Secondary record list — placeholder';
    contentRegion.children.push(secondNode);
    ui.scenes[0].unspecifiedRequirementRefs.push('record-list-secondary-template');
    ui.unspecifiedRequirements.push({id: 'record-list-secondary-template', description: 'The reusable secondary record-list template has not been designed.', owner: 'ui', affects: [secondNode.id], blocks: ['complete scene rendering'], status: 'unresolved'});
    fs.writeFileSync(input.ui, `${JSON.stringify(ui, null, 2)}\n`);

    const component = JSON.parse(fs.readFileSync(input.component, 'utf8'));
    const second = structuredClone(component);
    second.id = 'fixture-secondary-component-design';
    second.componentTemplate.id = 'record-list-secondary-component';
    second.componentTemplate.name = 'Secondary record list';
    second.componentTemplate.uxRef = secondUxComponent.id;
    second.componentTemplate.replacesTemplateRef.id = secondTemplate.id;
    second.componentTemplate.accessibility.name = 'Secondary observation records';
    second.componentTemplate.stateScenes[0].sceneRef = 'record-list-secondary-available';
    second.scenes[0].id = 'record-list-secondary-available';
    second.scenes[0].name = 'Secondary record list available';
    second.scenes[0].subject.ref = secondUxComponent.id;
    second.scenes[0].interactionFrameRef = 'records-saving';
    second.scenes[0].root.uxRegionRef = 'saving-details';
    second.scenes[0].root.label = 'Secondary observation records';
    second.scenes[0].root.layout.rows = [{unit: 'fr', value: 1}];
    second.scenes[0].root.children = second.scenes[0].root.children.filter(node => node.id === 'record-summary');
    for (const node of second.scenes[0].root.children) if (node.uxRef === 'record-list') node.uxRef = secondUxComponent.id;
    second.renderRequests[0].id = 'record-list-secondary-available-clean';
    second.renderRequests[0].sceneRef = second.scenes[0].id;
    second.renderRequests[0].output = 'comps/record-list-secondary-available.html';
    second.renderRequests[1].id = 'record-list-secondary-available-annotated';
    second.renderRequests[1].sceneRef = second.scenes[0].id;
    second.renderRequests[1].output = 'comps/record-list-secondary-available-annotated.html';
    const secondFile = path.join(base, 'component-design-secondary.json');
    fs.writeFileSync(secondFile, `${JSON.stringify(second, null, 2)}\n`);

    const output = path.join(base, 'prd');
    const result = publishPrdHtml(input.ux, input.design, output, {
        layoutFile: input.layout,
        uiFile: input.ui,
        componentFiles: [input.component, secondFile],
        componentLabels: ['ui/components/record-list.json', 'ui/components/record-list-secondary.json'],
    });
    const surfaceComp = fs.readFileSync(path.join(output, 'comps', 'records-viewing.html'), 'utf8');
    const componentIndex = fs.readFileSync(path.join(output, 'component-comps', 'index.html'), 'utf8');

    assert.equal(result.counts.componentDesigns, 2);
    assert.equal(result.counts.resolvedUiPlaceholders, 2);
    assert.equal(result.componentDesigns.length, 2);
    assert.equal(result.componentDesignReports.length, 2);
    assert.match(surfaceComp, /aria-label="Observation records"/);
    assert.match(surfaceComp, /aria-label="Secondary observation records"/);
    assert.doesNotMatch(surfaceComp, /<iframe/);
    assert.match(componentIndex, /Record list/);
    assert.match(componentIndex, /Secondary record list/);
});

test('publishes UI and component image assets from their explicit authorized roots', () => {
    const base = folder();
    const input = sources(base);
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    const pixelHash = createHash('sha256').update(pixel).digest('hex');
    const uiAssetRoot = path.join(base, 'ui-assets');
    const componentAssetRoot = path.join(base, 'component-assets');
    fs.mkdirSync(path.join(uiAssetRoot, 'media'), {recursive: true});
    fs.mkdirSync(path.join(componentAssetRoot, 'media'), {recursive: true});
    fs.writeFileSync(path.join(uiAssetRoot, 'media', 'ui-pixel.png'), pixel);
    fs.writeFileSync(path.join(componentAssetRoot, 'media', 'component-pixel.png'), pixel);

    const ui = JSON.parse(fs.readFileSync(input.ui, 'utf8'));
    ui.assets.push({id: 'ui-pixel', kind: 'image', status: 'accepted', path: 'media/ui-pixel.png', mimeType: 'image/png', widthPx: 1, heightPx: 1, sha256: pixelHash});
    fs.writeFileSync(input.ui, `${JSON.stringify(ui, null, 2)}\n`);
    const component = JSON.parse(fs.readFileSync(input.component, 'utf8'));
    component.assets.push({id: 'component-pixel', kind: 'image', status: 'accepted', path: 'media/component-pixel.png', mimeType: 'image/png', widthPx: 1, heightPx: 1, sha256: pixelHash});
    fs.writeFileSync(input.component, `${JSON.stringify(component, null, 2)}\n`);

    const output = path.join(base, 'prd');
    publishPrdHtml(input.ux, input.design, output, {
        layoutFile: input.layout,
        uiFile: input.ui,
        uiAssetRoot,
        componentFile: input.component,
        componentAssetRoots: [componentAssetRoot],
    });

    assert.ok(fs.existsSync(path.join(output, 'assets', 'ui-media', `${pixelHash.slice(0, 12)}-ui-pixel.png`)));
    assert.ok(fs.existsSync(path.join(output, 'assets', 'ui-media', `${pixelHash.slice(0, 12)}-component-pixel.png`)));
});

test('requires one explicit component asset root per component', () => {
    const base = folder();
    const input = sources(base);
    assert.throws(() => publishPrdHtml(input.ux, input.design, path.join(base, 'prd'), {
        layoutFile: input.layout,
        uiFile: input.ui,
        componentFile: input.component,
        componentAssetRoots: [base, base],
    }), /Each component requires exactly one --component-asset-root/);
});

test('invalid UX input preserves the prior valid publication', () => {
    const base = folder();
    const input = sources(base);
    const output = path.join(base, 'prd');
    publishPrdHtml(input.ux, input.design, output, {layoutFile: input.layout});
    const before = snapshot(output);
    const invalid = uxFixture();
    invalid.features[0].surfaceRefs = ['missing'];
    fs.writeFileSync(input.ux, `${JSON.stringify(invalid, null, 2)}\n`);

    assert.throws(() => publishPrdHtml(input.ux, input.design, output, {layoutFile: input.layout}), /references missing id/);
    assert.deepEqual(snapshot(output), before);
});

test('refuses to replace unowned PRD output', () => {
    const base = folder();
    const input = sources(base);
    const output = path.join(base, 'prd');
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, 'index.html'), '<h1>Owner document</h1>');

    assert.throws(() => publishPrdHtml(input.ux, input.design, output, {layoutFile: input.layout}), /unowned generated file/);
    assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), '<h1>Owner document</h1>');
    assert.deepEqual(fs.readdirSync(output), ['index.html']);
});

test('refuses a linked output root', () => {
    const base = folder();
    const input = sources(base);
    const actualOutput = path.join(base, 'actual-prd');
    const linkedOutput = path.join(base, 'linked-prd');
    fs.mkdirSync(actualOutput);
    fs.symlinkSync(actualOutput, linkedOutput, process.platform === 'win32' ? 'junction' : 'dir');

    assert.throws(() => publishPrdHtml(input.ux, input.design, linkedOutput, {layoutFile: input.layout}), /linked output root/);
    assert.deepEqual(fs.readdirSync(actualOutput), []);
});
