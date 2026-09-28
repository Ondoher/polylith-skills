# MCP migration execution summary

The agreed migration is complete: all six goals are verified, all 16 agents and 17 skill entries are connected, and no required implementation or initial-verification work remains. The shared localhost service provides seven MCP tools, 36 executable domain operations and one result-submission permission. The separately agreed comprehensive testing pass remains future work.

This implements and verifies a direct mechanical path. It does **not** establish a sub-minute full refinement or a measured end-to-end speedup. The live specialist test still spent almost two minutes in its overall agent window.

The subsequent [complete reversible Alexa refinement](alexa-mcp-refinement-20260928.md)
records the full live workflow, encountered repairs, rollback protection and
[granular timing evidence](alexa-mcp-refinement-20260928-metrics.json). It completed
in 2h 9m 12s through the refinement client's exit; it is not a controlled comparison
with the earlier partial runs.

## Completed work

| Goal                      | Result and evidence                                                                                                                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1: shared service        | Authenticated loopback HTTP, shared run context, capability-scoped access, operation registry and measured requests. Two real HTTP clients share one instance.                                                                                                             |
| G2: retrieval and handoff | Content-addressed durable results, selected/bounded reads, explicit continuation and server-side `inputHandles`. Current planner output matches the existing helper. Selected facts retain rules, gaps and referenced records.                                             |
| G3: delivery and assembly | Assigned UX/UI units enter the existing `DesignRecords`/`DesignRun` path. Exact resubmissions report reuse. Both reconstructed candidates match the original current fixtures and pass their validators.                                                                   |
| G4: refinement mechanics  | Existing source/model checks, exact independent-review binding, canonical writers, publication assembly, product collection output, technical preparation and frozen technical publication run through curated adapters. Synthetic review evidence is explicitly labeled.  |
| G5: integration           | All 33 catalog entries point to the actual protocol. All 36 executable operations have positive-case evidence. A real UX agent reads and submits through MCP, then its parent retrieves the saved result. The independent system assessment's required findings are fixed. |
| G6: completion            | Closed coverage ledger, saved raw measurements, decision log, review resolution, operational documentation and preauthorized checkpoints.                                                                                                                                  |

The entry point is `scripts/mcp-server.mjs`; [operation and setup instructions](../../documentation/workflows/mcp.md) describe the parent/agent protocol. The service wraps current libraries rather than introducing new canonical schemas, compatibility readers or a second database. Synchronous engines execute in an owned worker so they do not block HTTP/status handling. Successful results and authoring units remain reusable during the run and after reopening a saved run.

[Coverage](mcp-migration-coverage.json) lists every operation, agent and skill, along with its evidence and any intentionally retained host role. [The progress ledger](mcp-migration-progress.json) records decisions and checkpoints.

## Verification

- **10 MCP integration cases passed** in **7.023 seconds** in the final run. These exercise all 36 executable operations, plus shared clients, scoped delivery, bounded Unicode reads, unchanged-unit reuse, exact persistence and shutdown admission/draining.
- **14 affected fixture/regression cases passed** in **8.788 seconds**, including the extracted fixtures and installed-link fingerprint regression.
- **6 retained-host positive cases passed** in **3.443 seconds**: scaffold application, normalization attestation, reset/recovery, installation and ownership-aware unlink.
- All **17 skill entry documents** pass the skill creator's validator. All **16 agent TOML definitions** parse with the expected write setting and MCP delivery instructions; existing model/reasoning settings were retained.
- The real specialist delivery proof passed using isolated configuration. Earlier successful assigned-file permission checks for all 16 roles were reused; only UX received a new live MCP trial.
- Repository-wide Prettier and staged-diff checks pass at the checkpoints. No broad new adversarial matrix or full product benchmark was run.

The [system assessment](mcp-migration-review.md) is an independent functional assessment, not a standards-compliance verdict. It found two required issues: accepting work during shutdown, and passing absolute custom paths to the relative-path guide engine. Admission now closes before draining accepted requests/jobs; cleanup also runs if measurement persistence fails. The guide adapter confines paths and supplies the engine's expected relative labels. Focused regressions cover both findings.

The actual review adapter also exposed an existing fingerprinting defect: installed documentation links worked, but installed agent and individual skill links were rejected. The helper now recognizes those installed namespace roots while retaining file confinement. No unrelated links or legacy data conversions were added.

