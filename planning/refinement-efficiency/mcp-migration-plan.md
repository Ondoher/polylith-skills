# MCP migration: self-driven implementation plan

Status: service implementation has not started. Agent-permission preparation and post-restart checks are complete. The owner has specified independent execution while AFK, credit-efficiency and checkpoint rules, and a completion report with decisions.

## Objective

Move the mechanical work used by agents and skills behind a shared localhost MCP service, reusing the current libraries, stored data and generated results. Agents should request useful operations and receive compact results or handles without generating orchestration scripts or reproducing completed artifacts.

Keep the work practical and proportionate, with progress driven by working results. Complete and demonstrate the refinement path first, then finish all remaining in-scope agent and skill integrations across the catalog. The refinement path is the first milestone, not the stopping point. Report verified coverage precisely; an exposed tool or an edited instruction alone does not establish a completed migration.

## Implementation approach

- Reuse the tested HTTP transport and existing domain functions. Keep canonical schemas, validation, storage and independent-review requirements.
- Keep the service interface small. Combine mechanical preparation, reference resolution and assembly where doing so removes agent turns. A service call must not make a product or design decision on an agent's behalf.
- Use existing compatible fixtures and generated data, including work produced during implementation. Preserve completed units and resume from them after fixes.
- Support only current data contracts in permanent code. One-off mutations or conversions of existing development data are allowed to preserve useful work, but keep any conversion helpers in disposable development tooling outside the shipped runtime. Do not add legacy schema readers, compatibility branches or permanent migration APIs. Validate converted results against current contracts and reuse those results; preserve the attended experiment's rollback baseline. Update obsolete fixtures instead of teaching production code their old formats.
- Keep the existing durable store initially; use resident state for cached validated data and shared run context. RAM-only persistence, a new database, schema redesign and module deduplication are separate work.
- Keep a coverage ledger for the 16 agents and 17 skill entry documents. Each entry records its operations, implementation state, instruction state, positive-case evidence and outstanding tasks until they are closed. Keep maintained CLI workers where they serve installation, recovery or long-running operations.

## Agent permissions prepared before restart

All 16 managed agent configurations now use `workspace-write`. Their instructions permit assigned scratch files, proposals, reports and evidence, plus scoped submissions through approved local MCP tools. Parent assignments supply an output directory or service capability; existing role boundaries and parent-owned canonical persistence, publication and Git operations remain in effect. Supporting specialist contracts now reflect this delivery permission.

The installer status check confirmed that the installed agents directory is a live link to this checkout; no reinstall or user-configuration edit was needed. All 16 TOML files were parsed, and model/reasoning settings were preserved. This prepares permissions, not the MCP service or its enforcement. Fresh post-restart agent checks are recorded below; do not repeat them without a permission or configuration change. Reuse saved work throughout.

Post-restart verification is complete: at the owner's request, fresh instances of all 16 roles passed a minimal assigned-file write/read check, and the parent independently verified exact bytes. The complete check window took 180.017 seconds with overlapping agent work. See the [saved results and scope limits](agent-write-check-20260927.md). MCP submissions and service enforcement remain to be verified during implementation.

## Reportable intermediate goals

Each goal should leave a usable result and saved evidence that the next goal can consume. There is no fixed execution time budget; record elapsed time to identify bottlenecks and report progress.

