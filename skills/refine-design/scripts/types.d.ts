/// <reference path="./ui-author-completeness-types.d.ts" />

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
/** Supported managed author specialties.
 * - **"ux-planner"** - Existing UX author role; no upstream research during preparation.
 * - **"ui-designer"** - Existing UI author role; independent reviewed UX remains a prerequisite.
 */
type DesignPreparationRole = 'ux-planner' | 'ui-designer';
/** Managed preparation state, independent of thread liveness.
 * - **"preparing"** - Exact read-and-wait acknowledgment is outstanding.
 * - **"available"** - Exact acknowledgment and positive availability exist.
 * - **"assigned"** - Saved unresolved author assignment, including claim crash windows.
 * - **"failed"** - Positively failed creation with confirmed thread absence.
 * - **"uncertain"** - Liveness or assignment outcome needs positive reconciliation.
 * - **"retired"** - No new work intended; unconfirmed closure still consumes a slot.
 */
type DesignPreparationStatus = 'preparing' | 'available' | 'assigned' | 'failed' | 'uncertain' | 'retired';
/** Independently observed thread liveness.
 * - **"unknown"** - Potentially open thread or interrupted creation; retains pool capacity.
 * - **"open"** - Actual creation or availability positively observed.
 * - **"absent"** - Creation produced no thread, positively confirmed.
 * - **"closed"** - Actual thread termination positively confirmed.
 */
type DesignPreparationThread = 'unknown' | 'open' | 'absent' | 'closed';
/** Nonsecret grant lifecycle; volatile capabilities never enter the ledger.
 * - **"pending"** - Claim intent exists but no authority grant was attempted.
 * - **"issued"** - Grant attempted; revocation must be positively established.
 * - **"revoked"** - Parent has revoked prior scoped authority.
 */
