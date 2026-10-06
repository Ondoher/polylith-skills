# UI author requirements check

Status: opt-in evaluation. Assign `ui-author-completeness` explicitly. This check
is part of authoring and does not grant independent UI acceptance. Apply it to
composition, component and scoped-unit work without changing their runtime
schemas or delivery authority. The parent still validates, persists, renders,
captures and obtains the existing exact independent review.

## Inputs and persistence

Supply exact accepted UX and any spatial handoff, foundations, applicable research,
existing UI when relevant, owned scope IDs and the assigned output destination.
Keep the ledger beside the owning product's run or assignment. Temporary synthetic
experiments may use a task directory under repository-root `.codex-tmp/`.
Use the ordinary scoped file/MCP route. The parent owns canonical writes.

Before new authoring, save `requirements.initial.json` and retain it unchanged as
evidence of the initial inventory. Use `requirements.json` for continuing work.
Record source file SHA-256 hashes, identities, scope and meaningful source
references. An initial candidate identity may name the supplied baseline or an
empty saved candidate skeleton; replace it with the exact delivered candidate
file hash before readiness. Save progress after discovery and repairs so a later
turn can resume from files rather than memory. A source change invalidates prior
coverage; a candidate change invalidates the final recheck.

## Author procedure

1. Read accepted inputs and save the initial ledger. Include required surfaces,
   scenes, materially different states, controls, visible values, content, feedback,
   accessibility and constraints within owned scope. Capture dependencies on
   shared treatments without claiming their ownership.
2. Author through the existing route. Update each row with scene/node evidence
   and its status. A reference that exists is insufficient: its representation
   must express the required state, subject, value and meaning.
3. Reinspect the original inputs, including requirements absent from the initial
   inventory. Add missing rows with their source references; repair omissions
   within scope. Record actual discoveries and repair episodes. Do not pretend
   a corrected defect was first-pass success.
4. After repairs, semantically recheck **every** requirement against the final
   candidate, including previously covered rows and requirements outside the
   predicted repair impact. Check dependencies as well. Repeat necessary scoped
   repairs and the all-row check until ready or blocked. Bind the final check to
   exact sources, candidate and complete requirement-row contents.
5. Deliver candidate, final ledger, initial ledger and compact notes/paths.
   Record unknown behavior, shared-owner changes and unresolved requirements for
   the parent. Do not silently redesign UX, expand scope or write another owner's
   output. Resume by rereading identities, sources, saved progress and current
   candidate; never reuse stale readiness after a source or draft change.

This adds no author screenshot-inspection turn or repeated aesthetic pass. Use
existing parent diagnostics and scoped repair requests. Parent rendering and
independent visual inspection continue through their existing contracts.

## Companion ledger 1.0

The helper is `scripts/UiAuthorCompleteness.mjs`; its declaration file documents
the executable field contract. A ledger contains:

- `schemaVersion: "1.0"`, `productId`, `runId`, `assignmentId`, `authorId`,
  `ownedScopeIds`, exact `sources: [{id, sha256}]`, and `candidate: {id, sha256}`.
- `requirements`: stable `id`, `scopeId`, `kind` (`scene`, `component-detail` or
  `requirement`), `sourceRefs: [{sourceId, ref}]`, `meaning`, `dependencyRefs`,
  `status`, `evidenceRefs: [{sceneId, nodeId?}]` and `reason` per row.
- `inputReinspection: {complete, sourceIdentities}` for the original-input pass.
- `finalRecheck: {complete, candidate, sourceIdentities, requirementIds,
requirementsSha256}` for the semantic all-row check. Compute the last field with
  `UiAuthorCompleteness.requirementsSha256(requirements)` after the check.
- `history: [{event, requirementIds, note}]`, with discovery, repair, recheck,
  blocked or resume events; `deliveryStatus` is `working`, `ready` or `blocked`.

Row statuses are `pending`, `covered`, `permitted-gap` or `blocked`. Only covered
rows and precise permitted gaps can be ready. A gap is permitted only for
insufficient visual detail of an already-placed component, with its known role,
source binding, scene/node evidence, missing detail and honest placeholder label
preserved. The parent must explicitly authorize the same gap in its context.
It cannot excuse an absent required scene or a sufficiently specified control.
Unknown behavior and ownership conflicts are blocked or routed upstream.

## Parent checks and their limits

Derive expected identities and reference indexes from the **current frozen sources
and materialized candidate**, independently of the ledger. Context includes the
assignment/product/run/author/scope identities, `sources: [{id, sha256, refs}]`,
`candidate: {id, sha256, references: [{sceneId, nodeId?, scopeId, sourceRefs}]}`,
`requiredRequirementIds` and explicitly authorized `permittedGaps`. The last two
lists may be empty. Include only obligations actually known from production
inputs; a hidden evaluation oracle is not the production acceptance mechanism.

`UiAuthorCompleteness.validateLedger(ledger, context)` checks structure, ownership,
current identities, reference linkage and precise exceptions.
`UiAuthorCompleteness.assessReadiness(ledger, context)` additionally requires no
pending/blocked rows, completed current-input inspection, an all-row final check,
matching row-content hash and a ready delivery status. The read-only CLI accepts
`--ledger <path> --context <path>` and exits nonzero when bookkeeping is not ready.
It writes no canonical artifacts.

These checks cannot establish that the inventory includes every meaningful source
obligation or that a referenced control conveys the right meaning. The author
performs those semantic checks. Keep independent review and exact current-subject
acceptance unchanged, even after a mechanically ready ledger. Parent assembly
must preserve scoped ownership and revalidate candidate bindings; contributions
cannot independently accept the assembled whole.
