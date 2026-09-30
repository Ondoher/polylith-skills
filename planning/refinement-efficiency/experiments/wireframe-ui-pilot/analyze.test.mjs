import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PilotAnalysis} from './analyze.mjs';

/**
 * Called by deterministic fixtures to construct persisted UTC timestamps.
 *
 * @param {number} milliseconds - Offset from the fixed fixture epoch.
 * @returns {string} - UTC timestamp with millisecond precision.
 */
function at(milliseconds) {
	return new Date(Date.UTC(2026, 8, 30) + milliseconds).toISOString();
}

/**
 * Called by fixtures to express a real runner event without a live model.
 *
 * @param {number} milliseconds - Deterministic event time.
 * @param {string} type - Actual experiment event identifier.
 * @param {PilotEvidenceRecord} fields - Event-specific metadata.
 * @returns {PilotEvidenceRecord} - Persisted event shape.
 */
function event(milliseconds, type, fields = {}) {
	return {at: at(milliseconds), type, ...fields};
}

/**
 * Called by fixtures to emit matching native start and completion records.
 *
 * @param {string} role - Author or independent reviewer.
 * @param {number} start - Start offset in milliseconds.
 * @param {number} end - Completion offset in milliseconds.
 * @returns {PilotEvidenceRecord[]} - Real native-client event shapes.
 */
function native(role, start, end) {
	const resultPath = `${role}-${start}/result.md`;
	return [
		event(start, 'native.started', {role, model: 'test-model', effort: 'medium', resultPath}),
		event(end, 'native.completed', {
			role,
			startedAt: at(start),
			endedAt: at(end),
			elapsedMs: end - start,
			resultPath,
			threadId: `${role}-thread`,
			completed: true,
			exitCode: 0,
			usage: {input_tokens: 100, output_tokens: 10},
		}),
	];
}

