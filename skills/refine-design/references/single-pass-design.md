# Single-pass UX and UI authoring

Use after the trusted facts packet is ready. Parsing and product authority remain
unchanged. UX and UI schema 0.4 are the canonical persisted formats; assembly never
reconstructs the old flow graph or saves expanded scene copies.

## Execution

1. Bind each staging store to exact facts, shared inputs and the producing contract
   version. Reuse useful saved data, including records completed during this run.
   Resume at the next unfinished unit instead of restarting an agent.
2. UX reads trusted facts once in source order. Record application orientation and
   identified interaction elements; author each local flow as ordered steps. Keep
   pending facts with the affected element. Choose patterns, prune redundant actions
   and record material decisions while authoring. Research unfamiliar patterns only
   when needed. Do not add separate full-product inventory, graph, pruning or rewrite
   passes.
3. Save each complete unit in the author's assigned `proposalDirectory`. The author
   returns paths and record IDs; the parent consumes the exact files with `deliver`,
   without retyping their JSON. Continue the same author with remaining IDs and file
   paths, without resending accumulated JSON. A replacement author resumes from the
   saved manifest and records.
4. Optionally scan outstanding issues once. Replace only affected records and actual
   dependents, naming each previous digest. Unresolved issues remain repair notices;
   continue independent work without an automatic full-run retry.
5. Mechanically assemble native records, validate the candidate, source-check new
   research and obtain the existing independent UX review. Validation and import do
   not grant semantic approval. Preserve partial results if review cannot pass.
6. UI may prepare or reuse visual foundations while UX runs. After exact UX review,
   the same UI author receives shared context once and bounded element/flow paths as
   needed. Author reusable parts and scene variations in one forward pass, followed
   by at most one issue-directed repair scan. Render deterministically and inspect.
7. Publication and technical preparation consume the same canonical meaning and
   stable references; they do not ask UX/UI to re-author the product.

There is one UX author and one UI author. Foundation work can overlap UX today;
scene authoring waits for the exact UX review binding. A transport manifest is not
a review receipt. Independent scene rendering can run in parallel after inputs
are fixed, without starting more design agents.

## Proposal-file permission and delivery

