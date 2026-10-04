import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DesignCoordinator} from './DesignCoordinator.mjs';

/** Called by scenarios to preserve isolated synthetic state under the task scratch root.
 *
 * @param {DesignCoordinatorTestContext} scenario - Node test context owning cleanup.
 * @returns {DesignCoordinatorTestScenario} - Synthetic plan and isolated directory.
 */
function scenarioInputs(scenario) {
	const parent = fileURLToPath(
		new URL('../../../.codex-tmp/parallel-design-execution/coordinator-tests/', import.meta.url),
	);
	fs.mkdirSync(parent, {recursive: true});
	const directory = fs.mkdtempSync(path.join(parent, 'case-'));
	scenario.after(() => {
		assert.equal(path.dirname(fs.realpathSync(directory)), fs.realpathSync(parent));
		fs.rmSync(directory, {recursive: true, force: true});
	});
	const plan = JSON.parse(
		fs.readFileSync(new URL('../test-fixtures/parallel-design-plan.json', import.meta.url), 'utf8'),
	);
	return {directory, plan};
}

/** Called by fake-worker scenarios to supply actual synthetic byte identities.
 *
 * @param {string} bytes - Saved artifact content.
 * @returns {string} - SHA-256 byte identity.
 */
function artifactDigest(bytes) {
	return crypto.createHash('sha256').update(bytes).digest('hex');
}

/** Called by scenarios to complete one ready item through saved delivery and parent validation.
 *
 * @param {DesignCoordinator} coordinator - Public coordinator instance.
 * @param {string} itemId - Ready work item.
 * @param {string} agentId - Actual synthetic worker actor.
 * @param {DesignCoordinatorValidator} [validator] - Optional existing-validator fake.
 * @returns {Promise<DesignCoordinatorState>} - Accepted durable state.
 */
async function completeItem(coordinator, itemId, agentId, validator) {
	let state = coordinator.open();
	state = coordinator.claim({itemId, agentId, expectedRevision: state.revision});
	const attemptId = state.attempts[itemId].id;
	const outputs = state.plan.items
		.find((item) => item.id === itemId)
		.owns.map((ref) => ({ref, digest: artifactDigest(ref + ' saved artifact')}));
	state = coordinator.deliver({
		itemId,
		attemptId,
		agentId,
		outputs,
		resultRef: `results/${itemId}.json`,
		expectedRevision: state.revision,
	});
	return coordinator.accept(
		{itemId, attemptId, expectedRevision: state.revision},
		validator ?? (({attempt}) => ({outputs: attempt.delivery.outputs})),
	);
}

