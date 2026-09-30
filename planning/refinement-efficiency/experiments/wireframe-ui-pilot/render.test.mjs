import assert from 'node:assert/strict';
import test from 'node:test';
import {renderPreview, validatePreview} from './render.mjs';

function component(id, template, parameters, placement) {
	return {
		id,
		kind: 'component',
		templateRef: {id: template, version: '1'},
		state: 'default',
		parameters,
		...(placement ? {placement} : {}),
	};
}
function region(id, children, rows, columns = [{unit: 'fr', value: 1}]) {
	return {
		id,
		kind: 'region',
		label: id,
		layout: {mode: 'grid', rows, columns, gap: 12, padding: 20, align: 'stretch', justify: 'start'},
		children,
	};
}
function fixture() {
	return {
		schemaVersion: 'wireframe-ui-pilot-1',
		elementId: 'save-clip',
		revision: 1,
		sourceFlowRefs: ['ux4:flow:save-clip'],
		sourceActionRefs: ['ux4:action:save-clip'],
		parts: [
			{
				id: 'dialog',
				root: region(
					'save-dialog',
					[
						component('title', 'heading', {text: 'Save clip'}),
						component('name', 'text-field', {label: 'Clip name', value: 'Opening sequence'}),
						{...component('save', 'button', {label: 'Save clip'}), actionRef: 'ux4:action:save-clip'},
					],
					[{unit: 'content'}, {unit: 'content'}, {unit: 'content'}],
				),
			},
		],
		scenes: [
			{
				id: 'save',
				name: 'Save clip',
				partRef: 'dialog',
				changes: [],
				presentation: 'dialog',
				viewport: {width: 480, height: 280},
			},
		],
		ui: {
			theme: {primary: '#305eab'},
			sceneChanges: [
				{
					sceneRef: 'save',
					changes: [
						{nodeRef: 'save-dialog', set: {surfaceTreatment: 'elevation-1'}},
						{nodeRef: 'name', set: {state: 'focus'}},
					],
				},
			],
		},
	};
}

test('renders the same immutable dialog as neutral wireframe and styled UI with native controls', () => {
	const document = fixture(),
		before = JSON.stringify(document);
	assert.deepEqual(validatePreview(document), {valid: true, errors: []});
	const wireframe = renderPreview(document),
		ui = renderPreview(document, {mode: 'ui'});
	assert.equal(renderPreview(document).html, wireframe.html);
	assert.equal(JSON.stringify(document), before);
	assert.deepEqual(ui.sceneIds, ['save']);
	assert.match(wireframe.html, /Provisional experiment/);
	assert.match(wireframe.html, /unreviewed source UX/);
	assert.match(wireframe.html, /<dialog[^>]+open aria-modal="true"/);
	assert.match(wireframe.html, /<label for="ui-field-name">Clip name<\/label>/);
	assert.match(wireframe.html, /grid-template-rows:max-content max-content max-content/);
	assert.match(ui.html, /--pilot-primary:#305eab/);
	assert.match(ui.html, /ui-surface-elevation-1/);
	assert.match(ui.html, /ui-text-field\s+ui-is-focus/);
	assert.doesNotMatch(wireframe.html, /<link|<script|<iframe| src=/);
	assert.doesNotMatch(wireframe.html, /class="[^"]*ui-surface-elevation-1/);
});

