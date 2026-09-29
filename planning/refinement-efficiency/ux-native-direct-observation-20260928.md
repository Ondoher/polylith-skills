# Direct-mode live request observation: completed, reads still sequential

**Later finding:** the [minimal three-model control](minimal-parallel-models-20260928.md) successfully emitted all eight native calls in one response on Astra, Sol and GPT-5.5. The failures below describe the fuller Codex/MCP setup; they do not imply that Astra or this backend lacks native-batching capability.

**The explicitly authorized live probe completed in 24.318 seconds. All four generation requests carried `parallel_tool_calls: true`, and their completed backend responses echoed `true`. The code execution wrapper was absent. Nevertheless, the model emitted the two independent reads in separate responses. Both 28,000-byte pages arrived byte-exact, with no truncation.**

This rules out a disabled outgoing parallel-call flag and the presence of the code wrapper as explanations for this attempt. It does not identify why the model/backend emitted one call per response, or prove that native batching is universally unsupported. The user subsequently requested the eight-read follow-up below; it also produced one read per response.

The run occurred on September 28 in the local timezone (September 29, 01:19 UTC). [Machine-readable metrics](ux-native-mcp-20260928-native-direct-observed-01-metrics.json) preserve the client timing, sanitized live request/response metadata, tool inventory, call identities, and verification results.

## Eight-read follow-up

At the user's request, the same observed configuration was repeated with eight independent 28,000-byte reads: facts and UX pages at offsets 0, 28,000, 56,000 and 84,000. The model, effort, temporary catalog, assignment template and return limits were unchanged. Only the requested count, supplied page list and attempt directory changed. This ran at 01:31–01:32 UTC on September 29 (September 28 locally).

**All eight reads arrived in eight separate model responses.** No response contained two reads. All 224,000 bytes matched the saved sources exactly, with no truncation, and the completion marker was stored. The ten actual generation requests all carried `parallel_tool_calls: true`, and all ten completed backend responses echoed it; the code wrapper remained absent. The remaining two generated responses handled the completion marker and final reply. Prewarm requests are excluded.

| Measurement                      |    Two reads |   Eight reads |
| -------------------------------- | -----------: | ------------: |
| Harness agent window             |     24.318 s |      73.402 s |
| Client runtime window            |     24.307 s |      73.394 s |
| Maximum reads per response       |            1 |             1 |
| Exact page contents returned     | 56,000 bytes | 224,000 bytes |
| Observed output-item streams     |      9.224 s |      28.783 s |
| Tool intervals, including marker |      0.242 s |       1.050 s |
| Unattributed runtime             |     14.841 s |      43.561 s |
| Read command streams, combined   |      5.841 s |      25.173 s |
| Read tool round trips, combined  |      0.155 s |       0.948 s |
| Server read work, combined       |     1.832 ms |      5.591 ms |

The eight-read run's median read-command stream was 3.133 seconds, and the median gap from one read result to the next command stream was 2.938 seconds. One gap, before the sixth read, was 12.727 seconds; its result-to-result cycle was 15.908 seconds. That gap is preserved as unattributed time, not assigned to reasoning, network transfer or server work without evidence. There were no visible reasoning-item streams.

Reported usage was 498,287 input tokens, including 422,784 cached input tokens; 1,089 output tokens; zero separately reported reasoning output tokens. Workflow server startup took 141.831 ms outside the agent window. Observer parsing, projection and metadata writes took 73.662 ms; that is not a measurement of total relay transport overhead.

The existing analyzer verified the returned bytes, all requested ranges, request flags and agreement between streamed wire call identities and client response grouping. Complete saved source hashes were unchanged. The observer recorded no errors, closed its resources, and both child processes exited. No diagnostic code or permanent configuration change was needed for this repeat.

This eight-read result provides no support for the hypothesis that increasing the call count triggers native batching in this configuration. These single observations are not sufficient to attribute timing differences to direct mode or establish a scaling law. [Eight-read metrics](ux-native-mcp-20260928-native-direct-observed-eight-01-metrics.json) preserve all per-call and transition measurements. Private evidence remains in `.codex-tmp/ux-read-window-20260928/native-direct-observed-eight-01/`.