test('durable shared ownership survives restart while two independent workers proceed', async (scenario) => {
	const temporaryParent = fileURLToPath(
		new URL('../../../.codex-tmp/parallel-design-execution/coordinator-tests/', import.meta.url),
	);
	fs.mkdirSync(temporaryParent, {recursive: true});
	const directory = fs.mkdtempSync(path.join(temporaryParent, 'happy-'));
	scenario.after(() => {
		assert.equal(path.dirname(fs.realpathSync(directory)), fs.realpathSync(temporaryParent));
		fs.rmSync(directory, {recursive: true, force: true});
	});
	const plan = JSON.parse(
		fs.readFileSync(new URL('../test-fixtures/parallel-design-plan.json', import.meta.url), 'utf8'),
	);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	assert.deepEqual(coordinator.inspect().ready, ['shared-ux']);
	let state = coordinator.claim({itemId: 'shared-ux', agentId: 'shared-author', expectedRevision: 1});
	const sharedAttempt = state.attempts['shared-ux'];
	assert.equal(new DesignCoordinator(directory).open().attempts['shared-ux'].status, 'intent');
	state = coordinator.dispatched({
		itemId: 'shared-ux',
		attemptId: sharedAttempt.id,
		workerRef: 'fake-shared',
		expectedRevision: state.revision,
	});
	state = coordinator.deliver({
		itemId: 'shared-ux',
		attemptId: sharedAttempt.id,
		agentId: 'shared-author',
		outputs: [
			{
				ref: 'ux:element:shared',
				digest: crypto.createHash('sha256').update('shared saved contribution').digest('hex'),
			},
		],
		resultRef: 'results/shared.json',
		expectedRevision: state.revision,
	});
	state = await coordinator.accept(
		{itemId: 'shared-ux', attemptId: sharedAttempt.id, expectedRevision: state.revision},
		async ({attempt}) => ({outputs: attempt.delivery.outputs}),
	);
	assert.deepEqual(coordinator.inspect().ready, ['alpha-ux', 'beta-ux']);
	state = coordinator.claim({itemId: 'alpha-ux', agentId: 'alpha-author', expectedRevision: state.revision});
	state = coordinator.claim({itemId: 'beta-ux', agentId: 'beta-author', expectedRevision: state.revision});
	const resumed = new DesignCoordinator(directory);
	assert.deepEqual(resumed.inspect().ready, []);
	assert.equal(resumed.open().accepted['shared-ux'].agentId, 'shared-author');
	state = resumed.reconcile({
		observations: [
			{
				attemptId: state.attempts['alpha-ux'].id,
				agentId: 'alpha-author',
				status: 'live',
				workerRef: 'fake-alpha',
			},
			{attemptId: state.attempts['beta-ux'].id, agentId: 'beta-author', status: 'live', workerRef: 'fake-beta'},
		],
		expectedRevision: state.revision,
	});
	assert.equal(state.attempts['alpha-ux'].inputs[1].ref, 'ux:element:shared');
	state = resumed.deliver({
		itemId: 'alpha-ux',
		attemptId: state.attempts['alpha-ux'].id,
		agentId: 'alpha-author',
		outputs: [
			{
				ref: 'ux:flow:alpha',
				digest: crypto.createHash('sha256').update('alpha saved contribution').digest('hex'),
			},
		],
		resultRef: 'results/alpha.json',
		expectedRevision: state.revision,
	});
	state = await resumed.accept(
		{itemId: 'alpha-ux', attemptId: state.attempts['alpha-ux'].id, expectedRevision: state.revision},
		async ({attempt}) => ({outputs: attempt.delivery.outputs}),
	);
	assert.deepEqual(Object.keys(new DesignCoordinator(directory).open().accepted), ['shared-ux', 'alpha-ux']);
	assert.equal(state.attempts['beta-ux'].status, 'running');
	assert.equal(state.history.filter((entry) => entry.event === 'accepted' && entry.itemId === 'shared-ux').length, 1);
});

test('out-of-order completions and repeated deliveries preserve one acceptance per output', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	await completeItem(coordinator, 'shared-ux', 'shared-author');
	let state = coordinator.claim({
		itemId: 'alpha-ux',
		agentId: 'alpha-author',
		expectedRevision: coordinator.open().revision,
	});
	const alpha = state.attempts['alpha-ux'];
	await completeItem(coordinator, 'beta-ux', 'beta-author');
	state = coordinator.open();
	const delivery = {
		itemId: 'alpha-ux',
		attemptId: alpha.id,
		agentId: alpha.agentId,
		outputs: [{ref: 'ux:flow:alpha', digest: artifactDigest('alpha')}],
		resultRef: 'results/alpha.json',
	};
	state = coordinator.deliver({...delivery, expectedRevision: state.revision});
	state = coordinator.deliver({...delivery, expectedRevision: state.revision});
	assert.equal(state.history.filter((entry) => entry.event === 'delivered' && entry.itemId === 'alpha-ux').length, 1);
	state = coordinator.deliver({
		...delivery,
		outputs: [{ref: 'ux:flow:alpha', digest: artifactDigest('incompatible alpha')}],
		expectedRevision: state.revision,
	});
	assert.equal(state.attempts['alpha-ux'].delivery.outputs[0].digest, delivery.outputs[0].digest);
	assert.equal(state.history.at(-1).event, 'incompatible-delivery');
	state = await coordinator.accept(
		{itemId: 'alpha-ux', attemptId: alpha.id, expectedRevision: state.revision},
		({attempt}) => ({outputs: attempt.delivery.outputs}),
	);
	await coordinator.accept({itemId: 'alpha-ux', attemptId: alpha.id, expectedRevision: state.revision}, () => {
		throw new Error('Duplicate acceptance must not validate again');
	});
	assert.deepEqual(coordinator.inspect().ready, ['assemble-ux']);
});

