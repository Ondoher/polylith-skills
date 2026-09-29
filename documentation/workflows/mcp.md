# Shared workflow MCP service

Use the resident service for mechanical work when `workflow_*` tools are available. Agents supply decisions and changed units; the service resolves references, validates, assembles and saves them through the existing libraries. It does not replace independent UX review, choose design outcomes, translate old schemas or grant new product authority.

## Start and connect

The parent starts one service for an explicit physical workspace:

```text
node <governance-root>/scripts/mcp-server.mjs <workspace> 8759
```

Set `POLYLITH_MCP_TOKEN` to a random secret of at least 32 characters in both the server and MCP client environments. The server binds only to `127.0.0.1`. Its startup receipt contains the parent `access` capability; retain it privately. If the environment token was omitted, the startup receipt also contains a generated connection token. Never forward the complete startup receipt to a specialist.

The client configuration is:

```toml
[mcp_servers.polylith_workflows]
url = "http://127.0.0.1:8759/mcp"
bearer_token_env_var = "POLYLITH_MCP_TOKEN"
```

Use an isolated configuration for trials. Permanent Codex configuration changes follow the existing installer/user-configuration authorization rules. A client must load this configuration before its tools are available; launching the server alone does not add tools to an already running conversation. Multiple clients point to the same URL and share the same process. Do not start a separate server for every agent or run two servers against one workspace state directory.

The service owns `.codex-tmp/mcp-workflows/`. Keep `/.codex-tmp/` Git-ignored before capturing repository baselines, as required by the existing review setup. For an empty project scaffold, start the service in a containing workspace and pass the empty child directory as `project.inspect`/`project.plan`'s `target`.

Run the service in a host process whose permissions cover the authorized workspace. On Windows, background launchers use hidden windows. Stop with Ctrl+C/SIGTERM, or the IPC `stop` message when launched with a Node IPC channel. Shutdown drains accepted work, saves measurements, closes HTTP and terminates its owned worker. Startup and shutdown remain host lifecycle operations; an agent contribution cannot stop a shared service.

## Seven tools

| Tool               | Purpose                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `workflow_open`    | Parent opens a named run with optional `sourcePath` and `currentPath`. Reopening the same run requires the same paths. |
| `workflow_assign`  | Parent grants named operations, input `handles`, exact `readPaths`, optional `outputDirectory`, and domain `scope`.    |
| `workflow_store`   | Save exactly one JSON `value` or assigned JSON `file`. Returns a content-addressed handle.                             |
| `workflow_read`    | Read a handle, optional RFC 6901 `pointer`, and byte `offset`. Follow `nextOffset` until null.                         |
| `workflow_catalog` | List permitted operation names; pass `operation` to obtain that operation's full current input schema.                 |
| `workflow_execute` | Call a curated operation with small `input` arguments and `inputHandles` for larger arguments.                         |
| `workflow_status`  | Inspect the service or an assigned `job`; owner may request `metrics` as a saved result.                               |

All calls require the caller's `access` capability. Run operations also take `run`. Connection authentication does not grant parent authority. Specialists receive only their own assignment capability; do not copy or discover the parent's token. The same operating-system account remains the host trust boundary: these capabilities are workflow restrictions, not isolation from a hostile process with unrestricted access to that account.

An execution returns a small `{handle, sha256, bytes, path, reused}` receipt, not the full result. Read only the needed fields or pages. Pass the handle onward without regenerating JSON. For example:

```json
{
  "access": "<assigned capability>",
  "run": "<run>",
  "operation": "units.deliver",
  "input": {"stage": "ux"},
  "inputHandles": {"records": "<saved records handle>"}
}
```

`inputHandles` maps argument names to saved results. A direct `input` and a handle must not supply the same argument. A downstream consumer receives only the handles the parent assigns to it. Server-held results are immutable snapshots of delivered data, not a claim that source files are still current. Preparation, review and canonical persistence continue checking current source bindings and locks.

Requests are limited to 2 MiB; saved JSON results to 16 MiB. Larger deliveries should use completed authoring units, or an assigned file under the saved-result limit. Reads bound their escaped tool text below 8 KiB and return a continuation instead of truncating it. Call `workflow_catalog` for one operation at a time when inspecting contracts. HTTP responses contain one copy of result text, not duplicate structured and text payloads.

## Parallel input collection

