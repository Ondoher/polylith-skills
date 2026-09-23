# Product context

A product context is an immutable, content-addressed view of one verified product snapshot for one downstream consumer. The Slice 2 resolver supports `prd`. It reads only `current.json` and its verified source, model, snapshot, and artifact bindings; it never reparses the product description or asks an agent to fill a gap.

Use `<repository-root>/product/<name>/current.json` from the
[resolved product location](product-location.md). Context packages remain below
that same named root; detached copies are exports, not another canonical store.

Run:

~~~text
node scripts/product-context.mjs --current <product-root/current.json> --consumer prd [--scope <record-id,...>]
~~~

The command writes a self-contained detached context package at `contexts/prd/<material-sha256>/context.json` below the product artifact root, with declared binary resources under its sibling `artifact-resources/` directory. Repeating the same request against the same snapshot reuses identical bytes. The context JSON remains capped at 2 MiB (2,097,152 bytes); the producer checks its exact canonical persisted bytes before creating the package. Binary resource bytes are separate from that JSON budget.

## Content

The closed 1.0 context contains:

- the snapshot ID, independent snapshot revision, and exact snapshot byte hash;
- the product-model ID, source revision, status, byte hash, and aggregate semantic material hash;
- requested scope references;
- selected product, purpose, user, capability, and gap records with their stable IDs, status, owner, and record material hash;
- current PRD-consumable product artifacts as validated envelopes with bounded JSON payloads and exact record/artifact dependencies;
- explicit summaries of every included locked product record or artifact;
- typed summaries for relevant stale, locked-conflict, or superseded artifacts, without their payloads;
- the exact source identity, source revision, and source hash.

The context contains no external source or artifact-store path. Copy the complete directory containing `context.json` and `artifact-resources/` for detached publication. That package remains sufficient after the product store and original source files are unavailable. Resource paths are resolved only relative to this exact persisted context file.

Every artifact has a first-class `resources` array, including an empty array when none are declared. Each closed descriptor is `{id,logicalPath,path,mediaType,byteLength,sha256}`. Its `path` is exactly `artifact-resources/<sha256>.<canonical-extension>`; its `logicalPath` is the safe relative image path used by the structured document. Approved media types and canonical extensions are PNG/png, JPEG/jpg, WebP/webp, and SVG/svg. Resource IDs and logical paths are unique within their artifact. The resolver copies only selected artifacts' declared resources, verifies type, size, hash and unlinked paths, rejects conflicting descriptors for one digest, and deduplicates shared bytes. Limits are 20 MiB per resource and 64 MiB for the deduplicated package.

A current `prd-publication` artifact explicitly selects full publication through required UX and design-language IDs, an optional UI ID, and ordered component IDs. Every selected ID must be an exact direct artifact dependency. No manifest means product-only publication; one means full publication; multiple manifests are invalid for the publisher. See [publication packages](product-publication.md) for the exact current encoding and proposal helper.

## Scope and closure

Without `--scope`, the resolver includes every active PRD product record and every PRD artifact in the current snapshot. With a scope, it starts from the requested active record IDs and adds only required product-record relationships and affected gaps. It includes an artifact only when every record reference in that artifact and its transitive artifact dependencies is already inside that resolved product-record scope. A multi-scope artifact that merely intersects the request is omitted; an artifact never expands a scoped request into otherwise unrelated product records.

Every included artifact must explicitly name the `prd` consumer. A PRD artifact that depends on an artifact unavailable to `prd` is rejected rather than leaking a technical-only payload. Every artifact dependency must resolve to the exact included revision and material hash. Every scope, coverage, gap, and lock reference must have an exact record-dependency binding, and every record dependency must resolve to an included record with the exact material hash. Partial artifacts remain consumable only when they name explicit included gap records.

Generic artifact payload validation enforces JSON type, depth, node-count, text, and object-safety bounds. Structured publication payloads additionally enforce the exact current package shape, canonical JSON, compression metadata, resource bindings and document versions. Decoded JSON is bounded to 8 MiB per artifact and 16 MiB in aggregate. The owning source validators and producer remain responsible for full kind-specific semantics and for declaring every covered product record. The resolver uses declared references as the scope boundary; it does not infer scope from prose inside a payload.

Artifacts whose authorial status is `superseded`, or whose snapshot dependency state is `stale` or `locked-conflict`, are omitted from `artifacts` and represented in `exclusions`. Their payloads are never copied into the context.

## Validation and binding

[product-context-schema-1.0.json](product-context-schema-1.0.json) documents the structural shape. The executable validator additionally enforces:

- closed objects, identifier and size bounds, unique IDs and references, and exact enums;
- the shared 2 MiB aggregate context limit;
- product-record, artifact dependency, gap, and lock closure;
- coherent artifact revision, status, material, and change-history bindings;
- each embedded artifact's own material digest;
- one complete explicit lock inventory;
- separation between consumable and excluded artifacts;
- the product-model, snapshot, and source revision bindings.

`materialSha256` is the SHA-256 of canonical JSON for the whole context after removing `contextId` and `materialSha256`. `contextId` is `prd-context-<first-12-digest-characters>`. Refinement and publication carry byte-identical copies of the executable context contract.
