/** Current, finite JSON stored in a result handle. */
type WorkflowJson = null | boolean | number | string | WorkflowJson[] | {[key: string]: WorkflowJson};

/** Maintained subset of JSON Schema used at the MCP ingress. */
interface WorkflowSchema {
	/** Local schema definition reference, resolved before ingress validation. */
	$ref?: string;
	/** JSON primitive/container type; integer requires an integral finite number. */
	type?: string;
	/** Allowed literal values. */
	enum?: WorkflowJson[];
	/** Object member contracts. */
	properties?: Record<string, WorkflowSchema>;
	/** Required object members. */
	required?: string[];
	/** False rejects undeclared members. */
	additionalProperties?: boolean;
	/** Array element contract. */
	items?: WorkflowSchema;
	/** Inclusive numeric lower bound. */
	minimum?: number;
	/** Inclusive numeric upper bound. */
	maximum?: number;
	/** Maximum string length. */
	maxLength?: number;
	/** Maximum array length. */
	maxItems?: number;
}

/** Parent-owned resident service configuration. */
interface WorkflowServiceOptions {
	/** Physical workspace whose files may be accessed. */
	workspace: string;
	/** Server-owned directory below the workspace. */
	stateDirectory?: string;
	/** Closed maintained operation definitions. */
	operations?: Record<string, WorkflowOperation>;
	/** Configured read-content ceiling in UTF-8 bytes; defaults to 28000. */
	pageBytes?: number;
}

/** A run's immutable source locations, not a guarantee that file contents remain current. */
interface WorkflowRun {
	/** Stable run identity. */
	id: string;
	/** Server-owned run directory. */
	directory: string;
	/** Human-owned product description, when relevant. */
	sourcePath: string | null;
	/** Canonical current pointer, when relevant. */
	currentPath: string | null;
}

/** Private server authority; never emitted by status or operation results. */
interface WorkflowCapability {
	/** Whether this is parent authority. */
	owner: boolean;
	/** Exact assigned run. */
	run?: string;
	/** Explicitly assigned operation names. */
	operations?: string[];
	/** Exact results available to this assignment. */
	handles?: Set<string>;
	/** Exact files assigned as inputs. */
	readPaths?: string[];
	/** Optional assigned scratch output tree. */
	outputDirectory?: string | null;
	/** Stage/record ownership for design delivery. */
	scope?: Record<string, WorkflowJson>;
	/** Jobs issued by this capability. */
	jobs?: Set<string>;
}

/** Content-addressed receipt passed between agents. */
interface WorkflowResultReceipt {
	/** Opaque run-bound result identifier. */
	handle: string;
	/** Exact UTF-8 digest. */
	sha256: string;
	/** Saved byte count. */
	bytes: number;
	/** Server-owned location, useful for parent and file consumers. */
	path: string;
	/** Whether identical bytes already existed. */
	reused: boolean;
	/** Small opted-in operation result, omitted when the complete receipt exceeds its byte budget. */
	inline?: WorkflowJson;
}

/** Private resident cache entry. */
interface WorkflowSavedResult {
	/** Owning run identity. */
	run: string;
	/** Decoded finite JSON. */
	value: WorkflowJson;
	/** Exact serialized bytes as text. */
	text: string;
	/** Durable result location. */
	location: string;
}

/** Arguments shared by authenticated requests. */
interface WorkflowAccessRequest {
	/** Secret parent or assigned capability; do not log. */
	access: string;
	/** Exact run identity when applicable. */
	run?: string;
}

/** Open a parent-owned run. */
interface WorkflowOpenRequest extends WorkflowAccessRequest {
	/** Product description path. */
	sourcePath?: string | null;
	/** Canonical product pointer path. */
	currentPath?: string | null;
}

/** Opened run receipt. */
interface WorkflowRunReceipt {
	/** Stable run identity. */
	run: string;
	/** Server-owned run directory. */
	directory: string;
	/** Shared service process identity. */
	instance: string;
}

/** Parent-issued assignment. */
interface WorkflowAssignmentRequest extends WorkflowAccessRequest {
	/** Grantable operation names. */
	operations?: string[];
	/** Exact input handles. */
	handles?: string[];
	/** Exact input files. */
	readPaths?: string[];
	/** Scratch tree that the agent owns. */
	outputDirectory?: string | null;
	/** Domain stage and record scope. */
	scope?: Record<string, WorkflowJson>;
}

/** Secret assignment receipt given only to the intended agent. */
interface WorkflowAssignmentReceipt extends WorkflowAccessRequest {
	/** Granted operation names. */
	operations: string[];
	/** Assigned output tree. */
	outputDirectory: string | null;
}

/** Synchronous storage action whose caller retains its current parent guard. */
type WorkflowAssignmentAction = () => unknown;

