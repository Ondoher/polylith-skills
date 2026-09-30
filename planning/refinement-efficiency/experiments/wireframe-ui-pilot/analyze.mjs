import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/**
 * Called by analysis to accept persisted UTC timestamps, never per-process monotonic clocks.
 *
 * @param {string} value - Persisted timestamp.
 * @returns {number | null} - Epoch milliseconds when valid.
 */
function timestamp(value) {
	const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Called by analysis to retain the exact endpoints of an observed interval.
 *
 * @param {string} startedAt - Observed start.
 * @param {string} endedAt - Observed end.
 * @returns {PilotMeasuredInterval | null} - Nonnegative measured interval, or unavailable.
 */
function interval(startedAt, endedAt) {
	const start = timestamp(startedAt);
	const end = timestamp(endedAt);
	return start !== null && end !== null && end >= start ? {startedAt, endedAt, elapsedMs: end - start} : null;
}

/**
 * Called by analysis to merge measured windows without adding overlapping elapsed time.
 *
 * @param {PilotMeasuredInterval[]} intervals - Observed windows.
 * @returns {number[][]} - Disjoint epoch-millisecond windows.
 */
function union(intervals) {
	const result = [];
	const ordered = intervals.filter(Boolean).map((entry) => [timestamp(entry.startedAt), timestamp(entry.endedAt)]);
	ordered.sort((left, right) => left[0] - right[0]);
	for (const [start, end] of ordered) {
		const last = result.at(-1);
		if (last && start <= last[1]) last[1] = Math.max(last[1], end);
		else result.push([start, end]);
	}
	return result;
}

/**
 * Called by analysis to intersect disjoint wall-clock windows.
 *
 * @param {number[][]} left - First set of merged windows.
 * @param {number[][]} right - Second set of merged windows.
 * @returns {number[][]} - Exact shared windows.
 */
function intersection(left, right) {
	const result = [];
	for (const first of left)
		for (const second of right) {
			const start = Math.max(first[0], second[0]);
			const end = Math.min(first[1], second[1]);
			if (end > start) result.push([start, end]);
		}
	return result;
}

/**
 * Called by analysis to total already disjoint windows.
 *
 * @param {number[][]} windows - Non-overlapping measured windows.
 * @returns {number} - Total wall time in milliseconds.
 */
function duration(windows) {
	return windows.reduce((total, [start, end]) => total + end - start, 0);
}

/**
 * Called by analysis to retain native usage snapshots without assuming additive accounting.
 *
 * @param {PilotEvidenceRecord[]} turns - Completed native turns.
 * @returns {PilotUsageSummary} - Invocation snapshots and explicit consumption uncertainty.
 */
function usage(turns) {
	const snapshots = [];
	for (const turn of turns) {
		if (!turn.usage || typeof turn.usage !== 'object') continue;
		const counters = Object.fromEntries(
			Object.entries(turn.usage).filter(([, value]) => Number.isFinite(value) && value >= 0),
		);
		if (!Object.keys(counters).length) continue;
		snapshots.push({
			threadId: turn.threadId ?? null,
			startedAt: turn.interval?.startedAt ?? null,
			endedAt: turn.interval?.endedAt ?? null,
			counters,
		});
	}
	return {
		reportedTurns: snapshots.length,
		unavailableTurns: turns.length - snapshots.length,
		snapshots,
		totalConsumption: null,
		accounting:
			'unverified: reported values may be cumulative thread snapshots; neither totals nor invocation deltas are derived',
	};
}

/**
 * Called by analysis to keep preview identities while excluding full authored documents.
 *
 * @param {PilotEvidenceRecord} event - Persisted ready-preview event.
 * @returns {PilotEvidenceRecord} - Compact exact-version preview evidence.
 */
function preview(event) {
	return {
		at: event.at,
		revision: event.revision,
		sceneCount: event.sceneCount ?? null,
		renderMs: event.renderMs ?? null,
	};
}

/** Persisted pilot evidence analysis; no model calls or source-product mutations. */
export const PilotAnalysis = {
	/**
	 * Called by summarize to retain successful, unsuccessful and unclosed native invocations.
	 * Coordinator boundaries limit attribution but never stand in for a missing process exit.
	 *
	 * @param {PilotAnalysisInput} input - Persisted events and native completion state.
	 * @returns {PilotEvidenceRecord[]} - Invocation outcomes with measured or explicitly missing exits.
	 */
	_invocations({events, state}) {
		const records = new Map();
		const active = new Map();
		const elements = new Map();
		let coordinatorRun = 0;
		for (const event of events) {
			if (['run-start', 'run-end'].includes(event.type)) {
				for (const record of active.values()) {
					record.status = event.type === 'run-start' ? 'unclosed-at-restart' : 'unclosed-at-coordinator-end';
					record.boundaryAt = event.at;
				}
				active.clear();
				elements.clear();
				if (event.type === 'run-start') coordinatorRun++;
			}
			if (event.type === 'ui-dispatch') elements.set('ui', event.elementId);
			if (['phase', 'repair-start'].includes(event.type) && event.elementId)
				elements.set(event.role, event.elementId);
			if (event.type === 'native.started') {
				const record = {
					role: event.role,
					elementId: event.elementId ?? elements.get(event.role) ?? null,
					resultPath: event.resultPath ?? null,
					threadId: event.threadId ?? null,
					startedAt: event.startedAt ?? event.at,
					endedAt: null,
					interval: null,
					completed: false,
					status: 'open',
					boundaryAt: null,
					coordinatorRun,
				};
				records.set(event.resultPath ?? `${event.role}:${record.startedAt}`, record);
				active.set(event.role, record);
			}
			if (event.type === 'review-ready' && active.has(event.role))
				active.get(event.role).elementId = event.elementId;
			if (event.type === 'native.completed') {
				const key = event.resultPath ?? `${event.role}:${event.startedAt}`;
				const record = records.get(key) ?? {
					role: event.role,
					elementId: event.elementId ?? null,
					resultPath: event.resultPath ?? null,
					coordinatorRun,
				};
				Object.assign(record, {
					threadId: event.threadId ?? null,
					startedAt: event.startedAt,
					endedAt: event.endedAt ?? null,
					interval: interval(event.startedAt, event.endedAt),
					completed: event.completed === true && event.exitCode === 0,
					status: event.completed === true && event.exitCode === 0 ? 'completed' : 'unsuccessful',
					exitCode: event.exitCode ?? null,
				});
				records.set(key, record);
				if (active.get(event.role) === record) active.delete(event.role);
				elements.delete(event.role);
			}
		}
		for (const record of state.clients ?? []) {
			const key = record.resultPath ?? `${record.role}:${record.startedAt}`;
			if (!records.has(key))
				records.set(key, {
					role: record.role,
					elementId: null,
					resultPath: record.resultPath ?? null,
					threadId: record.threadId ?? null,
					startedAt: record.startedAt,
					endedAt: record.endedAt ?? null,
					interval: interval(record.startedAt, record.endedAt),
					completed: record.exitCode === 0 && Boolean(record.threadId),
					status: record.exitCode === 0 && record.threadId ? 'completed' : 'unsuccessful',
					exitCode: record.exitCode ?? null,
					coordinatorRun: null,
				});
		}
		return [...records.values()];
	},

	/**
	 * Called by summarize to deduplicate event and state copies of native completions.
	 *
	 * @param {PilotAnalysisInput} input - Saved event and state evidence.
	 * @returns {PilotEvidenceRecord[]} - Completed native turns with exact timing and reported usage.
	 */
	_turns({events, state}) {
		const records = new Map();
		for (const record of events.filter((event) => event.type === 'native.completed')) {
			const key = record.resultPath ?? `${record.role}:${record.startedAt}:${record.endedAt}`;
			records.set(key, {...record, evidence: 'native.completed'});
		}
		for (const record of state.clients ?? []) {
			const key = record.resultPath ?? `${record.role}:${record.startedAt}:${record.endedAt}`;
			if (!records.has(key))
				records.set(key, {
					...record,
					completed: record.exitCode === 0 && Boolean(record.threadId),
					evidence: 'state.clients',
				});
		}
		return [...records.values()]
			.filter((record) => record.completed === true && record.exitCode === 0)
			.map((record) => {
				const start = events.find(
					(event) =>
						event.type === 'native.started' &&
						event.role === record.role &&
						event.resultPath === record.resultPath,
				);
				return {
					role: record.role,
					threadId: record.threadId,
					resultPath: record.resultPath,
					evidence: record.evidence,
					interval: interval(record.startedAt, record.endedAt),
					reportedProcessMs: Number.isFinite(record.elapsedMs) ? record.elapsedMs : null,
					requestedModel: start?.model ?? null,
					requestedEffort: start?.effort ?? null,
					runtime: record.runtime ?? null,
					usage: record.usage ?? null,
				};
			});
	},

	/**
	 * Called by summarize to associate unique native tool items with explicit role context.
	 * Service events have no role or element identity and remain unattributed.
	 *
	 * @param {PilotEvidenceRecord[]} events - Chronologically ordered persisted events.
	 * @returns {PilotEvidenceRecord} - Contextual phase events and unique observed native tool calls.
	 */
	_context(events) {
		const elements = new Map();
		const invocations = new Map();
		const calls = new Map();
		const phases = [];
		const repairs = new Set();
		for (const event of events) {
			if (event.type === 'run-start') {
				elements.clear();
				repairs.clear();
			}
			if (event.type === 'ui-dispatch') elements.set('ui', event.elementId);
			if (event.type === 'repair-start') {
				elements.set(event.role, event.elementId);
				repairs.add(event.elementId);
			}
			if (event.type === 'repair-end') repairs.delete(event.elementId);
			if (event.type === 'native.started') invocations.set(event.role, (invocations.get(event.role) ?? 0) + 1);
			if (event.type === 'phase') {
				if (event.elementId) elements.set(event.role, event.elementId);
				phases.push({...event, elementId: event.elementId ?? elements.get(event.role) ?? null});
			}
			if (
				event.type === 'native.event' &&
				event.itemId &&
				(event.toolName ||
					['mcp_tool_call', 'command_execution', 'web_search', 'tool_call', 'image_view'].includes(
						event.itemType,
					))
			) {
				const key = `${event.role}:${invocations.get(event.role) ?? 0}:${event.itemId}`;
				if (!calls.has(key))
					calls.set(key, {
						role: event.role,
						elementId: event.elementId ?? elements.get(event.role) ?? null,
						itemId: event.itemId,
						toolName: event.toolName ?? event.itemType,
						server: event.server ?? null,
						rework: repairs.has(event.elementId ?? elements.get(event.role)),
					});
				const call = calls.get(key);
				if (event.nativeType === 'item.started') call.startedAt = event.at;
				if (event.nativeType === 'item.completed') call.endedAt = event.at;
			}
			if (event.type === 'native.completed') elements.delete(event.role);
		}
		return {
			phases,
			calls: [...calls.values()].map((call) => ({...call, interval: interval(call.startedAt, call.endedAt)})),
		};
	},

	/**
	 * Called by summarize to preserve every exact-version review and explicit repair window.
	 *
	 * @param {PilotAnalysisInput} input - Saved review and event evidence.
	 * @param {string} elementId - An affected element identity.
	 * @param {PilotEvidenceRecord[]} invocations - Native process outcomes, including interrupted and open calls.
	 * @returns {PilotEvidenceRecord} - Independent review rounds and repair intervals.
	 */
	_reviews({events, state}, elementId, invocations) {
		const rounds = [];
		for (const event of events.filter((item) => item.type === 'review-ready' && item.elementId === elementId)) {
			const saved = (state.reviews ?? []).find(
				(item) => item.elementId === elementId && item.role === event.role && item.revision === event.revision,
			);
			const invocation = invocations.findLast(
				(record) =>
					record.role === event.role &&
					record.startedAt <= event.at &&
					(!record.endedAt || event.at <= record.endedAt) &&
					(!record.boundaryAt || event.at < record.boundaryAt) &&
					(!record.elementId || record.elementId === elementId),
			);
			const coordinatorStart = events.findLast((item) => item.type === 'run-start' && item.at <= event.at);
			const started = events.findLast(
				(item) =>
					item.type === 'phase' &&
					item.phase === 'review-start' &&
					item.role === event.role &&
					item.at <= event.at &&
					(!invocation || item.at >= invocation.startedAt) &&
					(!coordinatorStart || item.at >= coordinatorStart.at) &&
					(!item.elementId || item.elementId === elementId),
			);
			const previousReady = events.findLast(
				(item) => item.type === 'review-ready' && item.role === event.role && item.at < event.at,
			);
			const observedIndex = rounds.filter((item) => item.role === event.role).length;
			const phaseInterval =
				started && (!previousReady || started.at > previousReady.at) ? interval(started.at, event.at) : null;
			rounds.push({
				evidence: 'review-ready',
				role: event.role,
				revision: event.revision,
				round: saved?.round ?? observedIndex,
				observedIndex,
				kind: observedIndex === 0 ? 'first-review' : 'rereview',
				verdict: event.verdict,
				findings: Array.isArray(event.findings) ? event.findings.length : null,
				at: event.at,
				interval: phaseInterval,
				nativeInterval: invocation?.interval ?? null,
				nativeLaunchToReviewSaved: interval(invocation?.startedAt, event.at),
				nativeStatus: invocation?.status ?? 'unavailable',
				wallTimeBasis: invocation?.interval
					? 'native-invocation'
					: invocation
						? 'native-launch-to-review-saved'
						: phaseInterval
							? 'phase-markers'
							: 'unavailable',
			});
		}
		for (const saved of state.reviews ?? [])
			if (
				saved.elementId === elementId &&
				!rounds.some((item) => item.role === saved.role && item.revision === saved.revision)
			)
				rounds.push({
					...saved,
					evidence: 'state-only',
					kind: rounds.some((item) => item.role === saved.role) ? 'rereview' : 'first-review',
					interval: null,
					nativeInterval: null,
					nativeLaunchToReviewSaved: null,
					nativeStatus: 'unavailable',
					wallTimeBasis: 'unavailable',
					at: null,
					findings: null,
				});
		const reused = events
			.filter((event) => event.type === 'review-reused' && event.elementId === elementId)
			.map((event) => ({at: event.at, role: event.role, revision: event.revision, verdict: event.verdict}));
		const repairs = [];
		const pending = new Map();
		for (const event of events) {
			if (['run-start', 'run-end'].includes(event.type)) {
				for (const record of pending.values()) {
					record.status = event.type === 'run-start' ? 'unclosed-at-restart' : 'unclosed-at-coordinator-end';
					record.boundaryAt = event.at;
				}
				pending.clear();
			}
			if (event.elementId !== elementId) continue;
			if (event.type === 'repair-start') {
				const previous = pending.get(event.role);
				if (previous) {
					previous.status = 'unclosed-at-next-repair';
					previous.boundaryAt = event.at;
				}
				const record = {
					role: event.role,
					startedAt: event.at,
					endedAt: null,
					interval: null,
					status: 'open',
					interrupted: false,
					boundaryAt: null,
				};
				repairs.push(record);
				pending.set(event.role, record);
			}
			if (event.type === 'repair-end' && pending.has(event.role)) {
				const record = pending.get(event.role);
				record.endedAt = event.at;
				record.interval = interval(record.startedAt, event.at);
				record.interrupted = event.interrupted === true;
				record.status = record.interrupted ? 'interrupted' : 'completed';
				pending.delete(event.role);
			}
		}
		for (const repair of repairs) {
			const ending = repair.endedAt ?? repair.boundaryAt;
			const authors = invocations.filter(
				(record) =>
					['wireframe', 'ui'].includes(record.role) &&
					record.startedAt >= repair.startedAt &&
					(!ending || record.startedAt < ending) &&
					(!record.elementId || record.elementId === elementId),
			);
			repair.nativeAuthors = Object.fromEntries(
				['wireframe', 'ui'].map((role) => {
					const selected = authors.filter((record) => record.role === role);
					return [
						role,
						{
							invocations: selected,
							completedWallUnionMs: duration(
								union(selected.filter((record) => record.completed).map((record) => record.interval)),
							),
							unsuccessfulWallUnionMs: duration(
								union(
									selected
										.filter((record) => record.status === 'unsuccessful')
										.map((record) => record.interval),
								),
							),
							unclosedInvocations: selected.filter((record) => !record.interval).length,
						},
					];
				}),
			);
		}
		return {
			rounds,
			reused,
			freshReviewCount: rounds.filter((record) => record.evidence === 'review-ready').length,
			repairs,
			repairWallUnionMs: duration(
				union(repairs.filter((record) => record.status === 'completed').map((item) => item.interval)),
			),
			interruptedRepairWallUnionMs: duration(
				union(repairs.filter((record) => record.interrupted).map((item) => item.interval)),
			),
		};
	},

	/**
	 * Call this method to calculate observed measurements from saved pilot evidence.
	 * Missing markers and failed launches stay unavailable; no residual time is labeled reasoning.
	 *
	 * @param {PilotAnalysisInput} input - Events, state, frozen-input manifest and affected scope.
	 * @returns {PilotEvidenceRecord} - Metrics with separated first-pass, native, review and local work.
	 */
	summarize({events = [], state = {}, manifest = {}, scope = {}}) {
		assert(Array.isArray(events), 'Events must be an array');
		const invalidTimestampCount = events.filter((event) => timestamp(event.at) === null).length;
		events = events
			.filter((event) => timestamp(event.at) !== null)
			.sort((left, right) => timestamp(left.at) - timestamp(right.at));
		const input = {events, state, manifest, scope};
		const turns = this._turns(input);
		const invocations = this._invocations(input);
		const context = this._context(events);
		const authorTurns = turns.filter((turn) => ['wireframe', 'ui'].includes(turn.role));
		const authorWindows = union(authorTurns.map((turn) => turn.interval));
		const roleTotals = Object.fromEntries(
			[...new Set(turns.map((turn) => turn.role))].map((role) => {
				const selected = turns.filter((turn) => turn.role === role);
				return [
					role,
					{
						completedTurns: selected.length,
						wallUnionMs: duration(union(selected.map((turn) => turn.interval))),
						usage: usage(selected),
					},
				];
			}),
		);
		const ids = new Set((scope.elements ?? []).map((element) => element.id));
		for (const event of events) if (event.elementId) ids.add(event.elementId);
		const elements = [...ids].map((elementId) => {
			const selected = (scope.elements ?? []).find((element) => element.id === elementId);
			const elementEvents = events.filter((event) => event.elementId === elementId);
			const reviews = this._reviews(input, elementId, invocations);
			const firstReview = elementEvents.find(
				(event) => event.type === 'review-ready' || event.type === 'repair-start',
			);
			const stages = {};
			for (const stage of ['wireframe', 'ui']) {
				const ready = elementEvents.filter((event) => event.type === 'preview-ready' && event.stage === stage);
				const started = context.phases.find(
					(event) =>
						event.elementId === elementId && event.phase === `${stage}-start` && event.role === stage,
				);
				const contributions = elementEvents.filter(
					(event) => ['contribution', 'preview-ready'].includes(event.type) && event.stage === stage,
				);
				const initial = contributions.filter((event) => !firstReview || event.at < firstReview.at);
				const calls = context.calls.filter((call) => call.elementId === elementId && call.role === stage);
				const serviceCalls = elementEvents.filter((event) => event.type === 'service' && event.role === stage);
				const reads = serviceCalls.filter((event) => event.method === 'read');
				const contributionBytes = (records) =>
					records.every((event) => Number.isFinite(event.inputBytes))
						? records.reduce((total, event) => total + event.inputBytes, 0)
						: null;
				const measured = interval(started?.at, ready[0]?.at);
				const nativeTurn = turns.find(
					(turn) =>
						turn.role === stage &&
						turn.interval &&
						started &&
						started.at >= turn.interval.startedAt &&
						started.at <= turn.interval.endedAt,
				);
				const inputsReady = context.phases.find(
					(event) =>
						event.role === stage &&
						event.elementId === elementId &&
						event.phase === 'inputs-ready' &&
						started &&
						event.at >= started.at &&
						ready[0] &&
						event.at <= ready[0].at,
				);
				const completedRoleWindows = union(
					turns.filter((turn) => turn.role === stage).map((turn) => turn.interval),
				);
				const coveredMs = measured ? duration(intersection(union([measured]), completedRoleWindows)) : null;
				stages[stage] = {
					startedAt: started?.at ?? null,
					nativeLaunchToStart: interval(nativeTurn?.interval.startedAt, started?.at),
					nestedInputCollection: interval(started?.at, inputsReady?.at),
					firstReady: ready[0] ? preview(ready[0]) : null,
					latestReady: ready.at(-1) ? preview(ready.at(-1)) : null,
					readyHistory: ready.map(preview),
					firstPreviewInterval:
						measured && completedRoleWindows.length > 0 && coveredMs === measured.elapsedMs
							? measured
							: null,
					contributionCalls: contributions.length,
					contributionInputBytes: contributionBytes(contributions),
					initialContributionCalls: initial.length,
					initialContributionInputBytes: contributionBytes(initial),
					reviewAndReworkContributionCalls: contributions.length - initial.length,
					reviewAndReworkContributionInputBytes: contributionBytes(
						contributions.filter((event) => !initial.includes(event)),
					),
					nativeToolCalls: calls.length,
					reworkNativeToolCalls: calls.filter((call) => call.rework).length,
					attributedServiceCalls: serviceCalls.length,
					readBytes:
						reads.length > 0 && reads.every((event) => Number.isFinite(event.textBytes))
							? reads.reduce((total, event) => total + event.textBytes, 0)
							: null,
					readByteAttributionComplete:
						events.some((event) => event.type === 'service' && event.method === 'read') &&
						!events.some(
							(event) =>
								event.type === 'service' &&
								event.method === 'read' &&
								(!event.role || !event.elementId),
						),
				};
			}
			const dispatch = elementEvents.find((event) => event.type === 'ui-dispatch');
			return {
				elementId,
				title: selected?.title ?? elementId,
				disposition: selected?.disposition ?? 'unavailable',
				sourceFlowRefs: selected?.sourceFlowRefs ?? [],
				requiredSceneCount: Array.isArray(selected?.requiredStates) ? selected.requiredStates.length : null,
				...stages,
				queueToDispatch: interval(stages.wireframe.firstReady?.at, dispatch?.at),
				queueToUiNativeLaunch: interval(
					stages.wireframe.firstReady?.at,
					stages.ui.nativeLaunchToStart?.startedAt,
				),
				queueToUiStart: interval(stages.wireframe.firstReady?.at, stages.ui.startedAt),
				reviews,
			};
		});
		const wireframeWork = union(elements.map((element) => element.wireframe.firstPreviewInterval));
		const uiWork = union(elements.map((element) => element.ui.firstPreviewInterval));
		const overlapWindows = intersection(wireframeWork, uiWork);
		const initialWork = union(
			elements.flatMap((element) => [element.wireframe.firstPreviewInterval, element.ui.firstPreviewInterval]),
		);
		const interElementGaps = [];
		for (const role of ['wireframe', 'ui']) {
			const ordered = elements
				.filter((element) => element[role].startedAt)
				.sort((left, right) => left[role].startedAt.localeCompare(right[role].startedAt));
			for (let index = 1; index < ordered.length; index++) {
				const previous = ordered[index - 1];
				const next = ordered[index];
				const gap = interval(previous[role].firstReady?.at, next[role].startedAt);
				if (gap)
					interElementGaps.push({
						role,
						fromElementId: previous.elementId,
						toElementId: next.elementId,
						interval: gap,
						cause: 'unclassified',
					});
			}
		}
		const updated = elements.filter((element) => element.disposition === 'update');
		const allUiReady = updated.length > 0 && updated.every((element) => element.ui.firstPreviewInterval);
		const firstAuthorAt = authorWindows.length ? new Date(authorWindows[0][0]).toISOString() : null;
		const firstAllUiReadyAt = allUiReady
			? updated
					.map((element) => element.ui.firstReady.at)
					.sort()
					.at(-1)
			: null;
		const inputIntervals = {};
		for (const role of ['wireframe', 'ui']) {
			const firstTurn = authorTurns
				.filter((turn) => turn.role === role && turn.interval)
				.sort((left, right) => left.interval.startedAt.localeCompare(right.interval.startedAt))[0];
			const inputsReady = context.phases.find(
				(event) => event.role === role && event.phase === 'inputs-ready' && !event.elementId,
			);
			inputIntervals[role] = interval(firstTurn?.interval.startedAt, inputsReady?.at);
		}
		const boundaryStart = context.phases.find(
			(event) => event.role === 'wireframe' && event.phase === 'boundaries-start',
		);
		const scopeReady = events.find((event) => event.type === 'scope-ready');
		const uiWarmup = authorTurns.find(
			(turn) =>
				turn.role === 'ui' &&
				turn.interval &&
				context.phases.some(
					(event) =>
						event.role === 'ui' &&
						event.phase === 'inputs-ready' &&
						!event.elementId &&
						event.at >= turn.interval.startedAt &&
						event.at <= turn.interval.endedAt,
				),
		);
		const firstWireframeReadyAt = elements
			.map((element) => element.wireframe.firstReady?.at)
			.filter(Boolean)
			.sort()[0];
		const setup = events
			.filter((event) => event.type === 'run-start')
			.map((start) => {
				const position = events.indexOf(start);
				const next = events.slice(position + 1).findIndex((event) => event.type === 'run-start');
				const segment = events.slice(position, next < 0 ? undefined : position + 1 + next);
				const end =
					segment.find((event) => event.type === 'native.started') ??
					segment.find((event) => event.type === 'run-end');
				return {
					execute: start.execute ?? null,
					reviewOnly: start.reviewOnly ?? null,
					interval: interval(start.at, end?.at),
				};
			});
		const services = events.filter((event) => event.type === 'service');
		const firstModelTime = authorWindows[0]?.[0];
		const nativeStarts = events.filter((event) => event.type === 'native.started');
		return {
			schemaVersion: 'wireframe-ui-pilot-metrics-1',
			status: state.status ?? 'unavailable',
			source: {
				approval: manifest.approval ?? 'unavailable',
				binding: manifest.sourceBinding ?? null,
				changedFlows: manifest.changedFlows ?? [],
				changedActions: manifest.changedActions ?? [],
				changedFrames: manifest.changedFrames ?? [],
				contextBytes: manifest.contextBytes ?? null,
				designBytes: manifest.designBytes ?? null,
				protectedUnchanged: state.protectedUnchanged ?? null,
			},
			availability: {
				completedModelTurns: turns.length,
				modelResults: turns.length ? 'available' : 'unavailable: no completed native model turn',
				invalidTimestampEvents: invalidTimestampCount,
				perElementReadBytes: services.some(
					(event) => event.method === 'read' && (!event.role || !event.elementId),
				)
					? 'partial or unavailable: some service events do not carry role and element identity'
					: services.some((event) => event.method === 'read')
						? 'available for explicitly identified service reads'
						: 'unavailable: no service read evidence',
				unattributedElapsed: 'not classified as reasoning',
			},
			local: {
				preparationMs: manifest.preparationMs ?? null,
				setup,
				failedOrIncompleteLaunches: Math.max(0, nativeStarts.length - turns.length),
			},
			shared: {
				inputIntervals,
				uiWarmupNativeInterval: uiWarmup?.interval ?? null,
				firstWireframeReadyUntilUiWarmupCompleteMs:
					uiWarmup && firstWireframeReadyAt
						? Math.max(0, timestamp(uiWarmup.interval.endedAt) - timestamp(firstWireframeReadyAt))
						: null,
				boundarySelection: authorTurns.some((turn) => turn.role === 'wireframe')
					? interval(boundaryStart?.at, scopeReady?.at)
					: null,
			},
			native: {
				invocations,
				completedTurns: turns.length,
				completedAuthorTurns: authorTurns.length,
				wallUnionMs: duration(union(turns.map((turn) => turn.interval))),
				authorWallUnionMs: duration(authorWindows),
				roles: roleTotals,
				turns,
			},
			firstPass: {
				selectedUpdateElements: updated.length,
				completedElements: updated.filter((element) => element.ui.firstPreviewInterval).length,
				firstAuthorAt,
				firstAllUiReadyAt,
				authorStartToAllUiReady: interval(firstAuthorAt, firstAllUiReadyAt),
				authorStartToHappyPathComplete: interval(firstAuthorAt, state.happyPathCompletedAt),
				wireframeWorkMs: wireframeWork.length ? duration(wireframeWork) : null,
				uiWorkMs: uiWork.length ? duration(uiWork) : null,
				workWallUnionMs: initialWork.length ? duration(initialWork) : null,
				interElementGaps,
				overlapMs: wireframeWork.length && uiWork.length ? duration(overlapWindows) : null,
				overlapWindows: overlapWindows.map(([start, end]) =>
					interval(new Date(start).toISOString(), new Date(end).toISOString()),
				),
			},
			elements,
			tools: {
				calls: context.calls,
				observedCalls: context.calls.length,
				unattributedCalls: context.calls.filter((call) => !call.elementId).length,
			},
			service: {
				observedCalls: services.length,
				failedCalls: services.filter((event) => event.failed).length,
				coordinatorCallsBeforeFirstCompletedAuthor: services.filter(
					(event) => firstModelTime === undefined || timestamp(event.at) < firstModelTime,
				).length,
				inputBytes: services.reduce((total, event) => total + (event.inputBytes ?? 0), 0),
				readTextBytes: services
					.filter((event) => event.method === 'read')
					.reduce((total, event) => total + (event.textBytes ?? 0), 0),
				unattributedReadTextBytes: services
					.filter((event) => event.method === 'read' && (!event.role || !event.elementId))
					.reduce((total, event) => total + (event.textBytes ?? 0), 0),
				attribution: 'includes coordinator and model service traffic; not added to native tool-call totals',
			},
		};
	},

	/**
	 * Called by report to render only measured values and explicit unavailable markers.
	 *
	 * @param {PilotEvidenceRecord} metrics - Calculated persisted-evidence measurements.
	 * @returns {string} - Human-readable provisional report.
	 */
	_markdown(metrics) {
		const milliseconds = (value) =>
			value === null || value === undefined ? 'unavailable' : `${value.toLocaleString('en-US')} ms`;
		const lines = [
			'# Wireframe-to-UI pilot measurements',
			'',
			`Status: ${metrics.status}. Source UX: ${metrics.source.approval}. Results remain provisional.`,
			'',
			`Completed native model turns: ${metrics.native.completedTurns}. Completed first-pass elements: ${metrics.firstPass.completedElements}/${metrics.firstPass.selectedUpdateElements}.`,
			`Model results: ${metrics.availability.modelResults}.`,
			'',
			`First completed author start to all first UI previews: ${milliseconds(metrics.firstPass.authorStartToAllUiReady?.elapsedMs)}.`,
			`First completed author start to recorded happy-path completion: ${milliseconds(metrics.firstPass.authorStartToHappyPathComplete?.elapsedMs)}. Shared UI warm-up: ${milliseconds(metrics.shared.uiWarmupNativeInterval?.elapsedMs)}; first wireframe ready until warm-up completion: ${milliseconds(metrics.shared.firstWireframeReadyUntilUiWarmupCompleteMs)}.`,
			`Observed first-pass wireframe/UI overlap: ${milliseconds(metrics.firstPass.overlapMs)}. Active work union: ${milliseconds(metrics.firstPass.workWallUnionMs)}.`,
			`Completed native author process union: ${milliseconds(metrics.native.authorWallUnionMs)}. Local input preparation: ${milliseconds(metrics.local.preparationMs)}; excluded failed/incomplete launches: ${metrics.local.failedOrIncompleteLaunches}.`,
			'',
			'| Element | Required scenes | Wireframe to first preview | Ready to UI dispatch | Ready to UI start | UI to first preview | Contribution calls / bytes | Native tool calls | First → latest revisions (WF / UI) |',
			'| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
		];
		for (const element of metrics.elements) {
			const revisions = (stage) => `${stage.firstReady?.revision ?? '—'} → ${stage.latestReady?.revision ?? '—'}`;
			const bytes = [element.wireframe.contributionInputBytes, element.ui.contributionInputBytes];
			lines.push(
				`| ${element.elementId} | ${element.requiredSceneCount ?? 'unavailable'} | ${milliseconds(element.wireframe.firstPreviewInterval?.elapsedMs)} | ${milliseconds(element.queueToDispatch?.elapsedMs)} | ${milliseconds(element.queueToUiStart?.elapsedMs)} | ${milliseconds(element.ui.firstPreviewInterval?.elapsedMs)} | ${element.wireframe.contributionCalls + element.ui.contributionCalls} / ${bytes.every(Number.isFinite) ? bytes[0] + bytes[1] : 'unavailable'} | ${element.wireframe.nativeToolCalls + element.ui.nativeToolCalls} | ${revisions(element.wireframe)} / ${revisions(element.ui)} |`,
			);
		}
		lines.push('', 'Nested UI intervals and gaps outside the per-component work markers:', '');
		for (const element of metrics.elements.filter((item) => item.disposition === 'update'))
			lines.push(
				`- ${element.elementId}: wireframe ready to native UI launch ${milliseconds(element.queueToUiNativeLaunch?.elapsedMs)}; UI launch to ui-start ${milliseconds(element.ui.nativeLaunchToStart?.elapsedMs)}; ui-start to inputs-ready ${milliseconds(element.ui.nestedInputCollection?.elapsedMs)}. The last interval is nested within UI work.`,
			);
		for (const gap of metrics.firstPass.interElementGaps)
			lines.push(
				`- ${gap.role}, ${gap.fromElementId} ready to ${gap.toElementId} start: ${milliseconds(gap.interval.elapsedMs)}; cause unclassified.`,
			);
		lines.push(
			'',
			'Native role timings and usage snapshots are separate from component work intervals:',
			'',
			'| Role | Completed turns | Process wall union | Usage snapshots |',
			'| --- | ---: | ---: | --- |',
		);
		for (const [role, total] of Object.entries(metrics.native.roles))
			lines.push(
				`| ${role} | ${total.completedTurns} | ${milliseconds(total.wallUnionMs)} | ${total.usage.reportedTurns} recorded; total consumption unavailable |`,
			);
		lines.push('', 'Independent reviews and rework:', '');
		const reviewed = metrics.elements.filter(
			(element) =>
				element.reviews.rounds.length || element.reviews.repairs.length || element.reviews.reused.length,
		);
		if (!reviewed.length) lines.push('No recorded review rounds or repairs.');
		for (const element of reviewed) {
			for (const round of element.reviews.rounds)
				lines.push(
					`- ${element.elementId}: ${round.role}, ${round.kind}, revision ${round.revision}, ${round.verdict}; ${milliseconds((round.nativeInterval ?? round.nativeLaunchToReviewSaved ?? round.interval)?.elapsedMs)} (${round.wallTimeBasis}). Review phase markers: ${milliseconds(round.interval?.elapsedMs)}.`,
				);
			for (const repair of element.reviews.repairs)
				lines.push(
					`- ${element.elementId}: ${repair.role} repair ${repair.status}; coordinator window ${milliseconds(repair.interval?.elapsedMs)}. Completed native author time: wireframe ${milliseconds(repair.nativeAuthors.wireframe.completedWallUnionMs)}, UI ${milliseconds(repair.nativeAuthors.ui.completedWallUnionMs)}. Unsuccessful native time: wireframe ${milliseconds(repair.nativeAuthors.wireframe.unsuccessfulWallUnionMs)}, UI ${milliseconds(repair.nativeAuthors.ui.unsuccessfulWallUnionMs)}. Unclosed native invocations: ${repair.nativeAuthors.wireframe.unclosedInvocations + repair.nativeAuthors.ui.unclosedInvocations}.`,
				);
			if (element.reviews.reused.length)
				lines.push(
					`- ${element.elementId}: ${element.reviews.reused.length} saved review receipts reused; excluded from fresh review work.`,
				);
		}
		lines.push(
			'',
			'Measurement limits:',
			'',
			'- All intervals use persisted timestamps; monotonic counters from separate launches are not combined.',
			'- First-preview timing excludes later review and repair revisions. Native process windows, work windows, and service durations are not summed together.',
			'- Review wall times use recorded native invocation boundaries when available; missing review-start markers remain unavailable. Repair coordinator windows include propagation and cleanup, so they are not labeled author work. Restarts do not supply missing native exit timestamps.',
			'- Native usage is retained per invocation in metrics.json. Reported values may be cumulative thread snapshots; consumption totals and invocation deltas remain unavailable because accounting semantics are unverified.',
			'- Native tool calls are paired by item identity within each role invocation and assigned only through explicit element markers or UI dispatch.',
			`- Per-element read bytes: ${metrics.availability.perElementReadBytes}.`,
			`- Service observations: ${metrics.service.observedCalls} calls, ${metrics.service.readTextBytes} read-text bytes; these include coordinator traffic. Contribution bytes and service input bytes overlap and are not added.`,
			'- Missing phase markers remain unavailable. Unattributed elapsed time is not labeled reasoning.',
			'',
			'Exact endpoints, ready history, shared input/boundary intervals, usage availability and repair windows are retained in metrics.json.',
			'',
		);
		return lines.join('\n');
	},

	/**
	 * Call this method to write metrics.json and report.md inside an existing attempt.
	 * Missing optional evidence remains unavailable; malformed complete JSON rejects analysis.
	 * A truncated trailing JSONL record is counted and excluded without modifying its source.
	 *
	 * @param {string} attemptDirectory - Existing disposable attempt directory.
	 * @returns {PilotEvidenceRecord} - Written metrics plus output paths.
	 */
	report(attemptDirectory) {
		const attempt = fs.realpathSync(attemptDirectory);
		assert(fs.statSync(attempt).isDirectory(), 'Analysis requires an attempt directory');
		const read = (relative) => {
			const location = path.join(attempt, relative);
			return fs.existsSync(location) ? JSON.parse(fs.readFileSync(location, 'utf8').replace(/^\uFEFF/, '')) : {};
		};
		const location = path.join(attempt, 'events.jsonl');
		const text = fs.existsSync(location) ? fs.readFileSync(location, 'utf8') : '';
		const lines = text.split(/\r?\n/);
		const events = [];
		let incompleteTrailingRecords = 0;
		for (const [index, line] of lines.entries()) {
			if (!line.trim()) continue;
			try {
				events.push(JSON.parse(line.replace(/^\uFEFF/, '')));
			} catch (error) {
				if (index !== lines.length - 1) throw error;
				incompleteTrailingRecords++;
			}
		}
		const metrics = this.summarize({
			events,
			state: read('state.private.json'),
			manifest: read('workspace/source-manifest.json'),
			scope: read('workspace/outputs/scope.json'),
		});
		metrics.availability.incompleteTrailingRecords = incompleteTrailingRecords;
		const metricsPath = path.join(attempt, 'metrics.json');
		const reportPath = path.join(attempt, 'report.md');
		fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2) + '\n');
		fs.writeFileSync(reportPath, this._markdown(metrics));
		return {metrics, metricsPath, reportPath};
	},
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const argument = process.argv
		.slice(2)
		.find((value) => value.startsWith('--attempt='))
		?.slice('--attempt='.length);
	assert(argument, 'Supply --attempt=<name-or-path>');
	const governance = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
	const attempt = path.isAbsolute(argument) ? argument : path.resolve(governance, '.codex-tmp', argument);
	const {metrics, metricsPath, reportPath} = PilotAnalysis.report(attempt);
	console.log(
		JSON.stringify({
			status: metrics.status,
			completedModelTurns: metrics.native.completedTurns,
			metricsPath,
			reportPath,
		}),
	);
}
