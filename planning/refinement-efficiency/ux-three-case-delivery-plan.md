# Three cases in one UX agent: upfront versus as-needed input

Follow-up decision, 2026-09-29: **this optimization path is set aside at the
owner's request**. Preserve the completed experiment; no additional repetitions
or production adoption are planned unless the owner reopens the question.

Status: **executed**, 2026-09-29. See the [results](ux-three-case-delivery-execution.md)
and [measurements](ux-three-case-delivery-metrics.json). Both authors followed the
protocol; staged delivery was 29.4% slower and used 52.0% more reasoning tokens
in this one pair. The design below retains the frozen pre-run protocol.
This is the next test after the [Save Clip reversal investigation](save-range-reversal-analysis.md).
It asks whether delaying unrelated data until the agent needs it reduces the
reasoning required to complete a larger sequence of actual UX decisions.

## Two fresh instances, one continuous instance per condition

Both instances complete **Save Clip → Trim Group → Update Clip**, in that order,
using the three frozen questions and their eight-criterion rubrics. Each is one
continuous native UX author invocation, with no per-case agent replacement or
thread resume. Earlier records and saved answers remain in its conversation.
Each scenario retains its original baseline; completing a case does not change
the source product data used by the next one.

| Point in the sequence | All data upfront                    | Data as needed                           |
| --------------------- | ----------------------------------- | ---------------------------------------- |
| Before Save Clip      | Read all three packets: 31 records  | Read the Save Clip packet: 19 records    |
| Before Trim Group     | Reuse existing context              | Read 5 additional records: 24 cumulative |
| Before Update Clip    | Reuse existing context              | Read 7 additional records: 31 cumulative |
| Output                | Save each case's answer immediately | Save each case's answer immediately      |

Here **as needed means when its case begins**. The harness supplies complete
prepared case packets; this first comparison does not also test the agent's
ability to invent retrieval queries or choose which records matter. That keeps
data selection separate from delivery timing. It also does not clear earlier
context, so this tests gradual accumulation rather than a fixed-size memory window.

## Equal evidence and output obligations

Both conditions receive exactly the same **31 unique source records**, byte-for-byte,
once each. They are the deduplicated union of the three earlier focused packets.
Shared records arrive with the first case that needs them and are reused afterward.
Every case's required records are present by its start. The questions, rubrics,
source IDs, prior UX conflicts and constraints are retained; historical answers
are excluded.

The three packets total **37,226 bytes**:

| Packet      | New records |  Bytes |
| ----------- | ----------: | -----: |
| Save Clip   |          19 | 18,560 |
| Trim Group  |           5 |  8,227 |
| Update Clip |           7 | 10,439 |

The combined data exceeds the existing 28,000-byte MCP window. Upfront therefore
means three complete reads before solving the first case, not one oversized
return. Each condition performs exactly **three product reads and three answer
saves**, waiting for each receipt before the next call. Batching is held fixed
for this experiment; only the ordering of those reads relative to answers changes.

The output remains the same six prose fields, source references and unresolved
facts for each case, at most 70 words per prose field and 350 per answer. Each
answer is saved once. There is no final combined artifact to regenerate, answer
repair, UX review, UI work, or live product mutation. The parent scores all 24
frozen rubric criteria after delivery and retains omissions explicitly.

## Fixed instruction preparation

The supervisor supplies the same frozen **51,160-byte instruction bundle** and
the same `result.store` contract in the initial message. The bundle contains the
existing UX assessment, UX guidance, research guidance and MCP workflow sources.
The native UX role is retained with an explicit experimental instruction that
these sources are already loaded; the agent does not discover files, inspect
helper code or reload them.

The role, bundle, source packet and experiment-module hashes are captured. Native
tool discovery, if necessary, occurs before the ready marker; later discovery
or shell commands invalidate the comparison. Dynamic access/handle/session IDs
and the short delivery-schedule instruction necessarily differ between instances.
This greatly narrows the startup variation found in the earlier suite; actual
context parity must still be checked in the resulting traces.

## Execution and early evidence

1. Run one fresh **upfront** author and save its three first answers and telemetry.
   Inspect delivery order, input hashes, case completeness and counters before
   spending the second author run. Case saves preserve usable work immediately.
2. If the protocol is sound, run one fresh **as-needed** author from the same
   frozen inputs and instructions. Keep it sequential with the first author to
   avoid overlapping provider load from this experiment.
