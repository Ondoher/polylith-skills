import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {WorkflowService} from '../../../scripts/mcp/WorkflowService.mjs';
import {DomainOperations} from '../../../scripts/mcp/DomainOperations.mjs';
import {OperationWorker} from '../../../scripts/mcp/OperationWorker.mjs';
import {DesignCoordinator} from './DesignCoordinator.mjs';
import {DesignPlan} from './DesignPlan.mjs';
import {DesignWorkflow} from './DesignWorkflow.mjs';
import {DesignPreparation} from './DesignPreparation.mjs';
import {DesignRecords} from './design-records.mjs';
import {DesignAssembly} from './design-assembly.mjs';
import {DesignContributions} from './design-contributions.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';
import {createUxReviewSubject, validatePassingUxReview, UX_REVIEW_CRITERIA} from './ux-review.mjs';
import {scopeBasisFixture} from './fixtures/wireframe-scope.mjs';
import {envelope, region, component} from './fixtures/wireframe-prevention.mjs';

/** Creates isolated synthetic native units with one shared owner and two independent flows.
 * @param {DesignCoordinatorTestContext} scenario - Test cleanup lifecycle.
 * @param {DesignWorkflowTestOptions} [options] - Optional real operation catalog.
 * @returns {Promise<DesignWorkflowTestFixture>} - Parent adapter, stores and exact claim helpers.
 */
async function fixture(scenario, {operations = new DomainOperations().operations} = {}) {
	const parent = fileURLToPath(
		new URL('../../../.codex-tmp/parallel-design-execution/workflow-tests/', import.meta.url),
	);
	fs.mkdirSync(parent, {recursive: true});
	const directory = fs.mkdtempSync(path.join(parent, 'case-'));
	const sourcePath = path.join(directory, 'description.md');
	fs.writeFileSync(sourcePath, 'Synthetic two-flow source with one shared owner.');
	const source = {
		ref: 'source:brief',
		digest: crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'),
	};
	const service = new WorkflowService({workspace: directory, stateDirectory: 'workflow', operations});
	const run = service.open({access: service.ownerAccess, run: 'two-flows', sourcePath});
	const store = path.join(run.directory, 'units', 'ux');
	DesignRecords.initialize(store, {stage: 'ux', binding: {source: source.digest}});
	const spec = createUxTestSpec(),
		originalFlow = spec.flows[0];
	const localIds = [
		originalFlow,
		...originalFlow.steps,
		...originalFlow.decisions,
		...originalFlow.alternates,
		...originalFlow.alternates.flatMap((alternate) => alternate.steps),
	];
	const renamed = new Map(
		localIds.map((record) => [record.id, record === originalFlow ? 'alternate-flow' : `alternate-${record.id}`]),
	);
	const alternateFlow = JSON.parse(JSON.stringify(originalFlow), (_key, value) =>
		typeof value === 'string' && renamed.has(value) ? renamed.get(value) : value,
	);
	spec.flows.push(alternateFlow);
	for (const action of spec.actions)
		if (action.taskRefs.includes(originalFlow.id)) action.taskRefs.push(alternateFlow.id);
	for (const frame of spec.interactionFrames)
		if (frame.taskRefs.includes(originalFlow.id)) frame.taskRefs.push(alternateFlow.id);
	for (const feature of spec.features)
		if (feature.flowRefs.includes(originalFlow.id)) feature.flowRefs.push(alternateFlow.id);
	const records = DesignAssembly.importUx(spec);
	const flow = records.find((record) => record.kind === 'flow' && record.id === originalFlow.id);
	const second = records.find((record) => record.kind === 'flow' && record.id === alternateFlow.id);
	for (const record of records) DesignRecords.put(store, record);
	const shared = records.find((record) => record.kind === 'element');
	const refs = {shared: `element:${shared.id}`, alpha: `flow:${flow.id}`, beta: `flow:${second.id}`};
	const plan = {
		schemaVersion: '1.0',
		id: 'native-scopes',
		revision: 1,
		sources: [source],
		scopeRefs: ['shared', 'alpha', 'beta'],
		gaps: [],
		gates: [],
		outcomes: ['shared', 'alpha', 'beta'].map((id) => ({id, sourceRefs: [source.ref]})),
		items: ['shared', 'alpha', 'beta'].map((id) => ({
			id,
			stage: 'ux',
			role: 'ux-planner',
			scopeRefs: [id],
			outcomeIds: [id],
			owns: [`ux:${refs[id]}`],
			dependsOn: id === 'shared' ? [] : ['shared'],
			inputs: id === 'shared' ? [source] : [source, {producer: 'shared', output: `ux:${refs.shared}`}],
			requiredGates: [],
			unresolved: [],
		})),
	};
	const coordinator = new DesignCoordinator(path.join(directory, 'planning'));
	coordinator.initialize({plan, bindings: [source]});
	const resolveInputs = ({attempt}) =>
		attempt.inputs.map(({ref}) => ({
			ref,
			digest:
				ref === source.ref
					? crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex')
					: DesignRecords.read(store, [ref.slice(3)]).identities[ref.slice(3)],
		}));
	const adapter = new DesignWorkflow({service, coordinator, run: run.run, resolveInputs});
	scenario.after(async () => {
		await service.drain();
		DesignContributions.close(store);
		assert.equal(path.dirname(fs.realpathSync(directory)), fs.realpathSync(parent));
		fs.rmSync(directory, {recursive: true, force: true});
	});
	const claim = (itemId) => {
		const state = coordinator.claim({
			itemId,
			agentId: `${itemId}-author`,
			expectedRevision: coordinator.open().revision,
		});
		return {itemId, attemptId: state.attempts[itemId].id, agentId: state.attempts[itemId].agentId};
	};
	const sharedClaim = claim('shared');
	let state = coordinator.deliver({
		...sharedClaim,
		outputs: [{ref: `ux:${refs.shared}`, digest: DesignRecords.digest(shared)}],
		resultRef: 'saved/shared',
		expectedRevision: coordinator.open().revision,
	});
	await coordinator.accept({...sharedClaim, expectedRevision: state.revision}, ({attempt}) => ({
		outputs: attempt.delivery.outputs,
	}));
	return {directory, service, run, store, coordinator, adapter, refs, claim, resolveInputs, sourcePath};
}

