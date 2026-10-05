/** Caller-owned locations and selected model for a per-launch catalog. */
type NativeWorkflowCatalogOptions = {
	/** Current Codex catalog file, read without modification. */
	sourcePath: string;
	/** Workspace scratch directory owning generated catalog snapshots. */
	directory: string;
	/** Exact model slug; no replacement or default is selected. */
	model: string;
};

/** Nonsecret receipt identifying the precise catalog used for one launch. */
type NativeWorkflowCatalogReceipt = {
	/** Absolute generated catalog path. */
	path: string;
	/** SHA-256 of generated UTF-8 bytes. */
	sha256: string;
	/** SHA-256 of the original cached bytes. */
	sourceSha256: string;
	/** Model whose native transport switches were selected. */
	model: string;
	/** Names of selected-model fields changed by preparation. */
	changedFields: string[];
};
/** Exact currently available artifact identity, supplied by the parent coordinator. */
type DesignPlanBinding = {
	/** Stage-qualified output or authoritative source reference. */
	ref: string;
	/** SHA-256 digest of existing bytes; placeholders are invalid. */
	digest: string;
};
/** Future input whose actual digest is bound after producer acceptance. */
type DesignPlanFutureInput = {
	/** Stable producing work item identity. */
	producer: string;
	/** Stage-qualified output owned by that producer. */
	output: string;
};
/** Exact existing input or a future producer/output pair, never a guessed digest. */
type DesignPlanInput = DesignPlanBinding | DesignPlanFutureInput;
/** Bounded operational work stages.
 * - **"parser"** - Parent source interpretation.
 * - **"research"** - Coordinated UX or UI research.
 * - **"planner"** - Parent work decomposition.
 * - **"ux"** - UX authoring.
 * - **"ui"** - UI authoring after whole-UX review.
 * - **"review"** - Independent exact-subject review.
 * - **"assembly"** - Parent assembly and promotion.
 */
type DesignPlanStage = 'parser' | 'research' | 'planner' | 'ux' | 'ui' | 'review' | 'assembly';
/** Permitted participants with parent-only source/planning/assembly authority.
 * - **"parent"** - Coordinator source, planning or assembly operation.
 * - **"product-researcher"** - Product and UX evidence handoff.
 * - **"ui-researcher"** - Presentation evidence handoff.
 * - **"ux-planner"** - Scoped UX proposal author.
 * - **"ui-designer"** - Scoped UI proposal author.
 * - **"ux-reviewer"** - Independent UX assessment.
 * - **"ui-design-reviewer"** - Independent UI assessment.
 */
type DesignPlanRole =
	| 'parent'
	| 'product-researcher'
	| 'ui-researcher'
	| 'ux-planner'
	| 'ui-designer'
	| 'ux-reviewer'
	| 'ui-design-reviewer';
