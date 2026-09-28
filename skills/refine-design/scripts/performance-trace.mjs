import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {closed, ensureUnlinkedPath, stableId, text} from './product-artifact-utils.mjs';

const kinds = new Set(['agent-window', 'tool', 'process', 'helper', 'coordination', 'wait']);
const purposes = new Set(['design', 'representation', 'execution', 'unknown']);

/** Validate one observation without treating an agent window as provider reasoning.
 * @param {PerformanceSpan} span - Completed or interrupted observation.
 * @returns {PerformanceSpan} - Same validated observation.
 */
export function validatePerformanceSpan(span) {
	closed(
		span,
		[
			'id',
			'actor',
			'stage',
			'operation',
			'kind',
			'purpose',
			'startedAt',
			'finishedAt',
			'outcome',
			'measurements',
			'usage',
		],
		'performance span',
	);
	stableId(span.id, 'span ID');
	for (const key of ['actor', 'stage', 'operation']) text(span[key], key);
	if (!kinds.has(span.kind) || !purposes.has(span.purpose)) throw new Error('Invalid span kind or purpose');
	if (!['complete', 'failed', 'needs-repair', 'incomplete'].includes(span.outcome))
		throw new Error('Invalid span outcome');
	const start = Date.parse(span.startedAt),
		finish = Date.parse(span.finishedAt);
	if (typeof span.startedAt !== 'string' || !Number.isFinite(start)) throw new Error('Invalid start timestamp');
	if (span.finishedAt === null) {
		if (span.outcome !== 'incomplete') throw new Error('Open span must be incomplete');
	} else if (
		typeof span.finishedAt !== 'string' ||
		!Number.isFinite(finish) ||
		finish < start ||
		span.outcome === 'incomplete'
	)
		throw new Error('Invalid finish timestamp or outcome');
	if (!span.measurements || Array.isArray(span.measurements) || typeof span.measurements !== 'object')
		throw new Error('Expected measurements object');
	for (const [name, value] of Object.entries(span.measurements)) {
		stableId(name, 'measurement name');
		if (!Number.isFinite(value) || value < 0) throw new Error('Measurements must be finite and nonnegative');
	}
	if (span.usage !== null) {
		closed(
			span.usage,
			['source', 'inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningTokens'],
			'span usage',
		);
		text(span.usage.source, 'usage source');
		for (const key of ['inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningTokens'])
			if (span.usage[key] !== null && (!Number.isSafeInteger(span.usage[key]) || span.usage[key] < 0))
				throw new Error('Invalid token measurement');
		for (const [subset, total] of [
			['cachedInputTokens', 'inputTokens'],
			['reasoningTokens', 'outputTokens'],
		])
			if (span.usage[subset] !== null && span.usage[total] !== null && span.usage[subset] > span.usage[total])
				throw new Error('Token subset exceeds total');
	}
	return span;
}

/** Save independent immutable files so parallel actors do not share an append cursor.
 * @param {string} directory - Explicit run-local trace directory.
 * @param {PerformanceSpan} span - Observation; retries use fresh IDs.
 * @returns {string} - Saved observation path. Identical redelivery is idempotent.
 */
export function savePerformanceSpan(directory, span) {
	validatePerformanceSpan(span);
	const root = path.resolve(directory),
		target = path.join(root, `${span.id}.json`);
	ensureUnlinkedPath(target, root);
	fs.mkdirSync(root, {recursive: true});
	const bytes = `${JSON.stringify(span, null, 2)}\n`;
	try {
		fs.writeFileSync(target, bytes, {flag: 'wx'});
	} catch (error) {
		if (error.code !== 'EEXIST' || fs.readFileSync(target, 'utf8') !== bytes) throw error;
	}
	return target;
}

/** Measure interval union, including nested and overlapping work only once.
 * @param {number[][]} intervals - Millisecond start/end pairs.
 * @returns {number} - Covered wall milliseconds.
 */
function covered(intervals) {
	let end = -Infinity,
		total = 0;
	for (const [start, finish] of intervals.toSorted((a, b) => a[0] - b[0])) {
		total += Math.max(0, finish - Math.max(start, end));
		end = Math.max(end, finish);
	}
	return total;
}

/** Summarize observed coverage, retaining missing evidence and conflicting IDs.
 * @param {PerformanceSpan[]} spans - Available observations; file order is irrelevant.
 * @param {PerformanceWindow} window - Explicit run bounds, or derive from observations.
 * @returns {PerformanceSummary} - Nonadditive activity totals and underlying observations.
 */
