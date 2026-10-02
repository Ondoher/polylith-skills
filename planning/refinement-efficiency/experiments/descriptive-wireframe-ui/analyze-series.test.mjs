import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {SeriesAnalysis} from './analyze-series.mjs';

function fixture() {
	const series = {
		orders: [
			['pair-1-A', 'pair-1-B'],
			['pair-2-B', 'pair-2-A'],
			['pair-3-A', 'pair-3-B'],
		],
		requestedSettings: 'settings.json',
	};
	const durations = {
		'pair-1-A': 100000,
		'pair-1-B': 80000,
		'pair-2-A': 90000,
		'pair-2-B': 100000,
		'pair-3-A': 120000,
		'pair-3-B': 80000,
	};
	const entries = [],
		results = {};
	let start = Date.parse('2026-10-02T00:00:00.000Z');
	for (const run of series.orders.flat()) {
		const timestamp = (offset) => new Date(start + offset).toISOString();
		const marker = (stage, phase, offset) =>
			entries.push({type: 'marker', run, stage, phase, timestamp: timestamp(offset), details: {}});
		marker('pipeline', 'dispatch', 0);
		for (const [stage, began, ended] of [
			['layout', 1000, 11000],
			['structural-review', 11000, 14000],
			['ui', 14000, 24000],
			['ui-review', 24000, 27000],
		]) {
			marker(stage, 'dispatch', began);
			marker(stage, 'observed-completion', ended);
		}
		marker('layout-authoring', 'start', 2000);
		marker('layout-authoring', 'inputs-ready', 2500);
		marker('layout-authoring', 'authoring-end', 7000);
		marker('ui-authoring', 'start', 15000);
		marker('ui-authoring', 'input-ready', 16000);
		marker('ui-authoring', 'end', 21000);
		for (const [tool, phase, offset, durationMs] of [
			['render', 'start', 1050, null],
			['render', 'end', 1052, 2],
			['capture', 'start', 1053, null],
			['browser', 'start', 1054, null],
			['browser', 'end', 1060, 6],
			['capture', 'end', 1061, 8],
		])
			entries.push({
				type: 'tool',
				run,
				stage: 'layout-render',
				tool,
				phase,
				timestamp: timestamp(offset),
				durationMs,
				...(tool === 'render' && phase === 'end' ? {result: {inputBytes: 1200, htmlBytes: 2400}} : {}),
			});
		marker('pipeline', 'observed-completion', durations[run]);
		const subject = (role) => ({
			artifact: {path: `${run}/${role}.json`, sha256: 'a'.repeat(64), bytes: role === 'ui' ? 300 : 120},
			review: {path: `${run}/${role}-review.json`, sha256: 'b'.repeat(64)},
		});
		results[run] = {
			run,
			status: 'approved',
			approvedFinalSubjects: {layout: subject('layout'), ui: subject('ui')},
			reviewRounds: [
				{
					stage: 'structural-review',
					round: 1,
					verdict: 'pass',
					findings: [],
					artifact: {path: `${run}/structure-r1.json`},
				},
				{stage: 'ui-review', round: 1, verdict: 'pass', findings: [], artifact: {path: `${run}/ui-r1.json`}},
			],
			artifacts: [{role: 'ui', path: `${run}/ui.json`, sha256: 'a'.repeat(64), bytes: 300}],
		};
		start += durations[run] + 1000;
	}
	return {series, entries, results};
}

