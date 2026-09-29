# Direct-mode live request observation: prepared, launch blocked

**The live probe has not run. Automatic approval review rejected its launch before execution because the new localhost observer would forward saved product data and existing authentication credentials to the official Codex endpoint. Explicit authorization for that route is required. No model request or live timing was produced by this attempt.**

## Purpose

Earlier native probes left the model catalog's `tool_mode` at `code_mode_only`, with an exception exposing the workflow MCP namespace directly. Source inspection subsequently established that the model catalog's tool mode takes precedence over feature flags. The client implements `direct`, `code_mode` and `code_mode_only`, with an explicit test that `direct` removes the code execution wrapper even when code-mode feature flags are enabled.

An earlier local-only capture verified the temporary combination `tool_mode: direct` and `use_responses_lite: false`: the same `gpt-6-astra` model at xhigh effort, directly exposed workflow tools, no `exec` wrapper, and `parallel_tool_calls: true`. That capture took 2.780 seconds, forwarded zero requests and executed no model. It proves request construction, not backend batching. Other native tools, including the custom `apply_patch` tool, remain available; this is not a function-only request.

The proposed live probe retains the existing two saved 28,000-byte pages and checks whether both native reads occur in one model response. A localhost WebSocket observer records the actual live request flags and response identities so this run would not rely on the earlier separate capture.

## Prepared tooling

- [Observer](experiments/ux-read-window/live-request-observer.mjs): accepts loopback WebSocket connections and forwards them only to `https://chatgpt.com/backend-api/codex/responses`, the default endpoint identified in the matching client source. Normal TLS certificate verification remains enabled. It changes the upstream Host and declines WebSocket compression; request and response payload bytes are forwarded unchanged.
- The observer records flags, tool names, response/call IDs, message sizes, request hashes, connection status, and its own observation overhead. It does not save authentication headers, prompts, tool arguments, product contents or results. Existing authentication travels through the process in memory. This new credential-handling route is the reason for the explicit authorization requirement.
- [Harness](experiments/ux-collection-phase/run.mjs): opt-in `--observe-live-request` starts the observer for a native probe, sets the child client's endpoint for this run only, and closes the observer afterward. Global configuration is unchanged.
- [Focused tests](experiments/ux-read-window/live-request-observer.test.mjs): two passing checks cover masked and unmasked frames, fragmented messages, chunk boundaries, extended frame lengths, unchanged observed bytes, and exclusion of private contents from metadata. The relay's live network path has not been verified.

Verification used `node --test --test-isolation=none` after the isolated test runner encountered the environment's child-process `EPERM` restriction. Both focused tests passed; source syntax and formatting were checked. This is tooling verification, not a completed performance experiment.

## Authorization boundary and preserved evidence

The attempted live launch used the normal escalation mechanism. Automatic approval review rejected it because the transcript authorized the diagnostic generally but did not explicitly authorize forwarding the sensitive payload through this new route. No workaround or alternate live execution was attempted. The planned attempt directory did not exist after the rejection, confirming the harness had not started.

The concrete proposed command is:

```text
node --use-system-ca planning/refinement-efficiency/experiments/ux-collection-phase/run.mjs --page-bytes=28000 --native-probe --native-read-count=2 --direct-namespace=mcp__polylith_workflows --model-catalog=.codex-tmp/codex-parallel-rule-20260928/catalog-direct-without-lite.private.json --observe-live-request --attempt=native-direct-observed-01
```

The temporary catalog changes only Astra's tool mode from the earlier no-Lite copy; its SHA-256 is `825a4edc8b33ca5e019dff16f53ddd5cfac857df0f1e8abb3c7b79baafd69d49`. The installed binary remains `0.155.0-alpha.16.3`, hash `589f2546cc1e86703da326b00741f8b7a58fd182a1a90499faa0beebf22a24e2`.

Private local capture evidence is in `.codex-tmp/ux-request-capture-20260928/direct-native-pure-01/request-metadata.json`. Matching source snapshots are retained under `.codex-tmp/codex-parallel-rule-20260928/`, from source commit `ffa06df2317e3e65fc74da977a5884710c5382d5`: `core/src/tools/mod.rs`, `core/src/tools/spec_plan_tests.rs`, `protocol/src/openai_models.rs`, and `model-provider-info/src/lib.rs`, under `codex-rs/`.

No global setting, live Alexa data or existing experiment evidence was changed. Native batching remains unresolved until a live probe can be observed.
