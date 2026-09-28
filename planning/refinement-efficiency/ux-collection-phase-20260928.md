# Prescribed UX collection phase

**The prescribed collection phase loaded the same complete input in 3m59.284s, compared with 6m53.348s previously: 42.1% faster in this observation.** It used the same 74 reads and 73 model-generated read commands. Every page was recovered from the actual client-visible tool results and reconstructed to the original input hashes, with no truncation warnings.

This experiment changes the agent's acquisition instructions while retaining the saved full inputs, MCP tools, 7,000-byte read cap, configured UX model and reasoning effort. It tests whether a fixed retrieval plan and an explicit collection-only phase reduce repeated command-generation and pre-command time. The existing role files and default refine-design instructions were not changed.

The historical [MCP replay](ux-mcp-replay-20260928.md) loaded 514,426 bytes in 74 reads issued by 73 model-generated commands. Mean pre-command time was 3.194 seconds and command-stream time was 2.281 seconds; its input-loading window was 413.348 seconds. The earlier assignment already deferred explicit comparison, so this is a tighter acquisition protocol rather than a previously absent preparation phase.

## Controlled scope

- One fresh configured `ux-planner`, gpt-6-astra with ultra reasoning, dispatched by the same CLI supervisor arrangement.
- The exact original facts and prior UX values, verified by their stored hashes. No selected-input package or completed answer is supplied.
- The same three role guidance files, same instruction-reader limit, and separate instructions-ready and inputs-ready markers.
- A fixed retrieval plan: first pages from both handles in one command, then individual pages until facts and UX are complete. Every MCP result remains separate and bounded. No pagination helper, combined-output collector or increased output allowance.
- Explicit instructions to use continuation metadata, avoid narration/summaries/product analysis and not reconsider input scope during collection. These instructions cannot disable internal model processing.
- Stop after READY. No comparison, UX authoring, independent review or live Alexa mutation.

The treatment is [assignment.md](experiments/ux-collection-phase/assignment.md). The runner saves the instantiated private prompt, input receipts, service observations, client stream events and runtime metadata under `.codex-tmp/ux-collection-phase-20260928/`. No credentials or raw model reasoning belong in the public report.

## Procedure

1. `node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --smoke --attempt=preflight` checks the existing MCP setup without a model call.
2. `node planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --attempt=attempt-01` performs one collection-only trial. Attempt names must be new so existing evidence is retained.
3. `python planning/refinement-efficiency/experiments/ux-collection-phase/analyze.py attempt-01` checks input coverage and produces sanitized timing metrics.

The runner reuses the existing saved MCP observer and CLI metadata extractor, identified by hash in the measurements. It requires those earlier experiment helpers and source files in this workspace. Host subprocess permission is required on this Windows setup; the preflight uses the same authorized process route as the prior experiment.

## Interpretation

Compare the input-loading window, per-command mean/median gaps and emission durations, actual command/read counts, instruction time and token counters. A change in batching or delivery completeness must be reported rather than attributed to the prompt. Tool execution time is nested in the whole cycle. Cached-input and reasoning-output counters are subsets, and overlapping windows must not be summed.

This is one new observation against a historical run, not a randomized or repeated benchmark. Scheduling, cache conditions and normal model variation remain uncontrolled. There is no subsequent design task to test retained understanding or equivalent decision quality. Observed reasoning-item streams do not reveal all internal reasoning, and pre-command gaps do not isolate prompt processing from scheduling or transport.

## Results

| Measurement                                             | Earlier MCP replay | Prescribed collection |
| ------------------------------------------------------- | -----------------: | --------------------: |
| Complete input content                                  |      514,426 bytes |         514,426 bytes |
| MCP data reads / generated read commands                |            74 / 73 |               74 / 73 |
| Input-loading window                                    |           413.348s |              239.284s |
| Mean previous-result to command-start gap               |             3.194s |                1.869s |
| Mean command-stream duration                            |             2.281s |                1.261s |
| Mean tool execution/result interval                     |             0.121s |                0.099s |
| Mean complete read cycle                                |             5.596s |                3.230s |
| Mean generated command argument size                    |        226.7 bytes |           126.1 bytes |
| Median generated command argument size                  |          214 bytes |             123 bytes |
| Instruction loading, separately                         |            89.687s |               76.384s |
| Entire UX preparation, including instructions and READY |           508.035s |              320.015s |

Across the 73 read commands, generation took **92.089s rather than 166.510s**, and pre-command gaps totaled **136.437s rather than 233.162s**. Tool intervals totaled **7.237s rather than 8.819s**. Those components explain most of the approximately 174-second input-loading difference. Phase markers and other boundary work account for the remainder; these sums are inside the loading window, not additional elapsed time.

The first command still retrieved the first page of each handle together. Every subsequent read command requested one page, completing facts first and then UX. The agent did not collapse results into a bulk tool response. Both source hashes, all 18 facts pages and all 56 UX pages were verified in the client results. This establishes delivery integrity, not attention or comprehension.

The entire supervisor CLI window was **362.431s**. It includes dispatch and final acknowledgement and must not be compared with the previous full preparation-plus-design CLI window. The resident MCP service started in **137.6ms**; its 74 read methods totaled **87.768ms**. The server and CLI exited successfully after READY.

## Observed processing and usage

| Input-loading evidence  | Earlier replay | Prescribed collection |
| ----------------------- | -------------: | --------------------: |
| Output-item streams     |       173.142s |               93.633s |
| Reasoning-item streams  |        23.466s |           0s observed |
| Tool intervals          |         8.881s |                7.294s |
| Unattributed intervals  |       207.859s |              138.357s |
| Input-token counters    |      9,834,207 |             9,401,698 |
| Cached-input subset     |      9,627,520 |             9,199,232 |
| Output-token counters   |          6,696 |                 3,719 |
| Reasoning-output subset |            691 |            0 reported |

These are response-completion counters within the phase, not unique input sizes. The whole preparation reports 10,050,482 input tokens, including 9,813,632 cached, and 5,244 output tokens, including 335 reasoning-output tokens. The supervisor's counters are separate in the metrics. No monetary cost is inferred.

Zero observed reasoning-item streams does **not** mean the model performed no internal interpretation. The reduced unexplained gap cannot be attributed entirely to less reasoning. Shorter commands are directly measured; concise acquisition instructions, argument binding choices, prompt/cache differences and runtime variation are not isolated from one another by this single trial.

## Conclusion and saved evidence

This is a promising agent-flow result despite an unchanged call count and unchanged tool limits. It supports keeping retrieval scope fixed, suppressing unnecessary narration or design work during acquisition, and reusing concise command bindings. It does not establish that explicit collection instructions alone guarantee a 42% improvement or preserve later design quality.

One live trial was run, ending at READY. No UX comparison, independent review, publication, canonical persistence or live Alexa modification followed it. The server capability allowed only input reads and result storage. The setup is available for further controlled use; no global skill/agent behavior was silently replaced.

[Saved metrics](ux-collection-phase-20260928-metrics.json) retain the per-command timing data, client/server coverage, source hashes, phase windows, usage, server requests and metadata-only runtime extraction. The exact instantiated assignment and original logs remain in the ignored attempt directory. The comparison analyzer passed all coverage/model/effort checks. The non-model preflight and completed CLI run both succeeded.
