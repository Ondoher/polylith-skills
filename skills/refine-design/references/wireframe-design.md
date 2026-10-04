# Spatial wireframe authoring and review

Use this stage after existing UX flows are available, for coherent interfaces
whose usage changed. Preserve the upstream UX review status. The dedicated
`ux-wireframe-planner` owns usable spatial structure; `ux-wireframe-reviewer`
independently accepts it before authorized `ui-designer` comp work. The
`ui-design-reviewer` evaluates those comps. Code-standards review is separate.

## Deliverable and review scope

Default to a source-bound structured spatial description and its independent
review for completeness and adherence to applicable research guidance. These are
the only substantive checks at this stage. The description defines functional structure, meaningful proportions and necessary
constraints. UI chooses concrete layout; renderability is not an acceptance requirement.
Rendering, screenshots, visual inspection and preview tuning apply only when the
user explicitly requests rendered wireframes or their visual inspection. Reusing
renderer vocabulary, an old visual receipt, or a downstream UI comp request does
not authorize that work at the wireframe stage.

Carry this scope into both author and reviewer assignments. These are assignment
instructions, not new MCP fields. For descriptions, supply the
[spatial contract](spatial-wireframe.md), its
[JSON Schema](spatial-wireframe-schema-1.0.json) and exact source/accepted UX.
The schema defines nested regions and semantic elements independently of UI
templates; spatial choices retain their evidence and rationale. Use the assigned vocabulary and
assigned file/MCP delivery that supports the scope. For description-only work,
assign output directories for the structured artifact, accompanying constraint notes
and independent review receipt. Bind the receipt to exact artifact IDs/revisions
and hashes, source/accepted UX, review scope and evidence limits. Use advertised
validators only for the format they support; the existing pilot validator does
not validate this authored description schema. Do not build a renderer or geometric solver to
prove descriptive completeness.

The current `wireframes.contribute` with `finish:true` and
`wireframes.submit` with `inspected:true` require a rendered draft and inspection.
Their use below is limited to explicitly requested rendered work. Do not invoke
them for description-only acceptance, fake an inspection receipt, or claim that
a file-based pass satisfies the store's inspected-preview gate. If an assignment
offers only incompatible operations, preserve the candidate and report the
delivery limitation to the parent instead of expanding the task.

## Parent setup

Supply the product-owned research brief and relevant section/evidence references
used by UX, with source identity and any evidence gaps, following the
[research handoff](product-research.md). Authors reuse that evidence for spatial
decisions and report conflicts; they research only uncovered material questions.
Research recommendations do not change accepted behavior or authorize redesign.
Carry the same relevant references into authorized UI and review assignments without
duplicating the brief inside the source/acceptance packet or changing its schema.

Supply the same source actions, flows, frames, outcomes and acceptance criteria
to author and reviewer. Identify commissioned states/viewports and affected
interfaces from source changes; preserve unchanged controls and states. For
description-only work, complete the source-bound structured artifact, notes and
independent receipt through the assigned file route.

## Rendered MCP setup (explicit request only)

The following setup applies to explicitly requested rendered wireframes.

Call `wireframes.prepare` through workflow_execute with a frozen context and
scope. Context uses the existing flows/actions/interactionFrames/feedback and
source binding, plus `scopeBasis:{previousSources,currentSources,impacts}`.
Each source snapshot is `{id,revision,records:{stableRecordId:value}}`, projected
from the actual baseline/current requirements, not generated UX differences.
Resolve explicit amendments using [source change requests](source-change-requests.md).
An initial design has an explicitly empty previousSources array.

Each impact is `{id,elementId,kind,status,reason,affectedRefs,dependencies,defect?,remediation?}`.
Use `kind:requirement-change|defect-repair`, `status:ready|needs-repair`, typed
`affectedRefs` (`action:`, `frame:`, `flow:`, `component:`, `state:`), and
`dependencies:[{sourceId,recordRefs:[exactIds]}]`. Describe the concrete interface
effect once; a repair also names the observed defect. Keep source uncertainty
explicit. Code checks references and material source changes, not prose truth.

