# Paired MCP read experiment

**Two 14 KB results can be delivered together, but two 28 KB results were truncated by the client.** In this small test, the sequential pair inside one command was faster than the parallel pair. Batching removed a model round trip; concurrent server requests provided no demonstrated additional speedup for these fast reads.

## Scope and controls

One fresh Codex CLI client, using its configured gpt-6-astra model with xhigh effort, read the same saved facts and prior UX handles used in the [read-window experiment](ux-read-window-20260928.md). This was a delivery probe, not a UX planner run. No product reasoning, role-instruction loading, additional agent, design review, canonical writes or live Alexa changes were performed. The full CLI window lasted 44.060 seconds.

Every measured page began at offset zero. Repeating the two first pages was intentional, so the compared methods received identical content. The client established short reusable argument bindings before measurement. Nine generated commands issued fourteen reads, with no output-budget overrides:

1. Two separate 14 KB commands, facts then UX.
2. One command starting both 14 KB reads with `Promise.allSettled`, then emitting each raw result separately.
3. One command awaiting and emitting facts, then awaiting and emitting UX, both at 14 KB.
4. A second sequential batch, followed by a second parallel batch, followed by the second pair of separate commands.
5. One parallel batch of two 28 KB reads, again emitting the raw results separately in the same outer command.

The sequence includes two repetitions of each 14 KB method with reversed order in the second half. This is a small diagnostic within one session, not a statistically controlled benchmark. It is not directly comparable to the complete UX collection trial, which used the UX role at ultra effort and read all pages.

## Delivery results

| Method                             | Total requested content per pair | Repetitions | Client-visible result                        |
| ---------------------------------- | -------------------------------: | ----------: | -------------------------------------------- |
| Separate 14 KB commands            |                     28,000 bytes |           2 | Both pages exact each time                   |
| Sequential pair in one command     |                     28,000 bytes |           2 | Both pages exact each time                   |
| Parallel pair in one command       |                     28,000 bytes |           2 | Both pages exact each time                   |
| Parallel 28 KB pair in one command |                     56,000 bytes |           1 | Truncated; neither complete page recoverable |

All twelve 14 KB page deliveries matched their source bytes. The 28 KB requests both succeeded at the server, but their combined outer result carried a truncation warning. Separate `text()` emissions within one `functions.exec` therefore do not establish independent client output allowances. The earlier single-page 28 KB success remains valid; doubling its content inside a single outer response does not.

The analyzer retained both pages under their call ID, handle and offset, checked the command labels, verified use of Promise concurrency for the parallel cases and its absence from serial cases, and confirmed that all nine commands followed the prescribed order. It did not rely on the agent's completion statement or server transmission alone.

## Command-cycle timings

Each pair's total below includes the pre-command gap, command generation and tool execution/result return. For the separate method, the two complete cycles are added because they occur consecutively. Timings are measured from the previous tool result to the pair's final result; setup and final acknowledgement are excluded.

| Method for two 14 KB pages     | First repetition | Second repetition | Generated commands per pair |
| ------------------------------ | ---------------: | ----------------: | --------------------------: |
| Separate commands              |           4.124s |           11.046s |                           2 |
| Sequential pair in one command |           2.510s |            2.199s |                           1 |
| Parallel pair in one command   |           3.185s |            3.054s |                           1 |

**The 11.046-second result contains a timing outlier:** its two pre-command gaps were 5.594 and 4.374 seconds, totaling 9.968 seconds. Other measured pre-command gaps were approximately 1.25–1.63 seconds. The source is unattributed; these logs cannot identify scheduling, input processing, transport or internal reasoning as its cause. It is preserved in the metrics and displayed here rather than removed or used to claim a large average improvement.

| Component per pair          | Separate, repetitions 1 / 2 | Sequential batch, repetitions 1 / 2 | Parallel batch, repetitions 1 / 2 |
| --------------------------- | --------------------------: | ----------------------------------: | --------------------------------: |
| Generated command arguments |             302 / 302 bytes |                     242 / 242 bytes |                   416 / 416 bytes |
| Command generation          |              0.907 / 0.966s |                      0.851 / 0.907s |                    1.648 / 1.655s |
| Tool intervals              |              0.081 / 0.112s |                      0.036 / 0.045s |                    0.040 / 0.053s |
| Pre-command gaps            |              3.136 / 9.968s |                      1.623 / 1.247s |                    1.497 / 1.346s |

The tested parallel wrapper required more generated text, including handling fulfilled and rejected results. It took about 0.75–0.80 seconds longer to generate than the serial wrapper. The few-millisecond differences in tool intervals do not establish a transport advantage. Parallel read arrivals at the server were separated by approximately 1 millisecond in the 14 KB cases, compared with 10–11 milliseconds for sequential batches; the server's synchronous read calculations still run on one JavaScript thread. All fourteen server read methods totaled only 9.138 milliseconds.

Whole-session usage was 646,524 input tokens, including 564,096 cached, and 1,236 output tokens, with zero reported reasoning-output tokens. These include setup and completion, are not per-method costs, and do not imply that internal interpretation was absent. Raw event and runtime metadata preserve the individual response counters for later analysis.

## Implication

For these reads, **combine independent requests within a bounded total response allowance** when that avoids a model round trip. A simple sequential batch already achieves that. The more verbose tested parallel wrapper added command-generation time without demonstrated execution savings; this does not establish that every parallel implementation is slower or that concurrency would not help slower operations.

Keep roughly 28 KB of tested total content per outer command for this client and these inputs: either one 28 KB page or two 14 KB pages passed. This is an observed operating point, not a universal byte ceiling. The probe does not establish that a pair outperforms one 28 KB read for complete acquisition. Native independent tool-result envelopes, a higher client allowance, different payloads and full UX quality were not tested. No production default, pagination protocol or agent instruction was changed.

## Saved evidence and reproduction

- [Metrics, per-command timing and delivery checks](ux-read-window-20260928-parallel-01.json)
- [Exact assignment template](experiments/ux-read-window/parallel-assignment.md)
- [Follow-up: native independent tool-call exposure](ux-native-mcp-20260928.md)
- Private instantiated prompt, source receipts and original logs: `.codex-tmp/ux-read-window-20260928/parallel-01/`

```text
node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --parallel-probe --attempt=parallel-01
python planning/refinement-efficiency/experiments/ux-read-window/probe.py parallel-01
```

Use a new attempt name for another run; the runner refuses to overwrite existing evidence. The saved source data, observer and runtime extractor from earlier experiments are prerequisites. Analysis emits only timing, size, hash and runtime metadata, not source content, credentials or raw reasoning. The client and server shut down successfully. Verification comprised the actual nine-command client run, exact delivery/sequence/concurrency checks, source syntax checks, formatting and diff checks; production MCP code was unchanged, so the full integration suite was not repeated.
