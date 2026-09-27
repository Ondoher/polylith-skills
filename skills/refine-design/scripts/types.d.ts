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