/** Performs a small real UX contribution and finishes only the assigned native flow.
 * @param {DesignWorkflowTestFixture} f - Synthetic native fixture.
 * @param {WorkflowAssignmentReceipt} assignment - Real scoped workflow capability.
 * @param {string} ref - Native owned flow reference.
 * @param {string} goal - Distinct proposed goal.
 * @returns {Promise<WorkflowResultReceipt>} - Existing finished-unit receipt.
 */
async function contribute(f, assignment, ref, goal) {
	const request = {access: assignment.access, run: f.run.run};
	const receipt = await f.service.execute({
		...request,
		operation: 'units.status',
		input: {stage: 'ux', references: [ref]},
	});
	const status = receipt.inline;
	await f.service.execute({
		...request,
		operation: 'units.contribute',
		input: {
			stage: 'ux',
			batchId: goal.replaceAll(' ', '-'),
			base: {[ref]: status.units[0].revision},
			changes: [{unit: ref, op: 'set', fields: {goal}}],
		},
	});
	return f.service.execute({...request, operation: 'units.finish', input: {stage: 'ux', references: [ref]}});
}

/** Creates actual scoped preparation beside a native fixture without changing its plan.
 * @param {DesignWorkflowTestFixture} f - Actual synthetic native stores and coordinator.
 * @param {string} scope - Explicit parent product/run scope.
 * @param {string} agentId - Actual available author identity.
 * @param {boolean} [acknowledge=true] - Whether the read-and-wait turn is complete.
 * @returns {DesignWorkflowPreparationFixture} - Persisted ledger, packet and actual actor.
 */
function prepareFixture(f, scope, agentId, acknowledge = true) {
	const preparation = new DesignPreparation(path.join(f.directory, 'preparation'));
	preparation.initialize({scope});
	const packet = {
		scope,
		revision: 'native-scope-preparation',
		instructions: 'Read the exact current saved inputs and wait.',
		bindings: f.coordinator.open().bindings,
	};
	preparation.adopt({
		agentId,
		role: 'ux-planner',
		actualRole: 'ux-planner',
		assignmentResolved: true,
		authorityRevoked: true,
		packet,
		observation: 'fake-host/available-and-revoked',
		expectedRevision: preparation.open().revision,
	});
	const author = preparation.open().authors[0];
	if (acknowledge)
		preparation.acknowledge({
			authorId: author.id,
			agentId,
			attemptId: author.attemptId,
			packetDigest: author.packetDigest,
			observation: 'fake-host/actual-exact-read',
			expectedRevision: preparation.open().revision,
		});
	return {preparation, packet, author};
}

test('foreign preparation scope cannot claim native work or override an actual service run', async (scenario) => {
	const f = await fixture(scenario),
		prepared = prepareFixture(f, 'foreign-product/foreign-run', 'foreign-author');
	const options = {
		service: f.service,
		coordinator: f.coordinator,
		run: f.run.run,
		resolveInputs: f.resolveInputs,
		preparation: prepared.preparation,
	};
	assert.throws(
		() => new DesignWorkflow({...options, preparationScope: 'foreign-product/foreign-run'}),
		/cannot be overridden/,
	);
	const adapter = new DesignWorkflow(options),
		before = prepared.preparation.open();
	assert.throws(
		() =>
			adapter.claimPrepared({
				authorId: prepared.author.id,
				itemId: 'alpha',
				bindings: prepared.packet.bindings,
				observation: 'fake-host/available',
				preparationRevision: before.revision,
				coordinatorRevision: f.coordinator.open().revision,
			}),
		/scope/,
	);
	assert.deepEqual(prepared.preparation.open(), before);
	assert.equal(f.coordinator.open().attempts.alpha, undefined);
	assert.throws(() => new DesignWorkflow({...options, run: undefined}), /current product\/run scope/);
	const fileAdapter = new DesignWorkflow({
		...options,
		service: undefined,
		run: undefined,
		preparationScope: f.run.run,
	});
	assert.throws(
		() =>
			fileAdapter.claimPrepared({
				authorId: prepared.author.id,
				itemId: 'alpha',
				bindings: prepared.packet.bindings,
				observation: 'fake-host/available',
				preparationRevision: before.revision,
				coordinatorRevision: f.coordinator.open().revision,
			}),
		/scope/,
	);
});

test('configured preparation enforces every ordinary native grant and file guard without changing reviewer assignment', async (scenario) => {
	const f = await fixture(scenario),
		prepared = prepareFixture(f, f.run.run, 'preparing-actor', false);
	const adapter = new DesignWorkflow({
		service: f.service,
		coordinator: f.coordinator,
		run: f.run.run,
		resolveInputs: f.resolveInputs,
		preparation: prepared.preparation,
	});
	const state = f.coordinator.claim({
		itemId: 'alpha',
		agentId: prepared.author.agentId,
		expectedRevision: f.coordinator.open().revision,
	});
	const claim = {itemId: 'alpha', attemptId: state.attempts.alpha.id, agentId: prepared.author.agentId};
	const before = DesignRecords.read(f.store);
	assert.throws(() => adapter.assign(claim), /unavailable/);
	assert.throws(() => adapter.withClaim(claim, () => assert.fail('ordinary native file bypass')), /unavailable/);
	const other = f.coordinator.claim({
		itemId: 'beta',
		agentId: 'untracked-native-author',
		expectedRevision: f.coordinator.open().revision,
	});
	assert.throws(
		() => adapter.assign({itemId: 'beta', attemptId: other.attempts.beta.id, agentId: 'untracked-native-author'}),
		/must be tracked/,
	);
	assert.equal(prepared.preparation.inspect().authoringCount, 0);
	assert.deepEqual(DesignRecords.read(f.store), before);
	const review = await reviewFixture(scenario),
		reviewPreparation = new DesignPreparation(path.join(review.directory, 'review-preparation'));
	reviewPreparation.initialize({scope: review.run.run});
	const reviewerAdapter = new DesignWorkflow({
		service: review.service,
		coordinator: review.coordinator,
		run: review.run.run,
		preparation: reviewPreparation,
		resolveInputs: ({attempt}) => attempt.inputs,
	});
	const reviewGrant = reviewerAdapter.assign({...review.claimRequest, reviewSubject: review.subject});
	assert.ok(reviewGrant.operations.includes('ux-review.contribute'));
	assert.equal(reviewPreparation.inspect().openCount, 0);
	reviewerAdapter.revoke({access: reviewGrant.access});
});