test('partial delivery and unavailable parent validation retain outputs without granting authority', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	let state = coordinator.claim({itemId: 'shared-ux', agentId: 'author', expectedRevision: 1});
	const attemptId = state.attempts['shared-ux'].id;
	state = coordinator.deliver({
		itemId: 'shared-ux',
		attemptId,
		agentId: 'author',
		outputs: [],
		resultRef: 'results/partial.json',
		expectedRevision: state.revision,
	});
	await assert.rejects(
		coordinator.accept({itemId: 'shared-ux', attemptId, expectedRevision: state.revision}, () => ({outputs: []})),
		/Partial delivery/,
	);
	assert.equal(new DesignCoordinator(directory).open().attempts['shared-ux'].status, 'delivered');
	state = coordinator.fail({
		itemId: 'shared-ux',
		attemptId,
		reason: 'Worker omitted required contribution',
		expectedRevision: state.revision,
	});
	state = coordinator.claim({itemId: 'shared-ux', agentId: 'replacement', expectedRevision: state.revision});
	const replacement = state.attempts['shared-ux'];
	state = coordinator.deliver({
		itemId: 'shared-ux',
		attemptId: replacement.id,
		agentId: 'replacement',
		outputs: [{ref: 'ux:element:shared', digest: artifactDigest('complete shared')}],
		resultRef: 'results/replacement.json',
		expectedRevision: state.revision,
	});
	await assert.rejects(
		coordinator.accept(
			{itemId: 'shared-ux', attemptId: replacement.id, expectedRevision: state.revision},
			() => undefined,
		),
		/did not verify/,
	);
	assert.deepEqual(coordinator.open().accepted, {});
	state = coordinator.deliver({
		itemId: 'shared-ux',
		attemptId,
		agentId: 'author',
		outputs: [{ref: 'ux:element:shared', digest: artifactDigest('late old contribution')}],
		resultRef: 'results/late.json',
		expectedRevision: state.revision,
	});
	assert.equal(state.history.at(-1).rejected, true);
	assert.equal(state.attempts['shared-ux'].id, replacement.id);
	assert.equal(state.attempts['shared-ux'].delivery.resultRef, 'results/replacement.json');
});

test('unknown liveness blocks replacement while competing and stale claims fail', (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	let state = coordinator.claim({itemId: 'shared-ux', agentId: 'author', expectedRevision: 1});
	assert.throws(
		() => new DesignCoordinator(directory).claim({itemId: 'shared-ux', agentId: 'competitor', expectedRevision: 1}),
		/Stale coordinator revision/,
	);
	assert.throws(
		() => coordinator.claim({itemId: 'shared-ux', agentId: 'competitor', expectedRevision: state.revision}),
		/already claimed/,
	);
	state = new DesignCoordinator(directory).reconcile({observations: [], expectedRevision: state.revision});
	assert.deepEqual(coordinator.inspect().uncertain, ['shared-ux']);
	assert.deepEqual(coordinator.inspect().ready, []);
	assert.throws(
		() => coordinator.claim({itemId: 'shared-ux', agentId: 'replacement', expectedRevision: state.revision}),
		/already claimed/,
	);
	state = coordinator.reconcile({
		observations: [{attemptId: state.attempts['shared-ux'].id, agentId: 'author', status: 'failed'}],
		expectedRevision: state.revision,
	});
	assert.deepEqual(coordinator.inspect().ready, ['shared-ux']);
	const resumed = coordinator.claim({itemId: 'shared-ux', agentId: 'replacement', expectedRevision: state.revision});
	assert.notEqual(resumed.attempts['shared-ux'].id, state.attempts['shared-ux'].id);
});

