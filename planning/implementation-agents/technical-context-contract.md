# Technical context: minimum durable contract

Status: milestone-2 design with executable preparation, context, and first-pass
Markdown publication. The
[maintained workflow and schema](../../skills/refine-design/references/technical-preparation.md)
define its executable encoding. This does not certify a product architecture.
The [delivery plan](technical-documentation-delivery-plan.md) governs sequencing;
the [document contract](technical-documentation-contract.md) governs the audience.

## Boundary and existing contracts

Preparation reconciles accepted product meaning, repository observations, and
specialist advice. Resolution validates and filters persisted records. Publication
renders the frozen context and never chooses architecture, inspects live source,
reads the human description, or calls an agent.

Reuse the existing [artifact envelope](../../skills/refine-design/references/product-artifact.md)
and [context binding rules](../../skills/refine-design/references/product-context.md).
The CLI view `technical` maps to the existing stored audience
`technical-documentation`; do not add a competing `technical` audience enum.
Existing PRD context bytes and behavior remain unchanged. Technical-only records
and artifacts never enter PRD output merely because they share product scope.

Persist technical artifacts through the existing immutable artifact transaction
under `product/<name>/artifacts/`, with current snapshot compare-and-swap and
current-owner lock authority. Use kind `technical-design`, owner
`technical-documentation`, audience `technical-documentation`, and `resources: []`
for this first pass. Kind-specific validation is implemented in the technical
preparation contract; generic JSON acceptance alone is not validation.

An artifact is one coherent boundary or flow, not necessarily the entire guide.
This keeps an unrelated decision change from invalidating every section. A scope
that cannot be separated honestly remains one artifact; do not promise finer
invalidation than its declared dependencies provide.

## Proposed payload 1.0

The payload is the closed object `{schemaVersion, evidenceDependencies, records}` with version `1.0`.
Each record has exactly these members:

| Member | Contract |
| --- | --- |
| `id` | Stable lowercase kebab-case ID, unique across the product's technical artifacts. Keep it across revisions; do not recycle superseded IDs. |
| `kind` | `fact`, `boundary`, `flow`, `contract`, `decision`, or `gap`. |
| `title`, `summary` | Nonempty bounded text; concise enough for a guide. |
| `owner` | Responsible domain from the existing product-owner enum. |
| `scopeRefs` | Nonempty product-record IDs, each exactly bound in the artifact envelope. |
| `productRefs` | Product requirements and gaps used by this record; subset of the envelope's record dependencies. Includes `scopeRefs`. |
| `artifactRefs` | Required UX or other artifact IDs, each exactly bound in the envelope. Empty when none are needed. |
| `dependsOn` | Required technical record IDs. Cross-artifact use also requires an exact artifact dependency. |
| `evidenceRefs` | Evidence IDs selected into this context; no implicit source claims. |
| `status` | Kind-specific authorial status below; never a computed freshness flag. |
| `details` | Closed kind-specific object below. |

All listed members are required, including empty arrays. Use existing ID, text,
array, depth and safe-JSON bounds. Reject unknown fields rather than retaining
extension blobs. Arrays representing sets are unique and sorted by ID. Steps,
alternatives, and explanatory lists retain deliberate presentation order.

| Kind | Status | Required `details` members |
| --- | --- | --- |
| `fact` | `observed` | `claim`, `limits`. At least one repository evidence reference. Claims report inspected code, not future guarantees. |
| `boundary` | `accepted`, `conditional`, `superseded` | `responsibility`, `consumers`, `exchanges`, `lifecycle`, `failureBehavior`, `decisionRefs`. Decision references are also `dependsOn` references. |
| `flow` | `accepted`, `conditional`, `superseded` | `trigger`, `preconditions`, `steps`, `success`, `failure`, `cancellation`, `retry`, `guarantees`, `limits`, `verification`, `decisionRefs`. Each step is `{ownerRef, action, result}`; the owner names a boundary in `dependsOn`. |
| `contract` | `accepted`, `conditional`, `superseded` | `ownerRef`, `participantRefs`, `flowRefs`, `input`, `result`, `invariants`, `failure`, `lifecycle`. Owner and participants name boundaries; flow references identify where the contract is exercised. All are also `dependsOn` references. |
| `decision` | `accepted`, `proposed`, `conditional`, `superseded` | `context`, `choice`, `alternatives`, `consequences`, `authority`, `supersedes`. Alternatives are `{option, disposition, reason}` with disposition `declined` or `unselected`. |
| `gap` | `unresolved`, `resolved` | `question`, `category`, `affectedRefs`, `resolutionCriteria`, `resolutionRefs`. Category is `product`, `technical`, or `evidence`. Resolution references are also `dependsOn`; empty while unresolved. |

