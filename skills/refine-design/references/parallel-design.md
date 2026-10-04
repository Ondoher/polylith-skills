# Bounded parallel design mode

Use only for an explicit `parallel-design` run with saved operational ownership
and a host that supports the claim guard below. Serial
[single-pass authoring](single-pass-design.md) remains the default while broader
readiness evidence is pending. This mode changes dispatch and delivery, not
product authority, canonical schemas, locks, review, rendering or publication.

## Prepare before dispatch

Follow [the coordinated research handoff](parallel-research-handoff.md): parser →
one product/UX researcher → one UI researcher → parent planner. Use the same
app-owned Markdown research catalogue, save and verify relevant evidence, and
release each researcher after its bounded handoff. Adequate existing findings
need no new search. Late gaps go to the parent, which checks both answered
questions and assigned question IDs before enqueueing one bounded follow-up.
Author workers do not independently repeat discovery.

The parent planner consumes exact parsed authority, requested outcomes, research,
existing unit identities, locks and unresolved dependencies. Validate complete
coverage, exclusive ownership and actual prerequisites through `DesignPlan`,
then initialize `DesignCoordinator` under
`product/<name>/planning/<plan-id>/` before any author claim. Keep canonical
meaning in existing stores; the plan is execution metadata. Read
[the operational contract](operational-design-plan.md) for bindings and recovery.

Initially bound the author pool to two concurrent authors. Give shared context,
shared elements/components and visual foundations one owner; local work consumes
their accepted outputs. Distinct record IDs do not prove disjoint meaning. Resolve
semantic overlap and revise/validate affected ownership before dispatch.

## Claim and deliver existing units

The parent opens the existing UX/UI unit stores with exact input bindings. A ready
item is claimed with its item ID, assigned agent identity and observed coordinator
revision. Save dispatch intent and exact inputs before launching the worker. Supply
only its owned native record references, source/dependency identities, relevant
research and current contribution revisions. Stage-qualified plan references such
as `ux:flow:edit-entry` map to existing store references such as `flow:edit-entry`.

Use fresh role definitions with effective scoped file/MCP permission. Continue
each bounded author forward from saved contributions; one optional issue-directed
repair scan does not reopen unrelated work. UX uses `units.status`,
`units.contribute` and `units.finish`; UI uses scoped `units.read`/`units.deliver`.
Return handles, paths, record references and notices, not reconstructed payloads.
The parent retains assembly, validation, source checking, canonical persistence
and acceptance. Delivery, successful import and structural validation are separate
from design acceptance.

### Required mutation boundary

Every parallel native-store mutation must hold the exact current claim throughout
its synchronous storage action. `DesignCoordinator.withClaim({itemId, attemptId,
agentId}, action)` checks the active intent/running attempt, exact inputs,
prerequisites and gates while holding the same `writer.lock` used by coordinator
transitions. A preflight check followed by an unguarded write is insufficient.
Never supply an async callback, return a promise or schedule a deferred mutation.
Load modules and await transport outside the guard, then recheck immediately before
the synchronous mutation.

`DesignWorkflow({service, coordinator, run, resolveInputs})` is the parent library
adapter. Its synchronous `resolveInputs` observes current exact source/native
identities and must match the attempt inputs. After the durable claim, use
`assign({itemId, attemptId, agentId, handles, readPaths, outputDirectory, ...})`.
It grants only the item's owned units, marks `scope.assignmentGuardRequired`,
and binds the service's parent-only `bindAssignmentGuard` callback before returning
the volatile capability. Review assignments also supply the exact `reviewSubject`;
UI wireframe assignments retain their exact `wireframeElementIds` where required.