The UX/UI author roles use `sandbox_mode = "workspace-write"` with a narrower
instruction-level write scope: only proposal files in the directory assigned by
the parent. This is not a filesystem sandbox restricted to that one directory;
effective host permissions still apply. Other assessment and reviewer roles remain
read-only. See [Codex custom-agent configuration](https://learn.chatgpt.com/docs/agent-configuration/subagents),
checked 2026-09-27.

Before substantive authoring, the parent supplies the mode, exact input paths,
requested record IDs and one absolute `proposalDirectory` per author, for example
`<writable-workspace>/.codex-tmp/<run>/ux-proposals/` and `ui-proposals/`. Create and
verify those directories under an effective writable root; keep them separate from
canonical product data, the parent-owned record store and other agents' output.
Preserve completed files when continuing the same run. If the product checkout is
outside the writable workspace, stage proposals in the writable workspace and let
the parent handle authorized promotion.

Use a fresh role loaded from the updated definition. Existing agents keep their
previous instructions; verify their effective write authority before reusing one.
If the host still exposes the old blanket prohibition, refresh/restart the role's
configuration before launching it. Do not tell an agent to disregard a live
higher-priority prohibition or claim that editing the TOML changed its current
instructions.

The first real proposal batch doubles as the write/read check: the author saves
complete JSON, then the parent reads it and passes it directly to `deliver`. No
separate design trial or large chat copy is needed. Use one record or a bounded
record array per file. Write to a pending filename and rename after completion;
the parent consumes only announced complete files. Return a small receipt with
`files`, `recordRefs`, `status` and any repair issues. Do not repeat saved contents
in messages. Corrections use new files and the supplied prior record digests;
the parent applies them with `--repairs`. The parent computes file identities and
retains durable copies before temporary cleanup.

Agents may use filesystem tools or small serialization commands for these proposal
files. They cannot edit canonical artifacts, human descriptions, reviews, app code,
configuration or Git, or run rendering, publication or canonical-persistence tools.
Without an assigned directory, assessment remains read-only. If effective access
blocks delivery, report that concrete limitation and preserve progress; the parent
may save bounded textual batches as an explicitly recorded fallback. Do not silently
restart design work or describe that fallback as successful direct file delivery.

## Records and identity

Each unit is `{ "kind": "flow", "id": "edit-entry", "data": {...},
"dependencies": ["element:entry-editor"] }`. Kinds are `context`, `element`, `flow`,
`part`, `scene`; dependencies are explicit kind:ID references. Omit dependencies
when unnecessary. IDs follow `[a-z0-9][a-z0-9._-]{0,159}`; domain records follow their
own schema's stable-ID contract.

Transport is one atomic JSON file per completed record. Stable IDs never contain
outline numbering or imply document placement. The document-structure agent still
inventories meaning, organizes sections and chooses page breaks. Reader-facing
numbering starts at 1 and is consecutive at each hierarchy level.

`context:document.data` contains `document` (shared root fields excluding assembled
catalogs) and optional imported `order` (catalog ID arrays preserving original order,
not document structure). The store header binds inputs and producer identity. Reuse
the same store only for the same binding; actual changes require explicit revisions.

## Native UX records

The [UX 0.4 contract](ux-schema-0.4.json) defines exact field shapes. Read the shared
contract once, then only the relevant saved records for each unit.

An `element` contains `data.catalogs`: `surfaces`, `components`, `actions`,
`interactionFrames`, `states`, `feedback`. Omit unused catalogs. Each supplied catalog
is `{ "defaults": {...}, "values": [...] }`; optional defaults factor explicitly
supplied `status`, `sourceRefs`, `questionRefs`, `ownerRef`, `surfaceRef`, `taskRefs`.
Values override defaults; use only fields allowed for that catalog. A component owns
its short `behaviors` records. Shared dialogs are defined once.

A `flow.data` is the canonical flow itself, with an ID equal to the envelope ID:

| Field                                                        | Meaning                                                                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `elementRef`                                                 | Typed `ux:surface:ID` or `ux:component:ID` identifying where interaction starts.                                                 |
| `id`, `name`, `featureRef`, `goal`, `taskPriority`, `status` | Identity and user purpose.                                                                                                       |
| `trigger`, `preconditions`, `outcome`, `questionRefs`        | Entry conditions, intended result and outstanding questions.                                                                     |
| `steps`                                                      | Primary sequence in array order; each step has `id`, `actor`, `action`, `response`.                                              |
| `alternates`                                                 | Local error, cancel, correction or retry flows: `id`, `afterStepRef`, `condition`, `steps`, `outcome`, optional `resumeStepRef`. |
| `decisions`                                                  | Material pruning/selection rationale captured during authoring, not a second order list or review pass.                          |

Steps may reference an action, frame, target element, state, feedback and reusable
`usesElementRefs`. Optional status/source/question metadata records local differences;
otherwise status inherits from the flow. An alternate starts and optionally resumes
at a primary step in its own flow. It may include supporting dialogs. A zero-step
alternate is valid when its condition directly produces the stated outcome.

Example: **choose content → edit fields → save → see saved result**. An alternate
after save can **correct input → retry**, then resume at save. Choosing content may
call `ux:component:content-picker`; the picker is not copied into every flow.

There are no flow-node/edge catalogs, entry-node pointers, separate recovery catalog,
cross-use-case graph, or duplicated canonical-step list. Array order is authoritative.
Actions, semantic frames, states and feedback remain because UI and later technical
work need actual behavior, accessibility intent and observable results.

## Native UI records

The UI context contains shared root fields except `parts` and `scenes`: bindings,
tokens, templates, assets, render requests, questions and coverage. See the
[composition contract](ui-composition.md).

- A `part` has `data.root`: one independent region/component tree with stable node IDs.
- A `scene.data` is canonical scene metadata plus `partRef` and `changes`; its ID
  equals the envelope ID. It has `flowRefs` and no `root` or nested `scene` wrapper.
- Each change is `{ "nodeRef": "title", "set": {"parameters": {"text": "Updated"}} }`.
  It shallowly replaces declared fields on one node. Identity, children and prototype
  fields cannot change; structural differences need another part. No recursive part
  inheritance or general patch language.

Canonical UI stores parts and variations directly. Validation and rendering resolve
trees in memory; both clean and annotated views use the same resolved scene. Keep
MUI/design-language controls, placeholder disclosure and exact UX bindings intact.

## Commands and recovery

For timing experiments or performance-sensitive runs, use the lightweight
[performance trace](performance-measurement.md) around existing commands and
agent delivery boundaries. It requires no assembly agent or new authoring format.

```text
node scripts/single-pass-design.mjs init --store <dir> --stage ux --binding <json>
node scripts/single-pass-design.mjs deliver --store <dir> --input <records.json>
node scripts/single-pass-design.mjs handoff --store <dir> --refs flow:edit-entry
node scripts/single-pass-design.mjs assemble --store <dir> --output-dir <owned-dir>
node scripts/single-pass-design.mjs import --store <dir> --stage ux --input <native-ux.json>
```

UI assembly also accepts `--ux`, `--design`, and `--render`; asset-bearing designs
require explicit authorized source/asset roots. `deliver --repairs <json>` names
prior digests by kind:ID; corrupt records use their returned `raw:` repair digest.
Unchanged records and generated output are reused, including within the same run.

`import` accepts current canonical data. Ordinary validators reject obsolete schemas;
no hidden conversion happens during loading, persistence, publication or rendering.
This greenfield toolchain has no supported backward-compatibility requirement.
For an explicitly requested full reprocess, follow the reset workflow and build
current artifacts from the human-owned description. Reuse valid work generated
during that run; do not import obsolete derived data as a prerequisite.

The existing `migrate` helper is retained only as a development preservation aid,
outside the ordinary workflow. Do not expand it into a maintained upgrade path.
If expressly used to preserve development work, its saved originals, mappings,
unreviewed candidates and repair notices remain development evidence. Old review
receipts cannot approve a changed candidate, and ambiguous conversions need not
be resolved when the owner instead chooses a fresh reprocess.

Assembly saves usable candidates and actionable notices. Missing/corrupt units do
not discard valid siblings; continue through the enclosing element or next available
unit. Output ownership and writes remain checked. Repair notices describe what the
user can supply or change. A successful structural check never claims UX approval.

## Downstream sufficiency

Product documentation receives goals, requirements, rules, app structure, local
flows, alternatives, shared interactions, questions and linked comps. Technical
preparation receives those same stable identities and explicit behavior constraints
as inputs to architecture work; UX/UI do not invent storage, transport or runtime
guarantees. Publication organization remains independent of the persisted model.