| Goal                                             | Deliverable                                                                                                                        | Positive-case completion evidence                                                                                                                                                                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G1 — Shared service foundation**               | Runnable localhost MCP service, a small operation registry, product/run handles, structured results and request timing.            | Two clients reach the same instance and run context; an actual MCP client discovers and calls an operation. Existing role restrictions remain respected.                                                                                                                  |
| **G2 — Direct retrieval and handoffs**           | Tools for verified product/run preparation and bounded record selection. Server-held results can be passed onward by handle.       | Retrieve a known set of records with its required constraints; compare it with the existing helper result. Reuse the same result without an agent copying its JSON.                                                                                                       |
| **G3 — Proposal delivery and assembly**          | Scoped unit/proposal submission and candidate assembly using `DesignRecords`, `DesignRun` and existing validators.                 | Submit saved compatible UX and UI units, assemble valid candidates, and resubmit an unchanged unit to demonstrate successful reuse. Return compact receipts and output locations.                                                                                         |
| **G4 — Complete the mechanical refinement path** | Review-subject preparation and receipt validation, parent-authorized persistence, and representative preview/publication adapters. | In a disposable product copy, consume matching existing review evidence, commit the appropriate candidate and generate representative output. Compare bindings and meaningful output with the existing path. Fixture review evidence is labeled as such.                  |
| **G5 ? Complete agent and skill integration**    | Connect every applicable agent and skill to actual tool contracts; finish all required operation families and instruction changes. | Representative positive cases pass for every migrated operation family, including a real agent read/delivery through MCP. Every catalog entry is verified or has a justified retained local role. Review the integrated change as one unit and resolve required findings. |
| **G6 ? Verify completion and report**            | Closed coverage ledger, completion report, decision log, raw measurements and checkpoint records.                                  | All agreed migration goals are implemented, connected and verified, with zero outstanding required work. Every completion claim has evidence; the report records results and decisions.                                                                                   |

Dependencies: G2 needs G1; G3 needs run identity and submission contracts; G4 needs assembled candidates; G5 consumes the completed tool contracts. Adjacent adapters and instruction preparation can proceed independently once their contracts are stable. Select the work order using the independent-execution rules below.

## Completion condition

The goal is **no remaining work within the agreed migration scope**. Complete all six goals, finish the applicable operations and instruction connections for all 16 agents and 17 skill entry documents, resolve encountered defects and required review findings, and complete the agreed verification. A retained local bootstrap, recovery or worker operation must have a functional reason and evidence; it cannot be used to relabel unfinished migration work as complete.

Do not stop at a useful subset, a progress report, an estimated elapsed time or a handoff list. Intermediate reports and checkpoints preserve progress while work continues. If a genuine external blocker prevents completion, report it honestly as incomplete and continue all independent work; a blocker does not satisfy the completion condition.

The separately agreed comprehensive testing pass remains outside this run's initial verification scope. Do not defer observed failures or required positive-case verification into that later pass.

## Self-directed work selection

The owner will be AFK during execution. Use best judgment to resolve questions and choose practical approaches within the agreed scope, without waiting for routine clarification or approval of decisions already delegated. Fix ordinary errors, reuse completed work and continue. Investigate suspicious performance measurements and choose whether to adjust the approach; record findings and decisions rather than pausing merely to discuss them. This unattended migration rule does not resume the separately paused Alexa experiment.

Keep a compact decision log alongside the progress ledger. For each material question, record the choice, its reason or supporting evidence, and its effect on scope, behavior or performance. Do not document every trivial implementation choice or create an additional review pass for the log.

Use the current inventory and assessment; do not repeat the repository-wide discovery pass. For each operation family:

1. Locate the existing exported function and its current input/output contract.
2. Add a narrow adapter, using server-owned paths or handles where the function needs files.
3. Run one representative positive case against known data and compare the meaningful result with the existing implementation.
4. Update only the affected instructions and coverage entry, then continue to the next dependent operation.

Resolve routine naming, module placement and adapter details from repository conventions. When an adapter exposes an ordinary defect, fix it and preserve completed results. When a change would require new product semantics, weaker authority checks, a canonical schema redesign or a general infrastructure project, record that boundary and continue independent in-scope work. Changes to the implementation approach must be supported by a concrete obstacle and recorded briefly.

Prioritize the parent preparation and UX/UI data path throughout. After that works, finish publication, technical-context, standards and the other applicable catalog operations, reusing callable implementations. Long-running scaffolding, installation, reset and Git operations need explicit coverage entries; they must not be marked migrated merely because a generic command runner can launch them.

## Testing and review policy for this pass

**Optimize credit use throughout execution.** Batch reviews around larger completed units and keep initial testing focused on representative positive cases. Reuse existing evidence and completed work, keep handoffs and reports compact, and avoid repeated discovery, unnecessary agent calls and repeated checks without a new reason.