3. Analyze both, apply the frozen rubrics, and report all cases and whole-task
   totals, including any regressions or quality losses. Do not repair answers or
   silently rerun a failed comparison. Save evidence and diagnose a protocol issue.

This first test is **two author instances**, not twelve separate case authors.
It provides an early read on the combined workflow. It is only one paired
comparison; order, cache and generation variability remain limitations. A
reversed-order repetition is a possible follow-up, not automatically included.

## Measurements

The primary window starts when the agent receives its `ux:series-ready` save
receipt and ends when it receives the third answer-save receipt. It includes
all product retrieval commands, reading-related model activity, case reasoning,
answer generation, saves and transitions. Count each model response once using
its observed response ID. Do not remove input work from one condition while
including it in the other.

Capture reported reasoning tokens, input/cache/output counters, wall time,
reasoning/output stream intervals, tool time, unclassified gaps, actual call
order, packet hashes, answer lengths and quality. Report instruction preparation
and final acknowledgement separately, as well as whole-author usage.

Each case window ends at its saved-answer receipt and begins at the previous
receipt (the ready receipt for case one). Consequently, upfront case one includes
all three reads; as-needed case two and three include their own additional read.
These windows partition the complete workflow. They are not pure case-reasoning
measurements. Compare whole-task totals first, then use the case breakdown to
locate when any savings or regressions occur.

The analyzer requires one continuous author, exact single reads of all packets,
the prescribed read/save order, receipt barriers, and three unique first answers.
Source-reference and answer-format checks are distinct from parent semantic
quality scoring. Keep invalid runs and partial answers visible without presenting
incomplete work as an equivalent-quality speed improvement.

## Prepared commands

Frozen inputs: `.codex-tmp/ux-three-case-delivery/inputs-01/`.
Local checks and hashes: [preparation evidence](ux-three-case-delivery-preparation.json).

```powershell
# These paid author commands have completed; do not reuse their attempt names.
node planning/refinement-efficiency/experiments/incremental-ux-replay/run.mjs --attempt=three-case-upfront-author-01 --series=.codex-tmp/ux-three-case-delivery/inputs-01 --condition=upfront --execute
python -B -X utf8 planning/refinement-efficiency/experiments/incremental-ux-replay/analyze-series.py .codex-tmp/incremental-ux-replay/three-case-upfront-author-01 --output=.codex-tmp/ux-three-case-delivery/upfront-metrics.json

node planning/refinement-efficiency/experiments/incremental-ux-replay/run.mjs --attempt=three-case-as-needed-author-01 --series=.codex-tmp/ux-three-case-delivery/inputs-01 --condition=as-needed --execute
python -B -X utf8 planning/refinement-efficiency/experiments/incremental-ux-replay/analyze-series.py .codex-tmp/incremental-ux-replay/three-case-as-needed-author-01 --output=.codex-tmp/ux-three-case-delivery/as-needed-metrics.json
```

Use a new attempt name for an additional authorized attempt; never overwrite a
completed run. Omit `--execute` to exercise assigned MCP reads/stores without a
model. To construct another frozen input version:

```powershell
node planning/refinement-efficiency/experiments/incremental-ux-replay/prepare-series.mjs .codex-tmp/ux-decision-suite/inputs-01 .codex-tmp/ux-three-case-delivery/inputs-unique
```

## Construction decisions and verification

- Interpret as-needed delivery at case boundaries, preserving agent continuity
  and eliminating a separate retrieval-selection variable.
- Deduplicate shared records and use the same three packets in both conditions,
  preserving the existing return limit and total read count.
- Deliver fixed instructions through the initial prompt, avoiding the variable
  discovery history observed in the prior test.
- Save answers incrementally and measure the complete three-case workflow; no
  additional assembly response is requested.
- Construction used local checks only. The subsequent authorized model comparison
  is complete and reported separately above.

Both delivery schedules passed real assigned MCP read/store checks in isolated
copies, with all 611 protected live files unchanged. The Node happy-path test
checks construction, deduplication, equal inputs, schedule completion, frozen
instructions and withheld rubrics. A synthetic Python telemetry test exercises
both complete analyzer paths and verifies disjoint usage totals across the three
case windows. Synthetic telemetry is not recorded as measured model performance.
The subsequent two model runs verified live author compliance and scored semantic
quality; see the execution report above. Broad negative-test and package-review
passes remain outside this experiment scope.
