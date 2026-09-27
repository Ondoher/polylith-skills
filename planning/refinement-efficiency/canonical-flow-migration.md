# Canonical flow model migration

The owner has rejected retaining the graph schema as required consumer output.
This supersedes the compatibility-output decision in the previous execution plan.
The saved-record infrastructure is useful, but that earlier work did not complete
the intended model simplification.

## Canonical model

- Identified surfaces and reusable components describe interaction elements. These
  are product structure, independent of publication hierarchy.
- Each `flow` names its starting `elementRef`, goal, trigger, preconditions and
  outcome. Its `steps` array defines the primary sequence directly.
- Each local alternate names the primary step where it applies, its condition,
  ordered steps and outcome, with an optional return to a primary step.
- Steps name user actions and visible responses. Supporting/reusable elements are
  explicit call-outs. No general flow-node/edge catalogs, reachability search,
  entry-node bookkeeping or second canonical-step list are required.
- Components own simple reusable behavior descriptions. States, actions, semantic
  views and evidence remain where they describe actual UI requirements; references
  are stable IDs, never outline numbers.
- UI stores reusable parts and scene variations canonically. Tree expansion is a
  rendering operation, not another persisted legacy composition schema.

## Execution and completion

1. Replace the graph-bearing UX contract and validation with native ordered flows.
2. Add explicit one-time import of saved graph data. Preserve original input and
   identity; report ambiguous conversions as repair needs rather than inventing
   missing behavior. Runtime consumers reject the old schema.
3. Update review scope, bounded handoffs, impact analysis, UI binding and publication
   to consume flows directly. Remove graph reconstruction from authoring assembly.
4. Persist reusable UI parts and variations directly and materialize them only for
   validation/rendering. Keep exact UX review and source bindings authoritative.
5. Update agent instructions, schemas, examples and meaningful tests together.
   Exercise saved-data migration, local alternatives/shared dialogs, recovery,
   comps and detached documentation contexts; record actual results and limits.
6. Use the checkpoint adviser under existing standing preapproval, then correct
   the prior summary with the actual canonical-model completion evidence.

No live product mutation or fresh paid design-agent run is needed for this change.
Generated data from the preceding execution remains available for reuse. Changes
to output material require current review bindings; import never manufactures a
passing review or treats archival evidence as approval of changed data.

## Autonomous execution rules

The owner will be AFK and has renewed the previous execution rules. Resolve routine
questions using the simplest model that preserves product meaning. Do not wait for
new approval of reversible repository changes. Reuse saved artifacts and data built
during this execution. Preserve interrupted and partial work at usable boundaries.
Keep one implementation stream; do not run fresh paid UX/UI trials or benchmarks to
test deterministic transformations. Keep the live Alexa product and archive intact.

Record stage times, focused/full checks, imported/output sizes, repair needs and
observed bottlenecks in `canonical-flow-migration-metrics.json`. Do not infer tokens,
credits or live authoring speedups from local timings. Retry a failed approach only
after diagnosing it; choose an alternative when evidence shows avoidable complexity
or lost meaning. Record that choice. A remaining issue becomes repair data, not an
unbounded retry loop or an invented semantic decision.

Use the existing semantic-only checkpoint adviser at coherent implementation
boundaries. The owner's standing preapproval covers suggested commit messages.
Inspect complete worktree scope and snapshot, show the exact message, commit and
verify. Do not push, install, mutate live product data or claim standards review
approval. Write `canonical-flow-migration-summary.md` at completion with actual
results, performance evidence, migration limits and checkpoint history.

## Work ledger and acceptance evidence

| Slice                 | Required evidence                                                                                                                                                   | State       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Canonical contract    | Ordered primary/alternate steps are persisted directly; no required graph catalogs or duplicated step-order list. Stable element and step references are checked.   | In progress |
| Saved-data import     | Existing data is reused once; ambiguous relationships produce explicit repair notices; original input remains available. Import does not run in ordinary consumers. | Pending     |
| UX consumers          | Validation, review, handoff, impact and document inventory consume native flows without graph reconstruction.                                                       | Pending     |
| UI consumers          | Parts/variations are persisted as canonical data; bindings and rendered comps work against the new UX contract.                                                     | Pending     |
| Workflow and fixtures | Agent/skill instructions, machine schemas, examples and behavioral tests match the actual canonical format.                                                         | Pending     |
| Verification/handoff  | Focused and package checks, detached documentation inputs, saved-data metrics, corrected summaries and final adviser checkpoint.                                    | Pending     |

A compact authoring adapter alone does not meet this plan's completion condition.
If a difficult migration requires intermediate checkpoints, those checkpoints are
explicitly incomplete foundations; continue through the consumer migration.