test('prepared claim preflight rejects accepted work and stale coordinator observations without stranding pool intent', async (scenario) => {
	const f = await fixture(scenario),
		prepared = prepareFixture(f, f.run.run, 'shared-author');
	const adapter = new DesignWorkflow({
		coordinator: f.coordinator,
		run: f.run.run,
		resolveInputs: f.resolveInputs,
		preparation: prepared.preparation,
	});
	const before = prepared.preparation.open();
	const request = {
		authorId: prepared.author.id,
		itemId: 'shared',
		bindings: prepared.packet.bindings,
		observation: 'fake-host/ready',
		preparationRevision: before.revision,
		coordinatorRevision: f.coordinator.open().revision,
	};
	assert.throws(() => adapter.claimPrepared(request), /not ready/);
	assert.throws(
		() => adapter.claimPrepared({...request, itemId: 'alpha', coordinatorRevision: 1}),
		/Stale coordinator/,
	);
	assert.deepEqual(prepared.preparation.open(), before);
	assert.equal(before.authors[0].assignment, null);
});

test('prepared author uses exact native guards, releases after revocation and stop, and reuses actual identity', async (scenario) => {
	const f = await fixture(scenario);
	const preparation = new DesignPreparation(path.join(f.directory, 'preparation'));
	preparation.initialize({scope: f.run.run});
	const bindings = f.coordinator.open().bindings;
	const packet = {
		scope: f.run.run,
		revision: 'preparation-1',
		instructions: 'Read exact saved source and wait; no research or authoring.',
		bindings,
	};
	preparation.adopt({
		agentId: 'reusable-ux-author',
		role: 'ux-planner',
		actualRole: 'ux-planner',
		assignmentResolved: true,
		authorityRevoked: true,
		packet,
		observation: 'fake-host/available-and-revoked',
		expectedRevision: preparation.open().revision,
	});
	const author = preparation.open().authors[0];
	preparation.acknowledge({
		authorId: author.id,
		agentId: author.agentId,
		attemptId: author.attemptId,
		packetDigest: author.packetDigest,
		observation: 'fake-host/acknowledged-read-and-wait',
		expectedRevision: preparation.open().revision,
	});
	const adapter = new DesignWorkflow({
		service: f.service,
		coordinator: f.coordinator,
		run: f.run.run,
		resolveInputs: f.resolveInputs,
		preparation,
	});
	const claim = adapter.claimPrepared({
		authorId: author.id,
		itemId: 'alpha',
		bindings,
		observation: 'fake-host/currently-available',
		preparationRevision: preparation.open().revision,
		coordinatorRevision: f.coordinator.open().revision,
	});
	const grant = adapter.assignPrepared({
		...claim,
		authorId: author.id,
		preparationRevision: preparation.open().revision,
	});
	const receipt = await contribute(f, grant, f.refs.alpha, 'Prepared native proposal');
	const outputs = [{ref: `ux:${f.refs.alpha}`, digest: DesignRecords.read(f.store).identities[f.refs.alpha]}];
	let state = f.coordinator.deliver({
		...claim,
		outputs,
		resultRef: receipt.handle,
		expectedRevision: f.coordinator.open().revision,
	});
	await f.coordinator.accept({...claim, expectedRevision: state.revision}, ({attempt}) => ({
		outputs: attempt.delivery.outputs,
	}));
	const reopenedAdapter = new DesignWorkflow({
		service: f.service,
		coordinator: f.coordinator,
		run: f.run.run,
		resolveInputs: f.resolveInputs,
		preparation: new DesignPreparation(path.join(f.directory, 'preparation')),
	});
	assert.throws(
		() =>
			reopenedAdapter.releasePrepared({
				authorId: author.id,
				observation: {
					status: 'stopped',
					agentId: author.agentId,
					attemptId: claim.attemptId,
					ref: 'fake-host/stopped-after-reopen',
				},
				preparationRevision: preparation.open().revision,
			}),
		/revocation is unconfirmed/,
	);
	adapter.releasePrepared({
		authorId: author.id,
		observation: {
			status: 'stopped',
			agentId: author.agentId,
			attemptId: claim.attemptId,
			ref: 'fake-host/stopped-alpha',
		},
		preparationRevision: preparation.open().revision,
	});
	assert.equal(preparation.open().authors[0].contributions[0].agentId, author.agentId);
	await assert.rejects(
		f.service.execute({
			access: grant.access,
			run: f.run.run,
			operation: 'units.status',
			input: {stage: 'ux', references: [f.refs.alpha]},
		}),
	);
	const next = adapter.claimPrepared({
		authorId: author.id,
		itemId: 'beta',
		bindings,
		observation: 'fake-host/currently-available-again',
		preparationRevision: preparation.open().revision,
		coordinatorRevision: f.coordinator.open().revision,
	});
	assert.equal(next.agentId, claim.agentId);
	assert.notEqual(next.attemptId, claim.attemptId);
	const nextGrant = adapter.assignPrepared({
		...next,
		authorId: author.id,
		preparationRevision: preparation.open().revision,
	});
	const secondReceipt = await contribute(f, nextGrant, f.refs.beta, 'Reused native proposal');
	assert.ok(secondReceipt.inline);
	assert.equal(preparation.inspect().authoringCount, 1);
});

