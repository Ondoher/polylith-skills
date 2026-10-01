# Correcting the wireframe/UI work list

Status: complete; see the [execution record](wireframe-ui-scope-correction-execution.md)
and [measured scope inventory](wireframe-ui-scope-correction-metrics.json).
All four stages are complete. The corrected inputs are ready for stage 6 of the
[defect-prevention plan](wireframe-ui-defect-prevention-plan.md); that product run
was not restarted as part of this prerequisite.

## Goal and boundary

Regenerate an interface only when an identified requirement change affects its
behavior or presentation, or when an explicitly identified existing defect needs
repair. Context needed to understand an interface does not itself require an edit.
Reuse unaffected artifacts and preserve all experimental work as evidence.

Keep this a small correction to existing impact tracking, scope selection and
dispatch. Add no general dependency graph, internal reviewer, new authoring
pipeline or full-product benchmark. This plan ends with tested selection behavior
and a corrected Alexa work list; authoring and reviews resume under the previous
plan afterward.

## Evidence and the gap to close

The pilot preparation compared saved before/after generated UX. The boundary
author selected the Add dialog because those artifacts changed its actions.
Execution found that the description's appended owner amendment explicitly
requires independent copies and overrides the older following behavior. The
earlier diagnosis missed that amendment. Establish the real source delta, then
require a concrete interface impact; do not assume the Add dialog is unaffected
or that every related interaction needs redesign.

Current paths to address:

- [prepare.mjs](experiments/wireframe-ui-pilot/prepare.mjs) builds candidate changes
  from generated UX differences without establishing the corresponding human
  requirement changes.
- [wireframe-store.mjs](../../skills/refine-design/scripts/wireframe-store.mjs)
  checks that scope entries have a reason and refer to supplied flows. A valid
  flow reference does not establish a need to regenerate each related interface.
- [reviewed-pipeline.mjs](experiments/wireframe-ui-pilot/reviewed-pipeline.mjs)
  imports the original pilot scope when none is present, preserving the original
  selection error in later trials.
- [UxInputSelection.mjs](../../scripts/mcp/UxInputSelection.mjs) supplies related
  context, including sibling flows. Keep useful context available; distinguish
  its retrieval decisions from authority to change those records.

The saved initial UX proposal was unreviewed. Preserve that status; it cannot
override the human description merely because it is newer generated data.

## Stage 1: Establish the actual change and a minimal reproduction

Keep the human description freeform. A standalone `---` introduces later changes
or answers that supersede earlier text where applicable. Interpret that prose
once and retain internal references; require no IDs, status fields or fixed
change-request template from the user.

Locate the previous and current human descriptions, their corresponding product
records, accepted UX/UI artifacts, and the unreviewed proposal. Record their
existing references, approval status and hashes. Compare requirements once;
separate actual user changes, unchanged requirements, and derived-data conflicts.
Inspect the affected records upstream only as needed to locate the disagreement.
Do not restart parsing or reconstruct the whole product.

If the correct previous source is unavailable, record that limitation. Comparing
current requirements with accepted artifacts can identify necessary repairs but
cannot establish what the user edited. Keep uncertain items unresolved, preserve
unaffected progress, and do not invent a source delta from generated prose.

Reduce the Add-dialog incident to an anonymized fixture: a related interface is
needed as context, but its requirements are unchanged and a generated proposal
claims a different behavior. Include a genuine change to that interface as the
working control case. Product identities and business rules belong in fixture
data, never in shared selection code.

Exit evidence: a short before/after requirement inventory and a reproducible
incorrect selection. Report this first, before broader integration or model runs.

## Stage 2: Make the impact reason explicit

Reuse stable references and the existing
[refinement-impact.mjs](../../skills/refine-design/scripts/refinement-impact.mjs)
machinery. Extend the existing work list with the smallest missing information:

- Reason category: requirement change or existing-defect repair.
- Existing source/change references supporting that reason.
- The affected action, state or presentation and its interface reference.
- A brief explanation of why the current interface must change, including any
  indirect effect through a shared component.

Keep `update` and `reuse` decisions; attach an explicit repair issue when the
source is contradictory or the impact cannot yet be justified. An unresolved
candidate must not silently become an update or be declared safely reusable.
Permit independent, justified work to continue.

