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
```

These commands inspect only. They do not launch agents, grant capabilities,
persist canonical product data or infer qualitative acceptance.

Store consuming apps' plans and current execution state under
`product/<name>/planning/<plan-id>/`. Research stays in the product-owned
[research library](research-library.md). Synthetic fixtures demonstrate operational
rules; they do not supply product requirements or authorize real-app defaults.
