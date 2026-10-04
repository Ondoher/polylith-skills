import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {DesignPlan} from './DesignPlan.mjs';
import {DesignCoordinator} from './DesignCoordinator.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const scratchRoot = path.join(repositoryRoot, '.codex-tmp', 'parallel-design-execution', 'm7');
const fixture = JSON.parse(
	fs.readFileSync(new URL('../test-fixtures/parallel-design-plan.json', import.meta.url), 'utf8'),
);
const originalBrief = fs.readFileSync(new URL('../test-fixtures/parallel-design-brief.md', import.meta.url), 'utf8');
let runDirectory;
let activeCase;
const cases = [];

/** Called before directory creation to reject linked ancestors and prove physical scratch ownership.
 * Missing descendants are resolved from their closest existing physical parent.
 *
 * @param {string} directory - Candidate scratch directory.
 * @param {boolean} allowScratchRoot - Whether the scratch root itself is permitted.
 * @returns {void} - Verified owned location; rejection precedes filesystem writes.
 */
function assertOwnedDirectory(directory, allowScratchRoot = false) {
	const target = path.resolve(directory);
	const relative = path.relative(scratchRoot, target);
	assert(
		(allowScratchRoot || relative) && !relative.startsWith('..') && !path.isAbsolute(relative),
		'Evaluation outputs must stay under the repository M7 scratch root',
	);
	let current = target;
	let closestExisting;
	for (;;) {
		let stats;
		try {
			stats = fs.lstatSync(current);
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
		}
		if (stats) {
			assert(!stats.isSymbolicLink(), 'Linked evaluation directory or ancestor');
			assert(stats.isDirectory(), 'Evaluation ancestor must be a directory');
			closestExisting ??= current;
		}
		if (current === path.dirname(current)) break;
		current = path.dirname(current);
	}
	const physicalRepository = fs.realpathSync(repositoryRoot);
	assert.equal(
		path.relative(path.resolve(repositoryRoot), physicalRepository),
		'',
		'Repository root must be a physical directory',
	);
	const physicalTarget = path.resolve(fs.realpathSync(closestExisting), path.relative(closestExisting, target));
	const physicalScratch = path.join(physicalRepository, '.codex-tmp', 'parallel-design-execution', 'm7');
	const physicalRelative = path.relative(physicalScratch, physicalTarget);
	assert(
		(allowScratchRoot || physicalRelative) &&
			!physicalRelative.startsWith('..') &&
			!path.isAbsolute(physicalRelative),
		'Evaluation location must remain inside the physical M7 scratch root',
	);
}

/** Called by synthetic evidence creation to identify actual saved bytes.
 *
 * @param {string | Buffer} bytes - Saved synthetic content.
 * @returns {string} - Exact SHA-256 digest.
 */