Plan the independent reads once, then collect that wave before design reasoning.
With native tools, explicitly request **all calls in parallel, in one model
response**, each with its own result. This wording and a compact argument list
produced eight real UX reads in one response in the saved Codex trials. Merely
asking for parallel reads in a longer assignment had produced serial calls.
This is a tested prompting pattern, not a guarantee that every model response
will batch; record response grouping when measuring performance.

Give shared `access` once and list `{handle, pointer?, offset, maxBytes}` entries.
`scripts/mcp/read-batch.mjs` supplies the maintained assignment formatter; callers
can use the same short template without invoking a separate planning tool.
Choose only the inputs needed for the task. First pages from independent handles
or pointers can start together. For subsequent pages, use each result's actual
`nextOffset`: escaped-text limits and UTF-8 boundaries can shorten pages, so do
not predict offsets by adding `maxBytes`. Collect the next known continuations
as another wave. Retain successful pages; retry only failed or truncated reads.
Dependent writes, validation and acceptance stay after collection.

`readOnlyHint` describes the operation; it does not enable client/model batching.
For native collection, the client must expose native tools and allow parallel
function calls. The tested Codex build reads both decisions from its model
catalog. Use the task-scoped launcher when starting a native workflow session:

```text
node <governance-root>/scripts/codex-native-workflows.mjs --model=<selected model> --binary=<Codex executable> -- [Codex arguments]
```

It derives a catalog from the current local `models_cache.json`, changes only the
selected model's `tool_mode` to `direct` and `use_responses_lite` to `false`, and
passes the documented `model_catalog_json` startup override to Codex. It leaves
authentication, approvals, the source cache and global configuration untouched.
Use `--prepare-only` to inspect the receipt without launching; `--cache=<path>`
selects an explicit current catalog. Generated catalogs stay in the workspace's
ignored `.codex-tmp/native-workflow-catalogs/`. Missing/changed catalog contracts
are errors. Refresh and recheck after client upgrades; these internal catalog
fields are version-sensitive. No proxy or custom model backend is used by the
launcher. MCP URL/authentication must already be configured normally.

Existing sessions retain their startup configuration. In a code-mode session,
prepare independent calls in one `functions.exec` using `Promise.allSettled`,
inspect every result, and preserve each raw result. The combined wrapper output
still has its own limit: use bounded waves whose **combined** output fits that
limit. Do not combine individually large native pages into an oversized wrapper
or raise client limits silently. Use a newly launched native session when separate
large result allowances are required. Do not label wrapper execution as native
multi-call generation.

For evidence, count calls per model response separately from overlapping tool
intervals. A millisecond read may finish before another starts even within one
prepared batch. Full-return hashes and truncation checks remain necessary.

## Refinement sequence

1. Parent opens a run, using `product.location` where a named product location is needed. `model.persist` handles current model proposals with the existing authority and lock checks. The service does not parse or reinterpret the owner's description.
2. `product.prepare` validates source/model bindings and saves planner facts. `product.select` selects identified records, their references, and all rules/gaps/constraints. Its result explicitly identifies itself as a selection; full facts remain available by handle. Use selected data for an assignment, never as proof of whole-product coverage.
3. Parent calls `units.open` with `stage` and exact `binding`. Existing current documents can be factored with `units.import`. Assign `units.deliver`/`units.read` only with `scope: {stage, recordRefs: ["element:...", "flow:..."]}`. Incremental UX authors instead receive `units.status`, `units.contribute` and `units.finish` with the same ownership scope; see [the contribution contract](../../skills/refine-design/references/ux-contributions.md). These operations preserve durable scratch batches and materialize existing units without model-generated replacement documents. Small receipts also carry `inline` results within the configured response budget, avoiding another model read solely for revisions; larger results retain the normal handle/read path. Supply the context record only to its designated author. Shared record IDs must have one owner at a time.
4. Specialists read assigned inputs, author their bounded units once, then submit by handle or directly. Prefer contributions for UX updates against a saved baseline: save changed meaning in batches and finish through deterministic materialization. Contribution corrections use a new batch ID and the current opaque revisions; complete-unit corrections use the existing prior-digest `repairs` contract. Exact repeats are reusable. `result.store` permits scratch JSON delivery for other assigned outputs, including reviews and assessments. Completed results remain reusable within the run.
5. Parent calls `units.handoff` or `units.assemble`. The existing assembler returns usable siblings and repair notices. Rendering uses the existing UI/design-language inputs and asset checks. Use `background: true` for long operations and poll the returned job with `workflow_status`; do useful independent work between polls.
6. `ux.persist`, `ux-review.subject`, and `ux-review.validate` retain exact persisted source and independent review requirements. `design.apply`, `ui.persist`, and `component.persist` wrap the existing writers; inspect their current options before calling. UI's separate `productDocumentRoot` option is not an option to relocate component artifacts outside their current root contract.
7. `artifact.commit` and `publication.assemble` perform parent-owned canonical persistence. `context.resolve` prepares consumers; `collection.preview`/`collection.publish` consume the structure agent's exact context, outline, weight and page-plan files. The structure agent still owns information hierarchy and page breaks. `technical.inspect`, `technical.prepare`, `technical.resolve`, and `technical.publish` carry current technical evidence and frozen context to the existing publisher.

