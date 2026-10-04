# Parallel design implementation progress

Execution follows [the milestone plan](parallel-design-pipeline-plan.md).
The normal refine-design authoring mode remains serial until scoped integration
and live evaluation pass. Offline coordinator evidence does not grant UX/UI
acceptance or prove model quality.

| Milestone                        | State       | Evidence                                                                                                               |
| -------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| M1: inspectable plan             | Complete    | `DesignPlan`, source checklist, synthetic brief/plan, validation and inspection CLI                                    |
| M2: durable execution            | Complete    | `DesignCoordinator`, saved-before-dispatch claims, reopened state and terminal seven-item fake-worker demonstration    |
| M3: failure/change behavior      | Complete    | Focused scenarios, fresh Node-process lock recovery, exact review gates, invalidation and uncertain promotion handling |
| M4: coordinated research/planner | In progress | Research handoff guidance and concrete synthetic evaluation input; live handoff pending                                |
| M5: scoped integration           | Pending     | Connect existing stores/service scopes and exact canonical review/persistence                                          |
| M6: live comparison/recovery     | Pending     | Serial baseline, two-author parallel run and fresh in-session coordinator                                              |
| M7: broader evaluation           | Pending     | Sparse/dependent/update/change matrix and supported-mode assessment                                                    |

## Offline foundation

[Operational plan guide](../../skills/refine-design/references/operational-design-plan.md)
defines source coverage, stage-qualified native units, future input references,
ownership and independent whole-UX review. `design-pipeline.mjs` provides
`validate`, `inspect` and saved-directory `status`. The named `test:planning`
lane covers validator and coordinator behavior.

`plan:demo` finishes all seven fake items, with one shared owner, concurrent local
claims, explicit uncertainty after reopening without worker observations,
reconciliation, whole-UX gate and both UI items. `--fail-alpha` additionally
replaces a failed worker and rejects its obsolete late result. These are offline
simulations, not qualitative design reviews or model execution.

One independent correctness assessment found and verified repairs for obsolete
promotion retry after item replacement, reuse across changed authoritative source
bindings and missing review-gate receipts. Acceptance now retains repairable
deliveries; promotion captures exact accepted contributions. Explicit retirement
requires positive observation of current target bytes and an absent/stopped old
writer. Unknown write/liveness state remains blocked.

Fresh-process tests run deterministic Node code. Some Windows sandboxes block
child-process creation; grant that test process permission rather than removing
restart checks. All task/test outputs resolve to repository-root `.codex-tmp/`.
The repository formatting check also required two existing formatting-only
corrections; no wireframe example semantics changed.

## Next

Complete the [research/planner handoff](../../skills/refine-design/references/parallel-research-handoff.md)
using verified product-owned research, then connect scoped authoring. Keep claims,
attempts and review provenance durable while capability tokens remain process-local.
The service must reject obsolete/revoked assignments even when their work was
queued before revocation. Existing native stores and canonical writers retain
their authority, locks and exact subject checks.
