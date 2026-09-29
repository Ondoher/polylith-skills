# Incremental UX contributions execution

Status: in progress. Started 2026-09-29 at approximately 19:38 UTC.

Scope: execute [the implementation plan](incremental-ux-contributions-plan.md)
under the owner's personal independent-execution skill. The paid experiment ends
at the first UX proposal; review, rework, UI and canonical promotion are excluded.

## Progress

- Confirmed clean starting tree at `2b43048` and existing bound unit-store APIs.
- Located the retained baseline and first-delivery artifacts; replay preparation
  is proceeding alongside the contribution implementation.
- Implemented schema-bound small contributions, durable batches and resumable
  materialization, scoped MCP operations, bounded inline receipts, and UX guidance.
- Happy paths passed first, followed by focused typo, stale revision, idempotence
  and assignment-scope checks. All 28 single-pass and 16 MCP tests passed.
- One integrated correctness inspection found that finish considered unpersisted
  drafts when declaring readiness. Fixed it to validate the actual saved units;
  the regression passes. No repeated broad review round was launched.
- Offline construction and preparation are complete. The first UX experiment is
  pending; no live-performance improvement is claimed yet.

## Questions and decisions

| Question                                                            | Decision and reason                                                                                                                                                                                       |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Should the contribution protocol replace canonical UX?              | Keep UX 0.4 and existing authoring units. Contributions are durable scratch edits; code materializes complete units for existing consumers.                                                               |
| How should fields and nested records be addressed?                  | Use familiar schema field names and stable-ID collection selectors. Reject unknown fields; avoid arbitrary JSON paths and positional encodings.                                                           |
| When should negative tests run?                                     | Establish successful creation, editing, persistence and assembly first, then add the plan's focused typo, stale revision and retry checks.                                                                |
| How much delegation is useful?                                      | One worker prepares the isolated experiment and telemetry while the parent implements the store. No duplicate implementation or repeated review.                                                          |
| Does this invocation authorize the live first-round test?           | Yes: the user explicitly requested execution of the plan, including that experiment. Preserve the saved baseline and verify live Alexa remains unchanged.                                                 |
| Should we lower the model or reasoning setting?                     | No. Preserve the previous UX model and effort so representation changes can be assessed without a model-quality change.                                                                                   |
| Should every contribution require another call to read its receipt? | No. Include small results inline within the existing response budget while retaining their reusable handles. Large results still use bounded reads.                                                       |
| Must retained output packing be reproduced literally?               | No. Compare exact decoded meaning and canonical values/order; code owns packing. The old output used an invalid alternateInputs default. Record that defect and the remaining semantic defect explicitly. |
| How should the old outcomecome typo be replayed?                    | Preserve it as an expected rejection. Replay the saved corrected unit for semantic equality; separately demonstrate the tiny explicit field correction.                                                   |
| Why did the first full local checks fail?                           | The sandbox denied child-process launches in existing Git/CLI fixtures. Rerunning those same checks with authorized subprocess access passed; no test assertions were weakened.                           |
| Which state determines finish readiness?                            | Only persisted authoring units. Pending draft content cannot make missing saved dependencies appear ready.                                                                                                |
| Should the old parent model coordinator be replayed?                | Use deterministic preparation and one UX author for this experiment. Report that coordination differs and compare author-only timings separately from preparation and total elapsed time.                 |

## Measurements and evidence

Timing boundaries, local checks, checkpoints and experiment artifacts will be
recorded here. Raw model stream intervals are observations, not pure reasoning
measurements. Previously completed artifacts will be reused rather than rebuilt.

Implementation and verification were observed between approximately 19:38 and
20:00 UTC on 2026-09-29; this is development work, outside the measured UX trial.
The final single-pass suite took 2.054 seconds of test-runner time; the MCP suite
took 8.588 seconds. The six contribution checks after the readiness fix took
0.279 seconds. Earlier sandbox-denied attempts are test-environment overhead.

The [offline measurements](incremental-ux-contributions-offline-metrics.json)
reconstruct four changed units from 87 contributions while reusing 12 others:

| Ready contributions per batch | Calls | Contribution operation bytes | Validation/persistence | Materialization | Recovery |
| ----------------------------- | ----- | ---------------------------- | ---------------------- | --------------- | -------- |
| 5                             | 18    | 53,244                       | 55.1 ms                | 81.6 ms         | 22.7 ms  |
| 10                            | 9     | 51,920                       | 56.6 ms                | 144.3 ms        | 26.2 ms  |
| 20                            | 5     | 51,424                       | 23.5 ms                | 66.9 ms         | 23.1 ms  |

These are deterministic saved-output reconstructions, not model-authoring
speedups. The original four unit payloads totaled 214,138 bytes. A targeted typo
correction requires 445 operation bytes instead of reproducing a 35,935-byte
flow. Empty-store construction uses the maintained schema-valid fixture, creates
69 contributions in four calls and preserves its complete canonical values.
The retained UX4 has an inherited trace-gap enum discrepancy and is not silently
normalized for this empty-store test.

Prepared trial data: `.codex-tmp/incremental-ux-replay/prepare-02/`. Preparation
verified all 611 protected live Alexa files unchanged and preserves the input
facts, imported baseline, contracts and read plan for the paid execution.
