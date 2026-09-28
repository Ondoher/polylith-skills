# Why Codex disables parallel model tool calls

**Live follow-up:** [The first backend compatibility test](ux-native-no-lite-live-20260928.md) completed one native read and a subsequent model response, but the agent stopped without producing the requested batch. Basic request compatibility is established; parallel-read success remains unproven.

**The cause is the model's Responses Lite metadata. Codex explicitly disables parallel model tool calls whenever that mode is enabled. A documented custom-catalog override changed the outgoing flag to true in an isolated local capture, but backend compatibility remains untested.**

## Source trace

The installed executable reports `0.155.0-alpha.16.3`. The corresponding source release resolves to commit `ffa06df2317e3e65fc74da977a5884710c5382d5`. The trace is:

1. [Ordinary turn construction](https://github.com/openai/codex/blob/ffa06df2317e3e65fc74da977a5884710c5382d5/codex-rs/core/src/session/turn.rs#L1534) sets the prompt's parallel-call permission to true.
2. The selected `gpt-6-astra` catalog entry has `use_responses_lite: true`. Its separate `tool_mode` is `code_mode_only`.
3. [Request construction](https://github.com/openai/codex/blob/ffa06df2317e3e65fc74da977a5884710c5382d5/codex-rs/core/src/client.rs#L942) combines prompt permission with the opposite of the Lite flag:

```text
parallel_tool_calls = prompt.parallel_tool_calls && !model_info.use_responses_lite
```

Therefore the resulting flag is false even though the ordinary turn initially allows parallel calls. This matches the previous [HTTP and WebSocket captures](ux-request-capture-20260928.md).

Direct MCP namespace exposure, Responses Lite request formatting, and execution eligibility are distinct settings. Exposing our namespace directly did not disable Lite. The existing `readOnlyHint: true` annotation permits concurrent execution in the client but does not change this request-building rule. The MCP server's `supports_parallel_tool_calls` option also concerns execution eligibility.

## Configuration support

The release's [configuration schema](https://github.com/openai/codex/blob/ffa06df2317e3e65fc74da977a5884710c5382d5/codex-rs/core/config.schema.json) has no dedicated top-level `parallel_tool_calls` or `use_responses_lite` switch. Its similarly named `supports_parallel_tool_calls` property belongs to MCP server configuration.

Codex does document [`model_catalog_json`](https://learn.chatgpt.com/docs/config-file/config-reference), which loads a custom model catalog. It applies at process startup; the release schema says per-thread overrides do not reapply it. This provides a supported configuration mechanism for supplying model metadata, rather than a dedicated supported recommendation to disable Lite for Astra.

That distinction matters: disabling Lite changes how instructions and tools enter the request, as well as the parallel-call flag. The same request-builder source selects a different representation, and the local capture confirmed that top-level `instructions` and `tools` appeared after the override. The source also changes reasoning-context configuration. A successful local request-construction check cannot establish that the backend accepts this combination or preserves equivalent behavior.

## Local confirmation

The diagnostic copied the existing complete catalog into an ignored temporary file. It changed exactly one field, `use_responses_lite`, from true to false for `gpt-6-astra`. All other fields, model entries, the selected model, xhigh reasoning effort, and direct MCP namespace configuration were preserved. The client received the copy through its documented startup option and sent requests only to the localhost capture endpoint.

| Property                       | Previous normal configuration | Temporary catalog copy    |
| ------------------------------ | ----------------------------- | ------------------------- |
| Model                          | `gpt-6-astra`                 | `gpt-6-astra`             |
| Reasoning effort               | `xhigh`                       | `xhigh`                   |
| `use_responses_lite`           | `true`                        | `false`                   |
| `tool_mode`                    | `code_mode_only`              | `code_mode_only`          |
| Outgoing `parallel_tool_calls` | `false`                       | **`true`**                |
| Native workflow namespace      | Previously verified           | Present in captured tools |
| Model execution                | None                          | None                      |

The new capture completed in **2.907 seconds**. This is local setup and request capture, not reasoning time or a measured performance improvement. Both its prewarm and actual generation request carried the true value. The same binary hash was verified against the previous capture. Local servers and the child process closed after the expected terminal diagnostic error.

## Outcome

The rule and its input are identified, and an isolated catalog override demonstrably changes the client request. No direct parallel-call setting was found in the documented configuration or the release schema. The public `main` request builder inspected during this investigation retains the same Lite condition; that is not a claim about every published client build.

A small live compatibility test would be needed before adopting the catalog override: confirm backend acceptance, two native calls in one model response, separate complete results, and normal continuation. That test has not been run. No global configuration, installed executable, persistent model entry, agent role or live Alexa artifact was changed for this experiment. The catalog copy is retained privately so a later authorized test can reuse it.

## Evidence and reproduction

- [Source identities, catalog delta and captured request metadata](ux-parallel-client-rule-20260928-metrics.json)
- [Local capture utility](experiments/ux-read-window/capture-request.mjs)
- Private copied catalog and source snapshots: `.codex-tmp/codex-parallel-rule-20260928/`
- Private capture: `.codex-tmp/ux-request-capture-20260928/direct-native-no-lite-01/`

```text
node planning/refinement-efficiency/experiments/ux-read-window/capture-request.mjs --websocket --model-catalog=.codex-tmp/codex-parallel-rule-20260928/catalog-without-lite.private.json --attempt=direct-native-no-lite-01
node planning/refinement-efficiency/experiments/ux-read-window/capture-request.mjs --verify-capture=direct-native-no-lite-01
```

Use a fresh attempt name for another capture. The existing metadata can be reverified without creating another request. Validation checked the catalog's single-field delta, unchanged other entries, inherited model/effort, native workflow tool declarations, false-to-true request flag, no forwarding/model execution, resource cleanup, source hashes, syntax and formatting.
