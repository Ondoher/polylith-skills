# Larger UX input-reasoning suite: results

Completed 2026-09-29: **12 fresh authors, six matched pairs, three decisions**.
Focused product context reduced reported reasoning tokens in four pairs, but
only Update Clip improved in both repetitions. Save Clip and Trim Group each
improved once and regressed once. This is evidence of a possible task-dependent
benefit, not a reliable general speedup or a scaling law.

The [frozen plan](ux-input-reasoning-suite-plan.md),
[early four-run report](ux-input-reasoning-suite-early.md), and
[complete measurements](ux-input-reasoning-suite-metrics.json) preserve the
protocol and observations. All scheduled runs finished without a restart or
answer repair. All 611 protected live Alexa files remained unchanged.

## All six comparisons

Each cell lists **broad → focused**. Positive reductions favor focused input;
negative values are regressions. Time starts when the author receives the
complete input tool result and ends when it receives confirmation of the saved
answer. Startup and final acknowledgement are excluded from this window.

| Decision    | Repeat | Reasoning tokens | Reasoning reduction | Decision seconds | Time reduction | Prose words | Rubric criteria passed  |
| ----------- | -----: | ---------------: | ------------------: | ---------------: | -------------: | ----------: | ----------------------- |
| Save Clip   |      1 |      1,436 → 977 |               32.0% |  64.460 → 51.170 |          20.6% |   321 → 316 | 8/8 → 8/8               |
| Trim Group  |      1 |    1,907 → 1,466 |               23.1% |  80.098 → 66.149 |          17.4% |   306 → 306 | 8/8 → 8/8               |
| Update Clip |      1 |    1,529 → 1,034 |               32.4% |  72.474 → 50.947 |          29.7% |   318 → 296 | 8/8 → 8/8               |
| Save Clip   |      2 |    1,034 → 1,507 |          **−45.7%** |  51.744 → 65.618 |     **−26.8%** |   313 → 311 | 8/8 → 7/8 + one partial |
| Trim Group  |      2 |    1,371 → 1,552 |          **−13.2%** |  63.864 → 68.627 |      **−7.5%** |   302 → 288 | 8/8 → 8/8               |
| Update Clip |      2 |      1,023 → 516 |               49.6% |  49.365 → 34.351 |          30.4% |   316 → 310 | 8/8 → 8/8               |

Across **all six pairs**, the median paired reduction is **27.5% in reasoning
tokens and 19.0% in decision time**. Summing the six decisions per condition gives
8,300 → 7,052 reasoning tokens (**15.0% fewer**) and 382.005 → 336.862 seconds
(**11.8% less**). Medians summarize paired percentages; these totals measure the
aggregate observed work. Both include the partially complete answer and therefore
are descriptive results, not an equivalent-quality claim.

The separately labeled summary requiring all eight criteria in both answers
contains five pairs: median reductions **32.0% reasoning and 20.6% time**.
It excludes the Save Clip repeat with an omission. The negative raw result
remains above and in the metrics; excluding it must not hide the regression.

The focused Save Clip repeat correctly allowed the supplied range because other
tracks contain media, but did not explicitly retain the general rule rejecting
a wholly empty range. The frozen rubric requires both, so its first criterion
is partial. That rule was in the input. No evidence was added, rubric changed,
or answer repaired. Eleven answers met every criterion; all twelve met the
schema, length and source-reference contract and reported no unresolved input.

## What was held constant

Each pair used the same question, source-based rubric, UX role, operation
contract, model (`gpt-6-astra`), configured effort (`ultra`) and observed wire
effort (`xhigh`). Every author made one complete native MCP product read and
one answer-save call in the decision window. Each decision window contained
one unique model response. The second repetition reversed condition order.
Authors ran sequentially, with fresh context and no prior completed answer.

| Case        |  Broad product packet | Focused product packet | Byte reduction |
| ----------- | --------------------: | ---------------------: | -------------: |
| Save Clip   | 27,726 B / 24 records |  18,539 B / 19 records |          33.1% |
| Trim Group  | 26,705 B / 24 records |  15,997 B / 14 records |          40.1% |
| Update Clip | 26,392 B / 24 records |  13,013 B / 10 records |          50.7% |

Focused packets retained exact selected records and required constraints;
broad packets added adjacent context. All packets fit the unchanged 28,000-byte
window. This tests **semantic selection for a bounded UX decision**. It does not
test paging the same full input into smaller chunks or completing a whole UX
model. Generic instruction context and generated startup interactions remain
in the model context, so product packet reductions are not equal to reductions
in the whole model request. Whole decision-response input counters summed to
264,430 broad versus 255,264 focused; cached input was 225,408 versus 231,424.

## Where time went

The twelve decision windows totaled **718.867 seconds (11m59s)**:

| Observed category      | Seconds | Meaning                                                    |
| ---------------------- | ------: | ---------------------------------------------------------- |
| Reasoning-item streams | 467.891 | Observed stream intervals; not isolated comprehension time |
| Output streams         | 219.664 | Generating the answer-save tool calls                      |
| Tool intervals         |   4.557 | Executing those calls and returning their results          |
| Unattributed gaps      |  26.755 | Remaining unclassified boundaries and delays               |

