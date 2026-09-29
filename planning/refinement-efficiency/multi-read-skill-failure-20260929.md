# Explicit multi-read failure rule retry

Result: **the worker still did not batch the reads.** It issued the first page
alone, recognized the contract violation, stored `collection-failed`, and returned
`MULTI_READ_FAILED`. Seven pages remained unread. The explicit failure wording
produced an honest failure outcome in this trial, but no parallel execution.

A later [retry with an explicit concurrency assurance](multi-read-skill-isolation-20260929.md)
produced the same one-page failure. The original evidence below is unchanged.

## Scope and controls

The owner authorized one retry after commit `9d927ee` made serialization an
explicit skill failure. Both the skill and collection assignment now forbid a
success marker for serialized reads, including when all data arrives. Their
individual effects are not isolated by this test.

The retry used the same UX role configuration, model, eight-page manifest and
224,000 expected input bytes as the original skill trial. Exact manifest and role
identities were verified mechanically. The new contract was 1,784 bytes versus
1,248 previously. A fresh isolated worker loaded the same required guidance;
its preparation history was not identical to the earlier worker's.

Native MCP tools were exposed. All five collection generation requests carried
`parallel_tool_calls: true`. The configured model was `gpt-6-astra`, with `ultra`
in the role and `xhigh` observed on outgoing requests, as in the original trial.

## Measured results

| Measurement                                          | Original skill trial | Explicit-failure retry |
| ---------------------------------------------------- | -------------------: | ---------------------: |
| Common-role preparation                              |            126.917 s |               97.094 s |
| Collection turn including loading and final response |             68.210 s |               39.640 s |
| Pages delivered                                      |               8 of 8 |                 1 of 8 |
| Maximum native reads in one model response           |                    1 |                      1 |
| Collection generation requests                       |                   12 |                      5 |
| Collection tool calls                                |                   10 |                      3 |
| Duplicate or unexpected product reads                |                    0 |                      0 |
| Parallel contract                                    |               Failed |                 Failed |

The shorter collection time is **not a speedup for equivalent work**: the retry
stopped after one page. The three tool calls loaded the skill, read one page,
and stored the failure marker. The full worker window, preparation plus
collection, was 136.736 seconds.

The skill loaded once and its complete text was observed. That call had a
1.973-second command-output stream and a 0.518-second tool interval. Collection
dispatch to the first data read took 16.377 seconds, including startup, loading,
model processing, gaps and command generation. The data read's tool interval was
0.223 seconds; internal MCP service work was 0.820 milliseconds. The failure
marker was stored 31.413 seconds after collection dispatch, followed by the
final response and client completion.

Across preparation and collection, runtime instrumentation recorded 65.622
seconds of output-item activity, 13.124 seconds of reasoning-item activity,
7.124 seconds of tool activity and 46.831 seconds of unattributed active time.
Those categories cover 132.701 seconds of active turns within the 136.736-second
worker window; they do not isolate internal reasoning time.

## Interpretation and retained evidence

The delivered page matched its expected bytes exactly. There were no duplicate
reads, unrelated collection calls, transport substitutions or rereads to repair
the failed trace. All 611 protected live files remained unchanged. No UX
authoring, review, rework or downstream processing ran.

This single retry demonstrates explicit failure reporting after a violation,
not a reliable incentive to batch. It does not prove batching is unavailable.
No further paid trials were run under this request.

[Saved metrics](multi-read-skill-failure-20260929-metrics.json) include the
comparison, configuration identities, per-call observations, raw usage counters,
phase boundaries, final response and evidence hashes. Original results remain
unchanged. Raw retry evidence is in
`.codex-tmp/multi-read-skill-20260929/skill-failure-01/`; reanalysis uses:

```text
python -X utf8 planning/refinement-efficiency/experiments/multi-read-skill/analyze.py skill-failure-01
```

The existing analyzer verified actual response grouping independently of the
worker's self-report. Recorded client usage counters and selected-response usage
sums remain labeled separately; neither is treated as a measured credit charge.
