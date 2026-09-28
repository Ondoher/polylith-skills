/** Current, finite JSON stored in a result handle. */
type WorkflowJson = null | boolean | number | string | WorkflowJson[] | {[key: string]: WorkflowJson};

/** Maintained subset of JSON Schema used at the MCP ingress. */
interface WorkflowSchema {
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
	/** Configured read-content ceiling in UTF-8 bytes; defaults to 7000. */
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
	/** Argument name to exact result handle, resolved server-side. */
	inputHandles?: Record<string, string>;
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
