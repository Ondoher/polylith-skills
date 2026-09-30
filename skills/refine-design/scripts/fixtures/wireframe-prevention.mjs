import {wireframeCapabilities} from '../wireframe-contract.mjs';

export function component(id, template, parameters, state = 'default') {
	return {id, kind: 'component', templateRef: {id: template, version: '1'}, state, parameters};
}
export function region(id, children, height = 60) {
	return {
		id,
		kind: 'region',
		label: id,
		layout: {
			mode: 'grid',
			columns: [{unit: 'fr', value: 1}],
			rows: children.map(() => ({unit: 'px', value: height})),
			gap: 16,
			padding: 16,
			align: 'stretch',
			justify: 'stretch',
		},
		children,
	};
}
export function envelope(id, root, width = 640, height = 480) {
	return {
		schemaVersion: 'wireframe-ui-pilot-1',
		elementId: id,
		revision: 1,
		sourceFlowRefs: ['fixture-flow'],
		sourceActionRefs: [],
		parts: [{id: 'main', root}],
		scenes: [{id: 'main', name: id, partRef: 'main', changes: [], viewport: {width, height}}],
		ui: {theme: {primary: '#6535a0', accent: '#117755', danger: '#b12244', surface: '#fffdf8'}},
	};
}

// Reduced from the chooser and handle failure mechanisms; no product-specific behavior.
export function stateSheet() {
	const rows = [];
	for (const template of ['choice-group', 'visual', 'button', 'button-secondary', 'icon-button', 'text-field']) {
		const children = wireframeCapabilities.states[template].map((state) =>
			component(
				`${template}-${state}`,
				template,
				template === 'choice-group'
					? {
							label: 'Category',
							presentation: 'listbox',
							options: [
								{id: 'a', label: 'Alpha'},
								{id: 'b', label: 'Beta'},
							],
							selectedId: 'a',
						}
					: template === 'visual'
						? {role: 'start-handle', accessibleLabel: 'Range start'}
						: template === 'text-field'
							? {label: 'Record name', value: 'Sample', helperText: 'Enter a name'}
							: template === 'icon-button'
								? {glyph: '+', accessibleLabel: 'Create'}
								: {label: 'Save'},
				state,
			),
		);
		const row = region(template + '-row', children);
		row.layout.rows = [{unit: 'px', value: template === 'choice-group' ? 148 : 72}];
		row.layout.columns = children.map(() => ({unit: 'fr', value: 1}));
		children.forEach((node, index) => {
			node.placement = {row: 1, column: index + 1};
		});
		rows.push(row);
	}
	const selected = region('selected-parent', [
		component('selection', 'visual', {role: 'selection'}, 'selected'),
		component('nested-focus', 'visual', {role: 'start-handle'}, 'focus'),
	]);
	selected.layout.rows = [{unit: 'px', value: 44}];
	selected.children.forEach((n) => {
		n.placement = {row: 1, column: 1};
	});
	rows.push(selected);
	const root = region('states', rows);
	root.layout.rows = rows.map(() => ({unit: 'content'}));
	return envelope('component-states', root, 1150, 1100);
}

export function scaleSheet(width = 640, domain = {min: 0, max: 60}, interval = {start: 12, end: 42}) {
	const nodes = [
		{
			...component('start-label', 'visual', {role: 'label', text: String(interval.start)}),
			scalePosition: {start: interval.start},
			placement: {row: 1, column: 1},
		},
		{
			...component('end-label', 'visual', {role: 'label', text: String(interval.end)}),
			scalePosition: {start: interval.end},
			placement: {row: 1, column: 1},
		},
		{
			...component('range', 'visual', {role: 'item', text: 'Sample interval'}),
			scalePosition: interval,
			placement: {row: 2, column: 1},
		},
		{
			...component('marker', 'visual', {role: 'indicator'}),
			scalePosition: {start: interval.start},
			placement: {row: 3, column: 1},
		},
	];
	const root = region('axis', nodes, 36);
	root.layout.rows = [
		{unit: 'px', value: 36},
		{unit: 'px', value: 36},
		{unit: 'px', value: 36},
	];
	root.layout.scale = domain;
	return envelope('numeric-range', root, width, 180);
}

export function outcomeFixture() {
	const packet = {
		flows: [
			{id: 'create', outcome: 'A new record is visible.'},
			{id: 'update', outcome: 'The edited name is visible.'},
			{id: 'navigate', outcome: 'Show record details without changing data.'},
			{id: 'cancel', outcome: 'Retain the original name.'},
		],
		facts: {createdName: 'Morning notes', updatedName: 'Revised notes', originalName: 'Draft notes'},
	};
	const document = envelope(
		'record-editor',
		region('record-form', [
			component('result', 'text', {text: packet.facts.createdName}),
			component('edited', 'text-field', {label: 'Name', value: packet.facts.updatedName}),
			component('destination', 'heading', {text: 'Record details'}),
			component('retained', 'text', {text: packet.facts.originalName}),
			component('message', 'status', {text: 'Saved'}, 'success'),
		]),
		500,
		450,
	);
	document.outcomeEvidence = packet.flows.map((flow, index) => ({
		sourcePath: `/flows/${index}/outcome`,
		sceneRef: 'main',
		nodeRefs: [['result'], ['edited'], ['destination'], ['retained']][index],
		resultKind: ['visible-change', 'visible-change', 'navigation', 'unchanged'][index],
	}));
	document.outcomeEvidence[0].values = [{nodeRef: 'result', parameter: 'text', sourcePath: '/facts/createdName'}];
	document.outcomeEvidence[1].values = [{nodeRef: 'edited', parameter: 'value', sourcePath: '/facts/updatedName'}];
	return {document, packet};
}
