/** A requirement snapshot projected from authoritative input, with stable record IDs. */
type WireframeScopeSource = {
	/** Stable source identity. */
	id: string;
	/** Source version or content hash, supplied by the owner. */
	revision: string | number;
	/** Exact decision-bearing values selected from that version. */
	records: Record<string, unknown>;
};
/** Exact source records used to justify an interface decision. */
type WireframeScopeDependency = {
	/** Identity in previousSources/currentSources. */
	sourceId: string;
	/** Specific stable record IDs; wildcards are not permitted. */
	recordRefs: string[];
};
/** Reason for authoring work.
 * - **"requirement-change"** - A material source change affects the interface.
 * - **"defect-repair"** - Existing output violates a current requirement.
 */
type WireframeScopeImpactKind = 'requirement-change' | 'defect-repair';
/** Semantic decision readiness.
 * - **"ready"** - Owner has resolved the source meaning and interface effect.
 * - **"needs-repair"** - Uncertainty remains; preserve data and hold this item.
 */
type WireframeScopeImpactStatus = 'ready' | 'needs-repair';
/** Interface action.
 * - **"update"** - Authoring justified by source-linked impacts.
 * - **"reuse"** - Existing interface remains sufficient; readable as context.
 * - **"unresolved"** - A local source or scope issue prevents dispatch.
 */
type WireframeScopeDisposition = 'update' | 'reuse' | 'unresolved';
/** Parent-owned semantic impact; reference validation does not prove its prose. */
type WireframeScopeImpact = {
	/** Stable impact identity. */
	id: string;
	/** Exact interface affected, not every consumer of a related flow. */
	elementId: string;
	/** Requirement change or separately identified repair. */
	kind: WireframeScopeImpactKind;
	/** Whether the semantic interpretation is settled. */
	status: WireframeScopeImpactStatus;
	/** Concrete effect on the interface, including indirect effects when relevant. */
	reason: string;
	/** Existing typed flow/action/frame/component/state references. */
	affectedRefs: string[];
	/** Source evidence supporting the effect. */
	dependencies: WireframeScopeDependency[];
	/** Required for defect-repair: the observed existing defect. */
	defect?: string;
	/** How an unresolved decision can be repaired. */
	remediation?: string;
};
/** Small projection of authoritative facts and their interpreted impact. */
type WireframeScopeBasis = {
	/** Baseline snapshots; empty only for an identified initial design. */
	previousSources: WireframeScopeSource[];
	/** Current authoritative snapshots. */
	currentSources: WireframeScopeSource[];
	/** Explicit impact inventory supplied by the parent. */
	impacts: WireframeScopeImpact[];
};
/** Coherent interface inventory entry; existing authoring fields remain intact. */
type WireframeScopeElement = {
	/** Stable interface identity. */
	id: string;
	/** Update, reuse or unresolved selection. */
	disposition: WireframeScopeDisposition;
	/** Why the decision is appropriate. */
	changeReason: string;
	/** Existing flow references used as context. */
	sourceFlowRefs: string[];
	/** Locally owned action references. */
	sourceActionRefs?: string[];
	/** Locally owned frame references. */
	frameRefs?: string[];
	/** Shared component dependencies, when relevant. */
	componentRefs?: string[];
	/** Relevant state references, when used. */
	stateRefs?: string[];
	/** Explicit impact IDs; empty for unchanged context. */
	impactRefs?: string[];
	/** Intended state coverage for changed work. */
	requiredStates?: string[];
	/** Other interface dependencies in this inventory. */
	dependencies?: string[];
	/** Existing title/authoring metadata. */
	[key: string]: unknown;
};
/** Source context supplied at wireframes.prepare; arrays contain existing UX records. */
type WireframeScopeContext = {
	/** Required authoritative selection input. */
	scopeBasis: WireframeScopeBasis;
	/** Supplied flows, including unchanged readable context. */
	flows: WireframeScopeRecord[];
	/** Supplied actions. */
	actions?: WireframeScopeRecord[];
	/** Supplied interaction frames. */
	interactionFrames?: WireframeScopeRecord[];
	/** Supplied reusable component records. */
	components?: WireframeScopeRecord[];
	/** Supplied state records. */
	states?: WireframeScopeRecord[];
	/** Existing UX/source fields, carried unchanged. */
	[key: string]: unknown;
};
/** Existing UX record read by identity; semantic fields remain with the UX contract. */
type WireframeScopeRecord = {
	/** Stable identity within its UX collection. */
	id: string;
	/** Existing source-owned values. */
	[key: string]: unknown;
};
/** A local scope problem retained while unrelated work may continue. */
type WireframeScopeIssue = {
	/** Interface requiring repair. */
	elementId: string;
	/** Mechanical or supplied semantic findings. */
	problems: string[];
	/** Recovery instruction. */
	remediation: string;
};
/** Persisted work list bound to exact source/context inputs. */
type WireframeScopeDocument = {
	/** Candidate/validated interface inventory. */
	elements: WireframeScopeElement[];
	/** Code-owned input fingerprint, absent before first selection. */
	binding?: string;
	/** Local failures produced by selection. */
	issues?: WireframeScopeIssue[];
	/** Existing coverage metadata. */
	[key: string]: unknown;
};
/** Relevant requirement evidence included in an element's acceptance fingerprint. */
type WireframeScopeEvidence = {
	/** Semantic impact, null only for an unresolved reference. */
	impact: WireframeScopeImpact | null;
	/** Version-independent source values for these exact record dependencies. */
	sources: {
		/** Source identity. */
		sourceId: string;
		/** Stable requirement identity. */
		recordRef: string;
		/** Earlier value or null for addition. */
		before: unknown;
		/** Current value or null for removal. */
		after: unknown;
	}[];
};