/** Operational work item referencing existing canonical identities without reproducing the UX graph. */
type DesignPlanItem = {
	/** Stable work identity across execution attempts. */
	id: string;
	/** Required specialty or parent operation. */
	role: DesignPlanRole;
	/** Work phase constraining permitted role. */
	stage: DesignPlanStage;
	/** Existing scope identities registered in the plan. */
	scopeRefs: string[];
	/** Requested outcomes addressed by this work. */
	outcomeIds: string[];
	/** Uniquely owned, stage-qualified output references. */
	owns: string[];
	/** Prerequisite work requiring current acceptance. */
	dependsOn: string[];
	/** Exact external identities or deferred producer/output references. */
	inputs: DesignPlanInput[];
	/** Required independent review gate IDs. */
	requiredGates: string[];
	/** Owner decisions preventing dispatch until resolved by a revised plan. */
	unresolved: string[];
	/** Reviewed author IDs; present only for review work. */
	reviewOf?: string[];
};
/** Authoritative requested outcome, checked separately against parent source interpretation. */
type DesignPlanOutcome = {
	/** Stable source outcome identity. */
	id: string;
	/** Source artifact references supporting this request. */
	sourceRefs: string[];
};
/** Explicit scope exclusion retaining its owner-provided justification. */
type DesignPlanGap = {
	/** Stable gap identity. */
	id: string;
	/** Outcomes held or excluded by this gap. */
	outcomeIds: string[];
	/** Concrete justification; semantic adequacy remains parent-assessed. */
	reason: string;
};
/** Independent review requirement bound to actual immutable review subjects. */
type DesignPlanGate = {
	/** Stable gate identity. */
	id: string;
	/** Independent reviewer work item whose validated receipt satisfies the gate. */
	reviewerItemId: string;
	/** Actual review scope identities; whole-ux enforces the initial phase barrier. */
	scopeRefs: string[];
	/** Exact subjects matching reviewer assignment inputs. */
	inputs: DesignPlanInput[];
};
/** Addressable operational plan record. */
type DesignPlanRecord = DesignPlanItem | DesignPlanOutcome | DesignPlanGap | DesignPlanGate;
/** Parent-owned saved operational decomposition, separate from canonical UX/UI schemas. */
type DesignPlanDocument = {
	/** Supported operational contract version. */
	schemaVersion: string;
	/** Stable plan identity. */
	id: string;
	/** Positive revision changed when scope or bindings change. */
	revision: number;
	/** Existing immutable authoritative inputs. */
	sources: DesignPlanBinding[];
	/** Known existing canonical scope identities. */
	scopeRefs: string[];
	/** Full requested outcome accounting. */
	outcomes: DesignPlanOutcome[];
	/** Explicit justified gaps rather than silently omitted scope. */
	gaps: DesignPlanGap[];
	/** Uniquely owned dependency graph. */
	items: DesignPlanItem[];
	/** Independent exact-subject review requirements. */
	gates: DesignPlanGate[];
};
/** Coordinator-validated result, never a worker's self-issued acceptance. */
type DesignPlanAccepted = {
	/** Actual contributing agent identity used to exclude self-review. */
	agentId: string;
	/** Complete owned outputs and their actual bytes. */
	outputs: DesignPlanBinding[];
	/** Exact inputs retained from the claimed attempt. */
	inputs: DesignPlanBinding[];
};
/** Existing-validator-confirmed review receipt; this contract does not authenticate raw receipts. */
type DesignPlanGateReceipt = {
	/** Durable existing review receipt location or identity. */
	receiptRef: string;
	/** Actual independent reviewer agent identity. */
	reviewerAgentId: string;
	/** Exact artifact bindings included in the reviewed frozen subject. */
	subjectBindings: DesignPlanBinding[];
	/** Actual immutable subject digest confirmed by the existing validator. */
	subjectDigest: string;
	/** Digest of the validated saved receipt bytes. */
	receiptDigest: string;
};
/** Readiness inputs from trusted coordinator state and current source inspection. */
type DesignPlanState = {
	/** Currently available external source bindings; empty until inspected. */
	bindings?: DesignPlanBinding[];
	/** Parent-validated current accepted results keyed by work identity. */
	accepted?: Record<string, DesignPlanAccepted>;
	/** Existing-validator-confirmed independent review receipts keyed by gate. */
	gates?: Record<string, DesignPlanGateReceipt>;
	/** Independently derived requested source outcome checklist. */
	requestedOutcomeIds?: string[];
};
/** Actionable structural finding or semantic planning notice. */
type DesignPlanFinding = {
	/** Stable diagnostic category. */
	code: string;
	/** Owning field or item identity. */
	path: string;
	/** Concrete repair or judgment required. */
	message: string;
};
/** Independent coverage projection for one source outcome. */
type DesignPlanCoverage = {
	/** Requested source outcome identity. */
	outcomeId: string;
	/** Work items addressing the outcome. */
	itemIds: string[];
	/** Explicit justified gaps accounting for excluded work. */
	gapIds: string[];
};
/** Operational contract validation independent of dispatch or canonical writes. */
type DesignPlanValidation = {
	/** Whether structural acceptance checks passed. */
	valid: boolean;
	/** Blocking malformed contract findings. */
	findings: DesignPlanFinding[];
	/** Planner judgments still needed; unique IDs do not prove semantic independence. */
	notices: DesignPlanFinding[];
	/** Source coverage checklist over declared outcomes. */
	coverage: DesignPlanCoverage[];
};
/** Derived eligibility rather than a persisted authoritative ready flag.
 * - **"ready"** - Current bindings, prerequisites and review gates permit claiming.
 * - **"blocked"** - Missing, stale or unresolved prerequisite prevents execution.
 * - **"accepted"** - Parent-validated current result remains supported.
 */
type DesignPlanItemStatus = 'ready' | 'blocked' | 'accepted';
/** Inspectable current ownership and prerequisite view. */
type DesignPlanItemInspection = {
	/** Stable work identity. */
	id: string;
	/** Required worker specialty. */
	role: DesignPlanRole;
	/** Operational phase. */
	stage: DesignPlanStage;
	/** Output ownership. */
	owns: string[];
	/** Accepted prerequisite work IDs. */
	dependsOn: string[];
	/** Eligibility derived from current coordinator state. */
	status: DesignPlanItemStatus;
	/** Concrete reasons this item cannot proceed. */
	blockers: DesignPlanFinding[];
};
/** Deterministic validation plus current work eligibility. */
type DesignPlanInspection = DesignPlanValidation & {
	/** Work items in stable plan order. */
	items: DesignPlanItemInspection[];
	/** Exactly eligible identities in stable plan order. */
	ready: string[];
};

/** Durable work attempt phases.
 * - **"intent"** - Assignment saved before worker launch.
 * - **"running"** - Positively observed live worker.
 * - **"uncertain"** - Worker liveness unavailable; redispatch prohibited.
 * - **"delivered"** - Saved result awaiting parent validation.
 * - **"accepted"** - Existing-validator-confirmed result.
 * - **"failed"** - Explicit failure permits replacement.
 * - **"stale"** - Changed binding invalidates this attempt.
 */
