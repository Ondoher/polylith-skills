# MCP read-window experiment

**A 28,000-byte window loaded the complete saved input in 68.757 seconds, versus 239.284 seconds at 7,000 bytes: 71.3% less acquisition time (3.48 times as fast).** All 19 client-visible pages reconstructed to the original hashes, without truncation. The 56,000-byte probes were truncated, so 28 KB is the recommended tested operating point for these inputs and this client configuration.

This experiment measures how larger MCP pages affect acquisition of the same saved Alexa facts and UX input. It preserves both complete values (514,426 compact UTF-8 bytes), their hashes, the UX model and reasoning effort, and the client's existing output allowance. It does not perform UX design, review, publication or live product mutation.

## Delivery boundary

The actual Codex-client probe requested the first facts and UX pages independently at four sizes. It forwarded one raw result per command and did not override output-token budgets. The analyzer compared the exact client-visible text with the server's source bytes, rather than treating successful HTTP delivery as sufficient.

| Requested content window | Facts page          | UX page             | Full-input reads in local sweep |
| ------------------------ | ------------------- | ------------------- | ------------------------------: |
| 7,000 bytes              | Exact               | Exact               |                              74 |
| 14,000 bytes             | Exact               | Exact               |                              37 |
| 28,000 bytes             | Exact               | Exact               |                              19 |
| 56,000 bytes             | Truncated           | Truncated           |                              10 |
| 112,000 bytes            | Not tried in client | Not tried in client |                               6 |

The 56 KB failures occurred after successful server reads. Both client outputs carried truncation warnings and could not reconstruct the complete page. Larger server limits alone are therefore insufficient. The probe brackets a failure region; it does not establish the exact maximum. JSON escaping, envelopes and content token density mean content bytes are not equivalent to a client token allowance.

The deterministic local sweep reconstructed both entire inputs at all five sizes, three times each, through the real localhost HTTP server. Median times for the full read sequence were approximately 418, 247, 149, 110 and 73 milliseconds respectively. These measure local transport and server work; they exclude model command generation and processing between results. Ascending sizes, caching and warmup are not controlled as a randomized benchmark.

## Full acquisition result

| Measurement                           | Prescribed 7 KB collection | 28 KB collection |
| ------------------------------------- | -------------------------: | ---------------: |
| Complete content                      |              514,426 bytes |    514,426 bytes |
| MCP data reads                        |                         74 |               19 |
| Model-generated read commands         |                         73 |               19 |
| Input acquisition                     |                   239.284s |          68.757s |
| Mean pre-command gap                  |                     1.869s |           2.136s |
| Mean command generation               |                     1.261s |           1.179s |
| Mean tool interval                    |                     0.099s |           0.092s |
| Mean complete read cycle              |                     3.230s |           3.407s |
| Instruction phase, separately         |                    76.384s |          74.578s |
| Whole UX preparation, including READY |                   320.015s |         148.034s |

**The gain came from fewer model/tool cycles, not faster individual cycles.** The average read cycle was about 5.5% longer with larger pages. Nevertheless, total command generation fell from 92.089 to 22.410 seconds and total pre-command gaps from 136.437 to 40.578 seconds. Tool intervals fell from 7.237 to 1.751 seconds. These are components of the acquisition interval, not additional elapsed time.

The full trial delivered all 5 facts pages and 14 UX pages. Its 19 server read methods totaled 28.973 milliseconds. The entire supervisor CLI run took 199.783 seconds, including dispatch and final acknowledgement; the UX preparation itself took 148.034 seconds. The server and client exited successfully. The first-page probe also exited cleanly after preserving its two truncation observations. No experiment process remained running.

| Acquisition usage counter            |       7 KB |      28 KB |
| ------------------------------------ | ---------: | ---------: |
| Input tokens summed across responses |  9,401,698 |  2,316,058 |
| Cached-input subset                  |  9,199,232 |  2,138,112 |
| Output tokens                        |      3,719 |      1,086 |
| Reasoning-output subset              | 0 reported | 0 reported |

