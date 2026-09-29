# Test staged UX input with early evidence

Status: stages 1–3 complete, 2026-09-29. The matched pilot found less than 1%
overall saving and retained first-proposal defects; see the
[execution report](staged-ux-input-execution.md). Stages 4–5 have not been run.
This plan follows the completed
[incremental contribution experiment](incremental-ux-contributions-execution.md).

## Question and scope

Does presenting one coherent UX task's information at a time reduce the model
work and elapsed time required to produce the first UX proposal, compared with
presenting the same information before authoring begins?

The target is how much information the author must consider simultaneously.
Keep total required information and output obligations equal. This experiment
does not test selective omission, smaller transport pages, a different output
format, parallel authors, prewarming or a different model. Retain incremental
contributions and the existing larger read window in both conditions.

The owner's primary measure is request-to-completion elapsed time. This test
covers only the first UX authoring round, through the first `units.finish`
receipt. Include preparation performed after the request, collection, authoring,
coordination and materialization. Report fixed instruction startup separately
without claiming to eliminate it. Review, a subsequent repair round, UI and
publication remain outside the experiment.

Do not call observed reasoning-item streams pure reasoning time. Reasoning can
continue while commands are generated; provider processing and scheduling are
not fully observable. Test whether the whole authoring task gets cheaper and
faster while retaining its required meaning.

## Matched conditions

| Condition          | Input delivery                                                       | Authoring and output                                                    |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A: all input first | Shared context and every test packet before the first task           | Process the specified tasks in order and save incremental contributions |
| B: staged input    | Shared context, then the current task's packet when that task starts | The same tasks, order, contribution contract and completion boundary    |

Use one fresh UX author per condition, retained across all its packets. Use the
same role, model, effort, operation contracts, eventual authorized record scope, baseline, task scope,
read limits, timing markers and output validation. Continue with the current
`gpt-6-astra` / `ultra` setting and record the effective runtime setting.
Keep the task-completion/continuation handshake identical in both conditions;
only input availability and the necessary read timing differ. Record actual
tool grouping rather than assuming parallel execution.

Release readable handles according to the condition; do not grant a whole-store
`units.read` shortcut around the packet protocol in either condition. Keep the
same contribution/write authority. Verify actual exposure from the recorded
tool results, not just the intended assignment.

The author in B must not receive the full facts or UX payload through its prompt,
history, a broad unit-read response or inherited parent context. Supply only a
compact common index and authorized current data. Both conditions eventually
receive the same source records and values. Persisted baseline data available to
the assembler is not automatically input exposed to the author.

Earlier packets remain in the same agent's conversation. This tests staged
attention and delayed input, not a hard context-size limit. Track later packets
to see whether any benefit shrinks as context accumulates.

## Build meaningful packets mechanically

Reuse trusted facts and the original saved UX baseline. Parsing and fact
extraction are assumed correct. Never give either author a completed historical
answer or select packet boundaries from the successful contribution batches.

Shared context contains source/model identity, product orientation, cross-cutting
constraints, applicable decisions and locks, and a compact index of stable record
IDs and relationships. Keep actual global rules intact; avoid a model-authored
summary that could change or omit meaning.

A task packet contains an interaction element or a coherent task within a large
element: applicable requirements, existing flows/actions/frames, relevant states,
local constraints and needed referenced-element details. Use existing ownership,
source traces and reference fields to assemble it. Do not invent another graph
model or run a design agent merely to prepare the packets.

For Alexa, much of the change concerns the video workspace. Treating that entire
workspace as one packet could defeat the experiment. A source-grounded pilot
can separate a local clip operation, a related copy/trim operation and a task
that exercises their shared behavior. Choose and freeze the exact three tasks
from the description/facts and baseline before authoring. If those tasks require
nearly the whole product, choose a smaller complete slice equally for A and B.

Supply known shared dependencies before dependent decisions. For references whose
details genuinely become necessary later, release those details, preserve their
handles and record the request. Do not force the author to guess to satisfy a
packet boundary. If B repeatedly needs future packets early, that is evidence
against the chosen boundaries. Merge tightly coupled tasks once and label the
revised experiment; do not silently change conditions mid-comparison.

## Stages and early decision points

### 1. Inspect and partition saved data — no paid author

Create shared context, three small pilot packets and a manifest with task order,
record IDs, source hashes, byte counts, required dependencies and intended scope.
Use exact records or source-addressed projections, not newly authored UX meaning.
Record packet construction time.