Scope is `{elements:[{id,title,disposition,impactRefs,sourceFlowRefs,
sourceActionRefs,frameRefs,componentRefs?,stateRefs?,changeReason,requiredStates,dependencies?}]}`.
Use `update`, `reuse` or `unresolved`. Readable related context does not authorize
updates. `wireframes.prepare` returns dispatch IDs and local repair issues;
assign authors/reviewers only for those dispatch IDs. Missing justification holds
that element, while valid independent items remain available. Reuse existing
controls/states unless the identified effect requires changes.

Code binds the saved work list to exact inputs. A changed source requires a new
normal MCP run and recomputed scope; never import old scope merely by filename.
Preserve saved artifacts. Reuse review evidence only when the relevant packet,
requirement values, artifact and renderer/contract bindings still match. Global
source revision changes alone do not invalidate identical element facts.

Assign one exact `elementId` and role (`wireframe`, `wireframe-review`, `ui`, or
`visual-review`) with only its needed operations. Reviewer scope also supplies
`revision`; UI scope supplies accepted `wireframeRevision`. Deliver packet,
accepted source artifacts and renderer capabilities by handle. Independent reads
may run in parallel; mutations and acceptance remain ordered.

## Description construction and review

Describe functional grouping, relevant elements, important relationships and sparse
proportions or constraints supported by the source and reused research. Bind frames
and states with explicit applicability; preserve exact action/subject/destination
meaning where a binding is supplied. Reuse upstream accepted UX instead of repeating
its full behavior review or constructing an outcome gallery. Keep notes consistent
with the structured artifact and route genuine behavior gaps upstream.

Every node need not have dimensions, placement or a decision record. Omitted geometry
belongs to UI. Reviewers must not require grids, fill policies, row/column positions,
alignment, overflow policies, viewport budgets or pixel-fit proof. Review only
completeness of the assigned scope and adherence to applicable supplied research
guidance, with adaptations or departures explained. Each blocking finding must
identify a concrete omission or research departure. Basic JSON/schema/reference
diagnostics are format hygiene, not another substantive criterion. Reuse accepted
UX behavior without checking guards, transitions, focus, payloads or outcomes again.
A complete layout is not this stage's deliverable. Use the
[spatial contract](spatial-wireframe.md) for the exact boundary and semantic rules.

The pilot snippets below are historical renderer vocabulary for explicitly requested
rendered work. They must not enter the current authored description contract.

## Pilot construction vocabulary (rendered route only)

Construct consequential results while designing their scenes. Use the packet's
original flow, step or alternate outcome as the expectation, and save
`set.outcomeEvidence` links alongside the scene. Each link is
`{sourcePath,sceneRef,nodeRefs,resultKind,interpretation?,values?}`; `sourcePath`
is a JSON pointer into the assigned packet. `resultKind` is `visible-change`,
`navigation` or `unchanged`. Link the actual resulting object/value or destination;
a generic success message cannot stand in for a visible change. Reuse scenes;
there is no separate scene-per-step requirement. Interpret unclear prose once next
to its source, without creating a second requirements document.

Optional `values:[{nodeRef,parameter,sourcePath}]` compares an existing scalar
fact with the described `text`, `label` or `value` parameter. Mechanical resolution
does not prove meaning, visibility or complete coverage. The independent reviewer
checks those against the same source during the normal walkthrough. Do not add
an internal reviewer or repeated self-review cycle. Count defects corrected
during construction or review as first-construction failures. Check description
coverage, hierarchy, placement, allocation, bounds, state guards, focus intent,
action/option/destination bindings and outcome references against source and
accepted UX. Review growth and structural consistency directly; do not require
screenshots, painted text-fit checks or renderer-specific tuning. Basic tree and
field validation does not certify these semantic obligations; report its limits.

For related numeric axes, intervals, labels and markers, use one region with
`layout.scale:{min,max}`, one grid column, and normal rows. Direct children use
`scalePosition:{start,end?}` and `placement.row`; omission of `end` means a
centered point. The renderer maps every value through the same transform,
including after resize. Keep surrounding labels outside the scale region.
Units, endpoint policy, grouping and operation semantics come from source data.
Do not duplicate arithmetic in independent grid column approximations.
Numeric positioning does not allocate vertical space: keep labels on a separate
row when sharing a row would collide with handles/markers, and budget the first
viewport for all rows, gaps, padding, headings and surrounding controls.

