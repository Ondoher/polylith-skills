# Canonical Product Model 1.0

Use this contract when the human-owned product description changes. `refine-design` performs one semantic interpretation of the complete current source, produces a `product-model-proposal` 1.0 object, and runs `scripts/product-model.mjs`. Later design and engineering work consumes the persisted model or a frozen consumer context. It does not reinterpret the Markdown.

Version 1.0 is the sole current proposal, model, snapshot, current-pointer, and lock-authority contract. The Slice 2 shape replaces the former greenfield 1.0 shape; there is no migration, import, downgrade, dual-write, or compatibility reader. The machine schema is [product-model-schema-1.0.json](product-model-schema-1.0.json). Objects are closed and unknown or omitted members fail validation.

## Semantic proposal

The proposal contains the stable product ID and name; model status, owner, and consumer domains; fixed semantic-parse provenance; one purpose; ordered user, capability, and gap records; a complete partition of current source lines; semantic identity assertions; source-claim lineage; and an exact base binding.

An initial proposal uses `base: null`. An update binds the current snapshot SHA-256, product-model SHA-256, and model revision. The parser does not choose the next revision. The writer rejects a proposal assessed against a different current model or snapshot.

`identityClaims` contains exactly one assertion for every purpose, user, capability, and gap record:

- `continued` reuses the same ID and record kind as the previous model;
- `new` uses an ID absent from the previous model and may name superseded predecessor IDs for explicit split, merge, or replacement lineage.

Every previous record remains present. Obsolete meaning becomes a `superseded` tombstone; a superseded record cannot be removed or reactivated. A predecessor named by a new record must be present and superseded in the candidate. The writer validates these assertions but never guesses semantic identity from prose similarity, headings, slugs, or hashes.

Current `sourceClaims` still partition every source line exactly once and reference semantic records bidirectionally. A prior claim ID retained in the current parse needs no lineage entry. Every prior claim absent from the current parse must have one `sourceClaimLineage` entry naming one or more current successor claims. This keeps removal, split, and merge accounting explicit while immutable ancestor models retain the old exact source bytes and ranges.

The current claim dispositions remain:

- `incorporated` for current meaning represented by active non-gap records;
- `unresolved` for meaning represented by gaps;
- `superseded` for meaning retained only by superseded records; and
- `unclassified` for accounted source content whose responsible semantic classification is not yet known.

## Material identity and revisions

The writer assigns revision 1 initially and exactly the next model revision for a changed source. The source binding has the same revision as the model. In a child model it advances exactly one source revision, names the exact parent source SHA-256 as `previousSha256`, and binds different current source bytes. The persisted model binds its exact parent model.

The writer computes one material digest for the product root and every purpose, user, capability, and gap. Material includes the stable ID and kind, product-facing text, lifecycle status, owner, consumer domains, semantic references, and explicit supersession lineage. It excludes current source ranges and claim IDs, paths and byte hashes, parse provenance, revision metadata, peer collection ordering, parent bindings, and computed change bookkeeping.

The product-root material also includes each unclassified claim's summary and exact segment digest. Unknown meaning therefore remains conservatively material without turning the temporary claim ID into product identity.

`recordIndex` is sorted by stable ID and records each kind, status, owner, introduction revision, material digest, supersession lineage, and `materialSource`. A materially changed or introduced record binds the current source revision, source digest, and claim references. An unchanged record carries its previous `materialSource` forward exactly even when the human source was reorganized and the current claim IDs differ.

Loading verifies these statements against the exact content-addressed parent, rather than trusting the child's computed bookkeeping. Every parent record must remain, keep its kind and introduction revision, retain established supersession lineage, and remain superseded once superseded. Each child change entry must reproduce the parent's status and material digest and must classify the comparison correctly. Introduced and changed records bind their current source and claim references; unchanged records carry the parent's complete `materialSource` unchanged.

The model `materialSha256` hashes the sorted `{ id, kind, materialSha256 }` projection of the complete record index. The computed change set classifies the revision as `initial`, `source-only`, or `material` and accounts for every record and prior/current source claim. A source-only revision can therefore preserve all semantic material identities while still retaining the new exact source and provenance.

Source-claim change entries are also checked against the exact parent. A retained claim names itself as its sole predecessor. A removed parent claim must be named by at least one current successor, allowing explicit split and merge relationships. A new claim cannot name itself or a claim outside the exact parent. The loader follows the bound model ancestry to revision 1 and applies the same transition checks at every step; it also exact-verifies each ancestor's source bytes and claim ranges.

A partial model must expose incompleteness through at least one active unresolved or locked gap, or one unclassified source claim. Incomplete work is valid and can become current; missing information is never hidden behind an accepted status.

