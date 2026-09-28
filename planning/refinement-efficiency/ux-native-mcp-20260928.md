# Native MCP call exposure check

**Follow-up:** [A per-namespace configuration now exposes native MCP calls](ux-native-direct-20260928.md). It delivered both 28 KB pages exactly, but the model issued them in separate responses. The two negative results below remain valid for their tested configurations; direct exposure is no longer the unresolved issue.

**The user's proposed arrangement is valid: a model response can contain several independent tool calls, each with a corresponding result. Our two isolated probes did not expose that direct-call route in the installed Codex client with its current model.** This is a different question from returning several MCP results through one `functions.exec` response.

OpenAI's [function-calling documentation](https://developers.openai.com/api/docs/guides/function-calling) describes multiple calls in one model response and results associated with individual call IDs. Its [programmatic tool-calling documentation](https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling) distinguishes direct invocation from program-only invocation through `allowed_callers`. Those API capabilities do not establish which route this particular Codex client exposes.

## Local evidence

The installed client was `codex-cli 0.155.0-alpha.16.3`, from the VS Code extension at `openai.chatgpt-26.917.62051-win32-x64`. Its model catalog entry for `gpt-6-astra` reported `tool_mode: "code_mode_only"`. The user's configured model and xhigh reasoning effort were retained.

The default feature listing reported `code_mode_host=true`; the general `code_mode` and `code_mode_only` feature switches were false. Model-catalog metadata and feature switches are distinct inputs, so a false feature switch does not establish direct tool availability. The CLI supports per-process `--disable` overrides. A second probe used `--disable code_mode_host`, and a separate feature-list check confirmed that this override resolves to `code_mode_host=false`.

Both probes used the same authenticated local MCP service, the same saved facts/UX handles, and a 28,000-byte server window. Each assignment requested two genuine top-level `workflow_read` calls in one model response, with separate call IDs and no intervening result interpretation. The assignment explicitly prohibited JavaScript wrappers, Promise batching, shell fallback, guessed tool names, model changes and output-budget changes. If native tools were not exposed, the agent was to report that and stop.

| Isolated client configuration              | Client elapsed time | Model tool calls | Product-data reads | Result                   |
| ------------------------------------------ | ------------------: | ---------------: | -----------------: | ------------------------ |
| Existing configuration                     |              7.516s |                0 |                  0 | Native calls unavailable |
| `code_mode_host` disabled for this process |              8.655s |                0 |                  0 | Native calls unavailable |

Both agents returned `NATIVE_UNAVAILABLE: MCP tools are exposed only through the code wrapper.` The runtime records contain no model tool calls, and the server observations contain no data reads. No previously tested wrapper route was substituted. Setup did load the existing saved inputs into the server and assign handles; those parent operations are separate from agent acquisition.

Each probe exited successfully, and its server shut down. The first used 18,248 input tokens, including 7,296 cached, and 80 output tokens, including 59 reasoning-output tokens. The second used 18,244 input tokens, including 7,296 cached, and the same output counts. These are whole-client counters, not measured costs of retrieving data; no data was retrieved by either agent.

## Interpretation and limits

The previous [paired-result truncation](ux-read-parallel-20260928.md) applies to one outer wrapper response. It does **not** prove that several independent native tool-result messages share that same limit. These new checks establish that the direct route was not exercised under either tested configuration. They do not measure separate-envelope capacity or performance, and they do not prove that every client configuration or implementation is incapable of exposing native calls.

The client exposure is the unresolved part. Changing our MCP server's read batching would not by itself make native tools callable by the model. One isolated host-feature override was insufficient. No different model, altered model catalog, direct Responses API application, global configuration change, new executor, output-limit increase or live Alexa mutation was attempted. Investigation stopped after these two short probes to avoid spending on a route the client had not exposed.

The user’s target remains **one acquisition-planning step followed by independently bounded results before further model work**. A future test must first establish an available delivery path that meets that contract, then verify exact bytes and response-group membership. Neither an array inside one wrapper nor separately generated reads should be relabeled as that test.

## Evidence and reproduction

- [Sanitized metrics and runtime metadata](ux-native-mcp-20260928-metrics.json)
- [Native-call assignment](experiments/ux-read-window/native-assignment.md)
- Original private prompts and logs: `.codex-tmp/ux-read-window-20260928/native-default-01/` and `native-host-off-01/`

```text
node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --native-probe --attempt=native-default-01
node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --native-probe --disable-code-host --attempt=native-host-off-01
python planning/refinement-efficiency/experiments/ux-read-window/native.py
```

The runner refuses to reuse an existing attempt name; the analysis refuses to overwrite its report. These commands rely on the existing saved input data, observer and runtime extractor. The experiment runner now recognizes an explicit native-unavailable outcome without treating it as successful data acquisition. Validation checked both actual client runs, model/effort, absence of wrapper tool calls and data reads, source syntax, formatting and diff consistency. Production MCP behavior and default settings remain unchanged.
