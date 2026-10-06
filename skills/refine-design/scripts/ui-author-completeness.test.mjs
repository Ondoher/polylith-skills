import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {UiAuthorCompleteness} from './UiAuthorCompleteness.mjs';
import {sha256} from './product-artifact-utils.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const temporaryRoot = path.join(repositoryRoot, '.codex-tmp', 'ui-author-completeness', 'helper-tests');
const cliPath = fileURLToPath(new URL('./UiAuthorCompleteness.mjs', import.meta.url));

/**
 * Called by tests to build an unrelated synthetic source-bound assignment.
 *
 * @returns {UiAuthorCompletenessFixture} - Independent current context and ready ledger.
 */
function fixture() {
	const source = {id: 'accepted-inputs', sha256: sha256('synthetic accepted inputs')};
	const candidate = {id: 'candidate', sha256: sha256('synthetic ready candidate')};
	const sourceRef = {sourceId: source.id, ref: 'state:empty'};
	const assignment = {
		productId: 'synthetic',
		runId: 'run-1',
		assignmentId: 'assignment-1',
		authorId: 'author-1',
		ownedScopeIds: ['panel'],
	};
	const context = {
		...assignment,
		sources: [{...source, refs: [sourceRef.ref]}],
		candidate: {
			...candidate,
			references: [
				{sceneId: 'empty-scene', scopeId: 'panel', sourceRefs: [sourceRef]},
				{sceneId: 'empty-scene', nodeId: 'empty-message', scopeId: 'panel', sourceRefs: [sourceRef]},
			],
		},
		permittedGaps: [],
		requiredRequirementIds: ['empty-state'],
	};
	const requirements = [
		{
			id: 'empty-state',
			scopeId: 'panel',
			kind: 'requirement',
			sourceRefs: [sourceRef],
			meaning: 'Empty state explains the absence of entries.',
			dependencyRefs: [],
			status: 'covered',
			evidenceRefs: [{sceneId: 'empty-scene', nodeId: 'empty-message'}],
			reason: '',
		},
	];
	const ledger = {
		schemaVersion: '1.0',
		...assignment,
		sources: [source],
		candidate,
		requirements,
		inputReinspection: {complete: true, sourceIdentities: [source]},
		finalRecheck: {
			complete: true,
			candidate,
			sourceIdentities: [source],
			requirementIds: ['empty-state'],
			requirementsSha256: UiAuthorCompleteness.requirementsSha256(requirements),
		},
		history: [
			{
				event: 'recheck',
				requirementIds: ['empty-state'],
				note: 'Rechecked the final empty state against the original accepted input.',
			},
		],
		deliveryStatus: 'ready',
	};
	return JSON.parse(JSON.stringify({ledger, context}));
}

/**
 * Called by tests to synchronize an actual all-row check after intentional fixture changes.
 *
 * @param {UiAuthorCompletenessLedger} ledger - Test-owned changed ledger.
 * @returns {void}
 */
function recheck(ledger) {
	ledger.finalRecheck.requirementIds = ledger.requirements.map((requirement) => requirement.id);
	ledger.finalRecheck.requirementsSha256 = UiAuthorCompleteness.requirementsSha256(ledger.requirements);
}

test('ready whole-scope ledger validates exact assignment, sources, concrete evidence and both checks without mutation', () => {
	const {ledger, context} = fixture();
	const before = JSON.stringify({ledger, context});
	assert.deepEqual(UiAuthorCompleteness.validateLedger(ledger, context), {valid: true, issues: []});
	assert.deepEqual(UiAuthorCompleteness.assessReadiness(ledger, context), {ready: true, issues: []});
	assert.equal(JSON.stringify({ledger, context}), before);
});

test('scoped component assignment preserves a documented existing component-detail gap', () => {
	const {ledger, context} = fixture();
	ledger.requirements[0].kind = 'component-detail';
	ledger.requirements[0].status = 'permitted-gap';
	ledger.requirements[0].reason =
		'The placed component has insufficient visual detail; geometry and known role are preserved.';
	context.permittedGaps.push({
		requirementId: 'empty-state',
		...ledger.requirements[0].evidenceRefs[0],
		reason: ledger.requirements[0].reason,
	});
	recheck(ledger);
	assert.deepEqual(UiAuthorCompleteness.assessReadiness(ledger, context), {ready: true, issues: []});
});

