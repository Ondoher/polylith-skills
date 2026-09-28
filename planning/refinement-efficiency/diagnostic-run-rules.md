# Proposed rules for the next Alexa performance investigation

Status: attended investigation authorized to start on 2026-09-27 after the owner
updated the description. Instruction-loading optimization is deferred. The
[segment 03 baseline](attended-run-20260927-segment-03.md) is captured and restore-tested.
[Segment 04](attended-run-20260927-segment-04.md) persisted model 7. After further
owner-authorized continuation, [segment 05](attended-run-20260927-segment-05.md)
paused on task-specific product-fact retrieval cost. The same UX agent retains its
loaded instructions and facts; model 7 remains unchanged and no UX proposal has
been delivered. Agent startup costs and specialist architecture changes are deferred.
The owner directed that ordinary errors be fixed and
execution continue, with errors and their measurements recorded. Pause for a new
suspected performance bottleneck, not merely a correctable execution error.
Timing thresholds remain proposed. Earlier autonomous execution permissions do
not override a performance pause.

The owner will be present. Pause as soon as a potential inefficiency is identified
and discuss the evidence and next diagnostic step together. A proven root cause
or crossed timing threshold is not required before bringing it to the owner.

## Objective and scope

Find what delays a real refinement, including unnecessary work, rather than
assuming transferred bytes are the bottleneck. Observe preparation, description
processing, agent work, review, assembly, persistence and rendering. Publication
through `generate-prd` is outside this run unless requested.

Use the current process and saved valid design data. Do not simultaneously adopt
experimental formats, change models or reasoning effort, remove review, migrate
schemas, or reset the product. Identify the description delta and expected affected
units before dispatch; record any required expansion of scope and its reason.
Do not bypass a current full-proposal requirement to make the result look faster.

## Measurement

- Start the overall clock before instruction discovery. Separate setup,
  refinement, diagnosis, and waiting for the owner; retain total elapsed time.
- Record parent and agent boundaries: dispatch, observed start, first completed
  delivery, later deliveries, consumption, completion, and dependency waits.
- Separate observed output streams, observed reasoning streams, tool execution,
  local helper phases, and unattributed time where evidence permits. These are
  client observations, not measurements of provider compute or network latency.
- Count new, changed and reused units; input/output bytes; calls; and repair
  attempts. Record tokens, cached inputs, reasoning usage and cost only when
  actually available, with their source. Usage may arrive only after completion.
- Measure instrumentation overhead separately. Use runtime records and small
  helpers; do not ask agents to author large telemetry payloads. Do not add
  overlapping actor times to claim total elapsed time.
- Use bounded input reads with completeness checks. A file existing on disk does
  not prove its contents reached an agent without truncation.
- Keep existing tool-output restrictions. Split combined output into bounded
  sections with room for labels and metadata; do not raise caps to recover from
  this incident. Check both inner and outer truncation and retain delivered ranges.
  The [bounded reader](bounded-reader-validation.md) now provides this pagination
  for large file batches; forward one raw page per response and follow its cursor.

### Retain the complete measurement record

Persist every performance measurement collected, including fast and successful
operations, failed or interrupted attempts, diagnostic work, and each resumption.
Keep machine-readable observations as well as the human-readable report; do not
retain only totals, averages, or the measurements that triggered a pause.

Associate observations with run, segment, attempt, actor, operation and relevant
unit identifiers. Preserve timestamps, units, observed values, evidence sources,
measurement methods, and missing or incomplete boundaries. Keep available usage
records with request identifiers so later analysis can deduplicate them. Preserve
overlapping intervals so later analysis can distinguish concurrent work from the
sequence of dependencies determining completion time.

Store measurements alongside the run artifacts and link them from the investigation
report. Preserve extracted performance metadata from transient runtime records;
raw prompts and product payloads are not telemetry. Keep original observations
when correcting interpretations or adding derived metrics. Record changes to code,
model settings, inputs and instrumentation between segments so later comparisons
can explain differences. These records support holistic analysis across the full
run, including work completed before any suspected bottleneck.

## Proposed stop conditions

Potential inefficiency is itself sufficient reason to pause for discussion. The
thresholds below are supplementary diagnostic tripwires for a modest edit, not
proof that an operation is defective or a promise about achievable performance.
Elapsed timers use the boundaries below. Check them every five seconds
when the host permits observation; record detection delay and monitoring gaps.

| Condition                                                                                                   | Proposed trigger                                                                                                                |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Local parsing, validation, assembly, persistence or rendering operation                                     | More than 5 seconds, excluding model work                                                                                       |
| Ready work waiting for dispatch, or a completed artifact waiting to be consumed                             | More than 10 seconds without a required dependency                                                                              |
| One observed model output item remains unfinished                                                           | More than 30 seconds, if item boundaries are exposed                                                                            |
| An active agent has delivered no usable saved unit                                                          | More than 60 seconds from observed start or last usable delivery; label dispatch-only timing separately if start is unavailable |
| Active refinement since starting or deliberately resuming                                                   | 120 seconds; checkpoint for analysis even if no individual timer fired                                                          |
| Truncated input, rejected delivery, unplanned repeated pass, or unexplained regeneration of unchanged units | First occurrence; stop before an automatic retry                                                                                |
| A local edit requires whole-product proposal regeneration or review invalidation                            | Stop when discovered and record the contract/dependency requiring it                                                            |

The 60-second agent trigger also catches long reasoning or unknown intervals;
they must not be mislabeled as output generation. A required broad review can be
legitimate and still be the performance limitation we need to examine. Progress
messages alone do not reset delivery timers.
Each deliberate resumption starts a new monitoring segment; cumulative elapsed
time and usage remain in the report.