test('two elements retain exact first previews, tool attribution and real work overlap through later repairs', () => {
	const events = [
		event(0, 'run-start', {execute: true, reviewOnly: false}),
		event(5, 'service', {method: 'read', inputBytes: 2, textBytes: 20}),
		...native('wireframe', 10, 120),
		...native('ui', 12, 40),
		event(20, 'phase', {role: 'wireframe', phase: 'inputs-ready'}),
		event(22, 'phase', {role: 'wireframe', phase: 'boundaries-start'}),
		event(25, 'phase', {role: 'ui', phase: 'inputs-ready'}),
		event(30, 'scope-ready'),
		event(30, 'phase', {role: 'wireframe', phase: 'wireframe-start', elementId: 'alpha'}),
		event(35, 'contribution', {stage: 'wireframe', elementId: 'alpha', revision: 1, inputBytes: 100}),
		event(40, 'native.event', {
			role: 'wireframe',
			nativeType: 'item.started',
			itemType: 'mcp_tool_call',
			itemId: 'tool-0',
			toolName: 'workflow_execute',
		}),
		event(45, 'native.event', {
			role: 'wireframe',
			nativeType: 'item.completed',
			itemType: 'mcp_tool_call',
			itemId: 'tool-0',
			toolName: 'workflow_execute',
		}),
		event(60, 'preview-ready', {
			stage: 'wireframe',
			elementId: 'alpha',
			revision: 2,
			inputBytes: 200,
			sceneCount: 2,
		}),
		event(65, 'ui-dispatch', {elementId: 'alpha', wireframeRevision: 2}),
		event(65, 'phase', {role: 'wireframe', phase: 'wireframe-start', elementId: 'beta'}),
		...native('ui', 66, 140),
		event(70, 'phase', {role: 'ui', phase: 'ui-start'}),
		event(75, 'phase', {role: 'ui', phase: 'inputs-ready'}),
		event(80, 'native.event', {
			role: 'wireframe',
			nativeType: 'item.started',
			itemType: 'mcp_tool_call',
			itemId: 'tool-1',
			toolName: 'workflow_execute',
		}),
		event(85, 'native.event', {
			role: 'ui',
			nativeType: 'item.started',
			itemType: 'mcp_tool_call',
			itemId: 'tool-0',
			toolName: 'workflow_execute',
		}),
		event(90, 'service', {method: 'read', textBytes: 400}),
		event(96, 'service', {method: 'read', role: 'ui', elementId: 'alpha', textBytes: 123}),
		event(100, 'native.event', {
			role: 'wireframe',
			nativeType: 'item.completed',
			itemType: 'mcp_tool_call',
			itemId: 'tool-1',
			toolName: 'workflow_execute',
		}),
		event(105, 'native.event', {
			role: 'ui',
			nativeType: 'item.completed',
			itemType: 'mcp_tool_call',
			itemId: 'tool-0',
			toolName: 'workflow_execute',
		}),
		event(110, 'preview-ready', {
			stage: 'wireframe',
			elementId: 'beta',
			revision: 1,
			inputBytes: 400,
			sceneCount: 3,
		}),
		event(130, 'preview-ready', {stage: 'ui', elementId: 'alpha', revision: 1, inputBytes: 500, sceneCount: 2}),
		event(145, 'ui-dispatch', {elementId: 'beta', wireframeRevision: 1}),
		...native('ui', 146, 190),
		event(150, 'phase', {role: 'ui', phase: 'ui-start'}),
		event(160, 'native.event', {
			role: 'ui',
			nativeType: 'item.started',
			itemType: 'mcp_tool_call',
			itemId: 'tool-0',
			toolName: 'workflow_read',
		}),
		event(170, 'native.event', {
			role: 'ui',
			nativeType: 'item.completed',
			itemType: 'mcp_tool_call',
			itemId: 'tool-0',
			toolName: 'workflow_read',
		}),
		event(180, 'preview-ready', {stage: 'ui', elementId: 'beta', revision: 1, inputBytes: 600, sceneCount: 3}),
		event(200, 'run-end', {status: 'happy-path-complete'}),
		event(205, 'run-start', {execute: true, reviewOnly: true}),
		...native('wireframe-review', 210, 225),
		event(211, 'phase', {role: 'wireframe-review', phase: 'review-start'}),
		event(220, 'review-ready', {
			role: 'wireframe-review',
			elementId: 'alpha',
			revision: 2,
			verdict: 'revise',
			findings: [{id: 'fix'}],
		}),
		event(230, 'repair-start', {role: 'wireframe', elementId: 'alpha'}),
		...native('wireframe', 232, 250),
		event(240, 'preview-ready', {
			stage: 'wireframe',
			elementId: 'alpha',
			revision: 3,
			inputBytes: 60,
			sceneCount: 2,
		}),
		event(250, 'ui-dispatch', {elementId: 'alpha', wireframeRevision: 3}),
		...native('ui', 251, 265),
		event(252, 'phase', {role: 'ui', phase: 'ui-start'}),
		event(260, 'preview-ready', {stage: 'ui', elementId: 'alpha', revision: 2, inputBytes: 70, sceneCount: 2}),
		event(270, 'repair-end', {role: 'wireframe', elementId: 'alpha'}),
		...native('wireframe-review', 275, 290),
		event(276, 'phase', {role: 'wireframe-review', phase: 'review-start'}),
		event(280, 'review-ready', {
			role: 'wireframe-review',
			elementId: 'alpha',
			revision: 3,
			verdict: 'pass',
			findings: [],
		}),
	];
	const firstUiCompletion = events.find((item) => item.type === 'native.completed' && item.role === 'ui');
	const metrics = PilotAnalysis.summarize({
		events,
		state: {
			status: 'review-complete',
			happyPathCompletedAt: at(200),
			clients: [firstUiCompletion],
			reviews: [
				{role: 'wireframe-review', elementId: 'alpha', revision: 2, round: 0},
				{role: 'wireframe-review', elementId: 'alpha', revision: 3, round: 1},
			],
		},
		manifest: {approval: 'unreviewed', preparationMs: 5, changedFlows: ['edit-video']},
		scope: {
			elements: [
				{id: 'alpha', disposition: 'update', requiredStates: ['one', 'two']},
				{id: 'beta', disposition: 'update', requiredStates: ['one', 'two', 'three']},
			],
		},
	});
	assert.equal(metrics.native.completedTurns, 8, 'State and event copies must not double-count turns');
	assert.equal(metrics.native.completedAuthorTurns, 6);
	assert.equal(metrics.native.authorWallUnionMs, 206, 'Native overlapping processes contribute only their union');
	assert.equal(metrics.native.roles.ui.usage.reportedTurns, 4);
	assert.equal(metrics.native.roles.ui.usage.totalConsumption, null);
	assert.deepEqual(
		metrics.native.roles.ui.usage.snapshots.map((snapshot) => snapshot.counters),
		Array.from({length: 4}, () => ({input_tokens: 100, output_tokens: 10})),
	);
	assert.equal(metrics.firstPass.completedElements, 2);
	assert.equal(metrics.firstPass.wireframeWorkMs, 75);
	assert.equal(metrics.firstPass.uiWorkMs, 90);
	assert.equal(metrics.firstPass.workWallUnionMs, 125);
	assert.equal(metrics.firstPass.overlapMs, 40);
	assert.deepEqual(metrics.firstPass.overlapWindows, [{startedAt: at(70), endedAt: at(110), elapsedMs: 40}]);
	assert.equal(metrics.firstPass.authorStartToAllUiReady.elapsedMs, 170);
	assert.equal(metrics.firstPass.authorStartToHappyPathComplete.elapsedMs, 190);
	assert.equal(metrics.shared.inputIntervals.ui.elapsedMs, 13);
	assert.equal(metrics.shared.uiWarmupNativeInterval.elapsedMs, 28);
	assert.equal(metrics.shared.firstWireframeReadyUntilUiWarmupCompleteMs, 0);
	assert.equal(metrics.shared.boundarySelection.elapsedMs, 8);
	const alpha = metrics.elements.find((item) => item.elementId === 'alpha');
	assert.equal(alpha.requiredSceneCount, 2);
	assert.equal(alpha.wireframe.firstPreviewInterval.elapsedMs, 30);
	assert.equal(alpha.wireframe.firstReady.revision, 2);
	assert.equal(alpha.wireframe.latestReady.revision, 3);
	assert.equal(alpha.ui.firstReady.revision, 1);
	assert.equal(alpha.ui.latestReady.revision, 2);
	assert.equal(alpha.queueToDispatch.elapsedMs, 5);
	assert.equal(alpha.queueToUiStart.elapsedMs, 10);
	assert.equal(alpha.queueToUiNativeLaunch.elapsedMs, 6);
	assert.equal(alpha.ui.nativeLaunchToStart.elapsedMs, 4);
	assert.equal(alpha.ui.nestedInputCollection.elapsedMs, 5);
	assert.deepEqual(
		metrics.firstPass.interElementGaps.map((gap) => gap.interval.elapsedMs),
		[5, 20],
	);
	assert.equal(alpha.wireframe.initialContributionInputBytes, 300);
	assert.equal(alpha.wireframe.reviewAndReworkContributionInputBytes, 60);
	assert.equal(alpha.ui.readBytes, 123);
	assert.equal(alpha.ui.readByteAttributionComplete, false);
	assert.equal(alpha.reviews.rounds.length, 2);
	assert.deepEqual(
		alpha.reviews.rounds.map((round) => round.interval.elapsedMs),
		[9, 4],
	);
	assert.equal(alpha.reviews.repairWallUnionMs, 40);
	assert.equal(metrics.tools.observedCalls, 4, 'Repeated native item IDs belong to separate invocations');
	assert.equal(alpha.wireframe.nativeToolCalls, 1);
	assert.equal(alpha.ui.nativeToolCalls, 1);
	assert.equal(metrics.service.readTextBytes, 543);
	assert.equal(metrics.service.unattributedReadTextBytes, 420);
	assert.equal(metrics.service.coordinatorCallsBeforeFirstCompletedAuthor, 1);
});

