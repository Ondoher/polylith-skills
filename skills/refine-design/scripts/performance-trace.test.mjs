import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {savePerformanceSpan, summarizePerformance, validatePerformanceSpan} from './performance-trace.mjs';

/** Build an observed span with synthetic time for arithmetic checks.
 * @param {string} id - Unique observation.
 * @param {number} start - Start milliseconds.
 * @param {number|null} end - Finish milliseconds or unfinished.
 * @returns {PerformanceSpan} - Test observation.
 */
function span(id, start, end) {
	return {
		id,
		actor: 'author',
		stage: 'ux',
		operation: 'encode',
		kind: 'agent-window',
		purpose: 'representation',
		startedAt: new Date(start).toISOString(),
		finishedAt: end === null ? null : new Date(end).toISOString(),
		outcome: end === null ? 'incomplete' : 'complete',
		measurements: {},
		usage: null,
	};
}

test('nested tools and parallel agents do not inflate covered wall time', () => {
	const author = span('author', 1000, 5000);
	const tool = {...span('tool', 2000, 2500), kind: 'tool'};
	const second = {...span('second', 4000, 6000), actor: 'reviewer'};
	const summary = summarizePerformance([second, tool, author, author], {
		startedAt: new Date(0).toISOString(),
		finishedAt: new Date(7000).toISOString(),
	});
	assert.equal(summary.wallMs, 7000);
	assert.equal(summary.coveredMs, 5000);
	assert.equal(summary.unobservedMs, 2000);
	assert.equal(summary.observations.length, 3);
	assert.equal(summary.groups.kind['agent-window'].summedMs, 6000);
	assert.equal(summary.groups.kind['agent-window'].coveredMs, 5000);
	assert.equal(summary.observations[0].usage, null);
});

test('interruption stays unknown; failed attempts and successful retries remain separate', () => {
	const summary = summarizePerformance(
		[{...span('failed', 1000, 2000), outcome: 'failed'}, span('retry', 3000, 5000), span('open', 6000, null)],
		{finishedAt: new Date(9000).toISOString()},
	);
	assert.deepEqual(summary.incompleteIds, ['open']);
	assert.equal(summary.coveredMs, 3000);
	assert.equal(summary.unobservedMs, 5000);
	assert.equal(summary.observations[0].outcome, 'failed');
});

test('reject conflicting identities, backwards clocks, out-of-window spans and invented measurements', () => {
	assert.throws(() => summarizePerformance([span('same', 0, 10), span('same', 0, 11)]), /Conflicting/);
	assert.throws(() => validatePerformanceSpan(span('bad', 2, 1)), /finish/);
	assert.throws(
		() => summarizePerformance([span('outside', 0, 10)], {finishedAt: new Date(9).toISOString()}),
		/outside/,
	);
	assert.throws(() => validatePerformanceSpan({...span('bad', 0, 1), measurements: {seconds: -1}}), /nonnegative/);
	assert.throws(
		() => validatePerformanceSpan({...span('bad', 0, 1), secretPayload: 'not telemetry'}),
		/unknown|unexpected|unsupported/i,
	);
});

test('sourced token subsets remain attached to their observation and are not totaled twice', () => {
	const usage = {
		source: 'synthetic provider event',
		inputTokens: 100,
		cachedInputTokens: 80,
		outputTokens: 30,
		reasoningTokens: 20,
	};
	const summary = summarizePerformance([{...span('model', 0, 10), usage}]);
	assert.deepEqual(summary.observations[0].usage, usage);
	assert.throws(
		() => validatePerformanceSpan({...span('bad', 0, 10), usage: {...usage, reasoningTokens: 40}}),
		/subset/,
	);
});

test('empty traces require explicit bounds and leave all time unobserved', () => {
	assert.throws(() => summarizePerformance([]), /bounds/);
	assert.equal(
		summarizePerformance([], {startedAt: new Date(0).toISOString(), finishedAt: new Date(15).toISOString()})
			.unobservedMs,
		15,
	);
});

test('immutable per-actor files accept exact redelivery but retain conflicting evidence', (t) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'performance-trace-'));
	t.after(() => fs.rmSync(root, {recursive: true, force: true}));
	const first = span('delivery', 0, 10);
	const target = savePerformanceSpan(root, first);
	assert.equal(savePerformanceSpan(root, first), target);
	assert.throws(() => savePerformanceSpan(root, span('delivery', 0, 20)));
	assert.deepEqual(JSON.parse(fs.readFileSync(target)), first);
});

test('command wrapper preserves exit codes, literal arguments and missing usage', (t) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'performance-command-'));
	t.after(() => fs.rmSync(root, {recursive: true, force: true}));
	const cli = fileURLToPath(new URL('./performance-trace.mjs', import.meta.url));
	for (const code of [0, 7]) {
		const child = spawnSync(
			process.execPath,
			[
				cli,
				'run',
				'--directory',
				root,
				'--stage',
				'ux',
				'--operation',
				'fixture',
				'--',
				process.execPath,
				'-e',
				`console.log(process.argv[1]);process.exit(${code})`,
				'literal $value; spaces',
			],
			{encoding: 'utf8'},
		);
		assert.equal(child.status, code, child.stderr);
		assert.equal(child.stdout.trim(), 'literal $value; spaces');
	}
	const spans = fs.readdirSync(root).map((name) => JSON.parse(fs.readFileSync(path.join(root, name))));
	assert.deepEqual(spans.map((s) => s.outcome).sort(), ['complete', 'failed']);
	assert.ok(spans.every((s) => s.measurements['process-ms'] >= 0 && s.usage === null));
	const unavailable = spawnSync(
		process.execPath,
		[
			cli,
			'run',
			'--directory',
			path.join(root, spans[0].id + '.json', 'impossible'),
			'--stage',
			'ux',
			'--operation',
			'fixture',
			'--',
			process.execPath,
			'-e',
			'process.exit(0)',
		],
		{encoding: 'utf8'},
	);
	assert.equal(unavailable.status, 0, unavailable.stderr);
	assert.match(unavailable.stderr, /trace unavailable/);
});
