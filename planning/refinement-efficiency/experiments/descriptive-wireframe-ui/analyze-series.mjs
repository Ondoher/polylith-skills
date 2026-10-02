import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

/**
 * Durable results/<run>.json is coordinator-authored evidence, not an approval generator:
 * {
 *   run: "pair-1-A", status: "approved",
 *   approvedFinalSubjects: {
 *     layout: {artifact: {path, sha256, bytes}, review: {path, sha256}},
 *     ui: {artifact: {path, sha256, bytes}, review: {path, sha256}}
 *   },
 *   reviewRounds: [{stage: "structural-review" | "ui-review", round: 1,
 *     verdict: "pass" | "revise", findings: [{id, category, ...}], artifact: {path, sha256}}],
 *   artifacts: [{role, path, sha256, bytes}]
 * }
 * findingCount may replace a findings array when detailed findings are unavailable.
 * approvedFinalSubjects.ui.completeMaterializedBytes supplies root + required dependency bytes.
 * finalUiBytes remains root-only; finalUiCompleteBytes uses that explicit complete size,
 * with artifact.bytes as the fallback for self-contained legacy records.
 * Missing values stay null/unavailable. Categories are never inferred from prose.
 * Optional actualModel, reasoningTokens, totalTokens, creditUsage and
 * clarificationRequests are copied only when explicitly present in saved metadata.
 */

function knownNumber(value) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function statistics(values) {
	const available = values.filter((entry) => typeof entry.value === 'number' && Number.isFinite(entry.value));
	const ordered = available.map((entry) => entry.value).sort((left, right) => left - right);
	const middle = Math.floor(ordered.length / 2);
	return {
		values,
		availableCount: ordered.length,
		unavailableRuns: values.filter((entry) => entry.value === null).map((entry) => entry.run),
		mean: ordered.length ? ordered.reduce((sum, value) => sum + value, 0) / ordered.length : null,
		median: ordered.length
			? ordered.length % 2
				? ordered[middle]
				: (ordered[middle - 1] + ordered[middle]) / 2
			: null,
		range: ordered.length ? {min: ordered[0], max: ordered.at(-1)} : null,
	};
}

function windows(entries, kind) {
	const pending = new Map(),
		result = [];
	for (const entry of entries.filter((candidate) => candidate.type === 'marker')) {
		const key = JSON.stringify([entry.stage, entry.details?.actor, entry.details?.round]);
		const starting = kind === 'parent' ? entry.phase === 'dispatch' : entry.phase === 'start';
		const ending =
			kind === 'parent' ? entry.phase === 'observed-completion' : ['end', 'authoring-end'].includes(entry.phase);
		if (starting) {
			const window = {
				id: `${kind}-${result.length}`,
				kind,
				stage: entry.stage,
				details: entry.details ?? {},
				start: entry.timestamp,
				end: null,
				durationMs: null,
				...(kind === 'author' ? {inputsReady: null, inputCollectionMs: null, authoringMs: null} : {}),
			};
			result.push(window);
			const stack = pending.get(key) ?? [];
			stack.push(window);
			pending.set(key, stack);
		} else if (ending) {
			const window = pending.get(key)?.pop();
			if (!window) continue;
			window.end = entry.timestamp;
			window.durationMs = Date.parse(window.end) - Date.parse(window.start);
			if (window.durationMs < 0) throw new Error(`${entry.stage}: completion precedes start`);
			if (kind === 'author' && window.inputsReady)
				window.authoringMs = Date.parse(window.end) - Date.parse(window.inputsReady);
		} else if (kind === 'author' && ['inputs-ready', 'input-ready'].includes(entry.phase)) {
			const window = pending.get(key)?.at(-1);
			if (window && !window.inputsReady) {
				window.inputsReady = entry.timestamp;
				window.inputCollectionMs = Date.parse(entry.timestamp) - Date.parse(window.start);
				if (window.inputCollectionMs < 0) throw new Error(`${entry.stage}: inputs-ready precedes start`);
			}
		}
	}
	return result.sort((left, right) => Date.parse(left.start) - Date.parse(right.start));
}

function stageFamily(stage) {
	if (stage === 'structural-review' || stage.startsWith('structural-re-review-')) return 'structural-review';
	if (stage === 'ui-review' || stage.startsWith('ui-re-review-')) return 'ui-review';
	return null;
}

