import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WorkflowService} from '../../../../scripts/mcp/WorkflowService.mjs';
import {PilotStore} from './PilotStore.mjs';

test('progressive saved wireframe is delivered by exact handle and UI adds only its visual delta', async () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wireframe-pilot-'));
	try {
		const events = [];
		const store = new PilotStore({
			workspace,
			context: {flows: [{id: 'save-clip'}]},
			event: (event) => events.push(event),
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
		assert.equal(finished.inline.ready, true);
		assert.equal(finished.inline.revision, 2);
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
		assert.equal(comp.inline.ready, true);
		assert.match(fs.readFileSync(comp.inline.previewPath, 'utf8'), /--pilot-primary:#B87152/);
		assert.equal(fs.readFileSync(finished.inline.path, 'utf8'), bytes);
		assert.deepEqual(
			events.filter((event) => event.type === 'preview-ready').map((event) => event.stage),
			['wireframe', 'ui'],
		);
		await service.drain();
	} finally {
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});
