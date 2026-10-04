import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {publishUiCompositionHtml as publishUiCompositionHtmlRaw} from './ui-composition-html.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';
import {canonicalPublicationJson} from './product-publication-payload.mjs';

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
	return [
		'comps/index.html',
		'comps/records-viewing.html',
		'comps/records-viewing-annotated.html',
		'assets/composition.css',
		'ui/render-report.json',
	].map((relative) => [relative, fs.readFileSync(path.join(output, relative))]);
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
	assert.match(clean, /aria-hidden="true"><span class="ui-placeholder-shape"/);
	assert.equal(sceneMarkup(clean), sceneMarkup(annotated));
	assert.doesNotMatch(sceneMarkup(clean), /Shows available records until/);
	assert.doesNotMatch(sceneMarkup(clean), /Record list — placeholder/);
	assert.doesNotMatch(sceneMarkup(clean), /The reusable record-list template has not been designed/);
	assert.match(clean, /<aside class="ui-scene-notes ui-transient-review" aria-label="Interface documentation">/);
	assert.match(clean, /Shows available records until/);
	assert.match(clean, /<h3>Incomplete specification<\/h3>/);
	assert.match(clean, /The reusable record-list template has not been designed/);
	assert.match(annotated, /<h3>Scene nodes<\/h3>/);
	assert.doesNotMatch(before[3][1].toString(), /\[data-ui-annotation\]::before/);
	assert.match(clean, /data-ui-measurement="padding 16px · gap 16px · 1c×2r"/);
	assert.doesNotMatch(before[3][1].toString(), /\[data-ui-measurement\]::after/);
	assert.match(before[3][1].toString(), /#scene:target \{ zoom: \.86; \}/);
	assert.match(before[3][1].toString(), /\.ui-button:disabled, \.ui-icon-button:disabled/);
	assert.match(
		before[3][1].toString(),
		/\.ui-button-text:disabled \{ background: var\(--rd-button-text-disabled-background\); color: var\(--rd-button-text-disabled-foreground\); \}/,
	);
	assert.ok(
		before[3][1].toString().indexOf('.ui-button-text:disabled') >
			before[3][1].toString().indexOf('.ui-button:disabled, .ui-icon-button:disabled'),
	);
	assert.match(before[3][1].toString(), /\.ui-text-field input:disabled/);

	publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output);
	assert.deepEqual(snapshot(output), before);
});

test('renders verified image assets and semantic state on command controls', () => {
	for (const renderer of ['button', 'icon-button']) {
		const base = folder();
		const ui = fixture();
		const assetRoot = path.join(base, 'media');
		fs.mkdirSync(assetRoot);
		const svg =
			'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#222222" d="M4 4h16v16H4z"/></svg>';
		fs.writeFileSync(path.join(assetRoot, 'symbol.svg'), svg);
		ui.assets = [
			{
				id: 'command-symbol',
				kind: 'image',
				status: 'accepted',
				path: 'symbol.svg',
				mimeType: 'image/svg+xml',
				widthPx: 24,
				heightPx: 24,
				sha256: createHash('sha256').update(svg).digest('hex'),
			},
		];
		const template = ui.templates[1];
		template.id = 'symbol-command';
		template.kind = renderer;
		template.availability = 'available';
		template.html = {
			renderer,
			element: 'button',
			className: renderer === 'button' ? 'ui-button' : 'ui-icon-button',
		};
		template.parameters = [
			'label',
			'accessibleLabel',
			'assetId',
			'leadingAssetId',
			'trailingAssetId',
			'pressed',
			'hasPopup',
			'expanded',
		].map((id) => ({id, required: false}));
		template.supportedStates = ['default'];
		const node = ui.parts[0].root.children[1];
		node.templateRef = {id: template.id, version: template.version};
		node.state = 'default';
		node.assetRefs = ['command-symbol'];
		node.parameters = {
			label: 'Open',
			accessibleLabel: 'Open choices',
			pressed: true,
			hasPopup: 'menu',
			expanded: false,
			...(renderer === 'button'
				? {leadingAssetId: 'command-symbol', trailingAssetId: 'command-symbol'}
				: {assetId: 'command-symbol'}),
		};
		delete node.placeholder;
		const input = sources(base, ui);
		const output = path.join(base, 'preview');
		publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output, {assetRoot});
		const clean = fs.readFileSync(path.join(output, 'comps/records-viewing.html'), 'utf8');
		const annotated = fs.readFileSync(path.join(output, 'comps/records-viewing-annotated.html'), 'utf8');
		assert.equal(sceneMarkup(clean), sceneMarkup(annotated));
		assert.match(clean, /aria-haspopup="menu" aria-expanded="false" aria-pressed="true"/);
		assert.match(
			clean,
			/<img class="ui-command-icon"[^>]+symbol\.svg[^>]+alt="" aria-hidden="true" width="24" height="24">/,
		);
		const image = fs.readdirSync(path.join(output, 'assets/ui-media'))[0];
		assert.equal(fs.readFileSync(path.join(output, 'assets/ui-media', image), 'utf8'), svg);
	}
});

