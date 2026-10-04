# Operational design plans

The operational plan records execution ownership and dependencies. Canonical
requirements, UX records, UI parts/scenes and independent reviews retain their
existing stores and schemas. The model proposes work boundaries; deterministic
validation and the coordinator decide whether that work may run.

## Plan identity and coverage

`DesignPlan` accepts schema version `1.0`, a stable plan ID and integer revision,
exact `sources` bindings, a registry of existing `scopeRefs`, source-bound
`outcomes`, justified `gaps`, review `gates` and scoped `items`.

Each item names its actual role/stage, outcome and scope references, exclusively
owned output references, prerequisite items, exact or future input bindings,
required gates and unresolved decisions. A review item names its author items
in `reviewOf`. Output references include their stage, for example
`ux:flow:edit-record` or `ui:part:record-picker`; the authoring store still uses
its existing `flow:edit-record` or `part:record-picker` references and stage.

External inputs have `{ref, digest}`. Future inputs have `{producer, output}`,
identifying the producing item and one of its owned outputs. Their digest is
resolved after the producer's accepted result exists; missing outputs never get
invented hashes. The parent supplies current external bindings and accepted
result identities to inspection.

Supply an independent list of requested outcome IDs to `validate` or as
`state.requestedOutcomeIds` for inspection. Structural accounting within a plan
cannot prove that the planner captured every meaning in the human description.
The parser's coverage checklist supplies that independent comparison.

Repeated inspection of the same plan/state produces the same ready set. Invalid
references, missing prerequisites, cycles, conflicting ownership, unsupported
roles/stages or omitted outcomes produce actionable findings. Semantic overlap
needs planner judgment; distinct IDs do not establish distinct meaning.

## Review and readiness

An item is eligible only when its inputs are concretely bound and current,
prerequisites are accepted, required review gates are satisfied, and consequential
decisions are resolved. Delivery and structural validation do not approve design.
Inspecting an operational record never creates a review receipt.

Gate state comes from the parent after validation through existing domain review
APIs. Retain exact receipt/subject identities and actual reviewer agent identity;
the reviewer must differ from every affected author. UX review binds the whole
artifact's bytes even when its scope is limited. The first parallel mode therefore
freezes and independently reviews assembled whole UX before dependent UI work.
It does not promise per-flow UX-to-UI overlap.

## Inspect without dispatch

From the governance checkout:

```text
node skills/refine-design/scripts/design-pipeline.mjs validate --plan <plan.json>
node skills/refine-design/scripts/design-pipeline.mjs inspect --plan <plan.json> --state <state.json>
node skills/refine-design/scripts/design-pipeline.mjs status --directory <saved-plan-directory>
```

These commands inspect only. They do not launch agents, grant capabilities,
persist canonical product data or infer qualitative acceptance.

Store consuming apps' plans and current execution state under
`product/<name>/planning/<plan-id>/`. Research stays in the product-owned
[research library](research-library.md). Synthetic fixtures demonstrate operational
rules; they do not supply product requirements or authorize real-app defaults.

## Resume from saved state

First resolve the owning app and confirmed product name through
[product location](product-location.md); verify that the selected plan directory is
exactly its `product/<name>/planning/<plan-id>/` and that the plan's source bindings
identify the current authoritative files. Open `state.json` through
`DesignCoordinator`, inspect its embedded plan, revision/digest, attempts, accepted
results, gates and transition history, and resolve referenced contributions,
research and review evidence. Do not reconstruct accepted work from conversation
history or trust an old saved ready flag.

Observe current source/native bytes and exact independent review subjects through
the existing domain APIs. A changed description uses complete interpretation and
coordinated writeback; do not restore freshness by changing hashes alone. Changed
shared inputs invalidate their actual dependents; wider whole-artifact review
bindings may require wider repairs. Preserve unaffected contributions and locks.

For native parallel UI review, use [DesignUiReview](../scripts/DesignUiReview.mjs)
to reobserve the saved receipt against actual current inputs. Require
`requirePassing(receipt, currentInputs)` before restoring its visual gate; retained
transport/structural receipts do not establish qualitative inspection. Prepared
wireframe runs retain their existing exact acceptance route.

Reconcile saved attempts against current live-assignment observations before
dispatch. Positive live observations must identify the exact attempt and agent.
Unknown liveness retains an uncertain assignment and blocks replacement and
further native mutations. Saved dispatch intent alone proves neither launch nor
failure. Reuse existing delivered/accepted contributions and validate outstanding
deliveries separately; do not replay accepted authoring. A replacement requires
resolved prior liveness and a new durable claim; late obsolete deliveries remain
history rather than replacing current work.

Capabilities and guard callbacks are volatile. Reopen the saved MCP run with its
same paths, then use `DesignWorkflow.refresh` only after positively observing and
reconciling the surviving attempt as running. Issue fresh capabilities and bind
their current claim guards; never persist tokens in operational state or evidence.
Revoke ended capabilities. Retained file delivery uses the same guarded native
mutation boundary described in [parallel design](parallel-design.md#required-mutation-boundary).

An uncertain canonical promotion requires inspection of the existing writer,
target bytes and compare-and-swap state before retry or retirement. A result
receipt alone does not prove the writer ended or that canonical state matches.
Never steal a coordinator writer lock on age alone; inspect its recorded owner
and preserve uncertainty when termination cannot be established. Report corrupt
or inconsistent saved state explicitly rather than initializing over it.

Recompute eligible/blocked/uncertain work after reconciliation. Report exact saved
result and review locators plus the smallest next recovery action. A clean reset
retains its fresh-input rules; it does not recover from previous derived research,
designs or operational plans.