type DesignPreparationAuthorityStatus = 'pending' | 'issued' | 'revoked';
/** Parent-owned read-only saved input packet, bounded to 16384 UTF-8 JSON bytes. */
type DesignPreparationPacket = {
	/** Explicit product/run scope; never a generic cross-product worker. */
	scope: string;
	/** Parent revision label; digest still binds the complete exact packet. */
	revision: string;
	/** Stable actual role instructions plus read, acknowledge and wait obligations. */
	instructions: string;
	/** Exact saved source/schema/foundation inputs; final author inputs may contain more records. */
	bindings: DesignPlanBinding[];
};
/** Host-wide positive snapshot, including primary, researchers, reviewers and other open agents. */
type DesignPreparationCapacity = {
	/** Unique observation identity; changing this alone never clears backoff. */
	id: string;
	/** Parent-observed UTC time or durable event reference. */
	observedAt: string;
	/** Runtime-reported total thread limit including primary, or null when unobservable. */
	runtimeLimit: number | null;
	/** Configured subagent ceiling for evidence only; never assumed active at runtime. */
	configuredSubagentLimit: number | null;
	/** Actual known open host threads, including outsiders and primary. */
	openThreadIds: string[];
	/** Upcoming mandatory independent reviewer slots, at least one. */
	reviewerReserve: number;
	/** Explicit conservative batch slots when runtime capacity is unknown, from zero to two. */
	conservativeSlots: number;
};
/** Forecast advice for one current author specialty; it never grants ownership. */
type DesignPreparationDemand = {
	/** Actual specialist role. */
	role: DesignPreparationRole;
	/** Plausible author count, bounded by four. */
	count: number;
	/** Exact role and saved preparation inputs. */
	packet: DesignPreparationPacket;
};
/** Later mandatory author demand reserving pool capacity when closure is unavailable. */
type DesignPreparationLaterRole = {
	/** Later incompatible specialty, never relabeled onto an existing author. */
	role: DesignPreparationRole;
	/** Required minimum managed author slots. */
	count: number;
};
/** Cheap parent forecast, valid before a complete operational plan. */
type DesignPreparationForecast = {
	/** Parent forecast revision persisted before creation intents. */
	revision: string;
	/** Current plausible roles and bounded packets. */
	demands: DesignPreparationDemand[];
	/** Required later roles consuming reserved managed slots. */
	laterRoles: DesignPreparationLaterRole[];
};
/** Exact current packet acknowledgment; no design or write authority. */
type DesignPreparationAck = {
	/** Actual host agent identity. */
	agentId: string;
	/** Exact preparation attempt identity. */
	attemptId: string;
	/** Exact complete packet SHA-256. */
	packetDigest: string;
	/** Saved positive read-and-wait receipt reference. */
	observation: string;
};
/** Saved assignment reservation separate from a volatile capability. */
type DesignPreparationSavedAssignment = {
	/** Granted retained-file or scoped-service route; null before any grant attempt. */
	channel: DesignPreparationAuthorityChannel | null;
	/** Current operational work identity. */
	itemId: string;
	/** Exact coordinator attempt, or null across the pre-claim crash window. */
	attemptId: string | null;
	/** Conservative author grant/revocation status. */
	authority: DesignPreparationAuthorityStatus;
};
/** One retained author, including failed or retired agents whose threads may remain open. */
type DesignPreparationAuthor = {
	/** Ledger-local stable record identity. */
	id: string;
	/** Current preparation attempt identity; changes on packet refresh. */
	attemptId: string;
	/** Actual host identity, or null until successful creation is reconciled. */
	agentId: string | null;
	/** Actual role/instructions, never relabeled for another specialty. */
	role: DesignPreparationRole;
	/** Current exact bounded packet. */
	packet: DesignPreparationPacket;
	/** SHA-256 packet binding. */
	packetDigest: string;
	/** Preparation or assignment lifecycle state. */
	status: DesignPreparationStatus;
	/** Host thread lifecycle independently observed. */
	thread: DesignPreparationThread;
	/** Current acknowledgment, or null before reading current packet. */
	ack: DesignPreparationAck | null;
	/** Unresolved work and authority state, or null when positively released. */
	assignment: DesignPreparationSavedAssignment | null;
	/** Actual earlier contributor provenance retained for independent-review exclusions. */
	contributions: Record<string, unknown>[];
	/** Ordered nonsecret observation and preparation timing evidence. */
	observations: Record<string, unknown>[];
};
/** Complete pre-plan durable preparation ledger. */
type DesignPreparationState = {
	/** Current closed preparation format. */
	format: string;
	/** Monotonic compare-and-swap revision. */
	revision: number;
	/** Product/run ownership scope. */
	scope: string;
	/** Latest advisory forecast, or null before forecasting. */
	forecast: DesignPreparationForecast | null;
	/** Latest host snapshot, or null before observing capacity. */
	capacity: DesignPreparationCapacity | null;
	/** Persistent ceiling/backoff evidence; clears only after positive free-capacity increase. */
	ceiling: {
		/** Accounted free physical host slots at the ceiling event; null when runtime capacity is unknown. */
		freeSlots: number | null;
		/** Snapshot at observed ceiling. */ capacity: DesignPreparationCapacity;
		/** Saved error reference. */ observation: string;
	} | null;
	/** All historical managed author records, including positively terminated authors. */
	authors: DesignPreparationAuthor[];
	/** Ordered forecast and intent evidence, never capabilities. */
	history: Record<string, unknown>[];
};
/** Derived persisted pool accounting. */
type DesignPreparationInspection = {
	/** Complete verified ledger. */
	state: DesignPreparationState;
	/** Known or potentially open managed authors, maximum four. */
	openCount: number;
	/** Unresolved simultaneous author assignments, maximum two. */
	authoringCount: number;
	/** Managed identities needing positive liveness reconciliation. */
	uncertain: string[];
};
/** Product/run initialization without an operational plan. */
type DesignPreparationInitialization = {/** Explicit owning product/run. */ scope: string};
/** Exact ledger revision for every state-changing operation. */
type DesignPreparationRevision = {/** Observed CAS revision. */ expectedRevision: number};
/** Forecast/capacity batch input. */
type DesignPreparationAdvice = DesignPreparationRevision & {
	/** Current early forecast. */ forecast: DesignPreparationForecast;
	/** Current actual host observation. */ capacity: DesignPreparationCapacity;
};
/** Unmet forecast specialty reservation. */
type DesignPreparationReservation = DesignPreparationRevision & {
	/** Required actual specialty. */ role: DesignPreparationRole;
};
/** Exact managed record mutation request. */
type DesignPreparationAuthorRequest = DesignPreparationRevision & {/** Managed record identity. */ authorId: string};
/** Actual creation confirmation or interrupted-spawn reconciliation. */
type DesignPreparationCreation = DesignPreparationAuthorRequest & {
	/** Saved preparation attempt. */ attemptId: string;
	/** Actual host agent. */ agentId: string;
	/** Positive creation receipt reference. */ observation: string;
};
/** Creation failure certainty.
 * - **"absent"** - No thread was created, positively confirmed.
 * - **"unknown"** - A thread may exist; no replacement is authorized.
 */