/** Observation boundary, distinct from the purpose of its work.
 * - **"agent-window"** - Elapsed dispatch/work window; not isolated inference.
 * - **"tool"** - Caller-observed tool request through response.
 * - **"process"** - Local subprocess lifetime.
 * - **"helper"** - Instrumented in-process operation.
 * - **"coordination"** - Observed parent routing or handoff handling.
 * - **"wait"** - Explicit dependency wait.
 */
type PerformanceSpanKind = 'agent-window' | 'tool' | 'process' | 'helper' | 'coordination' | 'wait';

/** Assigned work purpose; not a measurement of hidden model activity.
 * - **"design"** - Choosing or reviewing product behavior or appearance.
 * - **"representation"** - Encoding already-decided meaning.
 * - **"execution"** - Deterministic commands and transport.
 * - **"unknown"** - Mixed or unclassified work.
 */
type PerformancePurpose = 'design' | 'representation' | 'execution' | 'unknown';

/** Observed completion condition.
 * - **"complete"** - Operation returned successfully; not design approval.
 * - **"failed"** - Operation failed.
 * - **"needs-repair"** - Partial usable output with reported issues.
 * - **"incomplete"** - No finish observation available.
 */
type PerformanceOutcome = 'complete' | 'failed' | 'needs-repair' | 'incomplete';

/** Usage for this observation only; never an overlapping session aggregate. */
type PerformanceUsage = {
	/** Runtime/provider evidence identifying where counts came from. */
	source: string;
	/** All input tokens, or unavailable. */
	inputTokens: number | null;
	/** Subset of input tokens served from cache, or unavailable. */
	cachedInputTokens: number | null;
	/** All output tokens, or unavailable. */
	outputTokens: number | null;
	/** Subset of output tokens classified by provider as reasoning, or unavailable. */
	reasoningTokens: number | null;
};

/** Immutable run-local observation. Contains no prompts or product payloads. */
type PerformanceSpan = {
	/** Unique ID for this observation; retries use new IDs. */
	id: string;
	/** Agent or parent responsible for the observation. */
	actor: string;
	/** Workflow stage, such as ux, review, ui or publication. */
	stage: string;
	/** Short operation label without source content. */
	operation: string;
	/** Actual measured boundary. */
	kind: PerformanceSpanKind;
	/** Assigned task purpose; mixed tasks remain unknown. */
	purpose: PerformancePurpose;
	/** Observed UTC start timestamp. */
	startedAt: string;
	/** Observed UTC finish, or null for interrupted/missing completion. */
	finishedAt: string | null;
	/** Outcome without granting semantic acceptance. */
	outcome: PerformanceOutcome;
	/** Nonnegative observed numbers with unit-bearing keys, e.g. process-ms or input-bytes. */
	measurements: Record<string, number>;
	/** Sourced usage or null; no inferred tokens or cost. */
	usage: PerformanceUsage | null;
};

