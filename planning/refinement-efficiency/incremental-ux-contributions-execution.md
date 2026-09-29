# Incremental UX contributions execution

Status: complete, 2026-09-29. Implementation, local verification, saved-output
reconstruction and the isolated first UX round are complete. The first proposal
remains unreviewed and needs a targeted reference repair; the agreed experiment
ends before that repair or any downstream design work.

Scope: execute [the implementation plan](incremental-ux-contributions-plan.md)
under the owner's personal independent-execution skill. The paid experiment ends
at the first UX proposal; review, rework, UI and canonical promotion are excluded.

## Progress

- Confirmed clean starting tree at `2b43048` and existing bound unit-store APIs.
- Reused the retained baseline and first-delivery artifacts. One worker prepared
  the isolated experiment alongside the contribution implementation.
- Implemented schema-bound small contributions, durable batches and resumable
  materialization, scoped MCP operations, bounded inline receipts, and UX guidance.
- Happy paths passed first, followed by focused typo, stale revision, idempotence
  and assignment-scope checks. All 28 single-pass and 16 MCP tests passed.
- One integrated correctness inspection found that finish considered unpersisted
  drafts when declaring readiness. Fixed it to validate the actual saved units;
  the regression passes. No repeated broad review round was launched.
- The live author saved 87 contributions in five batches, then code materialized
  16 units: five changed, eleven reused. There was no final model-generated
  replacement document. All 611 protected live Alexa files remained unchanged.
- Checkpoint `5cb6a76` — `Add incremental UX contribution workflow` — saved the
  implementation, offline evidence and prepared experiment harness under the
  adviser's suggested, preapproved message.

## Result and adoption

The new authoring window was **13m54.709s**, through the first `units.finish`
receipt. The earlier first round took **46m07.197s** from client dispatch to
first delivery. These are observed windows, not a controlled causal estimate:
the old run included a coordinating parent model, the new run launches the UX
author directly, and their independently authored content differs.

The narrower result is strong: the five contribution command streams totaled
**5m28.500s**, versus **25m01.550s** emitting the old five whole-record commands.
That is about 78% less observed command-emission time. The new author supplied
52,231 command-argument bytes, including MCP envelopes, rather than the previous
250,662 bytes. The five new batches contain 51,476 operation-input bytes. Their
representation uses ordinary schema names and stable record IDs, not a compact
encoding the agent must translate.

Adopt contributions as the preferred MCP transport for UX updates against a
saved baseline. Keep structural validation and independent semantic review as
existing downstream obligations. This trial supports eliminating whole-record
regeneration; it does not prove equal UX quality, isolate private reasoning time,
or establish a cold-start or full-refinement speedup. Empty-store construction
is locally verified, with live cold-start performance unmeasured. UI transport
and the abandoned multi-read skill remain outside this change.

## What changed

- `ux-contributions.mjs` resolves schema-bound named records and applies small
  sets, removals and order changes. Omitted values stay intact; code owns packing.
- `design-contributions.mjs` keeps a baseline and immutable contribution journal,
  returns opaque revisions, prevents stale overwrites and reuses exact retries.
  Independent valid unit groups survive a rejected sibling. Rejected inputs and
  reasons remain saved for repair. A restart replays saved accepted work once.
- MCP `units.status`, `units.contribute` and `units.finish` enforce the existing
  assignment scope. Small receipts return inline as well as by handle, avoiding
  another read merely to recover revisions. Finish materializes existing units
  and validates persisted state without granting semantic approval.
- The UX role and refinement guidance describe this authoring route. No new
  skill, assembly agent, canonical model or backward-compatibility adapter was
  introduced. Existing publication, UI and technical consumers retain UX 0.4.
- The isolated harness retains input identities, contracts, batches, runtime
  activity, discovery calls, exact returned-page coverage and first-finish timing.
  A TLS preflight fixes the encountered observer trust failure without disabling
  certificate or hostname verification.

## Live first-round breakdown

The [saved live metrics](incremental-ux-contributions-live-metrics.json) contain
the numerical evidence. These activity windows are sequential; labels include
generation, calls and waiting within the activity, not pure design reasoning.