type DesignCoordinatorAttemptStatus =
	'intent' | 'running' | 'uncertain' | 'delivered' | 'accepted' | 'failed' | 'stale';
/** Nonsecret saved delivery, distinct from canonical acceptance. */
type DesignCoordinatorSavedDelivery = {
	/** Owned immutable output identities, possibly partial before repair. */
	outputs: DesignPlanBinding[];
	/** Saved result path or opaque handle, never an access capability. */
	resultRef: string;
};
/** One current attempt with immutable dispatch context. */
type DesignCoordinatorAttempt = {
	/** Unique identity distinguishing replacement attempts. */
	id: string;
	/** Work item owned by this attempt. */
	itemId: string;
	/** Assigned agent used for result ownership and review independence. */
	agentId: string;
	/** Required specialty copied from the validated plan. */
	role: DesignPlanRole;
	/** Assigned existing canonical scopes. */
	scopeRefs: string[];
	/** Actual input revisions bound before dispatch. */
	inputs: DesignPlanBinding[];
	/** Operational lifecycle, never a canonical review decision. */
	status: DesignCoordinatorAttemptStatus;
	/** Nonsecret worker identity established after launch. */
	workerRef?: string;
	/** Saved unaccepted worker output. */
	delivery?: DesignCoordinatorSavedDelivery;
};
/** Complete current operational snapshot; tokens and MCP capabilities are excluded. */
type DesignCoordinatorState = {
	/** Supported durable operational format. */
	format: string;
	/** Monotonic compare-and-swap revision. */
	revision: number;
	/** Validated parent-owned decomposition. */
	plan: DesignPlanDocument;
	/** Digest of exact saved plan JSON. */
	planDigest: string;
	/** Observed current external artifact identities. */
	bindings: DesignPlanBinding[];
	/** Current attempt for each item, older attempts retained in history. */
	attempts: Record<string, DesignCoordinatorAttempt>;
	/** Parent-validated contributions, distinct from deliveries. */
	accepted: Record<string, DesignPlanAccepted>;
	/** Existing-validator-confirmed exact review gates. */
	gates: Record<string, DesignPlanGateReceipt>;
	/** Ordered nonsecret transition evidence. */
	history: Record<string, unknown>[];
	/** Saved canonical-write intents inspected before any uncertain retry. */
	promotions?: Record<string, DesignCoordinatorPromotion>;
};
/** Validated plan and currently observed authoritative inputs. */
type DesignCoordinatorInitialization = {
	/** Parent-approved operational plan. */
	plan: DesignPlanDocument;
	/** Concrete current source identities. */
	bindings: DesignPlanBinding[];
};
/** Synchronous internal transition under the exclusive writer lock. */
type DesignCoordinatorMutation = (state: DesignCoordinatorState) => void;
/** Current persisted snapshot with freshly derived eligible and uncertain work. */
type DesignCoordinatorInspection = DesignPlanInspection & {
	/** Verified state loaded from disk. */
	state: DesignCoordinatorState;
	/** Unknown-liveness assignment IDs requiring observation before replacement. */
	uncertain: string[];
};
/** Exact current operational revision for every state-changing command. */
type DesignCoordinatorRevision = {
	/** Observed monotonic state revision. */
	expectedRevision: number;
};
/** Claim saved durably before an external worker is launched. */
type DesignCoordinatorClaim = DesignCoordinatorRevision & {
	/** Ready work identity. */
	itemId: string;
	/** Actual assigned worker identity. */
	agentId: string;
};

/** Exact worker claim for a synchronous existing-store action. */
type DesignCoordinatorClaimGuard = {
	/** Durable owned item identity. */
	itemId: string;
	/** Exact current attempt identity. */
	attemptId: string;
	/** Parent-observed worker identity. */
	agentId: string;
};

/** Synchronous parent action performed while coordinator writer lock is held. */
type DesignCoordinatorClaimAction = (context: DesignCoordinatorValidationRequest) => unknown;

/** Parent-only workflow adapter configuration; never persisted. */
type DesignWorkflowOptions = {
	/** Optional early author preparation ledger; parent supplies it after independent initialization. */
	preparation?: DesignPreparationLedger;
	/** Actual current product/run scope for retained files; defaults to run and cannot override a service run. */
	preparationScope?: string;
	/** Resident scoped assignment service. */
	service?: DesignWorkflowService;
	/** App-owned durable operational coordinator. */
	coordinator: DesignWorkflowCoordinator;
	/** Already opened workflow run identity. */
	run: string;
	/** Observes exact current file/unit identities synchronously, in the assigned input order. */
	resolveInputs: (context: DesignCoordinatorValidationRequest) => DesignPlanBinding[];
};

