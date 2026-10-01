import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {dialogPart, wireframePacket, editPart} from './wireframe-contract.mjs';
import {renderPreview, validatePreview} from './wireframe-preview.mjs';
import {WireframeStore} from './wireframe-store.mjs';
import {scopeBasisFixture} from './fixtures/wireframe-scope.mjs';

const node = (id, template, parameters, actionRef) => ({
	id,
	kind: 'component',
	templateRef: {id: template, version: '1'},
	state: 'default',
	parameters,
	...(actionRef ? {actionRef} : {}),
});
const element = {
	id: 'add-dialog',
	impactRefs: ['confirm-save'],
	disposition: 'update',
	changeReason: 'Content selection changed',
	sourceFlowRefs: ['edit'],
	sourceActionRefs: ['choose', 'add'],
	componentRefs: ['confirmation'],
	stateRefs: ['draft'],
	requiredStates: ['ready'],
	frameRefs: ['add'],
};
const context = {
	scopeBasis: scopeBasisFixture('add-dialog', 'action:add'),
	approval: 'unreviewed',
	components: [{id: 'confirmation', description: 'Show insertion destination'}],
	states: [{id: 'draft', description: 'Retain staged values'}],
	flows: [{id: 'edit', steps: [{id: 'choose-step', actionRef: 'choose', response: 'Stage a specific item.'}]}],
	actions: [
		{id: 'choose', outcome: 'An item is staged'},
		{id: 'add', outcome: 'Insert staged item'},
	],
	interactionFrames: [{id: 'add', regions: [{affordances: [{id: 'choose', actionRef: 'choose'}]}]}],
};
function document() {
	return {
		schemaVersion: 'wireframe-ui-pilot-1',
		elementId: 'add-dialog',
		revision: 1,
		sourceFlowRefs: ['edit'],
		sourceActionRefs: ['choose', 'add'],
		parts: [
			dialogPart({
				id: 'dialog',
				header: [node('title', 'heading', {text: 'Add content'})],
				body: [
					node(
						'items',
						'choice-group',
						{
							label: 'Available items',
							presentation: 'listbox',
							options: [
								{
									id: 'one',
									label: 'A named clip with a long descriptive name',
									secondary: 'Independent copy',
								},
								{id: 'two', label: 'Another clip'},
							],
							selectedId: 'one',
						},
						'choose',
					),
				],
				footer: [node('add', 'button', {label: 'Add'}, 'add')],
			}),
		],
		scenes: [
			{
				id: 'ready',
				name: 'Ready',
				partRef: 'dialog',
				changes: [],
				presentation: 'dialog',
				viewport: {width: 500, height: 460},
			},
		],
	};
}

test('shared packet preserves source meaning and a dialog renders actual selection with content-sized sections', () => {
	const packet = wireframePacket(context, element);
	assert.deepEqual(packet.flows[0].steps, context.flows[0].steps);
	assert.equal(packet.sourceUxApproval, 'unreviewed');
	const doc = document();
	const preview = renderPreview(doc);
	assert.match(preview.html, /role="option" aria-selected="true"/);
	assert.match(preview.html, /data-ui-node="dialog-body"/);
	assert.match(preview.html, /overflow:auto/);
	assert.deepEqual(new Set(preview.coverage.map((x) => x.actionRef)), new Set(['choose', 'add']));
	const edited = editPart(doc.parts, [{partRef: 'dialog', nodeRef: 'add', set: {parameters: {label: 'Insert'}}}]);
	assert.equal(doc.parts[0].root.children[2].children[0].parameters.label, 'Add');
	assert.equal(edited[0].root.children[2].children[0].parameters.label, 'Insert');
});