test('documents inactive alternate bindings outside the unchanged scene canvas', () => {
	const base = folder();
	const ui = fixture();
	const source = ux();
	const frame = source.interactionFrames.find((item) => item.id === ui.scenes[0].interactionFrameRef);
	const region = frame.regions.find((item) => item.affordances.some((item) => item.id === 'open-record-affordance'));
	region.affordances.push({
		...structuredClone(region.affordances.find((item) => item.id === 'open-record-affordance')),
		id: 'close-record-affordance',
		actionRef: 'close-record',
		order: 2,
	});
	frame.focus.orderRefs.push('close-record-affordance');
	source.actions.push({
		...structuredClone(source.actions.find((item) => item.id === 'open-record')),
		id: 'close-record',
		alternateInputs: [],
		alternateRefs: [],
		feedbackRefs: ['record-closed'],
	});
	source.feedback.push({
		...structuredClone(source.feedback.find((item) => item.actionRef === 'open-record')),
		id: 'record-closed',
		actionRef: 'close-record',
	});
	const flow = source.flows.find((item) => item.id === 'update-record');
	flow.steps.push({
		...structuredClone(flow.steps.find((item) => item.actionRef === 'open-record')),
		id: 'close-record-step',
		actionRef: 'close-record',
	});
	ui.uxArtifactBinding.sha256 = createHash('sha256').update(canonicalPublicationJson(source)).digest('hex');
	ui.parts[0].root.children[1].alternateInteractionBindings = [
		{
			interactionNodeRef: 'close-record-affordance',
			actionRef: 'close-record',
			condition: 'Record is open',
			label: '<Close record>',
		},
	];
	const input = sources(base, ui, source);
	const output = path.join(base, 'preview');
	publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output);
	const clean = fs.readFileSync(path.join(output, 'comps/records-viewing.html'), 'utf8');
	const annotated = fs.readFileSync(path.join(output, 'comps/records-viewing-annotated.html'), 'utf8');
	assert.equal(sceneMarkup(clean), sceneMarkup(annotated));
	assert.doesNotMatch(sceneMarkup(clean), /alternate|Close record/);
	assert.match(annotated, /alternate &lt;Close record&gt; when Record is open/);
	assert.doesNotMatch(annotated, /<Close record>/);
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
		{id: 'label', required: true},
		{id: 'presentation', required: true},
		{id: 'options', required: true},
		{id: 'selectedId', required: false},
		{id: 'disabled', required: false},
	];
	template.sizing = {width: 'fill', height: 'content'};
	const node = ui.parts[0].root.children[1];
	node.templateRef = {id: template.id, version: template.version};
	node.parameters = {
		label: 'Workspace',
		presentation: 'tabs',
		options: [
			{id: 'library', label: 'Library'},
			{id: 'editor', label: 'Editor'},
		],
		selectedId: 'editor',
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
		{id: 'label', required: true},
		{id: 'presentation', required: true},
		{id: 'options', required: true},
		{id: 'selectedId', required: false},
		{id: 'disabled', required: false},
	];
	template.sizing = {width: 'fill', height: 'content'};
	const node = ui.parts[0].root.children[1];
	node.templateRef = {id: template.id, version: template.version};
	node.parameters = {
		label: 'Content',
		presentation: 'list',
		selectedId: 'clip-a',
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
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
		'base64',
	);
	fs.writeFileSync(filePath, png);
	t.after(() => fs.rmSync(filePath, {force: true}));
	ui.assets = [
		{
			id: 'sample-frame',
			kind: 'image',
			status: 'accepted',
			path: fileName,
			mimeType: 'image/png',
			widthPx: 1,
			heightPx: 1,
			sha256: createHash('sha256').update(png).digest('hex'),
		},
	];
	ui.templates[1] = {
		id: 'item-image',
		name: 'Item image',
		kind: 'image',
		version: '1',
		status: 'accepted',
		availability: 'available',
		interaction: 'behavioral',
		html: {renderer: 'image', element: 'div', className: 'ui-image-viewport'},
		supportedStates: ['record-list-available'],
		parameters: [
			{id: 'assetId', required: true},
			{id: 'accessibleLabel', required: true},
			{id: 'fitMode', required: true},
			{id: 'scale', required: false},
			{id: 'offsetX', required: false},
			{id: 'offsetY', required: false},
		],
		sizing: {width: 'fill', height: 'fixed', heightPx: 240},
	};
	const node = ui.parts[0].root.children[1];
	node.templateRef = {id: 'item-image', version: '1'};
	node.parameters = {
		assetId: 'sample-frame',
		accessibleLabel: 'Sample frame',
		fitMode: 'contain',
		scale: 2,
		offsetX: -4,
		offsetY: 3,
	};
	node.assetRefs = ['sample-frame'];
	delete node.placeholder;
	ui.scenes[0].completeness = 'complete';
	ui.parts[0].root.surfaceTreatment = 'elevation-1';
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
	const mediaRelative = report.files.find((relative) => relative.startsWith('assets/ui-media/'));
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
	invalid.scenes[0].stateRef = 'record-list-available';
	fs.writeFileSync(input.uiFile, JSON.stringify(invalid));
	assert.throws(
		() => publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, output),
		/not declared by its UX subject/,
	);
	assert.deepEqual(snapshot(output), before);
});