test('prepared retained-file route denies preparation writes and guards materialization without a service token', async (scenario) => {
	const f = await fixture(scenario),
		preparation = new DesignPreparation(path.join(f.directory, 'preparation'));
	preparation.initialize({scope: f.run.run});
	const packet = {
		scope: f.run.run,
		revision: 'file-preparation',
		instructions: 'Read current source; acknowledge and wait without authoring.',
		bindings: f.coordinator.open().bindings,
	};
	preparation.adopt({
		agentId: 'file-author',
		role: 'ux-planner',
		actualRole: 'ux-planner',
		assignmentResolved: true,
		authorityRevoked: true,
		packet,
		observation: 'fake-host/available',
		expectedRevision: preparation.open().revision,
	});
	const author = preparation.open().authors[0];
	const adapter = new DesignWorkflow({
		coordinator: f.coordinator,
		run: f.run.run,
		resolveInputs: f.resolveInputs,
		preparation,
	});
	const before = DesignRecords.read(f.store);
	assert.throws(
		() =>
			adapter.withPreparedClaim(
				{authorId: author.id, itemId: 'alpha', attemptId: 'unclaimed', agentId: author.agentId},
				() => assert.fail('preparation cannot write'),
			),
		/unavailable/,
	);
	preparation.acknowledge({
		authorId: author.id,
		agentId: author.agentId,
		attemptId: author.attemptId,
		packetDigest: author.packetDigest,
		observation: 'fake-host/packet-read',
		expectedRevision: preparation.open().revision,
	});
	const claim = adapter.claimPrepared({
		authorId: author.id,
		itemId: 'alpha',
		bindings: packet.bindings,
		observation: 'fake-host/currently-available',
		preparationRevision: preparation.open().revision,
		coordinatorRevision: f.coordinator.open().revision,
	});
	adapter.authorizePreparedFile({...claim, authorId: author.id, preparationRevision: preparation.open().revision});
	const reopened = new DesignPreparation(path.join(f.directory, 'preparation'));
	const resumed = new DesignWorkflow({
		coordinator: new DesignCoordinator(path.join(f.directory, 'planning')),
		run: f.run.run,
		resolveInputs: f.resolveInputs,
		preparation: reopened,
	});
	f.coordinator.reconcile({observations: [], expectedRevision: f.coordinator.open().revision});
	reopened.observe({
		authorId: author.id,
		agentId: author.agentId,
		status: 'unknown',
		observation: 'fake-host/resume-unknown',
		expectedRevision: reopened.open().revision,
	});
	const guarded = (action) => resumed.withPreparedClaim({...claim, authorId: author.id}, action);
	assert.throws(() => guarded(() => assert.fail('uncertain author cannot write')), /unavailable/);
	f.coordinator.reconcile({
		observations: [{...claim, status: 'live'}],
		expectedRevision: f.coordinator.open().revision,
	});
	reopened.observe({
		authorId: author.id,
		agentId: author.agentId,
		status: 'live',
		observation: 'fake-host/same-surviving-attempt',
		expectedRevision: reopened.open().revision,
	});
	const status = guarded(() => DesignContributions.status(f.store, [f.refs.alpha]));
	guarded(() =>
		DesignContributions.contribute(f.store, {
			batchId: 'prepared-file',
			base: {[f.refs.alpha]: status.units[0].revision},
			changes: [{unit: f.refs.alpha, op: 'set', fields: {goal: 'Prepared file proposal'}}],
		}),
	);
	guarded(() => DesignContributions.finish(f.store, [f.refs.alpha]));
	assert.notEqual(DesignRecords.read(f.store).identities[f.refs.alpha], before.identities[f.refs.alpha]);
	const outputs = [{ref: `ux:${f.refs.alpha}`, digest: DesignRecords.read(f.store).identities[f.refs.alpha]}];
	const delivered = f.coordinator.deliver({
		...claim,
		outputs,
		resultRef: 'saved/file-proposal',
		expectedRevision: f.coordinator.open().revision,
	});
	await f.coordinator.accept({...claim, expectedRevision: delivered.revision}, ({attempt}) => ({
		outputs: attempt.delivery.outputs,
	}));
	const after = DesignRecords.read(f.store);
	assert.throws(() => guarded(() => assert.fail('accepted author cannot write')), /active exact/);
	resumed.releasePrepared({
		authorId: author.id,
		observation: {status: 'stopped', agentId: author.agentId, attemptId: claim.attemptId, ref: 'fake-host/stopped'},
		preparationRevision: preparation.open().revision,
	});
	assert.equal(preparation.open().authors[0].status, 'available');
	assert.deepEqual(DesignRecords.read(f.store), after);
});

/** Called by branch scenarios to issue a real exact-subject reviewer capability.
 * Uses deterministic fixture judgments, not a live specialist quality verdict.
 *
 * @param {DesignCoordinatorTestContext} scenario - Owned cleanup lifecycle.
 * @returns {Promise<DesignWorkflowReviewTestFixture>} - Exact reviewer and optional gated UI item.
 */
