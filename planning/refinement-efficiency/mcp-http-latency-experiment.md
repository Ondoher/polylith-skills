# Localhost HTTP MCP round-trip experiment

Local HTTP was a small part of the measured latency. Direct MCP requests returned in roughly **3–5 ms median** with a reused connection, including complete response receipt and JSON parsing. Five real Codex MCP calls each occupied **4.85–6.99 ms** in the observed tool-event intervals. The full five-call Codex sequence took **30.592 seconds**.

## What ran

The [server](experiments/mcp-http-latency/server.mjs) is a small Node program using built-in modules. It binds to `127.0.0.1` on an available port and exposes one read-only `get_probe` tool through a stateless Streamable HTTP MCP endpoint. It keeps four synthetic payloads in RAM. Requests use a temporary bearer token; browser origins are rejected. No token was written to evidence files.

The [measurement client](experiments/mcp-http-latency/measure.mjs) starts the server as a separate process, completes MCP initialization and tool discovery, and validates every result's instance ID and exact payload contents. It then sends sequential requests with connection reuse enabled and disabled. An isolated Codex session makes five additional real MCP calls to that same server. No global/project Codex configuration or Alexa data was changed; the attended refinement remains paused. The server was stopped after measurement.

Executed September 27, 2026 local time (September 28 UTC), on Windows with Node v25.4.0 and Codex CLI 0.155.0-alpha.16.3. All measured requests succeeded. The same server instance served the deterministic client and Codex.

## Direct client round trips

Each row contains **100 measured requests after 10 warmups**, at concurrency 1. Times start just before creating the HTTP request and end after the full JSON response is parsed. Request serialization and payload-validation assertions are outside the timer. Responses are uncompressed synthetic ASCII text in a standard MCP result envelope.

| Payload bytes | Reused connection median | Reused connection p95 | New connection median | New connection p95 |
| ------------: | -----------------------: | --------------------: | --------------------: | -----------------: |
|           128 |                 2.914 ms |              4.240 ms |              4.166 ms |           5.252 ms |
|         4,096 |                 3.083 ms |              5.572 ms |              4.215 ms |           4.994 ms |
|         8,192 |                 3.354 ms |              4.622 ms |              4.397 ms |           5.706 ms |
|        58,388 |                 4.705 ms |              5.926 ms |              5.747 ms |           7.027 ms |

The largest payload matches the byte count of the earlier product-facts/manifest retrieval, but contains synthetic text rather than those product records. Its complete MCP response body was 58,556 bytes. All 100 measured requests in each keepalive case reused a socket; none did in the fresh-connection cases.

Server-side mean handling times were **0.127–0.174 ms** across these cases. This timer includes request body receipt, parsing, payload selection, and response serialization; it excludes sending the response and recording the timing sample. The complete client round trip also includes operating-system, network stack, client scheduling, transfer, and response parsing costs. It is not a pure network-wire measurement.

Server process startup to ready: **131.249 ms**. The first MCP initialization request, with a fresh connection and cold code, took **17.206 ms**. Warmup samples and initialization/discovery measurements are retained in the raw metrics rather than discarded.

## Calls through Codex

Codex received only the 128-byte payload, respecting existing agent output limits. The larger payload tests ran in the deterministic client and did not enter a model's context.

| Actual MCP call | Observed tool start-to-completion |
| --------------: | --------------------------------: |
|               1 |                          6.989 ms |
|               2 |                          4.853 ms |
|               3 |                          6.597 ms |
|               4 |                          5.894 ms |
|               5 |                          5.653 ms |

These are monotonic timestamps taken as the harness receives CLI `item.started` and `item.completed` events. Event buffering can affect their precision. They include the observed MCP tool execution path, but exclude generating the model's request and processing the result afterward. All five requests used the same connection; the server independently recorded them.

The **30.592-second** isolated Codex process window divides into:

- **9.588 seconds** before the first observed tool start.
- **0.030 seconds** across all five observed tool intervals.
- **18.530 seconds** across four gaps between a completed tool call and the next tool start, ranging from 3.588 to 5.321 seconds.
- **2.444 seconds** after the final tool completion through final response and process shutdown.

These are consecutive, non-overlapping windows. The gaps can include model input processing, request generation, scheduling, and other orchestration; this experiment does not separate those costs. The initial and final windows include process/session overhead. Parent preparation, source generation, and reporting are outside these test windows.

The CLI reported 127,412 input tokens, including 115,200 cached tokens, and 438 output tokens. It reported zero reasoning-output tokens, which does not establish zero reasoning time. No credit or price estimate is inferred.

## Interpretation and limits

This supports using localhost HTTP for a shared resident store: its measured retrieval latency is measured in milliseconds. The observed multi-second intervals occur around the calls. Reducing model-mediated request cycles, selecting useful data, and avoiding generated copies remain the more promising targets. This experiment does not establish that a complete UX task will finish faster or measure the cost of consuming 58 KB in a model context.

Results come from one run on this machine, in a fixed case order, without concurrent load or TLS. They are not a general latency guarantee, a production MCP server certification, or a comparison against STDIO round-trip performance. The five Codex calls verify actual integration with this minimal JSON-response MCP implementation; it does not implement optional SSE streaming.

All 800 measured direct requests, 80 warmups, initialization/discovery requests, server observations, Codex event timestamps, usage, source hashes, and timing definitions are saved in [the metrics file](mcp-http-latency-metrics.json). Additional raw CLI logs are in `.codex-tmp/mcp-http-latency/`.

## Reproduce

Run the direct benchmark with a fresh output directory:

```powershell
node planning/refinement-efficiency/experiments/mcp-http-latency/measure.mjs .codex-tmp/mcp-http-latency-repeat
```

To include the five real Codex calls, add the installed executable path as the third argument:

```powershell
$probeCodexBinary = (Get-Command codex).Source
node planning/refinement-efficiency/experiments/mcp-http-latency/measure.mjs .codex-tmp/mcp-http-latency-repeat $probeCodexBinary
```

The harness creates the temporary authentication token, launches the server, uses per-process MCP configuration for Codex, saves results, and shuts down the server. The Codex portion uses the existing login and default model settings; the direct benchmark uses no model calls.

Protocol references: [MCP Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) and [Codex HTTP MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli#streamable-http-servers).
