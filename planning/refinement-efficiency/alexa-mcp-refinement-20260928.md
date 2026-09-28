# Alexa refinement through MCP: measured full run

Status: **complete**. The full incremental Alexa refinement finished with UX6,
an exact independent passing review, UI4, rendered inspection pages, snapshot 19
and a validated current PRD context. The source and product model 7 were unchanged.
Elapsed time from this request to the refinement client's exit was **2h 9m 12s**;
supervisor evidence export, rollback finalization and checkpoint work followed.
This remains far from the desired interactive performance.

The UI contains 20 scenes and 16 reusable parts. Updated behavior covers independent
video-owned clip copies, future-additions-only library updates, grouped trimming,
and guarded Ungroup. Eleven initial UX units and twenty-five original UI units were
reused. Five product questions, two Ungroup policies and existing partial comp
coverage remain explicit. Final PRD/technical publication was outside this skill.

- [Product report](C:/dev/alexa/product/Alexa/runs/run-20260928-mcp-refinement/run-report.md)
- [Inspection pages](C:/dev/alexa/product/Alexa/inspection/mcp-refinement-20260928/index.html)
- [Machine completion](C:/dev/alexa/product/Alexa/runs/run-20260928-mcp-refinement/completion.json)
- [Sanitized numerical evidence](alexa-mcp-refinement-20260928-metrics.json)

## Starting state and rollback

- Source SHA-256: `5502890f811ef8c74ffc3b03e5e3b6461fdcc05402fe6c5f1a02df100f7f9ffe`.
- Existing snapshot 16/model 7 already incorporate the source edit; verify and reuse
  that work instead of performing it again for measurement.
- New verified baseline: `.codex-tmp/alexa-mcp-refinement-20260928-133745/baseline/manifest.json`.
- Baseline contains 421 files, 18,287,783 bytes. Scope is `product/Alexa`, the
  source description, topic README and linked white papers. Earlier baselines and
  `product/Alexa.sav` remain untouched.
- The disposable restore check restored changed/deleted files, removed a known
  created file and verified exact hashes. Backup capture and checks took about
  3.41 seconds of measured local work. No live rollback has been applied.
- The Alexa checkout started with 871 Git-status entries. Preserve unrelated work;
  record the exact refinement delta before offering rollback. No Alexa commit is
  planned.

## Execution and measurement

One owned localhost service serves the parent and its specialists. A fresh isolated
Codex CLI session loads its MCP configuration; this existing conversation does not
have dynamically added tools. User configuration is unchanged. Agent events and
capabilities remain in ignored private scratch; public evidence contains timing,
sizes, identities and outcomes only.

The supervised parent thread is `01a0e841-289a-7440-a59c-b318dad01e9e`. Agent/model
windows, streamed output, tool intervals, operation queue/execution time and
deterministic substeps are separate overlapping observations. No remainder will be
labeled reasoning, and unavailable measurements stay unknown.

The first client ran from `2026-09-28T13:42:59.250Z` to
`2026-09-28T13:46:36.304Z` (217.070 seconds). It loaded instructions and completed
`product.prepare` in 237.028 ms of server operation time. It was interrupted to fix
the diagnostic configuration, not because the product operation failed. Its facts
result and conversation are retained.

