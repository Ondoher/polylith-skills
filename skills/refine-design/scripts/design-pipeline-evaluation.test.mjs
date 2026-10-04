import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

/** Called by bounded matrix checks to run the CLI beneath its owned scratch root.
 *
 * @param {DesignCoordinatorTestContext} context - Node test cleanup owner.
 * @param {string} caseName - Explicit matrix selection.
 * @returns {string} - Saved evidence report path.
 */
function runMatrix(context, caseName) {
	const scratchRoot = fileURLToPath(new URL('../../../.codex-tmp/parallel-design-execution/m7/', import.meta.url));
	fs.mkdirSync(scratchRoot, {recursive: true});
	const parent = fs.mkdtempSync(path.join(scratchRoot, 'test-'));
	context.after(() => {
		assert.equal(path.dirname(fs.realpathSync(parent)), fs.realpathSync(scratchRoot));
		fs.rmSync(parent, {recursive: true, force: true});
	});
	const invocation = spawnSync(
		process.execPath,
		[
			fileURLToPath(new URL('./design-pipeline-evaluation.mjs', import.meta.url)),
			'--directory',
			path.join(parent, 'run'),
			'--case',
			caseName,
		],
		{
			cwd: fileURLToPath(new URL('../', import.meta.url)),
			encoding: 'utf8',
			timeout: 120000,
			windowsHide: true,
		},
	);
	assert.equal(invocation.error, undefined, invocation.error?.message);
	assert.equal(invocation.status, 0, invocation.stderr);
	return JSON.parse(invocation.stdout).report;
}

test('larger matrix path preserves single ownership, coupled dependencies, phase gates and durable recovery', (context) => {
	const report = JSON.parse(fs.readFileSync(runMatrix(context, 'larger'), 'utf8'));
	assert.equal(report.kind, 'deterministic-fake-worker-evaluation-matrix');
	const scenario = report.cases[0];
	assert.equal(scenario.name, 'larger');
	const readyTracks = scenario.checkpoints.find((checkpoint) => checkpoint.point === 'six-tracks-eligible');
	assert.deepEqual(readyTracks.ready, [
		'track-1-ux',
		'track-2-ux',
		'track-3-ux',
		'track-4-ux',
		'track-5-ux',
		'track-6-ux',
	]);
	assert.equal(readyTracks.owners.filter((owner) => owner.ref === 'ux:element:shared').length, 1);
	const uncertain = scenario.checkpoints.find((checkpoint) => checkpoint.point === 'reopened-uncertain');
	assert.deepEqual(uncertain.uncertain.sort(), ['track-1-ux', 'track-2-ux']);
	assert.deepEqual(Object.keys(uncertain.accepted), ['shared-ux']);
	const waiting = scenario.checkpoints.find((checkpoint) => checkpoint.point === 'frozen-ux-awaits-review');
	assert.deepEqual(waiting.ready, ['review-ux']);
	assert.deepEqual(waiting.gateBindings, {});
	const completed = scenario.checkpoints.at(-1);
	assert.equal(Object.keys(completed.accepted).length, 16);
	assert.deepEqual(completed.ready, []);
	assert(completed.coverage.every((outcome) => outcome.itemIds.length || outcome.gapIds.length));
	const sourceDigest = createHash('sha256')
		.update(fs.readFileSync(path.join(scenario.directory, 'brief.md')))
		.digest('hex');
	assert.equal(completed.accepted['shared-ux'].inputs[0].digest, sourceDigest);
	assert.deepEqual(completed.gateBindings['whole-ux-review'].subjectBindings, completed.accepted['review-ux'].inputs);
	assert(completed.transitions.some((entry) => entry.event === 'reconciled'));
});

