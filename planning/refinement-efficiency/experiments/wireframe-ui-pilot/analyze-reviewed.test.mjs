import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {analyzeReviewed} from './analyze-reviewed.mjs';

test('reuse does not inflate first acceptance and input/inspection intervals stay nested', () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewed-metrics-'));
	const at = (s) => new Date(Date.UTC(2026, 8, 30, 0, 0, s)).toISOString();
	const event = (s, type, fields = {}) => ({at: at(s), type, ...fields});
	const role = {role: 'wireframe', elementId: 'dialog'};
	const binding = {source: 'source', contract: 'contract', renderer: 'renderer', artifact: 'artifact'};
	const reviewPath = path.join(directory, 'review.json');
	const events = [
		event(0, 'run-start'),
		event(1, 'author-start', role),
		event(1, 'native.started', {...role, resultPath: 'a', startedAt: at(1)}),
		event(3, 'phase', {...role, phase: 'inputs-ready'}),
		event(6, 'phase', {...role, phase: 'inspection-start'}),
		event(8, 'phase', {...role, phase: 'inspection-end'}),
		event(9, 'submitted', {elementId: 'dialog', stage: 'wireframe', revision: 1, binding}),
		event(10, 'native.completed', {
			...role,
			resultPath: 'a',
			startedAt: at(1),
			endedAt: at(10),
			completed: true,
			exitCode: 0,
		}),
		event(11, 'review-ready', {
			elementId: 'dialog',
			role: 'wireframe-review',
			revision: 1,
			verdict: 'pass',
			path: reviewPath,
		}),
		event(12, 'ui-dispatch', {elementId: 'dialog', wireframeRevision: 1}),
		event(20, 'element-accepted', {elementId: 'dialog'}),
		event(21, 'run-end'),
		event(40, 'run-start'),
		event(45, 'accepted-output-reused', {...role, revision: 1}),
		event(46, 'element-accepted', {elementId: 'dialog'}),
		event(47, 'run-end'),
	];
	try {
		fs.writeFileSync(reviewPath, JSON.stringify({binding}));
		fs.writeFileSync(path.join(directory, 'events.jsonl'), events.map(JSON.stringify).join('\n'));
		fs.writeFileSync(
			path.join(directory, 'state.private.json'),
			JSON.stringify({clients: [], unresolvedReviews: []}),
		);
		const result = analyzeReviewed(directory);
		assert.equal(result.elements[0].firstAuthorThroughAcceptance.elapsedMs, 19000);
		assert.equal(result.elements[0].firstAuthorThroughLatestAcceptance.elapsedMs, 45000);
		assert.equal(result.invocations[0].window.elapsedMs, 9000);
		assert.equal(result.invocations[0].subsets.throughInputsReady.elapsedMs, 2000);
		assert.equal(result.invocations[0].subsets.afterInputsThroughSubmission.elapsedMs, 6000);
		assert.equal(result.invocations[0].inspectionWindows[0].elapsedMs, 2000);
		assert.equal(result.elements[0].gateEvidence[0].valid, true);
		assert.equal(result.invalidUiDispatches, 0);
	} finally {
		fs.rmSync(directory, {recursive: true, force: true});
	}
});