test('review native timing and repair outcomes survive restarts without inventing missing phase or exit markers', () => {
	const failedUi = native('ui', 52, 60).map((record) =>
		record.type === 'native.completed' ? {...record, completed: false, exitCode: 4294967295} : record,
	);
	const events = [
		event(0, 'run-start', {execute: true, reviewOnly: true}),
		event(5, 'phase', {role: 'wireframe-review', phase: 'review-start', elementId: 'alpha'}),
		...native('wireframe-review', 10, 30),
		event(20, 'review-ready', {
			role: 'wireframe-review',
			elementId: 'alpha',
			revision: 1,
			verdict: 'revise',
			findings: [],
		}),
		event(35, 'repair-start', {role: 'wireframe', elementId: 'alpha'}),
		...native('wireframe', 36, 50),
		event(51, 'ui-dispatch', {elementId: 'alpha'}),
		...failedUi,
		event(65, 'repair-end', {role: 'wireframe', elementId: 'alpha', interrupted: true}),
		event(70, 'run-start', {execute: true, reviewOnly: true}),
		event(75, 'review-reused', {role: 'wireframe-review', elementId: 'alpha', revision: 1, verdict: 'revise'}),
		...native('wireframe-review', 80, 90),
		event(85, 'review-ready', {
			role: 'wireframe-review',
			elementId: 'alpha',
			revision: 2,
			verdict: 'pass',
			findings: [],
		}),
		event(92, 'repair-start', {role: 'ui', elementId: 'alpha'}),
		native('ui', 93, 100)[0],
		event(110, 'run-start', {execute: true, reviewOnly: true}),
		...native('ui', 120, 140),
	];
	const metrics = PilotAnalysis.summarize({events});
	const reviews = metrics.elements.find((element) => element.elementId === 'alpha').reviews;
	assert.equal(reviews.freshReviewCount, 2);
	assert.equal(reviews.reused.length, 1);
	assert.deepEqual(
		reviews.rounds.map((round) => round.kind),
		['first-review', 'rereview'],
	);
	assert.deepEqual(
		reviews.rounds.map((round) => round.interval),
		[null, null],
		'A marker before this invocation or restart is not a review phase start',
	);
	assert.deepEqual(
		reviews.rounds.map((round) => round.nativeInterval.elapsedMs),
		[20, 10],
	);
	assert.deepEqual(
		reviews.rounds.map((round) => round.nativeLaunchToReviewSaved.elapsedMs),
		[10, 5],
	);
	const repair = reviews.repairs[0];
	assert.equal(repair.status, 'interrupted');
	assert.equal(repair.interval.elapsedMs, 30, 'Coordinator cleanup belongs only to the outer repair window');
	assert.equal(repair.nativeAuthors.wireframe.completedWallUnionMs, 14);
	assert.equal(repair.nativeAuthors.ui.completedWallUnionMs, 0);
	assert.equal(repair.nativeAuthors.ui.unsuccessfulWallUnionMs, 8);
	assert.equal(repair.nativeAuthors.wireframe.invocations[0].endedAt, at(50));
	assert.equal(repair.nativeAuthors.ui.invocations[0].endedAt, at(60));
	assert.equal(reviews.repairWallUnionMs, 0);
	assert.equal(reviews.interruptedRepairWallUnionMs, 30);
	const openRepair = reviews.repairs[1];
	assert.equal(openRepair.status, 'unclosed-at-restart');
	assert.equal(openRepair.interval, null);
	assert.equal(openRepair.nativeAuthors.ui.unclosedInvocations, 1);
	assert.equal(openRepair.nativeAuthors.ui.invocations[0].endedAt, null);
	assert.equal(openRepair.nativeAuthors.ui.invocations[0].boundaryAt, at(110));
	assert.equal(
		openRepair.nativeAuthors.ui.invocations.length,
		1,
		'A new coordinator invocation is outside the earlier open repair',
	);
	const report = PilotAnalysis._markdown(metrics);
	assert.match(report, /repair interrupted/);
	assert.match(report, /saved review receipts reused; excluded from fresh review work/);
});