test('a missing reviewer blocks dependent UI while exact independent review opens both tracks', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	await completeItem(coordinator, 'shared-ux', 'shared-author');
	await completeItem(coordinator, 'alpha-ux', 'alpha-author');
	await completeItem(coordinator, 'beta-ux', 'beta-author');
	await completeItem(coordinator, 'assemble-ux', 'parent');
	assert.deepEqual(coordinator.inspect().ready, ['review-ux']);
	assert.throws(
		() =>
			coordinator.claim({
				itemId: 'review-ux',
				agentId: 'shared-author',
				expectedRevision: coordinator.open().revision,
			}),
		/cannot review/,
	);
	let state = coordinator.claim({
		itemId: 'review-ux',
		agentId: 'independent-reviewer',
		expectedRevision: coordinator.open().revision,
	});
	state = coordinator.reconcile({observations: [], expectedRevision: state.revision});
	assert.deepEqual(coordinator.inspect().ready, []);
	state = coordinator.fail({
		itemId: 'review-ux',
		attemptId: state.attempts['review-ux'].id,
		reason: 'Host positively observed reviewer failure',
		expectedRevision: state.revision,
	});
	state = await completeItem(coordinator, 'review-ux', 'replacement-reviewer', ({attempt}) => ({
		outputs: attempt.delivery.outputs,
		gates: {
			'whole-ux-review': {
				receiptRef: 'reviews/ux.json',
				reviewerAgentId: attempt.agentId,
				subjectBindings: attempt.inputs,
				subjectDigest: artifactDigest('exact assembled UX review subject'),
				receiptDigest: artifactDigest('verified independent review receipt'),
			},
		},
	}));
	assert.deepEqual(coordinator.inspect().ready, ['alpha-ui', 'beta-ui']);
	assert.equal(state.gates['whole-ux-review'].reviewerAgentId, 'replacement-reviewer');
});

test('shared-output invalidation retains unaffected work and invalidates whole-UX review', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	await completeItem(coordinator, 'shared-ux', 'shared-author');
	await completeItem(coordinator, 'alpha-ux', 'alpha-author');
	await completeItem(coordinator, 'beta-ux', 'beta-author');
	await completeItem(coordinator, 'assemble-ux', 'parent');
	await completeItem(coordinator, 'review-ux', 'reviewer', ({attempt}) => ({
		outputs: attempt.delivery.outputs,
		gates: {
			'whole-ux-review': {
				receiptRef: 'reviews/ux.json',
				reviewerAgentId: attempt.agentId,
				subjectBindings: attempt.inputs,
				subjectDigest: artifactDigest('UX subject'),
				receiptDigest: artifactDigest('review receipt'),
			},
		},
	}));
	let state = coordinator.claim({
		itemId: 'alpha-ui',
		agentId: 'ui-author',
		expectedRevision: coordinator.open().revision,
	});
	const staleUi = state.attempts['alpha-ui'];
	state = coordinator.invalidate({
		bindings: plan.sources,
		changedRefs: ['ux:flow:alpha'],
		expectedRevision: state.revision,
	});
	assert.ok(state.accepted['shared-ux']);
	assert.ok(state.accepted['beta-ux']);
	assert.equal(state.accepted['alpha-ux'], undefined);
	assert.equal(state.gates['whole-ux-review'], undefined);
	assert.equal(state.attempts['alpha-ui'].status, 'stale');
	assert.deepEqual(coordinator.inspect().ready, ['alpha-ux']);
	state = coordinator.deliver({
		itemId: 'alpha-ui',
		attemptId: staleUi.id,
		agentId: 'ui-author',
		outputs: [{ref: 'ui:flow:alpha', digest: artifactDigest('stale UI')}],
		resultRef: 'results/stale-ui.json',
		expectedRevision: state.revision,
	});
	assert.equal(state.history.at(-1).event, 'late-delivery');
	assert.equal(state.accepted['alpha-ui'], undefined);
	state = coordinator.invalidate({
		bindings: plan.sources,
		changedRefs: ['ux:element:shared'],
		expectedRevision: state.revision,
	});
	assert.deepEqual(state.accepted, {});
	assert.deepEqual(coordinator.inspect().ready, ['shared-ux']);
});

test('human source changes require revised interpretation rather than hash replacement', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	await completeItem(coordinator, 'shared-ux', 'author');
	let state = coordinator.invalidate({
		bindings: [{ref: 'source:brief', digest: artifactDigest('changed human source')}],
		expectedRevision: coordinator.open().revision,
	});
	assert.deepEqual(coordinator.inspect().ready, []);
	assert.deepEqual(state.accepted, {});
	const revised = structuredClone(plan);
	revised.revision++;
	revised.sources = state.bindings;
	for (const owner of [...revised.items, ...revised.gates])
		for (const input of owner.inputs) if (input.ref === 'source:brief') input.digest = state.bindings[0].digest;
	state = coordinator.revise({plan: revised, bindings: state.bindings, expectedRevision: state.revision});
	assert.deepEqual(coordinator.inspect().ready, ['shared-ux']);
	assert.equal(state.history.at(-1).event, 'plan-revised');
});