Text fields in `details` are strings except `consumers`, `exchanges`,
`preconditions`, `success`, `failure`, `guarantees`, `limits` for flows,
`verification`, `consequences`, `resolutionCriteria`, and contract `input`,
`result`, and `invariants`, which are arrays of
nonempty strings. `fact.limits` is a string. `steps` and `alternatives` are ordered
object arrays. All `*Refs` and `supersedes` fields are ID arrays. Empty arrays
mean no claim, not implicit completeness. `authority` is `{actor, basis,
evidenceRef}`, where actor is `parent` or `owner` and basis explains the granted
scope. Its evidence reference must also occur in `evidenceRefs`.

Any kind may carry an optional ordered `discussion` array of explanatory
paragraphs. This holds technical reasoning that the publisher renders without
inventing missing claims. Contract records specify semantic exchanges at risky
boundaries, not method signatures or wire formats; their input, result,
invariant, failure, and flow arrays must be nonempty.

A flow must state success, failure, cancellation, retry, resource lifetime,
identity/commit boundaries, and verification to the extent they are established.
Put unsupported guarantees in a gap and mark the dependent flow conditional.
An accepted boundary may depend on an accepted direction while a mechanism is
still conditional; its summary must not claim the unresolved mechanism works.
A gap's `affectedRefs` is a reverse impact index, not a dependency edge: otherwise
a flow depending on its own gap would create a false cycle.

Envelope authorial states remain `accepted`, `partial`, `locked`, `superseded`.
These do not overwrite individual record statuses. A partial envelope requires
an explicit bound unresolved product-model gap under the existing store contract.
A technical-only gap is not silently inserted into the product model just to
satisfy that constraint: an accepted envelope can faithfully record conditional
technical records; its status is not whole-guide readiness. Report readiness
from the included record states and exclusions. Preserve superseded records in
artifact history and concise decision lineage, never as executable direction.

## Evidence and repository baseline

The context carries closed `repositoryBaselines` and `evidence` collections.
Preparation persists each evidence object at
`product/<name>/technical/evidence/<material-sha256>.json` and each baseline at
`technical/baselines/<material-sha256>.json`, immutable and canonical. An evidence
digest hashes its entire canonical object; a baseline digest omits its own
`materialSha256`. Payload `evidenceDependencies` is the sorted array of exact
`{id, materialSha256}` bindings, including evidence required transitively. Resolve
from these hashes, never a mutable latest-evidence pointer.
A baseline is `{id, repositoryId, head, indexSha256, changes, observations,
materialSha256}`. `repositoryId` is a stable logical identity, not an absolute
checkout location. `head` is the inspected Git object ID or null for an unborn
repository. `indexSha256` binds sorted index entries (path, mode, stage and object
ID). Reject unresolved index stages for preparation; do not stage or commit.

`changes` contains every staged, unstaged and nonignored untracked path, sorted
by path, with `{path, indexStatus, worktreeStatus, indexObjectId, workingSha256}`.
Use null for missing index entries or deleted working files. Renames are an old
path deletion plus a new path addition, independent of Git similarity settings.
Hashes bind exact bytes, file type and mode; symlinks bind link text and are never
followed for evidence. Submodule observations require their own repository
baseline rather than treating the gitlink as inspected source.

`observations` contains the inspected paths (including unchanged ones) with
`{path, workingSha256, mode}`. All evidence paths must be present. A negative claim
such as "no implementation exists under this directory" binds an explicit
inventory of the searched paths and search parameters, not just one file.
Ignored files are excluded unless deliberately inspected; record their exact
observation binding but do not copy credentials or unrelated contents.