export function summarizePerformance(spans, window = {}) {
	const unique = new Map();
	for (const span of spans) {
		validatePerformanceSpan(span);
		if (unique.has(span.id) && JSON.stringify(unique.get(span.id)) !== JSON.stringify(span))
			throw new Error(`Conflicting span ${span.id}`);
		unique.set(span.id, span);
	}
	const observations = [...unique.values()].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
	const times = observations.flatMap((s) => [
		Date.parse(s.startedAt),
		...(s.finishedAt ? [Date.parse(s.finishedAt)] : []),
	]);
	if (!times.length && (!window.startedAt || !window.finishedAt))
		throw new Error('Empty traces need explicit run bounds');
	const start = window.startedAt ? Date.parse(window.startedAt) : Math.min(...times);
	const end = window.finishedAt ? Date.parse(window.finishedAt) : Math.max(...times);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || times.some((t) => t < start || t > end))
		throw new Error('Invalid bounds or observation outside run window');
	const finished = observations.filter((s) => s.finishedAt !== null);
	const intervals = finished.map((s) => [Date.parse(s.startedAt), Date.parse(s.finishedAt)]);
	const coveredMs = covered(intervals);
	const groups = {};
	for (const field of ['kind', 'actor', 'purpose']) {
		groups[field] = Object.fromEntries(
			[...new Set(observations.map((s) => s[field]))].sort().map((key) => {
				const members = observations.filter((s) => s[field] === key);
				const ranges = members
					.filter((s) => s.finishedAt !== null)
					.map((s) => [Date.parse(s.startedAt), Date.parse(s.finishedAt)]);
				return [
					key,
					{
						count: members.length,
						summedMs: ranges.reduce((sum, [a, b]) => sum + b - a, 0),
						coveredMs: covered(ranges),
					},
				];
			}),
		);
	}
	return {
		startedAt: new Date(start).toISOString(),
		finishedAt: new Date(end).toISOString(),
		wallMs: end - start,
		coveredMs,
		unobservedMs: end - start - coveredMs,
		incompleteIds: observations.filter((s) => s.finishedAt === null).map((s) => s.id),
		groups,
		observations,
		note: 'Groups and nested measurements overlap; do not add them. Agent windows include unseparated reading, reasoning, generation, tools and waits. Token subsets are not additional tokens. No inferred reasoning time or billed cost.',
	};
}

/** Execute one command without a shell; trace failures never change its outcome.
 * @param {string[]} command - Executable and its literal arguments.
 * @param {string} directory - Explicit trace directory.
 * @param {PerformanceSpan} span - Observation labels and start timestamp.
 * @returns {Promise<number>} - Child exit code, or one on launch/signal failure.
 */
async function runCommand(command, directory, span) {
	const started = performance.now();
	let exitCode = 1;
	try {
		exitCode = await new Promise((resolve, reject) => {
			const child = spawn(command[0], command.slice(1), {stdio: 'inherit', shell: false, windowsHide: true});
			child.once('error', reject);
			child.once('close', (code) => resolve(code ?? 1));
		});
	} catch (error) {
		console.error(error.message);
	}
	try {
		savePerformanceSpan(directory, {
			...span,
			finishedAt: new Date().toISOString(),
			outcome: exitCode === 0 ? 'complete' : 'failed',
			measurements: {'process-ms': performance.now() - started, 'exit-code': exitCode},
		});
	} catch (error) {
		console.error(`Performance trace unavailable: ${error.message}`);
	}
	return exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const args = process.argv.slice(2),
			separator = args.indexOf('--');
		const {values, positionals} = parseArgs({
			args: separator < 0 ? args : args.slice(0, separator),
			allowPositionals: true,
			options: Object.fromEntries(
				['directory', 'input', 'actor', 'stage', 'operation', 'purpose', 'start', 'end'].map((name) => [
					name,
					{type: 'string'},
				]),
			),
		});
		if (!values.directory) throw new Error('--directory is required');
		if (positionals[0] === 'record')
			console.log(savePerformanceSpan(values.directory, JSON.parse(fs.readFileSync(values.input, 'utf8'))));
		else if (positionals[0] === 'report') {
			const spans = fs
				.readdirSync(values.directory)
				.filter((name) => name.endsWith('.json'))
				.map((name) => JSON.parse(fs.readFileSync(path.join(values.directory, name), 'utf8')));
			console.log(
				JSON.stringify(summarizePerformance(spans, {startedAt: values.start, finishedAt: values.end}), null, 2),
			);
		} else if (positionals[0] === 'run') {
			if (separator < 0 || !args[separator + 1]) throw new Error('run requires -- executable arguments');
			const span = {
				id: `span-${randomUUID()}`,
				actor: values.actor ?? 'parent',
				stage: values.stage,
				operation: values.operation,
				kind: 'process',
				purpose: values.purpose ?? 'execution',
				startedAt: new Date().toISOString(),
				finishedAt: null,
				outcome: 'incomplete',
				measurements: {},
				usage: null,
			};
			validatePerformanceSpan(span);
			process.exitCode = await runCommand(args.slice(separator + 1), values.directory, span);
		} else throw new Error('Expected record, report or run');
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
