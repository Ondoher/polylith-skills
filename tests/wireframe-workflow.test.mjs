import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WorkflowService} from '../scripts/mcp/WorkflowService.mjs';
import {DomainOperations} from '../scripts/mcp/DomainOperations.mjs';
import {scopeBasisFixture} from '../skills/refine-design/scripts/fixtures/wireframe-scope.mjs';
import {outcomeFixture} from '../skills/refine-design/scripts/fixtures/wireframe-prevention.mjs';

test('normal MCP exposes context without authorizing an unchanged interface for authoring or review', async () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-scope-mcp-'));
	const service = new WorkflowService({workspace, operations: new DomainOperations().operations});
	const run = 'scope';
	service.open({access: service.ownerAccess, run});
	const call = async (access, operation, input) => (await service.execute({access, run, operation, input})).inline;
	try {
		const prepared = await call(service.ownerAccess, 'wireframes.prepare', {
			context: {
				scopeBasis: scopeBasisFixture('save-dialog', 'action:save'),
				flows: [{id: 'edit'}],
				actions: [{id: 'save'}, {id: 'choose'}],
			},
			scope: {
				elements: [
					{
						id: 'save-dialog',
						disposition: 'update',
						sourceFlowRefs: ['edit'],
						sourceActionRefs: ['save'],
						impactRefs: ['confirm-save'],
						changeReason: 'Confirm before save',
						requiredStates: ['confirm'],
					},
					{
						id: 'chooser',
						disposition: 'reuse',
						sourceFlowRefs: ['edit'],
						sourceActionRefs: ['choose'],
						changeReason: 'Selection is unchanged',
						requiredStates: [],
					},
				],
			},
		});
		assert.deepEqual(prepared.dispatch, ['save-dialog']);
		assert.deepEqual(prepared.issues, []);
		const packetReceipt = await service.execute({
			access: service.ownerAccess,
			run,
			operation: 'wireframes.packet',
			input: {elementId: 'chooser'},
		});
		const packet = JSON.parse(service.files.read(packetReceipt.path));
		assert.equal(packet.actions[0].id, 'choose');
		const author = service.assign({
			access: service.ownerAccess,
			run,
			operations: ['wireframes.contribute'],
			scope: {role: 'wireframe', elementId: 'chooser'},
		}).access;
		await assert.rejects(
			call(author, 'wireframes.contribute', {elementId: 'chooser', set: {purpose: 'Extra work'}}),
			/not authorized for update/,
		);
		const reviewer = service.assign({
			access: service.ownerAccess,
			run,
			operations: ['wireframes.review'],
			scope: {role: 'wireframe-review', elementId: 'chooser', revision: 1},
		}).access;
		await assert.rejects(
			call(reviewer, 'wireframes.review', {elementId: 'chooser', revision: 1, verdict: 'pass', findings: []}),
			/not authorized for update/,
		);
		const status = await call(service.ownerAccess, 'wireframes.status', {elementId: 'chooser'});
		assert.equal(status.disposition, 'reuse');
		assert.equal(status.wireframe.draftRevision, null);
	} finally {
		await service.drain();
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});

test('normal MCP preserves an invalid outcome draft and accepts a targeted result repair', async () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-evidence-'));
	const service = new WorkflowService({workspace, operations: new DomainOperations().operations});
	const run = 'evidence';
	service.open({access: service.ownerAccess, run});
	const call = async (access, operation, input) => (await service.execute({access, run, operation, input})).inline;
	try {
		const {document, packet} = outcomeFixture();
		packet.scopeBasis = scopeBasisFixture(document.elementId, 'flow:' + packet.flows[0].id);
		// Source facts remain inside the existing flow record in the assigned packet.
		packet.flows[0].sample = packet.facts;
		for (const link of document.outcomeEvidence)
			for (const value of link.values ?? [])
				value.sourcePath = value.sourcePath.replace('/facts/', '/flows/0/sample/');
		await call(service.ownerAccess, 'wireframes.prepare', {
			context: packet,
			scope: {
				elements: [
					{
						id: document.elementId,
						disposition: 'update',
						impactRefs: ['confirm-save'],
						changeReason: 'Creation result changed',
						sourceFlowRefs: packet.flows.map((x) => x.id),
						sourceActionRefs: [],
						requiredStates: ['main'],
					},
				],
			},
		});
		const author = service.assign({
			access: service.ownerAccess,
			run,
			operations: ['wireframes.contribute', 'wireframes.submit'],
			scope: {role: 'wireframe', elementId: document.elementId},
		}).access;
		const bad = structuredClone(document.outcomeEvidence);
		bad[0].nodeRefs = ['message'];
		bad[0].values = [];
		const draft = await call(author, 'wireframes.contribute', {
			elementId: document.elementId,
			parts: document.parts,
			scenes: document.scenes,
			set: {outcomeEvidence: bad},
			finish: true,
		});
		assert.equal(draft.ready, false);
		assert.match(draft.errors[0], /status\/heading/);
		assert(fs.existsSync(draft.path));
		const repaired = await call(author, 'wireframes.contribute', {
			elementId: document.elementId,
			set: {outcomeEvidence: document.outcomeEvidence},
			finish: true,
		});
		assert.equal(repaired.previewReady, true);
		const saved = JSON.parse(fs.readFileSync(repaired.path));
		assert.deepEqual(saved.parts, document.parts);
		assert.deepEqual(saved.scenes, document.scenes);
		await call(author, 'wireframes.submit', {
			elementId: document.elementId,
			revision: repaired.revision,
			inspected: true,
		});
	} finally {
		await service.drain();
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});

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
			context: {
				scopeBasis: scopeBasisFixture('dialog', 'action:save'),
				approval: 'unreviewed',
				flows: [{id: 'save'}],
				actions: [{id: 'save', outcome: 'Save item'}],
			},
			scope: {
				elements: [
					{
						id: 'dialog',
						disposition: 'update',
						impactRefs: ['confirm-save'],
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
