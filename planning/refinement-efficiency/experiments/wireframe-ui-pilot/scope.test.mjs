import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PilotStore} from './PilotStore.mjs';
import {prepareReviewedScope, runReviewedPipeline} from './reviewed-pipeline.mjs';
import {scopeBasisFixture} from '../../../../skills/refine-design/scripts/fixtures/wireframe-scope.mjs';

test('replay uses its supplied source-bound scope, retains uncertain work, and never calls models for reused context', async () => {
	const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-scope-'));
	try {
		const context = {flows: [{id: 'edit'}], scopeBasis: scopeBasisFixture('editor', 'flow:edit')};
		context.scopeBasis.impacts[0].status = 'needs-repair';
		context.scopeBasis.impacts[0].remediation = 'Resolve which outcome the amendment replaces';
		const input = {
			elements: [
				{
					id: 'editor',
					disposition: 'update',
					sourceFlowRefs: ['edit'],
					impactRefs: ['confirm-save'],
					changeReason: 'Changed outcome',
					requiredStates: ['ready'],
				},
				{
					id: 'picker',
					disposition: 'reuse',
					sourceFlowRefs: ['edit'],
					changeReason: 'Unchanged input selection',
					requiredStates: [],
				},
			],
		};
		fs.mkdirSync(path.join(workspace, 'inputs'));
		fs.writeFileSync(path.join(workspace, 'inputs/scope.json'), JSON.stringify(input));
		const store = new PilotStore({workspace, context});
		const scope = prepareReviewedScope(store, workspace);
		assert.deepEqual(
			scope.elements.map((element) => element.disposition),
			['unresolved', 'reuse'],
		);
		const state = {completed: []};
		let calls = 0;
		await runReviewedPipeline({
			workspace,
			store,
			state,
			selected: 'all',
			event: () => {},
			saveState: () => {},
			runClient: () => {
				calls++;
				throw new Error('Unexpected author/review call');
			},
		});
		assert.equal(calls, 0);
		assert.equal(state.unresolvedReviews.length, 1);
		assert.match(state.unresolvedReviews[0].reason, /Resolve which outcome/);
		const changed = structuredClone(context);
		changed.scopeBasis.currentSources[0].records.save = 'Different requirement';
		fs.writeFileSync(path.join(workspace, 'inputs/scope.json'), JSON.stringify(scope));
		const resumed = new PilotStore({workspace, context: changed});
		assert.throws(() => prepareReviewedScope(resumed, workspace), /recompute selection/);
		assert.equal(resumed.latest('editor', 'wireframe'), null);
	} finally {
		fs.rmSync(workspace, {recursive: true, force: true});
	}
});
