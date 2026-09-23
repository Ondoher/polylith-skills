# PRD context contract

`generate-prd` accepts one self-contained product-context 1.0 JSON document produced by refinement. It does not read `product-description.md`, follow product-store paths, invoke an agent, or infer missing design data.

The context binds:

- an immutable product snapshot by ID, snapshot revision, and byte hash;
- a product model by ID, source revision, status, byte hash, and aggregate semantic material hash;
- scoped product, purpose, user, capability, and gap records with stable IDs, statuses, owners, and material hashes;
- current PRD-consumable design artifacts as validated envelopes with bounded JSON payloads and first-class resource descriptors;
- explicit locks for included records and artifacts;
- relevant unavailable artifacts as typed `stale`, `locked-conflict`, or `superseded` exclusions with no payload;
- exact source identity, source revision, and source hash.

Every object is closed. IDs, text, arrays, JSON payloads, revisions, hashes, statuses, owners, and producer versions are bounded, and the complete context is limited to 2 MiB (2,097,152 bytes). Every scope, coverage, gap, and lock reference has an exact record-dependency binding. Every record and artifact dependency resolves inside the context; artifact dependencies bind exact revisions and material hashes. Embedded artifact revision, status, material, and change-history bindings must be coherent. A partial artifact must identify at least one included gap. Every included artifact must explicitly support the `prd` consumer; a technical-only transitive dependency is invalid. A scoped context produced by `refine-design` includes an artifact only when every record reference across its artifact-dependency closure remains within the resolved product-record scope.

The embedded artifact material digest uses the product-artifact 1.0 projection. The context `materialSha256` uses recursively key-sorted canonical JSON for the entire context after removing top-level `contextId` and `materialSha256`. The context ID must be `prd-context-<first-12-digest-characters>`.

The publisher hashes the exact context bytes separately in its receipt. This distinguishes a byte-identical input from an equivalent JSON serialization. Text and generic artifact payload data remain data: rendered text is escaped, and excluded artifact payload content is never available to render. The reserved `ux-design`, `design-language`, `ui-composition`, `component-design`, and `prd-publication` kinds always use the exact current packages and kind-specific validation described in [product-publication.md](product-publication.md); generic kinds cannot reuse those names.

An immutable detached context package stores `context.json` with selected resource bytes only in its sibling `artifact-resources/` directory. Resource descriptors are part of artifact material identity and the context material hash. The publisher never follows original product-store or authoring-source paths.

The executable contract is [../scripts/product-context-contract.mjs](../scripts/product-context-contract.mjs). Refinement and publication carry byte-identical copies so filtering, identity, dependency, lock, exclusion, size, and digest rules cannot drift.