type DesignPreparationFailureOutcome = 'absent' | 'unknown';
/** Bounded creation failure record. */
type DesignPreparationFailure = DesignPreparationAuthorRequest & {
	/** Exact preparation attempt. */ attemptId: string;
	/** Positively known absence or uncertainty. */ outcome: DesignPreparationFailureOutcome;
	/** Whether this error establishes host thread-ceiling backoff. */ ceiling?: boolean;
	/** Saved host error/observation reference. */ observation: string;
};
/** Positive existing-author adoption without relabeling an incompatible specialist. */
type DesignPreparationAdoption = DesignPreparationRevision & {
	/** Positively observed actual installed role; must equal the requested specialty. */ actualRole: DesignPreparationRole;
	/** Positive confirmation that earlier author assignments are resolved. */ assignmentResolved: boolean;
	/** Positive confirmation that earlier author capability has been revoked. */ authorityRevoked: boolean;
	/** Actual available host author. */ agentId: string;
	/** Actual established role. */ role: DesignPreparationRole;
	/** New bounded read-only packet. */ packet: DesignPreparationPacket;
	/** Earlier actual contributor provenance. */ contributions?: Record<string, unknown>[];
	/** Saved availability and prior-authority revocation confirmation. */ observation: string;
};
/** Current read-and-wait receipt ingress. */
type DesignPreparationAcknowledgment = DesignPreparationAuthorRequest & DesignPreparationAck;
/** Packet refresh after source changes or stage-boundary final input preparation. */
type DesignPreparationPacketRefresh = DesignPreparationAuthorRequest & {
	/** Replacement exact packet. */ packet: DesignPreparationPacket;
};
/** Positive host observation class.
 * - **"available"** - Actual author positively available; unresolved work remains assigned.
 * - **"live"** - Exact surviving assigned author is positively alive; idle availability is not inferred.
 * - **"unknown"** - No positive liveness evidence; retain capacity and freeze authoring.
 * - **"closed"** - Thread termination positively confirmed; unresolved effects remain retained.
 */
