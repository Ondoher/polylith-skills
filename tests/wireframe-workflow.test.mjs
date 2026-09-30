import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WorkflowService} from '../scripts/mcp/WorkflowService.mjs';
import {DomainOperations} from '../scripts/mcp/DomainOperations.mjs';

test('normal MCP wireframe operations retain source facts and require review before UI authoring', async () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-mcp-'));
	const service = new WorkflowService({workspace, operations: new DomainOperations().operations});
	const run = 'wireframe-test';
	service.open({access: service.ownerAccess, run});
	const call = async (access, operation, input) => (await service.execute({access, run, operation, input})).inline;
	const assign = (role, operations, extra = {}) =>
		service.assign({access: service.ownerAccess, run, operations, scope: {role, elementId: 'dialog', ...extra}})
			.access;
	try {
		const prepared = await call(service.ownerAccess, 'wireframes.prepare', {
			context: {approval: 'unreviewed', flows: [{id: 'save'}], actions: [{id: 'save', outcome: 'Save item'}]},
			scope: {
				elements: [
					{
						id: 'dialog',
						disposition: 'update',
						changeReason: 'New save interaction',
						sourceFlowRefs: ['save'],
						sourceActionRefs: ['save'],
						requiredStates: ['ready'],
					},
				],
			},
		});
		assert.equal(prepared.sourceUxApproval, 'unreviewed');
		const author = assign('wireframe', ['wireframes.contribute', 'wireframes.submit']);
		const control = {
			id: 'save',
			kind: 'component',
			templateRef: {id: 'button', version: '1'},
			state: 'default',
			parameters: {label: 'Save'},
			actionRef: 'save',
		};
		const draft = await call(author, 'wireframes.contribute', {
			elementId: 'dialog',
			parts: [
				{
					id: 'form',
					root: {
						id: 'root',
						kind: 'region',
						label: 'Save',
						layout: {
							mode: 'grid',
							columns: [{unit: 'fr', value: 1}],
							rows: [{unit: 'content'}],
							gap: 12,
							padding: 24,
							align: 'stretch',
							justify: 'start',
						},
						children: [control],
					},
				},
			],
			scenes: [{id: 'ready', name: 'Ready', partRef: 'form', changes: [], viewport: {width: 300, height: 160}}],
			finish: true,
		});
		assert.equal(draft.ready, false);
		assert.equal(draft.previewReady, true);
		await call(author, 'wireframes.submit', {elementId: 'dialog', revision: draft.revision, inspected: true});
		const ui = assign('ui', ['wireframes.contribute'], {wireframeRevision: draft.revision});
		await assert.rejects(
			call(ui, 'wireframes.contribute', {elementId: 'dialog', set: {ui: {}}}),
			/independently reviewed/,
		);
		const reviewer = assign('wireframe-review', ['wireframes.review'], {revision: draft.revision});
		await call(reviewer, 'wireframes.review', {
			elementId: 'dialog',
			revision: draft.revision,
			verdict: 'pass',
			findings: [],
			strengths: [],
			limits: ['Static fixture'],
		});
		const comp = await call(ui, 'wireframes.contribute', {
			elementId: 'dialog',
			set: {ui: {theme: {primary: '#123456'}}},
			finish: true,
		});
		assert.equal(comp.previewReady, true);
		const status = await call(service.ownerAccess, 'wireframes.status', {elementId: 'dialog'});
		assert.equal(status.wireframe.accepted, true);
		assert.equal(status.ui.accepted, false);
		assert.equal(status.ui.draftRevision, comp.revision);
	} finally {
		await service.drain();
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});