/** Parent-only volatile guard; callbacks never cross the worker transport. */
type WorkflowAssignmentGuard = (action: WorkflowAssignmentAction) => unknown;

/** Exact parent-authorized assignment revocation. */
interface WorkflowAssignmentRevocation extends WorkflowAccessRequest {
	/** Secret worker capability, kept only in parent process memory. */
	assignmentAccess: string;
}

/** Synchronous binding before a marked token is delivered to a worker. */
interface WorkflowAssignmentGuardRequest extends WorkflowAssignmentRevocation {
	/** Parent-owned durable-claim guard. */
	guard: WorkflowAssignmentGuard;
}

/** Store exactly one direct JSON value or existing JSON file. */
interface WorkflowStoreRequest extends WorkflowAccessRequest {
	/** Direct result, mutually exclusive with file. */
	value?: WorkflowJson;
	/** Assigned JSON file, mutually exclusive with value. */
	file?: string;
}

/** Bounded handle read. */
interface WorkflowReadRequest extends WorkflowAccessRequest {
	/** Exact result handle. */
	handle: string;
	/** RFC 6901 selection, empty selects the full result. */
	pointer?: string;
	/** UTF-8 byte cursor. */
	offset?: number;
	/** Maximum source bytes; escaped envelope is also bounded. */
	maxBytes?: number;
}

/** One known independent read with explicit byte boundaries. */
type WorkflowReadBatchEntry = Omit<WorkflowReadRequest, 'access' | 'run' | 'offset' | 'maxBytes'> & {
	/** First-page zero or exact returned continuation byte offset. */
	offset: number;
	/** Source-byte ceiling no greater than the assigned server/client budget. */
	maxBytes: number;
};

/** Caller-owned independent read wave, without copied product payloads. */
type WorkflowReadBatch = {
	/** Parent-issued assignment capability, shared by this wave. */
	access: string;
	/** Independent known pages; explicit offsets and byte budgets are mandatory. */
	reads: WorkflowReadBatchEntry[];
};

/** One page with enough information to resume without truncation. */
interface WorkflowReadResult {
	/** Exact result handle. */
	handle: string;
	/** JSON pointer used for this stream. */
	pointer: string;
	/** Starting byte offset. */
	offset: number;
	/** Next byte offset, or null at completion. */
	nextOffset: number | null;
	/** Total selected JSON byte count. */
	totalBytes: number;
	/** Exact UTF-8 page. */
	text: string;
}

/** Discover a single operation schema or the available name list. */
interface WorkflowCatalogRequest extends WorkflowAccessRequest {
	/** Optional exact operation name. */
	operation?: string;
}

/** Execute one curated operation. */
interface WorkflowExecuteRequest extends WorkflowAccessRequest {
	/** Operation name, never an arbitrary module/function/command. */
	operation: string;
	/** Small direct arguments. */
	input?: Record<string, WorkflowJson>;
	/** Argument name to one result handle or ordered handle list, resolved and authorized server-side. */
	inputHandles?: Record<string, string | string[]>;
	/** Return a job receipt instead of awaiting completion. */
	background?: boolean;
}

/** Inspect current service/job state. */
interface WorkflowStatusRequest extends WorkflowAccessRequest {
	/** Optional job issued by this capability. */
	job?: string;
	/** Parent request to persist measurement data and return its handle. */
	metrics?: boolean;
}

/** Authorized domain invocation context. */
interface WorkflowOperationContext {
	/** Stable current run. */
	run: WorkflowRun;
	/** Confined file service. */
	files: import('./WorkspaceFiles.mjs').WorkspaceFiles;
	/** Domain assignment limits. */
	scope: Record<string, WorkflowJson>;
	/** Whether the caller holds parent authority. */
	owner: boolean;
	/** Assigned input paths. */
	readPaths: string[];
	/** Assigned output directory. */
	outputDirectory: string | null;
	/** Authorizes a caller-selected input path. */
	inputPath: (location: string) => string;
	/** Reauthorize after async waits and retain exact durable claim during synchronous mutation. */
	withAssignment?: WorkflowAssignmentGuard;
}

/** Curated domain operation. */
interface WorkflowOperation {
	/** Domain purpose and effect. */
	description: string;
	/** Current accepted arguments. */
	inputSchema: WorkflowSchema;
	/** Whether parent may grant this operation to a specialist. */
	assignable: boolean;
	/** Whether workspace bytes may change. */
	writes: boolean;
	/** Whether a bounded result can also be returned inline to avoid another model tool turn. */
	inlineResult?: boolean;
	/** Maintained adapter, possibly worker-backed. */
	execute: (
		input: Record<string, WorkflowJson>,
		context: WorkflowOperationContext,
	) => WorkflowJson | Promise<WorkflowJson>;
}
/** Inputs for a read-only UX selection; saved handles can bind facts and ux. */
type UxSelectionRequest = {
	/** Current validated planner facts. */
	facts: Record<string, WorkflowJson>;
	/** Current-schema UX from the current or immediately preceding product revision. */
	ux: Record<string, WorkflowJson>;
	/** Explicit changed references; omitted uses the saved product change ledger. */
	changedRefs?: string[];
	/** Additional flows requested by the parent or consumer. */
	flowIds?: string[];
};

