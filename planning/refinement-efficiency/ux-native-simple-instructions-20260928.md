# Native MCP probe with simpler instructions

**Follow-up:** [Four and eight pending reads](ux-native-read-count-20260928.md) also completed sequentially. Increasing call count did not trigger batching in either attempt.

**Both reads completed, but they were still generated in separate model responses. Removing the instruction to judge delivery order avoided the previous early stop in this attempt; it did not demonstrate parallel call generation.**

This follows the [incomplete live probe](ux-native-no-lite-live-20260928.md). The user suggested that checking the first result could discourage issuing the second call together with it. The revised assignment asks for two independent native reads in parallel, followed by a completion marker once both results are available. An external observer alone evaluates batching and data integrity. The agent no longer judges delivery order between calls.

## Controlled comparison

Only the assignment wording changed deliberately. The same harness, saved facts and UX inputs, 28,000-byte page window, native MCP namespace exposure, temporary no-Lite model catalog, `gpt-6-astra` model and xhigh effort were retained. Input hashes, catalog identity, read limits and harness hash were checked against the prior attempt. The earlier prompt and logs remain preserved in its private attempt directory.

| Measurement                          | Simplified-instruction attempt |
| ------------------------------------ | -----------------------------: |
| Whole client window                  |                       24.898 s |
| Native reads completed               |                              2 |
| Content returned                     |          28,000 bytes per read |
| Exact source match                   |                     Both reads |
| Read command generation              |              3.227 s / 3.304 s |
| Read tool round trip                 |              0.094 s / 0.117 s |
| Read service execution               |            0.661 ms / 1.017 ms |
| First result to second command start |                        3.976 s |
| First result to second result        |                        7.397 s |
| Completion marker stored             |                            Yes |
| Reads in one model response          |                         **No** |

The source pages total 56,000 bytes. Their client-logged serialized results were 31,392 and 31,859 bytes. Both were delivered intact without a wrapper or truncation. Three native calls occurred: two reads and one marker store. They were followed by the final `NATIVE_COMPLETED` response; this marker describes completed reads, not a batching verdict.

The observer recorded four model responses. Across the 24.885-second observed runtime, output-item streaming occupied 10.184 seconds, tool intervals 0.308 seconds, and unattributed time 14.393 seconds. No reasoning-item streaming was recorded; that does not establish that no reasoning occurred. These categories overlap the command-generation and tool-round-trip measurements above and must not be added to them.

Usage was 113,583 input tokens, including 83,328 cached, and 370 output tokens; reported reasoning-output tokens were zero. These are accumulated usage across the run, not unique source-data tokens.

## Interpretation and limits

- The simplified instructions allowed normal completion in this one attempt. A single comparison does not prove the earlier wording caused the early stop.
- They did not eliminate the intervening model-response cycle between reads. Native batching remains unproven under this configuration.
- Neither read depended on the other result, and server work remained around one millisecond. No missing tool annotation or server error was identified by this test.
- The previous attempt stopped after one read. Its 23.510-second duration is not a comparable completed-work baseline, and no speedup is claimed.
- The outgoing live request body was not captured. The unchanged catalog is tied to the earlier local capture of `parallel_tool_calls: true`; that remains separate evidence.
- This was a two-page delivery probe, not a full collection, UX comparison or product refinement. No global configuration or live Alexa data was changed. Owned server and client processes exited and were checked absent.

## Evidence and reproduction

- [Sanitized metrics and source hashes](ux-native-mcp-20260928-native-direct-no-lite-simple-01-metrics.json)
- [Revised native assignment](experiments/ux-read-window/native-assignment.md)
- [External analyzer](experiments/ux-read-window/direct.py)
- Private logs: `.codex-tmp/ux-read-window-20260928/native-direct-no-lite-simple-01/`

The run occurred on September 28 local time (September 29 UTC); filenames retain the experiment-series date.

```text
node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --native-probe --direct-namespace=mcp__polylith_workflows --model-catalog=.codex-tmp/codex-parallel-rule-20260928/catalog-without-lite.private.json --attempt=native-direct-no-lite-simple-01
python -X utf8 .codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py .codex-tmp/ux-read-window-20260928/native-direct-no-lite-simple-01
python -X utf8 planning/refinement-efficiency/experiments/ux-read-window/direct.py native-direct-no-lite-simple-01
```

Use a new attempt name for a future live test; existing evidence must not be overwritten. Verification covered native tool identity, exact page contents, response grouping, completion marker, unchanged comparison inputs/configuration, source hashes, formatting and process cleanup.