Verify mechanically that A and B have the same eventual input union and that
every required record is represented without changed values or missing fields.
Count unavoidable duplication between packets and shared context. A source item
that does not fit needs an explicit home; it cannot disappear from the pilot's
declared scope or, later, the full-product run.

**Early report:** packet sizes, largest working set, shared-context size, duplicated
bytes, dependencies and preparation cost. This shows whether the planned chunks
actually reduce the amount introduced at each decision. If the shared context
or first packet is effectively the whole input, revise once before a paid test.

### 2. Check delivery and measurement — no paid author

Extend the existing
[`incremental-ux-replay` harness](experiments/incremental-ux-replay/README.md),
reusing its isolation, input hashes, MCP assignment, contribution journal,
observer, TLS preflight and analyzer. Avoid another service or storage model.

The current launcher sends one prompt and closes stdin. Explicitly implement
same-thread continuation for packet boundaries using the supported client
continuation path; do not assume more text can be sent to that closed stdin.
Both A and B use the same short boundary acknowledgement and continuation.
Generic instructions and contracts are loaded once per author, not once per
packet. Use existing scratch receipts/phase records for compact completion
signals and dependency requests; do not require explanatory essays.

A deterministic driver supplies the next packet after the current task's
contributions or explicit unchanged/deferred disposition have been saved. The
driver does not interpret UX or conduct a second design pass. Only one author
writes each store. Call `units.finish` once after the assigned tasks, not once
per packet.

Exercise the protocol with saved/synthetic deliveries: verify input exposure,
exact received-page hashes, saved progress, continuation and timing capture.
This checks tooling, not model behavior. Add happy-path coverage first; add a
focused regression for an actual protocol error instead of a broad test matrix.

**Early report:** whether staged delivery works, calls added by the protocol,
mechanical timings and recovery behavior. If delivering each packet demands
repeated setup or reconstruction, simplify before paying for UX authoring.

### 3. Run one matched three-task pilot

Run A and B on isolated copies of the original baseline. Choose and record the
condition order in advance. Execute sequentially to avoid concurrent-run
contention; retain cache/usage counters because sequential order can still affect
provider behavior. Use one fresh thread per condition, no conversation sharing
and no knowledge of the other result.

Both authors perform real UX work from facts and baseline, rather than translating
a supplied finished answer. They save contributions at natural decision points.
Both use the same scoped tasks and delivery obligations; a shorter answer is not
automatically a successful result.

Persist a progress row after each task. As corresponding rows become available,
compare first-decision delivery, task completion, cumulative time, calls, output
and revisions of earlier decisions. The first task is an early signal, not the
verdict: A pays for collecting all pilot input upfront, while B pays gradually.
Judge the completed three-task pilot before claiming a total saving.

If later information causes the author to revise earlier contributions during
this first round, keep those revisions and include their cost. Pending links are
allowed; repeated global reconsideration is an outcome to measure. Finish includes
normal deterministic materialization/reference checks. Save its defects and stop
at that first proposal; do not initiate a downstream repair or review round.

Check a short source-grounded quality rubric fixed before the pilot: assigned
requirements addressed or explicitly unresolved, coherent local steps, shared
behavior respected, no unsupported decisions, and usable references. Compare
meaning, not byte-identical prose or equal contribution counts. Use deterministic
checks and a focused parent inspection; do not launch repeated broad reviewers.
This is an experiment-quality check, not independent UX acceptance.

**Early report:** per-task and total A/B results, coverage, defects, forward reads
and retrospective revisions, with a continue/revise/stop recommendation.

### 4. Decide whether a larger run is worth its cost

Use these practical triage rules, declared before measuring. Percentages are
screening thresholds, not statistical confidence:

- **Promising:** B completes the same pilot scope about 20% faster in the window
  from instructions-ready through first finish, with no material quality loss,
  hidden later work or escalating revisions. Include all reads and transitions
  within that window and report request-to-finish separately. Continue to stage 5.
- **Unclear:** a smaller difference, inconsistent task results or noisy startup/
  provider timings. Inspect saved traces. At most one additional matched pilot
  pair is justified if it can answer a specific uncertainty; reverse condition
  order and reuse frozen inputs and tooling. Otherwise report inconclusive.
- **Unhelpful:** B is substantially slower, misses necessary context, or spends
  its saving reopening prior work. Stop before a full run. Record whether a larger
  coherent packet is a plausible fix; do not start a packet-size sweep.