## Locks

Lock authority is separate caller input, never agent proposal content. The optional authority document is:

```json
{
  "schemaVersion": "1.0",
  "kind": "product-lock-authority",
  "grants": [
    {
      "recordRef": "stable-record-id",
      "owner": "product",
      "instruction": "The current owner's explicit instruction."
    }
  ]
}
```

A target-scoped grant is required to create a lock, materially change a locked record, unlock it, change its owner or lineage, or supersede it. Existing records require the prior current owner; a new locked record requires its candidate owner. Exact reaffirmation of locked semantic material needs no grant. Only grants actually consumed by the transaction become `authorityReceipts`; unrelated grants are rejected or omitted rather than converted into ambient authority.

On load, the exact parent transition reconstructs which record refs required authority and which owner had to grant it. `authorityReceipts` must contain exactly that set with the reconstructed owners. The human instruction remains a required non-empty, closed receipt field, but its original external authority document cannot be reconstructed from immutable model ancestry; the loader therefore does not claim to independently prove the instruction wording.

When new source text conflicts with an unchanged lock and the current owner has not authorized a change, preserve the locked record and represent the conflict as an explicit gap in a partial model.

## Persistence

Resolve `<product-artifact-root>` as `<repository-root>/product/<name>/` using
[the product location contract](product-location.md) before invoking the writer.
The human source can remain elsewhere in the repository; keep its original
repository-relative source label. Do not derive the output root from the
source's parent directory.

Run:

```text
node scripts/product-model.mjs --input <proposal.json> --source <product-description.md> --source-label <portable-relative-label> --output-root <product-artifact-root> [--authority <authority.json>]
```

The writer validates the complete candidate before writing. Proposal and source inputs are each limited to 4 MiB and are checked before parsing or decoding. Text is limited to 32,768 characters, arrays to 10,000 entries, source descriptions to 100,000 lines, and revisions and counts to positive safe integers.

The artifact layout is:

```text
<repository-root>/product/<name>/
  current.json
  sources/<source-sha256>/product-description.md
  models/<revision>-<model-sha256>/product-model.json
  artifacts/<owner>/<artifact-id>/<revision>-<artifact-sha256>.json
  snapshots/<snapshot-sha256>/product-snapshot.json
  artifact-resources/<resource-sha256>.<extension>
  contexts/prd/<material-sha256>/context.json
  contexts/prd/<material-sha256>/artifact-resources/
```

The source file preserves exact input bytes, including line endings. Each source claim gains exact byte offsets and a segment SHA-256. Models, derived artifacts, snapshots, and contexts use canonical UTF-8 JSON with a trailing newline.

## Snapshot and current pointer

Snapshots have an independent revision because an artifact-only commit must advance the snapshot without reparsing or revising the product model. A snapshot contains stable ID `<product-id>-snapshot`, its revision and prior snapshot binding, the source binding, a product-model binding with material and record-index hashes, and the current derived-artifact inventory. The first snapshot uses revision 1. Each product or artifact commit uses the next snapshot revision.

`current.json` binds the snapshot ID, revision, content-addressed path, and SHA-256. Update proposals bind the exact current model and snapshot. Artifact proposals bind the exact current snapshot. These compare-and-swap boundaries prevent a stale assessment from overwriting a later commit.

An exact replay returns the existing model and artifact-bearing snapshot unchanged. A changed exact source receives one new semantic parse and one model revision. A model update carries the prior artifact inventory forward and applies record-level invalidation through [the product-artifact contract](product-artifact.md).

One exclusive `.product-store.lock` covers the complete read, validation, immutable staging, and `current.json` replacement transaction for both product-model and derived-artifact commits, including initial creation. A concurrent writer fails closed while the recorded owner is live or cannot be verified. Recovery quarantines a lock only when the operating system confirms that its recorded process no longer exists, and a writer removes only the exact lock token it acquired.

Immutable source, model, artifact, and snapshot files are written first through a flushed temporary sibling and atomic rename. `current.json` is the commit point and is replaced last. Update commits compare its exact prior bytes inside the store lock before replacement. Failure leaves the previous current pointer intact; complete content-addressed orphan files may be reused by an identical retry.

Stored paths and source labels are portable relative values. The writer rejects absolute paths, traversal, URLs, backslashes, linked output roots, and linked artifact paths. It never persists a machine-local input path.

This is a trusted-local integrity store. Hashes detect accidental changes and local tampering; they do not authenticate an author, encrypt content, or defend a process after the local account is compromised. Treat source and derived product artifacts as sensitive durable data and do not place credentials, tokens, private keys, or other secrets in them.

The product-neutral executable fixture is under `references/fixtures/product-model/field-journal/`.
