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