A clear tooling fault is fixed and its affected check rerun. Preserve completed
data and failed-attempt evidence. Resuming after a fault may be useful for
diagnosis, but does not turn a warm, interrupted thread into a fresh matched run.
Do not discard awkward outcomes or rerun merely to obtain a favorable number.

### 5. Only if promising, run one full first-round pair

Expand the packet manifest to cover the full original facts and baseline UX.
Keep shared records, constraints, source values, output obligations and eventual
input coverage equal across A and B; include explicit unchanged dispositions
where no contribution is needed. Reuse the prepared packet index and earlier
measurement tooling.

Run fresh A and B author threads on new isolated stores. Do not reuse pilot-authored
decisions as inputs. Compare against this fresh all-input-first control; the old
13m55s result is historical context, since harness/assignment differences prevent
using it alone as a controlled baseline.

Report after the first task, a middle task and first finish. Examine whether
task cost and revisions rise as the context grows. Include all packet switches,
lookups, reconciliation during authoring and final materialization. Keep global
errors visible; the existing validator can stop at its first failure, so a single
reported issue does not prove there are no others.

Recommend adoption only if the full first-round comparison supports a useful
net time benefit without transferring required UX work to later stages. State
remaining quality uncertainty. A live initial-product test, independent review,
repair, UI and publication remain separately unmeasured.

## Measurements at each task boundary

Prefer automatic server/observer timestamps and existing short receipts. Use
the same extra markers in A and B, and account for their calls and approval cost.

| Measurement                                                                                                                                  | Why retain it                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Original request, preparation, instructions-ready, task release, input complete, first accepted contribution, task complete and first finish | Separates startup, data arrival, useful progress and total waiting time            |
| Per-task and cumulative elapsed time, with fixed startup separate                                                                            | Shows early benefit and whether it survives later work                             |
| Actual output streams, reasoning-item streams, tool intervals, gaps and usage counters                                                       | Describes observed activity without claiming access to private thought             |
| Read count/bytes, unique records, cached input, repeated reads and future-packet requests                                                    | Detects hidden data omission, extra context gathering and accumulated context cost |
| Generated argument bytes/tokens when available, accepted/rejected batches, output coverage                                                   | Prevents shorter or incomplete output being counted as success                     |
| Changes to previously completed tasks and compact reason codes                                                                               | Measures deferred reconciliation or decisions reversed by later context            |
| Service time, client tool time and approval-review overlap                                                                                   | Accounts for extra transitions without mistaking them for design reasoning         |
| Input/contract hashes, condition order, faults, pauses and raw-evidence pointers                                                             | Makes replay and comparison auditable without regeneration                         |

A task completion receipt identifies saved contributions, unchanged records and
open dependencies. It is not a prose restatement of the task. No-op tasks still
need an explicit disposition. For every reported interval, identify whether it
is nested or sequential; do not add overlapping windows or subtract all output
time to infer reasoning time.

Any packet preparation that a real refine-design invocation must perform belongs
in its request-to-completion accounting. Record reused preparation and work done
before the request separately; do not hide costs through a changed start marker.

## Progress artifacts, credit control and completion

Save a packet manifest, append-only progress rows, exact input/output receipts,
runtime metadata and a short report under a new uniquely named experiment folder.
Keep raw product data and capabilities in ignored scratch; publish sanitized
metrics and decisions under `planning/refinement-efficiency/`. Hash protected live
Alexa files before and after. Retain a pristine baseline; never use the previously
edited `prepare-01` store as a clean starting point.

The first spending decision comes after local stages 1–2. The first model evidence
comes from two small author runs in stage 3. There is no model sweep, broad review
schedule or automatic full-refinement benchmark. Repeat a pilot pair only for a
specific unresolved question. Advance to two full first-round runs only when the
pilot is promising. Record all measurements, including unsuccessful attempts.

Use checkpoint-advisor at coherent implementation and completed-evidence milestones
under the owner's standing preapproval when executing this plan. Resolve routine
questions with judgment, retain decisions and reuse generated data. No push or live
product promotion is part of this test.

Completion means a measured **adopt**, **revise**, **reject** or **inconclusive**
decision with evidence and limitations. A negative pilot can complete the test
without spending on stage 5. Successful staged-input testing does not automatically
claim lower aggregate credits or prove that private reasoning alone was reduced.
