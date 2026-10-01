import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PilotStore} from './PilotStore.mjs';
import {scopeBasisFixture} from '../../../../skills/refine-design/scripts/fixtures/wireframe-scope.mjs';

test('one author saves, checks and rechecks a neutral draft before ordinary review', async () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-self-audit-'));
	try {
		const context = {
			scopeBasis: scopeBasisFixture('entry-form', 'flow:create-entry'),
			flows: [{id: 'create-entry', name: 'Create entry', outcome: 'New entry is visible'}],
		};
		const store = new PilotStore({
			workspace,
			context,
			selfAudit: true,
			preview: async (receipt) => {
				const file = receipt.previewPath.replace(/\.html$/, '.png');
				fs.writeFileSync(file, 'neutral captured draft');
				return file;
			},
		});
		const author = {scope: {role: 'wireframe', elementId: 'entry-form'}};
		const reviewer = {scope: {role: 'wireframe-review', elementId: 'entry-form', revision: 1}};
		store.setScope(
			{
				elements: [
					{
						id: 'entry-form',
						disposition: 'update',
						impactRefs: ['confirm-save'],
						changeReason: 'Show the created entry',
						sourceFlowRefs: ['create-entry'],
						requiredStates: ['ready'],
					},
				],
			},
			author,
		);
		const inventory = store.requirements({elementId: 'entry-form'}, author).inventory;
		assert.deepEqual(
			inventory.map((item) => item.ref),
			['state:ready', 'outcome:create-entry'],
		);
		store.requirements(
			{
				elementId: 'entry-form',
				items: [
					{
						id: 'ready-action',
						assertion: 'The form has an explicit submit control',
						sourceRefs: ['state:ready'],
					},
					{
						id: 'visible-result',
						assertion: 'The created entry is visible',
						sourceRefs: ['outcome:create-entry'],
					},
				],
			},
			author,
		);
		const part = {
			id: 'form',
			root: {
				id: 'root',
				kind: 'region',
				label: 'Entry form',
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
						parameters: {label: 'Create entry'},
					},
				],
			},
		};
		const first = await store.operations()['pilot.contribute'].execute(
			{
				elementId: 'entry-form',
				parts: [part],
				scenes: [
					{id: 'ready', name: 'Ready', partRef: 'form', changes: [], viewport: {width: 480, height: 240}},
				],
				claims: [{id: 'ready-action', sceneRefs: ['ready']}],
				finish: true,
			},
			author,
		);
		assert.equal(first.previewReady, true);
		const frozen = store.freeze('entry-form', 'wireframe');
		assert.equal(frozen.revision, first.revision);
		store.diagnostic(
			{
				elementId: 'entry-form',
				revision: first.revision,
				verdict: 'revise',
				findings: [{id: 'missing-result', issue: 'Result is not shown', blocking: true}],
			},
			reviewer,
		);
		assert.equal(store.accepted('entry-form', 'wireframe', first.revision), false);
		const firstAudit = store.audit(
			{
				elementId: 'entry-form',
				revision: first.revision,
				checks: [
					{id: 'ready-action', status: 'verified', sceneRefs: ['ready']},
					{id: 'visible-result', status: 'needs-repair', reason: 'Result scene is missing'},
				],
			},
			author,
		);
		assert.equal(firstAudit.status, 'needs-repair');
		const second = await store.operations()['pilot.contribute'].execute(
			{
				elementId: 'entry-form',
				parts: [
					{
						id: 'result',
						root: {
							...part.root,
							children: [
								{
									id: 'created-entry',
									kind: 'component',
									templateRef: {id: 'text', version: '1'},
									state: 'default',
									parameters: {text: 'Created entry: Sample'},
								},
							],
						},
					},
				],
				scenes: [
					{
						id: 'created',
						name: 'Created entry',
						partRef: 'result',
						changes: [],
						viewport: {width: 480, height: 240},
					},
				],
				claims: [{id: 'visible-result', sceneRefs: ['created']}],
				finish: true,
			},
			author,
		);
		assert.equal(second.previewReady, true);
		const complete = store.audit(
			{
				elementId: 'entry-form',
				revision: second.revision,
				checks: [
					{id: 'ready-action', status: 'verified', sceneRefs: ['ready'], nodeRefs: ['save']},
					{id: 'visible-result', status: 'verified', sceneRefs: ['created'], nodeRefs: ['created-entry']},
				],
			},
			author,
		);
		assert.equal(complete.status, 'clean');
		const third = await store
			.operations()
			['pilot.contribute'].execute(
				{elementId: 'entry-form', set: {focusIntent: 'Return focus to the form after creation'}, finish: true},
				author,
			);
		assert.throws(
			() => store.submit({elementId: 'entry-form', revision: third.revision, inspected: true}, author),
			/Audit must cover submitted revision/,
		);
		const finalAudit = store.audit(
			{
				elementId: 'entry-form',
				revision: third.revision,
				checks: [
					{id: 'ready-action', status: 'verified', sceneRefs: ['ready'], nodeRefs: ['save']},
					{id: 'visible-result', status: 'verified', sceneRefs: ['created'], nodeRefs: ['created-entry']},
				],
			},
			author,
		);
		assert.equal(finalAudit.status, 'clean');
		const submitted = store.submit({elementId: 'entry-form', revision: third.revision, inspected: true}, author);
		store.review(
			{elementId: 'entry-form', revision: third.revision, verdict: 'pass', findings: []},
			{
				scope: {role: 'wireframe-review', elementId: 'entry-form', revision: third.revision},
			},
		);
		assert.equal(store.accepted('entry-form', 'wireframe', submitted.revision), true);
		assert.equal(
			new PilotStore({workspace, context, selfAudit: true}).requirements({elementId: 'entry-form'}, author).items
				.length,
			2,
		);
	} finally {
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});
