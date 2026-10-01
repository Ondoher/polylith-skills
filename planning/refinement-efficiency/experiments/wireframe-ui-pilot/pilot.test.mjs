import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WorkflowService} from '../../../../scripts/mcp/WorkflowService.mjs';
import {PilotStore} from './PilotStore.mjs';
import {scopeBasisFixture} from '../../../../skills/refine-design/scripts/fixtures/wireframe-scope.mjs';

function publish(store, draft, stage = 'wireframe') {
	const result = store.submit(
		{elementId: draft.elementId, revision: draft.revision, inspected: true},
		{scope: {role: stage}},
	);
	if (stage === 'wireframe')
		store.review(
			{elementId: draft.elementId, revision: draft.revision, verdict: 'pass', findings: []},
			{scope: {role: 'wireframe-review', elementId: draft.elementId, revision: draft.revision}},
		);
	return result;
}
function revisionFixture(workspace) {
	const context = {scopeBasis: scopeBasisFixture('save-clip', 'flow:save-clip'), flows: [{id: 'save-clip'}]};
	const store = new PilotStore({workspace, context});
	const wireframeOwner = {scope: {role: 'wireframe'}};
	store.setScope(
		{
			elements: [
				{
					id: 'save-clip',
					disposition: 'update',
					impactRefs: ['confirm-save'],
					changeReason: 'Revised save form',
					sourceFlowRefs: ['save-clip'],
					requiredStates: ['ready'],
				},
			],
		},
		wireframeOwner,
	);
	const root = {
		id: 'root',
		kind: 'region',
		label: 'Save clip',
		layout: {
			mode: 'grid',
			columns: [{unit: 'fr', value: 1}],
			rows: [{unit: 'content'}],
			gap: 12,
			padding: 20,
			align: 'stretch',
			justify: 'start',
		},
		children: [
			{
				id: 'save',
				kind: 'component',
				templateRef: {id: 'button', version: '1'},
				state: 'default',
				parameters: {label: 'Save clip'},
			},
		],
	};
	let original = store.contribute(
		{
			elementId: 'save-clip',
			parts: [{id: 'dialog', root}],
			scenes: [
				{
					id: 'ready',
					name: 'Ready to save',
					partRef: 'dialog',
					changes: [],
					viewport: {width: 480, height: 240},
				},
			],
			finish: true,
		},
		wireframeOwner,
	);
	assert.equal(original.previewReady, true);
	original = publish(store, original);
	return {store, context, wireframeOwner, original};
}

test('active UI work stays pinned when newer wireframes supersede queued receipts', () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wireframe-pinned-'));
	try {
		const {store, wireframeOwner, original} = revisionFixture(workspace);
		const owner = {scope: {role: 'ui', elementId: 'save-clip', wireframeRevision: original.revision}};
		store.contribute({elementId: 'save-clip', set: {ui: {theme: {primary: '#B87152'}}}}, owner);
		const second = store.contribute(
			{elementId: 'save-clip', set: {purpose: 'Updated purpose'}, finish: true},
			wireframeOwner,
		);
		publish(store, second);
		const third = store.contribute(
			{elementId: 'save-clip', set: {purpose: 'Latest purpose'}, finish: true},
			wireframeOwner,
		);
		publish(store, third);
		const finished = store.contribute(
			{
				elementId: 'save-clip',
				nodeChanges: [{sceneRef: 'ready', nodeRef: 'root', set: {surfaceTreatment: 'outlined'}}],
				finish: true,
			},
			owner,
		);
		assert.equal(finished.previewReady, true);
		const saved = store.latest('save-clip', 'ui');
		assert.equal(saved.sourceWireframeRevision, original.revision);
		assert.equal(saved.purpose, undefined);
		assert.deepEqual(store.uiDispatchDecision(second), {
			needed: false,
			reason: 'superseded',
			wireframeRevision: third.revision,
		});
		assert.equal(store.uiDispatchDecision(third).needed, true);
		assert.equal(JSON.parse(fs.readFileSync(original.path)).purpose, undefined);
	} finally {
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});

test('resume rebases outdated completed UI onto the ready wireframe while retaining saved visual overrides', () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wireframe-rebase-'));
	try {
		const {store, context, wireframeOwner, original} = revisionFixture(workspace);
		const firstUi = store.contribute(
			{
				elementId: 'save-clip',
				set: {ui: {theme: {primary: '#B87152', onPrimary: '#000000'}}},
				nodeChanges: [{sceneRef: 'ready', nodeRef: 'root', set: {surfaceTreatment: 'outlined'}}],
				finish: true,
			},
			{scope: {role: 'ui', elementId: 'save-clip', wireframeRevision: original.revision}},
		);
		assert.equal(firstUi.previewReady, true);
		publish(store, firstUi, 'ui');
		const readyWireframe = store.contribute(
			{
				elementId: 'save-clip',
				nodeChanges: [{sceneRef: 'ready', nodeRef: 'save', set: {parameters: {label: 'Save named clip'}}}],
				finish: true,
			},
			wireframeOwner,
		);
		publish(store, readyWireframe);
		const resumed = new PilotStore({workspace, context});
		assert.equal(resumed.uiDispatchDecision(readyWireframe).needed, true);
		const nextUi = resumed.contribute(
			{elementId: 'save-clip', set: {ui: {theme: {fieldRadius: 4}}}, finish: true},
			{scope: {role: 'ui', elementId: 'save-clip', wireframeRevision: readyWireframe.revision}},
		);
		assert.equal(nextUi.previewReady, true);
		publish(resumed, nextUi, 'ui');
		const saved = resumed.latest('save-clip', 'ui');
		assert.equal(saved.sourceWireframeRevision, readyWireframe.revision);
		assert.deepEqual(saved.ui.theme, {primary: '#B87152', onPrimary: '#000000', fieldRadius: 4});
		assert.deepEqual(saved.ui.sceneChanges, [
			{sceneRef: 'ready', changes: [{nodeRef: 'root', set: {surfaceTreatment: 'outlined'}}]},
		]);
		assert.match(fs.readFileSync(nextUi.previewPath, 'utf8'), /Save named clip/);
		assert.deepEqual(resumed.uiDispatchDecision(readyWireframe), {
			needed: false,
			reason: 'complete',
			wireframeRevision: readyWireframe.revision,
			sourceWireframeRevision: readyWireframe.revision,
		});
		assert.equal(JSON.parse(fs.readFileSync(firstUi.path)).sourceWireframeRevision, original.revision);
	} finally {
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});