test('authoritative source changes invalidate work even when it has no direct source input', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	plan.items[0].inputs = [];
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	await completeItem(coordinator, 'shared-ux', 'author');
	let state = coordinator.invalidate({
		bindings: [{ref: 'source:brief', digest: artifactDigest('reinterpreted authority')}],
		expectedRevision: coordinator.open().revision,
	});
	assert.deepEqual(state.accepted, {});
	assert.deepEqual(coordinator.inspect().ready, []);
	assert.throws(
		() => coordinator.claim({itemId: 'shared-ux', agentId: 'replacement', expectedRevision: state.revision}),
		/not ready/,
	);
	const revised = structuredClone(plan);
	revised.revision++;
	revised.sources = state.bindings;
	for (const owner of [...revised.items, ...revised.gates])
		for (const input of owner.inputs) if (input.ref === 'source:brief') input.digest = state.bindings[0].digest;
	state = coordinator.revise({plan: revised, bindings: state.bindings, expectedRevision: state.revision});
	assert.deepEqual(coordinator.inspect().ready, ['shared-ux']);
	assert.equal(state.accepted['shared-ux'], undefined);
	await completeItem(coordinator, 'shared-ux', 'replacement');
	const secondRevision = structuredClone(revised);
	secondRevision.revision++;
	secondRevision.sources = [{ref: 'source:brief', digest: artifactDigest('another authoritative change')}];
	for (const owner of [...secondRevision.items, ...secondRevision.gates])
		for (const input of owner.inputs)
			if (input.ref === 'source:brief') input.digest = secondRevision.sources[0].digest;
	state = coordinator.revise({
		plan: secondRevision,
		bindings: secondRevision.sources,
		expectedRevision: coordinator.open().revision,
	});
	assert.deepEqual(state.accepted, {});
	assert.ok(state.history.some((entry) => entry.event === 'invalidated-acceptance'));
});

test('review gate omission keeps delivery repairable until its exact receipt is validated', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	await completeItem(coordinator, 'shared-ux', 'shared-author');
	await completeItem(coordinator, 'alpha-ux', 'alpha-author');
	await completeItem(coordinator, 'beta-ux', 'beta-author');
	await completeItem(coordinator, 'assemble-ux', 'parent');
	await assert.rejects(
		completeItem(coordinator, 'review-ux', 'independent-reviewer'),
		/omitted required owned review gate/,
	);
	let state = coordinator.open();
	assert.equal(state.attempts['review-ux'].status, 'delivered');
	assert.equal(state.accepted['review-ux'], undefined);
	assert.deepEqual(coordinator.inspect().ready, []);
	state = await coordinator.accept(
		{itemId: 'review-ux', attemptId: state.attempts['review-ux'].id, expectedRevision: state.revision},
		({attempt}) => ({
			outputs: attempt.delivery.outputs,
			gates: {
				'whole-ux-review': {
					receiptRef: 'reviews/repaired.json',
					reviewerAgentId: attempt.agentId,
					subjectBindings: attempt.inputs,
					subjectDigest: artifactDigest('frozen review subject'),
					receiptDigest: artifactDigest('passing independently verified receipt'),
				},
			},
		}),
	);
	assert.equal(state.attempts['review-ux'].status, 'accepted');
	assert.deepEqual(coordinator.inspect().ready, ['alpha-ui', 'beta-ui']);
});

test('removing a gate in a valid revised scope preserves unaffected shared acceptance', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	await completeItem(coordinator, 'shared-ux', 'shared-author');
	const revised = structuredClone(plan);
	revised.revision++;
	revised.items = revised.items.filter((item) => item.stage === 'ux');
	revised.gates = [];
	revised.gaps = [
		{
			id: 'visual-deferred',
			outcomeIds: ['visual'],
			reason: 'Owner explicitly deferred visual design for this revision',
		},
	];
	const state = coordinator.revise({
		plan: revised,
		bindings: plan.sources,
		expectedRevision: coordinator.open().revision,
	});
	assert.ok(state.accepted['shared-ux']);
	assert.deepEqual(coordinator.inspect().ready, ['alpha-ux', 'beta-ux']);
});

