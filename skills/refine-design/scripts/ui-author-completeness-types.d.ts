/** Exact-byte identity owned by the parent or recorded by the author. */
type UiAuthorIdentity = {
	/** Stable source or candidate identifier, scoped to this assignment. */
	readonly id: string;
	/** Lowercase SHA-256 of exact delivered file bytes; recomputed by the parent. */
	readonly sha256: string;
};

/** Concrete reference to a record in one exact upstream source. */
type UiAuthorSourceRef = {
	/** Identifier from the assignment's source identity inventory. */
	readonly sourceId: string;
	/** Exact source record reference, indexed by the parent. */
	readonly ref: string;
};

/** Current source identity and its parent-validated reference inventory. */
type UiAuthorCurrentSource = UiAuthorIdentity & {
	/** Unique references actually present in this source; never ledger assertions. */
	readonly refs: readonly string[];
};

/** Concrete scene or scene/node locator inside the exact current candidate. */
type UiAuthorEvidenceRef = {
	/** Existing candidate scene identifier. */
	readonly sceneId: string;
	/** Optional existing node identifier within the named scene. */
	readonly nodeId?: string;
};

/** Parent-validated candidate locator, ownership and exact upstream bindings. */
type UiAuthorCandidateReference = UiAuthorEvidenceRef & {
	/** Assignment scope owning this scene or node; may be outside this author's scope. */
	readonly scopeId: string;
	/** Exact upstream tuples expressed by native source-binding fields at this locator. */
	readonly sourceRefs: readonly UiAuthorSourceRef[];
};

/** Current exact-byte candidate identity and its validated native reference index. */
type UiAuthorCurrentCandidate = UiAuthorIdentity & {
	/** Unique scene/node locators materialized from the delivered candidate. */
	readonly references: readonly UiAuthorCandidateReference[];
};

/** Parent-authorized existing missing-component-detail exception. */
type UiAuthorPermittedGap = UiAuthorEvidenceRef & {
	/** Source-bound requirement allowed to remain a documented component gap. */
	readonly requirementId: string;
	/** Required existing component node within an existing required scene. */
	readonly nodeId: string;
	/** Exact documented reason accepted under the existing insufficient-detail exception. */
	readonly reason: string;
};

/** Requirement class restricting the existing component-detail exception.
 * - **"scene"** - Required scene; omission cannot become a component gap.
 * - **"component-detail"** - Detail of an already-placed insufficiently specified component.
 * - **"requirement"** - Other observable state, control, content or feedback obligation.
 */
type UiAuthorRequirementKind = 'scene' | 'component-detail' | 'requirement';

/** Honest author coverage classification.
 * - **"pending"** - Obligation awaiting author work or assessment.
 * - **"covered"** - Concrete current-candidate evidence claimed by the author.
 * - **"permitted-gap"** - Existing parent-authorized insufficient-component-detail exception.
 * - **"blocked"** - Unresolved obligation returned to its governing owner.
 */
type UiAuthorRequirementStatus = 'pending' | 'covered' | 'permitted-gap' | 'blocked';

/** Source-bound semantic obligation saved and reconciled by the same assigned author. */
type UiAuthorRequirement = {
	/** Unique stable requirement identifier, inherited from inputs where useful. */
	readonly id: string;
	/** One exact scope identifier owned by this author assignment. */
	readonly scopeId: string;
	/** Obligation class used to constrain component-gap eligibility. */
	readonly kind: UiAuthorRequirementKind;
	/** Nonempty exact source tuples grounding the obligation. */
	readonly sourceRefs: readonly UiAuthorSourceRef[];
	/** Concise required observable meaning or state; semantic correctness is author/reviewer-owned. */
	readonly meaning: string;
	/** Exact shared/upstream dependency references; empty when there are none. */
	readonly dependencyRefs: readonly UiAuthorSourceRef[];
	/** Current honest obligation disposition. */
	readonly status: UiAuthorRequirementStatus;
	/** Concrete current candidate locators; nonempty for covered and permitted-gap rows. */
	readonly evidenceRefs: readonly UiAuthorEvidenceRef[];
	/** Documented exception/blocking rationale; may be empty for covered or pending rows. */
	readonly reason: string;
};

/** Saved author claim that original accepted inputs were reread for missing ledger rows. */
type UiAuthorInputReinspection = {
	/** Author's completion claim; never a semantic completeness certificate. */
	readonly complete: boolean;
	/** Exact current upstream identity inventory inspected for undiscovered requirements. */
	readonly sourceIdentities: readonly UiAuthorIdentity[];
};

/** Saved all-row check bound to the complete final requirements and candidate. */
type UiAuthorFinalRecheck = {
	/** Author's completion claim; invalidated by changed rows or candidate identities. */
	readonly complete: boolean;
	/** Exact candidate checked, distinct from independent review acceptance. */
	readonly candidate: UiAuthorIdentity;
	/** Exact current upstream identities used during this check. */
	readonly sourceIdentities: readonly UiAuthorIdentity[];
	/** Every checked current requirement ID, without duplicates. */
	readonly requirementIds: readonly string[];
	/** SHA-256 returned by requirementsSha256 for the complete ordered requirement rows. */
	readonly requirementsSha256: string;
};