/** Parent capability issuer consumed by the durable-claim adapter. */
interface DesignWorkflowService {
	/** Secret owner capability retained in parent memory. */
	readonly ownerAccess: string;
	/** Mints a bounded volatile assignment. */
	assign(request: WorkflowAssignmentRequest): WorkflowAssignmentReceipt;
	/** Binds synchronous claim authority before worker handoff. */
	bindAssignmentGuard(request: WorkflowAssignmentGuardRequest): void;
	/** Invalidates a volatile worker token and its queued operations. */
	revokeAssignment(request: WorkflowAssignmentRevocation): void;
}

/** Exact durable-claim authority consumed by the parent adapter. */
interface DesignWorkflowCoordinator {
	/** Persists exact ready-work intent before author dispatch. */
	claim(request: DesignCoordinatorClaim): DesignCoordinatorState;
	/** Reads verified persisted plan and attempt state. */
	open(): DesignCoordinatorState;
	/** Holds the coordinator lock across one synchronous existing-store action. */
	withClaim(request: DesignCoordinatorClaimGuard, action: DesignCoordinatorClaimAction): unknown;
}

/** Volatile parent request to revoke an adapter-issued assignment. */
type DesignWorkflowRevocation = {
	/** Secret worker token, never persisted. */
	access: string;
};

/** Parent-created bounded author or reviewer capability request. */
type DesignWorkflowAssignment = DesignCoordinatorClaimGuard & {
	/** Managed preparation record bound by the parent prepared-assignment route. */
	preparedAuthorId?: string;
	/** Already saved workflow input handles. */
	handles?: string[];
	/** Exact input file grants. */
	readPaths?: string[];
	/** Assigned proposal directory; canonical persistence remains parent-owned. */
	outputDirectory?: string | null;
	/** Existing exact subject for an independent UX reviewer. */
	reviewSubject?: WorkflowUxReviewSubject;
	/** Parent-bound exact wireframe element IDs for UI units. */
	wireframeElementIds?: string[];
};

/** Reconciled surviving attempt with positive parent liveness evidence. */
type DesignWorkflowRefresh = DesignWorkflowAssignment & {
	/** Current exact live observation; unknown does not renew authority. */
	observation: DesignCoordinatorObservation;
};

/** Synthetic native-store fixture configuration. */
type DesignWorkflowTestOptions = {
	/** Maintained operation catalog, optionally with a controlled wait barrier. */
	operations?: Record<string, WorkflowOperation>;
};

/** Workflow service capabilities exercised by native integration scenarios. */
interface DesignWorkflowTestService extends DesignWorkflowService {
	/** Opens a run with immutable source paths. */
	open(request: WorkflowOpenRequest): WorkflowRunReceipt;
	/** Executes synchronous or queued domain operations. */
	execute(request: WorkflowExecuteRequest): Promise<WorkflowResultReceipt>;
	/** Saves an assigned proposal without canonical authority. */
	store(request: WorkflowStoreRequest): WorkflowResultReceipt;
	/** Settles accepted operations before cleanup. */
	drain(): Promise<void>;
}

/** Durable coordinator operations used by native workflow scenarios. */
interface DesignWorkflowTestCoordinator extends DesignWorkflowCoordinator {
	/** Revises operational ownership while retaining current accepted native outputs. */
	revise(request: DesignCoordinatorRevisionRequest): DesignCoordinatorState;
	/** Saves dispatch intent before issuing an assignment. */
	claim(request: DesignCoordinatorClaim): DesignCoordinatorState;
	/** Records observed delivery independently from acceptance. */
	deliver(request: DesignCoordinatorDelivery): DesignCoordinatorState;
	/** Accepts exact saved native outputs through a parent validator. */
	accept(request: DesignCoordinatorAcceptance, validate: DesignCoordinatorValidator): Promise<DesignCoordinatorState>;
	/** Reconciles saved attempts with current parent observations. */
	reconcile(request: DesignCoordinatorReconciliation): DesignCoordinatorState;
	/** Records positive worker failure before replacement. */
	fail(request: DesignCoordinatorFailure): DesignCoordinatorState;
	/** Inspects the current exclusive writer lock. */
	lockInfo(): DesignCoordinatorLock | null;
}

/** Parent adapter authority for exact scoped workers and retained file delivery. */
interface DesignWorkflowAdapter {
	/** Authorizes the existing parent-owned native file route without a service token. */
	authorizePreparedFile(request: DesignWorkflowPreparedAssignment): DesignPreparationState;
	/** Holds both preparation and native coordinator locks across a file mutation. */
	withPreparedClaim(request: DesignWorkflowPreparedGuard, action: DesignCoordinatorClaimAction): unknown;
	/** Saves preparation intent before the ordinary exact operational claim. */
	claimPrepared(request: DesignWorkflowPreparedClaim): DesignCoordinatorClaimGuard;
	/** Issues guarded author authority only after exact preparation binding. */
	assignPrepared(request: DesignWorkflowPreparedAssignment): WorkflowAssignmentReceipt;
	/** Revokes prior authority and verifies resolution plus positive stop before reuse. */
	releasePrepared(request: DesignWorkflowPreparedRelease): DesignPreparationState;
	/** Issues a guarded exact saved assignment. */
	assign(request: DesignWorkflowAssignment): WorkflowAssignmentReceipt;
	/** Renews authority after exact positive reconciliation. */
	refresh(request: DesignWorkflowRefresh): WorkflowAssignmentReceipt;
	/** Invalidates an owned worker capability. */
	revoke(request: DesignWorkflowRevocation): void;
	/** Holds the exact claim across a synchronous native operation. */
	withClaim(request: DesignCoordinatorClaimGuard, action: DesignCoordinatorClaimAction): unknown;
}