test('progressive saved wireframe is delivered by exact handle and UI adds only its visual delta', async () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wireframe-pilot-'));
	try {
		const events = [];
		const captured = [];
		const store = new PilotStore({
			workspace,
			context: {scopeBasis: scopeBasisFixture('save-clip', 'flow:save-clip'), flows: [{id: 'save-clip'}]},
			event: (event) => events.push(event),
			preview: async (receipt) => {
				assert.equal(receipt.previewReady, true);
				assert.equal(fs.existsSync(receipt.previewPath), true);
				captured.push({stage: receipt.stage, revision: receipt.revision});
				await Promise.resolve();
				return receipt.previewPath.replace(/\.html$/, '.png');
			},
		});
		const service = new WorkflowService({workspace, operations: store.operations()});
		const run = 'pilot';
		service.open({access: service.ownerAccess, run});
		const author = service.assign({
			access: service.ownerAccess,
			run,
			operations: ['pilot.scope', 'pilot.contribute'],
			scope: {role: 'wireframe'},
		});
		await service.execute({
			access: author.access,
			run,
			operation: 'pilot.scope',
			input: {
				elements: [
					{
						id: 'save-clip',
						disposition: 'update',
						impactRefs: ['confirm-save'],
						changeReason: 'Changed save result',
						sourceFlowRefs: ['save-clip'],
						requiredStates: ['ready'],
					},
				],
			},
		});
		const root = {
			id: 'root',
			kind: 'region',
			label: 'Save clip',
			layout: {
				mode: 'grid',
				columns: [{unit: 'fr', value: 1}],
				rows: [{unit: 'content'}],
				gap: 12,
				padding: 20,
				align: 'stretch',
				justify: 'start',
			},
			children: [
				{
					id: 'save',
					kind: 'component',
					templateRef: {id: 'button', version: '1'},
					state: 'default',
					parameters: {label: 'Save clip'},
				},
			],
		};
		await service.execute({
			access: author.access,
			run,
			operation: 'pilot.contribute',
			input: {elementId: 'save-clip', parts: [{id: 'dialog', root}]},
		});
		const finished = await service.execute({
			access: author.access,
			run,
			operation: 'pilot.contribute',
			input: {
				elementId: 'save-clip',
				scenes: [
					{
						id: 'ready',
						name: 'Ready to save',
						partRef: 'dialog',
						changes: [],
						viewport: {width: 480, height: 240},
					},
				],
				finish: true,
			},
		});
		assert.equal(finished.inline.previewReady, true);
		publish(store, finished.inline);
		assert.equal(finished.inline.revision, 2);
		assert.equal(finished.inline.screenshot, finished.inline.previewPath.replace(/\.html$/, '.png'));
		assert.equal(
			JSON.parse(fs.readFileSync(path.join(workspace, 'outputs/save-clip/wireframe-ready.json'))).screenshot,
			finished.inline.screenshot,
		);
		const bytes = fs.readFileSync(finished.inline.path, 'utf8');
		const handle = service.store({access: service.ownerAccess, run, file: finished.inline.path});
		const ui = service.assign({
			access: service.ownerAccess,
			run,
			handles: [handle.handle],
			operations: ['pilot.contribute'],
			scope: {role: 'ui', elementId: 'save-clip', wireframeRevision: 2},
		});
		assert.deepEqual(
			JSON.parse(service.read({access: ui.access, handle: handle.handle, maxBytes: 6000}).text),
			JSON.parse(bytes),
		);
		const comp = await service.execute({
			access: ui.access,
			run,
			operation: 'pilot.contribute',
			input: {elementId: 'save-clip', set: {ui: {theme: {primary: '#B87152'}}}, finish: true},
		});
		assert.equal(comp.inline.previewReady, true);
		assert.equal(comp.inline.screenshot, comp.inline.previewPath.replace(/\.html$/, '.png'));
		assert.deepEqual(captured, [
			{stage: 'wireframe', revision: 2},
			{stage: 'ui', revision: 1},
		]);
		assert.match(fs.readFileSync(comp.inline.previewPath, 'utf8'), /--pilot-primary:#B87152/);
		assert.equal(fs.readFileSync(finished.inline.path, 'utf8'), bytes);
		assert.deepEqual(
			events.filter((event) => event.type === 'draft-preview').map((event) => event.stage),
			['wireframe', 'ui'],
		);
		await service.drain();
	} finally {
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});
