# Outgoing parallel-call configuration capture

**The installed Codex client explicitly sends `parallel_tool_calls: false` with the tested native MCP configuration. Both HTTP fallback and the normal WebSocket path show it.** This identifies a client request restriction consistent with the previous sequential-read result; a missing read-only annotation or a stronger prompt does not resolve it.

## Evidence

| Capture                      | Agent model   | Effort  | Tool choice | `parallel_tool_calls` | Whole local run |
| ---------------------------- | ------------- | ------- | ----------- | --------------------- | --------------: |
| HTTP fallback                | `gpt-6-astra` | `xhigh` | `auto`      | `false`               |         3.509 s |
| WebSocket generation request | `gpt-6-astra` | `xhigh` | `auto`      | `false`               |         2.727 s |

These are request-construction diagnostics, not model-performance measurements. **No model execution or request forwarding occurred.** The endpoint returned an intentional terminal error once it recorded the permitted metadata. The child CLI's exit code of 1 is expected for that response.

OpenAI's [function-calling documentation](https://developers.openai.com/api/docs/guides/function-calling) explains that disabling `parallel_tool_calls` limits a response to zero or one tool call. This is separate from an MCP tool's `readOnlyHint`, which our `workflow_read` already advertises and which concerns safe concurrent execution of calls that have been produced.

The WebSocket capture also received two prewarm requests with `generate: false`: one for `gpt-6-astra` and one for the client's automatic reviewer, `codex-auto-review`. They were recorded separately from the actual generation request, which retained `gpt-6-astra` and xhigh effort. No model was substituted or invoked by the capture server.

## Method and boundaries

The same `codex-cli 0.155.0-alpha.16.3` executable used by the [native exposure probe](ux-native-direct-20260928.md) ran with the inherited model and reasoning settings. The namespace overrides were the same:

```toml
[features.code_mode]
enabled = true
direct_only_tool_namespaces = ["mcp__polylith_workflows"]
```

The documented [`openai_base_url` override](https://learn.chatgpt.com/docs/config-file/config-reference) redirected model requests to a capture server bound to `127.0.0.1`. The endpoint served the existing cached model catalog without editing its model entries. A local instance of the production MCP HTTP adapter advertised the same tool contracts, including the read-only annotation and 28,000-byte window. No product records were needed: the short prompt named two synthetic handles.

The first capture rejected WebSocket upgrades and received a zstd-compressed HTTP request: 31,172 wire bytes, 93,984 decoded bytes. To check whether fallback affected the flag, the second capture accepted the normal WebSocket handshake and received the generation request directly: 94,128 decoded bytes. Both contained the explicit false value. Those byte counts describe the whole outgoing request, including instructions; they are not sizes of retrieved product data.

Only metadata was retained: request field names, model, effort, tool choice, parallel-call flag, generation/prewarm classification, counts, sizes and timings. Authentication headers, instructions, prompt text and request bodies were not saved by the capture server. Client diagnostic output remains in the ignored temporary directory. No top-level `tools` field was present in either generation request; the MCP contracts advertised to the client are recorded separately, and are not evidence of a top-level API tool list.

The WebSocket attempt initially tripped an overbroad verifier that expected every observed model name to be the agent model. The saved data revealed the automatic-review prewarm. The verifier now separates `generate: false` requests from actual generation, and both original captures pass reanalysis. The original evidence was preserved; no repeat model call or data regeneration was necessary.

## Conclusion and next boundary

The earlier statement that the model simply failed to follow the batching instruction was premature. We now have direct evidence that this client configuration asks for single-call responses. The [earlier recording](ux-native-direct-20260928.md) still verifies native exposure and complete independent results, but it was not a valid demonstration of unrestricted model batching behavior.

The next possible investigation is the client rule that sets this flag: whether it comes from model capabilities, code-mode request construction, or another setting. This capture does not establish that cause or a supported override. Do not change the flag in a proxy, edit model metadata, switch models, or adopt a guessed configuration key as a permanent fix based on this evidence. The HTTP and WebSocket samples are new local requests, not recovered historical live request bodies.

No global configuration or production MCP behavior was changed, and no live Alexa data was read or written. Both local servers and child processes were closed. The capture utility is experiment tooling, not a general HTTP proxy or WebSocket server.

## Evidence and reproduction

- [Sanitized request metadata](ux-request-capture-20260928-metrics.json)
- [Capture and saved-evidence verifier](experiments/ux-read-window/capture-request.mjs)
- Private run artifacts: `.codex-tmp/ux-request-capture-20260928/direct-native-01/` and `direct-native-ws-01/`

```text
node planning/refinement-efficiency/experiments/ux-read-window/capture-request.mjs --self-test
node planning/refinement-efficiency/experiments/ux-read-window/capture-request.mjs --attempt=direct-native-01
node planning/refinement-efficiency/experiments/ux-read-window/capture-request.mjs --websocket --attempt=direct-native-ws-01
node planning/refinement-efficiency/experiments/ux-read-window/capture-request.mjs --verify-capture=direct-native-01
node planning/refinement-efficiency/experiments/ux-read-window/capture-request.mjs --verify-capture=direct-native-ws-01
```

Live capture commands require fresh attempt names. Verification reuses saved sanitized metadata. Checks covered true/false/omitted flag projection, exclusion of private sentinel content, compressed request decoding, masked WebSocket framing, distinction between prewarming and generation, both captured requests, syntax, formatting and diff consistency. No broader package test was needed for this isolated diagnostic.