/** Isolated synthetic two-flow native-store integration fixture. */
type DesignWorkflowTestFixture = {
	/** Exact owned temporary workspace. */
	directory: string;
	/** Real scoped service with maintained operations. */
	service: DesignWorkflowTestService;
	/** Stable run locations and identity. */
	run: WorkflowRunReceipt;
	/** Existing UX native units directory. */
	store: string;
	/** Persisted synthetic operational state. */
	coordinator: DesignWorkflowTestCoordinator;
	/** Parent-only exact assignment adapter. */
	adapter: DesignWorkflowAdapter;
	/** Synthetic shared, alpha and beta native references. */
	refs: Record<string, string>;
	/** Saves an exact test worker claim. */
	claim: (itemId: string) => DesignCoordinatorClaimGuard;
	/** Observes actual current source and native unit identities. */
	resolveInputs: (context: DesignCoordinatorValidationRequest) => DesignPlanBinding[];
	/** Synthetic human-owned description path. */
	sourcePath: string;
};

/** Exact-subject deterministic reviewer branch fixture; no live quality claim. */
type DesignWorkflowReviewTestFixture = DesignWorkflowTestFixture & {
	/** Exact saved source-bound UX path. */
	uxPath: string;
	/** Existing immutable review subject. */
	subject: WorkflowUxReviewSubject;
	/** Current independent reviewer claim. */
	claimRequest: DesignCoordinatorClaimGuard;
	/** Adapter-issued reviewer capability. */
	assignment: WorkflowAssignmentReceipt;
	/** Actual saved assembled review receipt. */
	receipt: WorkflowResultReceipt;
	/** Existing-schema deterministic receipt decoded from saved bytes. */
	review: Record<string, WorkflowJson>;
	/** Actual exact file options used by the maintained validator. */
	reviewOptions: WorkflowUxReviewValidation;
};
/** Exact current attempt, excluding late results from replaced workers. */
type DesignCoordinatorAcceptance = DesignCoordinatorRevision & {
	/** Work item receiving its current result. */
	itemId: string;
	/** Expected unique attempt identity. */
	attemptId: string;
};
/** Launch confirmation without persisted process-local capabilities. */
type DesignCoordinatorDispatch = DesignCoordinatorAcceptance & {
	/** Live assignment identity safe for durable storage. */
	workerRef: string;
};
/** Worker delivery ingress with exact actor and saved output identities. */
type DesignCoordinatorDelivery = DesignCoordinatorAcceptance &
	DesignCoordinatorSavedDelivery & {
		/** Actual delivering actor, matching the claimed assignment. */
		agentId: string;
	};
/** Existing artifact-validator inputs, isolated from the mutable saved snapshot. */
type DesignCoordinatorValidationRequest = {
	/** Validated assigned work item. */
	item: DesignPlanItem;
	/** Exact saved delivery and immutable dispatch identities. */
	attempt: DesignCoordinatorAttempt;
	/** Current state before asynchronous validation. */
	state: DesignCoordinatorState;
};
/** Parent-confirmed outputs and optional independent review receipts. */
type DesignCoordinatorValidatedResult = {
	/** Exact outputs verified through the existing artifact validation route. */
	outputs: DesignPlanBinding[];
	/** Optional existing-validator-confirmed gates owned by this reviewer. */
	gates?: Record<string, DesignPlanGateReceipt>;
};
/** Parent capability preserving existing artifact and independent review validation. */
type DesignCoordinatorValidator = (
	request: DesignCoordinatorValidationRequest,
) => Promise<DesignCoordinatorValidatedResult> | DesignCoordinatorValidatedResult;
/** Current live-worker observation outcomes.
 * - **"live"** - Assignment positively observed active.
 * - **"failed"** - Assignment positively observed terminated without usable result.
 * - **"unknown"** - Available host cannot establish assignment liveness.
 */
