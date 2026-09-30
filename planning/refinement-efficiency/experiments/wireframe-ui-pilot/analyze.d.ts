/** Persisted JSON evidence owned by the experiment event producers; fields are selected at analysis boundaries. */
type PilotEvidenceRecord = Record<string, any>;

/** Saved evidence required for deterministic pilot measurements. */
type PilotAnalysisInput = {
	/** Chronological or unordered saved events; persisted timestamps establish order. */
	events?: PilotEvidenceRecord[];
	/** Saved execution status, native completions and exact-version review rounds. */
	state?: PilotEvidenceRecord;
	/** Frozen source binding, byte counts and local preparation duration. */
	manifest?: PilotEvidenceRecord;
	/** Author-selected coherent affected elements and required scene identities. */
	scope?: PilotEvidenceRecord;
};

/** Observed nonnegative wall-clock interval, never inferred from missing phase markers. */
type PilotMeasuredInterval = {
	/** Persisted UTC ISO start timestamp. */
	startedAt: string;
	/** Persisted UTC ISO end timestamp. */
	endedAt: string;
	/** Difference between recorded endpoints in milliseconds. */
	elapsedMs: number;
};

/** Native usage availability with no assumed additive or cumulative accounting contract. */
type PilotUsageSummary = {
	/** Completed turns with recorded usage. */
	reportedTurns: number;
	/** Completed turns whose usage was not recorded. */
	unavailableTurns: number;
	/** Exact nonnegative counters observed at each invocation's completion. */
	snapshots: PilotUsageSnapshot[];
	/** Unavailable until native usage accounting semantics are independently established. */
	totalConsumption: null;
	/** Explanation of why snapshots are neither summed nor differenced. */
	accounting: string;
};

/** Usage counters from one completed native invocation; values may include earlier turns in its thread. */
type PilotUsageSnapshot = {
	/** Persistent native thread identity, or null when not recorded. */
	threadId: string | null;
	/** Invocation start timestamp, or null when its interval was unavailable. */
	startedAt: string | null;
	/** Invocation completion timestamp, or null when its interval was unavailable. */
	endedAt: string | null;
	/** Counters as reported by this invocation, without aggregation or subtraction. */
	counters: Record<string, number>;
};