test('validation racing changed inputs cannot accept stale saved delivery', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	let state = coordinator.claim({itemId: 'shared-ux', agentId: 'author', expectedRevision: 1});
	state = coordinator.deliver({
		itemId: 'shared-ux',
		attemptId: state.attempts['shared-ux'].id,
		agentId: 'author',
		outputs: [{ref: 'ux:element:shared', digest: artifactDigest('saved shared')}],
		resultRef: 'results/shared.json',
		expectedRevision: state.revision,
	});
	await assert.rejects(
		coordinator.accept(
			{itemId: 'shared-ux', attemptId: state.attempts['shared-ux'].id, expectedRevision: state.revision},
			({attempt}) => {
				coordinator.invalidate({bindings: [], expectedRevision: state.revision});
				return {outputs: attempt.delivery.outputs};
			},
		),
		/Stale coordinator revision/,
	);
	assert.deepEqual(coordinator.open().accepted, {});
});

test('invalid overlap and cycle revisions preserve accepted contributions', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	await completeItem(coordinator, 'shared-ux', 'author');
	const original = coordinator.open();
	const overlap = structuredClone(plan);
	overlap.revision++;
	overlap.items[1].owns = [...overlap.items[0].owns];
	assert.throws(
		() => coordinator.revise({plan: overlap, bindings: plan.sources, expectedRevision: original.revision}),
		/Invalid revised/,
	);
	const cycle = structuredClone(plan);
	cycle.revision++;
	cycle.items[0].dependsOn = ['alpha-ux'];
	assert.throws(
		() => coordinator.revise({plan: cycle, bindings: plan.sources, expectedRevision: original.revision}),
		/Invalid revised/,
	);
	assert.deepEqual(coordinator.open(), original);
	const revised = structuredClone(plan);
	revised.revision++;
	revised.items[1].unresolved = ['Owner must resolve newly discovered semantic overlap'];
	coordinator.revise({plan: revised, bindings: plan.sources, expectedRevision: original.revision});
	assert.ok(coordinator.open().accepted['shared-ux']);
	assert.deepEqual(coordinator.inspect().ready, ['beta-ux']);
});

test('uncertain canonical promotion inspects exact bytes before guarded retry', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	await completeItem(coordinator, 'shared-ux', 'author');
	const expectedDigest = artifactDigest('old canonical');
	const nextDigest = artifactDigest('new canonical');
	let state = coordinator.promotionIntent({
		promotionId: 'promote-shared',
		targetRef: 'canonical:shared',
		expectedDigest,
		nextDigest,
		itemIds: ['shared-ux'],
		expectedRevision: coordinator.open().revision,
	});
	const resumed = new DesignCoordinator(directory);
	state = resumed.reconcilePromotion({
		promotionId: 'promote-shared',
		observedDigest: expectedDigest,
		expectedRevision: state.revision,
	});
	assert.equal(state.promotions['promote-shared'].status, 'retryable');
	state = resumed.reconcilePromotion({
		promotionId: 'promote-shared',
		observedDigest: artifactDigest('unrelated human edit'),
		expectedRevision: state.revision,
	});
	assert.equal(state.promotions['promote-shared'].status, 'uncertain');
	state = resumed.reconcilePromotion({
		promotionId: 'promote-shared',
		observedDigest: nextDigest,
		expectedRevision: state.revision,
	});
	assert.equal(state.promotions['promote-shared'].status, 'committed');
	state = resumed.invalidate({bindings: [], expectedRevision: state.revision});
	state = resumed.reconcilePromotion({
		promotionId: 'promote-shared',
		observedDigest: expectedDigest,
		expectedRevision: state.revision,
	});
	assert.equal(state.promotions['promote-shared'].status, 'uncertain');
});

