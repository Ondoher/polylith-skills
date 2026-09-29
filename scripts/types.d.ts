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
