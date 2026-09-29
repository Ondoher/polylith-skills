# Multi-read concurrency-assurance retry

Result: **no batching improvement in this attempt.** The worker loaded the
complete skill, issued entry 1 alone, then returned `MULTI_READ_FAILED` and stored
`collection-failed`. Seven pages remained unread, matching the previous
[explicit-failure trial](multi-read-skill-failure-20260929.md).

The owner authorized one retry after commit `b4f1fbd` added an implementation-backed
assurance: manifest reads use immutable saved results and per-call offsets, so
they cannot change one another's data, even when sharing access or a handle.
The skill grew from 1,784 to 2,292 bytes. The harness, UX role, model settings and
exact eight-page manifest were unchanged; manifest and role identities were
verified mechanically. Each trial used a fresh worker with its own preparation
history.

| Measurement                                           | Failure rule alone | Failure rule plus assurance |
| ----------------------------------------------------- | -----------------: | --------------------------: |
| Common-role preparation                               |           97.094 s |                    93.176 s |
| Collection turn, including loading and final response |           39.640 s |                    40.273 s |
| Pages delivered                                       |             1 of 8 |                      1 of 8 |
| Maximum native reads per model response               |                  1 |                           1 |
| Collection generation requests                        |                  5 |                           5 |
| Collection tool calls                                 |                  3 |                           3 |
| Parallel contract                                     |             Failed |                      Failed |

All five collection generation requests carried `parallel_tool_calls: true`.
The configured model remained `gpt-6-astra`, with `ultra` recorded in the role and
`xhigh` observed on outgoing requests. The three calls loaded the skill, read one
page, and stored the failure marker. No transport substitution occurred.

The complete worker window was 133.451 seconds. The skill loaded once, with a
1.955-second command-output stream and a 0.467-second tool interval. Collection
dispatch to first data-read execution took 15.781 seconds; that read's tool
interval was 0.102 seconds and internal MCP service work was 0.474 milliseconds.
The failure marker arrived 35.268 seconds after collection dispatch.

Runtime activity over preparation and collection comprised 63.148 seconds of
output-item activity, 15.757 seconds of reasoning-item activity, 6.090 seconds of
tool activity and 45.638 seconds of unattributed active time. These total 130.634
seconds of active turns within the worker window; they do not isolate internal
reasoning time.

The returned page matched its expected bytes exactly. There were no duplicate or
unexpected product reads. All 611 protected live files remained unchanged. No UX
authoring, review, rework or downstream processing ran. No additional paid trials
were launched.

This is one observation, not evidence that batching is unavailable or that the
assurance can never help. Neither comparison attempt measured successful
collection throughput. The observed outcome is unchanged despite complete
delivery of the new instruction.

[Saved metrics](multi-read-skill-isolation-20260929-metrics.json) preserve the
comparison, per-call timings, usage counters, configuration identities, final
response and evidence hashes. Original trials remain unchanged. Raw evidence is
in `.codex-tmp/multi-read-skill-20260929/skill-isolation-01/`. Reanalysis requires
no model call:

```text
python -X utf8 planning/refinement-efficiency/experiments/multi-read-skill/analyze.py skill-isolation-01
```

The existing analyzer verified response grouping independently of the worker's
failure report. Raw client usage counters and selected-response sums retain
their distinct labels; neither is a measured credit charge.
