# Three-case UX delivery comparison: execution

Status: **complete**, 2026-09-29 local time. Both authorized authors finished.

**Staging the same data did not improve this pair.** It took **164.522 seconds
versus 127.129 seconds** and used **2,584 versus 1,700 reasoning tokens**:
29.4% longer and 52.0% more reasoning tokens. Both followed the delivery protocol.
Upfront covered all 24 rubric criteria; staged covered 23 with one partial.

This executes the [frozen plan](ux-three-case-delivery-plan.md): one continuous
UX agent per condition completes Save Clip, Trim Group and Update Clip. Both
received the same 31 records in three packets, the same instruction bundle and
the same answer requirements. The protocol varies packet delivery timing.
This is one pair, upfront first, so the difference does not establish causality
or a reliable general penalty for smaller inputs.

## Whole workflow

The primary window starts at the ready-marker receipt and ends at the third
answer receipt. It includes acquisition, model activity, output and tools.
Startup and final acknowledgement are separate. Raw counters and all 48 scored
criteria are in the [measurement artifact](ux-three-case-delivery-metrics.json).

| Measurement                         |   Upfront | As needed |      Staged change |
| ----------------------------------- | --------: | --------: | -----------------: |
| Measured workflow                   | 127.129 s | 164.522 s | +37.393 s / +29.4% |
| Reported reasoning tokens           |     1,700 |     2,584 |      +884 / +52.0% |
| Reasoning-item stream intervals     |  53.063 s |  74.727 s |          +21.665 s |
| Output-item stream intervals        |  61.162 s |  67.621 s |           +6.458 s |
| Tool intervals                      |   0.832 s |   0.703 s |           -0.129 s |
| Unattributed intervals              |  12.072 s |  21.471 s |           +9.399 s |
| Model responses in measured window  |         6 |         6 |              equal |
| Product reads / answer saves        |     3 / 3 |     3 / 3 |              equal |
| Unique product packet bytes         |    37,226 |    37,226 |              equal |
| Answer prose words, all three cases |       915 |       963 |                +48 |
| Startup through ready receipt       |  14.890 s |  11.367 s |           -3.523 s |
| Final acknowledgement               |   7.714 s |   8.564 s |           +0.850 s |
| Whole author invocation             | 149.733 s | 184.453 s |          +34.720 s |

Server handling for the six measured calls totaled **12.580 ms upfront and
11.866 ms staged**, nested inside the tool intervals above. Neither transport
volume nor server execution explains the observed regression.

The stream intervals are observations of emitted items, not a measurement of
pure cognition. Unattributed gaps remain unattributed; the trace cannot separate
prompt processing, scheduling and transport within them. Output tokens include
reasoning tokens in this runtime: reported output totals are 3,853 and 4,869;
subtracting reasoning leaves 2,153 and 2,285 other output tokens.

## Where the difference occurred

These case windows partition the complete measured workflow. Upfront Save Clip
includes all three reads; staged later cases include their own additional read.

| Case        | Upfront seconds | Staged seconds | Upfront reasoning tokens | Staged reasoning tokens |
| ----------- | --------------: | -------------: | -----------------------: | ----------------------: |
| Save Clip   |          52.138 |         42.565 |                      552 |                     516 |
| Trim Group  |          39.822 |         61.442 |                      632 |                   1,034 |
| Update Clip |          35.169 |         60.515 |                      516 |                   1,034 |
| Total       |         127.129 |        164.522 |                    1,700 |                   2,584 |

The early Save Clip delivery is faster because two reads occur later. It is
not evidence of less reasoning to produce that answer. Separating each response
that ends by saving an answer gives:

| Answer-producing response | Upfront seconds since prior receipt | Staged seconds since prior receipt | Upfront reasoning tokens | Staged reasoning tokens |
| ------------------------- | ----------------------------------: | ---------------------------------: | -----------------------: | ----------------------: |
| Save Clip                 |                              33.008 |                             36.697 |                      455 |                     516 |
| Trim Group                |                              39.822 |                             53.884 |                      632 |                   1,034 |
| Update Clip               |                              35.169 |                             55.085 |                      516 |                   1,034 |

All three answer-producing responses used more reported reasoning tokens when
staged. Their combined intervals rose from **107.999 to 145.666 seconds**.
Intervals ending in the three reads were almost unchanged: **19.130 versus
18.856 seconds**. Upfront's first read response used 97 reasoning tokens; the
other read responses, including all staged reads, reported zero. The net token
difference is therefore **981 extra answer-response reasoning tokens minus
97 fewer read-response reasoning tokens = 884**. The first two read boundaries
do not need to be guessed or folded into an undifferentiated comparison time.

These response windows still include reading-related activity, decisions,
packaging and waiting. We can locate the increase in answer production, but
cannot infer why the model reasoned longer from counters alone. The staged
answers were also slightly longer; they were not identical generated outputs.

## Context actually received

Both used `gpt-6-astra`, configured `ultra`, with observed wire effort `xhigh`.
Role, contracts, instruction bundle, instruction overlay and experiment-module
hashes match. Initial prompts match after normalizing only the delivery-schedule
sentence and assigned access capability. All three received packet hashes match
the frozen inputs, exactly once without truncation. Each run remained one author
invocation; no case resumes, rereads, shell calls or late tool discovery occurred.

The instructions remain fixed and substantial. As-needed delivery retains prior
answers and context; it does not create three fresh small contexts. The reported
input counters for the individual answer-producing responses illustrate this:

| Answer      | Upfront input tokens | Staged input tokens |
| ----------- | -------------------: | ------------------: |
| Save Clip   |               42,469 |              38,022 |
| Trim Group  |               43,711 |              41,282 |
| Update Clip |               45,216 |              45,687 |

Staged input is approximately 10.5% smaller for the first answer and 5.6% smaller
for the second; the last response is slightly larger after retaining its earlier
answers and history. Thus this is a modest reduction in complete model context,
even though the first packet contains only 19 of the 31 product records.

Across all six responses, summed input counters were 242,992 versus 241,111 and
cached input counters 229,376 versus 226,944. Those sums count repeated context,
not unique product data. Cache behavior and generation variance remain possible
influences; this experiment does not isolate them.

## Answer quality

All six first answers passed schema, length and supplied-source-reference checks.
Parent semantic scoring used the withheld, unchanged eight-criterion rubric per
case, with no additional paid reviewer.

| Case        | Upfront | Staged            |
| ----------- | ------- | ----------------- |
| Save Clip   | 8 pass  | 8 pass            |
| Trim Group  | 8 pass  | 7 pass, 1 partial |
| Update Clip | 8 pass  | 8 pass            |

Staged Trim Group omits the explicit **time-zero lower bound** in criterion 2.
It correctly rejects Start 90, identifies 95 as the neighbor limit, preserves
End 149, supplies source/one-frame limits, and computes both extension and
shortening correctly. This is a partial criterion, not an incorrect interval
calculation. The input included the bound. Retain the omission rather than
repairing the answer or claiming strict quality equivalence.

## Retained evidence and reproduction

- Upfront: `.codex-tmp/incremental-ux-replay/three-case-upfront-author-01/`.
- Staged: `.codex-tmp/incremental-ux-replay/three-case-as-needed-author-01/`.
- Frozen inputs: `.codex-tmp/ux-three-case-delivery/inputs-01/`.
- Per-condition analysis: `.codex-tmp/ux-three-case-delivery/upfront-metrics.json`
  and `as-needed-metrics.json`.
- Aggregation and parity checks: `.codex-tmp/ux-three-case-delivery/collect-comparison.py`.
  Its hash is retained in the public measurement artifact.

Each attempt retains its first answers, control state, native request metadata,
session/runtime measurements and server counters. The public artifact contains
their hashes, per-command windows, totals and criterion-level scoring. Raw
prompts, capabilities and model payloads remain in ignored local scratch.

The plan's analysis commands reproduce per-condition numbers from retained
evidence without launching authors. The local collector combines those numbers,
verifies context parity and disjoint totals, and adds the documented parent
quality judgments. Retain the saved runtime extractor and session evidence if
reproducing extraction later. Saved measurements remain usable independently.

Both live-data guards confirmed all **611 protected Alexa files unchanged**.
No product-data rollback is needed. Model invocations ran approximately
00:33:39-00:36:09 UTC and 00:36:52-00:39:56 UTC on 2026-09-30 (the previous local
date). Parent preparation, scoring, analysis and reporting are outside the author
windows and are not called model reasoning time.

## Questions and decisions

1. **Run in parallel or sequentially?** Use the frozen sequential, upfront-first
   order to avoid overlapping test load. Do not add an unplanned reversed pair.
2. **Proceed after the first run?** Yes: the upfront analyzer verified all input
   hashes, the prescribed six calls, one continuous author and three valid first
   answers before launching staged delivery.
3. **Count Save Clip's faster first delivery as reduced reasoning?** No. Compare
   the entire workflow and individual answer-producing responses; delivery order
   moves two reads into later stages.
4. **What caused the first prompt-parity assertion to fail?** The local collector
   initially normalized the access capability only on its declaration line,
   leaving copies in prepared read commands. Normalize that same capability
   everywhere. Exact prompt parity then passes with no author change or rerun.
5. **Repair the staged Trim omission?** No: preserve the first answer and record
   a partial criterion, as the experiment requires. All other criteria pass.
6. **Explain the regression as excessive smaller requests or slower tools?** No:
   both conditions used the same six calls and records; service handling was
   negligible. The increase occurs in answer-producing model responses, with
   additional unattributed gaps. Its semantic cause remains unproven.
7. **Run further authors or change production retrieval now?** No. Complete the
   authorized pair and retain the negative result. One pair with a quality
   difference does not support a general retrieval-policy change.

## Verification and checkpoint

Both actual runs passed the existing analyzer's protocol checks, unique-response
usage accounting, receipt barriers and live-data guards. Additional aggregation
checks verify equal normalized prompts and frozen contexts, six measured calls,
equal packets, exact per-response/per-case usage sums and a complete partition
of elapsed time. No harness code changes or paid reruns were needed. The local
collector's capability-normalization correction reused the same saved evidence.

Only result documents and their navigation links change in this checkpoint;
production workflow code remains unchanged. Scoped formatting and Git whitespace
checks passed. Broad package tests, negative-test expansion and additional reviewer
runs are outside this evidence-only task. The checkpoint adviser recommended this
as a complete evidence unit, explicitly retaining the negative result and partial
criterion. Its preapproved message is:

```text
Record three-case UX delivery comparison

- Preserve equal-input upfront and staged workflow measurements with protocol evidence
- Document the staged regression, answer-quality limitation, and no-change conclusion
```

Preparation checkpoint: `b6ad435`. The results checkpoint is the commit containing
this report; its hash is reported on completion. No push is included. The planned
two-author comparison is complete with no remaining execution steps.
