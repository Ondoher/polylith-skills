# Staged UX input pilot execution

Stages 1?3 are complete, 2026-09-29, under the personal independent-execution
skill. **This pilot did not demonstrate a useful overall performance improvement.**
All-input-first took **16m18s**; staged input took **16m11s**, only **0.7% less**.
After removing instruction loading, the difference was **1.1%**. Both first
proposals need repair. Stages 4?5, further paid trials, independent UX review,
downstream repair and UI generation were not run.

Recommendation: **set aside a staged-input performance rollout on this evidence**.
Keep the reusable delivery and measurement tooling. Before a larger trial,
address missing information about references to shared records in the compact
packets. There is no current justification for paying for a full-product pair.
This does not establish that staging cannot help larger or differently partitioned
workloads; this three-task pair supplied no useful total saving.

See the [plan](staged-ux-input-plan.md),
[complete metrics](staged-ux-input-metrics.json) and
[reproduction commands](experiments/incremental-ux-replay/README.md).

## Implementation and matched scope

The packet builder selects exact source-addressed projections from the original
saved facts and UX baseline, with source/packet hashes, selected identities,
duplicate checks, task order and a fixed quality rubric. Neither author received
historical authored answers.

The existing harness now supports narrow per-task MCP grants, durable progress
receipts and same-thread continuation through the supported
[`codex exec resume <SESSION_ID>`](https://developers.openai.com/codex/noninteractive#resume-a-non-interactive-session)
path. Each condition used one fresh thread, resumed twice, and one final
`units.finish`. Generic instructions and delivered packets were not reloaded
between tasks. The analyzer checks actual received-page hashes and exposure
timing, task windows, contribution generation, service time, usage, revisits,
first-proposal defects and preservation.

Local protocol checks preceded the paid trials. A (all input first) then B
(staged) ran sequentially with the same `gpt-6-astra` model, configured `ultra` effort,
role/guidance hashes, baseline, tasks and output contract. The three tasks were
Update Named Clip, Save Clip to Library and occurrence trimming. The CLI/runtime
recorded `ultra`; observed model requests used `xhigh` in both conditions. This
distinction is retained rather than assuming the configuration label is the wire
value.

**Both received exactly the same eventual pilot input.** This means all _pilot_
input, not the complete product description. Earlier packets remained in the
thread; the test delayed input without imposing a hard context limit or using
different authors per task.

## Packet evidence

| Input             |   Bytes | First exposed in A  | First exposed in B         |
| ----------------- | ------: | ------------------- | -------------------------- |
| Scoped identities |   5,829 | Task 1              | Task 1                     |
| Shared context    |  25,217 | Task 1              | Task 1                     |
| Update Named Clip |  20,415 | Task 1              | Task 1                     |
| Save Clip         |  19,896 | Task 1              | Task 2                     |
| Occurrence trim   |  29,956 | Task 1              | Task 3                     |
| Total             | 101,313 | Six pages initially | Three, one, then two pages |

B initially received **51,461 bytes**, 49.2% less than A. Frozen source values
were exact, with no duplicate source-pointer projections. The initial partition
had 72,338 shared bytes; it was revised once before paid execution by moving
task-specific frames/research and omitting unrelated research equally from both
conditions' declared scope.

Packet construction took **17.089 ms**. That measures mechanical projection and
writing, **not the work of choosing the partition**. Local preparation/protocol
checks took **2.295s / 2.408s**. Future reads were denied by staged grants; eventual
received inputs reconstructed the expected hashes. Actual authors received all
six pages in the intended stages, with no rereads, early packet requests or
missing-context continuation retries.

## Elapsed time

Task windows begin at the preceding task's completion marker; task 1 begins at
instruction-ready. They include collection, model activity, commands, tools and
continuation overhead, and are additive through final delivery.

| Window                                        | A: all input first | B: staged input |
| --------------------------------------------- | -----------------: | --------------: |
| Instruction loading                           |           116.127s |        118.549s |
| Update Named Clip                             |           331.607s |        283.866s |
| Save Clip                                     |           224.875s |        232.462s |
| Occurrence trim                               |           294.652s |        327.969s |
| Final task marker ? first proposal            |            10.294s |          7.887s |
| Author start ? first proposal                 |       **977.555s** |    **970.733s** |
| Instructions ready ? first proposal           |       **861.428s** |    **852.184s** |
| Isolated attempt preparation ? first proposal |       **980.019s** |    **974.445s** |

Task 1 was **14.4% faster**, but task 2 was **3.4% slower** and task 3 was **11.3%
slower**. The initial 47.741-second advantage fell to 6.822 seconds overall,
within plausible single-run variation and far below the plan's rough 20%
promising-result threshold.

Before-input-ready windows were **44.813 / 13.219 / 12.417 seconds** for A and
**35.061 / 19.712 / 25.685 seconds** for B. Later A tasks had no new product reads;
those windows contain acknowledgement, continuation and the next marker. B paid
for later reads as intended. These are not isolated transfer times.

The attempt totals include mechanical setup, but exclude experiment construction,
partition selection, the gap between conditions and subsequent analysis. They do
not measure a complete live `refine-design` request. Final client acknowledgements
occurred after first-proposal delivery and are recorded separately.

## Activity, output and usage

| Author-window observation                           |            A |            B |
| --------------------------------------------------- | -----------: | -----------: |
| Output-item streams                                 |     460.173s |     509.494s |
| Reasoning-item streams                              |     329.384s |     334.652s |
| Tool intervals                                      |      34.689s |      36.287s |
| Unattributed time                                   |     153.309s |      90.301s |
| Contribution-command generation, a subset of output | **338.610s** | **382.730s** |
| Contribution command argument bytes                 |       56,123 |       63,802 |
| Contribution calls / changes                        |       6 / 82 |       6 / 87 |
| First durable contribution from author start        |     277.152s |     340.026s |
| Tool calls started by first proposal                |           36 |           37 |
| Observed workflow-service execution                 |    226.165ms |    282.824ms |

Command generation increased **13.0%**; contribution argument bytes increased
**13.7%**. B's first batch was larger (24 changes versus 17), so time to first
save does not compare equal units of work. Both used six contribution batches
and consumed inline receipts without additional receipt reads. There were no
workflow-service failures or contribution-receipt issues; the final assembled
proposals nevertheless failed validation.

Lower unattributed time in B offset increased output time. We cannot attribute
that difference to reduced useful reasoning. Stream intervals are client
observations, not isolated provider computation or private thought. Tool intervals
include dispatch, approval and result delivery. Contribution generation is a
**subset** of output and author time; service time is nested within tool intervals.

Actual unique response counters completed by first proposal:

| Tokens                      |         A |         B |
| --------------------------- | --------: | --------: |
| Input, including cached     | 2,069,686 | 2,091,430 |
| Cached input subset         | 1,975,040 | 1,879,168 |
| Output, including reasoning |    25,174 |    28,505 |
| Reasoning output subset     |     9,339 |    11,018 |

These are usage counters, not credit estimates. CLI totals are cumulative across
resumed turns and must not be added. Final CLI usage also includes the later
acknowledgement. Cache behavior, sequential order and different authored
decisions remain confounders; this pair does not demonstrate a credit saving.

## Coverage, revisits and defects

Focused parent inspection found the core rubric behaviors in both authored flows:
boundary-only library updates with stable identity and unchanged existing copies;
composition-wide Save Clip without modifying the active video; independent later
copies; distinct Start/End trim rules, frame minimum, pushes/gaps and retained
hidden grouped content; and stopped preview, commit restrictions and recovery
that preserve context. Both explicitly leave naming policy unresolved. A also
records assembly edge-bound interpretation and library-operation reversal limits.

This is a scoped experiment assessment, not independent UX acceptance. The
coherence/reference criterion **did not pass**:

1. A's first validator error is a missing `shared-clip-update-collision` question
   referenced by `video-framing-view`. The question was deleted, but that frame
   was outside the supplied packets and still references it.
2. B's first validator error is missing `trim-occurrence.cancellation.actionRef`
   while cancellation is marked available. Its prose describes cancellation but
   omits the required executable reference.
3. A focused reference scan confirms the same dangling question in B. The first
   validator error is not an exhaustive defect count.

The shared-reference defect exposes a **compact-input dependency-coverage gap
common to both conditions**, not a staging-only failure. Exact selected data does
not guarantee sufficient context for global edits. A future correction should
provide a compact incoming-reference index for shared records or mechanically
complete their reference handling before deletion.

B explicitly revisited Update Named Clip during task 3 after its new projection
exposed obsolete question references in `video-view` and `edit-video`. A declared
no retrospective task revision, although shared question-reference fields changed
across tasks there too. Metrics preserve declared revisits and candidate field
overlaps. Their isolated reasoning cost cannot be separated from contributions
containing new work; it remains in task totals.

Both stores retain all **16 baseline units**. Only five assigned units changed;
the 11 unassigned units remain equal to baseline. Both verified **611 live Alexa
files unchanged**. Journals and proposals are retained for targeted repair/replay
but were not promoted or repaired after first delivery, honoring the first-round
boundary.

## Questions and decisions made independently

| Question                                   | Decision and reason                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What first trial is sufficient?            | Three related source-defined tasks with a rubric frozen before execution; no full-product pair.                                                                  |
| Is shared context too broad?               | Revise once before paying: move task data and omit unrelated material equally. Preserve both partitions.                                                         |
| Should previous answers seed authors?      | No. Reuse facts, baseline and tooling, while measuring real UX authoring.                                                                                        |
| How to continue after stdin closes?        | Supported CLI resume, same thread ID and store, without repeating instruction or packet reads.                                                                   |
| Run both trials concurrently?              | No. A then B avoids resource contention; retain order/cache uncertainty.                                                                                         |
| What if B needs future context?            | Permit a compact dependency request and resume with that packet. None occurred.                                                                                  |
| What if output has defects?                | Preserve and report first proposals without the excluded review/repair round. Correct harness/accounting errors without reauthoring.                             |
| How to count usage and retained data?      | Use unique response counters, not a sum of cumulative CLI totals. Inspect all retained units rather than interpreting five finish receipts as eleven lost units. |
| Does the first-task win justify expansion? | No. Complete the pair; the total saving shrank below 1% and both proposals need repair.                                                                          |
| Run again to clarify noise?                | Not within this scope. Stage 3 is complete; preserve the inconclusive result and stop.                                                                           |

Reviews were limited to the checkpoint adviser at coherent milestones and focused
parent quality inspection. No repeated standards/UX reviewer pass or model sweep
was added.

## Verification and evidence

Checks passed for exact projections/hashes, future-read denial, eventual coverage,
real three-turn continuity, one finish per author, client page reconstruction,
baseline/live preservation, runtime accounting and the original harness preparation
path. JavaScript syntax and repository formatting checks passed. Actual happy-path
runs exercised the new protocol. Proposal defects are preserved; broad negative
testing, independent quality review and full refinement-performance testing remain
outside this scope.

- Setup checkpoint: `a7581fc` ? **Prepare staged UX input pilot**.
- Final evidence checkpoint uses the adviser's preapproved message; its hash is
  in Git history and the final response.
- Frozen packets: `.codex-tmp/staged-ux-pilot/packets-02/`.
- Control: `.codex-tmp/incremental-ux-replay/pilot-all-live-01/`.
- Staged: `.codex-tmp/incremental-ux-replay/pilot-staged-live-01/`.
- Public evidence: [staged-ux-input-metrics.json](staged-ux-input-metrics.json).

Metrics hash the underlying control, runtime, wire, service, contract, input and
progress files. Product payloads, prompts, capabilities and raw logs remain in
ignored scratch. No compatibility layer, production UX schema change or live
product mutation was introduced.
