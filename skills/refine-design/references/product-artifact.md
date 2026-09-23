# Product Artifact Store 1.0

Use this contract when structured product, UX, UI, architecture, or planning work must be committed after the product model has already been parsed. The artifact commit path consumes `current.json` and a structured proposal. It never reads the human product description and never performs another semantic parse.

Schema 1.0 is the sole current artifact and snapshot-envelope contract. It is a greenfield contract with no migration, import, downgrade, or compatibility reader. The machine schema is [product-artifact-schema-1.0.json](product-artifact-schema-1.0.json).

## Artifact proposal

The canonical artifact root is `<repository-root>/product/<name>/`, resolved
under [the product location contract](product-location.md). Use that root's
`current.json`; all paths in this document are relative to that named product
root. Artifact commits do not choose a new location or reinterpret the name.

An artifact proposal identifies one stable artifact and declares its authorial state, audience, product scope, coverage, explicit gaps and locks, exact product-record dependencies, exact artifact dependencies, producer contract, first-class `resources`, and JSON payload. `resources: []` is required when no binary files are used. Product record dependencies use the material hashes from the current product model's record index. Artifact dependencies bind the exact revision and material hash of another current artifact.

`status` is one of `accepted`, `partial`, `locked`, or `superseded`. A partial artifact must name at least one unresolved gap. A locked artifact can be reaffirmed unchanged, but creating, changing, unlocking, or superseding it requires a target-scoped current-owner authorization supplied by the caller. Authority is not proposal content and cannot be inferred from agent confidence. The separate authority JSON is `{ "artifactId": "<id>", "owner": "<current-owner>", "action": "lock-artifact" }` for lock creation or `{ ..., "action": "modify-locked-artifact" }` for changing an existing lock.

The caller supplies the exact current snapshot hash through `--base-snapshot-sha256`; it is transaction input rather than proposal content. This is the compare-and-swap boundary: a proposal assessed against an older snapshot cannot overwrite a newer product or artifact commit.

## Persisted artifact

The writer validates all references against the verified current snapshot, computes the canonical material digest and change classification, assigns the next revision, and persists one canonical JSON document at:

```text
artifacts/<owner>/<artifact-id>/<revision>-<byte-sha256>.json
```

The material digest excludes the envelope's storage path, exact envelope byte hash, revision bookkeeping, dependency state, and commit provenance. It includes the artifact identity and kind, authorial status, consumer domains, scope, coverage, gaps, locks, exact semantic dependency bindings, producer contract, complete resource descriptors including their hashes, and payload. Exact replay reuses the existing artifact and snapshot.

Every persisted artifact and snapshot entry carries one closed history binding. `added` is valid exactly for revision 1 with no previous binding. Later revisions bind `revision - 1` and its material digest. `unchanged` retains that digest, while `modified` changes it. `superseded` occurs exactly with authorial status `superseded`, binds the prior revision and material, and changes the material digest. The executable validator rejects a skipped revision, a false unchanged/modified classification, a superseded status without its matching change kind, and the inverse mismatches. The writer currently reuses exact replays rather than persisting a redundant `unchanged` revision, but the contract defines that state for any producer that does persist one.

Every scope, coverage, gap, and lock reference must have one exact `recordDependencies` binding. The binding is checked against the current product record material before commit, so reference metadata cannot introduce product content outside the declared dependency closure.

## Snapshot state

The product snapshot contains a compact entry for each artifact. Authorial `status` remains separate from derived `dependencyState`:

- `current` means all exact dependencies still match;
- `stale` means a referenced product record or upstream artifact changed or disappeared; and
- `locked-conflict` means the same dependency change affects a locked artifact.

A partial artifact can therefore remain current, become stale, or become a locked conflict without changing its immutable payload. Stale and conflicted entries remain in the snapshot for audit, but consumer contexts omit their payloads and emit typed exclusions.

When the product model changes, the store compares stable record IDs and material hashes. Only direct dependents of changed or removed records are invalidated, then invalidation propagates through the artifact dependency graph. Added unrelated records do not invalidate existing artifacts. A revision-only source change rebinds nonlocked snapshot entries while retaining their exact immutable payload bytes. Cycles and missing artifact dependencies are invalid.

## Commit and recovery

Run:

```text
node scripts/product-artifact-store.mjs --current <current.json> --base-snapshot-sha256 <sha256> --input <proposal.json> [--resource-root <package-directory>] [--authority <authority.json>]
```

The product-model and artifact writers share one exclusive `.product-store.lock`. It covers loading current state, validating the complete candidate, staging immutable files, and replacing `current.json`, including initial store creation. A concurrent writer fails closed while the recorded process is live or cannot be verified. A later writer quarantines a stale lock only after the operating system confirms that the recorded process is absent, and it releases only the exact lock token it acquired.

Within that lock, the artifact transaction first verifies every declared resource below the explicit resource root, or existing artifact root on replay. Descriptors use the closed `{id,logicalPath,path,mediaType,byteLength,sha256}` contract. The writer rejects links, traversal, type, size and hash mismatches and copies deduplicated content-addressed bytes into the artifact root's `artifact-resources/` before committing the artifact and snapshot. It replaces `current.json` last using compare-and-swap against the exact bytes it loaded. A failure before pointer replacement leaves the previous snapshot current. Complete content-addressed orphan files may be reused by an identical retry.

The [publication-package helper](product-publication.md) produces validated current UX, design-language, UI, component, and explicit publication-manifest proposals without accepting or interpreting product prose.

The artifact root is a trusted-local integrity store. Hashes detect accidental change and local tampering; they do not authenticate the author, encrypt content, or establish operating-system authorization.
