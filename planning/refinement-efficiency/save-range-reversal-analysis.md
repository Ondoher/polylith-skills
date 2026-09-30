# Save Clip reversal: saved-trace investigation

Investigated the four Save Clip authors from the
[completed suite](ux-input-reasoning-suite-execution.md), using saved evidence
only. No new model run, answer repair or live product change was performed.
[Extracted measurements](save-range-reversal-analysis.json) retain the timing
decomposition, usage counters, startup call summaries and source hashes.

The second focused author produced **473 more reasoning tokens** and spent
**13.747 more seconds in observed reasoning streams** than the second broad
author. The whole decision window was 13.874 seconds longer. The additional time
is therefore localized to model reasoning activity, with little net difference
elsewhere. This does not establish why the model generated more reasoning.

## The additional 13.874 seconds

| Component, repeat 2                 |        Broad |      Focused | Focused minus broad |
| ----------------------------------- | -----------: | -----------: | ------------------: |
| Reported reasoning tokens           |        1,034 |        1,507 |                +473 |
| Reasoning-item stream intervals     |     31.543 s |     45.291 s |           +13.747 s |
| Generating the answer-save command  |     17.601 s |     16.846 s |            −0.755 s |
| Generating a brief progress message |      0.000 s |      1.507 s |            +1.507 s |
| Answer-save tool interval           |      0.107 s |      0.339 s |            +0.232 s |
| Unattributed gaps                   |      2.493 s |      1.635 s |            −0.857 s |
| **Decision total**                  | **51.744 s** | **65.618 s** |       **+13.874 s** |

Both decision windows contain one model response and one successful answer-save
call, with no intermediate reads, tool failures or retries. Answer-command
generation was actually slightly faster in the focused run. The generic output
category in the suite metrics also includes the progress message; it must not
all be described as command generation.

Reasoning tokens divided by observed reasoning-stream duration are approximately
32.8 tokens/s broad and 33.3 focused. Those are ratios of two measurements, not
direct hardware throughput measurements. They are consistent with a longer
reasoning response rather than a comparable response delivered much more slowly.
The three versus two observed reasoning items are stream boundaries, not evidence
of three versus two complete design passes.

## The reversal includes changes on both sides

| Input condition | Repeat 1 reasoning | Repeat 2 reasoning | Change | Repeat 1 time | Repeat 2 time |
| --------------- | -----------------: | -----------------: | -----: | ------------: | ------------: |
| Broad           |              1,436 |              1,034 | −28.0% |      64.460 s |      51.744 s |
| Focused         |                977 |              1,507 | +54.2% |      51.170 s |      65.618 s |

The product packet was byte-identical across repetitions within each condition.
Thus the reversal combines a slower focused response with a faster broad response;
it cannot all be attributed to a newly introduced change in the focused packet.

Across these two repeats, totals are almost equal: **2,470 broad versus 2,484
focused reasoning tokens**, and **116.204 versus 116.788 seconds**. That is only
14 tokens and 0.584 seconds more for focused input. These are descriptive totals
from two repeats, including the focused answer's partial rubric result, not proof
of equivalence. They show why either isolated percentage would be misleading.

## What was controlled, and what varied

The normalized assignment text is identical in all four runs after replacing
workspace paths, access capabilities and input handles. Model, effort, role,
operation contract and observed tool-name metadata also match. The same four
generic instruction sources were read to completion from the same hashed batch.
All product reads were complete and exact, with no truncation or observed wire
errors.

However, **the startup conversation was not identical**. The authors selected
their own discovery commands and helper-code read ranges:

| Run       | Calls through product read | Shell calls | Instruction pages | Helper source reads             | Startup reasoning tokens |
| --------- | -------------------------: | ----------: | ----------------: | ------------------------------- | -----------------------: |
| Broad 1   |                         12 |           9 |                 7 | Head 100 lines + tail 85        |                       81 |
| Focused 1 |                         12 |           9 |                 7 | Head 140 + tail 64              |                       88 |
| Focused 2 |                         13 |          10 |                 7 | Head 180 + tail 65              |                      102 |
| Broad 2   |                         15 |          12 |                 8 | Head 110 + option-parser search |                      103 |

Broad 2 first used the default 4 KiB instruction page, then attempted unsupported
`--help`, inspected the helper, and continued with 8 KiB pages. That failed shell
command was recovered during startup. The suite's zero failed assigned-service
calls still holds; it is not a count of every shell command. No product author
was restarted.

This changes command history, extra helper text and pagination boundaries in
the context used for the decision. The required instruction contents match,
but matching file hashes alone does not make the complete model context equal.
The suite already noted this limitation; the traces now identify concrete
differences. We cannot assign the 473 additional tokens to these differences.

Nor was the extra reasoning simply moved from startup into the decision window:
repeat 2 had **102 focused versus 103 broad startup reasoning tokens**. Whole
author reasoning was 1,609 focused versus 1,137 broad. Whole author elapsed time
was nevertheless 169.254 versus 172.734 seconds because broad startup took longer.
The reported 27% slowdown applies only to the post-input decision window.

The 33.1% product-packet reduction also produced a much smaller contrast in total
decision-request context: **44,994 broad versus 43,818 focused input tokens**,
only 2.6% fewer. Cached input was 38,272 versus 39,168; non-cached input was 6,722
versus 4,650. The focused result therefore did not coincide with more non-cached
input. These counters cannot isolate product tokens, prompt-processing time,
cache effects on latency, or the effect of startup history on reasoning.

## What the answers and selected records show

The focused repeat was **311 prose words versus 313 broad**, with the same six
required fields. Both cover the four-track composition, inclusive range,
commit restrictions, retained context, recovery and independent occurrence
identity. The focused answer moves some identity details into `operation` and
commit restrictions into `preserved`; it does not supply an additional flow or
larger design artifact. Output differences cannot establish which part required
more internal work.

Its empty-range guard omission is not a missing-input problem. The rule is
explicit in two shared records: `save-library-clip` and `open-save-clip`. The
first focused answer included it; the second did not. This is why the latter
retains seven passed criteria and one partial, despite spending more reasoning.

The five broad-only records concern Update Named Clip: its current requirement,
an older source claim, two prior actions and its prior dialog. They include old
propagation/collision behavior alongside the current future-only requirement.
Both broad answers explicitly set that adjacent behavior aside. These records
could influence interpretation, but they neither supply the missing empty-range
guard nor demonstrate that the smaller packet lacked necessary Save Clip facts.

## Conclusion and next useful test

The measured regression is a longer reasoning response producing substantially
the same bounded answer, not a transfer delay, extra read loop, command-generation
expansion or larger output. The saved evidence does **not** distinguish ordinary
response variation, sensitivity to startup history, and a genuine effect of
removing surrounding context. Two repeats are insufficient to separate them.

Before another paid comparison, freeze the startup material and its delivery
history for this test: identical prepared instruction content, tool contract and
assignment wording, with no discretionary helper discovery. Vary only the product
packet, retain fresh authors and the same short output/rubric, and repeat both
conditions in balanced order. Check complete input-context identity except the
intended packet difference and unavoidable session identifiers, not only file
hashes. Report variability within each condition alongside the paired differences.

This is a recommendation for a cleaner follow-up, not an additional run or a
production change. The present investigation is complete at the limit of the
saved evidence. The extracted timing components reconcile to the original total;
input and normalized-assignment comparisons were checked directly. No broad code
review or package test pass was needed for these derived notes and measurements.
