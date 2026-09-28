# UX comparison replay through MCP — 2026-09-28

Completed one fresh UX comparison using the shared workflow MCP service for all product reads, phase markers and plan delivery. **Preparation took 8m28s; comparison through delivery took 1m50s.** The agent submitted a 6,088-byte plan directly through `workflow_store`; the service stored it in **2.509ms**. All 612 protected Alexa files remain unchanged, with no additional files under the live product directory.

The [previous replay](ux-comparison-replay-20260928.md) used local file helpers. Both trials end at a compact change plan, excluding full UX authoring, independent review and repairs. The performance objective is to minimize overhead around necessary decisions and overlap independent work, rather than enforce the earlier one-minute aspiration.

## Comparison with the file-based replay

| Activity                                      |     File-based replay |            MCP replay |
| --------------------------------------------- | --------------------: | --------------------: |
| Preparation                                   |      410.837s (6m51s) |      508.035s (8m28s) |
| Receive comparison assignment and mark start  |               11.054s |               10.213s |
| Explicit comparison → decisions-ready         |               86.759s |               47.978s |
| Decisions-ready → saved plan                  |               64.931s |               51.554s |
| **Comparison through delivery**               |  **162.744s (2m43s)** |  **109.745s (1m50s)** |
| **Preparation + comparison through delivery** |  **573.581s (9m34s)** | **617.780s (10m18s)** |
| Input pages                                   |                    67 |                    74 |
| Final saved plan bytes                        | 7,670, formatted JSON |   6,088, compact JSON |

The MCP trial took about **44s longer** across the two active phases despite its shorter comparison and submission. This is one paired observation, not a transport-only A/B or an established speedup/regression. The runtime changed from a directly spawned desktop agent to a CLI supervisor and specialist; pagination limits and generated plans differ. Both use a fresh `ux-planner`, configured `gpt-6-astra` with `ultra` effort, the same saved model-7 facts and prior UX4 JSON values, the same compact-plan scope, and no original completed answer. Each independently produced seven change groups and four questions.

The whole MCP client ran **11m13.036s**, including supervisor dispatch, a **10.760s** gap between the UX turns, and final acknowledgements. The UX final acknowledgement took **5.261s** after plan storage. The shared service started in **133.619ms**. These observations overlap; they are not additional durations to add to the table. Setup, preflight, analysis and checkpoint work are outside the client window.

## What the timed phases contained

| MCP preparation                              |  Elapsed |
| -------------------------------------------- | -------: |
| Role instructions through instructions-ready |  89.687s |
| Read both inputs through inputs-ready        | 413.348s |
| Return READY                                 |   5.000s |

The agent received all **514,426 bytes** of saved JSON: 125,008 bytes of facts and 389,418 bytes of prior UX. Byte ranges are contiguous and complete. No extra product reads occurred during comparison. The MCP reader uses up to 7,000 content bytes per request, further constrained by its escaped result budget. The local reader used an 8,192-byte total page budget with different framing; the page sizes are not identical controls.

| Client-observed interval           | Output streams | Reasoning-item streams | Tool intervals | Unattributed |    Total |
| ---------------------------------- | -------------: | ---------------------: | -------------: | -----------: | -------: |
| Preparation                        |       228.365s |                31.551s |        14.797s |     233.322s | 508.035s |
| Input-loading subwindow            |       173.142s |                23.466s |         8.881s |     207.859s | 413.348s |
| Explicit comparison                |         3.413s |                40.323s |         0.097s |       4.145s |  47.978s |
| Decisions-ready through delivery   |        38.475s |                10.594s |         0.125s |       2.360s |  51.554s |
| Entire comparison through delivery |        44.536s |                54.725s |         0.238s |      10.246s | 109.745s |

Subwindows are included in their parent rows. A tool crossing a marker is clipped at that boundary. The complete final submission tool interval was **151ms**; the server accepted the plan before that tool's returned receipt, so only the part through server delivery appears in the phase table.

The 51.554s submission phase includes composing the JSON and the MCP call containing it. It is not transfer time for an already completed document. The explicit comparison interval also is not pure reasoning time: input reading can involve implicit comparison, and reasoning continued after the decisions-ready marker. Stream labels measure client-observed activity, not provider compute or semantic work in isolation.

## MCP service measurements