The repeat used the command below with `--native-read-count=8` and `--attempt=native-direct-observed-eight-01`; all other flags were identical. No further live run followed it.

## Original two-read result

| Check                          | Result                                           |
| ------------------------------ | ------------------------------------------------ |
| Model and effort               | `gpt-6-astra`, xhigh, unchanged                  |
| Temporary catalog              | `tool_mode: direct`, `use_responses_lite: false` |
| Actual generation requests     | 4; all permit parallel calls                     |
| Completed generation responses | 4; all echo the parallel flag                    |
| Code wrapper tools             | No `exec` or `wait`                              |
| Native reads                   | 2; one per model response                        |
| Returned page contents         | 56,000 bytes total; exact and untruncated        |
| Completion marker              | Stored successfully                              |
| Native batching objective      | Not achieved                                     |

The first read belongs to response `resp_043b4205732a4d07016abb1216a18487d2951882e4390f7627`; the second belongs to `resp_043b4205732a4d07016abb121eb0a487d2ba4bb4bef0a36751`. The observer's streamed `response.output_item.done` identities match the independent client runtime records. The final `response.completed.output` arrays were empty on this route, so those arrays alone must not be used to count calls.

Two additional requests had `generate:false`: one auto-review prewarm and one Astra prewarm. They are excluded from the four generation requests. The auto-review prewarm is not a substitution of the experiment's model. Other native tools, including custom `apply_patch`, remained available; this was not a function-only request.

## Timing and usage

| Measurement                                      |              Time |
| ------------------------------------------------ | ----------------: |
| Harness agent window                             |          24.318 s |
| Client runtime window                            |          24.307 s |
| Observed output-item streams                     |           9.224 s |
| Observed reasoning-item streams                  |               0 s |
| Tool intervals, including completion marker      |           0.242 s |
| Unattributed runtime                             |          14.841 s |
| First read command stream / tool round trip      | 2.972 s / 0.074 s |
| Second read command stream / tool round trip     | 2.869 s / 0.081 s |
| First result to second command stream            |           2.372 s |
| First result to second result                    |           5.322 s |
| Actual server read work, both pages combined     |          1.832 ms |
| Observer parsing, projection and metadata writes |         31.391 ms |
| Workflow server startup, outside agent window    |        148.200 ms |

The output, tool and unattributed intervals partition the client runtime window; other rows are overlapping detail and must not be added to that total. The 0.011-second difference between harness and runtime windows reflects their measurement boundaries. No visible reasoning-item stream does not mean no reasoning occurred. Unattributed time includes startup and gaps whose scheduling, prompt-processing and transport components are not separately known.

Usage reported across completed responses: 109,301 input tokens, including 80,128 cached input tokens; 343 output tokens; zero separately reported reasoning output tokens. These are cumulative context counters, not unique source size or measured monetary cost.

The observer's 31.391 ms measures local observation work only, not the entire proxy route's overhead. This was one diagnostic with a changed tool catalog and an observer, not a controlled end-to-end speed comparison. Its approximately 24-second duration establishes neither a UX speedup nor a regression.

## Purpose

Earlier native probes left the model catalog's `tool_mode` at `code_mode_only`, with an exception exposing the workflow MCP namespace directly. Source inspection subsequently established that the model catalog's tool mode takes precedence over feature flags. The client implements `direct`, `code_mode` and `code_mode_only`, with an explicit test that `direct` removes the code execution wrapper even when code-mode feature flags are enabled.

An earlier local-only capture verified the temporary combination `tool_mode: direct` and `use_responses_lite: false`: the same `gpt-6-astra` model at xhigh effort, directly exposed workflow tools, no `exec` wrapper, and `parallel_tool_calls: true`. That capture took 2.780 seconds, forwarded zero requests and executed no model. It proves request construction, not backend batching. Other native tools, including the custom `apply_patch` tool, remain available; this is not a function-only request.

The live probe reused the existing two saved 28,000-byte pages and checked whether both native reads occurred in one model response. A localhost WebSocket observer recorded the actual live request flags and response identities, removing reliance on the earlier separate capture.