async function reviewFixture(scenario) {
	const f = await fixture(scenario);
	for (const id of ['alpha', 'beta']) {
		const claim = f.claim(id);
		const nativeRef = f.refs[id];
		const delivered = f.coordinator.deliver({
			...claim,
			outputs: [{ref: `ux:${nativeRef}`, digest: DesignRecords.read(f.store, [nativeRef]).identities[nativeRef]}],
			resultRef: `saved/${id}`,
			expectedRevision: f.coordinator.open().revision,
		});
		await f.coordinator.accept({...claim, expectedRevision: delivered.revision}, ({attempt}) => ({
			outputs: attempt.delivery.outputs,
		}));
	}
	const ux = DesignAssembly.ux(DesignRecords.read(f.store).records).document;
	ux.sources[0].path = path.basename(f.sourcePath);
	const uxPath = path.join(f.directory, 'ux-spec.json');
	fs.writeFileSync(uxPath, JSON.stringify(ux));
	const uxBinding = {
		ref: 'ux:document:frozen',
		digest: crypto.createHash('sha256').update(fs.readFileSync(uxPath)).digest('hex'),
	};
	const state = f.coordinator.open(),
		plan = structuredClone(state.plan);
	plan.revision++;
	plan.scopeRefs.push('whole-ux', 'view:main');
	plan.outcomes.push({id: 'visual', sourceRefs: [plan.sources[0].ref]});
	const inputs = [plan.sources[0], {producer: 'assemble-ux', output: uxBinding.ref}];
	plan.items.push({
		id: 'assemble-ux',
		stage: 'assembly',
		role: 'parent',
		scopeRefs: ['whole-ux'],
		outcomeIds: [],
		owns: [uxBinding.ref],
		dependsOn: ['shared', 'alpha', 'beta'],
		inputs: [
			plan.sources[0],
			...['shared', 'alpha', 'beta'].map((id) => ({producer: id, output: `ux:${f.refs[id]}`})),
		],
		requiredGates: [],
		unresolved: [],
	});
	plan.items.push({
		id: 'review-ux',
		stage: 'review',
		role: 'ux-reviewer',
		scopeRefs: ['whole-ux'],
		outcomeIds: [],
		owns: ['review:ux:fixture'],
		dependsOn: ['assemble-ux'],
		inputs,
		requiredGates: [],
		unresolved: [],
		reviewOf: ['shared', 'alpha', 'beta'],
	});
	plan.gates.push({id: 'whole-ux-review', reviewerItemId: 'review-ux', scopeRefs: ['whole-ux'], inputs});
	plan.items.push({
		id: 'ui',
		stage: 'ui',
		role: 'ui-designer',
		scopeRefs: ['view:main'],
		outcomeIds: ['visual'],
		owns: ['ui:part:main'],
		dependsOn: ['review-ux', 'assemble-ux'],
		inputs,
		requiredGates: ['whole-ux-review'],
		unresolved: [],
	});
	assert.deepEqual(new DesignPlan(plan).validate().findings, []);
	f.coordinator.revise({plan, bindings: state.bindings, expectedRevision: state.revision});
	const assemblyClaim = f.claim('assemble-ux');
	const assemblyDelivery = f.coordinator.deliver({
		...assemblyClaim,
		outputs: [uxBinding],
		resultRef: uxPath,
		expectedRevision: f.coordinator.open().revision,
	});
	await f.coordinator.accept({...assemblyClaim, expectedRevision: assemblyDelivery.revision}, ({attempt}) => {
		assert.equal(crypto.createHash('sha256').update(fs.readFileSync(uxPath)).digest('hex'), uxBinding.digest);
		return {outputs: attempt.delivery.outputs};
	});
	const resolveInputs = ({attempt}) =>
		attempt.inputs.map(({ref}) => ({
			ref,
			digest:
				ref === uxBinding.ref
					? crypto.createHash('sha256').update(fs.readFileSync(uxPath)).digest('hex')
					: ref === plan.sources[0].ref
						? crypto.createHash('sha256').update(fs.readFileSync(f.sourcePath)).digest('hex')
						: DesignRecords.read(f.store, [ref.slice(3)]).identities[ref.slice(3)],
		}));
	const adapter = new DesignWorkflow({service: f.service, coordinator: f.coordinator, run: f.run.run, resolveInputs});
	const reviewInput = {
		uxPath,
		productDescriptionPath: f.sourcePath,
		productDescriptionId: 'product',
		sourceRoot: f.directory,
		scopeRefs: [ux.id],
	};
	const reviewOptions = {
		uxSpec: ux,
		uxSource: fs.readFileSync(uxPath),
		uxArtifactPath: uxPath,
		productDescriptionSource: fs.readFileSync(f.sourcePath),
		productDescriptionPath: f.sourcePath,
		productDescriptionId: 'product',
		sourceRoot: f.directory,
		scopeRefs: [ux.id],
		requiredScopeRefs: [ux.id],
	};
	const subject = createUxReviewSubject(reviewOptions);
	const claim = f.claim('review-ux');
	const assignment = adapter.assign({...claim, reviewSubject: subject, readPaths: [uxPath, f.sourcePath]});
	const part = await f.service.execute({
		access: assignment.access,
		run: f.run.run,
		operation: 'ux-review.contribute',
		input: {
			subject,
			fragment: {
				coverage: UX_REVIEW_CRITERIA.map((criterion) => ({
					criterion,
					result: 'pass',
					evidenceRefs: [ux.id],
					note: 'Deterministic exact-subject transport fixture; not live qualitative assessment.',
				})),
				limits: ['Synthetic validator fixture only.'],
			},
		},
	});
	const receipt = await f.service.execute({
		access: assignment.access,
		run: f.run.run,
		operation: 'ux-review.assemble',
		input: {...reviewInput, subject, verdict: 'pass', summary: 'Deterministic reviewer branch fixture.'},
		inputHandles: {parts: [part.handle]},
	});
	const review = JSON.parse(fs.readFileSync(receipt.path, 'utf8'));
	validatePassingUxReview(review, reviewOptions);
	return {
		...f,
		adapter,
		resolveInputs,
		uxPath,
		subject,
		claimRequest: claim,
		assignment,
		receipt,
		review,
		reviewOptions,
	};
}

