# Native UX command parallelism: execution record

Authorized objective: isolate the difference between the passing minimal native-batching control and the sequential Codex UX reads, implement a supported fix, and verify the real UX read commands. User is AFK; use judgment, preserve results, minimize paid repeats, and checkpoint coherent units with the adviser and preapproved messages.

Started: 2026-09-29 13:20 UTC. Baseline checkpoint: `b69518f`.

## Work sequence

1. Reuse the passing Astra/xhigh eight-call minimal control. Restore namespace and workflow schema independently.
2. Confirm the first failure against its passing predecessor; narrow only the changed layer.
3. Add actual MCP execution, additional tools and instructions as needed to locate the cause.
4. Implement the smallest supported workflow/client configuration fix. Avoid a permanent credential proxy or backend-specific workaround.
5. Validate exact delivery of real saved UX inputs, simultaneous command preparation, model response grouping, and maintained output budgets. Preserve the live product state.
6. Record runtime and usage, focused verification, decisions and limitations; checkpoint with adviser.

## Evidence policy

Use synthetic small inputs for isolation and existing saved product data for final verification. Keep authentication and raw product content out of committed reports. Never overwrite a prior attempt. A failed or partial batch must remain visible in metrics. Count calls per model response separately from execution overlap; server reads can be too fast to overlap even when prepared together.

## Completed result

Implemented and verified native parallel UX reads through the real Codex client
and resident workflow MCP service. Three successful live trials each returned
eight 28,000-byte pages in one model response. All 224,000 bytes in each trial
matched the saved source pages; no truncation. The final trial used the maintained
launcher and assignment formatter, not an alternative model client.

The live Alexa product was unchanged. The experiment reused immutable facts and
UX inputs from the earlier replay. Authentication remained in the ordinary Codex
client; raw request context, product payloads and generated model catalogs remain
in ignored scratch storage. The proxy was used only to observe diagnostic traffic,
and is absent from the production launcher.

## What changed

- `agents/ux-planner.toml`, `agents/ux-reviewer.toml` and `skills/refine-design/SKILL.md`
  now prescribe one collection wave of known independent reads before comparison
  or review. Native calls must be requested **in parallel, in one model response**.
  Code-mode consumers use `Promise.allSettled` with a combined output budget.
- `scripts/mcp/read-batch.mjs` creates the compact assignment from exact handles,
  known offsets and page budgets. The real-read experiment uses this same function.
  The `workflow_read` tool description now carries the same batching instruction.
- `scripts/codex-native-workflows.mjs` starts a normal Codex session using a derived,
  task-scoped catalog. Only the selected model's native-tool/Lite switches change.
  It preserves the model, other model entries, authentication and approvals, and
  does not edit global configuration or the cached catalog. It places overrides
  inside `exec` where the tested CLI actually applies them.
- `documentation/workflows/mcp.md` documents startup, native and wrapper limits,
  continuation dependencies, and the compact collection protocol. Existing sessions
  retain their startup configuration; the launcher applies to newly started sessions.
- Isolation and measurement helpers now restore captured tool/instruction layers
  independently and match concurrent reads by handle, pointer and offset. Batched
  call materialization cannot measure individual command-generation time; the
  corrected reports retain signed observed intervals and mark those durations
  unavailable instead of reporting negative generation times.

## Results

All comparisons below use Astra/xhigh and the same eight saved 28 KB pages.
Elapsed time includes collection, a completion marker and the final model response.

| Trial                           | Elapsed | Read calls per response | Generation requests | Verified data |
| ------------------------------- | ------: | ----------------------: | ------------------: | ------------: |
| Earlier native serial run       |  73.4 s |                       1 |                  10 |        224 KB |
| Short assignment, first success |  46.4 s |                       8 |                   3 |        224 KB |
| Short assignment, repeat        |  43.6 s |                       8 |                   3 |        224 KB |
| Final launcher + formatter      |  53.7 s |                       8 |                   3 |        224 KB |