test('read-only CLI resumes exact persisted companion files and leaves delivered bytes untouched', (testContext) => {
	fs.mkdirSync(temporaryRoot, {recursive: true});
	const directory = fs.mkdtempSync(path.join(temporaryRoot, 'resume-'));
	testContext.after(() => {
		const resolved = fs.realpathSync(directory);
		const root = fs.realpathSync(temporaryRoot);
		assert.ok(resolved.startsWith(`${root}${path.sep}`), 'cleanup stays in task temporary root');
		fs.rmSync(resolved, {recursive: true, force: true});
	});
	const {ledger, context} = fixture();
	ledger.history.push({
		event: 'resume',
		requirementIds: [],
		note: 'Resumed from saved assigned inputs and companion ledger.',
	});
	const ledgerPath = path.join(directory, 'ledger.json');
	const contextPath = path.join(directory, 'context.json');
	fs.writeFileSync(ledgerPath, JSON.stringify(ledger));
	fs.writeFileSync(contextPath, JSON.stringify(context));
	const ledgerBefore = fs.readFileSync(ledgerPath);
	const contextBefore = fs.readFileSync(contextPath);
	const result = spawnSync(process.execPath, [cliPath, '--ledger', ledgerPath, '--context', contextPath], {
		encoding: 'utf8',
		timeout: 10000,
	});
	assert.equal(result.status, 0, result.stderr);
	assert.deepEqual(JSON.parse(result.stdout), {ready: true, issues: []});
	assert.deepEqual(fs.readFileSync(ledgerPath), ledgerBefore);
	assert.deepEqual(fs.readFileSync(contextPath), contextBefore);
	ledger.inputReinspection.complete = false;
	fs.writeFileSync(ledgerPath, JSON.stringify(ledger));
	const incompleteResult = spawnSync(process.execPath, [cliPath, '--ledger', ledgerPath, '--context', contextPath], {
		encoding: 'utf8',
		timeout: 10000,
	});
	assert.equal(incompleteResult.status, 1, incompleteResult.stderr);
	assert.deepEqual(JSON.parse(incompleteResult.stdout), {
		ready: false,
		issues: ['original-input reinspection is incomplete'],
	});
});

test('a requirement omitted from both ledger and draft is detected only when already known to the parent', () => {
	const {ledger, context} = fixture();
	context.requiredRequirementIds.push('loading-state');
	assert.match(UiAuthorCompleteness.validateLedger(ledger, context).issues[0], /omits a parent-known requirement/);
	context.requiredRequirementIds = [];
	assert.equal(UiAuthorCompleteness.assessReadiness(ledger, context).ready, true);
	delete context.requiredRequirementIds;
	assert.equal(UiAuthorCompleteness.assessReadiness(ledger, context).ready, true);
});

test('input reinspection can add and reconcile a previously absent source-bound requirement', () => {
	const {ledger, context} = fixture();
	const loadingSourceRef = {sourceId: context.sources[0].id, ref: 'state:loading'};
	context.sources[0].refs.push(loadingSourceRef.ref);
	context.requiredRequirementIds.push('loading-state');
	context.candidate.references.push({sceneId: 'loading-scene', scopeId: 'panel', sourceRefs: [loadingSourceRef]});
	ledger.requirements.push({
		id: 'loading-state',
		scopeId: 'panel',
		kind: 'scene',
		sourceRefs: [loadingSourceRef],
		meaning: 'Loading has a distinct scene with feedback.',
		dependencyRefs: [],
		status: 'covered',
		evidenceRefs: [{sceneId: 'loading-scene'}],
		reason: '',
	});
	ledger.history.push({
		event: 'discovery',
		requirementIds: ['loading-state'],
		note: 'Original input reinspection found the loading state absent from the initial ledger.',
	});
	assert.equal(UiAuthorCompleteness.assessReadiness(ledger, context).ready, false);
	recheck(ledger);
	assert.equal(UiAuthorCompleteness.assessReadiness(ledger, context).ready, true);
});