The service reauthorizes queued work and rechecks after lazy imports. Guarded domain
operations remain in process so their callback can hold the coordinator lock through
the native action. A required but absent guard fails closed. These are host library
methods, not additional MCP tools; ordinary `workflow_assign` alone does not install
a claim guard. A host unable to retain this callback uses the guarded file route or
serial authoring. See [shared MCP operations](../../../documentation/workflows/mcp.md#durable-parallel-assignments).

For retained file delivery, assign separate writable proposal directories under
the task/run temporary root. Authors save only their scoped proposals. The parent
loads completed files, then calls `DesignWorkflow.withClaim(request, syncAction)`
around the existing contribution/delivery mutation. Use the same input observation,
owned-reference checks, revisions and review gates as MCP. A plain CLI delivery
outside that boundary does not establish a parallel claim. Preserve durable copies
in the app before retiring temporary evidence.

## Whole-UX phase boundary

Complete parallel UX contributions, assemble and validate the native UX, consolidate
consequential decisions into the authoritative description, update/reconcile model
bindings, and freeze exact source and UX bytes. Then obtain an independent
[UX review](ux-review.md) of that exact subject. Reviewers differ from every affected
author; a parent fallback cannot grant an independent pass. Validate the passing
receipt and actual requested scope through the existing review API before recording
its operational gate. Review corrections return to the owning contributions,
invalidate affected bindings and require a fresh exact review.

Only after this whole-UX barrier may ready scoped UI authors consume reviewed UX.
Shared visual foundation preparation may overlap UX under its existing rules.
This mode makes no per-flow UX-to-UI overlap claim: the current review subject binds
whole-artifact bytes even when its passing scope is limited. An unavailable reviewer
preserves completed UX and an explicit block; independent eligible work continues.

The parent assembles/persists UI through existing writers, renders clean/annotated
scenes deterministically, and obtains required independent qualitative UI inspection
and render evidence. Record exact subjects, actual reviewer identities and evidence
locators. Transport receipts and structural checks never substitute for qualitative
review or inspected renders. Publication and technical consumers retain their
existing final assembly and frozen-context gates.

For native schema 0.4 part/scene authoring without a prepared wireframe run,
assign a fresh independent `ui-design-reviewer` the exact accepted whole UX,
authoritative source/source-check and applicable research packet, design language,
saved UI composition/units, rendered bundle and actual screenshots. Bind every
required input to its immutable identity. The reviewer inspects the assigned
renders and saves a scoped qualitative receipt with those bindings, its actual
reviewer identity, inspected screenshot references, `pass`/`revise` verdict,
actionable scene/node findings, strengths and limits. Use assigned `result.store`
or an absolute scoped `outputDirectory` file when workflow tools are unavailable.
The parent checks current exact identities, actual inspection and independence
from every affected author before recording acceptance. Missing screenshots or
material inputs leave an explicit block, never a fabricated inspection pass.

Use the read-only [DesignUiReview helper](../scripts/DesignUiReview.mjs) and its
`DesignUiReviewInputs`/`DesignUiReviewReceipt` contracts for this native branch.
The parent creates `subject(inputs)` from actual authoritative files and supplied
reviewer/author identities before assignment, and supplies that exact subject and
receipt contract to the reviewer. Set `renderBasePath` to the actual hashed render
root; bind product-owned research through `supportingRoot`/`supportingPaths` when
it lives outside the source root. Keep the helper's file/asset checks authoritative
instead of reconstructing its public contract in prose.

After the fresh independent reviewer actually inspects the images and saves its
receipt, the parent must call `requirePassing(receipt, currentInputs)` with current
actual observations before accepting the UI gate. `validate` preserves a `revise`
verdict; structural receipt validation alone cannot grant a pass. The helper checks
identities, independence and declared inspection coverage, while the reviewer owns
qualitative judgment. It fails closed for prepared wireframe runs.

When a prepared wireframe run exists, retain its accepted exact wireframe
element/revision and the assigned `wireframes.review` operation. The native receipt
branch cannot waive that wireframe gate. Native behavior/group changes return
through UX and exact independent review; prepared-wireframe structural changes
return through their existing wireframe review. A fresh reviewer must report any
effective instruction or tool conflict rather than bypassing it.

## Resume and report

Resume from app-owned saved state and current observations using
[operational recovery](operational-design-plan.md#resume-from-saved-state).
Capabilities are process-local: mint and bind fresh ones only after the exact
surviving attempt is positively observed and reconciled. Unknown liveness remains
uncertain; do not redispatch or authorize further native writes. Revoke obsolete
capabilities before replacement. Inspect existing canonical writer state before
retrying an uncertain promotion.

Report scope coverage, shared ownership, saved work, actual concurrency boundary,
review/render evidence, blocked or uncertain work and remaining recovery actions.
Keep deterministic simulation evidence distinct from live author/reviewer evidence.
Adding this mode or passing transport tests does not complete M5–M7 or establish
broader readiness. A clean reset follows its fresh-input rules and does not resume
previous derived research or operational plans.