function reviews(metadata) {
	const rounds = Array.isArray(metadata?.reviewRounds) ? metadata.reviewRounds : null;
	const firstPass = {};
	for (const stage of ['structural-review', 'ui-review']) {
		const first = rounds?.find((round) => stageFamily(round.stage ?? '') === stage && round.round === 1);
		firstPass[stage] =
			first?.verdict === 'pass' ? true : ['revise', 'fail'].includes(first?.verdict) ? false : null;
	}
	firstPass.overall = Object.values(firstPass).some((value) => value === null)
		? null
		: Object.values(firstPass).every(Boolean);
	const counts = rounds?.map((round) =>
		knownNumber(round.findingCount)
			? round.findingCount
			: Array.isArray(round.findings)
				? round.findings.length
				: null,
	);
	const findingCount =
		counts?.length && counts.every((value) => value !== null)
			? counts.reduce((sum, count) => sum + count, 0)
			: null;
	const categories = {};
	let uncategorized = 0,
		categoryDetailUnavailable = false;
	for (const round of rounds ?? []) {
		if (!Array.isArray(round.findings)) {
			categoryDetailUnavailable = true;
			continue;
		}
		for (const finding of round.findings) {
			if (typeof finding.category === 'string' && finding.category)
				categories[finding.category] = (categories[finding.category] ?? 0) + 1;
			else uncategorized++;
		}
	}
	return {
		rounds,
		firstPass,
		findingCount,
		categories: rounds ? categories : null,
		uncategorized: rounds ? uncategorized : null,
		categoryDetailUnavailable: rounds ? categoryDetailUnavailable : null,
		reReviewRounds: rounds
			? rounds.filter((round) => Number.isInteger(round.round) && round.round > 1).length
			: null,
	};
}

function toolSummary(entries) {
	const evidence = entries
		.filter((entry) => entry.type === 'tool')
		.map((entry) => ({
			tool: entry.tool,
			stage: entry.stage,
			phase: entry.phase,
			timestamp: entry.timestamp,
			durationMs: knownNumber(entry.durationMs) ? entry.durationMs : null,
			error: entry.error ?? null,
			inputBytes: knownNumber(entry.result?.inputBytes) ? entry.result.inputBytes : null,
			htmlBytes: knownNumber(entry.result?.htmlBytes) ? entry.result.htmlBytes : null,
			input: entry.result?.input ?? null,
			previewPath: entry.result?.previewPath ?? null,
		}));
	const byTool = {};
	for (const tool of [...new Set(evidence.map((entry) => entry.tool))]) {
		const calls = evidence.filter((entry) => entry.tool === tool);
		const finished = calls.filter((entry) => ['end', 'error'].includes(entry.phase));
		byTool[tool] = {
			observedCalls: calls.filter((entry) => entry.phase === 'start').length,
			completed: finished.filter((entry) => entry.phase === 'end').length,
			errors: finished.filter((entry) => entry.phase === 'error').length,
			durations: statistics(finished.map((entry, index) => ({run: String(index + 1), value: entry.durationMs}))),
		};
	}
	return {
		observedCalls: evidence.filter((entry) => entry.phase === 'start').length,
		byTool,
		evidence,
		allHostToolCalls: null,
		limitation:
			'Counts include saved harness events only. Capture durations encompass browser durations; do not add different tool totals.',
	};
}