test('ready claims reject changed upstream, shared-contract and delivered candidate bytes', () => {
	for (const identityKind of ['source', 'dependency', 'candidate']) {
		const {ledger, context} = fixture();
		if (identityKind === 'candidate') context.candidate.sha256 = sha256('changed delivered candidate');
		else {
			if (identityKind === 'dependency') {
				context.sources.push({
					id: 'shared-contract',
					sha256: sha256('initial shared contract'),
					refs: ['shared-role'],
				});
				ledger.sources.push({id: 'shared-contract', sha256: sha256('initial shared contract')});
				ledger.inputReinspection.sourceIdentities.push({
					id: 'shared-contract',
					sha256: sha256('initial shared contract'),
				});
				ledger.finalRecheck.sourceIdentities.push({
					id: 'shared-contract',
					sha256: sha256('initial shared contract'),
				});
				ledger.requirements[0].dependencyRefs.push({sourceId: 'shared-contract', ref: 'shared-role'});
				recheck(ledger);
			}
			context.sources.at(-1).sha256 = sha256('changed upstream bytes');
		}
		const result = UiAuthorCompleteness.assessReadiness(ledger, context);
		assert.equal(result.ready, false, identityKind);
		assert.match(result.issues[0], /current (source identities|candidate identity)/, identityKind);
	}
});

test('another author, assignment or scope cannot inherit the ledger ready claim', () => {
	for (const field of ['authorId', 'assignmentId', 'ownedScopeIds']) {
		const {ledger, context} = fixture();
		if (field === 'ownedScopeIds') context[field] = ['foreign-panel'];
		else context[field] = 'another-identity';
		assert.equal(UiAuthorCompleteness.assessReadiness(ledger, context).ready, false, field);
	}
	const {ledger, context} = fixture();
	ledger.requirements[0].scopeId = 'foreign-panel';
	recheck(ledger);
	assert.match(UiAuthorCompleteness.validateLedger(ledger, context).issues[0], /outside owned scope/);
});

test('covered rows reject nonexistent, foreign-scope and mismatched source-binding references', () => {
	for (const defect of ['nonexistent', 'foreign-scope', 'source-binding', 'unknown-source']) {
		const {ledger, context} = fixture();
		if (defect === 'nonexistent') ledger.requirements[0].evidenceRefs[0].nodeId = 'missing-node';
		if (defect === 'foreign-scope') context.candidate.references[1].scopeId = 'another-worker';
		if (defect === 'source-binding') {
			context.sources[0].refs.push('state:success');
			context.candidate.references[1].sourceRefs = [{sourceId: context.sources[0].id, ref: 'state:success'}];
		}
		if (defect === 'unknown-source') ledger.requirements[0].sourceRefs[0].ref = 'not-in-accepted-inputs';
		recheck(ledger);
		const result = UiAuthorCompleteness.assessReadiness(ledger, context);
		assert.equal(result.ready, false, defect);
	}
});

test('valid native reference bindings do not certify that a node depicts its required state', () => {
	const {ledger, context} = fixture();
	ledger.requirements[0].meaning = 'A semantic requirement intentionally unsupported by synthetic node content.';
	recheck(ledger);
	assert.deepEqual(UiAuthorCompleteness.assessReadiness(ledger, context), {ready: true, issues: []});
});

test('permitted-gap cannot excuse an omitted scene, missing component or renderer limitation', () => {
	for (const defect of ['scene', 'missing-component', 'renderer', 'changed-reason']) {
		const {ledger, context} = fixture();
		ledger.requirements[0].kind = defect === 'scene' ? 'scene' : 'component-detail';
		ledger.requirements[0].status = 'permitted-gap';
		ledger.requirements[0].reason = 'Insufficient supplied component detail.';
		if (defect !== 'renderer')
			context.permittedGaps.push({
				requirementId: 'empty-state',
				sceneId: 'empty-scene',
				nodeId: 'empty-message',
				reason: 'Insufficient supplied component detail.',
			});
		if (defect === 'missing-component')
			ledger.requirements[0].evidenceRefs = [{sceneId: 'missing-scene', nodeId: 'missing-node'}];
		if (defect === 'renderer')
			ledger.requirements[0].reason = 'A renderer is unavailable for this sufficiently specified control.';
		if (defect === 'changed-reason') ledger.requirements[0].reason = 'A different undocumented exception.';
		recheck(ledger);
		assert.equal(UiAuthorCompleteness.assessReadiness(ledger, context).ready, false, defect);
	}
});

