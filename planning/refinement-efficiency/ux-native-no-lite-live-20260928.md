# Live native-call compatibility check with Responses Lite disabled

**Follow-up:** [Simpler instructions completed both reads](ux-native-simple-instructions-20260928.md), but the reads still occurred in separate model responses. The original incomplete result below is preserved.

**The backend accepted the altered request format and completed one native read, but the agent did not produce the requested two-call batch. The test is incomplete, and this configuration is not yet a demonstrated parallel-read solution.**

This follows the [client-rule trace and local capture](ux-parallel-client-rule-20260928.md). The live test reused the exact temporary catalog, existing saved facts/UX data, original native-call assignment, 28,000-byte page window, same installed Codex executable, and `gpt-6-astra` at xhigh effort. The catalog changes only Astra's `use_responses_lite` field to false; native MCP namespace exposure remains enabled.

## Observed result

The model issued one native `workflow_read` for the first facts page. Its separate tool result contained **28,000 bytes of content**, matching the saved source bytes exactly. The client-recorded serialized output was 31,392 bytes. No wrapper, truncation or server error occurred for that read.

The model then returned:

> NATIVE_NOT_COMPLETED: The first native read returned before the second call was emitted. No completion marker was stored.

The transcript contains one native call and two completed model responses: the read request and the final incomplete result. There was no second read, no batch and no completion-marker write. This is actual failure to complete the assigned sequence, not merely a fast tool finishing while a second call streams within the same response.

The original harness reported `Collection did not reach inputs-ready` after the CLI exited with code 0. The preserved control file still records that harness error. The external analyzer classifies the outcome as `native-incomplete`. The harness now recognizes this explicit outcome for future probes instead of confusing it with a transport failure.

## Performance evidence

| Measurement                   |   Observed |
| ----------------------------- | ---------: |
| Whole client window           |   23.510 s |
| Output-item streaming         |    5.066 s |
| Reasoning-item streaming      |    9.486 s |
| Tool interval                 |    0.066 s |
| Unattributed runtime          |    8.882 s |
| First read command generation |    3.173 s |
| MCP service execution         |   0.660 ms |
| Resident MCP server startup   | 141.122 ms |

The runtime categories cover a 23.500-second observed window; the harness uses its own dispatch-to-close clock. Command generation is part of output streaming, and service execution is inside the tool interval. Do not add these overlapping measurements.

Whole-client usage was 47,556 input tokens, including 24,320 cached, and 489 output tokens, including 315 reasoning-output tokens. This was one live attempt. Its shorter duration than the earlier two-read probe is **not a performance improvement**: it performed less work and did not finish the assignment.

## Interpretation

- Basic backend compatibility is demonstrated for an initial request, a native tool call, its returned result and subsequent model response.
- The separate local capture established that this catalog produces `parallel_tool_calls: true`. This live transcript does not independently capture its outgoing request body; the catalog hash ties it to that prior configuration evidence.
- Enabling the client permission did not make this agent produce a batch. The precise remaining cause is unverified; this result alone does not distinguish model behavior from another backend or client constraint.
- Neither two-result delivery nor normal completion of the requested sequence was validated. No full UX replay or throughput improvement is claimed.

The analyzer now reports incomplete native probes without discarding their verified partial data. It treats shared **model response IDs** as the batching criterion, independently of tool completion timing: a streaming client can finish a fast first tool before the model finishes emitting a second call in the same response. Execution overlap and whether both calls preceded the first result remain separate recorded observations. A successful target additionally requires the completion marker. This clarification does not change the outcome here; there was only one call.

The experiment stopped after that result. No repeated model attempt, global configuration change, production adoption or live Alexa mutation was made. The server and child process exited, and their PIDs were checked absent. All source data and diagnostic artifacts remain available for a later targeted test.

## Evidence and reproduction

- [Sanitized metrics, hashes and response IDs](ux-native-mcp-20260928-native-direct-no-lite-live-01-metrics.json)
- [Native assignment](experiments/ux-read-window/native-assignment.md)
- [Native result analyzer](experiments/ux-read-window/direct.py)
- Private logs: `.codex-tmp/ux-read-window-20260928/native-direct-no-lite-live-01/`

```text
node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --native-probe --direct-namespace=mcp__polylith_workflows --model-catalog=.codex-tmp/codex-parallel-rule-20260928/catalog-without-lite.private.json --attempt=native-direct-no-lite-live-01
python -X utf8 .codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py .codex-tmp/ux-read-window-20260928/native-direct-no-lite-live-01
python -X utf8 planning/refinement-efficiency/experiments/ux-read-window/direct.py native-direct-no-lite-live-01
```

The existing attempt and metrics are preserved; live reruns need new names. Verification covered the catalog hash, same model/effort, real native call type and namespace, byte-exact returned content, absent second read/marker, response IDs, usage/timing evidence, cleanup, source syntax and formatting.