The successful observed range is 27–41% shorter than the earlier serial trial.
This small sample is evidence of working batching, not a stable end-to-end UX
speedup estimate. The final run used 174,192 cumulative input tokens versus
498,287 previously (about 65% fewer). Cached input fell from 422,784 to 100,224;
uncached input was similar, so this is **not** a claim of 65% lower credit cost.
Final output was 1,084 tokens. No dollar estimate was inferred.

The final 53.7-second window comprised about 32.0 seconds of observed output-item
streams, 0.25 seconds of tool intervals, and 21.45 seconds unattributed. No separate
reasoning-item stream was observed; that does not mean no reasoning occurred.
Coalesced native-call boundaries cannot reliably allocate the output time among
the eight commands. The final completion marker was stored about 40.9 seconds
after client launch; final response/shutdown added about 12.8 seconds.

Seven small isolation trials restored namespace, actual read schema, actual MCP
execution, full tool catalog, base instructions, both together, and developer/
repository conversation context. All produced eight calls in one response, with
7.5–13.4-second windows. These tests disprove a categorical inability of those
individual layers to batch. They do not prove why every earlier prompt serialized.

## Problems fixed and decisions

1. The local sandbox initially prevented child-process creation. The authorized
   host run resolved that; no permissions or assertions were weakened.
2. The observation proxy initially lacked Windows trusted certificates. Rerunning
   Node with `--use-system-ca` fixed TLS verification; certificate verification
   stayed enabled. That failed attempt made no model generation requests.
3. The first launcher put `-c model_catalog_json=...` before `exec`. The child
   emitted `parallel_tool_calls=false` and serialized all eight calls. Moving the
   override into the subcommand restored `true` and the eight-call batch. A
   focused regression test covers argument placement. Failed evidence is retained.
4. The old analyzer assumed one in-flight read per handle. Concurrent pages share
   a handle, so the match now includes pointer, offset and requested size. All
   exact-byte and time-window checks remain in place.
5. Keep both launch configuration and short collection instructions. A permissive
   flag permits batching but does not force it; a long prompt had serialized even
   with the flag enabled. Successful short assignments were repeated before
   integration. Do not claim one wording change is a universal causal explanation.
6. Avoid permanent global configuration changes, a credential proxy, a new storage
   agent or a model replacement. The documented startup catalog override supplies
   the needed capability for this task. Its internal catalog fields remain
   version-sensitive and must be rechecked after client upgrades.
7. Known first pages can run together. Ordinary follow-on offsets must come from
   `nextOffset`; the fixed offsets in this experiment were checked against saved
   UTF-8 source pages and are not a general pagination algorithm.

## Verification and evidence

- `npm run test:mcp`: 15 passed, including the new catalog/assignment/CLI regression
  cases. Two sandbox process-launch failures disappeared when the same suite ran
  with its required process permissions.
- Four focused native-probe/observer tests passed; request-capture self-test passed.
- The exact-return verifier passed all three successful live runs. Final wire
  evidence confirms native tool exposure, the outgoing parallel flag, one response
  containing eight reads, and overlapping client tool intervals.
- `npm run format:check` and `git diff --check` passed. Broad
  product-schema and full-refinement reruns were unnecessary for this transport
  change and were not run.

[Combined metrics](native-parallel-execution-20260929-metrics.json) retain all
isolation timings and attempted live runs, including failures. The linked per-run
reports contain exact page hashes, runtime evidence and observed request grouping.
`experiments/minimal-parallel/summarize-isolation.mjs` regenerates the combined
summary from retained evidence without making model calls.

The supported catalog startup setting is documented in the
[official Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).
The CLI and catalog-field behavior was additionally checked against the installed
0.155.0-alpha.16.3 client and its matching source. Use the shared workflow guide's
launcher command for subsequent native collection; a running IDE thread cannot
retroactively reload its startup tool configuration.

## Subsequent full UX replay

The [full UX replay](ux-full-native-replay-20260929.md) exercised authoring,
validation, persistence, independent review and repair. Its long combined author
assignment collected the initial 19 pages serially despite the enabled parallel
flag; later author reads batched up to five. The small-test results above remain
valid, but they do not establish reliable batching for the full specialist
workflow. The follow-up report records this integration gap and the much larger
cost of generating complete replacement JSON records.