Use a read-before/read-after inventory and hash check; retry or report changing
inputs when they differ. A dirty tree is a valid baseline. Capture at inspection
time, before writing generated support files. Later output files do not make a
source fact stale merely because Git status changed. Baseline identity records
the full inspected state; scoped observation bindings determine claim freshness.

Each evidence item is `{id, kind, summary, binding}`. Its closed binding is:

| Kind | Binding |
| --- | --- |
| `repository` | `{baselineId, baselineSha256, paths, locator, observationSha256}`; paths reference baseline observations; locator names symbols or a search/inventory. Hash the selected sorted observations. |
| `assessment` | `{role, question, reportSha256, inputRefs, disposition, rationale}`; role identifies the consulted specialist; disposition is `accepted`, `conditional`, or `declined`. Input references resolve to selected records/evidence. Hash the preserved report's exact bytes. |
| `authority` | `{actor, scopeRefs, instruction, receiptSha256}`; actor `owner` or `parent`; explicit instruction or parent reconciliation under existing delegated scope. Hash exact preserved receipt bytes. |
| `standard` | `{standardId, section, sha256, applicabilitySha256}`; bind canonical bytes plus selected manifest/overlay inputs for the relevant paths. |
| `research` | `{url, retrievedAt, claim, sourceSha256, recheckWhen}`; bind preserved primary-source evidence, not merely a mutable URL. |

The context embeds sufficient summaries and preserved report/receipt excerpts
for detached interpretation; it does not embed source code, credentials, raw
product prose, full research pages, or full standards. Source/report hashes are
integrity bindings, not proof of an author's identity or the truth of a claim.
Preparation verifies original evidence; a detached publisher verifies package
integrity and labels observations as of that baseline, not as live verification.

The parent may choose routine technical detail within accepted product behavior,
standards, and selected system boundaries. Product-visible behavior, changes to
accepted cross-boundary responsibility, locks, or ungranted consequential
tradeoffs require owner input. Advisory reports never supply that authority.
Keep the issue as a routed gap until it is resolved. Record accepted, conditional,
and declined specialist advice with the reason, even when no new agent is needed.

## Frozen technical context and closure

Proposed closed context version `1.0` contains `{schemaVersion, consumer,
contextId, materialSha256, snapshot, model, source, scopeRefs, records, artifacts,
repositoryBaselines, evidence, locks, exclusions}`. `consumer` is `technical`.
Reuse current exact snapshot/model/source bindings and product-record projection
shapes, plus existing artifact envelopes. `records` here means product records;
technical records reside inside each `technical-design` artifact payload.
The new evidence collections are selected from immutable evidence by explicit IDs
and exact payload bindings; repository evidence also binds an immutable baseline.
Their bindings must participate in each consuming technical artifact's semantic
material (proposed producer input: exact `evidenceDependencies` ID and material hash pairs).
Do not add unbound evidence after the artifact or context digest is computed.
Milestone 3 must implement that binding in a kind-specific producer/validator.

Resolve required product relationships and affected product gaps first. Without
scope, include eligible active technical records for the product. With scope,
include a technical artifact only if its complete product dependencies are in
that closure. Artifact intersection alone does not broaden the request. Add
exact transitive artifact dependencies only when they are available to
`technical-documentation` and fit the same scope; otherwise reject the attempted
inclusion. Never silently import UI scenes or PRD publication assets to satisfy
a reference. When a UX constraint matters, bind an eligible constraint artifact
or request an upstream scoped projection with provenance; do not copy selected
prose from a forbidden artifact.

Resolve all technical dependencies, evidence, gap and lock references. Omit
unreferenced evidence/baselines and payloads outside the selected audience/scope.
A partial guide remains useful when unrelated gaps exist. Missing or invalid
required references are validation failures, not text the publisher invents.
Explicit known gaps may remain included. Unsupported guarantees remain conditional.

