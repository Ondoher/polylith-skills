# Single-pass UX and UI authoring

Use this route for initial or substantial UX/UI authoring after the trusted facts
packet is ready. It changes authoring and transport, not parsing, product authority,
semantic review, consumer schema versions, or document organization. Narrow advice,
design-language-only work and existing canonical persistence commands remain valid.

## Execution

1. The parent binds a staging store to exact facts, relevant shared inputs and the
   producing contract version. Import useful saved UX/UI once, or initialize empty
   stores. Keep a file manifest and progress cursor. Reuse data generated during the
   current run as well as earlier artifacts; resume the same author at the next unit.
2. UX reads the trusted facts once in source order. Build the application orientation
   and identified interaction elements, then author each local flow as ordered steps.
   Append facts that belong to a later element to its pending record. Select ordinary
   patterns, prune redundant controls and record rationale while authoring the unit.
   Do not commission separate full-product inventory, normalization, pruning, trace
   rewrite and narrative rewrite passes. Research unfamiliar patterns only when needed.
3. Persist every complete unit before moving on. Parent-owned file transport is the
   supported route for read-only agents: request a bounded JSON array of records,
   save it immediately with `deliver`, then continue the **same** agent with remaining
   IDs and paths. A new agent resumes from saved files if replacement is necessary.
   Do not create a specialist for every element or resend accumulated JSON in messages.
4. Optionally scan the issue list once. Return only complete replacements of affected
   records with their prior digests. A repair may alter a unit and its actual dependents;
   it is not another whole-product pass. Unresolved issues remain repair notices.
5. Assemble with the helper, validate the expanded candidate once, then use existing
   UX persistence, source checking and independent UX review. A structural success
   is not a semantic pass. Reviewer findings route to bounded repairs, not automatic
   repeated full authoring. If review cannot pass, preserve results and continue
   independent work; do not fabricate release eligibility.
6. UI can author or reuse shared visual foundations while UX runs. After exact UX
   review, give the **same UI author** shared context once and requested element/flow
   paths as needed. Author reusable parts, then each scene's metadata and changes in
   one forward pass. Do not repeatedly reread the complete product or UX for every
   scene. Allow one optional issue-directed repair pass, then mechanically expand.
7. Validate/persist through the normal UI path, render and inspect. Reuse unchanged
   assembled output and completed records. Publication and technical preparation use
   the existing expanded consumer schemas; they do not re-author the compact records.

There is one UX author and one UI author, not an agent swarm. The current independent
UX review binds the whole artifact. **Only foundation work overlaps UX today.**
Per-batch scene authoring while UX is still changing is deferred until exact scoped
review bindings exist. A transport manifest is not that review binding.

## Records and identity

Each complete JSON record is `{ "kind": "flow", "id": "edit-entry", "data": {...},
"dependencies": ["element:entry-editor"] }`. Omit `dependencies` when none exist.
Kinds are `context`, `element`, `flow`, `part`, `scene`; IDs match
`[a-z0-9][a-z0-9._-]{0,159}`. Dependencies are explicit kind:ID references, not document
positions. A major reusable dialog can have its own element and be called by local
flows. Product references, locks, source evidence and behavior stay explicit.

File transport is one atomic JSON file per completed record. This replaces the
initial JSONL suggestion: no tail repair or replay of an entire stream is needed.
Do not include page numbers, section numbers, headings or publication layout here.
The document-structure agent still inventories meaning, organizes the hierarchy
and chooses page breaks. External numbering is derived consecutively from that
organization; it never supplies internal identities.

`context:document` is common metadata, not a second task narrative. Its data contains:

- `document`: current schema root fields other than the catalogs assembled below.
- Optional `order`: saved catalog ID lists used only by import to preserve canonical
  material identity. New authors omit it; it is not a document outline.

Import preserves canonical material, not necessarily original JSON whitespace or
property order. For unchanged material, keep using the original persisted UX bytes
and their current exact review receipt. A newly serialized candidate does not inherit
that receipt automatically; verify the exact review subject before composition.

Fields inside the expanded catalogs follow the existing [UX machine contract](ux-schema-0.3.json)
or [UI composition contract](ui-composition.md). Read the relevant contract once;
do not infer synonyms. The assembler validates the small authoring envelopes;
existing validators check full semantic references and consumer constraints.

## UX records

An `element` owns `data.catalogs`. Catalog names are `surfaces`, `components`,
`actions`, `interactionFrames`, `states`, `feedback`, `recoveryPaths`, `behaviors`.
Omit unused catalogs. Each catalog is `{ "defaults": {...}, "values": [...] }`.
Defaults may contain explicitly supplied `status`, `sourceRefs`, `questionRefs`,
`ownerRef`, `surfaceRef`, `taskRefs`. Omit defaults when unnecessary. Values override
defaults. Do not apply a field to a catalog whose current schema prohibits it.
`behaviors` holds reusable component-behavior nodes; do not repeat the same shared
dialog definition in every owning flow. No recursive definition inheritance.

A `flow` belongs to one identified interaction element. Its data is:

| Field          | Meaning                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `elementRef`   | Stable ID of the major `element` record where the task starts.                                                                                           |
| `useCase`      | Current use-case metadata: ID, name, goal, trigger, preconditions, outcome, priority, status and references. ID equals the flow record ID.               |
| `nodeDefaults` | Explicit shared node status/source/question metadata; owner defaults to this use case.                                                                   |
| `steps`        | Ordered nodes describing user action and visible response. Ordinary steps use existing `kind: "step"`, actor, action, actionRef, targetRef and response. |
| `alternates`   | Error, cancellation, correction, retry or other local alternatives, each with stable ID and ordered steps.                                               |