The CLI default omitted the stream diagnostics needed for attribution. The second
attempt resumes the same conversation with targeted `RUST_LOG` filtering for stream
events and tool timing. It started at `2026-09-28T13:47:17.316Z`. Completed work is
reused; the restart gap is measurement administration. See the official
[diagnostics configuration](https://learn.chatgpt.com/docs/config-file/environment-variables#diagnostics).

## Performance results

| Observation                                              | Measured time | Scope                                                                   |
| -------------------------------------------------------- | ------------: | ----------------------------------------------------------------------- |
| Request to refinement client exit                        |     2h 9m 12s | 13:35:20.714–15:44:32.922 UTC                                           |
| Supervisor preparation before first client               |        7m 39s | Instructions, rollback baseline and instrumentation setup               |
| First client, retained work                              |        3m 37s | Interrupted to enable stream diagnostics                                |
| Restart gap                                              |           41s | Same conversation and saved MCP run resumed                             |
| Resumed parent                                           |    1h 57m 16s | Entire resumed workflow; overlaps every specialist                      |
| UX author, three active turns                            |       21m 42s | Initial delivery plus two repairs; excludes 17m 31s idle                |
| First independent review                                 |       12m 24s | Legitimate revise verdict                                               |
| Second independent review                                |       17m 17s | Exact UX6 passed; full thread window                                    |
| UI author, four active turns                             |       22m 20s | Preparation, composition and two metadata repairs; excludes 35m 8s idle |
| UI writer defect investigation through resumed rendering |       10m 51s | 15:14:52–15:25:43 progress boundaries, including diagnosis and tests    |
| Final report stage to client exit                        |       11m 33s | Includes final context/protection checks, inventory and handoff         |

Specialist rows overlap parent work and each other; do not sum this table. Review6's
product-side instruction-to-delivery measurement is 16m24s, a narrower window than
the 17m17s thread lifetime. Both are retained with their boundaries.

The resumed parent's observed interval breakdown is **27m24s output streams,
21m48s reasoning-item streams, 17m41s tool intervals, and 50m23s unattributed**.
About 12m of those tool intervals were calls identified as wait-related. These
labels describe telemetry, not a separation of valuable decisions from mechanical
work. Idle gaps are excluded from the specialist active-turn fields in the JSON.

Both service instances together recorded **50 domain operations / 6.761 seconds**
of operation execution. The resumed instance's median operation was **28.93 ms**;
its slowest was artifact assembly at **3.480 seconds**. All **677 HTTP/MCP requests**,
including polling and discovery, totaled **7.992 seconds** of server handling.
They carried **1,344,942 request bytes** and **3,412,011 response bytes**. This is
server-side handling, not isolated network latency or the complete tool round trip.
The two failed operation statuses were the expected rejection of a revise review
at a pass gate and the diagnosed UI persistence defect.

Other measured local work: combined rendering **986.582 ms**, repeat render
**951.248 ms**, 41-page browser capture **20.725 s**, detached context validation
**49.451 ms**, and the post-repair contract-suite process **49.774 s**. These are
contained within the larger agent windows, not extra elapsed time to add.

Per-response token usage is preserved for the parent, specialists and supervisor,
alongside the CLI's separately reported turn counters. Those scopes do not reconcile
exactly, so they are not combined into a billing estimate. Cached tokens are a
subset of input; reasoning tokens must not be added again to output. Credits and
provider-side computation timings remain unknown. Supervisor metadata is captured
through 15:45:35 UTC, including observation and waits; final export/checkpoint work
after that boundary is additional administration. Raw logs and changing phase-file
history remain in ignored scratch; the tracked JSON contains timing metadata only.

## What this run measures

This is a complete incremental refinement of the edited Alexa description, starting
with already-current snapshot 16/model 7. It is not a cold parse or a controlled
before/after benchmark. The old 72-minute run had different work and defects;
subtracting its duration from this run would not establish an MCP speedup.

The supervisor, CLI parent and specialists overlap. Specialist lifetime includes
idle time between assignments; active-turn duration excludes those gaps. Output
streams include generated commands, data, messages and meaningful design content.
Reasoning-item timing does not isolate semantic reasoning, and unattributed time
includes processing, scheduling, waits and unobserved boundaries. Backend operation
time is neither the entire tool round trip nor the entire agent stage.

## Observed findings and follow-up candidates

1. **Review scope is a large serial cost.** The initial independent UX review took
   744.026 seconds and required a correction. The second took 1,037.126 seconds
   after a localized Ungroup repair. Consider reviewing the changed records and
   their demonstrated reach while retaining unchanged review evidence. This is a
   proposed optimization; no review requirement was weakened in this run.
2. **Generated output remains expensive.** One UX generated tool-call stream took
   94.861 seconds to emit 17,539 argument bytes; its following tool interval was
   0.090 seconds. One parent assignment took 26.937 seconds to emit 4,896 bytes.
   These are output-generation observations, not data-transfer measurements.
   Prepared operations and compact changes are candidates; a semantic versus
   bookkeeping split is not measurable from these observations alone.
3. **Late contract corrections add agent round trips.** UI assembly/persistence
   exposed canonical-JSON versus file-byte hash confusion and unsupported action
   references in depiction metadata. Deliveries were repaired in place. Earlier
   contract validation and script-supplied bindings could prevent these cycles.
4. **Orchestration and diagnosis have their own cost.** Initial supervisor setup
   took 458.536 seconds before the first client launch, despite the baseline and
   restore checks taking only about 3.41 seconds of local execution. The first
   client required a diagnostic restart. Parent inspection, instructions,
   assignments, repair work and final reporting must remain visible in totals.

These findings support investigating work scope and generated output before
optimizing localhost transport. They do not prove that all unattributed time is
mechanical work or that a particular future optimization will meet a time target.

## Repairs and decisions

- Reused the current source/model, existing UX/UI units and completed deliveries.
  The independent reviewer found a real missing Ungroup rule, so the author
  repaired it and obtained a new exact-bound pass.
- Eligible ungrouped parts retain their own settings, timing and gaps. Unresolved
  group-level adjustment transfer and overlapping placement remain explicit
  limitations; unsupported Ungroup operations leave the group and draft intact.
- Preserved the existing foundations and documented partial-comp coverage.
- Fixed the bounded reader's installed-directory-link entrypoint bug. Previously
  the linked invocation exited successfully with empty output. The regression
  reproduced that failure; all seven focused reader tests passed after the fix.
  Paging limits and continuation behavior are unchanged.
- Corrected a diagnostic check that counted a historical answered-question link
  as an active gap. The prepared artifact scope itself required no change.
- Corrected unsupported outside-click dismissal in three new UI menu states.
- Fixed the UI writer's rejection of a valid replacement bound to new dependencies.
  Explicit exact prior dependencies now validate existing ownership; the incoming
  design still requires current dependencies and a passing review. Schema, identity,
  path confinement and lock checks remain strict. No legacy-schema support was added.
- The resident MCP server had cached the old module. The repaired retained CLI
  performed the first UI write; the original service then replayed it unchanged.
  Thus this was not an exclusively MCP-executed repair or a clean transport benchmark.

## Verification and checkpoint

Post-repair suites passed 153 fast and 88 design tests. Focused checks passed seven
bounded-reader tests, twenty-two UI tests, one MCP confinement regression and
twenty-six HTML tests; these overlap the suites and are not additive unique totals.
The renderer produced 52 byte-identical files on repetition. Browser checks covered
41 pages, with twenty screenshots inspected and no horizontal overflow or broken
images. Source/white-paper protection checks passed. Independent supervisor hashing
matched all fourteen recorded artifacts/packages, and the completion has no workflow
blockers. Five open product questions and partial UI coverage are not hidden.

The checkpoint adviser recommended the completed fixes as a reasonable functional
unit, with the owner's standing preapproval, under the message
`Support validated UI replacement across dependency revisions`. The checkpoint
includes this report and sanitized metrics. No Alexa commit or push was made.

## Rollback usage

The frozen end state contains **612 files**. The verified rollback plan covers
**196 changed paths: five existing files and 191 created files, with no deletions**.
The description and linked white paper remain byte-identical. The guarded helper is
`.codex-tmp/alexa-mcp-refinement-20260928-133745/rollback.py`. After the end state is
frozen, `--plan` checks the exact live inventory and prints a read-only plan.
`--apply` restores the baseline and removes only files created by this run. Both
refuse if subsequent owner edits changed the frozen state. The helper was tested
on a disposable copy, including preservation of later edits; no live rollback is
performed as part of completion. Keep this local scratch directory until rollback
is no longer needed; it contains the actual backup, not only metadata.

```powershell
python -X utf8 C:/dev/polylith-skills/.codex-tmp/alexa-mcp-refinement-20260928-133745/rollback.py --plan
python -X utf8 C:/dev/polylith-skills/.codex-tmp/alexa-mcp-refinement-20260928-133745/rollback.py --apply
```