| Activity                                                       |        Elapsed |
| -------------------------------------------------------------- | -------------: |
| Author startup, instructions and contract discovery            |      3m15.782s |
| Collect facts, prior UX and current identities                 |      1m57.134s |
| Transition into comparison                                     |         5.639s |
| Initial comparison and preliminary decisions                   |        25.562s |
| Continue decisions, generate/save five batches, request finish |      7m59.140s |
| Generate finish call and receive saved proposal                |        11.452s |
| **Author start through first saved proposal**                  | **13m54.709s** |

All 20 input pages were received exactly: 125,008 bytes of facts, 389,418 bytes
of prior UX and 12,077 bytes of identity/revision data, totaling 526,503 bytes.
Client-visible concatenated hashes match the source handles, with no conflicting
pages. Collection was serial; this improvement does not depend on parallel reads.

| Saved batch           | Changes | Command bytes | Command stream | Previous result to command start | Client tool interval | Internal service |
| --------------------- | ------: | ------------: | -------------: | -------------------------------: | -------------------: | ---------------: |
| Clip update scope     |      18 |         9,129 |        56.032s |                           3.710s |               6.077s |         87.232ms |
| Clip/copy context     |      15 |         6,884 |        46.567s |                          44.417s |               4.952s |         12.484ms |
| Grouped copy and trim |      19 |        15,635 |        93.840s |                          19.698s |               7.503s |         12.454ms |
| Ungroup interaction   |      17 |        12,385 |        78.037s |                          20.057s |               4.522s |         14.106ms |
| Copied-content flows  |      18 |         8,198 |        54.024s |                          17.551s |               4.174s |          9.790ms |

All five batches were accepted without contribution issues or retries. None
required another read to retrieve its receipt. The first durable decisions
arrived **6m50.154s after author start**, or **16m06.794s after the original
preparation request**. Each batch was a single command; independent read batching
is a separate unresolved optimization. A conservative baseline-value comparison
found 392 bytes of unchanged values resubmitted in fields. It excludes envelopes,
property names, moved values and repetition against earlier contribution batches;
it is not a complete redundancy or reasoning measure.

Across the author window, observed output streams total 524.809s, reasoning-item
streams 101.120s, tool intervals 47.649s and unattributed time 161.131s. These are
runtime observations, not a decomposition of private thought or provider CPU
time. Useful design reasoning can continue during command generation. The
preliminary-decisions marker does not mean all decisions were already finished.

There were 56 calls started by the finish boundary: 20 data reads, 18 instruction
shell calls, five catalog calls, five timing-marker stores, five contributions,
one finish and two built-in discovery calls. Fifty-five results completed within
the boundary; the finish tool result followed the server receipt by 9ms. Internal
service work across 36 MCP calls totaled **323.156ms**, including **136.066ms**
for contributions. Finish service work was 145.733ms, containing 139.789ms of
materialization/validation. These nested timings must not be added together.

The five contribution tool intervals total 27.228s. Saved wire metadata shows
five automatic approval-review requests overlapping 26.346s of those intervals;
the finish review overlaps another 3.406s of its call. There were six generated
approval-review requests plus one non-generating warmup. This is measured overlap,
not proof that review computation alone explains the entire difference. Approval
tokens are unavailable; the UX runtime usage counters below do not include them.
Restrictions and approval behavior were retained.

The original preparation request to first delivery was **23m11.349s**, including
**9m16.640s before author start**. That setup span includes preparation holds,
implementation/checkpoint work and the failed TLS launch, not continuous UX
processing. Measured cumulative preparation scripts took 2.433s; that narrower
number does not replace the full setup span. The first proposal receipt was at
20:20:06.679 UTC; the author's final acknowledgement/client completion followed
12.196s later. Analysis, reporting and the final checkpoint occurred afterward.

Through the first-finish boundary, completed response counters report 5,718,849
input tokens, including 5,436,800 cached input tokens, and 21,912 output tokens,
including 3,678 reasoning-output tokens. Whole-turn counters, including the
post-delivery acknowledgement, are 5,961,224 input / 5,676,672 cached input and
22,192 output / 3,850 reasoning-output tokens. These repeated-context counters
are not unique document size or a credit bill; subsets must not be added again.
The same `gpt-6-astra` / `ultra` configuration was used, with wire effort `xhigh`.

## First-proposal completeness and remaining bottlenecks

Finish reports `needs-repair`, with all 16 units saved and `approval: unreviewed`.
The reported inconsistency is `productRealizations.realization-1`: its accepted
mapping still targets `flow:edit-video`, whose status the author explicitly
changed from accepted to proposed in batch three. The contribution store retained
both decisions accurately; validation caught their inconsistency. The existing
document validator stops at its first failure, so this is one reported issue,
not proof that it is the only issue. No repair or independent design review ran.