test('bounded sparse, incremental, shared-change, research-gap, conflict and missing-specialist matrix preserves honest blocks', (context) => {
	const report = JSON.parse(fs.readFileSync(runMatrix(context, 'all'), 'utf8'));
	assert.deepEqual(
		report.cases.map((scenario) => scenario.name),
		[
			'larger',
			'sparse',
			'incremental',
			'shared-change',
			'late-research-gap',
			'conflicting-findings',
			'missing-specialist',
		],
	);
	const sparse = report.cases.find((scenario) => scenario.name === 'sparse').checkpoints.at(-1);
	assert.deepEqual(sparse.ready, []);
	assert.deepEqual(sparse.coverage.find((outcome) => outcome.outcomeId === 'future-platform').gapIds, [
		'platform-undecided',
	]);
	assert(sparse.blocked.find((item) => item.id === 'shared-ux').reasons.includes('unresolved-decision'));
	const incremental = report.cases.find((scenario) => scenario.name === 'incremental').checkpoints;
	const retained = incremental.find((checkpoint) => checkpoint.point === 'local-repair-retains-independent-work');
	assert.deepEqual(Object.keys(retained.accepted), ['shared-ux', 'beta-ux']);
	assert.equal(retained.planRevision, 2);
	assert(retained.transitions.some((entry) => entry.event === 'plan-revised'));
	const shared = report.cases.find((scenario) => scenario.name === 'shared-change').checkpoints;
	const beforeChange = shared.find((checkpoint) => checkpoint.point === 'before-shared-output-change');
	const afterChange = shared.at(-1);
	assert.deepEqual(Object.keys(afterChange.accepted), ['independent-evidence']);
	assert.deepEqual(afterChange.accepted['independent-evidence'], beforeChange.accepted['independent-evidence']);
	assert.deepEqual(afterChange.gateBindings, {});
	const blockedUi = afterChange.blocked.filter((item) => ['alpha-ui', 'beta-ui'].includes(item.id));
	assert.deepEqual(blockedUi.map((item) => item.id).sort(), ['alpha-ui', 'beta-ui']);
	assert(blockedUi.every((item) => item.reasons.includes('missing-current-review')));
	const late = report.cases.find((scenario) => scenario.name === 'late-research-gap');
	assert.deepEqual(
		late.researchDecisions.map((decision) => decision.disposition),
		['reuse', 'await-assigned', 'extend-existing'],
	);
	assert.equal(
		new Set(
			late.researchDecisions
				.filter((decision) => decision.assignmentItemId)
				.map((decision) => decision.assignmentItemId),
		).size,
		1,
	);
	assert.deepEqual(late.checkpoints.at(-1).ready, []);
	const conflicting = report.cases.find((scenario) => scenario.name === 'conflicting-findings').checkpoints.at(-1);
	assert.deepEqual(conflicting.ready, []);
	assert(conflicting.blocked.find((item) => item.id === 'shared-ux').reasons.includes('unresolved-decision'));
	const missing = report.cases.find((scenario) => scenario.name === 'missing-specialist');
	assert.equal(missing.unavailableRole, 'ux-reviewer');
	assert.deepEqual(missing.checkpoints.at(-1).gateBindings, {});
	assert.deepEqual(missing.checkpoints.at(-1).ready, ['review-ux']);
	assert(missing.checkpoints.at(-1).accepted['independent-evidence']);
	assert(report.limits.some((limit) => limit.includes('no qualitative review')));
});

test('linked directory parent is rejected before creating anything in its external target', (context) => {
	const scratchRoot = fileURLToPath(new URL('../../../.codex-tmp/parallel-design-execution/m7/', import.meta.url));
	fs.mkdirSync(scratchRoot, {recursive: true});
	const parent = fs.mkdtempSync(path.join(scratchRoot, 'containment-test-'));
	const externalTarget = path.join(parent, 'external-target');
	const owned = path.join(parent, 'owned');
	const linkedParent = path.join(owned, 'linked-parent');
	fs.mkdirSync(externalTarget);
	fs.mkdirSync(owned);
	fs.symlinkSync(externalTarget, linkedParent, 'junction');
	context.after(() => {
		assert.equal(path.dirname(fs.realpathSync(parent)), fs.realpathSync(scratchRoot));
		if (fs.lstatSync(linkedParent).isSymbolicLink()) fs.unlinkSync(linkedParent);
		fs.rmSync(parent, {recursive: true, force: true});
	});
	const invocation = spawnSync(
		process.execPath,
		[
			fileURLToPath(new URL('./design-pipeline-evaluation.mjs', import.meta.url)),
			'--directory',
			path.join(linkedParent, 'run'),
			'--case',
			'sparse',
		],
		{encoding: 'utf8', timeout: 30000, windowsHide: true},
	);
	assert.equal(invocation.error, undefined, invocation.error?.message);
	assert.equal(invocation.status, 1);
	assert.match(invocation.stderr, /Linked evaluation directory or ancestor/);
	assert.deepEqual(fs.readdirSync(externalTarget), []);
	assert.equal(fs.existsSync(path.join(externalTarget, 'run')), false);
	assert.deepEqual(fs.readdirSync(owned), ['linked-parent']);
});