test('two exact claimed contributors retain native sibling meaning and one shared owner', async (scenario) => {
	const f = await fixture(scenario);
	const alpha = f.adapter.assign(f.claim('alpha'));
	const beta = f.adapter.assign(f.claim('beta'));
	await Promise.all([
		contribute(f, alpha, f.refs.alpha, 'Keep alpha meaning'),
		contribute(f, beta, f.refs.beta, 'Keep beta meaning'),
	]);
	assert.equal(DesignRecords.read(f.store, [f.refs.alpha]).records[0].data.goal, 'Keep alpha meaning');
	assert.equal(DesignRecords.read(f.store, [f.refs.beta]).records[0].data.goal, 'Keep beta meaning');
	assert.equal(f.coordinator.open().plan.items.filter((item) => item.owns.includes(`ux:${f.refs.shared}`)).length, 1);
	assert.equal(f.coordinator.open().attempts.alpha.status, 'intent');
	assert.equal(JSON.stringify(f.coordinator.open()).includes(alpha.access), false);
});

test('stage and native unit grants reject writes to sibling owners', async (scenario) => {
	const f = await fixture(scenario);
	const assignment = f.adapter.assign(f.claim('alpha'));
	const before = DesignRecords.read(f.store);
	for (const input of [
		{stage: 'ux', references: [f.refs.beta]},
		{stage: 'ui', references: [f.refs.alpha]},
	])
		await assert.rejects(
			f.service.execute({access: assignment.access, run: f.run.run, operation: 'units.read', input}),
			/assignment|assigned/,
		);
	assert.deepEqual(DesignRecords.read(f.store), before);
	assert.equal(fs.existsSync(`${f.store}.contributions`), false);
});

test('obsolete, uncertain and delivered attempts cannot mutate or submit results', async (scenario) => {
	const f = await fixture(scenario);
	const claim = f.claim('alpha');
	const assignment = f.adapter.assign(claim);
	const before = DesignRecords.read(f.store);
	f.coordinator.reconcile({observations: [], expectedRevision: f.coordinator.open().revision});
	await assert.rejects(contribute(f, assignment, f.refs.alpha, 'Uncertain edit'), /active exact/);
	assert.throws(
		() => f.service.store({access: assignment.access, run: f.run.run, value: {late: true}}),
		/active exact/,
	);
	f.coordinator.reconcile({
		observations: [{...claim, status: 'live'}],
		expectedRevision: f.coordinator.open().revision,
	});
	f.coordinator.deliver({
		...claim,
		outputs: [{ref: `ux:${f.refs.alpha}`, digest: before.identities[f.refs.alpha]}],
		resultRef: 'saved/alpha',
		expectedRevision: f.coordinator.open().revision,
	});
	await assert.rejects(contribute(f, assignment, f.refs.alpha, 'Delivered edit'), /active exact/);
	f.coordinator.fail({...claim, reason: 'Superseded worker', expectedRevision: f.coordinator.open().revision});
	f.claim('alpha');
	await assert.rejects(contribute(f, assignment, f.refs.alpha, 'Late old edit'), /Stale or missing/);
	assert.deepEqual(DesignRecords.read(f.store), before);
});

test('capability revocation rejects an already queued native mutation', async (scenario) => {
	let release, entered;
	const barrier = new Promise((resolve) => {
		release = resolve;
	});
	const admission = new Promise((resolve) => {
		entered = resolve;
	});
	const operations = new DomainOperations().operations;
	operations['test.wait'] = {
		inputSchema: {type: 'object'},
		assignable: false,
		writes: false,
		execute: async () => {
			entered();
			await barrier;
			return null;
		},
	};
	const f = await fixture(scenario, {operations});
	const assignment = f.adapter.assign(f.claim('alpha'));
	const before = fs.readdirSync(f.store).sort();
	const waiting = f.service.execute({access: f.service.ownerAccess, run: f.run.run, operation: 'test.wait'});
	await admission;
	const queued = f.service.execute({
		access: assignment.access,
		run: f.run.run,
		operation: 'units.status',
		input: {stage: 'ux', references: [f.refs.alpha]},
	});
	const rejected = assert.rejects(queued, /Capability does not authorize/);
	f.adapter.revoke({access: assignment.access});
	release();
	await waiting;
	await rejected;
	assert.deepEqual(fs.readdirSync(f.store).sort(), before);
	assert.equal(fs.existsSync(`${f.store}.contributions`), false);
});

test('a changed claim during lazy import is checked again before native storage', async (scenario) => {
	let release, entered;
	const barrier = new Promise((resolve) => {
		release = resolve;
	});
	const admission = new Promise((resolve) => {
		entered = resolve;
	});
	const domain = new DomainOperations();
	const load = domain._module.bind(domain);
	domain._module = async (relative) => {
		entered();
		await barrier;
		return load(relative);
	};
	const f = await fixture(scenario, {operations: domain.operations});
	const claim = f.claim('alpha'),
		assignment = f.adapter.assign(claim);
	const before = fs.readdirSync(f.store).sort();
	const pending = f.service.execute({
		access: assignment.access,
		run: f.run.run,
		operation: 'units.status',
		input: {stage: 'ux', references: [f.refs.alpha]},
	});
	await admission;
	f.coordinator.fail({...claim, reason: 'Failed during import', expectedRevision: f.coordinator.open().revision});
	const rejected = assert.rejects(pending, /Stale or missing/);
	release();
	await rejected;
	assert.deepEqual(fs.readdirSync(f.store).sort(), before);
	assert.equal(fs.existsSync(`${f.store}.contributions`), false);
});