test('six sequential approved arms produce path statistics and paired differences with nested timings kept separate', () => {
	const {series, entries, results} = fixture();
	const root = entries.find(
		(entry) => entry.run === 'pair-1-A' && entry.stage === 'pipeline' && entry.phase === 'dispatch',
	);
	for (const [stage, began, ended] of [
		['layout-repair-1', 27000, 28000],
		['structural-re-review-1', 28000, 30000],
	]) {
		for (const [phase, offset] of [
			['dispatch', began],
			['observed-completion', ended],
		])
			entries.push({
				type: 'marker',
				run: root.run,
				stage,
				phase,
				details: {},
				timestamp: new Date(Date.parse(root.timestamp) + offset).toISOString(),
			});
	}
	results[root.run].reviewRounds[0] = {
		stage: 'structural-review',
		round: 1,
		verdict: 'revise',
		findings: [{id: 'missing-source-action', category: 'coverage'}],
	};
	results[root.run].reviewRounds.push({stage: 'structural-review', round: 2, verdict: 'pass', findings: []});
	const summary = SeriesAnalysis.analyze(series, entries, results);
	assert.deepEqual(summary.plannedOrder, series.orders.flat());
	assert.equal(summary.paths.A.metrics.pipelineMs.mean, 310000 / 3);
	assert.equal(summary.paths.A.metrics.pipelineMs.median, 100000);
	assert.deepEqual(summary.paths.A.metrics.pipelineMs.range, {min: 90000, max: 120000});
	assert.deepEqual(
		summary.pairedDifferences.map((pair) => pair.metrics.pipelineMs),
		[-20000, 10000, -40000],
	);
	assert.equal(summary.pairedStatistics.pipelineMs.median, -20000);
	assert.deepEqual(summary.sequentialViolations, []);
	const first = summary.runs[0];
	assert.equal(first.metrics.pipelineMs, 100000);
	assert.equal(first.metrics.repairRounds, 1);
	assert.equal(first.review.reReviewRounds, 1);
	assert.equal(first.review.firstPass['structural-review'], false);
	assert.equal(first.review.findingCount, 1);
	assert.deepEqual(first.review.categories, {coverage: 1});
	assert.equal(first.authorWindows[0].inputCollectionMs, 500);
	assert.equal(first.authorWindows[0].authoringMs, 4500);
	assert.equal(first.authorWindows[0].durationMs, 5000);
	assert.equal(first.authorWindows[0].parentStageId, first.stageWindows[0].id);
	assert(first.authorWindows[0].overlaps.includes(first.pipelineWindow.id));
	assert.equal(first.tools.observedCalls, 3);
	assert.equal(first.tools.byTool.capture.durations.mean, 8);
	assert.equal(first.tools.byTool.browser.durations.mean, 6);
	assert.equal(first.tools.totalDurationMs, undefined);
	assert.equal(first.metrics.finalUiBytes, 300);
	const report = SeriesAnalysis.markdown(summary);
	assert.match(report, /structural-re-review-1/);
	assert.match(report, /Initial layout \| Initial structural review \| Initial UI \| Initial UI review/);
	assert.match(report, /Enclosing stage/);
	assert.match(report, /Within stage \(author\)/);
	assert.match(report, /Before inputs-ready marker \| After inputs-ready marker/);
	assert.match(report, /helpers may be written before inputs-ready/);
	assert.match(report, /exclude other agent commands/);
	assert.match(report, /Revision labels identify artifact revisions rather than call counts/);
	assert.match(report, /Saved JSON bytes are not emitted token counts/);
	assert.match(report, /No host reasoning or credit measurements/);
});

test('complete UI bytes include required dependencies while root-only values and self-contained legacy fallback stay intact', () => {
	const {series, entries, results} = fixture();
	results['pair-1-B'].approvedFinalSubjects.ui.completeMaterializedBytes = 1200;
	const summary = SeriesAnalysis.analyze(series, entries, results);
	const candidate = summary.runs.find((run) => run.run === 'pair-1-B');
	assert.equal(candidate.metrics.finalUiBytes, 300);
	assert.equal(candidate.metrics.finalUiCompleteBytes, 1200);
	assert.equal(summary.runs[0].metrics.finalUiCompleteBytes, 300);
	assert.equal(summary.paths.B.metrics.finalUiBytes.mean, 300);
	assert.equal(summary.paths.B.metrics.finalUiCompleteBytes.mean, 600);
	assert.equal(summary.paths.B.metrics.finalUiCompleteBytes.median, 300);
	assert.deepEqual(summary.paths.B.metrics.finalUiCompleteBytes.range, {min: 300, max: 1200});
	assert.equal(summary.pairedDifferences[0].metrics.finalUiBytes, 0);
	assert.equal(summary.pairedDifferences[0].metrics.finalUiCompleteBytes, 900);
	assert.equal(summary.pairedStatistics.finalUiCompleteBytes.mean, 300);
	assert.equal(summary.pairedStatistics.finalUiCompleteBytes.median, 0);
	assert.deepEqual(summary.pairedStatistics.finalUiCompleteBytes.range, {min: 0, max: 900});
	const report = SeriesAnalysis.markdown(summary);
	assert.match(report, /UI root-only JSON bytes/);
	assert.match(report, /Complete UI JSON bytes \(root \+ required dependencies\)/);
	assert.match(report, /\| pair-1-B \| 300 \| 1200 \|/);
});