type DesignPreparationObservationStatus = 'available' | 'live' | 'unknown' | 'closed';
/** Resume liveness reconciliation. */
type DesignPreparationObservation = DesignPreparationAuthorRequest & {
	/** Exact actual host identity. */ agentId: string;
	/** Positively observed liveness. */ status: DesignPreparationObservationStatus;
	/** Durable host observation reference. */ observation: string;
};
/** No-new-work retirement preserving potentially open slots. */
type DesignPreparationRetirement = DesignPreparationAuthorRequest & {
	/** Parent reason/reference. */ observation: string;
};
/** Pre-claim pool assignment reservation. */
type DesignPreparationAssignmentIntent = DesignPreparationAuthorRequest & {
	/** Exact earlier coordinator attempt, or null when none existed before this intent; recovery evidence only. */
	priorAttemptId?: string | null;
	/** Exact ready work identity. */ itemId: string;
	/** Current work item's actual specialty. */ role: DesignPreparationRole;
	/** Current exact acknowledged packet identity. */ packetDigest: string;
	/** Positively observed current preparation bindings; final claim may add more inputs. */ bindings: DesignPlanBinding[];
	/** Positive current availability/input observation reference. */ observation: string;
};
/** Post-claim linking or crash-window reconciliation. */
type DesignPreparationClaimBinding = DesignPreparationAuthorRequest & {
	/** Verified current coordinator snapshot. */ coordinatorState: DesignCoordinatorState;
};
/** Nonsecret exact author grant lifecycle observation. */
type DesignPreparationAuthority = DesignPreparationAuthorRequest & {
	/** Scoped service by default, or the existing parent-owned retained-file route. */ channel?: DesignPreparationAuthorityChannel;
	/** Exact current native claim. */ claim: DesignCoordinatorClaimGuard;
	/** Issued or positively revoked grant state. */ status: DesignPreparationAuthorityStatus;
};
/** Prepared assignment guard binding. */
type DesignPreparationAssignmentGuard = {
	/** Exact managed author. */ authorId: string;
	/** Exact native coordinator claim. */ claim: DesignCoordinatorClaimGuard;
};
/** Parent synchronous guarded operation with no asynchronous lock escape. */
type DesignPreparationGuardAction = () => unknown;
/** Positive stop observation for resolved prior author work. */
type DesignPreparationStop = {
	/** Literal stopped observation. */ status: 'stopped';
	/** Exact actual author. */ agentId: string;
	/** Exact prior assignment, or null for a positively claimless crash intent. */ attemptId: string | null;
	/** Durable actual stop confirmation reference. */ ref: string;
};
/** Safe resolved-assignment release; delivery alone is insufficient. */
type DesignPreparationRelease = DesignPreparationAuthorRequest & {
	/** Verified coordinator resolution/no-claim snapshot. */ coordinatorState: DesignCoordinatorState;
	/** Exact positively stopped prior work. */ observation: DesignPreparationStop;
};
/** Internal synchronous CAS transition. */
type DesignPreparationMutation = (state: DesignPreparationState) => void;
/** Minimal ledger capability consumed by the existing workflow adapter. */
interface DesignPreparationLedger {
	/** Reads durable state without minting authority. */ open(): DesignPreparationState;
	/** Saves pool assignment reservation before coordinator claim. */ beginAssignment(
		request: DesignPreparationAssignmentIntent,
	): DesignPreparationState;
	/** Binds or reconciles the exact saved coordinator claim. */ bindClaim(
		request: DesignPreparationClaimBinding,
	): DesignPreparationState;
	/** Saves conservative nonsecret grant/revocation state. */ authority(
		request: DesignPreparationAuthority,
	): DesignPreparationState;
	/** Guards an exact prepared assignment under the ledger lock. */ withAssignment(
		request: DesignPreparationAssignmentGuard,
		action: DesignPreparationGuardAction,
	): unknown;
	/** Verifies resolution, revocation and actual stop before reusable release. */ release(
		request: DesignPreparationRelease,
	): DesignPreparationState;
}
/** Parent prepared author claim route. */
type DesignWorkflowPreparedClaim = {
	/** Exact managed author. */ authorId: string;
	/** Current ready native item. */ itemId: string;
	/** Current observed preparation input identities. */ bindings: DesignPlanBinding[];
	/** Positive current availability and input evidence reference. */ observation: string;
	/** Exact pool revision. */ preparationRevision: number;
	/** Exact operational coordinator revision. */ coordinatorRevision: number;
};
/** Scoped capability creation for an exact prepared native author. */
type DesignWorkflowPreparedAssignment = DesignWorkflowAssignment & {
	/** Managed author bound to the claim. */ authorId: string;
	/** Exact current pool revision. */ preparationRevision: number;
};
/** Parent revocation and positively stopped reusable release. */
type DesignWorkflowPreparedRelease = {
	/** Managed author currently assigned. */ authorId: string;
	/** Exact positive stopped prior work. */ observation: DesignPreparationStop;
	/** Exact current pool revision. */ preparationRevision: number;
};
/** Exact prepared claim retained by the parent file route. */
type DesignWorkflowPreparedGuard = DesignCoordinatorClaimGuard & {/** Managed author identity. */ authorId: string};

/** Actual native-store preparation fixture for guarded workflow regressions. */
type DesignWorkflowPreparationFixture = {
	/** Persisted lifecycle and exact positive fake-host observations. */ preparation: DesignPreparationTestFixture['ledger'];
	/** Current exact saved input packet. */ packet: DesignPreparationPacket;
	/** Actual tracked author identity and preparation attempt. */ author: DesignPreparationAuthor;
};
/** Existing authority route used by one current author assignment.
 * - **"file"** - Parent mutations under both ledger and exact native claim guards.
 * - **"service"** - Process-local scoped service capability guarded by the same claims.
 */
