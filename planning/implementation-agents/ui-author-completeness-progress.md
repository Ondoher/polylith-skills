# UI author completeness: execution progress

Started: 5 October 2026. Status: opt-in implementation; evaluation in progress.
Governing [plan](ui-author-completeness-plan.md).

The working-tree baseline includes the independently tested persistent capture
promotion. That prerequisite was checkpointed separately as `dacb008`.
Trials use current-conversation author/reviewer agents and unrelated synthetic
data in `.codex-tmp/ui-author-completeness/`; no application-specific material is
promoted to this repository.

| Milestone                | State       | Evidence and remaining work                                                                                                                                                                                                                                               |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1: baseline and contract | Complete    | Baseline identities saved; three exact accepted upstream UX passes verified; evaluation-only inventories frozen before drafting. Available older audit records do not establish a quantified matched UX omission benefit.                                                 |
| 2: opt-in author check   | Complete    | Companion ledger, exact identities, full-row digest, scoped role/skill instructions and read-only helper. Fifteen focused tests pass. Bounded design suite: 402 pass, one optional browser test skipped.                                                                  |
| 3: behavioral proof      | In progress | Correct candidate remains byte-identical; intentional absent scene/row, false state coverage and cross-scene regression repaired by the author. Parent confirms all seeds structurally valid. Scoped assembly, saved-context recovery and final assessment still pending. |
| 4: comparative trial     | In progress | Matched smoke authors dispatched with common frozen sources, no cross-condition inputs and no screenshot turn. Independent review, remaining cases and equivalent-acceptance timings pending.                                                                             |
| 5: disposition           | Pending     | Default remains unchanged. Benefit is not yet demonstrated.                                                                                                                                                                                                               |

The initial routine run hit sandbox subprocess restrictions. Its authorized retry
exposed a package byte-order mark introduced during serialization and an existing
neutrality scan that incorrectly included installed third-party dependencies.
Both were corrected; affected tests passed, then the bounded design suite passed.
Raw failures and timings remain in the temporary execution record.

Bookkeeping readiness deliberately cannot establish semantic completeness.
Valid references can still omit an obligation or express the wrong state. Author
source reinspection and all-row semantic checks therefore remain distinct from
the parent helper and unchanged independent visual acceptance.
