# Shared-text authoring at larger scope

Executed 2026-09-27 after the owner requested a much larger dataset than the
[four-action trial](shared-text-authoring-trial.md). **The larger pair showed a
materially better result: shared-text authoring finished about 54 seconds sooner
after complete input delivery, using 19% fewer non-reasoning writing tokens and
15% fewer total writing tokens.** Both outputs reconstructed exactly without repair.

This is encouraging evidence for selective reuse at larger scope, not a clean
estimate of the dictionary's isolated effect: input delivery required correction,
and the writers chose different escaping for their tool-call strings. Both effects
are retained below rather than hidden in a speedup claim.

## Scope and controls

The sample contains **40 actions**, ten times the previous count, selected at every
other position in the saved 79-action catalog: 0, 2, ... 78. It includes all four
previous actions. Positions were selected without ranking repetition. The frozen
source is the same saved Alexa UX, not a fresh interpretation of the description.
Canonical compact JSON grew from 6,066 to **55,848 bytes**, about 9.2 times larger.

Two fresh workers used identical facts, compact JSON, inherited
**gpt-6-astra / xhigh**, and the same high-level write tool. Direct output contains
literal strings. Shared output identifies exact repeated long text, authors a
local dictionary and uses tagged references. The same expansion/validation helper
was reused from the small trial. The shared author created 35 dictionary entries.

Both large authors used `apply_patch` to avoid shell command-length constraints;
the small trial used PowerShell `Set-Content`. Therefore absolute timing across
sample sizes is not a pure size-only comparison. This was one pair, not repeated
sampling, fresh UX reasoning, an independent design review or a full refinement.

## Results

| Measurement                                                   |   Direct JSON |   Shared text |
| ------------------------------------------------------------- | ------------: | ------------: |
| Complete input to successful file write                       | **348.274 s** | **294.689 s** |
| Task start to successful file write, including input problems |     454.634 s |     398.722 s |
| Full agent turn, including receipt                            |     457.253 s |     401.040 s |
| Writing-response non-reasoning output tokens                  |        11,545 |         9,346 |
| Writing-response reasoning tokens                             |             0 |           426 |
| Writing-response total output tokens                          |        11,545 |         9,772 |
| Writing tool-call output stream                               |     346.156 s |     280.012 s |
| Writing-response reasoning-item stream                        |           0 s |      13.024 s |
| Author file bytes                                             |        55,849 |        43,978 |
| Writing tool execution                                        |        295 ms |        300 ms |
| Parsing / expansion                                           |      0.349 ms |      1.794 ms |
| Existing whole-UX validation                                  |     44.783 ms |     32.646 ms |
| Complete validation command wall time                         |       0.545 s |       0.424 s |
| Output repair attempts                                        |             0 |             0 |

Both files preserve every field, string and array order for all 40 actions.
Replacing those actions in the saved full UX passes its existing validator, and
both canonical hashes match. Parent scheduling before validation is outside the
authoring durations. Parsing and validation are subsets of the complete command;
do not add them to that command time again. No live product data changed.

The large shared representation saved **21.3% in file bytes**, compared with 11.7%
in the small sample. Non-reasoning writing tokens fell 19.0%, compared with 3.4%
in the small sample. The additional 426 reasoning tokens no longer outweighed
the 2,199-token reduction in non-reasoning output. Total writing output fell 15.4%.
The post-input duration fell 15.4%; total start-to-file duration fell 12.3%.

This changes the earlier small-sample assessment: shared text deserves to remain
an optimization candidate where reuse is sufficient. It does not establish a
universal batch threshold or justify applying dictionaries to low-repetition UI
text. The gain is incremental and still leaves minutes of authoring for this batch.

## Input-delivery problem

Each author encountered two truncated whole-file reads. Increasing the requested
output budgets did not make the second displayed result complete. The working
correction was **two half-file reads emitting raw text**, rather than printing
the tool-result object as a large serialized JSON value. Both authors retained
their sessions and the same source; no new paid author was started.

Getting complete input took 106.360 s for direct and 104.033 s for shared, including
60.657 / 63.907 s respectively in explicit waits for parent correction. These
intervals also contain failed reads, failure reporting, corrective instructions
and other runtime work. They are not pure disk-read or network-transfer time.
The failures were in the experiment's input-delivery method; neither author
silently fabricated the missing records.

Full task times retain this cost. The post-input comparison begins only at each
author's final successful read. Extra context from failed reads remains in both
sessions, so this was not a clean first-attempt benchmark even after excluding
the elapsed setup window. This is a separate actionable finding: large fact
delivery needs bounded raw-text reads and explicit completeness checks from the
start, rather than repeated whole-file reads and parent permission roundtrips.

## Other limits on attribution

The direct author put its patch in a double-quoted JavaScript string, escaping
JSON quotes; the shared author used a template literal. Tool-call arguments were
60,046 versus 44,144 bytes. Thus some emitted-token difference can come from
tool-call escaping, not just text reuse. The file-size reduction is independent
of that quoting choice. Future comparisons should fix the string-writing form
as well as the tool, rather than spending another uncontrolled run now.

Whole-turn input totals were 376,354 / 368,307 tokens, of which 325,504 / 321,920
were cached. These sum repeated response contexts, including the delivery failures,
not unique source size. Writing-response inputs were 51,577 / 50,717, with
45,184 / 44,288 cached. No billed-credit estimate is inferred. Queueing, caching
and provider variability were not controlled. Client-observed stream intervals
are not isolated provider compute; reported tool totals also include explicit waits.

Retain the measured gain, but describe it as a result of these complete authoring
attempts. The evidence supports further consideration of compact structure and
shared definitions together, with reliable bounded input delivery. It does not
support adding this percentage to earlier savings or predicting whole-product
completion time. No production schema or agent instructions changed here.

## Evidence

[Metrics](shared-text-large-trial-metrics.json) contain source and helper hashes,
selection, both failed-read histories, corrected-read boundaries, matched runtime
settings, response usage, string-encoding differences and validation receipts.
They contain no raw product payload, prompt or reasoning text. Scratch material
is retained at `.codex-tmp/shared-text-large-trial-20260927/`.

Preflight checked exact reference expansion and malformed/missing reference
handling. Actual outputs passed exact equality and whole-UX validation; timing
extraction checked completed turns, matched items, token subsets and identical
canonical hashes. No additional author run or output correction was needed.