type DesignCoordinatorObservationStatus = 'live' | 'failed' | 'unknown';
/** Observed assignment identity; absence is uncertainty rather than failure. */
type DesignCoordinatorObservation = {
	/** Exact saved attempt observed by the host. */
	attemptId: string;
	/** Actual observed worker actor. */
	agentId: string;
	/** Positive observation or explicit uncertainty. */
	status: DesignCoordinatorObservationStatus;
	/** Optional nonsecret host assignment reference. */
	workerRef?: string;
};
/** Host observations used to reconcile saved dispatch intent after restart. */
type DesignCoordinatorReconciliation = DesignCoordinatorRevision & {
	/** Current available observations; missing attempts remain uncertain. */
	observations: DesignCoordinatorObservation[];
};
/** Explicit worker failure permitting an owned replacement attempt. */
type DesignCoordinatorFailure = DesignCoordinatorAcceptance & {
	/** Positive observed failure evidence, not an inferred timeout. */
	reason: string;
};
/** Changed exact artifact identities requiring transitive invalidation. */
type DesignCoordinatorInvalidation = DesignCoordinatorRevision & {
	/** Complete currently observed external artifact identities. */
	bindings: DesignPlanBinding[];
	/** Additional known changed output identities. */
	changedRefs?: string[];
};
/** Reinterpreted source-bound plan revision with updated exact inputs. */
type DesignCoordinatorRevisionRequest = DesignCoordinatorInitialization & DesignCoordinatorRevision;
/** Canonical-write recovery outcomes.
 * - **"intent"** - Desired existing-writer transition saved before the write.
 * - **"committed"** - Current target bytes match the intended new digest.
 * - **"retryable"** - Target unchanged and source contributions still current.
 * - **"uncertain"** - Canonical state differs or contributions became stale.
 * - **"retired"** - Exact parent observation confirms the old writer absent or stopped.
 */
type DesignCoordinatorPromotionStatus = 'intent' | 'committed' | 'retryable' | 'uncertain' | 'retired';
/** Existing-writer operation intent; this object confers no write authority. */
type DesignCoordinatorPromotion = {
	/** Existing canonical artifact target identity. */
	targetRef: string;
	/** Previously observed target digest for existing-writer CAS. */
	expectedDigest: string;
	/** Exact desired resulting artifact bytes. */
	nextDigest: string;
	/** Accepted contributions supplying the assembly. */
	itemIds: string[];
	/** Exact accepted actor, attempt, input and output identities at intent creation. */
	contributions: DesignCoordinatorPromotionContribution[];
	/** Recovery classification derived from actual target observations. */
	status: DesignCoordinatorPromotionStatus;
	/** Optional parent-confirmed evidence releasing an obsolete target intent. */
	retirement?: DesignCoordinatorPromotionRetirement;
};
/** Canonical promotion intent saved before calling the existing writer. */
type DesignCoordinatorPromotionIntent = DesignCoordinatorRevision &
	Omit<DesignCoordinatorPromotion, 'status' | 'contributions' | 'retirement'> & {
		/** Unique operation identity preventing accidental duplicate promotion. */
		promotionId: string;
	};
/** Actual canonical artifact inspection after an interrupted write. */
type DesignCoordinatorPromotionObservation = DesignCoordinatorRevision & {
	/** Saved operation identity to reconcile. */
	promotionId: string;
	/** Currently inspected exact target bytes, never a transport receipt. */
	observedDigest: string;
};
/** Immutable accepted contribution identity authorizing one saved promotion intent. */
type DesignCoordinatorPromotionContribution = DesignPlanAccepted & {
	/** Exact contributing work item identity. */
	itemId: string;
	/** Accepted execution attempt whose immutable bytes supply this promotion. */
	attemptId: string;
};
/** Writer observation outcomes controlling retirement authority.
 * - **"stopped"** - Old writer positively observed stopped.
 * - **"absent"** - Old writer positively established absent.
 * - **"unknown"** - Writer liveness unavailable; target remains blocked.
 */
type DesignCoordinatorWriterStatus = 'stopped' | 'absent' | 'unknown';
/** Parent-verified exact target bytes and prior writer liveness. */
type DesignCoordinatorPromotionRetirement = {
	/** Saved observation evidence location, never a process-local capability. */
	receiptRef: string;
	/** Current exact canonical target byte identity confirmed by the parent. */
	observedDigest: string;
	/** Positive liveness evidence; unknown cannot retire an operation. */
	writerStatus: DesignCoordinatorWriterStatus;
};
/** Immutable old promotion and exact current target inspection sent to the parent verifier. */
type DesignCoordinatorPromotionVerification = {
	/** Old saved operation identity. */
	promotionId: string;
	/** Original immutable contribution and write intent. */
	promotion: DesignCoordinatorPromotion;
	/** Exact currently observed canonical target bytes. */
	observedDigest: string;
};
/** Parent-owned writer observation capability; it performs no canonical write. */
type DesignCoordinatorPromotionVerifier = (
	request: DesignCoordinatorPromotionVerification,
) => Promise<DesignCoordinatorPromotionRetirement> | DesignCoordinatorPromotionRetirement;
/** Exclusive writer identity retained only for ownership-aware crash recovery. */
type DesignCoordinatorLock = {
	/** Local OS process owning the synchronous writer transition. */
	pid: number;
	/** Unique nonsecret lock identity guarding exact recovery. */
	token: string;
};
/** Isolated fake-worker scenario using synthetic plan inputs. */
type DesignCoordinatorTestScenario = {
	/** Scratch directory cleaned at scenario completion. */
	directory: string;
	/** Synthetic source-bound operational plan. */
	plan: DesignPlanDocument;
};
/** Minimal Node test cleanup capability used by isolated coordinator scenarios. */
interface DesignCoordinatorTestContext {
	/** Call this method to register owned scratch cleanup after the scenario. */
	after(cleanup: () => void): void;
}

