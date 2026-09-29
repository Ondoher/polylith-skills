# Minimal native batching: all three models passed

**GPT-6 Astra, GPT-5.6 Sol and GPT-5.5 each emitted eight native function calls in one model response.** All eight exact synthetic results were verified, and the local executions overlapped. This establishes a working native-batching baseline on the same official backend used by the earlier Codex experiments.

The experiment ran on September 28 locally (September 29 UTC). [Complete metrics](minimal-parallel-models-20260928-metrics.json) preserve the exact synthetic requests, response IDs, usage, tool definition, call timings and source hashes. No authentication headers, credentials, product content or model reasoning content are saved.

## Exact prompt and setup

The entire user prompt is 20 words:

```text
Call probe(id) for IDs 1 through 8 in parallel, in one model response. All calls are independent. Do nothing else.
```

The [runner](experiments/minimal-parallel/run.mjs) sends this prompt directly over WebSocket to `https://chatgpt.com/backend-api/codex/responses`. It uses the user's existing Codex authentication in memory, normal TLS verification, and the same WebSocket protocol header identified in the installed client's source. It does not load or modify user configuration, launch Codex, invoke agents, or forward repository instructions.

Every request has empty `instructions`, one plain JSON function named `probe`, `parallel_tool_calls: true`, `tool_choice: auto`, `store: false`, and xhigh reasoning effort. No Responses Lite header is sent. The single tool accepts only an integer ID from 1 through 8, uses strict schema validation and describes independent, read-only calls. Its implementation waits 250 ms, then returns exactly `{"id":N}`. That deliberate delay makes execution overlap measurable; it is not real storage latency.

The models were selected from the installed catalog: Astra retains the original model, while Sol and GPT-5.5 match the comparison in [Codex issue #32503](https://github.com/openai/codex/issues/32503). All three list xhigh as supported. Models ran sequentially in the order shown below. The prompt, instruction string, schema and request settings were mechanically checked for equality except the model identifier. This avoids the different instruction templates and tool defaults that a normal Codex launch would inherit.

The probe is a local synthetic function, not an MCP server. This isolates the model/backend's ability to emit multiple function calls before investigating the surrounding Codex/MCP integration. It deliberately does not measure product data delivery or refine-design performance.

## Results

| Model       | Generation requests | Calls in that response | Maximum concurrent probe executions | Total elapsed | Connection setup | Input / output tokens |
| ----------- | ------------------: | ---------------------: | ----------------------------------: | ------------: | ---------------: | --------------------: |
| GPT-6 Astra |                   1 |                      8 |                                   8 |       6.809 s |          0.386 s |              88 / 132 |
| GPT-5.6 Sol |                   1 |                      8 |                                   8 |       4.349 s |          0.353 s |              88 / 132 |
| GPT-5.5     |                   1 |                      8 |                                   8 |       4.480 s |          0.339 s |              88 / 132 |

Each completed response identifies the requested model and echoes `parallel_tool_calls: true`. All eight calls have the same response ID within each run and distinct call IDs. The observer validates the set of IDs, exact returned values and execution intervals independently of model narration. There were no duplicate, missing or malformed results. Connections closed after completion.

Total reported usage for the entire three-model matrix was **264 input tokens and 396 output tokens**. No cached input or reasoning output tokens were separately reported. These counters do not measure pure reasoning time or monetary cost.

Elapsed time begins before connection setup and ends after all probes complete and the socket is closed. The model response completed at 6.557 seconds for Astra, 4.099 seconds for Sol, and 4.224 seconds for GPT-5.5. The final timer finished shortly afterward. These are overlapping measurements and must not be added together. A single observation per model, run sequentially, is not a comparative model-speed benchmark.

No code-mode control was run: all three native tests passed, so the conditional control would add cost without explaining a failure.

## What this establishes

The earlier eight-read Codex run emitted one call per response despite an enabled flag. This minimal run proves that Astra and the same backend endpoint can emit an eight-call native batch. The failure is therefore not a general absence of native-batching capability on that model/backend.

Several differences remain together: the earlier request carried Codex instructions, a larger tool catalog, namespaced workflow functions, access/handle arguments and product context, and ran through the Codex client. This experiment does not identify which difference caused the sequential behavior. Its transport also uses an independently implemented client, so it is not a claim of byte-for-byte equivalence with Codex's request envelope or headers.

The next useful isolation starts from this passing baseline and reintroduces the MCP-shaped tool definition and then the surrounding Codex request context separately, retaining tiny synthetic results and the same model. Increasing the requested call count is no longer necessary to establish capability.

## Verification and reproduction

Two focused local tests cover masked request-frame encoding across short, extended and fragmented deliveries, and distinguish response batching from execution overlap and incomplete results. They passed using the repository's `node --test --test-isolation=none` mode. The actual three-model runs then verified the live connection, response identities, request invariants and exact results. No production code changed, so broader package tests were not needed.

```text
node --test --test-isolation=none planning/refinement-efficiency/experiments/minimal-parallel/run.test.mjs
node --use-system-ca planning/refinement-efficiency/experiments/minimal-parallel/run.mjs --attempt=new-unique-name
```

The second command makes paid live model requests and requires the existing authenticated Codex account. Use a new lowercase attempt name; the runner refuses to overwrite evidence. It fixes the official destination, does not disable TLS verification, and retains authentication only in memory. Saved run evidence is under `.codex-tmp/minimal-parallel-20260928/native-matrix-01/`; the public metrics contain the same synthetic request data and metadata without credentials.