test('a replacement contribution with the same item identity cannot authorize an obsolete promotion', async (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	await completeItem(coordinator, 'shared-ux', 'first-author');
	const expectedDigest = artifactDigest('previous canonical artifact');
	let state = coordinator.promotionIntent({
		promotionId: 'original-promotion',
		targetRef: 'canonical:shared',
		expectedDigest,
		nextDigest: artifactDigest('canonical built from output A'),
		itemIds: ['shared-ux'],
		expectedRevision: coordinator.open().revision,
	});
	const originalContribution = state.promotions['original-promotion'].contributions[0];
	state = coordinator.invalidate({
		bindings: plan.sources,
		changedRefs: ['ux:element:shared'],
		expectedRevision: state.revision,
	});
	state = coordinator.claim({itemId: 'shared-ux', agentId: 'replacement-author', expectedRevision: state.revision});
	const attemptId = state.attempts['shared-ux'].id;
	state = coordinator.deliver({
		itemId: 'shared-ux',
		attemptId,
		agentId: 'replacement-author',
		outputs: [{ref: 'ux:element:shared', digest: artifactDigest('replacement output B')}],
		resultRef: 'results/replacement-shared.json',
		expectedRevision: state.revision,
	});
	state = await coordinator.accept(
		{itemId: 'shared-ux', attemptId, expectedRevision: state.revision},
		({attempt}) => ({outputs: attempt.delivery.outputs}),
	);
	assert.notEqual(state.accepted['shared-ux'].outputs[0].digest, originalContribution.outputs[0].digest);
	state = new DesignCoordinator(directory).reconcilePromotion({
		promotionId: 'original-promotion',
		observedDigest: expectedDigest,
		expectedRevision: state.revision,
	});
	assert.equal(state.promotions['original-promotion'].status, 'uncertain');
	assert.deepEqual(state.promotions['original-promotion'].contributions[0], originalContribution);
	const nextIntent = {
		promotionId: 'replacement-promotion',
		targetRef: 'canonical:shared',
		expectedDigest,
		nextDigest: artifactDigest('canonical built from output B'),
		itemIds: ['shared-ux'],
	};
	assert.throws(
		() => coordinator.promotionIntent({...nextIntent, expectedRevision: state.revision}),
		/pending promotion/,
	);
	await assert.rejects(
		coordinator.retirePromotion(
			{promotionId: 'original-promotion', observedDigest: expectedDigest, expectedRevision: state.revision},
			() => ({receiptRef: 'recovery/unknown.json', observedDigest: expectedDigest, writerStatus: 'unknown'}),
		),
		/remains unconfirmed/,
	);
	assert.equal(coordinator.open().promotions['original-promotion'].status, 'uncertain');
	state = await coordinator.retirePromotion(
		{promotionId: 'original-promotion', observedDigest: expectedDigest, expectedRevision: state.revision},
		() => ({
			receiptRef: 'recovery/old-writer-stopped.json',
			observedDigest: expectedDigest,
			writerStatus: 'stopped',
		}),
	);
	assert.equal(state.promotions['original-promotion'].status, 'retired');
	state = coordinator.promotionIntent({...nextIntent, expectedRevision: state.revision});
	assert.equal(state.promotions['replacement-promotion'].status, 'intent');
	assert.ok(state.history.some((entry) => entry.event === 'promotion-retired'));
});

test('fresh process verifies saved state and dead-owner lock recovery without model execution', (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	coordinator.claim({itemId: 'shared-ux', agentId: 'author', expectedRevision: 1});
	const runner = path.join(directory, 'fresh-process.mjs');
	fs.writeFileSync(
		runner,
		`import fs from 'node:fs';\nimport {DesignCoordinator} from ${JSON.stringify(new URL('./DesignCoordinator.mjs', import.meta.url).href)};\nconst coordinator = new DesignCoordinator(process.argv[2]);\nif (process.argv[3] === 'crash') {fs.writeFileSync(process.argv[2] + '/writer.lock', JSON.stringify({pid:process.pid,token:'crash-owner'})); process.exit(0);}\nconsole.log(JSON.stringify(coordinator.inspect()));\n`,
	);
	const observed = spawnSync(process.execPath, [runner, directory], {encoding: 'utf8'});
	assert.equal(observed.status, 0, observed.error?.message ?? observed.stderr);
	assert.equal(JSON.parse(observed.stdout).state.attempts['shared-ux'].status, 'intent');
	const crashed = spawnSync(process.execPath, [runner, directory, 'crash'], {encoding: 'utf8'});
	assert.equal(crashed.status, 0, crashed.error?.message ?? crashed.stderr);
	assert.equal(coordinator.lockInfo().token, 'crash-owner');
	assert.throws(() => coordinator.recoverLock('incorrect-token'), /lock changed/);
	coordinator.recoverLock('crash-owner');
	assert.equal(coordinator.lockInfo(), null);
	const lockPath = path.join(directory, 'writer.lock');
	fs.writeFileSync(lockPath, JSON.stringify({pid: process.pid, token: 'live-owner'}));
	assert.throws(() => coordinator.recoverLock('live-owner'), /still alive/);
	assert.ok(fs.existsSync(lockPath));
	fs.unlinkSync(lockPath);
	coordinator.reconcile({observations: [], expectedRevision: coordinator.open().revision});
	assert.deepEqual(coordinator.inspect().uncertain, ['shared-ux']);
});