test('pending and blocked rows prevent ready while honest partial ledgers remain valid', () => {
	for (const status of ['pending', 'blocked']) {
		const {ledger, context} = fixture();
		ledger.requirements[0].status = status;
		ledger.requirements[0].evidenceRefs = [];
		ledger.requirements[0].reason =
			status === 'blocked' ? 'Accepted behavior requires resolution by its UX owner.' : '';
		recheck(ledger);
		assert.equal(UiAuthorCompleteness.validateLedger(ledger, context).valid, false);
		assert.match(UiAuthorCompleteness.assessReadiness(ledger, context).issues[0], new RegExp(`remains ${status}`));
		ledger.deliveryStatus = status === 'blocked' ? 'blocked' : 'working';
		assert.equal(UiAuthorCompleteness.validateLedger(ledger, context).valid, true);
		assert.equal(UiAuthorCompleteness.assessReadiness(ledger, context).ready, false);
	}
});

test('ready requires both original-input reinspection and final all-row recheck', () => {
	for (const field of ['inputReinspection', 'finalRecheck']) {
		const {ledger, context} = fixture();
		ledger[field].complete = false;
		assert.equal(UiAuthorCompleteness.validateLedger(ledger, context).valid, false, field);
		assert.equal(UiAuthorCompleteness.assessReadiness(ledger, context).ready, false, field);
	}
});

test('changed rows, omitted final-check rows and stale candidate check invalidate an earlier all-row check', () => {
	for (const defect of [
		'changed-row',
		'omitted-row',
		'stale-candidate',
		'stale-reinspection',
		'stale-final-source',
	]) {
		const {ledger, context} = fixture();
		if (defect === 'changed-row') ledger.requirements[0].reason = 'Changed after final check.';
		if (defect === 'omitted-row') ledger.finalRecheck.requirementIds = [];
		if (defect === 'stale-candidate') ledger.finalRecheck.candidate.sha256 = sha256('previous candidate');
		if (defect === 'stale-reinspection')
			ledger.inputReinspection.sourceIdentities[0].sha256 = sha256('previous input');
		if (defect === 'stale-final-source') ledger.finalRecheck.sourceIdentities[0].sha256 = sha256('previous input');
		const result = UiAuthorCompleteness.assessReadiness(ledger, context);
		assert.equal(result.ready, false, defect);
		if (defect === 'stale-reinspection') assert.match(result.issues[0], /inputReinspection.sourceIdentities/);
		if (defect === 'stale-final-source') assert.match(result.issues[0], /finalRecheck.sourceIdentities/);
	}
});

test('a repair removing a separate required state is caught despite unchanged predicted impact history', () => {
	const {ledger, context} = fixture();
	context.candidate.sha256 = sha256('repaired candidate without required empty message');
	ledger.candidate = {id: context.candidate.id, sha256: context.candidate.sha256};
	context.candidate.references = context.candidate.references.filter((reference) => !reference.nodeId);
	ledger.history.push({
		event: 'repair',
		requirementIds: [],
		note: 'Repair predicted no effect on empty-state requirement.',
	});
	ledger.finalRecheck.candidate = {...ledger.candidate};
	recheck(ledger);
	assert.match(UiAuthorCompleteness.assessReadiness(ledger, context).issues[0], /unknown candidate reference/);
});

test('empty, malformed and unsupported companion records fail without throwing', () => {
	const {ledger, context} = fixture();
	for (const invalid of [
		null,
		{},
		{...ledger, requirements: []},
		{...ledger, schemaVersion: '2.0'},
		{...ledger, inventedRuntimeUiField: true},
	]) {
		assert.equal(UiAuthorCompleteness.validateLedger(invalid, context).valid, false);
		assert.equal(UiAuthorCompleteness.assessReadiness(invalid, context).ready, false);
	}
});