The new pass changed five units, whereas the historical pass changed four.
Consequently, neither content equivalence nor equal downstream repair effort is
established. The deterministic replay below separately proves exact reconstruction
of the historical target values. No required packaging step was moved to a later
model pass: finish already saved normal authoring units inside the measured window.

The remaining large observed costs are instruction/contract discovery (3m16s),
serial input collection (1m57s), and ongoing decisions plus contribution generation
(7m59s). The 44.4-second gap before batch two demonstrates why a smaller batch is
not automatically cheaper to reason about. Client tool intervals also exceed
internal service work, with automatic approval reviews overlapping most of the
contribution wait; saved telemetry preserves that distinction. These are
future optimization candidates, not unfinished work in this implementation plan.

## Questions and decisions

| Question                                                             | Decision and reason                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Should the contribution protocol replace canonical UX?               | Keep UX 0.4 and existing authoring units. Contributions are durable scratch edits; code materializes complete units for existing consumers.                                                                                                                  |
| How should fields and nested records be addressed?                   | Use familiar schema field names and stable-ID collection selectors. Reject unknown fields; avoid arbitrary JSON paths and positional encodings.                                                                                                              |
| When should negative tests run?                                      | Establish successful creation, editing, persistence and assembly first, then add the plan's focused typo, stale revision and retry checks.                                                                                                                   |
| How much delegation is useful?                                       | One worker prepares the isolated experiment and telemetry while the parent implements the store. No duplicate implementation or repeated review.                                                                                                             |
| Does this invocation authorize the live first-round test?            | Yes: the user explicitly requested execution of the plan, including that experiment. Preserve the saved baseline and verify live Alexa remains unchanged.                                                                                                    |
| Should we lower the model or reasoning setting?                      | No. Preserve the previous UX model and effort so representation changes can be assessed without a model-quality change.                                                                                                                                      |
| Should every contribution require another call to read its receipt?  | No. Include small results inline within the existing response budget while retaining their reusable handles. Large results still use bounded reads.                                                                                                          |
| Must retained output packing be reproduced literally?                | No. Compare exact decoded meaning and canonical values/order; code owns packing. The old output used an invalid alternateInputs default. Record that defect and the remaining semantic defect explicitly.                                                    |
| How should the old outcomecome typo be replayed?                     | Preserve it as an expected rejection. Replay the saved corrected unit for semantic equality; separately demonstrate the tiny explicit field correction.                                                                                                      |
| Why did the first full local checks fail?                            | The sandbox denied child-process launches in existing Git/CLI fixtures. Rerunning those same checks with authorized subprocess access passed; no test assertions were weakened.                                                                              |
| Which state determines finish readiness?                             | Only persisted authoring units. Pending draft content cannot make missing saved dependencies appear ready.                                                                                                                                                   |
| Should the old parent model coordinator be replayed?                 | Use deterministic preparation and one UX author for this experiment. Report that coordination differs and compare author-only timings separately from preparation and total elapsed time.                                                                    |
| Why did the first launch stop before authoring?                      | The observer could not validate the upstream TLS chain. Add operating-system trust to configured Node roots and run a credential-free preflight; keep certificate and hostname verification enabled.                                                         |
| What happens to malformed contributions?                             | Retain rejected groups and their reasons durably, without applying them, so later repair can recover the authored meaning.                                                                                                                                   |
| Should the finish defect trigger another authoring round?            | No. The explicit experiment boundary is first proposal delivery. Record the accepted-mapping/proposed-flow inconsistency and preserve all batches for later continuation.                                                                                    |
| What does the successful timing comparison authorize us to conclude? | Prefer contributions for saved-baseline UX updates because whole-record generation is eliminated and observed delivery work is much smaller. Do not claim equal design quality, a controlled speedup, pure reasoning savings or live cold-start performance. |
| How should the large wire metadata be retained?                      | Keep original evidence privately and publish scalar request timings with deduplicated tool catalogs. Preserve counts, exposure, identities and grouping without repeated payloads or credentials.                                                            |
| Should a discovered measurement boundary discrepancy cause a rerun?  | No. Reanalyze the saved evidence: first-durable time needs both request and author-start origins; the finish result crosses the server boundary by 9ms. No further paid authoring is necessary.                                                              |
| Are more broad reviews or unrelated tests needed?                    | No. One integrated correctness inspection and focused regression checks cover this change; record untested stress/fault cases and leave the explicitly excluded UX review for later.                                                                         |