The median answer-save tool interval was **0.139 seconds**. Update Clip repeat 1
broad had a 2.868-second interval, including about 2.854 seconds after the server
saved the answer and before the client received the result. It succeeded without
a retry. The traces cannot assign that gap solely to transport or provider work.
All assigned MCP server operations across the authors totaled about **84.5 ms**
of recorded service execution; this is a different boundary from client round
trips and includes operations outside the decision windows.

Whole author time summed to **1,967.300 seconds (32m47s)**, comprising:

- Startup through input receipt: 1,189.510 seconds (19m50s).
- Decision through saved-answer receipt: 718.867 seconds (11m59s).
- Final acknowledgement: 58.923 seconds (59s).

Harness preparation added 39.324 seconds across twelve attempts, outside those
author windows. Parent analysis, reporting and time between scheduled attempts
are also outside their sum. These figures are not a full refine-design request
turnaround measurement. Startup remains a separate, already deferred topic.

## Usage and saved evidence

Measured whole-author counters for all twelve runs:

| Counter                                               |    Tokens |
| ----------------------------------------------------- | --------: |
| Input                                                 | 5,988,409 |
| Cached input, included above                          | 5,413,248 |
| Output                                                |    48,244 |
| Reasoning output, included above                      |    16,339 |
| Reasoning within the decision windows, included above |    15,352 |

These counters include instruction loading and repeated context in model
requests. They are not unique product-data volume or a dollar-cost estimate;
the overlapping categories must not be added together.

Frozen inputs are retained under `.codex-tmp/ux-decision-suite/inputs-01/`.
Per-author raw traces, control files and first answers are in the twelve
`.codex-tmp/incremental-ux-replay/suite-<case>-r<repeat>-<condition>-01/` directories.
Per-run analyzed metrics and parent assessments are under
`.codex-tmp/ux-decision-suite/metrics/` and `quality.json`.
`early-metrics.json` retains the four-author checkpoint unchanged.
The committed aggregate carries packet, role, contract, answer and evidence
hashes, usage, timing, delivery checks and all rubric assessments. Private raw
product data and capabilities remain in ignored scratch.

The [Save Clip reversal investigation](save-range-reversal-analysis.md) adds
the detailed timing decomposition, repeat variability and observed startup-context
differences for the four Save Clip authors, using these same saved traces.

The new `collect-suite.py` combines saved evidence without launching an author.
Its [reproduction instructions](experiments/incremental-ux-replay/README.md)
explain how to regenerate the aggregate. The historical favorable pair remains
separate and is not counted among these twelve runs.

## Questions and decisions

1. **Continue after the early result?** Finish the prescribed twelve authors
   while the protocol is sound, including unfavorable repeats. This follows
   the frozen schedule and avoids selecting only favorable observations.
2. **Score wording or meaning?** Judge semantic coverage of the eight frozen
   criteria. Accept equivalent concise descriptions and record partial or
   missing obligations explicitly; do not change the rubric after delivery.
3. **Reuse completed work?** Reuse frozen inputs and saved metrics, answers and
   traces. No successful author was restarted; analysis used existing evidence.
4. **Discard the 2.868-second tool interval?** Retain it and distinguish its
   boundary from reasoning. Delivery succeeded, and its cause is not isolated.
5. **Repair the Save Clip omission?** Record seven passes and one partial;
   retain the raw timing and exclude only from the explicitly quality-matched
   summary. Required evidence was present. No repair or extra paid run.
6. **Hide negative repeats through filtering?** Retain every pair and provide
   an all-pairs descriptive summary alongside the strict quality-matched view.

## Verification and completion

Verified frozen inputs and implementation hashes before execution. All twelve
attempts finished, delivered the assigned packet exactly once without truncation,
saved a valid first answer and passed their live-data guard. All six pairs have
matching role/model/effort/contracts. Parent inspection scored the frozen rubric;
there was no additional model review or downstream UX/UI run.

The collector was syntax-checked and exercised against partial and complete
real results. Numerical checks preserve all six pairs, the one partial quality
result, both performance regressions, counter totals and timing partitions.
Changed Markdown/JSON formatting and Git whitespace checks passed.
Broad package tests and exhaustive negative tests are
outside this evidence-only task; production workflow code is unchanged.

The checkpoint adviser recommended this as a self-contained experimental
evidence unit, explicitly noting that both regressions and the partial-quality
result remain visible. Its preapproved commit message is:

```text
Record completed UX input-reasoning suite

- Preserve all twelve matched-author measurements across three decisions
- Document task-dependent results, quality limits, and reproducible aggregate evidence
```

The preparation checkpoint is `15e06e5` (Prepare larger UX input-reasoning suite).
The results checkpoint is the commit containing this report, with its resulting
hash reported in the completion message. No push or further paid comparison
is included.

The scheduled test is complete, with no blocked runs or remaining execution
steps. Two repeats per case remain too few to establish causality, reliability
or a size-to-reasoning law. Cache/provider variation, generic context, answer
variation and parent quality judgment limit the conclusion. Keep the existing
incremental-output improvements; these input results alone do not justify a
blanket reduction of UX context or another automatic test run.
