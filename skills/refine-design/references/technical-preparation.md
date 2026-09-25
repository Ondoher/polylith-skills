# Technical preparation and context 1.0

Use `refine-design` **technical preparation** to turn a verified product snapshot,
inspected repository facts and reconciled technical advice into durable technical
artifacts. This mode does not reinterpret or update the product description,
publish Markdown, create implementation plans, or assign application coding.
An accepted product model and verified `product/<name>/current.json` are required;
missing upstream meaning is a routed gap, not permission to invent it.

## Workflow

1. Load repository instructions, folder standards and relevant accepted product
   records from `loadCurrentProduct`. Request only the scope needed for the guide.
   UX constraints need exact eligible artifact dependencies; a missing PRD or UI
   comp is not a prerequisite. Preserve locks and existing decision identities.
   Resolve linked white papers in scope from their current bytes. A stale
   research handoff needs a scoped recheck before its findings are used.
2. Inspect consequential source paths and capture their dirty baseline using the
   helper below. Report observed source facts separately from target decisions.
3. Ask the available `system-architect` one bounded read-only question, supplying
   exact product bindings, observed code, standards and unresolved guarantees.
   Reuse an existing assessment only when these inputs remain current. Consult
   `polylith-architect` only for a material structural mapping question; other
   specialists only for a consequential contract within their remit. An unavailable
   system architect leaves preparation blocked; do not label parent prose as its
   report. Continue useful source inspection without committing unsupported advice.
4. Preserve the report and a concise reconciliation receipt below the product's
   support-data directory. Record selected, conditional and declined advice with
   reasons. The parent may resolve internal detail within accepted behavior and
   boundaries. Product-visible behavior, changed cross-boundary ownership, locks,
   and ungranted consequential tradeoffs return to the owner as explicit gaps.
   For each paper, map substantive claims to existing or new technical records,
   preserving status and source. Map every unresolved paper question to the
   ordinary `gap` records used for primary-description questions: `product`,
   `technical`, or `evidence`, with affected records and resolution criteria.
   Reuse an existing gap when it asks the same question. A paper proposal does
   not become an accepted decision without ordinary authority and evidence.
5. Construct the version-1 preparation input and run `prepare` against the exact
   snapshot used for assessment. Then resolve the `technical` context and inspect
   its decisions, gaps and exclusions. Report remaining conditional claims without
   claiming the architecture was implemented or its guarantees verified.

## Commands

Run from the installed skill directory; all repository inputs are explicit.

```text
node scripts/technical-preparation.mjs inspect --current <repo>/product/<name>/current.json --repo <repo> --repository-id <stable-id> --paths <path,path>
node scripts/technical-preparation.mjs prepare --current <current.json> --repo <repo> --base-snapshot-sha256 <exact-digest> --input <input.json>
node scripts/product-context.mjs --current <current.json> --consumer technical --repo <repo> [--scope <record-id,...>]
```

`inspect` prints the captured baseline and its immutable stored path. It hashes
HEAD, index entries, complete dirty status and relevant observations twice before
accepting the capture. No commit is required and the index is never changed.
Paths are comma-separated portable repository-relative file paths. A directory
search or broad absence claim is not supported by a single file observation:
record an evidence gap until an explicit search-inventory contract is available.
Submodule source needs separate inspection; this first preparation path consumes
one repository at a time. Symlink observations bind link text and never grant
permission to follow it for source interpretation.

The input is exactly `{proposal, evidence, repositoryBaselines}`. `proposal` is
the existing product-artifact proposal with kind `technical-design`, owner and
sole audience `technical-documentation`, artifact schema `1.0`, `resources: []`,
and the technical payload below. Use exact current product-record material hashes
and exact artifact revision/material dependencies. Producer is
`{id: "technical-preparation", contractVersion: "1.0", method: "assessment"}`.
The optional `--authority <file>` forwards existing target-scoped artifact lock
authorization; a narrative authority receipt cannot unlock an artifact.

## Payload and evidence

The [closed machine schema](technical-context-schema-1.0.json) defines structural
shapes; `scripts/technical-contract.mjs` enforces cross-reference and semantic
rules. The [milestone contract](../../../planning/implementation-agents/technical-context-contract.md)
explains design intent. The executable shape takes precedence over the initial
planning sketch where serialization names differ.

Payload is `{schemaVersion: "1.0", evidenceDependencies, records}`. Each evidence
dependency is `{id, materialSha256}`. Compute it with `technicalDigest(evidence)`;
do not substitute a report's byte hash for the evidence object's material hash.
Use stable record IDs with common scope, product, artifact, technical dependency
and evidence references. Kinds are `fact`, `boundary`, `flow`, `contract`,
`decision`, and `gap`. A `contract` captures the owner, participating boundaries,
exercising flows, semantic inputs and results, invariants, failure effects, and
lifetime for a risky cross-boundary exchange. It does not prescribe method names
or wire formats. A record may include `details.discussion` paragraphs for the
reasoning that connects these fields; the publisher renders those paragraphs
without adding architectural claims. When a source contains a relevant Mermaid
diagram, retain its fenced block in the owning record's `details.discussion`,
in order with its surrounding explanation and selected/conditional status. Do
not strip diagrams during prose normalization or collect them into an unrelated
appendix. Preserve diagram syntax and bind the source evidence as for its prose;
reconcile obsolete diagrams with current decisions rather than copying them blindly.

