# Reviewed wireframe and UI authoring

Use this stage after existing UX flows are available, for coherent interfaces
whose usage changed. Preserve the upstream UX review status. The dedicated
`ux-wireframe-planner` owns usable spatial structure; `ux-wireframe-reviewer`
independently accepts it before the `ui-designer` creates comps. The
`ui-design-reviewer` evaluates the comps. Code-standards review is separate.

## Parent setup

Call `wireframes.prepare` through workflow_execute with a frozen context and
scope. Context uses the existing flows/actions/interactionFrames/feedback and
source binding. Scope is `{elements:[{id,title,disposition,sourceFlowRefs,
sourceActionRefs,frameRefs,changeReason,requiredStates,dependencies?}]}`. Reuse
accepted boundaries and unchanged elements. A changed source requires a new run;
do not silently bind old reviews to new facts.

Assign one exact `elementId` and role (`wireframe`, `wireframe-review`, `ui`, or
`visual-review`) with only its needed operations. Reviewer scope also supplies
`revision`; UI scope supplies accepted `wireframeRevision`. Deliver packet,
accepted source artifacts and renderer capabilities by handle. Independent reads
may run in parallel; mutations and acceptance remain ordered.

## Progressive work and review

Construct consequential results while designing their scenes. Use the packet's
original flow, step or alternate outcome as the expectation, and save
`set.outcomeEvidence` links alongside the scene. Each link is
`{sourcePath,sceneRef,nodeRefs,resultKind,interpretation?,values?}`; `sourcePath`
is a JSON pointer into the assigned packet. `resultKind` is `visible-change`,
`navigation` or `unchanged`. Link the actual resulting object/value or destination;
a generic success message cannot stand in for a visible change. Reuse scenes;
there is no screenshot-per-step requirement. Interpret unclear prose once next
to its source, without creating a second requirements document.

Optional `values:[{nodeRef,parameter,sourcePath}]` compares an existing scalar
fact with the rendered `text`, `label` or `value` parameter. Mechanical resolution
does not prove meaning, visibility or complete coverage. The independent reviewer
checks those against the same source during the normal walkthrough. Do not add
an internal reviewer or repeated self-review cycle. Count defects corrected
during the existing preview inspection as first-construction failures.

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

Only a matching independent wireframe pass releases UI. A rejected element
returns to its author; other independent elements continue. A UI correction
requiring wireframe changes returns through wireframe review first. Preserve
saved proposals and matching review receipts across interruption. Later source,
contract or artifact changes invalidate acceptance; active old work may be saved
but cannot become current accepted output.

UI can author through the same store or deliver canonical units through the
existing UI contract after consuming accepted wireframes. When using `units.deliver`
in a run with prepared wireframes, assign `wireframeElementIds` for the UI unit's
owning elements; the service checks their acceptance. The parent checks complete
coverage and existing canonical UX/UI bindings before canonical persistence.
Candidate wireframe acceptance does not bypass those validators or become a
canonical UX review receipt.

## Review and measurement

Reuse one reviewer context across coherent elements or small batches. Findings
must be concrete and consequential, with scene/node/source and required outcome.
Separate optional preferences from blocking defects. Recheck prior findings and
affected changes instead of repeating unchanged assessments. Preserve unresolved
issues with remediation when the bounded repair allowance is exhausted and
continue independent work.

Record initial authoring, local validation/inspection/correction, independent
review, repair, recheck, queue time and total time to acceptance. Distinguish
nested intervals and overlapping agents; count work moved before review. Keep
progressive delivery, large supported read windows, exact references and current
normal Codex connections. No local model proxy is required.