## Performance evidence

The [final local trace](mcp-migration-metrics.json) preserves per-request bytes, HTTP handling durations and queued/executed operation durations. It contains **80 HTTP requests** and **50 operation executions**, including the lifecycle fixture and repeated reuse cases. Requests total about **215 KB** and responses about **83 KB**. Saved result files are separate from response bytes; these totals are not model token counts. A [failed fixture attempt](mcp-migration-metrics-repair.json) is retained as repair evidence and is not counted as a passing run.

The local suite's slowest families were design-language generation, technical repository inspection, technical publication and review preparation. These use existing renderers, Git inspection or formatter subprocesses. They were sub-second operations in this small fixture set; that result does not predict larger-product rendering time.

The [live specialist trace](mcp-migration-live-metrics.json) records:

| Measurement                                          |                Observed |
| ---------------------------------------------------- | ----------------------: |
| Service process startup                              |              119.314 ms |
| Whole agent window                                   |               119.399 s |
| HTTP requests, including discovery and fixture setup |                      14 |
| Combined HTTP handler time                           |               28.995 ms |
| Parent-observed read tool intervals                  | 38.681 ms and 15.059 ms |
| Saved specialist result                              |                93 bytes |
| Parent wait calls                                    |                       7 |
| Client-reported input tokens                         |                 227,859 |
| Client-reported cached input tokens                  |                 201,472 |
| Client-reported output tokens                        |                   1,184 |
| Client-reported reasoning-output tokens              |                     200 |

The token fields are the CLI's exposed usage, not a complete account of this implementation session or a calculated credit charge. The parent tool intervals do not include every nested-agent interval. HTTP handler durations, tool durations and the agent window overlap and must not be added together.

The live result confirms direct shared delivery and shows that HTTP handling is small in this trial. The remainder is not identified as reasoning: it includes startup, required instruction loading, model output, scheduling and repeated parent coordination. Future tuning should reduce that work and measure it separately. No additional paid baseline was run merely to claim a speedup.

## Decisions made while working independently

1. Keep durable current-schema data and use resident caching/handles. This avoids re-emitting saved JSON while preserving reuse and inspection after a restart.
2. Use parent-issued capabilities rather than caller-selected role labels. Specialists can access only assigned handles/files and named operations; UX/UI unit delivery additionally checks stage and record ownership. Canonical persistence remains parent-owned.
3. Keep dependency installation, Git mutations, reset application/recovery and ownership-aware installer/uninstaller execution in their dedicated host workers. These require host permissions, credentials, lifecycle or deletion authority and must work when the service is absent. They are documented and positively checked, not hidden behind a generic shell launcher.
4. Extract and reuse existing synthetic fixtures rather than regenerate product data. Preserve original validators, evidence bindings and source ownership.
5. Use isolated client configuration for the live proof, as the plan specified. Permanent user MCP configuration was not changed. The documented server/client activation is an operational choice; starting a server does not add tools to an already running conversation.
6. Limit independent review to the integrated system assessment and checkpoint advice. Fix observed defects immediately and retain the broader adversarial/platform/concurrency matrix for the separately agreed testing pass.

Remaining verification limits include large workloads, memory retention over long service lifetimes, cross-platform lifecycle behavior, overlapping assignments, adversarial filesystem races and the full restart/rollback matrix. No known required fix from this migration is being deferred into that list.

## Preserved state and checkpoints

Alexa was not reprocessed. Read-only verification still found description SHA-256 `5502890f811ef8c74ffc3b03e5e3b6461fdcc05402fe6c5f1a02df100f7f9ffe` and snapshot **16**, SHA-256 `94bda6f2747f45cb02ac2718cc0d6b4a94d4f0017e829bf46926d5033d8ed0a4`. The attended experiment and its rollback baseline remain available.

The adviser recommended and the parent created `04ed471` — **Add shared workflow MCP service**. The final integration/report checkpoint contains this document; its commit is reported in the completion response and identified by its subject in the progress ledger. Commit messages were preauthorized. Nothing was pushed.

Execution began at `2026-09-28T02:51:36.630658Z`. The final elapsed execution window and completion timestamp are recorded in the progress ledger; goal work overlapped, so per-goal dates are milestone observations rather than independent additive stage timings.