/** Concise author event category, preserving discoveries and correction effects.
 * - **"discovery"** - Obligation added during original-input reinspection.
 * - **"repair"** - Omission/regression repaired, including affected obligations.
 * - **"recheck"** - Recorded coverage reconciliation against current inputs/candidate.
 * - **"blocked"** - Upstream or shared-owner uncertainty identified.
 * - **"resume"** - Author resumed from persisted assignment, sources and ledger.
 */
type UiAuthorHistoryEventKind = 'discovery' | 'repair' | 'recheck' | 'blocked' | 'resume';

/** Concise durable correction/event record authored within the assigned scope. */
type UiAuthorHistoryEvent = {
	/** Actual recorded author activity category. */
	readonly event: UiAuthorHistoryEventKind;
	/** Existing requirements discovered, repaired or affected; may be empty for assignment resume. */
	readonly requirementIds: readonly string[];
	/** Concrete concise observation, correction and effect; timing lives in the owning run record. */
	readonly note: string;
};

/** Author delivery bookkeeping summary, independent of UI review acceptance.
 * - **"working"** - Author work/checks remain in progress.
 * - **"ready"** - Claimed exact-candidate author delivery readiness.
 * - **"blocked"** - Delivery awaits its governing owner's resolution.
 */
type UiAuthorDeliveryStatus = 'working' | 'ready' | 'blocked';

/** Closed companion ledger saved beside the authorized proposal/unit, outside UI schemas. */
type UiAuthorCompletenessLedger = {
	/** Exact contract version; currently 1.0 only. */
	readonly schemaVersion: string;
	/** Owning product identity supplied by the parent. */
	readonly productId: string;
	/** Owning product/run identity supplied by the parent. */
	readonly runId: string;
	/** Exact authorized assignment identity. */
	readonly assignmentId: string;
	/** Actual original or explicitly reassigned author identity. */
	readonly authorId: string;
	/** Nonempty exact parent-authorized ownership inventory. */
	readonly ownedScopeIds: readonly string[];
	/** Exact current upstream identity set, without duplicate source IDs. */
	readonly sources: readonly UiAuthorIdentity[];
	/** Exact current delivered proposal/unit identity; parent computes its file digest. */
	readonly candidate: UiAuthorIdentity;
	/** Nonempty source-bound obligations, expanded during input reinspection when needed. */
	readonly requirements: readonly UiAuthorRequirement[];
	/** Saved original-input reinspection claim and identities. */
	readonly inputReinspection: UiAuthorInputReinspection;
	/** Saved final all-row recheck claim bound to sources, candidate and complete rows. */
	readonly finalRecheck: UiAuthorFinalRecheck;
	/** Concise discoveries, repairs, rechecks, blockers and resumptions; empty is allowed. */
	readonly history: readonly UiAuthorHistoryEvent[];
	/** Honest author delivery summary, with unresolved obligations preventing ready. */
	readonly deliveryStatus: UiAuthorDeliveryStatus;
};

/** Closed current-context packet built by the parent independently of the author ledger. */
type UiAuthorCompletenessContext = {
	/** Current owning product identity. */
	readonly productId: string;
	/** Current owning product/run identity. */
	readonly runId: string;
	/** Current exact authorized assignment identity. */
	readonly assignmentId: string;
	/** Current actual authorized author identity. */
	readonly authorId: string;
	/** Exact nonempty assignment ownership inventory. */
	readonly ownedScopeIds: readonly string[];
	/** Sources rehashed from current delivered bytes with validated reference inventories. */
	readonly sources: readonly UiAuthorCurrentSource[];
	/** Candidate rehashed from current delivered bytes with validated native references. */
	readonly candidate: UiAuthorCurrentCandidate;
	/** Existing insufficient-component-detail exceptions authorized by the parent; empty is allowed. */
	readonly permittedGaps: readonly UiAuthorPermittedGap[];
	/** Optional already-known obligation IDs; empty/absent is valid and proves no semantic completeness. */
	readonly requiredRequirementIds?: readonly string[];
};

/** Pure structural/current-identity validation result. */
type UiAuthorCompletenessValidation = {
	/** True only for valid bookkeeping, including consistency of a ready summary. */
	readonly valid: boolean;
	/** First ingress error or unresolved-ready diagnostics; empty when valid. */
	readonly issues: readonly string[];
};

/** Exact-candidate author bookkeeping readiness result. */
type UiAuthorCompletenessReadiness = {
	/** True only for a valid ready ledger with both complete checks and resolved rows. */
	readonly ready: boolean;
	/** Concrete bookkeeping blockers; no visual or semantic acceptance claims. */
	readonly issues: readonly string[];
};

/** Test-owned unrelated synthetic assignment, cloned separately for each behavioral case. */
type UiAuthorCompletenessFixture = {
	/** Persisted author companion record under test. */
	ledger: UiAuthorCompletenessLedger;
	/** Independently provided parent context under test. */
	context: UiAuthorCompletenessContext;
};
