# Product-Model Pipeline Slice 2

Status: **complete and installed** on 2026-09-22.

This slice turns the one-time product parse from Slice 1 into a durable living
model. Human prose is still interpreted once per changed source. Later UX, UI,
architecture, documentation, and planning work can commit or consume structured
artifacts without reopening that prose.

```text
changed product description
-> one product-model proposal
-> stable semantic records and explicit source lineage
-> immutable model and snapshot revision
-> independently committed specialty artifacts
-> least-scope consumer context
-> deterministic PRD publication
```

Alexa remained withheld from reusable code, schemas, prompts, fixtures, and
expected output. The synthetic Field Journal fixture and product-neutral
contract tests exercise the completed route.

## Living product model

- Purpose, user, capability, and gap records retain stable IDs through prose
  rewrites. The parser asserts continued or new identity; the deterministic
  writer validates the assertion and does not guess identity from wording.
- Every prior semantic record remains accounted for. Replaced meaning becomes
  an immutable superseded tombstone rather than disappearing or reusing an ID.
- Every removed source claim names one or more successor claims. Split and
  merge lineage is persisted in the computed change set.
- Material digests exclude source layout and revision bookkeeping. A source-only
  rewrite advances source, model, and snapshot revisions while preserving all
  semantic material identities and unaffected artifact bytes.
- Partial models are current, valid work only when they expose an unresolved or
  locked gap or an unclassified source claim. Incompleteness cannot be hidden
  behind an accepted status.
- Lock authority is separate caller input. Any protected transition of an
  existing record uses its prior current owner; only a genuinely new locked
  record uses its candidate owner. The persisted model records only authority
  actually consumed by the transaction.
- Loading walks the complete model ancestry through revision 1 and verifies
  each child against its exact parent: source revision and digest, record
  status and material changes, carried material sources, source-claim
  successors, terminal supersession, and the required authority receipts.

## Derived artifacts and snapshots

- One product-neutral artifact envelope now supports accepted, partial, locked,
  and superseded UX, UI, architecture, planning, or other structured work.
- Authorial status remains separate from computed dependency state. A snapshot
  classifies artifacts as current, stale, or locked-conflict while retaining
  their immutable history.
- Product-record material hashes and exact artifact dependencies drive
  invalidation. A change stales its direct dependency closure and then
  propagates transitively; unrelated artifacts remain byte-identical.
- Artifact-only commits advance the snapshot and current pointer without
  changing or reparsing the product model.
- Locked artifact creation, modification, unlocking, and supersession require
  explicit current-owner authority. Unchanged reaffirmation needs no grant.
- Artifact history is closed: an added artifact is revision 1 with no prior
  binding; later revisions bind exactly their predecessor; unchanged material
  stays equal; modified or superseded material changes; and superseded status
  and change classification agree in both directions.

## Transaction and recovery behavior

- Product-model and artifact writers share one exclusive trusted-local
  `.product-store.lock` across the complete load, validation, immutable staging,
  compare-and-swap, and current-pointer transaction, including initial store
  creation.
- A concurrent writer fails immediately. A live, reused, inaccessible, or
  otherwise unverifiable process owner fails closed. A lock is quarantined only
  after the operating system confirms that its process no longer exists, and a
  writer releases only its own exact token.
- Existing path ancestry is checked before and after directory creation so a
  junction or symbolic-link ancestor cannot redirect the store. Incompatible
  proposal versions fail a bounded read-only preflight before the store root is
  created; authoritative validation still runs inside the lock.
- Immutable source, model, artifact, and snapshot bytes are written first.
  `current.json` is replaced last and its expected prior bytes are checked while
  the lock is held.
- PRD publication recovery now handles an explicitly allowed empty prior
  destination at both interruption points without weakening output ownership
  checks.

## Consumer isolation and publication

- A scoped context includes an artifact only when every product record used by
  it and its transitive artifact dependencies is already within the resolved
  scope. An intersecting multi-scope artifact cannot widen the request or leak
  unrelated product content.
- Stale, locked-conflict, and superseded artifacts appear only as typed
  exclusions; their payloads are absent. Current partial artifacts retain their
  explicit gaps.
- Generic artifact payload validation is intentionally structural and bounded.
  The artifact producer owns kind-specific semantics and complete scope
  declarations. Slice 2 publication renders included payloads as escaped JSON
  for inspection.
- Every artifact scope, coverage, gap, and lock reference has an exact
  record-dependency binding in both the store and detached context. Producer
  and publisher also share one 2 MiB aggregate context limit, so every
  successfully persisted context is publishable by size.
- Canonical product, artifact, context, and publication ordering uses explicit
  code-point comparison rather than host-locale collation.
- Refinement and publication carry byte-identical context validators with
  SHA-256
  `D7EA9EDB981F579B9A90E0AECF4349CB7449F1D63845DC857339CDA296A534F0`.

## Verification

- The named `refine-design` fast gate passed **89/89** tests. It covers living
  updates, stable identity, source lineage, current-owner locks, incomplete
  models, selective and transitive invalidation, artifact-only commits,
  schema/runtime parity, concurrency, tamper detection, rollback, linked paths,
  scoped contexts, and product neutrality.
- The new named `generate-prd` gate passed **35** tests. Two ordinary directory
  symbolic-link cases were skipped because Windows denied link creation;
  equivalent input and output junction cases passed.
- The detached vertical test removes the source and product store, publishes
  from the immutable context, applies source-only and material updates, proves
  unaffected artifact preservation and selective staleness, and republishes
  deterministically.
- Both skills pass the `skill-creator` validator. Their declared test commands
  enumerate their source files explicitly and do not expand wildcard suites.
- The combined read-only review found a current-owner authorization defect. A
  delayed contracts subreview then found producer/publisher size drift, missing
  parent-transition checks, weak artifact-history validation, and detached
  dependency-closure drift. All were corrected, covered by focused regressions,
  and passed targeted follow-up review. Its low JSDoc advisory was also closed
  with shared closed-shape types and public parameter/result/error contracts.

These are global staged skills, so the Alexa repository standards ledger does
not govern them. Focused architecture, contract, privacy/security, and
verification inspections were used instead; this record does not claim an
aggregate repository standards result.

## Decisions and limits retained for review

- The store lock coordinates trusted local writers. It is not a distributed
  lock, authentication mechanism, or confidentiality boundary.
- Lock acquisition fails immediately rather than waiting. Uncertain ownership
  requires manual resolution instead of risking concurrent writes.
- The 2 MiB context limit is deliberately aggregate and shared. Refinement
  fails before persistence rather than creating a context the publisher cannot
  consume.
- Schema and publication versions remain strict greenfield contracts. Version
  1.1 publication deliberately refuses version 1.0 output; no migration or
  compatibility branch was introduced.
- A single semantic parse per changed human source is a workflow obligation of
  `refine-design`. Runtime tests begin with the resulting structured proposal;
  agent-level parser-call counting remains evaluation evidence rather than a
  second parser in the persistence layer.
- Kind-specific artifact payload schemas can be added by their owning producers
  as later slices need them. The common envelope stays product-neutral.

Slice 3 is next. It completes the `refine-design` and `generate-prd` split by
moving all PRD presentation and publication code behind the frozen context
boundary. Implementation planning and coding remain deferred.