test('revocation during lazy import prevents contribution baseline creation', async (scenario) => {
	let release, entered;
	const barrier = new Promise((resolve) => {
		release = resolve;
	});
	const admission = new Promise((resolve) => {
		entered = resolve;
	});
	const domain = new DomainOperations(),
		load = domain._module.bind(domain);
	domain._module = async (relative) => {
		entered();
		await barrier;
		return load(relative);
	};
	const f = await fixture(scenario, {operations: domain.operations});
	const assignment = f.adapter.assign(f.claim('alpha'));
	const pending = f.service.execute({
		access: assignment.access,
		run: f.run.run,
		operation: 'units.status',
		input: {stage: 'ux', references: [f.refs.alpha]},
	});
	await admission;
	f.adapter.revoke({access: assignment.access});
	const rejected = assert.rejects(pending, /Capability does not authorize/);
	release();
	await rejected;
	assert.equal(fs.existsSync(`${f.store}.contributions`), false);
});

test('a marked assignment without a parent-bound guard fails closed', async (scenario) => {
	const f = await fixture(scenario);
	const assignment = f.service.assign({
		access: f.service.ownerAccess,
		run: f.run.run,
		operations: ['units.status'],
		scope: {stage: 'ux', recordRefs: [f.refs.alpha], assignmentGuardRequired: true},
	});
	await assert.rejects(
		f.service.execute({
			access: assignment.access,
			run: f.run.run,
			operation: 'units.status',
			input: {stage: 'ux', references: [f.refs.alpha]},
		}),
		/guard is not bound/,
	);
	assert.throws(
		() =>
			f.service.bindAssignmentGuard({
				access: assignment.access,
				run: f.run.run,
				assignmentAccess: assignment.access,
				guard: (action) => action(),
			}),
		/Capability does not authorize/,
	);
});

test('service restart renews only a positively reconciled exact surviving attempt', async (scenario) => {
	const f = await fixture(scenario);
	const claim = f.claim('alpha'),
		old = f.adapter.assign(claim);
	const service = new WorkflowService({
		workspace: f.directory,
		stateDirectory: 'workflow',
		operations: new DomainOperations().operations,
	});
	service.open({access: service.ownerAccess, run: f.run.run, sourcePath: f.sourcePath});
	const adapter = new DesignWorkflow({
		service,
		coordinator: new DesignCoordinator(path.join(f.directory, 'planning')),
		run: f.run.run,
		resolveInputs: f.resolveInputs,
	});
	await assert.rejects(
		service.execute({
			access: old.access,
			run: f.run.run,
			operation: 'units.status',
			input: {stage: 'ux', references: [f.refs.alpha]},
		}),
		/Capability does not authorize/,
	);
	assert.throws(() => adapter.refresh({...claim, observation: {...claim, status: 'unknown'}}), /live worker/);
	assert.throws(() => adapter.refresh({...claim, observation: {...claim, status: 'live'}}), /Reconcile/);
	f.coordinator.reconcile({
		observations: [{...claim, status: 'live'}],
		expectedRevision: f.coordinator.open().revision,
	});
	const renewed = adapter.refresh({...claim, observation: {...claim, status: 'live'}});
	assert.notEqual(renewed.access, old.access);
	await contribute({...f, service}, renewed, f.refs.alpha, 'Renewed edit');
	assert.equal(DesignRecords.read(f.store, [f.refs.alpha]).records[0].data.goal, 'Renewed edit');
	await service.drain();
});

test('worker-backed service retains guarded callbacks and keeps ordinary operations on its worker', async (scenario) => {
	const worker = new OperationWorker();
	const f = await fixture(scenario, {operations: worker.operations});
	try {
		const assignment = f.adapter.assign({...f.claim('alpha'), readPaths: [f.sourcePath]});
		await contribute(f, assignment, f.refs.alpha, 'Guarded worker edit');
		assert.equal(worker._worker, null);
		const ordinary = f.service.assign({
			access: f.service.ownerAccess,
			run: f.run.run,
			operations: ['files.read'],
			readPaths: [f.sourcePath],
		});
		await f.service.execute({
			access: ordinary.access,
			run: f.run.run,
			operation: 'files.read',
			input: {paths: [f.sourcePath]},
		});
		assert.notEqual(worker._worker, null);
		assert.equal(DesignRecords.read(f.store, [f.refs.alpha]).records[0].data.goal, 'Guarded worker edit');
	} finally {
		await f.service.drain();
		await worker.close();
	}
});

test('retained file route holds the writer lock, detects actual source changes and rejects async callbacks', async (scenario) => {
	const f = await fixture(scenario),
		claim = f.claim('alpha');
	let invoked = false;
	assert.throws(
		() =>
			f.adapter.withClaim(claim, async () => {
				invoked = true;
			}),
		/synchronous/,
	);
	assert.equal(invoked, false);
	f.adapter.withClaim(claim, () => {
		assert.equal(f.coordinator.lockInfo().pid, process.pid);
		assert.throws(
			() =>
				f.coordinator.fail({
					...claim,
					reason: 'Racing failure',
					expectedRevision: f.coordinator.open().revision,
				}),
			/EEXIST/,
		);
	});
	assert.equal(f.coordinator.lockInfo(), null);
	fs.writeFileSync(f.sourcePath, 'Changed human-owned source bytes.');
	assert.throws(
		() =>
			f.adapter.withClaim(claim, () => {
				invoked = true;
			}),
		/inputs changed/,
	);
	assert.equal(invoked, false);
});

test('coordinator guard rejects asynchronous callbacks and returned promises without advancing state', async (scenario) => {
	const f = await fixture(scenario),
		claim = f.claim('alpha');
	const before = f.coordinator.open();
	let invoked = false;
	assert.throws(
		() =>
			f.coordinator.withClaim(claim, async () => {
				invoked = true;
			}),
		/synchronous/,
	);
	assert.equal(invoked, false);
	assert.throws(() => f.coordinator.withClaim(claim, () => Promise.resolve(null)), /cannot return promises/);
	assert.deepEqual(f.coordinator.open(), before);
	assert.equal(f.coordinator.lockInfo(), null);
});