test('choice focus and disabled controls render the supported states', () => {
	const doc = document();
	doc.parts = editPart(doc.parts, [{partRef: 'dialog', nodeRef: 'items', set: {state: 'focus'}}]);
	const focused = renderPreview(doc);
	assert.match(focused.html, /ui-choice-group\s+ui-is-focus/);
	assert.match(focused.html, /\.ui-choice-group\.ui-is-focus,\.ui-visual\.ui-is-focus\{outline:2px/);
	doc.parts = editPart(doc.parts, [
		{partRef: 'dialog', nodeRef: 'items', set: {state: 'disabled'}},
		{partRef: 'dialog', nodeRef: 'add', set: {state: 'disabled'}},
	]);
	const disabled = renderPreview(doc);
	assert.equal((disabled.html.match(/aria-disabled="true"/g) ?? []).length, 2);
	assert.match(disabled.html, /background:var\(--pilot-disabledBackground\)/);
	assert.match(disabled.html, /\.ui-button-secondary:disabled\{background:var\(--pilot-surface\)/);
});

test('inspected submission and independent acceptance release exact UI work once and survive resume', () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-reliable-'));
	try {
		const store = new WireframeStore({workspace, context});
		const author = {scope: {role: 'wireframe', elementId: element.id}};
		store.setScope({elements: [element]}, author);
		const doc = document();
		const draft = store.contribute(
			{elementId: element.id, parts: doc.parts, scenes: doc.scenes, finish: true},
			author,
		);
		assert.equal(draft.previewReady, true);
		assert.equal(draft.ready, false);
		const submitted = store.submit({elementId: element.id, revision: draft.revision, inspected: true}, author);
		assert.equal(store.uiDispatchDecision(submitted).reason, 'awaiting-wireframe-review');
		const reviewer = {scope: {role: 'wireframe-review', elementId: element.id, revision: draft.revision}};
		store.review({elementId: element.id, revision: draft.revision, verdict: 'pass', findings: []}, reviewer);
		const resumed = new WireframeStore({workspace, context});
		assert.equal(resumed.uiDispatchDecision(submitted).needed, true);
		const ui = {scope: {role: 'ui', elementId: element.id, wireframeRevision: draft.revision}};
		const comp = resumed.contribute(
			{elementId: element.id, set: {ui: {theme: {primary: '#123456'}}}, finish: true},
			ui,
		);
		resumed.submit({elementId: element.id, revision: comp.revision, inspected: true}, ui);
		assert.equal(resumed.uiDispatchDecision(submitted).reason, 'complete');
		// A new global revision requires fresh scope but leaves identical local acceptance reusable.
		const unrelated = structuredClone(context);
		unrelated.sourceBinding = {revision: 99};
		unrelated.scopeBasis.currentSources[0].revision = 'next';
		unrelated.scopeBasis.currentSources[0].records.unrelated = 'An unrelated screen changed';
		const refreshed = new WireframeStore({workspace, context: unrelated});
		assert.equal(refreshed.scope, null);
		refreshed.setScope({elements: [element]}, author);
		assert.equal(refreshed.accepted(element.id, 'wireframe', draft.revision), true);
		assert.equal(refreshed.uiDispatchDecision(submitted).reason, 'complete');
		assert.equal(refreshed.packet(element.id).components[0].id, 'confirmation');
		assert.equal(refreshed.packet(element.id).states[0].id, 'draft');
		for (const collection of ['components', 'states']) {
			const relevant = structuredClone(unrelated);
			relevant[collection][0].description = 'A changed relevant interface fact';
			const changed = new WireframeStore({workspace, context: relevant});
			changed.setScope({elements: [element]}, author);
			assert.equal(changed.accepted(element.id, 'wireframe', draft.revision), false);
		}
	} finally {
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});

test('actual unsupported status and rejected wireframe remain local repairs without UI authorization', () => {
	const doc = document();
	doc.parts[0].root.children[1].children.push({
		...node('failure', 'status', {text: 'Insertion failed'}),
		state: 'error',
	});
	const validation = validatePreview(doc);
	assert.equal(validation.valid, false);
	assert.match(validation.errors.join(' '), /failure: status state 'error' unsupported/);
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-rejection-'));
	try {
		const store = new WireframeStore({workspace, context});
		const author = {scope: {role: 'wireframe'}};
		store.setScope({elements: [element]}, author);
		const valid = document();
		const draft = store.contribute(
			{elementId: element.id, parts: valid.parts, scenes: valid.scenes, finish: true},
			author,
		);
		store.submit({elementId: element.id, revision: draft.revision, inspected: true}, author);
		store.review(
			{
				elementId: element.id,
				revision: draft.revision,
				verdict: 'revise',
				findings: [{id: 'usage', issue: 'Repair usage'}],
			},
			{scope: {role: 'wireframe-review', elementId: element.id, revision: draft.revision}},
		);
		assert.equal(store.uiDispatchDecision(draft).reason, 'awaiting-wireframe-review');
		assert.throws(
			() =>
				store.contribute(
					{elementId: element.id, set: {ui: {}}},
					{scope: {role: 'ui', elementId: element.id, wireframeRevision: draft.revision}},
				),
			/independently reviewed/,
		);
		assert.equal(store.latest(element.id, 'ui'), null);
	} finally {
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});