## Rendered preview delivery (explicit request only)

This section applies only to explicitly requested rendered wireframes and to
rendered UI comps within an authorized UI stage. It does not add capture or
inspection requirements to description-only work.

Use declared, browser-verified component states. Run the component-state browser
fixture when changing supported state behavior, rather than on each artifact.
Focus must remain visible beside selection and under actual clipping/overlap.
The independent wireframe reviewer checks structure before UI; the independent
UI reviewer remains the external check on the styled result.

| Operation               | Purpose                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `wireframes.packet`     | Read source facts and the same acceptance criteria used by the reviewer.                                     |
| `wireframes.contribute` | Save set/parts/scenes, targeted nodeChanges/partChanges, or a dialog pattern; `finish:true` renders a draft. |
| `wireframes.status`     | Retrieve current draft/submitted revisions and exact acceptance.                                             |
| `wireframes.submit`     | Submit `{elementId,revision,inspected:true}` after author inspection.                                        |
| `wireframes.review`     | Record an independent exact-version pass or actionable revise findings.                                      |

The parent renders/captures the supplied preview HTML through the normal host
preview facilities and returns its image plus geometry diagnostics. Authors do
not create browser scripts. Inspect the draft, address local errors, and submit
that revision. The local pilot supplies capture directly; normal MCP delivery
returns the preview path for host capture. Missing capture is an explicit
limitation to repair before claiming inspection.

The dialog contribution accepts `{id,header:[nodes],body:[nodes],footer:[nodes],
gap?,padding?}` and creates native parts. The body scrolls when bounded by the
viewport; header and footer are content-sized. A `choice-group` component uses
`{label,presentation:"listbox"|"tabs"|"select",options:[{id,label,secondary?}],
selectedId?,disabled?}`. Use actual item choices where selection is required.
Renderer capabilities supply supported states; for example a status failure
uses `failed`, while text fields support `error`. Keep the source meaning intact.

## UI handoff

Only a matching independent wireframe pass within the assigned review scope
releases authorized UI work. A description-only run ends after saving its review
and handoff; it does not start UI automatically. A rejected element
returns to its author; other independent elements continue. A UI correction
requiring wireframe changes returns through wireframe review first. Preserve
saved proposals and matching review receipts across interruption. Later source,
contract or artifact changes invalidate acceptance; active old work may be saved
but cannot become current accepted output.

For the explicitly requested rendered MCP route, UI can author through the same store or deliver canonical units through the
existing UI contract after consuming accepted wireframes. When using `units.deliver`
in a run with prepared wireframes, assign `wireframeElementIds` for the UI unit's
owning elements; the service checks their acceptance. The parent checks complete
coverage and existing canonical UX/UI bindings before canonical persistence.
Candidate wireframe acceptance does not bypass those validators or become a
canonical UX review receipt.

For a reviewed structured-description handoff, supply the exact accepted artifact
and its independent file receipt to UI through the existing assigned-file or
canonical UI proposal route, retaining normal UX/UI validation and publication
gates. Do not present that receipt as store acceptance or invent store bindings.
UI owns its rendered comp review; it must not retrospectively require a rendered
wireframe or change accepted functional grouping and meaningful constraints. Concrete layout
within those boundaries belongs to UI.

## Review and measurement

For description-only work, apply only completeness and adherence to applicable
research guidance. The historical rendered-route checklist does not expand these
criteria. Every blocking finding must name one of them and its supporting scope
or research reference.

Reuse one reviewer context across coherent elements or small batches. Findings
must be concrete and consequential, with scene/node/source and required outcome.
Separate optional preferences from blocking defects. Recheck prior findings and
affected changes instead of repeating unchanged assessments. Preserve unresolved
issues with remediation when the bounded repair allowance is exhausted and
continue independent work.

Record the assigned review scope, initial authoring, local validation/correction, independent
review, repair, recheck, queue time and total time to acceptance. Distinguish
nested intervals and overlapping agents; count work moved before review. Keep
progressive delivery, large supported read windows, exact references and current
normal Codex connections. Record capture/visual inspection only for explicitly
requested rendered work; historical captures do not become acceptance gates.
No local model proxy is required.