## What a stop means

Freeze new dispatch and automatic retries across the run, notify the owner, and
capture the triggering operation, timings, dependencies and current artifacts.
Stop continuing model work rather than allowing other branches to spend minutes
while diagnosis proceeds. Request preservation of completed work where feasible;
do not wait for the suspicious large response to finish just to obtain a file.

Allow an already executing atomic persistence operation to settle and inspect its
receipt. Interruption is subject to host capabilities and may not be immediate;
record any delay or work that continued. An unfinished tool-call payload or hidden
agent state may not be recoverable. Resume from the last durable unit, not a claim
that every generated token was saved.

## Diagnosis and mitigation

At the pause, preserve and inspect the available evidence, then explain the
potential inefficiency, measured impact and remaining uncertainty to the owner.
Do not continue autonomously until a root cause is proven before having that
discussion. Together choose whether to inspect further, add finer instrumentation,
replay one operation, try a mitigation, or resume with the observation recorded.

When further diagnosis is chosen, instrument the narrowest uncertain interval.
Prefer deterministic local replay from saved inputs. A model replay, if needed,
should cover the smallest suspect unit with an explicit stop limit; do not repeat
the complete refinement to measure one operation. Distinguish demonstrated causes
from hypotheses, and preserve all resulting measurements, including inconclusive
results. Resume from saved valid work after the agreed next step.

## Preservation and resumption

Keep a run manifest and immutable attempt records containing:

- Source snapshot/hash, baseline artifact hashes, relevant schema and script
  versions, and the requested delta.
- Task and unit identifiers, dependencies, input hashes, completed output paths
  and hashes, and validation/review receipts.
- Separate states for staged, validated, reviewed, committed-to-product and
  incomplete work. Saved work is not automatically accepted work.
- Pending units, stop reason, measurements, attempted operations, and the exact
  next action. Keep interrupted attempts instead of overwriting their evidence.

Save completed units at existing delivery boundaries. Reuse work produced before
and during this investigation when its inputs and applicable checks remain valid.
After a fix, recompute only invalidated work as supported by current contracts;
record broader invalidation rather than claiming fine-grained reuse already exists.
Verify product persistence receipts before retrying an interrupted write. No full
restart merely because a conversation paused, an agent stopped, or analysis began.

## Rollback and repeatable reruns

Before the first product mutation, create a restorable baseline of the pre-run
state and freeze a separate copy of the edited description and its linked inputs.
The baseline is the starting derived design; the edited description is the input
we want to process again. Rolling back a run must not undo the owner's description
change. Hashes identify the baseline but do not replace actual backup copies.

Inventory the files and directories the run can modify, including active pointers,
product/design artifacts, review and provenance records, indexes, generated output,
and staging or caches that influence whether work is skipped. Include relevant
untracked and ignored files and metadata used by freshness checks. Record which
paths were absent initially, so new attempt-created files cannot remain active
after restoration. A Git commit alone does not establish a complete backup.

Keep the immutable baseline, attempt outputs and all performance evidence outside
the restoration boundary. If evidence is also written inside the product tree,
archive it separately before restoring. A subsequent attempt gets a new identifier
and never overwrites the previous attempt or its measurements.

When a rerun is chosen during discussion:

1. Stop all writers and archive the current attempt, including incomplete work.
2. Check for intervening owner or unrelated changes. Preserve them and reconcile
   any overlap rather than overwriting them as part of rollback.
3. Restore the baseline within the inventoried scope, including initial absences;
   remove only verified attempt-created state from active use. Verify restored
   contents and active pointers against the baseline manifest before proceeding.
4. Use the frozen edited input for the repeated refinement. If the owner has since
   edited it again, preserve that new version and identify which input is being
   tested. Record the code, settings and instrumentation used for each attempt;
   an agreed process fix can remain in place while the product state is restored.

Distinguish **resume** from **rerun**. Resume reuses valid completed units. Rerun
restores the pre-run baseline and prevents outputs or caches created by the previous
attempt from silently skipping the work being measured. Retain those outputs in
the archive; reuse them only when explicitly measuring a resumed or cached path.
Record agent-context reuse and observable cache differences. Restoring files does
not reset provider caches, service conditions, or hidden agent state, so do not
claim identical timing conditions or deterministic model output.

Before authorizing product writes in execution, verify the backup inventory and
exercise the restore procedure in a disposable local copy. Record backup, restore
and verification costs separately from refinement. This document establishes the
requirement; no Alexa baseline has been captured or restored yet.

## Preparation required before the authorized run

Existing [measurement support](../../skills/refine-design/references/performance-measurement.md)
records spans and helper timings; it is not an automatic watchdog. Once these rules
are settled, prepare the smallest recording and monitoring support needed for this
attended run. A general unattended watchdog is not a prerequisite. Confirm which
runtime boundaries are observable and verify recording and any added stop detection
locally. Missing boundaries remain unknown and use the broader timers above; report
material monitoring gaps before starting product work. Prepare and verify the
baseline and restoration procedure above before the first product mutation.

The first run ends at the first diagnostic stop or successful refinement. Its report
must include what completed, what remains, elapsed and attributed time, known usage,
unknowns, the resumption location, and the proposed next investigation or mitigation.

Evidence motivating these rules: [runtime diagnosis](performance-diagnosis.md),
[large authoring trial](shared-text-large-trial.md), and
[actual action reuse](full-run-action-reuse.md). These establish costs and limitations
in earlier work, not the cause of the owner's next edit's performance.