## Verification and offline evidence

Implementation and verification were observed between approximately 19:38 and
20:00 UTC on 2026-09-29; this is development work, outside the measured UX trial.
The final single-pass suite took 2.054 seconds of test-runner time; the MCP suite
took 8.588 seconds. The six contribution checks after the readiness fix took
0.279 seconds; the same six after rejected-input retention took 0.272 seconds.
Earlier sandbox-denied attempts are test-environment overhead. Required formatting
is checked before each checkpoint.

Coverage includes field edits and sibling preservation, nested frame/alternate
targets, insertion/order/removal, empty-store construction with forward references,
durable restart, exact retries, changed retry rejection, stale revision rejection,
typo retention, assignment scope, bounded inline receipts and persisted-state
readiness. A real HTTP/resident-worker test exercises the MCP path. The single
integrated reviewer found the readiness issue, which was fixed and regression
tested. No further broad review was repeated on unchanged code.

Deferred verification is explicit: exhaustive schema-negative cases, crash/fault
injection across every journal boundary, multiple external writers, live cold-start
performance, independent UX quality/rework, UI and publication. The existing
runtime provides one resident writer per workspace; multi-process stress was not
claimed. No unrelated application-wide test run or live product mutation was needed.

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

All four historical decoded records and canonical values/order were reconstructed
exactly. The historical packed element itself was invalid because it used an
unsupported default field; deterministic repacking changes bytes while preserving
meaning. The retained target's flow-decision defect remains a finish error.
Neither fixture is relabeled valid merely to obtain a successful timing result.

Prepared trial data: `.codex-tmp/incremental-ux-replay/prepare-02/`. Preparation
verified all 611 protected live Alexa files unchanged and preserves the input
facts, imported baseline, contracts and read plan for the paid execution.

The first launch (`first-01`) had an 8.642-second client timestamp window
(9.268s for the whole attempt) but no upstream model frames: TLS failure and
retries consumed that interval. It is retained as
measurement-infrastructure overhead, not UX reasoning or authoring. The retry
(`first-02`) reuses `prepare-02` and began its author at
2026-09-29T20:06:11.970Z. Its recorded attempt setup took 523ms, including
219.4ms of preparation and an 81.2ms TLS preflight.
The prompt supplies 20 input pages totaling 526,503 bytes, with the same
`gpt-6-astra` model and `ultra` setting as the previous UX author.

## Saved artifacts and checkpoints

- [Implementation plan](incremental-ux-contributions-plan.md): all five milestones
  completed, with the actual contribution contract replacing provisional names.
- [Live metrics](incremental-ux-contributions-live-metrics.json) and
  [offline metrics](incremental-ux-contributions-offline-metrics.json): retained
  numerical evidence, hashes and measurement limitations.
- [Experiment instructions](experiments/incremental-ux-replay/README.md): preparation,
  model execution and saved-runtime analysis commands.
- Private attempt `.codex-tmp/incremental-ux-replay/first-02/`: input receipts,
  contracts, exact role/guidance hashes, runtime extraction, observation logs and
  `first-finish-receipt.json`. No credentials or raw model payloads are published.
- Durable units and contribution journal remain in the reused prepared workspace
  under `.codex-tmp/incremental-ux-replay/prepare-01/workspace/.codex-tmp/mcp-workflows/runs/incremental-ux-first-pass/units/`.
  Its `ux.contributions` directory holds the baseline, five immutable batches and
  finish receipt. A later authorized repair can reopen it and obtain current
  revisions without regenerating accepted data. A fresh comparison must prepare
  a new uniquely named attempt from the original retained baseline, not reuse the
  now-edited prepared store as a clean baseline.
- Implementation checkpoint: `5cb6a76`, **Add incremental UX contribution workflow**.
  Completion checkpoint: **Validate incremental UX contributions in a live first round**.
  It records this report, measured evidence, observer-trust
  fix, rejected-data retention and adoption guidance under the adviser's preapproved
  message. Its exact identity is in Git and the completion response. Nothing is pushed.

There is no remaining implementation or experiment obligation in this plan.
The saved first proposal's repair and semantic review remain explicitly outside
the requested first-round test, available for later refinement work.