## Prepared tooling

- [Observer](experiments/ux-read-window/live-request-observer.mjs): accepts loopback WebSocket connections and forwards them only to `https://chatgpt.com/backend-api/codex/responses`, the default endpoint identified in the matching client source. Normal TLS certificate verification remains enabled. It changes the upstream Host and declines WebSocket compression; request and response payload bytes are forwarded unchanged.
- The observer records flags, tool names, response/call IDs, message sizes, request hashes, connection status, and its own observation overhead. It does not save authentication headers, prompts, tool arguments, product contents or results. Existing authentication travels through the process in memory. This new credential-handling route is the reason for the explicit authorization requirement.
- [Harness](experiments/ux-collection-phase/run.mjs): opt-in `--observe-live-request` starts the observer for a native probe, sets the child client's endpoint for this run only, and closes the observer afterward. Global configuration is unchanged.
- [Focused tests](experiments/ux-read-window/live-request-observer.test.mjs): two passing checks cover masked and unmasked frames, fragmented messages, chunk boundaries, extended frame lengths, unchanged observed bytes, and exclusion of private contents from metadata. The authorized live run additionally verified the relay's connection and delivery path.
- [Analyzer](experiments/ux-read-window/direct.py): verifies exact returned bytes, requested ranges, native call identities, runtime grouping, and optional live observer evidence. It cross-checks wire response IDs against the client log and keeps existing experiment outputs immutable.

The observer's earlier focused verification used `node --test --test-isolation=none` after the isolated test runner encountered the environment's child-process `EPERM` restriction. For this run, the analyzer passed every byte and metadata check. Both complete saved source files still matched their input receipt hashes. The observer reported no errors, both WebSocket connections upgraded successfully, resources were closed, and the child client and workflow server processes had exited.

## Authorization boundary and preserved evidence

The first attempted launch was rejected by automatic approval review because forwarding saved product data and existing authentication through the new observer route had not been explicitly authorized. It did not execute. The user subsequently answered “yes, do it” to the concrete authorization request naming the official endpoint and in-memory credential handling. The initial live run then proceeded with that explicit authorization. The later instruction “bump it to 8 just to see” authorized the eight-read repeat through the same route.

The executed command was:

```text
node --use-system-ca planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --native-probe --native-read-count=2 --direct-namespace=mcp__polylith_workflows --model-catalog=.codex-tmp/codex-parallel-rule-20260928/catalog-direct-without-lite.private.json --observe-live-request --attempt=native-direct-observed-01
```

The temporary catalog changes only Astra's tool mode from the earlier no-Lite copy; its SHA-256 is `825a4edc8b33ca5e019dff16f53ddd5cfac857df0f1e8abb3c7b79baafd69d49`. The installed binary remains `0.155.0-alpha.16.3`, hash `589f2546cc1e86703da326b00741f8b7a58fd182a1a90499faa0beebf22a24e2`.

Private local capture evidence is in `.codex-tmp/ux-request-capture-20260928/direct-native-pure-01/request-metadata.json`. Matching source snapshots are retained under `.codex-tmp/codex-parallel-rule-20260928/`, from source commit `ffa06df2317e3e65fc74da977a5884710c5382d5`: `core/src/tools/mod.rs`, `core/src/tools/spec_plan_tests.rs`, `protocol/src/openai_models.rs`, and `model-provider-info/src/lib.rs`, under `codex-rs/`.

The live observation and private runtime logs remain under `.codex-tmp/ux-read-window-20260928/native-direct-observed-01/`. Only metadata is included in the published metrics; authentication, prompts, tool arguments and product contents are excluded. Binary and temporary catalog hashes were rechecked after execution and match the values above. No global setting, live Alexa data or existing experiment evidence was changed.

## Consequence

Changing the MCP server's returned data or adding another parallelism instruction is not justified by this result. The client advertised the native read tool and sent the enabled flag, and the backend echoed it, but the output was sequential. The remaining uncertainty is model/backend behavior with this request configuration; an echoed flag alone does not reveal internal enforcement. Resolving that requires an authoritative client/backend explanation or a supported reference configuration, rather than another page-count or wording guess.