/** Noncanonical agent input and separately readable scope evidence. */
type UxSelectionResult = {
	/** Selected exact records, overview, bindings and uncertainty notices. */
	packet: Record<string, WorkflowJson>;
	/** Inclusion reasons and counts; does not establish semantic sufficiency. */
	receipt: Record<string, WorkflowJson>;
};

/** Exact identity of a human-authored product description. */
interface WorkflowUxReviewSource {
	/** Canonical source identifier. */
	id: string;
	/** Digest of authoritative source bytes. */
	sha256: string;
}

/** Exact persisted UX identity covered by the review. */
interface WorkflowUxReviewArtifact extends WorkflowUxReviewSource {
	/** Opaque persisted revision. */
	revision: string;
}

/** Exact canonical binding supplied by the parent for one independent UX review. */
interface WorkflowUxReviewSubject {
	/** Human source identity and exact byte digest. */
	productDescription: WorkflowUxReviewSource;
	/** Persisted UX identity, revision and exact byte digest. */
	uxArtifact: WorkflowUxReviewArtifact;
	/** Complete scope to be assessed by this reviewer. */
	scopeRefs: string[];
}

/** Completed rows use the closed canonical ux-review-schema-0.2.json shapes. */
interface WorkflowUxReviewFragment {
	/** Completed criterion judgments; omitted until ready. */
	coverage?: Record<string, WorkflowJson>[];
	/** Findings with stable IDs; omitted when this batch has none. */
	findings?: Record<string, WorkflowJson>[];
	/** Source checks with stable research references; omitted until ready. */
	researchChecks?: Record<string, WorkflowJson>[];
	/** Scope and evidence limits; omitted when this batch has none. */
	limits?: string[];
}

/** Durable unapproved fragment, reused by handle during final assembly. */
interface WorkflowUxReviewPart extends WorkflowUxReviewFragment {
	/** Identifies the current fragment format. */
	kind: 'ux-review-part';
	/** Frozen binding, injected by code from the assigned subject. */
	subject: WorkflowUxReviewSubject;
}

/** Independent reviewer's conclusion.
 * - **"pass"** - No blocking findings; still requires exact authoritative validation.
 * - **"revise"** - Corrections are required before UI may proceed.
 */
type WorkflowUxReviewVerdict = 'pass' | 'revise';

/** Ordered fragment assembly without model-generated replacement content. */
interface WorkflowUxReviewAssembly {
	/** Exact assigned source and scope binding. */
	subject: WorkflowUxReviewSubject;
	/** Authorized immutable fragments resolved from handles by the server. */
	parts: WorkflowUxReviewPart[];
	/** Semantic verdict authored by the independent reviewer. */
	verdict: WorkflowUxReviewVerdict;
	/** Concise reviewer-authored conclusion. */
	summary: string;
}

/** Exact authoritative file inputs for a review gate. */
interface WorkflowUxReviewFiles {
	/** Persisted UX file; must be assigned when used by a specialist. */
	uxPath: string;
	/** Human-owned source path; defaults to the run source. */
	productDescriptionPath?: string;
	/** Explicit source identity when multiple descriptions are present. */
	productDescriptionId?: string;
	/** Canonical source root; defaults to the UX file directory. */
	sourceRoot?: string;
	/** Complete review scope. */
	scopeRefs: string[];
}

/** Materialized authoritative inputs consumed by the maintained review validator. */
interface WorkflowUxReviewValidation {
	/** Canonical UX object loaded from the exact persisted file. */
	uxSpec: Record<string, WorkflowJson>;
	/** Exact persisted UX bytes. */
	uxSource: Buffer;
	/** Absolute persisted UX path. */
	uxArtifactPath: string;
	/** Exact human-authored source bytes. */
	productDescriptionSource: Buffer;
	/** Absolute human-authored source path. */
	productDescriptionPath: string;
	/** Explicit source identity when supplied by the parent. */
	productDescriptionId?: string;
	/** Workspace-confined root for canonical source verification. */
	sourceRoot: string;
	/** Requested review scope. */
	scopeRefs: string[];
	/** Required scope, matching the request exactly. */
	requiredScopeRefs: string[];
}
