# Parallel design readiness

Status: live acceptance in progress. The normal authoring mode remains serial.
This assessment accompanies the [execution plan](parallel-design-pipeline-plan.md)
and [milestone progress](parallel-design-pipeline-progress.md).

## Implemented operating boundary

An explicit bounded mode coordinates one initial product/UX research assignment,
one initial UI research assignment, a persisted source-bound parent plan and at
most two concurrent author workers. Shared context and components have one owner.
The parent alone assembles and promotes canonical artifacts through existing
stores and writers. The operational graph does not replace product meaning.

Exact current claims guard synchronous native mutations. Dispatch intent precedes
launch; delivery, validation, independent review and final acceptance remain
separate. Unknown worker liveness and uncertain writes stay visible until positive
observations permit recovery. Capability tokens remain process-local.

The phase boundary is whole UX: local authoring may overlap, then the parent
assembles/freezes the whole UX and obtains exact independent review. Dependent UI
starts only after that gate. Whole UI assembly, actual captures and independent
qualitative inspection remain required. Native part/scene review verifies current
raw source identities and all generated renderer bytes before accepting a subject;
prepared wireframe runs retain their existing review gate.

See [operating instructions](../../skills/refine-design/references/parallel-design.md)
and [saved-state recovery](../../skills/refine-design/references/operational-design-plan.md#resume-from-saved-state).

## Evidence established

The expanded design lane passed 343 tests. The final planning lane passed 87 after
adding exact native UI review and Windows atomic-replacement checks. Repeated
Windows sharing failures prompted a bounded same-pending-file retry under the
same writer lock; terminal failure retains the prior authoritative state.
Independent reviews verified that correction and the native UI freshness fix.

The deterministic matrix covers seven distinct cases: a larger interdependent
graph, sparse source, an incremental unchanged-result reuse, changed shared input,
late research questions, conflicting findings and a missing reviewer. These use
simulated receipts. They prove coordinator behavior and ownership/gate preservation,
not larger-product model quality or visual acceptance.

Live evaluation currently uses the same frozen synthetic source, research packet
and shared synthetic visual foundation for serial and parallel runs. The fresh parallel
coordinator loaded only durable state/operating instructions and current worker
observations, reused accepted shared work and did not redispatch the original local
author attempts. Exact final review and comparison remain pending.

## Planner and handoff lessons

Outcome coverage, unique record IDs and an acyclic graph are necessary but cannot
prove coherent native authoring or interaction behavior. Check shared feature/task
surface membership, required underlying frames, exact source-kind contracts,
first-class navigation actions and canonical frame affordances. Inspect actual
frozen UX frames before claiming UI work: state trees with different controls
need independently owned parts because scene overrides cannot change part
structure or remove behavior references.

Native delivery may retain good siblings while reporting rejected units. Parent
acceptance must inspect delivery/materialization results and current identities;
older persisted records cannot stand in for rejected proposals. Scoped local
repair should preserve usable contributions, with explicit new attempts and
provenance when an owner is replaced.

Check renderer and validator capability against the accepted state semantics.
Multiline editing, focused error feedback and disabled controls need faithful
native representations. Pending frames may have no affordances: explicitly
disabled presentational controls must not invent action bindings. Preserve the
frozen comparison foundation and select supported readable roles when a token
fails the intended text contrast. Static native specimens do not establish
framework fidelity or runtime accessibility.

Research reuse needs concrete scope assessment. Verification can revisit a known
primary source without becoming a new discovery assignment. Record real late
questions, reused findings and remaining limits; do not equate a shared URL with
complete coverage or count repeated verification as zero source reads.

## Limits and readiness exit

Routine parallel readiness is not yet established. Complete live exact UX/UI
acceptance, comparison and controlled recovery evidence before granting the mode
its proven operating scope. Keep larger designs, complex assets, broader host
support, narrower review scopes and per-flow UX/UI overlap as explicit follow-ups
unless their own live evidence is obtained.

Whole-document review and stage bindings can force wider invalidation than a
single work item. Do not promise narrower reuse than current consumers validate.
Shared-host elapsed times include coordination, verification, repairs and service
contention; they cannot establish an isolated speed improvement. Model token/usage
telemetry is unavailable in this experiment. No runtime application behavior or
accessibility conformance is established by static captures alone.

Host thread limits required reuse of an available actual UI author across the
two experimental runs. Record that context reuse and repair effort explicitly;
the runs cannot establish independent-specialist convergence. Reviewer
unavailability cannot be replaced with parent-authored qualitative approval.