The initial emphasis is **positive cases and working integration**. Reuse the existing validators and tests. Do not weaken their current checks, but do not build a new exhaustive test matrix before demonstrating the useful path.

Small changes get local verification appropriate to the change. Reserve the broader review for the integrated G5 result. Do not repeat a repository-wide review, launch the full reviewer set, or rerun every package gate after each adapter or instruction edit. A later full-suite migration is another appropriate unit for a broader review.

Save the more complete pass as a follow-up goal covering:

- malformed inputs, authorization boundaries and path traversal;
- conflicting/stale writes, simultaneous clients and isolation between runs;
- interruption, retries, cancellation, server restart and full rollback;
- configuration upgrades, installer/uninstaller ownership and other supported platforms;
- broad package regressions and representative larger product workloads.

Existing protections remain in effect during the first pass. Encountered failures are investigated and fixed; deferred testing is reported as unverified coverage, not a pass. Prefer targeted regression checks for an observed defect over an unrelated expansion of the suite.

## Checkpoints and commit authority

During execution, use the checkpoint adviser when a larger completed chunk appears to form a reasonable unit of functionality. Its remit is that judgment; it does not introduce a separate startup, comprehensive-review or exhaustive-testing gate.

The owner has preapproved suggested commit messages for these checkpoints. When the adviser recommends a checkpoint, use the suggested message and create the commit without asking for message approval again. Record the commit and its scope in the progress ledger. Milestone completion alone does not require a commit or another adviser call if the work has not formed a useful unit.

## Measurements and milestone reports

Record wall time per goal, tool calls, request/result bytes, server processing spans, available cache/reuse evidence and actual model usage when exposed. Keep model/tool-observed latency separate from HTTP/server timing. Record failures and repair overhead separately. Retain raw measurements for later analysis; do not infer credit savings or reasoning time from missing telemetry.

At each goal, update one compact progress ledger and report:

- what now works and where its evidence/output is saved;
- the positive case that passed and any relevant limitation;
- time used, calls/bytes measured and data reused;
- material decisions made independently and their rationale;
- remaining work or a concrete obstacle;
- the next goal.

Use **pending**, **in progress**, **verified** and **blocked** for goal status. A blocked or incomplete required goal prevents declaring overall completion. Keep operation implementation, instruction connection and verification as separate ledger fields. Reports are progress records, not automatic requests for approval or implicit Git commits.

For performance comparison, reuse the same saved inputs and required information under the same output limits. The first useful success criteria are fewer generated commands, fewer model-mediated handoff turns and less reproduced data with equivalent results. The existing millisecond HTTP measurements do not establish a sub-minute whole-refinement result.

At completion, write `planning/refinement-efficiency/mcp-migration-execution-summary.md`. Include completed goals, implemented/connected/verified coverage, tests and evidence limits, useful performance measurements and unavailable telemetry, data reused, checkpoint commits, and the material decisions made along the way with reasons. Confirm that no required migration work remains. If an external blocker instead forces an interruption, label the document an incomplete progress report rather than a completion report. Build this report from the saved ledger and measurements rather than repeating discovery or tests.

## Operating instructions

Independent execution while the owner is AFK, credit efficiency, review batching, positive-case testing, checkpoint-adviser use, commit-message preapproval, current-contract-only permanent code and the completion report are settled above. Resolve remaining execution choices using best judgment within existing authorization. Prefer the existing isolated configuration and disposable product copies for development verification; preserve the live Alexa state and rollback baseline. Record material choices in the decision log without reopening settled rules.

The paused Alexa refinement, its rollback baseline and its retained UX agent context remain the current starting state. The plan does not schedule a fresh full-product refinement or regeneration merely to test the transport.

Background: [migration assessment](mcp-migration-assessment.md), [catalog inventory](mcp-migration-inventory.json), [HTTP measurements](mcp-http-latency-experiment.md), and [STDIO sharing test](mcp-stdio-sharing-experiment.md).