test('renders elevated dialog surfaces and failed status while retaining neutral wireframes', () => {
	const document = fixture();
	document.parts[0].root.surfaceTreatment = 'elevation-2';
	document.parts[0].root.children[1] = {
		...component('failure', 'status', {text: 'Update failed. Nothing changed.'}),
		state: 'failed',
	};
	document.ui = {theme: {surface: '#F7F7FC', danger: '#D32F2F'}};
	const ui = renderPreview(document, {mode: 'ui'}).html;
	const wireframe = renderPreview(document, {mode: 'wireframe'}).html;
	assert.match(ui, /<dialog class="ui-scene-root\s+ui-surface-elevation-2"/);
	assert.match(ui, /--pilot-surface:#F7F7FC/);
	assert.match(ui, /dialog\.ui-scene-root\{background:var\(--pilot-surface\)\}/);
	assert.match(ui, /dialog\.ui-scene-root:not\(\.ui-surface-outlined\)\{border:0\}/);
	assert.match(
		ui,
		/\.ui-surface-elevation-2\{box-shadow:0px 3px 1px -2px rgba\(0,0,0,\.2\),0px 2px 2px 0px rgba\(0,0,0,\.14\),0px 1px 5px 0px rgba\(0,0,0,\.12\)\}/,
	);
	assert.match(ui, /ui-status\s+ui-is-failed/);
	assert.match(
		ui,
		/\.ui-status\.ui-is-failed,[^{]+\{border-color:var\(--pilot-danger\);background:color-mix\(in srgb,var\(--pilot-danger\) 12%,var\(--pilot-surface\)\)/,
	);
	assert.match(ui, /\.pilot-scroll:has\(dialog\.ui-scene-root\)\{padding:16px\}/);
	assert.match(wireframe, /--pilot-surface:#ffffff/);
	assert.match(wireframe, /--pilot-danger:#333333/);
	assert.match(wireframe, /\.ui-surface-elevation-1,\.ui-surface-elevation-2\{box-shadow:none\}/);
	assert.doesNotMatch(wireframe, /padding:16px\}\.ui-viewport:has/);
});

test('retains outlined field treatment, state colors and bare source action references', () => {
	const document = fixture();
	document.sourceFlowRefs = ['save-clip'];
	document.sourceActionRefs = ['save-clip'];
	document.parts[0].root.children[2].actionRef = 'save-clip';
	document.ui.theme = {
		primary: '#B87152',
		onPrimary: '#000000',
		surface: '#F7F7FC',
		danger: '#D32F2F',
		fieldLabel: '#636365',
		fieldBorder: '#BEBEC2',
		fieldRadius: 4,
	};
	document.scenes.push({
		...structuredClone(document.scenes[0]),
		id: 'error',
		changes: [
			{
				nodeRef: 'name',
				set: {state: 'error', parameters: {label: 'Clip name', value: '', helperText: 'Enter a clip name.'}},
			},
		],
	});
	assert.deepEqual(validatePreview(document, {mode: 'ui'}), {valid: true, errors: []});
	const focus = renderPreview(document, {mode: 'ui', sceneId: 'save'}).html;
	const error = renderPreview(document, {mode: 'ui', sceneId: 'error'}).html;
	assert.match(focus, /--pilot-onPrimary:#000000/);
	assert.match(focus, /color:var\(--pilot-onPrimary\)/);
	assert.match(focus, /--pilot-fieldBorder:#BEBEC2/);
	assert.match(focus, /--pilot-fieldLabel:#636365/);
	assert.match(
		focus,
		/\.ui-text-field label\{position:absolute;top:0;left:8px;[^}]*background:var\(--pilot-surface\)/,
	);
	assert.match(focus, /ui-text-field\s+ui-is-focus/);
	assert.match(focus, /\.ui-text-field\.ui-is-focus input,[^{]+\{border-width:2px/);
	assert.match(error, /ui-text-field\s+ui-is-error/);
	assert.match(
		error,
		/--pilot-field-state-border:var\(--pilot-danger\);--pilot-field-state-label:var\(--pilot-danger\)/,
	);
	assert.match(error, /Enter a clip name\./);
});

test('renders coherent timeline geometry and state variations without repeating its part', () => {
	const document = fixture();
	document.elementId = 'timeline';
	document.parts = [
		{
			id: 'timeline',
			root: region(
				'timeline-root',
				[
					component(
						'ruler',
						'visual',
						{role: 'label', text: '00:00       00:10       00:20'},
						{row: 1, column: 1, columnSpan: 12},
					),
					component(
						'track',
						'visual',
						{role: 'surface', variant: 'grid'},
						{row: 2, column: 1, columnSpan: 12},
					),
					component(
						'clip-a',
						'visual',
						{role: 'item', text: 'Interview', variant: 'selected'},
						{row: 2, column: 2, columnSpan: 4},
					),
					component('clip-b', 'visual', {role: 'item', text: 'B-roll'}, {row: 2, column: 8, columnSpan: 3}),
					component(
						'playhead',
						'visual',
						{role: 'indicator', accessibleLabel: 'Playhead at 00:10'},
						{row: 1, column: 6, rowSpan: 2},
					),
					component('play', 'icon-button', {accessibleLabel: 'Play', glyph: '▶'}, {row: 3, column: 1}),
				],
				[
					{unit: 'px', value: 28},
					{unit: 'fr', value: 1},
					{unit: 'px', value: 40},
				],
				Array.from({length: 12}, () => ({unit: 'fr', value: 1})),
			),
		},
	];
	document.scenes = [
		{id: 'selected', name: 'Selected clip', partRef: 'timeline', changes: [], viewport: {width: 900, height: 250}},
		{
			id: 'dragging',
			name: 'Dragging clip',
			partRef: 'timeline',
			changes: [{nodeRef: 'clip-a', set: {placement: {row: 2, column: 3, columnSpan: 4}}}],
			viewport: {width: 900, height: 250},
		},
	];
	document.ui = {theme: {primary: '#315da8'}};
	const result = renderPreview(document, {mode: 'ui', sceneId: 'dragging'});
	assert.deepEqual(result.sceneIds, ['dragging']);
	assert.match(result.html, /grid-column:3 \/ span 4/);
	assert.match(result.html, /grid-row:1 \/ span 2;grid-column:6 \/ span 1/);
	assert.match(result.html, /ui-visual--indicator/);
	assert.match(result.html, /aria-label="Play"/);
});

test('disabled trim handles become muted without changing their geometry or selected clip treatment', () => {
	const document = fixture();
	document.parts[0].root.children = [
		component('clip', 'visual', {role: 'item', variant: 'selected', text: 'Selected clip'}, {row: 1, column: 1}),
		{...component('start', 'visual', {role: 'start-handle'}, {row: 1, column: 1}), state: 'disabled'},
		{...component('end', 'visual', {role: 'end-handle'}, {row: 1, column: 1}), state: 'disabled'},
	];
	document.ui = {theme: {primary: '#B87152', muted: '#636365'}};
	const before = structuredClone(document);
	const ui = renderPreview(document, {mode: 'ui'}).html;
	const wireframe = renderPreview(document, {mode: 'wireframe'}).html;
	assert.deepEqual(document, before);
	assert.match(ui, /ui-is-disabled ui-visual--start-handle/);
	assert.match(ui, /ui-is-disabled ui-visual--end-handle/);
	assert.match(
		ui,
		/\.ui-visual--start-handle\.ui-is-disabled,\.ui-visual--end-handle\.ui-is-disabled\{background:var\(--pilot-muted\);opacity:\.45\}/,
	);
	assert.match(
		ui,
		/\.ui-visual--start-handle,\.ui-visual--end-handle\{width:9px;background:var\(--pilot-primary\)\}/,
	);
	assert.match(ui, /ui-is-default ui-visual--item ui-visual-variant--selected/);
	assert.match(
		ui,
		/\.ui-visual-variant--selected\.ui-visual--item\{border:3px solid var\(--pilot-primary\);font-weight:700\}/,
	);
	assert.match(wireframe, /--pilot-primary:#333333/);
	assert.match(wireframe, /--pilot-muted:#555555/);
});

test('composes an exact child revision through the existing inline registration path', () => {
	const child = fixture(),
		parent = fixture();
	parent.elementId = 'workspace';
	parent.childRefs = [{templateId: 'save-clip-slot', elementId: child.elementId, revision: child.revision}];
	parent.parts = [
		{
			id: 'workspace',
			root: region(
				'workspace',
				[
					component('workspace-title', 'heading', {text: 'Video workspace'}),
					{
						...component('save-slot', 'save-clip-slot', {}),
						state: 'save',
						placeholder: {label: 'Save clip', description: 'Exact saved dialog revision'},
					},
				],
				[
					{unit: 'px', value: 32},
					{unit: 'fr', value: 1},
				],
			),
		},
	];
	parent.scenes = [
		{
			id: 'workspace',
			name: 'Workspace composition',
			partRef: 'workspace',
			changes: [],
			viewport: {width: 720, height: 420},
		},
	];
	parent.ui = {theme: {primary: '#315da8'}};
	const options = {mode: 'ui', references: {'save-clip@1': child}};
	assert.deepEqual(validatePreview(parent, options), {valid: true, errors: []});
	const output = renderPreview(parent, options);
	assert.match(output.html, /ui-complex-component/);
	assert.match(output.html, /Video workspace/);
	assert.match(output.html, /Opening sequence/);
	assert.doesNotMatch(output.html, /<iframe/);
});