test('unapproved arms, absent fields and unspecified finding categories remain unavailable', () => {
	const {series, entries, results} = fixture();
	for (const run of series.orders.flat().slice(2)) delete results[run];
	results['pair-1-B'].status = 'pending';
	results['pair-1-A'].reviewRounds = [
		{stage: 'structural-review', round: 1, verdict: 'revise', findings: [{id: 'visual-in-name-only'}]},
	];
	const subset = entries.filter(
		(entry) => !(entry.run === 'pair-1-A' && entry.stage === 'layout-authoring' && entry.phase === 'inputs-ready'),
	);
	const summary = SeriesAnalysis.analyze(series, subset, results);
	assert.equal(summary.paths.A.metrics.pipelineMs.availableCount, 1);
	assert.equal(summary.paths.B.metrics.pipelineMs.mean, null);
	assert.equal(summary.pairedDifferences[0].metrics.pipelineMs, null);
	assert.equal(summary.runs[0].authorWindows[0].inputCollectionMs, null);
	assert.equal(summary.runs[0].authorWindows[0].authoringMs, null);
	assert.deepEqual(summary.runs[0].review.categories, {});
	assert.equal(summary.runs[0].review.uncategorized, 1);
	assert.equal(summary.runs[0].review.firstPass.overall, null);
	assert.equal(summary.runs[0].observability.actualModel, null);
	assert.equal(summary.runs[0].observability.reasoningTokens, null);
	assert.equal(summary.runs[2].review.findingCount, null);
	assert.equal(summary.runs[2].metadataStatus, null);
	assert.match(SeriesAnalysis.markdown(summary), /unavailable/);
});

test('CLI writes deterministic JSON and Markdown with exact source references and preserves input bytes', async (context) => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'series-analysis-'));
	context.after(async () => {
		const relative = path.relative(os.tmpdir(), directory);
		assert(!relative.startsWith('..') && !path.isAbsolute(relative));
		assert(path.basename(directory).startsWith('series-analysis-'));
		await fs.rm(directory, {recursive: true, force: true});
	});
	const {series, entries, results} = fixture();
	const seriesPath = path.join(directory, 'series.json'),
		eventsPath = path.join(directory, 'events.jsonl');
	const resultsDir = path.join(directory, 'results'),
		outputDir = path.join(directory, 'analysis');
	await fs.mkdir(resultsDir);
	await fs.writeFile(seriesPath, '\uFEFF' + JSON.stringify(series));
	await fs.writeFile(eventsPath, entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n');
	for (const [run, metadata] of Object.entries(results))
		await fs.writeFile(path.join(resultsDir, run + '.json'), JSON.stringify(metadata));
	const initialSeries = await fs.readFile(seriesPath),
		initialEvents = await fs.readFile(eventsPath);
	const args = [
		'--series',
		seriesPath,
		'--events',
		eventsPath,
		'--results-dir',
		resultsDir,
		'--output-dir',
		outputDir,
	];
	const saved = await SeriesAnalysis.cli(args);
	const json = await fs.readFile(saved.summaryPath),
		markdown = await fs.readFile(saved.reportPath);
	const summary = JSON.parse(json.toString('utf8'));
	assert.equal(summary.runs.length, 6);
	assert.match(summary.sources.events.sha256, /^[a-f0-9]{64}$/);
	assert.equal(summary.sources.results.length, 6);
	assert.match(markdown.toString('utf8'), /B minus A/);
	await SeriesAnalysis.cli(args);
	assert.deepEqual(await fs.readFile(saved.summaryPath), json);
	assert.deepEqual(await fs.readFile(saved.reportPath), markdown);
	assert.deepEqual(await fs.readFile(seriesPath), initialSeries);
	assert.deepEqual(await fs.readFile(eventsPath), initialEvents);
});
