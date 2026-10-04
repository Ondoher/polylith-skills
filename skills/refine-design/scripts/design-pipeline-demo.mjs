import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {DesignCoordinator} from './DesignCoordinator.mjs';

try {
	const started = performance.now();
	const {values} = parseArgs({options: {directory: {type: 'string'}, 'fail-alpha': {type: 'boolean'}}});
	const directory = path.resolve(
		values.directory ??
			path.join(
				fileURLToPath(new URL('../../../', import.meta.url)),
				'.codex-tmp',
				'parallel-design-execution',
				`demo-${Date.now()}`,
			),
	);
	const plan = JSON.parse(
		fs.readFileSync(new URL('../test-fixtures/parallel-design-plan.json', import.meta.url), 'utf8'),
	);
	let coordinator = new DesignCoordinator(directory);
	let state = coordinator.initialize({plan, bindings: plan.sources});
	const initialReady = coordinator.inspect().ready;
	const resultDirectory = path.join(directory, 'fake-results');
	fs.mkdirSync(resultDirectory);
	const observations = [];
	const checkpoints = [];
	for (const itemId of ['shared-ux', 'beta-ux', 'alpha-ux', 'assemble-ux', 'review-ux', 'beta-ui', 'alpha-ui']) {
		if (['shared-ux', 'assemble-ux', 'review-ux'].includes(itemId)) {
			state = coordinator.claim({itemId, agentId: `fake-${itemId}`, expectedRevision: state.revision});
		} else if (itemId === 'beta-ux') {
			checkpoints.push({point: 'shared-accepted', ready: coordinator.inspect().ready});
			for (const independentId of ['alpha-ux', 'beta-ux']) {
				state = coordinator.claim({
					itemId: independentId,
					agentId: `fake-${independentId}`,
					expectedRevision: state.revision,
				});
				observations.push({
					attemptId: state.attempts[independentId].id,
					agentId: `fake-${independentId}`,
					status: 'live',
					workerRef: `fake-${independentId}`,
				});
			}
			if (values['fail-alpha']) {
				const obsolete = state.attempts['alpha-ux'];
				state = coordinator.fail({
					itemId: 'alpha-ux',
					attemptId: obsolete.id,
					reason: 'Demonstrated fake-worker failure',
					expectedRevision: state.revision,
				});
				state = coordinator.claim({
					itemId: 'alpha-ux',
					agentId: 'fake-alpha-replacement',
					expectedRevision: state.revision,
				});
				const latePath = path.join(resultDirectory, 'obsolete-alpha.json');
				const lateBytes = Buffer.from('Obsolete fake result; never accepted.\n');
				fs.writeFileSync(latePath, lateBytes, {flag: 'wx'});
				state = coordinator.deliver({
					itemId: 'alpha-ux',
					attemptId: obsolete.id,
					agentId: obsolete.agentId,
					outputs: [{ref: 'ux:flow:alpha', digest: createHash('sha256').update(lateBytes).digest('hex')}],
					resultRef: latePath,
					expectedRevision: state.revision,
				});
				assert.equal(state.history.at(-1).event, 'late-delivery');
				assert.notEqual(state.attempts['alpha-ux'].id, obsolete.id);
				observations[0] = {
					attemptId: state.attempts['alpha-ux'].id,
					agentId: 'fake-alpha-replacement',
					status: 'live',
					workerRef: 'fake-alpha-replacement',
				};
				checkpoints.push({point: 'failed-worker-replaced', lateResultRejected: true});
			}
			coordinator = new DesignCoordinator(directory);
			state = coordinator.reconcile({observations: [], expectedRevision: state.revision});
			checkpoints.push({point: 'reopened-without-live-observations', uncertain: coordinator.inspect().uncertain});
			state = coordinator.reconcile({observations, expectedRevision: state.revision});
		} else if (itemId === 'beta-ui') {
			checkpoints.push({point: 'whole-ux-review-accepted', ready: coordinator.inspect().ready});
			for (const independentId of ['alpha-ui', 'beta-ui']) {
				state = coordinator.claim({
					itemId: independentId,
					agentId: `fake-${independentId}`,
					expectedRevision: state.revision,
				});
			}
		}
		const attempt = state.attempts[itemId];
		if (attempt.status === 'intent') {
			state = coordinator.dispatched({
				itemId,
				attemptId: attempt.id,
				workerRef: `fake-${itemId}`,
				expectedRevision: state.revision,
			});
		}
		const item = plan.items.find((candidate) => candidate.id === itemId);
		const bytes = Buffer.from(JSON.stringify({kind: 'fake-worker-result', itemId, owns: item.owns}) + '\n');
		const resultRef = path.join(resultDirectory, `${itemId}.json`);
		fs.writeFileSync(resultRef, bytes, {flag: 'wx'});
		const digest = createHash('sha256').update(bytes).digest('hex');
		const outputs = item.owns.map((ref) => ({ref, digest}));
		state = coordinator.deliver({
			itemId,
			attemptId: attempt.id,
			agentId: attempt.agentId,
			outputs,
			resultRef,
			expectedRevision: state.revision,
		});
		state = await coordinator.accept(
			{itemId, attemptId: attempt.id, expectedRevision: state.revision},
			async () => {
				if (createHash('sha256').update(fs.readFileSync(resultRef)).digest('hex') !== digest) {
					throw new Error('Fake result bytes changed before acceptance');
				}
				const gates = {};
				for (const gate of plan.gates.filter((candidate) => candidate.reviewerItemId === itemId)) {
					gates[gate.id] = {
						receiptRef: resultRef,
						reviewerAgentId: attempt.agentId,
						subjectBindings: attempt.inputs,
						subjectDigest: createHash('sha256').update(JSON.stringify(attempt.inputs)).digest('hex'),
						receiptDigest: digest,
					};
				}
				return {outputs, gates};
			},
		);
		checkpoints.push({point: `${itemId}-accepted`, accepted: Object.keys(state.accepted)});
	}
	assert.equal(Object.keys(state.accepted).length, plan.items.length);
	assert.deepEqual(coordinator.inspect().ready, []);
	const report = {
		kind: 'offline-fake-worker-demonstration',
		directory,
		initialReady,
		checkpoints,
		finalReady: coordinator.inspect().ready,
		sharedAcceptanceCount: state.history.filter(
			(entry) => entry.event === 'accepted' && entry.itemId === 'shared-ux',
		).length,
		elapsedMs: performance.now() - started,
		limits: ['Deterministic fake-worker evidence; no model authoring, qualitative review or canonical writes.'],
	};
	fs.writeFileSync(path.join(directory, 'demonstration.json'), JSON.stringify(report, null, 2) + '\n');
	console.log(JSON.stringify(report, null, 2));
} catch (error) {
	console.error(`design-pipeline-demo: ${error.message}`);
	process.exitCode = 1;
}