Write these records as the source of a technical explanation, not as labels for a
manifest. A fact should identify the inspected implementation and the limit of
that observation. A boundary should explain its authority, consumers, exchanged
information, lifetime, and failure obligation. A decision needs its reason,
alternatives and consequences. A flow needs enough ordered steps and recovery
detail for a developer to follow the state transition. A gap should say what
decision or demonstration would unblock a contract. Keep product policy and
technical uncertainty explicit; the publisher must not supply missing reasoning.
When the assessments reveal a useful architectural map, reconcile their proposed
features, shared capabilities, and important state models into the explanation.
Describe current versus proposed placement and name model authority and identity;
keep individual views, classes, and exhaustive registry entries for implementation
work. Do not require every product to have the same feature/model inventory or
mistake a workspace for an automatic feature boundary. An issue that needs deeper
reasoning can become a separately authored white paper under the product's
published documentation, with its support evidence retained under `product/`.
Facts are `observed`; decisions can be `accepted`, `proposed`, `conditional` or
`superseded`; gaps are `unresolved` or `resolved`. Boundaries and flows distinguish
accepted, conditional and superseded direction. An accepted envelope can contain
honestly unresolved technical gaps: envelope acceptance does not promise that all
mechanisms are settled. Contracts likewise distinguish accepted and conditional
meaning from a mechanism still awaiting evidence. Existing product-model gap rules still govern a `partial`
envelope. Keep technical questions out of the human product description.

Evidence has `{id, kind, summary, binding, sourceFiles}`. `sourceFiles` contains
`{path, sha256}` for exact preserved reports, receipts, research or standards
evidence, relative to the inspected repository. These paths and hashes enter the
evidence digest. At least one real bound `system-architect` assessment is required
by preparation; synthetic reports are only appropriate in tests. Research needs
primary-source provenance and an explicit `recheckWhen` condition. The parent
must reassess time/platform-sensitive claims when that condition holds; byte
comparison cannot discover that a platform claim expired.

Repository evidence binds a baseline ID/digest and selected path observations.
Other evidence binds its report/receipt/source hash; standard evidence also
binds its applicability input. Preserve referenced source material before calling
prepare; the helper checks each declared source file's actual hash. The detached
context includes summaries, relative locators and hashes, not source-file bytes,
raw product prose, full reports, full standards, credentials or UI image payloads.
Use bounded summaries to carry the essential reasoning. Evidence hashes establish
integrity, not authenticity or proof of a semantic assertion.

For a mapped paper, preserve an assessment or reconciliation report as evidence
whose `sourceFiles` include both the authored paper path/hash and the report
path/hash. Each technical record informed by that paper references this evidence
ID, including a reused open gap. This connects its ordinary architecture,
decision, flow, or gap record to the paper without a parallel technical schema.
Changed paper bytes stale dependent evidence. The generated guide shows mapped
records in its focused-paper page, while open gaps also appear in the shared
decisions and implementation handoff pages.

## Store, freshness and consumption

Immutable support data lives in `technical/evidence/<digest>.json`,
`technical/baselines/<digest>.json` and `technical/proposals/<digest>.json` under
the named product root. Evidence and proposals are written before the existing
artifact transaction; failed commits may leave reusable unreferenced objects.
Only the store's locked compare-and-swap transaction replaces `current.json`.

Technical contexts retain the existing `sourceSnapshot`, `productModel`,
`product`, `capabilities`, `gaps`, `provenance`, `artifacts`, `locks`, and
`exclusions` projections, adding `evidence` and `repositoryBaselines`. Their CLI
consumer is `technical`; their stored artifact audience remains
`technical-documentation`. Exact technical payload and envelope bindings are
validated again on detached consumption. Contexts live at
`contexts/technical/<material-digest>/context.json`; the persisted 2 MiB limit
applies. Context material hashes use sorted canonical JSON, while persisted
context bytes preserve the existing envelope's canonical field order.

Only current `technical-design` roots and their exact eligible dependencies are
selected. A multi-scope artifact does not expand a scoped request. Required
foreign or unavailable dependencies fail resolution. Unrelated omitted content
does not enter evidence or baselines. Existing typed exclusions represent stale,
locked-conflict and superseded artifacts without their payloads. No binary assets
are copied into this first technical view.

Resolution requires `--repo`: it rechecks consumed file observations and evidence
sources, propagates staleness through dependencies, and excludes unavailable
content. This is an in-memory classification for this resolution, not a rewrite
of immutable snapshots. An unrelated dirty file does not invalidate a claim.
A detached context is historical evidence and can validate without the repository;
validation alone does not declare its claims current. Re-resolve for live freshness.
Product snapshot drift during resolution fails before publication of the context.

## First-pass verification and limits

The synthetic technical test builds real model/artifact/snapshot bindings,
inspects a dirty repository, commits reconciled advice, resolves full and scoped
contexts, checks byte-identical replay and PRD isolation, and validates a
detached package. Its first grouped hardening pass also exercises stale bases,
invalid decision evidence, changed source and assessment files, invalid detached
contexts, publication ownership, interruption recovery, and linked output paths.
Run `npm test` for the refinement contract suite. The wider deferred matrix in
the [delivery plan](../../../planning/implementation-agents/technical-documentation-delivery-plan.md)
still contains cases beyond this batch; passing tests does not prove a product's
target architecture or implementation readiness. Markdown publication is
available through [generate-technical](../../generate-technical/SKILL.md).
Authored focused white papers are linked from the product description as `reference` source claims. Before technical preparation uses one, run `scripts/white-paper-references.mjs --current <current.json> --repo <repository>` to bind the exact target and current bytes. The `technical` context includes verified `whitePapers` summaries, digests, and saved research status; these drive publication links and current/stale research labels, not architecture acceptance. If a paper's researched finding is selected for the general guide, record the research handoff as assessment evidence and include the paper and handoff in its source files so changed bytes make that decision evidence stale. Reconcile product-facing changes through the description and system or Polylith boundary choices through their respective assessments. Resolve the context again after paper changes; never hand-edit the published guide.