function analyzeRun(identity, entries, metadata) {
	const parentWindows = windows(entries, 'parent');
	const authorWindows = windows(entries, 'author');
	const pipeline = parentWindows.filter((window) => window.stage === 'pipeline');
	const pipelineWindow = pipeline.length === 1 ? pipeline[0] : null;
	const stageWindows = parentWindows.filter((window) => window.stage !== 'pipeline');
	const allWindows = [...parentWindows, ...authorWindows];
	for (const window of allWindows) {
		window.overlaps = allWindows
			.filter(
				(other) =>
					other.id !== window.id &&
					other.end &&
					window.end &&
					Date.parse(other.start) < Date.parse(window.end) &&
					Date.parse(window.start) < Date.parse(other.end),
			)
			.map((other) => other.id);
	}
	for (const window of authorWindows) {
		const parents = stageWindows.filter(
			(candidate) =>
				candidate.end &&
				window.end &&
				Date.parse(candidate.start) <= Date.parse(window.start) &&
				Date.parse(candidate.end) >= Date.parse(window.end),
		);
		window.parentStageId = parents.sort((left, right) => left.durationMs - right.durationMs)[0]?.id ?? null;
	}
	const review = reviews(metadata);
	const approvedSubjects = metadata?.approvedFinalSubjects ?? null;
	const completeApproved =
		metadata?.status === 'approved' &&
		!!approvedSubjects?.layout?.artifact?.path &&
		!!approvedSubjects?.ui?.artifact?.path &&
		pipelineWindow?.durationMs !== null &&
		!!pipelineWindow;
	const primary = {};
	for (const stage of ['layout', 'structural-review', 'ui', 'ui-review']) {
		const matches = stageWindows.filter((window) => window.stage === stage);
		primary[stage] = matches.length === 1 ? matches[0].durationMs : null;
	}
	const repairs = stageWindows.filter((window) => /^(layout|ui)-repair-\d+$/.test(window.stage));
	return {
		...identity,
		metadataStatus: metadata?.status ?? null,
		completeApproved,
		approvedFinalSubjects: approvedSubjects,
		artifacts: metadata?.artifacts ?? null,
		pipelineWindow,
		stageWindows,
		authorWindows,
		metrics: {
			pipelineMs: pipelineWindow?.durationMs ?? null,
			layoutMs: primary.layout,
			structuralReviewMs: primary['structural-review'],
			uiMs: primary.ui,
			uiReviewMs: primary['ui-review'],
			findings: review.findingCount,
			repairRounds:
				completeApproved && Object.values(primary).every((value) => value !== null) ? repairs.length : null,
			finalLayoutBytes: knownNumber(approvedSubjects?.layout?.artifact?.bytes)
				? approvedSubjects.layout.artifact.bytes
				: null,
			finalUiBytes: knownNumber(approvedSubjects?.ui?.artifact?.bytes)
				? approvedSubjects.ui.artifact.bytes
				: null,
			finalUiCompleteBytes: knownNumber(approvedSubjects?.ui?.completeMaterializedBytes)
				? approvedSubjects.ui.completeMaterializedBytes
				: approvedSubjects?.ui?.completeMaterializedBytes == null &&
					  knownNumber(approvedSubjects?.ui?.artifact?.bytes)
					? approvedSubjects.ui.artifact.bytes
					: null,
		},
		review,
		tools: toolSummary(entries),
		observability: {
			actualModel: metadata?.actualModel ?? null,
			reasoningTokens: metadata?.reasoningTokens ?? null,
			totalTokens: metadata?.totalTokens ?? null,
			creditUsage: metadata?.creditUsage ?? null,
			clarificationRequests: metadata?.clarificationRequests ?? null,
		},
		unavailable: [
			!metadata && 'results metadata',
			!pipelineWindow?.end && 'completed pipeline timing',
			!approvedSubjects && 'approved final subjects',
			!review.rounds && 'review round details',
			...Object.entries(primary)
				.filter(([, value]) => value === null)
				.map(([stage]) => `${stage} timing`),
		].filter(Boolean),
	};
}

function display(value, seconds = false) {
	if (value === null || value === undefined) return 'unavailable';
	return seconds ? (value / 1000).toFixed(2) + ' s' : String(value);
}

function fraction(values) {
	const known = values.filter((value) => typeof value === 'boolean');
	return {
		approved: known.filter(Boolean).length,
		observed: known.length,
		unavailable: values.length - known.length,
		rate: known.length ? known.filter(Boolean).length / known.length : null,
	};
}

