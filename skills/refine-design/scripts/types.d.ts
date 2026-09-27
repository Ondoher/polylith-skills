/** Stage that owns one design record store.
 * - **"ux"** - Interaction authoring.
 * - **"ui"** - Visual composition authoring.
 */
type DesignAuthoringStage = 'ux' | 'ui';

/** Kind of an incrementally authored unit.
 * - **"context"** - Common document metadata and shared decisions.
 * - **"element"** - An identified major interaction element and its definitions.
 * - **"flow"** - One goal-oriented sequence and its alternatives.
 * - **"part"** - One reusable, self-contained visual definition.
 * - **"scene"** - One comp or explicit variation.
 */
type DesignRecordKind = 'context' | 'element' | 'flow' | 'part' | 'scene';

/** One finite JSON authoring unit, independent of document outline placement. */
type DesignRecord = {
	/** Stable semantic identity within the kind. */
	id: string;
	/** Authoring unit's role. */
	kind: DesignRecordKind;
	/** Meaning owned by this unit, validated by its domain assembler. */
	data: Record<string, unknown>;
	/** Optional exact semantic references needed by this unit. */
	dependencies?: string[];
};

/** Immutable inputs that own one resumable staging directory. */
type DesignRecordStoreOptions = {
	/** Role producing these records. */
	stage: DesignAuthoringStage;
	/** Exact source, shared-input, and producer-version identities. */
	binding: Record<string, unknown>;
};

/** Persisted ownership header for one staging directory. */
type DesignRecordStoreHeader = DesignRecordStoreOptions & {
	/** Transport contract identifier. */
	format: string;
};

/** Outcome of saving an authored unit. */
type DesignRecordWriteResult = {
	/** Kind-qualified identity of the saved unit. */
	recordKey: string;
	/** SHA-256 of canonical record material. */
	digest: string;
	/** Absolute location of the exact saved record. */
	path: string;
	/** Whether matching existing bytes were retained without another write. */
	reused: boolean;
};

/** Recoverable authoring or assembly problem. */
type DesignRecordIssue = {
	/** Affected record or staging filename. */
	reference: string;
	/** Observed reason this unit needs repair. */
	reason: string;
	/** Smallest useful action to recover the unit. */
	remedy: string;
	/** Exact corrupt bytes permitted for a targeted redelivery, when available. */
	repairDigest?: string;
};

/** Usable staging records and explicit incomplete work. */
type DesignRecordReadResult = {
	/** Exact immutable input ownership. */
	header: DesignRecordStoreHeader;
	/** Successfully decoded authored units. */
	records: DesignRecord[];
	/** Canonical digests keyed by kind:ID. */
	identities: Record<string, string>;
	/** Incomplete, malformed, or unavailable units. */
	issues: DesignRecordIssue[];
	/** Record bytes actually read, excluding the small store header. */
	bytesRead: number;
};

/** A catalog with explicitly shared semantic metadata. */
type DesignPackedValues = {
	/** Identical supplied fields factored out of each record. */
	defaults?: Record<string, unknown>;
	/** Independent catalog entries with stable IDs. */
	values: Record<string, unknown>[];
};

/** One bounded scene variation on a reusable base tree. */
type DesignNodeChange = {
	/** Stable node ID inside the base part. */
	nodeRef: string;
	/** Complete replacement values for selected nonstructural properties. */
	set: Record<string, unknown>;
};

/** A consumer candidate and any recoverable assembly problems. */
type DesignAssemblyResult = {
	/** Existing consumer schema, or null when shared context is unavailable. */
	document: Record<string, unknown> | null;
	/** Units needing repair; never an acceptance or review receipt. */
	issues: DesignRecordIssue[];
};

/** Parent persistence results for one delivery; sibling failures remain explicit. */
type DesignDeliveryResult = {
	/** Saved or reused complete records. */
	saved: DesignRecordWriteResult[];
	/** Units that need targeted redelivery. */
	issues: DesignRecordIssue[];
};

/** Transport-only file manifest for a bounded consumer. */
type DesignHandoffResult = {
	/** Producing contract version. */
	version: string;
	/** Exact files in the requested dependency closure. */
	units: DesignHandoffUnit[];
	/** Missing or malformed units. */
	issues: DesignRecordIssue[];
	/** Bytes examined while resolving the closure. */
	bytesRead: number;
	/** Transport never confers semantic acceptance. */
	reviewStatus: 'not-assessed';
};

/** Exact identity and location of one handoff unit. */
type DesignHandoffUnit = {
	/** Stable kind:ID reference. */
	reference: string;
	/** Canonical record identity. */
	sha256: string;
	/** Absolute assigned file path. */
	path: string;
};

/** Exact dependencies for candidate UI validation and optional isolated previews. */
type DesignRunOptions = {
	/** Current expanded UX consumer document. */
	uxSpec?: Record<string, unknown>;
	/** Current validated design-language document. */
	designLanguage?: Record<string, unknown>;
	/** Explicit repository source root when external resources are needed. */
	sourceRoot?: string;
	/** Explicit asset root when external resources are needed. */
	assetRoot?: string;
	/** Whether to run the existing comp renderer after structural validation. */
	render?: boolean;
};

/** One generated file with an exact reusable byte identity. */
type DesignRunOutput = {
	/** Path below the owned run output directory. */
	relative: string;
	/** SHA-256 of the saved bytes. */
	sha256: string;
	/** Number of saved bytes. */
	bytes: number;
};

/** Measured assembly result; this is never a specialist review receipt. */
type DesignRunReport = {
	/** Producing contract version. */
	version: string;
	/** Assembly implementation revision used to invalidate obsolete generated output. */
	producerVersion: string;
	/** Input and producer material identity. */
	identity: string;
	/** Authoring stage. */
	stage: DesignAuthoringStage;
	/** Saved candidate path, absent when shared context needs repair. */
	candidatePath: string | null;
	/** Structural validation and requested rendering succeeded without repair issues. */
	valid: boolean;
	/** Independent semantic review has not been assessed by this helper. */
	reviewStatus: 'not-assessed';
	/** Recoverable problems and remediation. */
	issues: DesignRecordIssue[];
	/** Generated files whose exact bytes permit later reuse. */
	outputs: DesignRunOutput[];
	/** Whether a prior assembly's verified outputs were reused. */
	reused: boolean;
	/** Record input bytes read by this invocation. */
	bytesRead: number;
	/** Complete records used as assembly input. */
	recordCount: number;
	/** Current invocation's elapsed milliseconds. */
	elapsedMs: number;
	/** Assembly, validation, and optional render durations from the producing run. */
	stages: Record<string, number>;
};