/** Parent-owned native visual-review inputs; each file is reobserved read-only. */
type DesignUiReviewInputs = {
	/** Absolute owning run root for authoritative source and rendered evidence. */
	sourceRoot: string;
	/** Authoritative human description, absolute or relative to sourceRoot. */
	productDescriptionPath: string;
	/** Frozen canonical UX file. */
	uxPath: string;
	/** Existing passing exact whole-UX receipt. */
	uxReviewPath: string;
	/** Saved canonical design-language file. */
	designLanguagePath: string;
	/** Saved canonical composition schema 0.4 file. */
	uiPath: string;
	/** Parent-frozen render and actual screenshot manifest. */
	renderEvidencePath: string;
	/** All parent-observed authors; none may review this output. */
	authorAgentIds: string[];
	/** Exact independent in-session reviewer identity assigned by the parent. */
	reviewerAgentId: string;
	/** Required canonical scene IDs; defaults to all scenes. */
	requiredSceneRefs?: string[];
	/** Required actual screenshot IDs; defaults to the entire manifest. */
	requiredScreenshotRefs?: string[];
	/** Optional reusable research/evidence files, relative to supportingRoot. */
	supportingPaths?: string[];
	/** Explicit trusted absolute product-owned supporting root; defaults to sourceRoot. */
	supportingRoot?: string;
	/** Confined renderer output directory; defaults to the directory containing uiPath. */
	renderBasePath?: string;
	/** True selects the existing prepared-wireframe route; native helper rejects it. */
	wireframePrepared?: boolean;
	/** Presence selects the existing wireframe route; never waived by this helper. */
	preparedWireframeRunPath?: string;
};

/** Parent-frozen manifest row for one actual screenshot. */
type DesignUiReviewScreenshotEvidence = {
	/** Unique stable screenshot reference assigned before review. */
	ref: string;
	/** Existing canonical UI scene identity. */
	sceneRef: string;
	/** Actual PNG/JPEG/WebP file relative to sourceRoot. */
	path: string;
};

/** Actual HTML render with its matching capture references. */
type DesignUiReviewRenderEvidence = {
	/** Canonical scene rendered by this declared request. */
	sceneRef: string;
	/** Rendered HTML file relative to sourceRoot. */
	path: string;
	/** Actual captures of this rendered scene. */
	screenshotRefs: string[];
};

/** Operational render manifest; hashes bind exact saved file bytes. */
type DesignUiReviewEvidence = {
	/** SHA256 of exact canonical UI file bytes, not normalized JSON. */
	uiSha256: string;
	/** SHA256 of exact frozen UX file bytes. */
	uxSha256: string;
	/** SHA256 of exact saved design-language file bytes. */
	designLanguageSha256: string;
	/** Every required-scene declared render, including variants. */
	renders: DesignUiReviewRenderEvidence[];
	/** Actual saved screenshot files and scene associations. */
	screenshots: DesignUiReviewScreenshotEvidence[];
};

/** Stable read-only file observation under its declared owning root. */
type DesignUiReviewFileIdentity = {
	/** Root-relative portable file path. */
	path: string;
	/** SHA256 of actual read bytes. */
	sha256: string;
	/** Actual file size in bytes. */
	bytes: number;
};

/** File identity and bytes retained only during synchronous validation. */
type DesignUiReviewObservation = {
	/** Actual observed file bytes, never copied through a model. */
	bytes: Buffer;
	/** Stable root-relative identity. */
	identity: DesignUiReviewFileIdentity;
};

/** Actual observed render and exact matching screenshot references. */
type DesignUiReviewRenderIdentity = DesignUiReviewRenderEvidence & DesignUiReviewFileIdentity;

/** Actual observed screenshot image and scene association. */
type DesignUiReviewScreenshotIdentity = DesignUiReviewScreenshotEvidence & DesignUiReviewFileIdentity;