/** Deterministic reporting for saved sequential matched arms; never dispatches models. */
export const SeriesAnalysis = {
	/** Analyze saved events and compact coordinator-authored result metadata.
	 * @param {object} series - Frozen series with orders of matched A/B run IDs.
	 * @param {object[]} entries - Saved JSONL marker/tool records.
	 * @param {object} results - Metadata keyed by exact run ID; omitted records remain unavailable.
	 * @returns {object} Per-run evidence, completed-approved path statistics and B-minus-A differences.
	 */
	analyze(series, entries, results = {}) {
		if (!Array.isArray(series.orders) || !series.orders.length)
			throw new Error('series.orders must contain matched pairs');
		const identities = [];
		for (const [index, order] of series.orders.entries()) {
			if (
				!Array.isArray(order) ||
				order.length !== 2 ||
				!order.every((run) => typeof run === 'string' && /^pair-\d+-[AB]$/.test(run)) ||
				order[0].slice(0, -1) !== order[1].slice(0, -1) ||
				new Set(order.map((run) => run.at(-1))).size !== 2
			)
				throw new Error('Each order must contain exact A/B run IDs');
			order.forEach((run) =>
				identities.push({run, pair: index + 1, path: run.at(-1), order: identities.length + 1}),
			);
		}
		if (new Set(identities.map((identity) => identity.run)).size !== identities.length)
			throw new Error('Run IDs must be unique');
		for (const entry of entries)
			if (!Number.isFinite(Date.parse(entry.timestamp))) throw new Error('Invalid event timestamp');
		const runs = identities.map((identity) => {
			const metadata = results[identity.run] ?? null;
			if (metadata && metadata.run !== identity.run) throw new Error(`Results run mismatch: ${identity.run}`);
			return analyzeRun(
				identity,
				entries.filter((entry) => entry.run === identity.run),
				metadata,
			);
		});
		const metrics = [
			'pipelineMs',
			'layoutMs',
			'structuralReviewMs',
			'uiMs',
			'uiReviewMs',
			'findings',
			'repairRounds',
			'finalLayoutBytes',
			'finalUiBytes',
			'finalUiCompleteBytes',
		];
		const paths = {};
		for (const route of ['A', 'B']) {
			const completed = runs.filter((run) => run.path === route && run.completeApproved);
			paths[route] = {
				completedApprovedRuns: completed.map((run) => run.run),
				excludedRuns: runs.filter((run) => run.path === route && !run.completeApproved).map((run) => run.run),
				metrics: Object.fromEntries(
					metrics.map((metric) => [
						metric,
						statistics(completed.map((run) => ({run: run.run, value: run.metrics[metric]}))),
					]),
				),
				firstPass: Object.fromEntries(
					['structural-review', 'ui-review', 'overall'].map((stage) => [
						stage,
						fraction(completed.map((run) => run.review.firstPass[stage])),
					]),
				),
			};
		}
		const pairedDifferences = series.orders.map((_, index) => {
			const pair = runs.filter((run) => run.pair === index + 1);
			const control = pair.find((run) => run.path === 'A'),
				candidate = pair.find((run) => run.path === 'B');
			const completeApproved = pair.every((run) => run.completeApproved);
			return {
				pair: index + 1,
				control: control.run,
				candidate: candidate.run,
				completeApproved,
				metrics: Object.fromEntries(
					metrics.map((metric) => [
						metric,
						completeApproved && control.metrics[metric] !== null && candidate.metrics[metric] !== null
							? candidate.metrics[metric] - control.metrics[metric]
							: null,
					]),
				),
			};
		});
		const sequentialViolations = [];
		for (let index = 1; index < runs.length; index++) {
			const previous = runs[index - 1],
				current = runs[index];
			if (
				previous.pipelineWindow?.end &&
				current.pipelineWindow?.start &&
				Date.parse(current.pipelineWindow.start) < Date.parse(previous.pipelineWindow.end)
			)
				sequentialViolations.push({
					previous: previous.run,
					current: current.run,
					reason: 'Pipeline windows overlap in the planned execution order',
				});
		}
		return {
			plannedOrder: identities.map((identity) => identity.run),
			runs,
			paths,
			pairedDifferences,
			pairedStatistics: Object.fromEntries(
				metrics.map((metric) => [
					metric,
					statistics(
						pairedDifferences
							.filter((pair) => pair.completeApproved)
							.map((pair) => ({run: `pair-${pair.pair}`, value: pair.metrics[metric]})),
					),
				]),
			),
			sequentialViolations,
			requestedSettingsReference: series.requestedSettings ?? null,
			limitations: [
				'Elapsed pipeline, parent and author windows include coordination and tool work; they are not pure reasoning time.',
				'Pipeline encompasses parent stages; parent stages encompass author and tool work. Overlaps are explicit and never summed.',
				'Statistics include only completed approved runs. Missing metrics remain unavailable; requested settings do not verify actual models or token use.',
				'Approval and findings come from saved coordinator metadata; this analyzer does not perform or grant review.',
				'Paired differences are B minus A. Negative elapsed differences favor B; a small series does not establish general performance.',
			],
		};
	},

	/** Create a concise report while retaining detailed nested evidence in summary JSON.
	 * @param {object} summary - Result of analyze.
	 * @returns {string} Markdown report.
	 */
	markdown(summary) {
		const lines = [
			'# Matched series analysis',
			'',
			'Only completed approved runs enter statistics. Times are observed elapsed windows, not pure reasoning time.',
			'',
			'| Run | Path | Approved complete | Pipeline | Initial layout | Initial structural review | Initial UI | Initial UI review | Findings | Repair rounds |',
			'| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
		];
		for (const run of summary.runs)
			lines.push(
				`| ${run.run} | ${run.path} | ${run.completeApproved} | ${display(run.metrics.pipelineMs, true)} | ${display(run.metrics.layoutMs, true)} | ${display(run.metrics.structuralReviewMs, true)} | ${display(run.metrics.uiMs, true)} | ${display(run.metrics.uiReviewMs, true)} | ${display(run.metrics.findings)} | ${display(run.metrics.repairRounds)} |`,
			);
		lines.push(
			'',
			'| Path | Approved runs | Pipeline mean | Median | Range | Overall first-pass approval |',
			'| --- | --- | --- | --- | --- | --- |',
		);
		for (const route of ['A', 'B']) {
			const stats = summary.paths[route].metrics.pipelineMs,
				first = summary.paths[route].firstPass.overall;
			lines.push(
				`| ${route} | ${stats.availableCount} | ${display(stats.mean, true)} | ${display(stats.median, true)} | ${stats.range ? display(stats.range.min, true) + '–' + display(stats.range.max, true) : 'unavailable'} | ${first.observed ? `${first.approved}/${first.observed}` : 'unavailable'} (${first.unavailable} unavailable) |`,
			);
		}
		lines.push(
			'',
			'Paired differences are **B minus A**; negative elapsed differences favor B.',
			'',
			'| Pair | Completed approved | Pipeline difference |',
			'| --- | --- | --- |',
		);
		for (const pair of summary.pairedDifferences)
			lines.push(`| ${pair.pair} | ${pair.completeApproved} | ${display(pair.metrics.pipelineMs, true)} |`);
		lines.push(
			'',
			'## Saved UI artifact sizes',
			'',
			'Root-only bytes preserve the existing finalUiBytes metric. Complete UI bytes use the saved completeMaterializedBytes value for the root and required dependencies; self-contained legacy records fall back to root artifact bytes. These saved JSON sizes are not emitted token counts.',
			'',
			'| Run | UI root-only JSON bytes | Complete UI JSON bytes (root + required dependencies) |',
			'| --- | --- | --- |',
		);
		for (const run of summary.runs)
			lines.push(
				`| ${run.run} | ${display(run.metrics.finalUiBytes)} | ${display(run.metrics.finalUiCompleteBytes)} |`,
			);
		lines.push(
			'',
			'## Chronological parent and author windows',
			'',
			'The overview shows initial stages. Repairs and re-reviews appear chronologically below and are included in the pipeline window. Enclosing stages contain the author windows labeled Within stage. These windows nest and may overlap; do not add them to pipeline time. Readiness markers divide elapsed windows, and helpers may be written before inputs-ready.',
			'',
			'| Run | Relationship | Stage | Start UTC | End UTC | Elapsed | Before inputs-ready marker | After inputs-ready marker |',
			'| --- | --- | --- | --- | --- | --- | --- | --- |',
		);
		for (const run of summary.runs)
			for (const window of [...run.stageWindows, ...run.authorWindows].sort(
				(left, right) => Date.parse(left.start) - Date.parse(right.start),
			))
				lines.push(
					`| ${run.run} | ${window.kind === 'parent' ? 'Enclosing stage' : window.parentStageId ? 'Within stage (author)' : 'Author window (enclosing stage unavailable)'} | ${window.stage} | ${window.start} | ${window.end ?? 'unavailable'} | ${display(window.durationMs, true)} | ${display(window.inputCollectionMs, true)} | ${display(window.authoringMs, true)} |`,
				);
		lines.push(
			'',
			'## Saved tool observations',
			'',
			'Logged calls cover saved harness events and exclude other agent commands. Revision labels identify artifact revisions rather than call counts. Saved JSON bytes are not emitted token counts. No host reasoning or credit measurements are available in this report.',
			'',
			'| Run | Tool | Started calls | Completed | Errors | Known duration mean |',
			'| --- | --- | --- | --- | --- | --- |',
		);
		for (const run of summary.runs)
			for (const [tool, observations] of Object.entries(run.tools.byTool))
				lines.push(
					`| ${run.run} | ${tool} | ${observations.observedCalls} | ${observations.completed} | ${observations.errors} | ${display(observations.durations.mean, true)} |`,
				);
		lines.push(
			'',
			'Categories, exact approved artifact references, individual values, overlaps and unavailable host metrics are retained in summary.json.',
			'',
			...summary.limitations.map((limitation) => `- ${limitation}`),
			'',
		);
		if (summary.sequentialViolations.length)
			lines.push(
				'Execution-order violations:',
				'',
				...summary.sequentialViolations.map((item) => `- ${item.previous} overlaps ${item.current}.`),
				'',
			);
		return lines.join('\n');
	},

	/** Read durable source files and write only new reporting artifacts.
	 * @param {string[]} args - --series, --events, --results-dir and --output-dir paths.
	 * @returns {Promise<object>} Summary JSON/Markdown paths and source hashes.
	 */
	async cli(args) {
		const {values} = parseArgs({
			args,
			options: {
				series: {type: 'string'},
				events: {type: 'string'},
				'results-dir': {type: 'string'},
				'output-dir': {type: 'string'},
			},
		});
		for (const flag of ['series', 'events', 'results-dir', 'output-dir'])
			if (!values[flag]) throw new Error(`--${flag} is required`);
		const seriesPath = path.resolve(values.series),
			eventsPath = path.resolve(values.events);
		const resultsDir = path.resolve(values['results-dir']),
			outputDir = path.resolve(values['output-dir']);
		if (
			['summary.json', 'summary.md'].some((name) => [seriesPath, eventsPath].includes(path.join(outputDir, name)))
		)
			throw new Error('Report targets must not overwrite source files');
		for (const protectedDir of [resultsDir, path.join(path.dirname(seriesPath), 'inputs')]) {
			const relative = path.relative(protectedDir, outputDir);
			if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)))
				throw new Error('Output directory must be outside results and frozen inputs');
		}
		const seriesRaw = await fs.readFile(seriesPath),
			eventsRaw = await fs.readFile(eventsPath);
		const series = JSON.parse(seriesRaw.toString('utf8').replace(/^\uFEFF/, ''));
		const entries = eventsRaw
			.toString('utf8')
			.split('\n')
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line));
		const results = {},
			resultSources = [];
		for (const run of series.orders?.flat() ?? []) {
			if (typeof run !== 'string' || !/^pair-\d+-[AB]$/.test(run)) throw new Error('Invalid series run ID');
			const target = path.join(resultsDir, run + '.json');
			try {
				const raw = await fs.readFile(target);
				results[run] = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''));
				resultSources.push({run, path: target, sha256: createHash('sha256').update(raw).digest('hex')});
			} catch (error) {
				if (error.code !== 'ENOENT') throw error;
				resultSources.push({run, path: target, sha256: null});
			}
		}
		const summary = this.analyze(series, entries, results);
		summary.sources = {
			series: {path: seriesPath, sha256: createHash('sha256').update(seriesRaw).digest('hex')},
			events: {path: eventsPath, sha256: createHash('sha256').update(eventsRaw).digest('hex')},
			results: resultSources,
		};
		await fs.mkdir(outputDir, {recursive: true});
		const summaryPath = path.join(outputDir, 'summary.json'),
			reportPath = path.join(outputDir, 'summary.md');
		await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n');
		await fs.writeFile(reportPath, this.markdown(summary));
		return {summaryPath, reportPath};
	},
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		process.stdout.write(JSON.stringify(await SeriesAnalysis.cli(process.argv.slice(2))) + '\n');
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