/** Optional explicit bounds; default is the extent of available observations. */
type PerformanceWindow = {
	/** Run start, including startup when observed. */
	startedAt?: string;
	/** Run end, including trailing work when observed. */
	finishedAt?: string;
};

/** Overlapping activity group; totals cannot be added across groups. */
type PerformanceGroup = {
	/** Number of observations, including incomplete ones. */
	count: number;
	/** Sum of completed durations; includes overlap. */
	summedMs: number;
	/** Union of completed time intervals. */
	coveredMs: number;
};

/** Measured coverage plus original evidence; no guessed reasoning or cost. */
type PerformanceSummary = {
	/** Report window start. */
	startedAt: string;
	/** Report window end. */
	finishedAt: string;
	/** Total window duration. */
	wallMs: number;
	/** Wall time covered by at least one completed observation. */
	coveredMs: number;
	/** Wall time outside completed observations; not automatically idle time. */
	unobservedMs: number;
	/** IDs without observed completion. */
	incompleteIds: string[];
	/** Nonadditive breakdowns by kind, actor and assigned purpose. */
	groups: Record<string, Record<string, PerformanceGroup>>;
	/** Deduplicated observations preserving usage and measurements. */
	observations: PerformanceSpan[];
	/** Interpretation limits needed to avoid double counting. */
	note: string;
};

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
	/** Native schema 0.4 candidate, or null when shared context is unavailable. */
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
	/** Current native UX document. */
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

/** Direct indexes over local routes, independent of publication hierarchy. */
type UxFlowIndex = {
	steps: Map<string, Record<string, unknown>>;
	owners: Map<string, Record<string, unknown>>;
	alternates: Map<string, Record<string, unknown>>;
};

/** Explicit conversion of saved graph-era input; not semantic approval. */
type UxMigrationResult = {
	document: Record<string, unknown>;
	issues: DesignRecordIssue[];
	mappings: Record<string, string>;
};

/** Inputs to the explicit one-time importer. */
type DesignMigrationOptions = {
	inputPath: string;
	outputDirectory: string;
	stage: 'ux' | 'ui';
	uxSpec?: Record<string, unknown>;
	mappings?: Record<string, string>;
};