test('truncated or inconsistent saved state fails explicitly without dispatch', (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	const target = path.join(directory, 'state.json');
	const bytes = fs.readFileSync(target, 'utf8');
	fs.writeFileSync(target, bytes.slice(0, 50));
	assert.throws(() => new DesignCoordinator(directory).inspect(), SyntaxError);
	const changed = JSON.parse(bytes);
	changed.payload.revision++;
	fs.writeFileSync(target, JSON.stringify(changed));
	assert.throws(() => new DesignCoordinator(directory).open(), /Inconsistent saved/);
});

test('linked planning paths and process-local capabilities fail at storage ingress', (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const linked = path.join(directory, 'linked');
	const target = path.join(directory, 'real');
	fs.mkdirSync(target);
	fs.symlinkSync(target, linked, process.platform === 'win32' ? 'junction' : 'dir');
	assert.throws(
		() => new DesignCoordinator(linked).initialize({plan, bindings: plan.sources}),
		/Linked planning path/,
	);
	fs.unlinkSync(linked);
	const unsafe = structuredClone(plan);
	unsafe.accessToken = 'synthetic-token-must-never-be-durable';
	assert.throws(
		() => new DesignCoordinator(target).initialize({plan: unsafe, bindings: plan.sources}),
		/capabilities cannot be persisted/,
	);
	assert.equal(fs.existsSync(path.join(target, 'state.json')), false);
});

test('a structurally inconsistent acceptance fails even if the saved checksum matches', (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	const target = path.join(directory, 'state.json');
	const envelope = JSON.parse(fs.readFileSync(target, 'utf8'));
	envelope.payload.accepted['shared-ux'] = {
		agentId: 'unassigned-actor',
		outputs: [{ref: 'ux:element:shared', digest: artifactDigest('unvalidated artifact')}],
		inputs: plan.sources,
	};
	envelope.digest = artifactDigest(JSON.stringify(envelope.payload));
	fs.writeFileSync(target, JSON.stringify(envelope));
	assert.throws(() => new DesignCoordinator(directory).open(), /Inconsistent saved acceptance/);
});

test('unowned outputs and placeholder identities cannot become accepted contributions', (scenario) => {
	const {directory, plan} = scenarioInputs(scenario);
	const coordinator = new DesignCoordinator(directory);
	coordinator.initialize({plan, bindings: plan.sources});
	const state = coordinator.claim({itemId: 'shared-ux', agentId: 'author', expectedRevision: 1});
	const request = {
		itemId: 'shared-ux',
		attemptId: state.attempts['shared-ux'].id,
		agentId: 'author',
		resultRef: 'results/invalid.json',
		expectedRevision: state.revision,
	};
	assert.throws(
		() => coordinator.deliver({...request, outputs: [{ref: 'ux:element:shared', digest: '0'.repeat(64)}]}),
		/Invalid artifact bindings/,
	);
	assert.throws(
		() =>
			coordinator.deliver({
				...request,
				outputs: [{ref: 'ux:flow:alpha', digest: artifactDigest('wrong ownership')}],
			}),
		/unowned outputs/,
	);
	assert.deepEqual(coordinator.open().accepted, {});
	assert.equal(coordinator.open().revision, state.revision);
});
