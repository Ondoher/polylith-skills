import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WireframeScope} from './WireframeScope.mjs';
import {WireframeStore} from './wireframe-store.mjs';
import {scopeBasisFixture} from './fixtures/wireframe-scope.mjs';

/** Called by cases to supply two related interfaces but only one changed requirement. */
function fixture() {
	const context = {
		sourceBinding: {revision: 2},
		flows: [{id: 'edit'}],
		actions: [
			{id: 'save', outcome: 'Confirm and save'},
			{id: 'choose', outcome: 'Stage an item'},
		],
		scopeBasis: scopeBasisFixture('save-dialog', 'action:save'),
	};
	const scope = {
		elements: [
			{
				id: 'save-dialog',
				disposition: 'update',
				sourceFlowRefs: ['edit'],
				sourceActionRefs: ['save'],
				impactRefs: ['confirm-save'],
				changeReason: 'Add confirmation',
				requiredStates: ['confirm'],
			},
			{
				id: 'chooser',
				disposition: 'reuse',
				sourceFlowRefs: ['edit'],
				sourceActionRefs: ['choose'],
				impactRefs: [],
				changeReason: 'Choice behavior is unchanged',
				requiredStates: ['ready'],
			},
		],
	};
	return {context, scope};
}

test('source-backed scope dispatches a changed dialog while related context remains readable and untouched', () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-scope-'));
	try {
		const {context, scope} = fixture();
		const store = new WireframeStore({workspace, context});
		const saved = path.join(store.directory, 'chooser', 'wireframe-latest.json');
		fs.mkdirSync(path.dirname(saved));
		fs.writeFileSync(saved, '{"preserved":true}');
		const original = fs.readFileSync(saved);
		const result = store.setScope(scope, {scope: {role: 'wireframe'}});
		assert.deepEqual(result.issues, []);
		assert.deepEqual(
			store.dispatchElements().map((element) => element.id),
			['save-dialog'],
		);
		assert.equal(store.packet('chooser').actions[0].id, 'choose');
		assert.equal(store.uiDispatchDecision({elementId: 'chooser'}).needed, false);
		const resumed = new WireframeStore({workspace, context});
		assert.deepEqual(
			resumed.dispatchElements().map((element) => element.id),
			['save-dialog'],
		);
		assert.deepEqual(fs.readFileSync(saved), original);
	} finally {
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});

test('indirect shared-component impact and a separate existing defect have explicit source reasons', () => {
	const {context, scope} = fixture();
	context.components = [{id: 'confirmation-control'}];
	scope.elements[0].componentRefs = ['confirmation-control'];
	context.scopeBasis.impacts[0].affectedRefs = ['component:confirmation-control'];
	context.scopeBasis.impacts[0].reason = 'Shared confirmation control changes its consumer layout';
	context.scopeBasis.impacts.push({
		id: 'repair-chooser',
		elementId: 'chooser',
		kind: 'defect-repair',
		status: 'ready',
		defect: 'Existing chooser omits the required confirmation destination',
		reason: 'Restore the destination indication',
		affectedRefs: ['action:choose'],
		dependencies: [{sourceId: 'requirements', recordRefs: ['save']}],
	});
	scope.elements[1].disposition = 'update';
	scope.elements[1].impactRefs = ['repair-chooser'];
	const selected = new WireframeScope(context).select(scope);
	assert.deepEqual(selected.issues, []);
	assert.deepEqual(
		selected.elements.map((element) => element.disposition),
		['update', 'update'],
	);
});

test('generated-only differences and missing justification stay unresolved while independent work continues', () => {
	const {context, scope} = fixture();
	context.scopeBasis.previousSources[0].records.choice = 'Stage a selected item';
	context.scopeBasis.currentSources[0].records.choice = 'Stage a selected item';
	context.scopeBasis.impacts.push({
		id: 'generated-choice',
		elementId: 'chooser',
		kind: 'requirement-change',
		status: 'ready',
		reason: 'Generated UX now says choice commits immediately',
		affectedRefs: ['action:choose'],
		dependencies: [{sourceId: 'requirements', recordRefs: ['choice']}],
	});
	scope.elements[1].disposition = 'update';
	scope.elements[1].impactRefs = ['generated-choice'];
	const selected = new WireframeScope(context).select(scope);
	assert.deepEqual(
		selected.elements.map((element) => element.disposition),
		['update', 'unresolved'],
	);
	assert.match(selected.issues[0].problems.join(' '), /No material change/);
	context.scopeBasis.impacts.pop();
	scope.elements[1].impactRefs = [];
	assert.match(
		new WireframeScope(context).select(scope).issues[0].problems.join(' '),
		/explicit source-linked impact/,
	);
});

test('an unchanged requirement supports an explicit defect repair without pretending it is a user change', () => {
	const {context, scope} = fixture();
	context.scopeBasis.previousSources = structuredClone(context.scopeBasis.currentSources);
	const impact = context.scopeBasis.impacts[0];
	impact.kind = 'defect-repair';
	impact.defect = 'Saved dialog commits without the required confirmation';
	assert.deepEqual(new WireframeScope(context).select(scope).issues, []);
});

test('changed inputs disable saved selection without touching drafts; a fresh decision restores eligible work', () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-scope-stale-'));
	try {
		const {context, scope} = fixture();
		const store = new WireframeStore({workspace, context});
		store.setScope(scope, {scope: {role: 'wireframe'}});
		store.contribute({elementId: 'save-dialog', set: {purpose: 'Saved progress'}}, {scope: {role: 'wireframe'}});
		const original = fs.readFileSync(path.join(store.directory, 'save-dialog/wireframe-latest.json'));
		const changed = structuredClone(context);
		changed.scopeBasis.currentSources[0].records.save = 'Confirm and show destination before saving';
		const resumed = new WireframeStore({workspace, context: changed});
		assert.equal(resumed.scope, null);
		assert.deepEqual(resumed.dispatchElements(), []);
		assert.equal(resumed.uiDispatchDecision({elementId: 'save-dialog'}).needed, false);
		assert.throws(() => resumed.setScope(store.scope, {scope: {role: 'wireframe'}}), /recompute selection/);
		resumed.setScope(scope, {scope: {role: 'wireframe'}});
		assert.deepEqual(
			resumed.dispatchElements().map((element) => element.id),
			['save-dialog'],
		);
		assert.equal(fs.readdirSync(path.join(store.directory, 'scope-history')).length, 1);
		assert.deepEqual(fs.readFileSync(path.join(store.directory, 'save-dialog/wireframe-latest.json')), original);
		assert.throws(
			() =>
				resumed.contribute(
					{elementId: 'chooser', set: {purpose: 'Unrequested rewrite'}},
					{scope: {role: 'wireframe'}},
				),
			/not authorized for update/,
		);
	} finally {
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});