test('adapter-created reviewer binds actual exact subject and denies wrong, revoked and stale deliveries', async (scenario) => {
	const f = await reviewFixture(scenario);
	assert.deepEqual(f.review.subject, f.subject);
	const bytes = fs.readFileSync(f.receipt.path);
	const wrong = structuredClone(f.subject);
	wrong.uxArtifact.revision = 'obsolete';
	await assert.rejects(
		f.service.execute({
			access: f.assignment.access,
			run: f.run.run,
			operation: 'ux-review.contribute',
			input: {subject: wrong, fragment: {limits: ['Wrong exact subject.']}},
		}),
		/outside the assignment/,
	);
	f.adapter.revoke({access: f.assignment.access});
	await assert.rejects(
		f.service.execute({
			access: f.assignment.access,
			run: f.run.run,
			operation: 'ux-review.contribute',
			input: {subject: f.subject, fragment: {limits: ['Revoked reviewer.']}},
		}),
		/Capability does not authorize/,
	);
	const fresh = f.adapter.assign({...f.claimRequest, reviewSubject: f.subject, readPaths: [f.uxPath, f.sourcePath]});
	fs.appendFileSync(f.uxPath, '\n');
	await assert.rejects(
		f.service.execute({
			access: fresh.access,
			run: f.run.run,
			operation: 'ux-review.contribute',
			input: {subject: f.subject, fragment: {limits: ['Stale UX bytes.']}},
		}),
		/inputs changed/,
	);
	assert.deepEqual(fs.readFileSync(f.receipt.path), bytes);
});

test('adapter-created UI native delivery retains actual wireframe acceptance and revoked byte protection', async (scenario) => {
	const f = await reviewFixture(scenario);
	let state = f.coordinator.deliver({
		...f.claimRequest,
		outputs: [{ref: 'review:ux:fixture', digest: f.receipt.sha256}],
		resultRef: f.receipt.path,
		expectedRevision: f.coordinator.open().revision,
	});
	await f.coordinator.accept({...f.claimRequest, expectedRevision: state.revision}, ({attempt}) => {
		validatePassingUxReview(f.review, f.reviewOptions);
		return {
			outputs: attempt.delivery.outputs,
			gates: {
				'whole-ux-review': {
					reviewerAgentId: attempt.agentId,
					subjectBindings: attempt.inputs,
					subjectDigest: crypto.createHash('sha256').update(JSON.stringify(f.subject)).digest('hex'),
					receiptRef: f.receipt.path,
					receiptDigest: f.receipt.sha256,
				},
			},
		};
	});
	const store = path.join(f.run.directory, 'units', 'ui');
	DesignRecords.initialize(store, {stage: 'ui', binding: {source: f.subject.uxArtifact.sha256}});
	const document = envelope(
		'dialog',
		region('dialog-root', [component('save', 'button', {label: 'Save'})]),
		640,
		480,
	);
	const call = (access, operation, input) => f.service.execute({access, run: f.run.run, operation, input});
	await call(f.service.ownerAccess, 'wireframes.prepare', {
		context: {
			scopeBasis: scopeBasisFixture(document.elementId, 'flow:fixture-flow'),
			flows: [{id: 'fixture-flow'}],
			actions: [],
		},
		scope: {
			elements: [
				{
					id: document.elementId,
					disposition: 'update',
					impactRefs: ['confirm-save'],
					changeReason: 'Synthetic confirmation requirement',
					sourceFlowRefs: ['fixture-flow'],
					sourceActionRefs: [],
					requiredStates: ['main'],
				},
			],
		},
	});
	const author = f.service.assign({
		access: f.service.ownerAccess,
		run: f.run.run,
		operations: ['wireframes.contribute', 'wireframes.submit'],
		scope: {role: 'wireframe', elementId: document.elementId},
	});
	const draft = await call(author.access, 'wireframes.contribute', {
		elementId: document.elementId,
		parts: document.parts,
		scenes: document.scenes,
		finish: true,
	});
	assert.equal(draft.inline.previewReady, true);
	await call(author.access, 'wireframes.submit', {
		elementId: document.elementId,
		revision: draft.inline.revision,
		inspected: true,
	});
	const assignment = f.adapter.assign({...f.claim('ui'), wireframeElementIds: [document.elementId]});
	const record = {kind: 'part', id: 'main', data: document.parts[0], dependencies: []};
	await assert.rejects(
		call(assignment.access, 'units.deliver', {stage: 'ui', records: [record]}),
		/Wireframe acceptance required/,
	);
	assert.equal(DesignRecords.read(store).records.length, 0);
	const reviewer = f.service.assign({
		access: f.service.ownerAccess,
		run: f.run.run,
		operations: ['wireframes.review'],
		scope: {role: 'wireframe-review', elementId: document.elementId, revision: draft.inline.revision},
	});
	await call(reviewer.access, 'wireframes.review', {
		elementId: document.elementId,
		revision: draft.inline.revision,
		verdict: 'pass',
		findings: [],
		limits: ['Deterministic independent acceptance fixture; not a live visual assessment.'],
	});
	await call(assignment.access, 'units.deliver', {stage: 'ui', records: [record]});
	assert.deepEqual(DesignRecords.read(store, ['part:main']).records, [record]);
	const bytes = fs.readFileSync(path.join(store, 'part.main.json'));
	f.adapter.revoke({access: assignment.access});
	const changed = structuredClone(record);
	changed.data.root.label = 'Obsolete worker edit';
	await assert.rejects(
		call(assignment.access, 'units.deliver', {stage: 'ui', records: [changed]}),
		/Capability does not authorize/,
	);
	assert.deepEqual(fs.readFileSync(path.join(store, 'part.main.json')), bytes);
});
