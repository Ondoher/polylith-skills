# STDIO MCP instance sharing experiment

The installed Codex runtime gave the parent and each of two child agents a **separate resident STDIO MCP server process**. They did not share RAM. One child's server and marker survived a follow-up turn in that same agent.

## Test and evidence

Executed September 27, 2026 local time (September 28 UTC), using `codex-cli 0.155.0-alpha.16.3`, the same binary installed with the VS Code extension. An isolated `codex exec` coordinator used temporary command-line MCP configuration, its existing default model settings, and two default child agents with `fork_turns: none`. No global or project configuration was edited. The current IDE conversation was not reconfigured, and the Alexa refinement remains paused.

The small probe exposes `inspect` and `put`. Each process creates a random instance UUID and an empty in-memory Map. The parent writes `parent-marker` before spawning children. Each child directly reads its server, writes its own marker, then reads again. The parent reads again after both children finish; child A receives a further turn and reads again. Server observations are logged to disk solely as evidence; the server never reloads those files, and agents were instructed not to inspect them. No product data participates in the probe.

| Caller                               | Server PID | Instance UUID                          | Observed markers                                   |
| ------------------------------------ | ---------: | -------------------------------------- | -------------------------------------------------- |
| Parent, initially and after children |      31176 | `a8dde34d-84d0-4b55-b293-88fa7b1ed942` | Only `parent: parent-marker`                       |
| Child A, three calls                 |      22600 | `4fdb88e6-5350-402c-a68b-ab0df37763ac` | Initially empty; then only `probe_a: child-marker` |
| Child B, three calls                 |      63932 | `f63ab0fc-1306-478e-bb8c-e9bfda91aa70` | Initially empty; then only `probe_b: child-marker` |
| Child A, follow-up turn              |      22600 | `4fdb88e6-5350-402c-a68b-ab0df37763ac` | Still only `probe_a: child-marker`                 |

All three servers reported the same OS parent PID, 60436: the isolated Codex coordinator process. The result therefore came from one agent tree, not three independently launched Codex applications. The coordinator and probe process IDs were absent after completion.

Raw server observations, source hashes, timestamps, operation durations, runtime version, and coordinator-reported usage are preserved in [the metrics file](mcp-stdio-sharing-metrics.json). The scratch directory `.codex-tmp/mcp-stdio-sharing/` retains `probe.mjs`, `run.mjs`, `prompt.txt`, CLI events, stderr, final response, and per-instance audit logs for reproduction.

## Measurements and limits

- Isolated experiment elapsed time: **68.027 seconds**, including coordinator and child work, startup, waiting, and the follow-up. Parent research, probe construction, and reporting are outside that measurement.
- Three server processes and nine successful probe tool calls.
- Measured in-server operations: **0.0190–0.0435 milliseconds** per call. These tiny measurements cover the Map operation and response-object construction only. They exclude audit writes, serialization, transport, tool orchestration, and model activity, and are not end-to-end latency results.
- Coordinator CLI usage report: 193,746 input tokens, including 171,776 cached input tokens; 1,020 output tokens; zero reported reasoning-output tokens. This is not an independently reconciled total across child turns, a measure of actual reasoning time, or a credit estimate.
- This is an instance-sharing test, not a retrieval performance benchmark or a STDIO-versus-HTTP comparison. It establishes behavior for this installed runtime and isolated CLI configuration; other clients, versions, and configurations remain untested.

## Consequence for the storage idea

STDIO provides persistent memory within each tested agent, but a plain STDIO server does not automatically provide one shared memory store across these agents. Sharing the same server command/configuration is insufficient.

One shared store would need an explicit common backend. Options include one local HTTP MCP service or lightweight per-agent STDIO servers that communicate with a common process, for example through a named pipe. Either can deliver records directly as tool results without an intermediary agent reproducing their contents. Neither alternative was implemented or benchmarked here.

The [MCP transport specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) defines STDIO servers as client-launched subprocesses and HTTP servers as independent processes supporting multiple connections. [Codex documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) documents support for both transports. The per-agent process behavior above is established by the local test, not inferred from configuration sharing or the protocol alone.