The input counter fell approximately 75.4%, mostly through reduced repeated cached input. These are cumulative response counters, not the size of unique source data and not a monetary cost estimate. The 28 KB acquisition window contained 23.926 seconds of observed output streams, 1.838 seconds of tool intervals, zero observed reasoning-item streams, and 42.993 seconds unattributed. That last interval cannot be separated into input processing, scheduling, reasoning or transport from the available evidence.

## Recommendation

Use **28 KB per individual read result** as the next tested window, with one such result per model-generated command. Keep the explicit collection-only protocol. Do not combine multiple 28 KB pages into one outer result merely because each page passes separately. Leave the 7 KB default unchanged until adopting this setting is a deliberate workflow change.

The 14 KB probes also passed and offer a smaller fallback candidate, but their full agent acquisition time was not measured. Avoid 56 KB under this client's existing output allowance. Checking truncation and exact continuation remains necessary: this experiment proves complete delivery for these inputs, not a universal safe byte ceiling for all content or clients. It deliberately does not spend additional agent runs locating the last usable byte between 28 and 56 KB.

## Configuration and reproduction

The server now accepts an explicitly configured `POLYLITH_MCP_PAGE_BYTES` value from 7,000 through 112,000. The default remains 7,000. Its advertised read schema, read validation, page-envelope allowance and transport result allowance agree with the configured limit. Status and the parent ready receipt expose the active limits. No client output allowance or global agent default was changed.

The existing experiment runner accepts `--page-bytes` and keeps these attempts in `.codex-tmp/ux-read-window-20260928/`. New attempt names preserve previous evidence. The saved inputs, observer and runtime extractor from the earlier experiments must be present in this workspace.

```text
node planning/refinement-efficiency/experiments/ux-read-window/local.mjs
node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=56000 --probe --attempt=probe-01
python planning/refinement-efficiency/experiments/ux-read-window/probe.py probe-01
node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --attempt=window-28k-01
python planning/refinement-efficiency/experiments/ux-collection-phase/analyze.py window-28k-01 --windows
```

The local sweep refuses to overwrite its saved report. To repeat it, first preserve that report under another name. The runner refuses to overwrite an existing attempt. The instantiated assignment, connection details and raw logs remain in ignored scratch storage; public metrics contain source hashes, sizes, timings and usage metadata.

## Evidence and limits

- [Local HTTP sweep](ux-read-window-20260928-local.json)
- [Actual-client probe](ux-read-window-20260928-probe-01.json)
- [Full 28 KB collection metrics](ux-read-window-20260928-window-28k-01-metrics.json)
- [Larger-window assignment](experiments/ux-read-window/assignment.md)
- [Follow-up: paired sequential and parallel calls](ux-read-parallel-20260928.md)
- [Earlier prescribed 7 KB collection](ux-collection-phase-20260928.md)

The full collection trial uses a fresh configured UX planner, gpt-6-astra at ultra reasoning, and loads the same three role-guidance files before the separately timed input phase. It uses one read per command throughout. The earlier 7 KB trial combined its first two reads, then used one per command; this small protocol difference is explicit rather than attributed to page size.

Only acquisition is measured. Exact text delivery does not prove later attention, comprehension or equivalent UX decisions. One new live observation against a historical baseline cannot isolate scheduling, caching or model variation. Pre-command gaps are observed intervals, not measurements of pure reasoning; cached input and reasoning-output counters are subsets of their respective totals.

Validation: all 12 focused MCP integration tests passed, including default-cap isolation, configured tool-schema limits and exact escaped-Unicode reconstruction across pages. The probe analyzer checked eight client responses. The full-trial analyzer checked role/model/effort, contiguous offsets, complete source hashes, all 19 actual client-visible pages and absence of truncation. Two explicit output-budget arguments in instruction acquisition were 10,000, the existing default; no larger allowance was introduced. Formatting and diff checks passed.