/** Exact immutable native visual-review subject derived from current bytes. */
type DesignUiReviewSubject = {
	/** Operational subject version; not a replacement canonical UI schema. */
	format: 'design-ui-review-subject/1';
	/** Parent-owned absolute authoritative run root. */
	sourceRoot: string;
	/** Parent-owned absolute reusable research/evidence root. */
	supportingRoot: string;
	/** Authoritative human source identity. */
	source: DesignUiReviewFileIdentity;
	/** Frozen canonical UX identity. */
	ux: DesignUiReviewFileIdentity;
	/** Current exact passing UX review file identity. */
	uxReview: DesignUiReviewFileIdentity;
	/** Current design-language identity. */
	designLanguage: DesignUiReviewFileIdentity;
	/** Current canonical UI identity. */
	ui: DesignUiReviewFileIdentity;
	/** Exact parent-frozen render manifest identity. */
	renderEvidence: DesignUiReviewFileIdentity;
	/** Actual rendered request identities. */
	renders: DesignUiReviewRenderIdentity[];
	/** Actual current renderer index, shared CSS, report and copied asset identities. */
	renderSupporting: DesignUiReviewFileIdentity[];
	/** Actual screenshot image identities. */
	screenshots: DesignUiReviewScreenshotIdentity[];
	/** Exact reused supporting research/verification file identities. */
	supporting: DesignUiReviewFileIdentity[];
	/** Parent-observed authors excluded from reviewing. */
	authorAgentIds: string[];
	/** Exact independent reviewer assignment. */
	reviewerAgentId: string;
	/** Complete required canonical scene scope. */
	requiredSceneRefs: string[];
	/** Complete required actual image-inspection scope. */
	requiredScreenshotRefs: string[];
	/** Canonical SHA256 of all preceding subject fields. */
	sha256: string;
};

/** Fresh subject and canonical materialized node references used for finding validation. */
type DesignUiReviewObservedSubject = {
	/** Exact current immutable input binding. */
	subject: DesignUiReviewSubject;
	/** Actual existing node IDs for each canonical scene. */
	nodesByScene: Map<string, Set<string>>;
};

/** Independently authored native UI review conclusion.
 * - **"pass"** - All required captures inspected, with no blocking findings.
 * - **"revise"** - Preserve judgment and findings; acceptance remains blocked.
 */
type DesignUiReviewVerdict = 'pass' | 'revise';

/** Visual issue impact assessed by the independent reviewer.
 * - **"blocking"** - Required outcome must be repaired before acceptance.
 * - **"advisory"** - Bounded improvement that does not block current acceptance.
 */
type DesignUiReviewSeverity = 'blocking' | 'advisory';

/** Scoped visual finding against an existing scene and optional concrete node. */
type DesignUiReviewFinding = {
	/** Existing scene within the required review scope. */
	sceneRef: string;
	/** Optional actual node ID in the materialized scene. */
	nodeRef?: string;
	/** Required repair impact. */
	severity: DesignUiReviewSeverity;
	/** Concrete observed problem, authored by the reviewer. */
	issue: string;
	/** Required product/interaction outcome after the smallest sufficient repair. */
	requiredOutcome: string;
};

/** Independent operational receipt; no transport-generated pass boolean. */
type DesignUiReviewReceipt = {
	/** Exact subject echoed unchanged by the assigned reviewer. */
	subject: DesignUiReviewSubject;
	/** Actual assigned reviewer identity. */
	reviewerAgentId: string;
	/** Independent qualitative conclusion preserved by validation. */
	verdict: DesignUiReviewVerdict;
	/** Actual screenshot references the reviewer inspected. */
	inspectedScreenshotRefs: string[];
	/** Concrete scoped issues; blocking findings forbid passing acceptance. */
	findings: DesignUiReviewFinding[];
	/** Reviewer-authored observed strengths. */
	strengths: string[];
	/** Reviewer-authored limitations; no fabricated measurements. */
	limits: string[];
};

/** Read-only native visual-review authority consumed by the parent coordinator. */
interface DesignUiReviewContract {
	/** Builds an exact current subject from authoritative files and actual image evidence. */
	subject(inputs: DesignUiReviewInputs): DesignUiReviewSubject;
	/** Reobserves current inputs and preserves the independent verdict. */
	validate(receipt: DesignUiReviewReceipt, inputs: DesignUiReviewInputs): DesignUiReviewReceipt;
	/** Requires a current independent passing receipt before a parent gate is accepted. */
	requirePassing(receipt: DesignUiReviewReceipt, inputs: DesignUiReviewInputs): DesignUiReviewReceipt;
}

/** Native visual-review fixture configuration for copied-output coverage. */
type DesignUiReviewTestOptions = {
	/** Includes an approved image and its actual generated copied output. */
	withAsset?: boolean;
};

/** Synthetic native visual-review fixture with real renderer output and tiny image files. */
type DesignUiReviewTestFixture = {
	/** Exact isolated task-root temporary directory. */
	directory: string;
	/** Explicit actual file and assignment inputs. */
	inputs: DesignUiReviewInputs;
	/** Parent-frozen render manifest used for missing-evidence tests. */
	evidence: DesignUiReviewEvidence;
	/** Read-only exact validator implementation. */
	helper: DesignUiReviewContract;
	/** Deterministic mock qualitative conclusion, not live visual evidence. */
	receipt: DesignUiReviewReceipt;
};