test('refuses unowned output and linked roots', () => {
	const base = folder();
	const input = sources(base);
	const unowned = path.join(base, 'unowned');
	fs.mkdirSync(path.join(unowned, 'comps'), {recursive: true});
	fs.writeFileSync(path.join(unowned, 'comps', 'index.html'), '<h1>Owner file</h1>');
	assert.throws(
		() => publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, unowned),
		/unowned generated file/,
	);

	const actual = path.join(base, 'actual');
	const linked = path.join(base, 'linked');
	fs.mkdirSync(actual);
	fs.symlinkSync(actual, linked, process.platform === 'win32' ? 'junction' : 'dir');
	assert.throws(
		() => publishUiCompositionHtml(input.uiFile, input.uxFile, input.designFile, linked),
		/linked output root/,
	);
	assert.deepEqual(fs.readdirSync(actual), []);
});

test('renders a transient dialog semantically and documents its interaction contract', () => {
	const base = folder();
	const ui = fixture();
	const uxSource = ux();
	uxSource.surfaces[0].kind = 'dialog';
	ui.uxArtifactBinding.sha256 = createHash('sha256').update(canonicalPublicationJson(uxSource)).digest('hex');
	ui.scenes[0].transientBehavior = {
		presentation: 'dialog',
		focusOrder: ['record-list-instance'],
		initialFocusRef: 'record-list-instance',
		initialFocusRationale: 'First task control.',
		returnFocusRef: 'open-editor-dialog',
		actionGroupRef: 'records-layout',
		cancellation: {escape: 'dismiss', outside: 'ignore', result: 'Dismiss without saving.'},
		height: {mode: 'content', maxPx: 560},
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
