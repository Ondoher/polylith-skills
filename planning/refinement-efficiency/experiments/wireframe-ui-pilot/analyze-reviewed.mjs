import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PilotAnalysis} from './analyze.mjs';

const elapsed = (a, b) => (a && b ? Date.parse(b) - Date.parse(a) : null);
const sum = (items, key) => items.reduce((total, item) => total + (item[key] ?? 0), 0);
const span = (start, end) => ({start: start ?? null, end: end ?? null, elapsedMs: elapsed(start, end)});

/** Analyze persisted reviewed-pipeline events without another model run. */
export function analyzeReviewed(attempt) {
	const events = fs.readFileSync(path.join(attempt, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
	const state = JSON.parse(fs.readFileSync(path.join(attempt, 'state.private.json')));
	const raw = PilotAnalysis._invocations({events, state});
	const aggregate = PilotAnalysis.summarize({events, state}).native;
	const invocations = raw.map((item) => {
		const observed = events.filter(
			(e) => e.at >= item.startedAt && e.at <= (item.endedAt ?? '') && e.role === item.role,
		);
		const phases = observed.filter((e) => e.type === 'phase').map(({at, phase}) => ({at, phase}));
		const inputReady = phases.find((e) => e.phase === 'inputs-ready')?.at;
		const submitted = events.find(
			(e) =>
				e.type === 'submitted' &&
				e.stage === item.role &&
				e.elementId === item.elementId &&
				e.at >= item.startedAt &&
				e.at <= (item.endedAt ?? ''),
		);
		const service = observed.filter((e) => e.type === 'service');
		const completed = events.find((e) => e.type === 'native.completed' && e.resultPath === item.resultPath);
		const started = events.find((e) => e.type === 'native.started' && e.resultPath === item.resultPath);
		const assignment = events
			.filter(
				(e) =>
					['author-start', 'repair-start'].includes(e.type) && e.role === item.role && e.at <= item.startedAt,
			)
			.at(-1);
		const inspectionWindows = [];
		let inspectionStart;
		for (const phase of phases) {
			if (phase.phase === 'inspection-start') inspectionStart = phase.at;
			if (phase.phase === 'inspection-end' && inspectionStart) {
				inspectionWindows.push(span(inspectionStart, phase.at));
				inspectionStart = null;
			}
		}
		if (inspectionStart) inspectionWindows.push(span(inspectionStart, null));
		return {
			role: item.role,
			category: item.role.endsWith('review') ? 'review' : (assignment?.type ?? 'unknown'),
			elementId: item.elementId,
			status: item.status,
			window: span(item.startedAt, item.endedAt),
			coordinatorRun: item.coordinatorRun,
			model: started?.model ?? null,
			effort: started?.effort ?? null,
			subsets: {
				throughInputsReady: span(item.startedAt, inputReady),
				afterInputsThroughSubmission: span(inputReady, submitted?.at),
			},
			phases,
			inspectionWindows,
			serviceCalls: service.length,
			failedServiceCalls: service.filter((e) => e.failed).length,
			serviceMs: sum(service, 'elapsedMs'),
			maxServiceMs: service.length ? Math.max(...service.map((e) => e.elapsedMs ?? 0)) : null,
			inputBytes: sum(service, 'inputBytes'),
			returnedTextBytes: sum(service, 'textBytes'),
			serviceOperations: Object.fromEntries(
				[...new Set(service.map((e) => e.operation ?? e.method))].map((name) => {
					const calls = service.filter((e) => (e.operation ?? e.method) === name);
					return [name, {calls: calls.length, elapsedMs: sum(calls, 'elapsedMs')}];
				}),
			),
			usageSnapshot: completed?.usage ?? null,
			result: item.resultPath ? path.relative(attempt, item.resultPath).replaceAll('\\', '/') : null,
		};
	});
	const ids = [...new Set(events.filter((e) => e.elementId).map((e) => e.elementId))];
	const elements = ids.map((id) => {
		const own = events.filter((e) => e.elementId === id);
		const summarizeStage = (stage) => {
			const previews = own.filter((e) => e.type === 'draft-preview' && e.stage === stage);
			const submissions = own.filter((e) => e.type === 'submitted' && e.stage === stage);
			const reviews = own.filter(
				(e) =>
					e.type === 'review-ready' &&
					e.role === (stage === 'wireframe' ? 'wireframe-review' : 'visual-review'),
			);
			return {
				contributions: own
					.filter((e) => e.type === 'contribution' && (e.stage ?? e.role) === stage)
					.map(({at, revision}) => ({at, revision})),
				previews: previews.map(
					({at, revision, renderMs, sceneCount, partCount, errors, unrepresentedActions}) => ({
						at,
						revision,
						renderMs,
						sceneCount,
						partCount,
						errors: errors ?? null,
						unrepresentedActions: unrepresentedActions ?? null,
					}),
				),
				submissions: submissions.map(({at, revision, binding}) => ({at, revision, binding})),
				reviews: reviews.map(({at, revision, verdict, findings}) => ({at, revision, verdict, findings})),
				firstPreviewThroughFirstSubmission: span(previews[0]?.at, submissions[0]?.at),
				localPreviewsBeforeFirstSubmission: previews.filter((e) => e.at < submissions[0]?.at).length,
				acceptedRevision: reviews.filter((e) => e.verdict === 'pass').at(-1)?.revision ?? null,
			};
		};
		const firstAuthor = invocations.find(
			(e) => e.elementId === id && e.role === 'wireframe' && e.status === 'completed',
		);
		const accepted = own.find((e) => e.type === 'element-accepted');
		const latestAccepted = own.filter((e) => e.type === 'element-accepted').at(-1);
		const gateEvidence = own
			.filter((e) => e.type === 'ui-dispatch')
			.map((dispatch) => {
				const submitted = own
					.filter((e) => e.type === 'submitted' && e.stage === 'wireframe' && e.at <= dispatch.at)
					.at(-1);
				const review = own
					.filter(
						(e) =>
							e.type === 'review-ready' &&
							e.role === 'wireframe-review' &&
							e.revision === dispatch.wireframeRevision &&
							e.at <= dispatch.at,
					)
					.at(-1);
				const reviewReceipt =
					review?.path && fs.existsSync(review.path) ? JSON.parse(fs.readFileSync(review.path)) : review;
				return {
					at: dispatch.at,
					wireframeRevision: dispatch.wireframeRevision,
					submittedAt: submitted?.at ?? null,
					passAt: review?.verdict === 'pass' ? review.at : null,
					valid: Boolean(
						submitted?.revision === dispatch.wireframeRevision &&
						review?.verdict === 'pass' &&
						submitted.binding &&
						JSON.stringify(submitted.binding) === JSON.stringify(reviewReceipt?.binding),
					),
				};
			});
		return {
			id,
			wireframe: summarizeStage('wireframe'),
			ui: summarizeStage('ui'),
			firstAuthorThroughAcceptance: span(firstAuthor?.window.start, accepted?.at),
			firstAuthorThroughLatestAcceptance: span(firstAuthor?.window.start, latestAccepted?.at),
			reused: own.filter((e) => e.type === 'accepted-output-reused'),
			bindingRefreshes: own.filter((e) => e.type === 'binding-refresh'),
			uiDispatches: own.filter((e) => e.type === 'ui-dispatch'),
			gateEvidence,
			unresolved: state.unresolvedReviews?.filter((e) => e.elementId === id) ?? [],
		};
	});
	const runs = [];
	let start;
	for (const event of events) {
		if (event.type === 'run-start') start = event;
		if (event.type === 'run-end')
			runs.push({
				...span(start?.at, event.at),
				status: event.status,
				protectedUnchanged: event.protectedUnchanged,
			});
	}
	return {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		status: state.status,
		completedProcessWindows: {allRolesUnionMs: aggregate.wallUnionMs, authorsUnionMs: aggregate.authorWallUnionMs},
		limits: [
			'Role intervals overlap; do not sum them as elapsed time.',
			'Input and authoring windows are subsets of each invocation.',
			'Native execution supplies no output-stream/command-generation or pure reasoning durations.',
			'Usage snapshots may be cumulative; no additive token or credit claim.',
			'Byte counts cover recorded input payloads and returned text fields, not complete MCP transport bytes.',
			'Latest acceptance can include renderer refresh or later reuse; first acceptance is reported separately.',
			'Source UX remains unreviewed.',
		],
		runs,
		invocations,
		elements,
		packets: events.filter((e) => e.type === 'packet-prepared'),
		serviceRuns: fs
			.readdirSync(attempt)
			.filter((name) => /^service-metrics-\d+\.json$/.test(name))
			.sort()
			.map((file) => {
				const measured = JSON.parse(fs.readFileSync(path.join(attempt, file)));
				return {file, operations: measured.operations, http: measured.http};
			}),
		layoutChecks: events.filter((e) => e.type === 'layout-check'),
		screenshots: events.filter((e) => e.type === 'screenshot'),
		invalidUiDispatches: elements.flatMap((e) => e.gateEvidence).filter((e) => !e.valid).length,
		protectedUnchanged: state.protectedUnchanged,
	};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [attempt, output] = process.argv.slice(2);
	if (!attempt || !output) throw new Error('Usage: analyze-reviewed.mjs <attempt> <metrics.json>');
	const metrics = analyzeReviewed(path.resolve(attempt));
	fs.writeFileSync(output, JSON.stringify(metrics, null, 2) + '\n');
	console.log(
		JSON.stringify({
			output,
			status: metrics.status,
			elements: metrics.elements.length,
			invocations: metrics.invocations.length,
		}),
	);
}