test('resumed usage stays as invocation snapshots when cumulative accounting is unverified', () => {
	const counters = [
		{input_tokens: 120133, output_tokens: 700},
		{input_tokens: 626015, output_tokens: 6314},
		{input_tokens: 1257322, output_tokens: 9974},
	];
	const events = counters.flatMap((usage, index) =>
		native('ui', index * 20, index * 20 + 10).map((record) =>
			record.type === 'native.completed' ? {...record, usage} : record,
		),
	);
	const metrics = PilotAnalysis.summarize({events});
	const measured = metrics.native.roles.ui.usage;
	assert.deepEqual(
		measured.snapshots.map((snapshot) => snapshot.counters),
		counters,
	);
	assert(measured.snapshots.every((snapshot) => snapshot.threadId === 'ui-thread'));
	assert.equal(measured.totalConsumption, null);
	assert.match(measured.accounting, /may be cumulative thread snapshots/);
	const report = PilotAnalysis._markdown(metrics);
	assert.match(report, /3 recorded; total consumption unavailable/);
	assert.match(report, /consumption totals and invocation deltas remain unavailable/);
});

test('prepared and failed-launch evidence writes zero model results and unavailable timings', (context) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wireframe-analysis-'));
	context.after(() => fs.rmSync(root, {recursive: true, force: true}));
	fs.mkdirSync(path.join(root, 'workspace'));
	const events = [
		event(0, 'run-start', {execute: false}),
		event(5, 'run-end', {status: 'prepared'}),
		event(10, 'run-start', {execute: true}),
		event(20, 'native.started', {role: 'ui', resultPath: 'failed/result.md'}),
		event(30, 'error', {error: 'spawn EPERM'}),
		event(40, 'run-end', {status: 'error'}),
	];
	const raw = events.map((entry) => JSON.stringify(entry)).join('\n') + '\n{"type":';
	fs.writeFileSync(path.join(root, 'events.jsonl'), raw);
	fs.writeFileSync(
		path.join(root, 'state.private.json'),
		JSON.stringify({status: 'error', clients: [], error: 'spawn EPERM'}),
	);
	fs.writeFileSync(
		path.join(root, 'workspace/source-manifest.json'),
		JSON.stringify({approval: 'unreviewed', preparationMs: 5}),
	);
	const {metrics, metricsPath, reportPath} = PilotAnalysis.report(root);
	assert.equal(metrics.native.completedTurns, 0);
	assert.equal(metrics.native.authorWallUnionMs, 0);
	assert.equal(metrics.firstPass.authorStartToAllUiReady, null);
	assert.equal(metrics.firstPass.overlapMs, null);
	assert.equal(metrics.firstPass.workWallUnionMs, null);
	assert.equal(metrics.shared.boundarySelection, null);
	assert.equal(metrics.local.failedOrIncompleteLaunches, 1);
	assert.deepEqual(
		metrics.local.setup.map((entry) => entry.interval.elapsedMs),
		[5, 10],
	);
	assert.equal(metrics.availability.incompleteTrailingRecords, 1);
	assert.match(metrics.availability.modelResults, /unavailable/);
	assert.deepEqual(JSON.parse(fs.readFileSync(metricsPath)), metrics);
	const report = fs.readFileSync(reportPath, 'utf8');
	assert.match(report, /Completed native model turns: 0/);
	assert.match(report, /Observed first-pass wireframe\/UI overlap: unavailable/);
	assert.equal(fs.readFileSync(path.join(root, 'events.jsonl'), 'utf8'), raw, 'Analysis must preserve its evidence');
});