- **74 input reads:** 90.946ms inside service methods; **115.686ms** including HTTP handler work. Those responses contained 660,326 bytes of serialized HTTP bodies, including envelopes and JSON escaping.
- **Final plan store:** 2.509ms inside the service; **2.827ms** in the HTTP handler. Request body: **7,386 bytes**; response body: **481 bytes**. Saved JSON: **6,088 bytes**. These are body sizes, not complete network packet sizes.
- **91 recorded HTTP request samples**, with no recorded failures, spanning setup, protocol initialization, tool discovery, input reads and stores. The complete request list is saved in the metrics.
- One server instance served the supervisor and its UX specialist. Assigned capabilities permitted input reads and `result.store`; the specialist received no canonical-write authority. Delivery used an inline MCP JSON value, not file ingestion or a filesystem fallback.

This result provides direct evidence that service execution and localhost HTTP handling are small costs here. The longer preparation is in the many agent/tool cycles: more pages, more output-stream time and more unattributed time. The test does not establish why all those gaps grew. Cached prompt processing, scheduling and transport cannot be separated from the available client evidence.

## Output and integrity checks

The delivered plan covers independent video-owned copies, grouped editing, retained content during trim, future-additions-only library updates, removal of obsolete propagation/collision behavior, Ungroup and affected trace coverage. It identifies unresolved Ungroup placement and group crop/audio transfer, grouped-edge trim bounds and further research needs, while retaining existing unresolved product questions.

All existing UX references resolve. Product source references use the existing `product:<record-id>` qualification alongside source-claim IDs; these resolve against the supplied product record index. The diagnostic reference checker was adjusted to recognize that existing convention instead of treating the prefix as a missing record. The delivered plan was not changed, and no additional agent turn was needed. This is a bounded parent check, not full UX acceptance or proof of exhaustive impact coverage.

Both inputs match their recorded source hashes; their MCP saved values were checked for semantic equality before dispatch. No live source, model, UX, UI or inspection artifact was written. The owned MCP server and client exited successfully and were stopped after evidence capture.

## Usage and measurement setup

| Actor / completed turn                      | Input tokens | Cached input subset | Output tokens | Reasoning output subset |
| ------------------------------------------- | -----------: | ------------------: | ------------: | ----------------------: |
| UX preparation                              |   10,560,590 |          10,315,520 |         8,854 |                     930 |
| UX comparison through final acknowledgement |      924,212 |             919,424 |         3,355 |                   1,832 |
| Dispatch supervisor                         |      406,038 |             381,056 |         2,038 |                     353 |

These are cumulative completed-response counters, not unique input size or a monetary estimate. Cached input and reasoning output are subsets. Narrow-window usage is retained for inspection but can cross phase boundaries, so whole-turn figures are preferred for comparison. The prior file trial's preparation reported 8,102,658 input tokens, including 7,749,888 cached, and 6,265 output tokens.

Before the paid replay, a prepared observation harness wrapped the existing production service methods without changing their behavior. It recorded read coverage, service durations, phase markers and saved-result identities; the existing HTTP server supplied request metrics. Client stream diagnostics and the existing runtime extractor supplied agent timing. The observer's setup work is measured separately in each observation, and HTTP timings include instrumentation overhead. No request payloads or capabilities are included in committed metrics.

Syntax checks and a non-model MCP store/read preflight passed. The first local preflight encountered a host `spawn EPERM` restriction before model work; retrying under the authorized host permissions succeeded. There was one paid replay, with no UX retries or model-driven repairs. The analysis tool was prepared before dispatch; its qualified-reference check was corrected after inspecting the valid result. Production workflow behavior and agent fallback policy were not changed.

## Follow-up implications

The next measurements should focus on reducing the amount of input the agent must consume and the number of serial read turns, then on the amount of decision text it must emit. The current experiment intentionally loaded the entire prior UX to retain comparable input scope. It does not test changed-record selection or parallel reasoning. Any smaller input selection needs an impact-coverage check, and a complete refinement benchmark must include assembly, review and rework.

Experimental file fallback remains permitted when explicitly recorded. The owner's intended final workflow requires MCP and a hard startup error when it is unavailable; implementing that enforcement remains deferred.

## Saved artifacts

- [Metrics and per-call evidence](ux-mcp-replay-20260928-metrics.json).
- [Delivered change plan](ux-mcp-replay-20260928-plan.json), formatted for the repository; exact delivered bytes remain in the MCP result and scratch copy.
- Observer, runner, analysis tool, preflight logs and exact original evidence: `.codex-tmp/ux-mcp-replay-20260928/`. The reportable metrics record tool hashes. Capability-bearing prompts and raw client logs remain private ignored scratch.
- Immutable plan handle: `ux-mcp-replay-20260928:c42024b8ec8a368088e9f107b0cbb43c99bed303d9f87dff0b51d56d7fdb1624`.