function digest(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

/** Called by each case to preserve a generic brief and bind its exact bytes.
 *
 * @param {string} caseName - Matrix case identity.
 * @param {DesignPlanDocument} plan - Synthetic operational decomposition.
 * @param {string} extraSource - Explicit additional synthetic requests.
 * @param {string[]} requestedOutcomeIds - Independently supplied case source checklist.
 * @returns {DesignWorkflowCoordinator} - Initialized durable fake-worker coordinator.
 */
function initializeCase(caseName, plan, extraSource, requestedOutcomeIds) {
	const directory = path.join(runDirectory, caseName);
	assertOwnedDirectory(directory);
	fs.mkdirSync(directory);
	const baseSource =
		caseName === 'larger'
			? '# Synthetic six-track brief\n\nRequested outcomes:\n- shared: One reusable selection component supports six independent workflows.\n- visual: Each workflow receives its own UI after whole-UX independent review.\n'
			: originalBrief;
	const source = baseSource + '\n' + extraSource + '\n';
	fs.writeFileSync(path.join(directory, 'brief.md'), source, {flag: 'wx'});
	const binding = {ref: 'source:brief', digest: digest(source)};
	plan.sources = [binding];
	for (const owner of [...plan.items, ...plan.gates])
		for (const input of owner.inputs) if (input.ref === 'source:brief') input.digest = binding.digest;
	const validation = new DesignPlan(plan).validate(requestedOutcomeIds);
	assert.equal(validation.valid, true, JSON.stringify(validation.findings));
	fs.writeFileSync(path.join(directory, 'plan.json'), JSON.stringify(plan, null, 2) + '\n', {flag: 'wx'});
	const coordinator = new DesignCoordinator(path.join(directory, 'planning'));
	coordinator.initialize({plan, bindings: plan.sources});
	activeCase = {name: caseName, directory, sourceChecklist: requestedOutcomeIds, checkpoints: []};
	cases.push(activeCase);
	capture(coordinator, 'initial');
	return coordinator;
}

/** Called by matrix checkpoints to record inspectable readiness and retained work.
 *
 * @param {DesignWorkflowCoordinator} coordinator - Durable fake-worker state owner.
 * @param {string} point - Case checkpoint identity.
 * @returns {void} - Compact evidence appended without altering acceptance.
 */
function capture(coordinator, point) {
	const inspection = coordinator.inspect();
	const state = inspection.state;
	activeCase.checkpoints.push({
		point,
		planRevision: state.plan.revision,
		coverage: new DesignPlan(state.plan).validate(activeCase.sourceChecklist).coverage,
		owners: state.plan.items.flatMap((item) => item.owns.map((ref) => ({ref, itemId: item.id}))),
		ready: inspection.ready,
		blocked: inspection.items
			.filter((item) => item.status === 'blocked')
			.map((item) => ({id: item.id, reasons: item.blockers.map((blocker) => blocker.code)})),
		uncertain: inspection.uncertain,
		accepted: structuredClone(state.accepted),
		gateBindings: structuredClone(state.gates),
		transitions: state.history.map((event) => ({
			event: event.event,
			itemId: event.itemId,
			affected: event.affected,
		})),
	});
}

/** Called by offline cases to deliver actual synthetic bytes through coordinator acceptance.
 * This callback simulates structural receipt validation only. It is never evidence
 * of model authoring, existing qualitative review, rendering or canonical writes.
 *
 * @param {DesignWorkflowCoordinator} coordinator - Saved state owner.
 * @param {string} itemId - Eligible synthetic work identity.
 * @returns {Promise<void>} - Accepted fake contribution with exact simulated gate bindings.
 */
async function complete(coordinator, itemId) {
	let state = coordinator.open();
	if (!state.attempts[itemId] || ['failed', 'stale'].includes(state.attempts[itemId].status))
		state = coordinator.claim({itemId, agentId: `simulated-${itemId}`, expectedRevision: state.revision});
	const attempt = state.attempts[itemId];
	const item = state.plan.items.find((candidate) => candidate.id === itemId);
	const resultDirectory = path.join(activeCase.directory, 'fake-results');
	assertOwnedDirectory(resultDirectory);
	fs.mkdirSync(resultDirectory, {recursive: true});
	const resultRef = path.join(resultDirectory, `${itemId}-revision-${state.plan.revision}.json`);
	const bytes =
		JSON.stringify({
			kind: 'deterministic-fake-contribution',
			itemId,
			planRevision: state.plan.revision,
			inputs: attempt.inputs,
			owns: item.owns,
		}) + '\n';
	fs.writeFileSync(resultRef, bytes, {flag: 'wx'});
	const outputs = item.owns.map((ref) => ({ref, digest: digest(bytes)}));
	state = coordinator.deliver({
		itemId,
		attemptId: attempt.id,
		agentId: attempt.agentId,
		outputs,
		resultRef,
		expectedRevision: state.revision,
	});
	await coordinator.accept({itemId, attemptId: attempt.id, expectedRevision: state.revision}, async () => {
		assert.equal(digest(fs.readFileSync(resultRef)), digest(bytes));
		const gates = {};
		for (const gate of state.plan.gates.filter((candidate) => candidate.reviewerItemId === itemId)) {
			gates[gate.id] = {
				receiptRef: resultRef,
				reviewerAgentId: attempt.agentId,
				subjectBindings: attempt.inputs,
				subjectDigest: digest(JSON.stringify(attempt.inputs)),
				receiptDigest: digest(bytes),
			};
		}
		return {outputs, gates};
	});
}

/** Called by broader evaluation to build six independent tracks and one coupled downstream flow.
 *
 * @returns {DesignPlanDocument} - Synthetic operational graph with one shared owner.
 */
function largerPlan() {
	const plan = structuredClone(fixture);
	const shared = structuredClone(plan.items[0]);
	const source = plan.sources[0];
	const tracks = Array.from({length: 6}, (_, index) => `track-${index + 1}`);
	const authors = tracks.map((track) => ({
		...structuredClone(plan.items[1]),
		id: `${track}-ux`,
		scopeRefs: [`flow:${track}`],
		outcomeIds: [track],
		owns: [`ux:flow:${track}`],
		inputs: [source, {producer: 'shared-ux', output: 'ux:element:shared'}],
	}));
	const coupled = {
		...structuredClone(plan.items[1]),
		id: 'coupled-ux',
		scopeRefs: ['flow:coupled'],
		outcomeIds: ['coupled'],
		owns: ['ux:flow:coupled'],
		dependsOn: ['track-1-ux', 'track-2-ux'],
		inputs: [
			source,
			{producer: 'track-1-ux', output: 'ux:flow:track-1'},
			{producer: 'track-2-ux', output: 'ux:flow:track-2'},
		],
	};
	const uxAuthors = [shared, ...authors, coupled];
	const assembly = {
		...structuredClone(plan.items[3]),
		dependsOn: uxAuthors.map((item) => item.id),
		inputs: [source, ...uxAuthors.map((item) => ({producer: item.id, output: item.owns[0]}))],
	};
	const reviewer = {...structuredClone(plan.items[4]), reviewOf: uxAuthors.map((item) => item.id)};
	const ui = tracks.map((track) => ({
		...structuredClone(plan.items[5]),
		id: `${track}-ui`,
		scopeRefs: [`view:${track}`],
		owns: [`ui:part:${track}`],
	}));
	plan.id = 'larger-tracks';
	plan.scopeRefs = [
		'component:shared',
		'whole-ux',
		'flow:coupled',
		...tracks.flatMap((track) => [`flow:${track}`, `view:${track}`]),
	];
	plan.outcomes = ['shared', ...tracks, 'coupled', 'visual'].map((id) => ({id, sourceRefs: ['source:brief']}));
	plan.items = [...uxAuthors, assembly, reviewer, ...ui];
	return plan;
}

/** Called by shared-change and missing-specialist cases to retain unrelated evidence work.
 *
 * @param {DesignPlanDocument} plan - Owned synthetic plan copy.
 * @returns {void} - Independent operational research handoff appended.
 */
function addIndependentEvidence(plan) {
	plan.scopeRefs.push('question:independent-evidence');
	plan.items.push({
		id: 'independent-evidence',
		role: 'product-researcher',
		stage: 'research',
		scopeRefs: ['question:independent-evidence'],
		outcomeIds: [],
		owns: ['research:handoff:independent'],
		dependsOn: [],
		inputs: [plan.sources[0]],
		requiredGates: [],
		unresolved: [],
	});
}

try {
	const {values} = parseArgs({options: {directory: {type: 'string'}, case: {type: 'string'}}});
	assertOwnedDirectory(scratchRoot, true);
	if (values.directory) assertOwnedDirectory(path.resolve(repositoryRoot, values.directory));
	fs.mkdirSync(scratchRoot, {recursive: true});
	runDirectory = values.directory
		? path.resolve(repositoryRoot, values.directory)
		: fs.mkdtempSync(path.join(scratchRoot, 'matrix-'));
	assertOwnedDirectory(runDirectory);
	if (values.directory) fs.mkdirSync(runDirectory, {recursive: false});
	const selected = values.case ?? 'all';
	assert(
		[
			'all',
			'larger',
			'sparse',
			'incremental',
			'shared-change',
			'late-research-gap',
			'conflicting-findings',
			'missing-specialist',
		].includes(selected),
		'Unknown evaluation case',
	);
	const includes = (name) => selected === 'all' || selected === name;
	if (includes('larger')) {
		let coordinator = initializeCase(
			'larger',
			largerPlan(),
			'Additional source outcomes: track-1 through track-6 each select and confirm an independent draft; coupled combines the first two drafts. Preserve one shared selection component and independent UI after whole-UX review.',
			['shared', 'track-1', 'track-2', 'track-3', 'track-4', 'track-5', 'track-6', 'coupled', 'visual'],
		);
		await complete(coordinator, 'shared-ux');
		assert.deepEqual(
			coordinator.inspect().ready,
			Array.from({length: 6}, (_, index) => `track-${index + 1}-ux`),
		);
		capture(coordinator, 'six-tracks-eligible');
		for (const itemId of ['track-1-ux', 'track-2-ux']) {
			const state = coordinator.open();
			coordinator.claim({itemId, agentId: `simulated-${itemId}`, expectedRevision: state.revision});
		}
		coordinator = new DesignCoordinator(path.join(activeCase.directory, 'planning'));
		coordinator.reconcile({observations: [], expectedRevision: coordinator.open().revision});
		assert.deepEqual(coordinator.inspect().uncertain.sort(), ['track-1-ux', 'track-2-ux']);
		capture(coordinator, 'reopened-uncertain');
		const observed = coordinator.open();
		coordinator.reconcile({
			observations: ['track-1-ux', 'track-2-ux'].map((itemId) => ({
				attemptId: observed.attempts[itemId].id,
				agentId: observed.attempts[itemId].agentId,
				status: 'live',
				workerRef: `simulated-${itemId}`,
			})),
			expectedRevision: observed.revision,
		});
		for (let index = 1; index <= 6; index++) await complete(coordinator, `track-${index}-ux`);
		await complete(coordinator, 'coupled-ux');
		await complete(coordinator, 'assemble-ux');
		capture(coordinator, 'frozen-ux-awaits-review');
		assert.deepEqual(coordinator.inspect().ready, ['review-ux']);
		await complete(coordinator, 'review-ux');
		assert.deepEqual(
			coordinator.inspect().ready,
			Array.from({length: 6}, (_, index) => `track-${index + 1}-ui`),
		);
		capture(coordinator, 'exact-simulated-review-unlocks-ui');
		for (let index = 1; index <= 6; index++) await complete(coordinator, `track-${index}-ui`);
		assert.equal(Object.keys(coordinator.open().accepted).length, 16);
		capture(coordinator, 'complete');
	}
	if (includes('sparse')) {
		const plan = structuredClone(fixture);
		plan.outcomes.push({id: 'future-platform', sourceRefs: ['source:brief']});
		plan.gaps.push({
			id: 'platform-undecided',
			outcomeIds: ['future-platform'],
			reason: 'Owner has not selected a platform; preserve this requested scope as an explicit gap',
		});
		plan.items[0].unresolved = ['Owner must decide whether selection is single or multiple'];
		const coordinator = initializeCase(
			'sparse',
			plan,
			'Additional requested outcome future-platform: support the eventual selected platform. Platform and selection cardinality are explicitly unspecified.',
			['shared', 'alpha', 'beta', 'visual', 'future-platform'],
		);
		assert.deepEqual(coordinator.inspect().ready, []);
		assert(new DesignPlan(plan).validate().coverage.at(-1).gapIds.includes('platform-undecided'));
		capture(coordinator, 'owner-decisions-held');
	}
	if (includes('incremental')) {
		const coordinator = initializeCase(
			'incremental',
			structuredClone(fixture),
			'The initial request is unchanged. A later parent-identified defect repair affects only the alpha flow and its dependent review/assembly; no new human-source hash is fabricated.',
			['shared', 'alpha', 'beta', 'visual'],
		);
		for (const itemId of ['shared-ux', 'alpha-ux', 'beta-ux']) await complete(coordinator, itemId);
		const before = coordinator.open();
		const revised = structuredClone(before.plan);
		revised.revision++;
		revised.scopeRefs.push('state:alpha:repair');
		revised.items.find((item) => item.id === 'alpha-ux').scopeRefs.push('state:alpha:repair');
		coordinator.revise({plan: revised, bindings: before.bindings, expectedRevision: before.revision});
		const retained = coordinator.open().accepted;
		assert.deepEqual(Object.keys(retained), ['shared-ux', 'beta-ux']);
		assert.deepEqual(retained['beta-ux'], before.accepted['beta-ux']);
		capture(coordinator, 'local-repair-retains-independent-work');
		await complete(coordinator, 'alpha-ux');
		capture(coordinator, 'repaired-alpha-awaits-assembly');
	}
	if (includes('shared-change')) {
		const plan = structuredClone(fixture);
		addIndependentEvidence(plan);
		const coordinator = initializeCase(
			'shared-change',
			plan,
			'An unrelated evidence handoff can remain valid while the shared component is repaired. A whole-document UX review and all dependent UI must be invalidated after a shared output change.',
			['shared', 'alpha', 'beta', 'visual'],
		);
		await complete(coordinator, 'independent-evidence');
		for (const itemId of fixture.items.map((item) => item.id)) await complete(coordinator, itemId);
		capture(coordinator, 'before-shared-output-change');
		const before = coordinator.open();
		coordinator.invalidate({
			bindings: before.bindings,
			changedRefs: ['ux:element:shared'],
			expectedRevision: before.revision,
		});
		const after = coordinator.open();
		assert.deepEqual(Object.keys(after.accepted), ['independent-evidence']);
		assert.deepEqual(after.gates, {});
		assert.deepEqual(after.accepted['independent-evidence'], before.accepted['independent-evidence']);
		capture(coordinator, 'shared-change-removes-stale-gate-retains-unrelated-evidence');
	}
	if (includes('late-research-gap')) {
		const plan = structuredClone(fixture);
		plan.scopeRefs.push('question:selection-states');
		plan.items.unshift({
			id: 'selection-research',
			role: 'product-researcher',
			stage: 'research',
			scopeRefs: ['question:selection-states'],
			outcomeIds: [],
			owns: ['research:handoff:selection-states'],
			dependsOn: [],
			inputs: [plan.sources[0]],
			requiredGates: [],
			unresolved: [],
		});
		const shared = plan.items.find((item) => item.id === 'shared-ux');
		shared.dependsOn = ['selection-research'];
		shared.inputs.push({producer: 'selection-research', output: 'research:handoff:selection-states'});
		shared.unresolved = ['Parent verification of q-selection-states is pending'];
		const coordinator = initializeCase(
			'late-research-gap',
			plan,
			'Selection labels are already answered in saved research. Selection failure states have one outstanding assigned question; a later UI question asks for the same failure-state coverage and must await or extend that assignment.',
			['shared', 'alpha', 'beta', 'visual'],
		);
		const decisions = [
			{
				incomingQuestionId: 'q-labels-repeat',
				knownQuestionId: 'q-selection-labels',
				disposition: 'reuse',
				basis: 'Parent explicitly confirmed same users, scope and adequately verified label evidence',
			},
			{
				incomingQuestionId: 'q-ui-failure-state',
				knownQuestionId: 'q-selection-states',
				disposition: 'await-assigned',
				assignmentItemId: 'selection-research',
				basis: 'Parent confirmed overlap with the one outstanding assignment; evidence is not yet verified',
			},
			{
				incomingQuestionId: 'q-offline-failure-state',
				knownQuestionId: 'q-selection-states',
				disposition: 'extend-existing',
				assignmentItemId: 'selection-research',
				basis: 'Parent identified a material offline state excluded from the answered label scope; preserve this gap in the existing assignment',
			},
		];
		fs.writeFileSync(
			path.join(activeCase.directory, 'research-decisions.json'),
			JSON.stringify({kind: 'synthetic-parent-supplied-research-decisions', decisions}, null, 2) + '\n',
		);
		fs.writeFileSync(
			path.join(activeCase.directory, 'research-catalogue.md'),
			'# Synthetic saved research catalogue\n\n- q-selection-labels: answered and verified for labels; excludes failure/offline states.\n- q-selection-states: one assignment selection-research; open; parent verification pending.\n',
		);
		activeCase.researchDecisions = decisions;
		let state = coordinator.open();
		state = coordinator.claim({
			itemId: 'selection-research',
			agentId: 'simulated-single-researcher',
			expectedRevision: state.revision,
		});
		assert.throws(
			() =>
				coordinator.claim({
					itemId: 'selection-research',
					agentId: 'duplicate-researcher',
					expectedRevision: state.revision,
				}),
			/already claimed/,
		);
		assert.equal(Object.keys(coordinator.open().attempts).length, 1);
		capture(coordinator, 'one-assigned-question-keeps-dependent-design-blocked');
	}
	if (includes('conflicting-findings')) {
		const plan = structuredClone(fixture);
		plan.items[0].unresolved = [
			'Owner must resolve conflicting verified findings on single versus multiple selection; applicability differs by task',
		];
		const coordinator = initializeCase(
			'conflicting-findings',
			plan,
			'Two synthetic saved findings support single selection for focused confirmation and multiple selection for comparison. The source has not chosen the applicable task. Preserve both findings and hold the design decision.',
			['shared', 'alpha', 'beta', 'visual'],
		);
		fs.writeFileSync(
			path.join(activeCase.directory, 'conflicting-findings.md'),
			'# Synthetic evidence conflict\n\nFinding q-single: focused confirmation uses single selection.\nFinding q-multiple: comparison uses multiple selection.\nApplicability: unresolved owner task choice. Neither finding overrides source authority.\n',
		);
		assert.deepEqual(coordinator.inspect().ready, []);
		capture(coordinator, 'conflicting-applicability-held-for-owner');
	}
	if (includes('missing-specialist')) {
		const plan = structuredClone(fixture);
		addIndependentEvidence(plan);
		const coordinator = initializeCase(
			'missing-specialist',
			plan,
			'The independent UX reviewer is unavailable. Preserve complete authoring, allow unrelated evidence work, and keep dependent UI gated without a fabricated pass.',
			['shared', 'alpha', 'beta', 'visual'],
		);
		for (const itemId of ['shared-ux', 'alpha-ux', 'beta-ux', 'assemble-ux']) await complete(coordinator, itemId);
		assert.deepEqual(coordinator.inspect().ready, ['review-ux', 'independent-evidence']);
		assert.deepEqual(coordinator.open().gates, {});
		activeCase.unavailableRole = 'ux-reviewer';
		capture(coordinator, 'reviewer-unavailable-independent-work-still-eligible');
		await complete(coordinator, 'independent-evidence');
		capture(coordinator, 'independent-evidence-retained-ui-still-gated');
	}
	const report = {
		kind: 'deterministic-fake-worker-evaluation-matrix',
		directory: runDirectory,
		cases,
		limits: [
			'Offline simulated receipt callbacks only; no qualitative review, model authoring, rendering or canonical writes.',
			'Research overlap and applicability decisions are explicit synthetic parent inputs, not semantic keyword inference or a replacement research schema.',
			'Fresh coordinator object recovery uses saved state and synthetic live observations; this matrix alone does not establish fresh-model recovery or general operating readiness.',
		],
	};
	assertOwnedDirectory(runDirectory);
	fs.writeFileSync(path.join(runDirectory, 'evaluation.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
	console.log(
		JSON.stringify(
			{
				kind: report.kind,
				directory: runDirectory,
				report: path.join(runDirectory, 'evaluation.json'),
				cases: cases.map((entry) => ({name: entry.name, checkpoints: entry.checkpoints.length})),
			},
			null,
			2,
		),
	);
} catch (error) {
	console.error(`design-pipeline-evaluation: ${error.message}`);
	process.exitCode = 1;
}