Code owns hashes, bindings, reference checks and dispatch. The existing author
or coordinator interprets semantic impact once and saves it with the decision.
Reference validation cannot prove prose correctness. Do not add a separate model
review to every selection or require agents to repeat the source specification.

Broader context remains readable, but only explicitly justified elements enter
the wireframe/UI work queue. Unsupported changes in a generated proposal become
repair issues; they do not become new product requirements.

Exit evidence: both the true-change and unchanged-context fixtures produce an
explainable work list with separate readable context and editable scope.

## Stage 3: Enforce the same rule through dispatch and resume

Apply the contract in the shared wireframe store and
[WireframeOperations.mjs](../../scripts/mcp/WireframeOperations.mjs), then use that
same path in the pilot preparation and reviewed pipeline. Update the relevant
handoff/agent instructions concisely. Avoid an experiment-only selection fix.

Bind saved scope to the actual source baseline, current inputs and change set.
On mismatch, recompute affected selection instead of importing an old scope by
filename. Preserve saved drafts and historical decisions. Reuse accepted outputs
only when their relevant inputs and existing acceptance bindings still match;
do not invalidate unrelated outputs merely because a document revision changed.

Retain independent wireframe acceptance before UI dispatch and existing review
criteria. This change decides which work is required; it does not weaken reviews.

Run focused local tests, starting with the normal update/reuse path:

| Case                                                          | Required result                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| Real requirement change affects a dialog                      | Dialog selected with source-linked impact; normal dispatch proceeds   |
| Related dialog needed only as context                         | Context readable; no author/reviewer dispatch; saved dialog unchanged |
| Shared component change affects a consumer                    | Consumer selected with the indirect impact explained                  |
| Generated-only behavior conflicts with the source             | Conflict retained as a repair issue; no unsupported product update    |
| Existing artifact demonstrably violates a current requirement | Repair explicitly scoped against that requirement                     |
| Matching saved scope and accepted artifacts                   | Resume reuses eligible work without regeneration                      |
| Saved scope belongs to different inputs                       | Stale selection is not dispatched; relevant scope is recomputed       |

These are specific regressions for the observed error, not a new exhaustive test
program. No live authoring is needed to establish dispatch behavior.

Exit evidence: focused checks pass through shared code and the harness; unchanged
artifact hashes and dispatch counts demonstrate that unnecessary work is avoided.

## Stage 4: Reconcile Alexa and hand back to the previous plan

Using the saved data, build the real affected-interface list. For each candidate,
record update, reuse or unresolved, its source reason, and whether saved work is
eligible for reuse. Do not assume the previous four-element selection is correct.
In particular, the Add dialog stays out of regeneration unless the actual impact
or a separately identified defect justifies it.

Correct only the conflicting derived inputs needed for this handoff. Preserve
their earlier versions and provenance; never change the description to agree
with an experimental proposal. Carry unresolved authority or UX-approval issues
forward explicitly. No affected item proceeds using contradictory requirements.

Retain compatible accepted work and drafts produced during this plan as well as
earlier work. The previous run remains useful experimental evidence, but its
timings and review outcomes cannot establish performance for the corrected scope.

Exit evidence: corrected scope, reuse/repair decisions, local verification and
remaining limitations are recorded. Update the previous plan to consume that
scope. Do not automatically launch another full run as part of this prerequisite.

## Measurement and execution rules

Record selection/preparation duration, candidate and selected counts, context-only
elements, avoided dispatches and reused artifacts. Separate deterministic checks
from any necessary semantic investigation; report elapsed observations without
calling them pure reasoning time. Retain all collected measurements. Do not
estimate saved model time from an avoided call without comparable evidence.

During later execution, resolve routine questions with best judgment and record
the question, decision and reason. Use normal Codex and the existing MCP service;
no local model proxy unless specifically requested. Preserve reversibility and
avoid live-product mutations during diagnosis. Run reviewers sparingly at a
coherent implementation milestone and use the checkpoint adviser with the user's
preapproved commit-message policy. Do not push. Report completion and the exact
handoff to the previous plan.