/** Saved migration evidence and measured execution time. */
type DesignMigrationReport = {
	version: string;
	stage: 'ux' | 'ui';
	sourceSha256: string;
	originalPath: string;
	candidatePath: string | null;
	reviewStatus: 'not-assessed';
	issues: DesignRecordIssue[];
	mappings: Record<string, string>;
	sourceBytes: number;
	candidateBytes: number;
	elapsedMs: number;
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

/** Caller-owned limits and continuation for one bounded source read. */
type BoundedReadOptions = {
	/** Complete rendered output budget in UTF-8 bytes; default 4096, range 512–8192. */
	maxBytes?: number;
	/** Unmodified continuation from the preceding page of the same ordered files. */
	cursor?: string;
};

/** Test runner cleanup capability used by bounded-read filesystem fixtures. */
type BoundedReadTestContext = {
	/** Register cleanup of test-owned resources after the scenario finishes. */
	after(callback: () => void): void;
};

/** Internal position bound to the ordered batch's paths, sizes and content digests. */
type BoundedReadPosition = {
	/** Batch digest, or empty before the initial inspection. */
	b: string;
	/** Zero-based source index. */
	i: number;
	/** Zero-based byte offset, on a UTF-8 code point boundary. */
	o: number;
};

/** Read-only source identity and a bounded captured window from its hashing pass. */
type BoundedReadSource = {
	/** Resolved absolute source path. */
	path: string;
	/** Complete source length in bytes. */
	size: number;
	/** Digest of the complete source bytes. */
	sha256: string;
	/** Captured bytes at the requested offset, including code point boundary lookahead. */
	window: Buffer;
};

/** One exact source fragment; framing newlines are not part of its text. */
type BoundedReadPart = {
	/** Zero-based source index within the ordered batch. */
	index: number;
	/** Resolved source path. */
	path: string;
	/** Digest of the complete source. */
	sha256: string;
	/** Inclusive source byte offset. */
	start: number;
	/** Exclusive source byte offset. */
	end: number;
	/** Complete source length in bytes. */
	total: number;
	/** Exact decoded UTF-8 fragment, preserving BOMs and line endings. */
	text: string;
};

/** Internal candidate page used to account for content and all framing together. */
type BoundedReadCandidate = {
	/** Proposed next source fragment. */
	part: BoundedReadPart;
	/** Next unread position, or null at batch completion. */
	cursor: string | null;
	/** Complete proposed output. */
	text: string;
	/** UTF-8 length of the complete output. */
	bytes: number;
};

/** One bounded response; only text should be forwarded into a tool result. */
type BoundedReadPage = {
	/** Digest binding the ordered source paths, sizes, and content hashes. */
	batch: string;
	/** Complete raw output, including framing and continuation. */
	text: string;
	/** UTF-8 byte length of text, including all metadata. */
	bytes: number;
	/** Next unread position; null only after every source is emitted. */
	next: string | null;
	/** Contiguous source fragments for programmatic validation and coverage tracking. */
	parts: BoundedReadPart[];
};

/** Explicit inputs for current-schema UI replacement; prior paths prove existing ownership only. */
type UiPersistenceOptions = {
	/** Exact passing review of the incoming UI's UX dependency. */
	uxReviewPath?: string;
	/** Authoritative human-owned product description. */
	productDescriptionPath?: string;
	/** Source id when the UX artifact has multiple product descriptions. */
	productDescriptionId?: string;
	/** Canonical authority root for source and asset paths. */
	sourceRoot?: string;
	/** Explicit image-asset root within the source root when images are declared. */
	assetRoot?: string;
	/** Product document root owning the canonical UI target. */
	productDocumentRoot?: string;
	/** Exact current-schema UX dependency of an existing UI target, when different from incoming UX. */
	existingUxPath?: string;
	/** Exact current-schema design dependency of an existing UI target, when different from incoming design. */
	existingDesignLanguagePath?: string;
	/** Explicit owner reason for establishing a design lock. */
	lockReason?: string;
	/** Explicit owner reason for changing existing locked design. */
	lockedChangeReason?: string;
};

/** Identity of the validated canonical UI source written by the persistence boundary. */
type UiPersistenceResult = {
	/** Absolute path of the canonical persisted UI source. */
	output: string;
	/** Preserved UI artifact identity. */
	id: string;
	/** Current contract's string or numeric revision value. */
	revision: string | number;
	/** Number of scene records in the persisted composition. */
	sceneCount: number;
};
/** Numeric source domain; units and endpoint meaning belong to source data. */
interface NumericDomain {
	/** Smallest displayed value. */
	min: number;
	/** Largest displayed value. */
	max: number;
}
/** Point or interval positioned relative to its parent region's numeric domain. */
interface NumericPosition {
	/** Point value or interval start. */
	start: number;
	/** Interval end; omission denotes a point. */
	end?: number;
}
/** Derived coordinates in the caller's chosen viewport units. */
interface NumericPlacement {
	/** Origin relative to the viewport start. */
	start: number;
	/** Interval extent; zero for a point. */
	width: number;
}
/** Outcome classification; this is author interpretation, not automatic semantic proof.
 * - **"visible-change"** - A result value or object must be visible.
 * - **"navigation"** - The destination interface is the result.
 * - **"unchanged"** - Cancellation, failure or another explicitly unchanged result.
 */
type OutcomeKind = 'visible-change' | 'navigation' | 'unchanged';
/** Rendered scalar parameter names.
 * - **"text"** - Displayed text.
 * - **"label"** - Control label.
 * - **"value"** - Field value.
 */
type OutcomeParameter = 'text' | 'label' | 'value';
/** An existing scalar source fact bound to its rendered representation. */
interface OutcomeValue {
	/** Evidence node containing the displayed parameter. */
	nodeRef: string;
	/** Displayed parameter to compare. */
	parameter: OutcomeParameter;
	/** Exact pointer to the original expected scalar. */
	sourcePath: string;
}
/** Small mapping from an existing outcome to concrete scene content. */
interface OutcomeLink {
	/** Exact pointer to existing flow, step or alternate outcome. */
	sourcePath: string;
	/** Scene demonstrating the outcome. */
	sceneRef: string;
	/** Result nodes in that scene. */
	nodeRefs: string[];
	/** Expected result category, requiring semantic judgment. */
	resultKind: OutcomeKind;
	/** Optional brief interpretation when source prose needs it. */
	interpretation?: string;
	/** Optional comparisons to already structured source scalars. */
	values?: OutcomeValue[];
}