Schema validation remains inside the current domain functions. Do not synthesize review passes, authorizations or evidence to make a save succeed. Correct only the affected input, retain prior units/results and continue independent work. An operation error is a failed operation, not an instruction to abort the entire skill. Report stale or missing required evidence honestly. Do not automatically retry an uncertain canonical mutation after a worker failure; inspect current state first.

## Other skills and retained host operations

| Work                                               | Service operations                                                                  | Host responsibility                                                                                                                                                                                                                     |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attach detail / product or canonical-standard text | `files.read`, digest-guarded `files.edit`, `result.store`                           | Human decisions, scope and source authority; source files remain human-owned.                                                                                                                                                           |
| Research revision                                  | `research.record`, assigned results                                                 | Research, preservation decisions and external-source attribution.                                                                                                                                                                       |
| Standards normalization / guide                    | `standards.resolve`, `standards.guide`, exact text edits                            | Normalization attestation remains the existing dedicated CLI; writing guide output uses the existing owned guide command.                                                                                                               |
| Review / bootstrap                                 | `repository.snapshot`, `review.request`, `review.validate`, assigned result handles | Lifecycle, eligibility/calibration, instruction loading and independent reviewer dispatch remain under `review-standards`.                                                                                                              |
| Checkpoint / update standards                      | Snapshot and adviser report delivery                                                | Git staging/commit/push stays in the host's approval and credentials boundary with the existing exact-snapshot skill. The service cannot approve a message or publish a branch.                                                         |
| Initialize / create app                            | `project.inspect`, `project.plan`                                                   | Existing dedicated apply/validation workers run in the host for dependency installation, subprocess permissions and progress. Consume saved options; do not generate wrapper scripts or run an install inside a shared request handler. |
| Reset design                                       | `reset.plan`                                                                        | Existing `apply` and stale-lock recovery CLI consumes the reviewed exact plan digest, with the skill's source-preservation rules and host deletion authority.                                                                           |
| Install / uninstall managed packages               | Assigned reports when a service already exists                                      | Existing ownership-aware installer dry-run/apply stays local: it installs/removes the service's own source/dependencies and user configuration, and must work when no service is running.                                               |

These are dedicated existing workers, not a generic service shell runner. Their positive contract checks remain in `test:tooling` and the focused MCP fixture suite. Agent roles stay responsible for semantic work and may submit only assigned reports/proposals. No specialist gains canonical writes, publication, Git, installation or arbitrary command execution through MCP.

## Saved evidence and recovery

Completed results live at `runs/<run>/results/<sha256>.json`; current authoring units and assembly receipts remain in the same run. After restart, reopen the same run paths and issue new assignment capabilities. Known handles resolve from disk and verify their digest. Capabilities and pending jobs are process-local; do not assume an old token or job survived. Canonical writes continue using existing compare-and-swap and product locks.

The service records each operation's queue and execution duration and each HTTP request's bytes, handler time and failure flag. It never logs tokens or data payloads in those measurements. Shutdown writes `metrics-<instance>.json`. These measurements exclude model reasoning, token generation and client scheduling; gather those separately where exposed. Do not call millisecond HTTP timing a whole-refinement performance result.

Verification commands:

```text
npm run test:mcp
npm run test:mcp:fixtures
npm run format:check
```

The initial integration suite emphasizes positive current-schema cases. The planned later comprehensive pass covers the broader adversarial, concurrency, interruption, platform and workload matrix. Existing checks and any defect encountered during migration must still be honored and repaired.
