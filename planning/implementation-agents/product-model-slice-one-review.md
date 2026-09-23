# Product-Model Pipeline Slice 1

Status: **complete and installed** on 2026-09-21; greenfield cleanup completed
on 2026-09-22.

This slice proves the smallest product-neutral route from one human-authored
description to a durable semantic model and a separately published PRD:

```text
product-description.md
-> refine-design product-model proposal
-> immutable source, model, and snapshot
-> immutable PRD context
-> generate-prd
-> minimal static HTML
```

Alexa was withheld from reusable fixtures, schemas, prompts, implementation,
and expected results. The neutral Field Journal fixture exercises the route.

## Installed units

- `refine-design` owns semantic validation and persistence. Product-model
  schema 1.0 accounts for every source line, preserves exact input bytes, and
  records purpose, users, capabilities, typed gaps, provenance, ownership, and
  lifecycle state.
- The product store writes content-addressed sources, immutable model
  revisions, immutable snapshots, and immutable
  `contexts/prd/<material-sha256>.json` lockfiles. `current.json` is written
  last as the transaction commit point.
- The PRD resolver validates source/model/snapshot hashes and emits only the
  records required by the `prd` consumer. It performs no semantic
  interpretation.
- The standalone `generate-prd` skill accepts a PRD context and output path
  only. It does not read product descriptions, call agents, research, choose
  product defaults, or mutate context.
- Publication writes deterministic `index.html`, product-neutral review CSS,
  and a receipt bound to the context material hash. Interrupted replacement is
  recovered only from one unambiguous, structurally valid transaction state.

The producer and publisher carry byte-identical copies of the shared context
contract. Their SHA-256 is
`02e595cde3acdd92f751e1be5b7a744c725d2e9b88030291ed982e54bac54278`.
The copy is intentional while these are independently installed skills; a
future skills repository can package the contract once without changing its
public format.

## Security and trust boundaries

- Exact source capture is durable sensitive product data. It is not an
  appropriate place for credentials or secrets.
- Source, artifact, context, and receipt hashes detect local corruption and
  stale bindings. They do not authenticate an author or provide
  confidentiality.
- Existing path components are walked with `lstat`; symbolic links and Windows
  junctions in context or output ancestry fail before reads, recovery, or
  mutation.
- Inputs are bounded at 4 MiB, source descriptions at 100,000 lines, text at
  32,768 characters, arrays at 10,000 entries, and integers at JavaScript's
  safe range.
- Publisher recovery fails closed on malformed, multiple, corrupt, or
  mismatched staging and backup candidates. One publisher owns an output path
  at a time.
- Publisher CSS is versioned document chrome for human review. It is not a
  product design decision, application theme, or design-language default.

## Verification

- `npm test` is the routine gate and runs only the product model, product
  context, product neutrality, and executable greenfield contract tests.
- `npm run test:design` adds a bounded current UX, UI, component, and schema
  0.14 design-language smoke. `npm run test:design:full` runs the exhaustive
  current renderer matrix only when that depth is needed.
- `npm run test:full` is reserved for deliberate release validation. No named
  tier expands a wildcard, and the former migration matrix is not a release
  requirement.
- The installed `generate-prd` suite passed 28 tests. Two ordinary directory
  symlink cases were skipped because Windows denied link creation; equivalent
  input and output junction cases passed.
- Detached integration deletes the original source and product store, then
  publishes twice from the copied immutable context and compares byte-identical
  output.
- Both installed skills pass `skill-creator` validation and JavaScript syntax
  checks. Installed files are byte-identical to the fully tested staging tree.
- Product-neutrality checks cover reusable skill files, the relevant global
  planning-agent contracts, and implementation-agent guidance.

Focused architecture, contract, privacy/security, and verification inspection
found no remaining blocker. These reviews were scoped to the global staged
skills because the Alexa repository standards ledger does not govern files in
the global Codex home; this record does not claim an aggregate repository
standards result.

## Decisions retained for review

- Consumer contexts are immutable content-addressed lockfiles rather than
  mutable named outputs.
- Source bytes, models, snapshots, and contexts remain separate layers so a
  later consumer can receive a narrow context without reopening human prose.
- The publisher receipt is an integrity binding and ownership marker, not an
  authentication mechanism.
- Recovery prefers explicit failure over guessing when more than one valid
  transaction candidate exists.
- The first publisher intentionally renders only orientation, users,
  capabilities, and gaps. Full design-language, UX, UI, and component
  publication moves in Slice 3.

Slice 2 was the next implementation slice at this checkpoint and has since
been completed. See
[Product-Model Pipeline Slice 2](product-model-slice-two-review.md). Slice 3
is now next. Implementation planning and coding remain deferred.

## Greenfield cleanup

The former design-language schemas 0.1 through 0.13, their proposal fixtures,
public compatibility entrypoint, migration branches, migration-only tests, and
compatibility instructions were removed before Slice 2. Schema 0.14 is the sole
design-language contract and version 7 is the sole review-layout contract.
Product model and PRD context remain schema 1.0. Earlier and later versions are
rejected before output mutation.

Compatibility work may be reintroduced only with explicit current owner
authorization that names a real consumer and its existing data. An imagined
future integration, an old fixture, or generated evidence does not qualify.