type DesignPreparationAuthorityChannel = 'file' | 'service';
/** Compact data-only CLI receipt; packet bodies and capabilities are excluded. */
type DesignPreparationCliReceipt = {
	/** Current ledger CAS revision. */ revision: number;
	/** Product/run scope. */ scope: string;
	/** Current advisory forecast revision or null. */ forecastRevision: string | null;
	/** Latest actual host snapshot. */ capacity: DesignPreparationCapacity | null;
	/** Current persistent ceiling evidence. */ ceiling: DesignPreparationState['ceiling'];
	/** Count of known or potentially open authors. */ openCount: number;
	/** Count of unresolved author assignments. */ authoringCount: number;
	/** Managed records requiring positive reconciliation. */ uncertain: string[];
	/** Compact current authors; source bodies and permissions omitted. */ authors: Pick<
		DesignPreparationAuthor,
		'id' | 'attemptId' | 'agentId' | 'role' | 'status' | 'thread' | 'packetDigest' | 'ack' | 'assignment'
	>[];
	/** Latest nonsecret forecast/intent evidence. */ lastEvent: Record<string, unknown> | null;
};
/** Product-neutral deterministic preparation test fixture. */
type DesignPreparationTestFixture = {
	/** Actual persisted ledger API. */ ledger: DesignPreparationLedger & {
		/** Saves advisory role and host observations. */ advise(
			request: DesignPreparationAdvice,
		): DesignPreparationState;
		/** Reserves a creation intent. */ reserve(request: DesignPreparationReservation): DesignPreparationState;
		/** Records actual fake-host identity. */ created(request: DesignPreparationCreation): DesignPreparationState;
		/** Accepts exact packet acknowledgment. */ acknowledge(
			request: DesignPreparationAcknowledgment,
		): DesignPreparationState;
		/** Adopts positively available existing author. */ adopt(
			request: DesignPreparationAdoption,
		): DesignPreparationState;
		/** Refreshes stale read-only packet. */ refreshPacket(
			request: DesignPreparationPacketRefresh,
		): DesignPreparationState;
		/** Derives bounded pool accounting. */ inspect(): DesignPreparationInspection;
		/** Saves failed or uncertain actual creation outcome. */ failed(
			request: DesignPreparationFailure,
		): DesignPreparationState;
		/** Retires resolved preparation without assuming thread closure. */ retire(
			request: DesignPreparationRetirement,
		): DesignPreparationState;
		/** Reconciles exact actual liveness. */ observe(request: DesignPreparationObservation): DesignPreparationState;
		/** Inspects surviving exclusive writer identity. */ lockInfo(): DesignCoordinatorLock | null;
		/** Recovers only a provably dead exact lock owner. */ recoverLock(token: string): void;
	};
	/** Isolated temporary fixture workspace. */ directory: string;
	/** Current synthetic saved input packet. */ packet: DesignPreparationPacket;
	/** Deterministic host observation, never live telemetry. */ capacity: DesignPreparationCapacity;
	/** Early role demand with later-stage reserve. */ forecast: DesignPreparationForecast;
	/** Attempts one saved reservation. */ reserve(role?: DesignPreparationRole): DesignPreparationAuthor | null;
	/** Confirms deterministic creation and read-and-wait receipt. */ ready(
		author: DesignPreparationAuthor,
		agentId: string,
	): DesignPreparationAuthor;
};
/** Installed-browser capture worker configuration; no browser download or remote URL authority. */
interface UiCaptureOptions {
	executablePath: string;
	sourceRoot: string;
	runRoot: string;
	timeoutMs?: number;
	cleanupMs?: number;
}
interface UiCaptureRequest {
	id: string;
	sceneRef: string;
	variant: 'clean' | 'annotated';
	html: string;
	htmlSha256: string;
	assets: Array<{path: string; sha256: string}>;
	requiredFonts: string[];
	width: number;
	height: number;
	output: string;
}
interface UiCaptureResult {
	id: string;
	sceneRef: string;
	variant: 'clean' | 'annotated';
	status: 'success' | 'failed';
	startedAt: string;
	finishedAt: string;
	timings: Record<string, number>;
	failedResources: Array<{url: string; error?: string}>;
	error?: string;
	cleanupError?: string;
	browserGeneration?: number;
	browserPid?: number;
	readiness?: {fonts: string[]; images: Array<{width: number; height: number}>};
	output?: string;
	htmlSha256?: string;
	pngSha256?: string;
	width?: number;
	height?: number;
}
interface UiCapturePublicationSources {
	ui: {
		renderRequests: Array<{id: string; sceneRef: string; output: string; variant: string}>;
		[key: string]: unknown;
	};
	ux: object;
	designLanguage: object;
	components?: object[];
}
interface UiCapturePublication {
	schemaVersion: '1.0';
	renderFiles: Array<{id: string; path: string; sha256: string; mimeType: string}>;
	sources: {ui: string; ux: string; designLanguage: string; components: string[]};
	review: {
		subjectSha256: string;
		reviewerAgentId: string;
		authorAgentIds: string[];
		verdict: 'pass';
		inspectedScreenshotRefs: string[];
	};
	assets: Array<{id: string; kind: 'image'; path: string; mimeType: 'image/png'; sha256: string}>;
	screenshots: Array<{
		ref: string;
		sceneRef: string;
		renderOutput: string;
		variant: 'clean' | 'annotated';
		artifactKind: 'comp' | 'wireframe';
		path: string;
		width: number;
		height: number;
	}>;
}
/** Batch input paths are relative to sourceRoot; runRoot is a child directory of that root. */
interface UiCaptureBatchOptions extends UiCaptureOptions {
	renderBasePath: string;
	uiPath: string;
	uxPath: string;
	designLanguagePath: string;
	requiredFonts: string[];
}
