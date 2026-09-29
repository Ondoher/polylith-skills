# Native MCP batching: four and eight pending reads

**Increasing the number of independent reads did not trigger batching. Both attempts completed correctly, but every read was generated in its own model response. Discard call count as the working explanation for this setup.**

The user authorized four reads, followed by eight only if four remained sequential, then stopping this line of investigation. Both conditions were followed; no further live attempt was run.

## Results

| Requested reads      | Whole client window | Source content returned | Model responses containing reads | Maximum reads per response | All pages exact | Completion marker |
| -------------------- | ------------------: | ----------------------: | -------------------------------: | -------------------------: | --------------- | ----------------- |
| 2 (previous attempt) |            24.898 s |            56,000 bytes |                                2 |                          1 | Yes             | Yes               |
| 4                    |            33.715 s |           112,000 bytes |                                4 |                          1 | Yes             | Yes               |
| 8                    |            63.419 s |           224,000 bytes |                                8 |                          1 | Yes             | Yes               |

Even two calls sharing one response would have been evidence of batching; neither new attempt produced such a pair. The four-read run had six model responses in total, and the eight-read run had ten, including the marker store and final response. All calls used the native workflow MCP namespace. There was no wrapper, truncation or missing page.

The [earlier two-read result](ux-native-simple-instructions-20260928.md) is reused, not rerun. Times are individual observations, not repeated benchmark estimates or evidence of an end-to-end UX speedup.

## Controlled setup

Both new attempts retained the same installed Codex client, `gpt-6-astra` at xhigh effort, native namespace exposure, temporary no-Lite catalog, saved facts and UX inputs, 28,000-byte page size and client output limits. Input hashes, catalog identity and read limits match the earlier two-read attempt. The request list necessarily grew with the count; it does not introduce dependencies or product interpretation.

Four reads used offsets 0 and 28,000 from each of the two saved sources. Eight used offsets 0, 28,000, 56,000 and 84,000 from each source. Every handle and offset was supplied before the first call. Pages were distinct within each attempt. The harness checked that every planned range contained a full 28,000 bytes of valid UTF-8 before dispatching the model.

The assignment requests parallel reads and asks the agent only to store a completion marker after all results arrive. The external observer checks page contents and model response IDs. It does not infer batching from a shared Codex turn, elapsed overlap or the agent's completion message.

## Granular timing and usage

| Measurement                                        | Four reads | Eight reads |
| -------------------------------------------------- | ---------: | ----------: |
| Read command generation, total                     |   12.253 s |    24.219 s |
| Read command generation, median per call           |    3.047 s |     3.037 s |
| Previous read result to next command start, median |    1.859 s |     2.575 s |
| Read tool round trips, total                       |    0.256 s |     0.692 s |
| Read tool round trip, median                       |    0.062 s |     0.076 s |
| Read service execution, total                      |   5.088 ms |    6.036 ms |
| Read service execution, median                     |   1.157 ms |    0.886 ms |
| All output-item streaming                          |   15.880 s |    27.908 s |
| All tool intervals, including marker               |    0.325 s |     0.785 s |
| Unattributed runtime                               |   17.495 s |    34.714 s |
| Input tokens, accumulated across responses         |    211,842 |     509,792 |
| Cached input tokens, included above                |    168,704 |     447,616 |
| Output tokens                                      |        596 |       1,062 |

No reasoning-item streaming was observed, and reported reasoning-output tokens were zero. This does not establish that the model did no reasoning. Unattributed time includes boundaries and gaps that these logs cannot split into scheduling, prompt processing, reasoning or transport.

Command generation is included in output-item streaming; service time is inside tool round trips. These measurements must not be added together. The observer windows were 33.700 and 63.407 seconds, slightly shorter than the separate harness clocks. Full per-call timings, response IDs, byte counts, page hashes, source hashes and accumulated usage are preserved in the metrics below.

## Conclusion and limits

Four and eight pending reads did not cause the desired batch behavior. There is no useful support here for increasing call count further; this experiment branch is closed as requested. These single attempts do not prove that this model can never batch calls, or identify the remaining model/client constraint.

The actual live outgoing request bodies were not captured. The unchanged catalog remains tied to the previous local capture of `parallel_tool_calls: true`; that is separate configuration evidence. No MCP server change, global configuration change, full UX replay or live Alexa mutation was made. Both servers and client processes exited and their owned PIDs were checked absent.

## Tooling and evidence

The isolated harness now accepts `--native-read-count=2`, `4` or `8`, records the predetermined request list, and fills it into the native assignment. The analyzer verifies every requested source/offset pair exactly once, groups calls by model response, records every adjacent read interval, and reports both any batching and all reads in one response. Its `--verify-only` mode rechecks saved attempts without overwriting their evidence. The old two-read logs passed this mode before the new live runs.

- [Four-read metrics](ux-native-mcp-20260928-native-direct-no-lite-four-01-metrics.json)
- [Eight-read metrics](ux-native-mcp-20260928-native-direct-no-lite-eight-01-metrics.json)
- [Harness](experiments/ux-collection-phase/run.mjs), [assignment](experiments/ux-read-window/native-assignment.md), [analyzer](experiments/ux-read-window/direct.py)
- Private logs: `.codex-tmp/ux-read-window-20260928/native-direct-no-lite-four-01/` and `native-direct-no-lite-eight-01/`

The runs occurred September 28 local time (September 29 UTC). Filenames retain the experiment-series date. Source syntax, formatting, exact pages, response grouping, completion markers, comparison inputs, source hashes, absence of connection credentials in published metrics and process cleanup were checked.

```text
node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --native-probe --native-read-count=4 --direct-namespace=mcp__polylith_workflows --model-catalog=.codex-tmp/codex-parallel-rule-20260928/catalog-without-lite.private.json --attempt=native-direct-no-lite-four-01
node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --native-probe --native-read-count=8 --direct-namespace=mcp__polylith_workflows --model-catalog=.codex-tmp/codex-parallel-rule-20260928/catalog-without-lite.private.json --attempt=native-direct-no-lite-eight-01
```

These attempt names are occupied and must not be reused for a live rerun. Each attempt used the existing runtime collector followed by `direct.py` with its attempt name; append `--verify-only` to recheck an existing result without creating or replacing metrics.
