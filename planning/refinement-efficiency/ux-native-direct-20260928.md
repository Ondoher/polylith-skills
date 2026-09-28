# Direct MCP namespace follow-up

**A documented Codex configuration exposes our MCP tools as native calls. The isolated test verified separate, byte-exact 28,000-byte results. It did not achieve the requested single-response batch: the model still generated the two reads sequentially.**

This follows the [two earlier exposure checks](ux-native-mcp-20260928.md). Those checks changed the code-host feature, which did not expose direct calls. The more specific setting below succeeds without changing the model or modifying the MCP server.

## Configuration tested

The official [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) documents `features.code_mode.direct_only_tool_namespaces` for namespaces that code mode can use only through direct tool calls. The isolated CLI child received these overrides:

```toml
[features.code_mode]
enabled = true
direct_only_tool_namespaces = ["mcp__polylith_workflows"]
```

The installed client, `codex-cli 0.155.0-alpha.16.3`, accepted the settings. The child used the existing `gpt-6-astra` model at xhigh effort. The global configuration, current conversation, model catalog, client output budget and production defaults were unchanged. This is a verified experimental configuration, not a claim that it has been installed for every agent or that a running conversation will refresh its tools automatically.

## What the client actually did

| Read              | Requested content | Client-recorded output | Command generation | Tool round trip | Server execution | Exact content |
| ----------------- | ----------------: | ---------------------: | -----------------: | --------------: | ---------------: | ------------- |
| Facts, first page |          28,000 B |               31,392 B |            3.096 s |         0.097 s |         0.889 ms | Yes           |
| UX, first page    |          28,000 B |               31,859 B |            2.979 s |         0.085 s |         1.277 ms | Yes           |

The transcript contains two native `workflow_read` function calls and one native `workflow_store` for the completion marker. Each has its own call ID and corresponding function-call result; no `functions.exec` wrapper delivered the data. Both client-visible pages match the saved input bytes exactly, and neither has a truncation warning. Output sizes include MCP serialization and differ from content size.

The reads belong to **different model response IDs**, although the CLI gives them the same overall turn ID. After the first result completed, the next cycle took 4.862 seconds: a 1.798-second gap, 2.979 seconds generating the second call, and a 0.085-second tool round trip. This is direct access with sequential scheduling. The desired arrangement remains two calls prepared before either result is consumed.

The child reported `NATIVE_COMPLETED`, and the runner saw the completion marker. Those signals establish completion only. The external analyzer correctly records `targetMet: false` because response grouping failed. The server's first two read start times were 4.874 seconds apart.

## Timing and scope

The CLI window was 31.890 seconds, including startup, two first-page reads, a completion-marker write and the final response. The server started in 125.695 ms. Runtime categorization recorded 10.264 seconds of output-item streaming, 4.335 seconds of reasoning-item streaming, 0.259 seconds of tool intervals and 17.023 seconds unattributed. These are observed runtime categories, not a decomposition of internal model computation. Server execution is inside the tool interval and must not be added to it.

Whole-client usage was 106,787 input tokens, including 81,920 cached input tokens, and 508 output tokens, including 128 reasoning-output tokens. The test retrieved 56,000 content bytes in total. It did not collect all 514,426 bytes, run UX comparison, review a design or mutate live Alexa data. Its total cannot be compared as a speedup against those larger tasks.

## Resolution and remaining question

The direct-call exposure problem has a verified configuration solution. The remaining question is why this client/model session generated one native call per response despite an explicit instruction to emit both together. This recording does not expose a client request setting such as `parallel_tool_calls`, so it cannot distinguish a client constraint from model behavior.

The user's subsequent `readOnlyHint` suggestion is relevant to execution eligibility. Our [tool contract](../../scripts/mcp/tool-contracts.mjs) already declares `readOnlyHint: true` for `workflow_read`, and `McpHttpServer` returns that contract in `tools/list`. OpenAI's [Codex implementation change](https://github.com/openai/codex/commit/c83ba22359f4140e44fc43500d2bedbb882d7211) and [current MCP handler](https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/handlers/mcp.rs) treat a read-only annotation as sufficient for parallel execution even without the server-level parallel opt-in. That is execution eligibility once calls exist; it does not force the model to produce several calls in one response. No missing read-only annotation was found, and no server-wide parallel override was added. Public source establishes the intended client behavior, not the exact configuration of the installed alpha binary.

Before adopting this as a performance improvement, verify that the client permits multiple direct calls in one response and obtain a recording that actually uses them. Repeat the existing byte checks and response-ID checks for that recording. Do not replace this requirement with another combined wrapper, count a shared CLI turn ID as proof, or silently switch models. No additional identical model probe was run after this result; the saved inputs and analyzer are reusable.

## Evidence and reproduction

- [Sanitized metrics and runtime metadata](ux-native-mcp-20260928-native-direct-namespace-01-metrics.json)
- [Native delivery and grouping analyzer](experiments/ux-read-window/direct.py)
- [Original assignment](experiments/ux-read-window/native-assignment.md)
- Private logs: `.codex-tmp/ux-read-window-20260928/native-direct-namespace-01/`

```text
node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --native-probe --direct-namespace=mcp__polylith_workflows --attempt=native-direct-namespace-01
python -X utf8 .codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py .codex-tmp/ux-read-window-20260928/native-direct-namespace-01
python -X utf8 planning/refinement-efficiency/experiments/ux-read-window/direct.py
```

The runner refuses an existing attempt name, and the analyzer refuses to overwrite its metrics. The analyzer depends on the saved client transcript, input receipts, service observations and previously extracted runtime metadata. Validation covers native call types and namespace, actual client-visible bytes, independent result IDs, response grouping, model/effort, timing attribution, source syntax and formatting. Production MCP behavior is unchanged.