`locks` reuses exact product/artifact lock bindings and inventories all included
locks. Technical record-level locking is deferred; split a scope into its own
artifact when it needs an independent lock. Stale or locked-conflict artifacts
are represented only in typed exclusions, never by publishing their old payload
as current. Superseded dependencies do not satisfy live references. Exclusions
carry `{id, reason, affectedScopeRefs, requiredAction}`; reason is `stale`,
`locked-conflict`, `superseded`, `outside-scope`, or `outside-audience`. They contain
no excluded payload. Foreign artifact dependencies are rejected, not excused by
an exclusion. Inventory outside-scope/audience candidates by ID only when needed
to explain a requested omission; avoid leaking unrelated metadata.

Preserve existing semantic material invalidation and exact revision bindings.
A referenced code observation, standard, evidence input, or platform assumption
changing marks its dependent technical records/artifacts stale, then propagates
through required dependencies. Unrelated source changes do not invalidate claims.
A revision-only rebind still produces a new context binding; it never authorizes
changing locked content. Preparation computes evidence freshness; today's
product store does not automatically watch repositories or research sources.
Frozen contexts are reproducible historical inputs. Before calling one current,
preparation/resolution must compare relevant observations to the requested live
baseline and expose conflicts. The publisher does not perform that comparison.

Use canonical UTF-8 JSON and a trailing newline. Hash the context with `contextId`
and `materialSha256` removed, using the existing canonical JSON algorithm;
ID is `technical-context-<first-12-digest-characters>`. Persist beneath
`product/<name>/contexts/technical/<digest>/context.json`. No machine-local paths,
run timestamps, random IDs or absolute output paths enter semantic material.
Research retrieval time is evidence, not a generated run timestamp. The 2 MiB
context limit and existing bounded JSON limits apply; binary publication assets
and compression are outside this first technical-context version.

Only this version is planned. Unknown versions/fields fail closed. Do not add
migration or compatibility behavior without a real consumer and explicit scope.

## Validation and milestone evidence

Before persistence or resolution, validate closed shapes, enums and limits;
unique stable IDs; kind-specific status; exact source/model/snapshot and artifact
bindings; record/scope coverage; evidence digests; reference closure and acyclic
required dependencies; lock inventory/authority; supersession lineage; and audience
isolation. Validate input bytes before changing any current pointer or output.
A complete accepted input yields deterministic bytes for the same selection.

The [synthetic fixture](fixtures/technical-context-minimum.json) is a design
fixture, not an executable product snapshot or a context accepted by today's
resolver. It covers a guarded workspace switch and a saved-summary report job
for a fictional inventory notebook. It exercises ownership, failure preservation,
a background resource lifetime, observed code versus target decisions, specialist
reconciliation, a relevant UX constraint, a dirty baseline, and a routed gap.
Bindings are symbolic labels resolved by the fixture's input catalog; milestone 3
must build real model/artifact envelopes and byte hashes with existing writers.
No Alexa architecture or product-specific expected output is a shared default.

Milestone-2 checks cover JSON parsing, declared shape, unique IDs, reference
closure, and the representative positive walkthrough. They do not demonstrate a
working resolver, snapshot validation, staleness detection, or publication.

Defer these cases to the milestone-4 broader batch: mismatched hashes/revisions;
missing/foreign dependencies; scoped multi-record artifacts; cycles; unknown
versions; lock conflicts and unauthorized rebinds; stale dirty/deleted/renamed
source and negative-search evidence; index-only changes; submodules and symlinks;
concurrent source edits; research expiry; PRD/technical leakage in both directions;
size limits; superseded decisions; interrupted persistence; and publication
ownership, invalid links, and deterministic replay. Record them now, not as
already-tested guarantees.

## Milestone-3 encoding decisions

The implementation reuses existing context field names (`sourceSnapshot`,
`productModel`, `product`, `capabilities`, `gaps`, `provenance`) and existing typed
artifact exclusions instead of introducing duplicate projection shapes from the
initial sketch. Evidence adds a required `sourceFiles` array of repository-relative
paths and byte hashes so preserved reports, receipts, research and standard inputs
can be verified and rechecked. Dirty change entries add `mode` so file-type and
executable-bit changes remain visible. The machine schema and executable validator
are the maintained encoding authority; the symbolic milestone-2 fixture is still
design evidence, not production input. Broad negative source-search claims need
an explicit inventory extension and remain unsupported rather than inferred from
an incomplete file list. Time-sensitive research still needs parent reassessment.