`useCase.entryNodeRef` and `actionRefs` may be omitted: the assembler derives them
from the first primary step and actual step actions. It does **not** infer pruning
decisions, statuses, research verification or product traceability. Capture those
as facts/decisions once while authoring; preserve existing evidence when importing.

Consecutive steps produce `next` links mechanically. An alternate can name
`afterStepRef`, `condition`, `order` (needed to distinguish multiple branches), and
optional `resumeStepRef`. Its steps may introduce or call a supporting dialog and
return to the owning task. Include an actual successful termination; a retry loop
alone is not a complete flow.

For example, a form flow can be **choose content → edit fields → save → view the
saved result**, with **save failure → correct input → retry** returning to save.
Choosing content may call a shared selector dialog. The flow remains local to the
form; the selector's reusable behavior is defined once on its own component.

Optional step `callouts` retain explicit `invokes`, state, feedback or recovery
relations using existing edge fields except `fromRef`, which is supplied by the
owning step. Ordinary order does not require edge authoring. `links` is an exact
outgoing-list override used by saved-data import to preserve irregular existing
relations and IDs; an empty list explicitly terminates that step. Do not write both
an automatic linear sequence and a second complete graph. Imported data is not
reinterpreted just to force its graph into a simpler shape.

## UI records

The UI context holds all existing root fields except `scenes`: shared tokens,
templates, assets, source bindings, design language reference, render requests and
issues. Reuse current foundations rather than regenerating them for each scene.

A `part` contains `data.root`: one independent current-schema region/component
tree. It has no nested part references or inheritance chain.

A `scene` contains:

- `data.scene`: existing scene metadata without `root`; ID equals the record ID.
- `data.partRef`: the exact reusable part ID, also listed in record dependencies.
- `data.changes`: optional `{ "nodeRef": "stable-node-id", "set": {...} }` changes.

Changes replace named nonstructural properties such as state, parameters, visual
roles, UX bindings or layout values. A property value is complete, not a deep merge.
Do not change node IDs or children through a variation; create a distinct part when
structure changes. The validator still checks every frame/action/affordance binding.
Both clean and annotated renders consume the same expanded tree. Placeholders and
partial scenes remain labeled; expansion never upgrades them to finished comps.

## Commands and recovery

Run from the managed skill directory or supply the helper's absolute path:

```text
node scripts/single-pass-design.mjs init --stage ux --binding inputs.json --store <staging>/ux
node scripts/single-pass-design.mjs deliver --store <staging>/ux --input batch.json
node scripts/single-pass-design.mjs handoff --store <staging>/ux --refs flow:edit-entry
node scripts/single-pass-design.mjs assemble --store <staging>/ux --output-dir <staging>/ux-output
```

The binding JSON names exact fact/source hashes, relevant shared-input identities
and producer version. Changed bindings require a new store; selectively carry
forward units whose relevant inputs remain valid, with their evidence intact.
Existing saved material can be imported without another specialist call:

```text
node scripts/single-pass-design.mjs import --stage ux --input <saved-ux.json> --store <staging>/ux
node scripts/single-pass-design.mjs import --stage ui --input <saved-ui.json> --store <staging>/ui
node scripts/single-pass-design.mjs assemble --store <staging>/ui --output-dir <staging>/ui-output --ux <current-ux.json> --design <design-language.json> --render
```

These produce isolated candidates and previews, not live product commits or review
receipts. Inspect `valid`, `issues`, `reviewStatus` and output paths. Issues are data:
the command completes with repair notices and whatever candidate is usable. Invalid
CLI scope or an unsafe/unwritable output location is reported as a command error;
the orchestrator preserves records and continues unaffected work elsewhere.

For a repair, pass `--repairs prior-identities.json`, mapping `kind:ID` to the exact
previous digest. Malformed files report a `raw:` repair digest for their damaged
bytes; stale repairs cannot overwrite newer work. Interrupted `.pending` files are
diagnostic evidence. Preserve or move them outside the store after resolving the
specific interrupted delivery so they no longer report unfinished work.

If a unit is unusable, skip it and its missing explicit dependents, assemble siblings
and report the repair at the nearest available context. If context itself is broken,
retain all unit files and emit repair notices without pretending to have a candidate.
Do not halt the whole refinement or loop until every issue disappears. Parent-owned
publication may show these issues through its existing partial-artifact mechanism;
this helper never invents approved context from an invalid candidate.

Assembly output is bound to record identities, producer version and exact UX/design
inputs. Identical outputs are byte-checked and reused; changed assemblies get new
directories so prior output survives. External asset roots disable cache reuse until
asset bytes can be included in the identity. Measurements include read bytes,
record count, assembly/validation/render duration and reuse. Credit usage is not
inferred from byte counts.

## Documentation and later technical work

The assembled UX/UI uses the unchanged consumer schema. Product publication keeps
requirements, application structure, local flows, alternatives, semantic states,
focus/recovery, research, questions, exact comps and source references. The PRD,
interaction document and optional design-language document are presentations of
that data, not separate agent-authored copies of it.

Technical preparation reuses product facts, UX/UI behavior and unresolved feasibility
questions, then adds actual repository baselines, boundaries, contracts and technical
decisions. This route does not fabricate architecture or claim UX alone is sufficient
to publish technical documentation. Existing technical context validation remains
authoritative. No app code, publication layout or human source prose is generated
by the single-pass assembler.
