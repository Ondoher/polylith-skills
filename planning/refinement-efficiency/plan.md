# Refinement efficiency: autonomous execution plan

Current proposal: [self-driven MCP migration plan](mcp-migration-plan.md).
Six reportable goals organize the work: shared service, direct
retrieval, delivery/assembly, integrated refinement, agent/skill connection, and
evidence/reporting. Optimize credit use: start with positive cases, review larger completed
units, and defer the comprehensive test pass. During execution, use the checkpoint adviser
for reasonable units of functionality; the owner has preapproved suggested commit messages.
During execution the owner will be AFK: resolve questions independently using best
judgment, record material decisions and their reasons, and include them with results,
performance measurements in the completion report. Finish the entire agreed migration
scope with no required work remaining; intermediate checkpoints and reports are not
stopping points.
Service implementation has not started, and the attended Alexa refinement remains paused.
The separately authorized permission preparation is complete: all 16 managed agents now
allow scoped file/MCP result delivery, with `workspace-write` defaults and healthy live
installation links. See the migration plan for verification and restart notes.
After the VS Code restart, all 16 fresh role instances passed the owner's requested
[live file write/read check](agent-write-check-20260927.md). The parent verified exact
bytes; MCP service operations remain untested until implementation.

Assessment only: [MCP migration effort and scope](mcp-migration-assessment.md).
The owner expects practical, proportionate execution without a fixed time budget.
The previous engineering-day estimates are withdrawn. Reuse the existing server probe and domain modules, prioritize
working refinement preparation and UX/UI handoffs, and track verified coverage across
the full catalog. The inventory covers 16 agents, 17 skill entry documents and 134 runtime
modules. No migration has started; the attended refinement remains paused.

Latest transport experiment: [localhost HTTP MCP round-trip measurements](mcp-http-latency-experiment.md).
Direct requests took about 3–5 ms median with connection reuse, including a 58,388-byte
payload case. Five real Codex calls took 4.85–6.99 ms each inside a 30.592-second
agent sequence; most time was outside the observed tool intervals. Reusable probe
source and all samples are saved. No storage integration was installed; refinement
remains paused below.

Latest storage experiment: [STDIO MCP instance sharing](mcp-stdio-sharing-experiment.md).
An isolated test with the installed Codex runtime gave the parent and two child
agents three distinct resident server processes. Each retained its own RAM markers;
one child retained its process across a follow-up turn, but no markers crossed
agents. A common store requires an explicit shared backend. The 68.027-second test
and raw observations are saved; no shared service was installed and the attended
refinement remains paused below.

Latest pause: [segment 05 product-fact retrieval](attended-run-20260927-segment-05.md).
The same UX agent finished its remaining instruction reads, then spent 41.713 seconds
retrieving 58,388 bytes of compact product facts and a manifest through eight bounded
reads. It was interrupted 70.998 seconds into product work without a saved proposal.
Model 7 and canonical Alexa data are unchanged. Preserve loaded facts and flow-read
progress; discuss retrieval round trips before continuing.

Previous continuation: the owner authorized resuming the attended experiment after
deferring startup optimizations and the [specialist coordination tradeoff](attended-run-20260927-segment-04.md#deferred-question-specialist-agents-versus-coordination-cost).
Reuse model 7, the existing UX author and saved inputs. Correct ordinary errors and
continue; stop on a new performance concern during actual refinement work. Do not
repeat completed setup or implement the deferred architecture ideas now.

Earlier pause: [segment 04 parent preparation](attended-run-20260927-segment-04.md).
Model 7 is persisted and validated. A 423.351-second preparation window before UX
dispatch was dominated by generated commands/scripts and reasoning-item streams;
the local persistence/validation took 329 ms. UX is interrupted before delivery,
with all imported units and input files retained. Discuss reusable parent execution
before continuing; ordinary errors are fixed without pausing.

Deferred optimization: [prepared agent reserve](attended-run-20260927-segment-04.md#deferred-optimization-prepared-agent-reserve).
Keep fresh agents with instructions already loaded available before a refinement
request, then prepare replacements after the skill completes. The owner chose to
save this idea for later. It could move startup outside request latency; it does
not remove preparation cost. No reserve has been implemented or measured.

Deferred optimization: [prepared product-model refinement agent](attended-run-20260927-segment-04.md#deferred-optimization-prepared-product-model-refinement-agent).
Assign product-model interpretation and proposal delivery to a waiting agent with
update contracts already loaded, using a reusable assembly helper and file-path
handoffs. The owner requested recording this candidate for later; its net benefit
has not been measured and no role or workflow implementation has started.

Earlier execution: [segment 03 baseline and model discovery](attended-run-20260927-segment-03.md).
The 418-file baseline is captured and restore-tested; current-model validation took
116 ms. A diagnostic buffer-index output error is corrected. The owner directed
that ordinary errors be fixed and execution continue. Resume from saved data;
pause only for a new suspected performance bottleneck. No Alexa mutation yet.

Deferred optimization: [segment 02, instruction-loading cost](attended-run-20260927-segment-02.md).
The bounded reader delivered the complete 52,876-byte skill in seven pages without
truncation, but preparation consumed 62 seconds before Alexa processing. All
measured command durations and coverage are saved. The owner chose to defer this
optimization and continue downstream. Reuse the completed read and stop on the
next new suspicious performance measurement.

Earlier execution: [attended Alexa run, first diagnostic pause](attended-run-20260927.md).
The owner authorized starting after updating the description. Instruction discovery
exceeded the outer tool response budget and truncated input, triggering the first
pause. At that boundary no design agents, product writes, baseline backup,
or restore verification had run. The authorized [bounded reader](bounded-reader-validation.md)
is now implemented: exact local reconstruction stayed within every page budget,
and the package fast gate passed 152 tests. Later segments above record resumption.

Current discussion: [proposed diagnostic-run rules](diagnostic-run-rules.md).
The next modest Alexa edit will be an attended investigation across the complete
refinement. Pause when a potential inefficiency is identified and discuss the next
step with the owner; proving its root cause first is unnecessary. Preserve resumable
work and every collected performance measurement, including successful operations,
for later holistic analysis. Capture a restorable pre-run product baseline and
freeze the edited description separately so the same change can be rerun. Keep
attempt outputs and measurements outside rollback, and distinguish reruns from
resuming saved work. Timing thresholds remain proposed. Starting was subsequently
authorized; the current execution entry above records the pause awaiting discussion.

Latest count: [action reuse in the actual full run](full-run-action-reuse.md).
The frozen multitrack UX has 79 action definitions and 132 frame placements;
21 actions occur in multiple frames. Separately, 50 actions were unchanged from
the run's reconciled baseline, 18 changed and 11 were added. These are existing
reuse counts, not additional dictionary savings or timing measurements.

Latest experiment: [shared text with 40 actions](shared-text-large-trial.md).
Ten times the prior action count produced exactly equivalent output with 19%
fewer non-reasoning writing tokens and 15% less time after complete input delivery
(348.274 versus 294.689 seconds). Two truncated reads per author exposed a separate
input-delivery problem; tool-string escaping also differed. Retain selective reuse
as a candidate, with these caveats, rather than generalizing the small trial's weak
result. No production rollout occurred.

Earlier experiment: [shared-text authoring](shared-text-authoring-trial.md).
Four saved actions authored with a text dictionary were 11.7% smaller, but only
3.4% fewer non-reasoning writing tokens; extra reasoning slightly increased total
output tokens. Delivery fell from 48.876 to 47.439 seconds, too small a difference
in one pair to establish a practical speedup. Both outputs passed without repair.
That small trial alone did not support rollout; the larger result above supplies
additional evidence. Retain the stronger compact-structure result as well.

Latest evidence: [exact repetition](repetition-evaluation.md). In saved UX, 50 of
79 actions repeat identical purpose/outcome/interaction text, and an offline
shared-text representation saves 17.4% of minified UX bytes. UI long text offers
negligible savings; structural reuse needs separate evaluation. These are size
results, not authoring-time measurements, and overlap earlier compacting results.

Latest assessment: [reduced data passing](reduced-data-passing-evaluation.md).
Lossless offline packing of current saved records reduced UX bytes by 10.2% and
UI bytes by 7.3%; these are size measurements, not authoring-speed results.
Action/frame catalogs and UI parts hold most of the data. Expand compact authoring
through explicit type-specific mappings; the evaluation made no production changes
and remains separate from proposed monitoring/interruption work.

Latest completed test: [direct JSON versus compact authoring](authoring-format-comparison.md).
Matched authors produced exactly equivalent flows; compact rows plus scripted
expansion reduced file-ready time from 67.833 to 40.759 seconds and writing-response
output from 1,895 to 1,016 tokens. Expansion took 1.522 ms, with no author repairs.
This single pair supports a narrow compact authoring contract; production adoption
and full-refinement performance remain unverified.

Owner follow-up: retain this measured gain as part of cumulative optimization.
The [scaling assessment](authoring-format-comparison.md#scaling-and-cumulative-improvements)
records expected roughly linear growth, the limits of applying stage savings to
the whole run, and opportunities to reduce repeated authoring beyond formatting.
Those opportunities remain unmeasured; preserve the current results as evidence
when choosing and assessing subsequent improvements.

Earlier investigation: [runtime performance diagnosis](performance-diagnosis.md).
Existing records identified output generation as the main cost in the packet
trial, substantial UI reasoning in the real design run, and a long uncompleted
UX message before interruption. No new paid trial or model-setting change was
needed. This supported investigating smaller authored output with durable unit
delivery. The next actual refinement will test where time goes across the whole
process under the proposed diagnostic rules above, without assuming output size
explains every delay.

Current discussion: [streaming assembly notes](streaming-assembly-notes.md) capture
the proposed parallel assembler, smallest useful packets, partial delivery and
forward references. The later authorized [bounded experiment](packet-assembly-experiment.md)
preserved meaning but did not establish a speedup. Granular timing is implemented
and locally verified; a production assembly-agent role remains unselected.

Owner performance target, 2026-09-27: `refine-design` should complete well under
one minute, ideally allowing a conversation change to update the description
and flow through refinement immediately. This is an engineering target, not a
measured capability. Measure small conversational changes and full initial
processing separately without silently narrowing the owner's overall ambition.
Direct file delivery removes duplicate transcription but does not establish that
reasoning is already fast. Prioritize evidence separating authoring/delivery,
review, tool execution and orchestration, then remove unnecessary whole-product
work from local changes. See the [performance-target assessment](performance-findings.md#interactive-refinement-target).

Current owner direction, 2026-09-27: this is greenfield development. Maintain only
the current artifact schemas; automated backward compatibility and migration are
not deliverables. One-off mutations or conversions to preserve development work
are allowed. Keep their helpers disposable and outside shipped runtime code;
validate the converted results against current contracts and reuse them. Do not
add legacy readers, compatibility branches or permanent migration APIs. Update
obsolete fixtures rather than expanding ordinary loaders/writers, and preserve
the attended experiment's rollback baseline.
The owner intends a full reprocess of the Alexa product description. When that
rebuild is requested, generate fresh current-schema artifacts from the human-owned
description without importing prior derived design. Reuse valid data produced
during that new run. This direction records the intended rebuild; it does not
start a reset now. Older migration and repair follow-ups below are historical
where they conflict with this decision.

Current completion: [native flow model migration](canonical-flow-migration-summary.md), following the [autonomous migration plan](canonical-flow-migration.md). The previous execution was the [single-pass UX/UI autonomous plan](single-pass-execution-plan.md),
authorized 2026-09-27 for self-directed implementation, measurement, reuse, and
adviser-triggered checkpoints with preapproved messages. This document retains
the previous efficiency work and the route into that next implementation.

Status, 2026-09-26: the initial implementation and subsequent package-test repairs
are delivered. Checkpoint advice has been separated from standards-review gates.
The first authorized live Alexa refinement took **101.80 minutes**, through a
validated partial design context, without running `generate-prd`. This exposes
substantial remaining authoring, handoff, and review costs; no speedup or credit
saving has been established. See the [performance findings and proposed fixes](performance-findings.md)
for the complete issue register, evidence limits, priorities, and low-cost checks.
Earlier execution entries below are historical, not the current status.
The owner's subsequent PF-01 proposal centers UX on major interface elements,
each with named flows and linear steps. Steps reference supporting or reusable
elements; errors are alternate flows. See the [candidate UX model](performance-findings.md#pf-01-ux-decisions-expanded-manually-into-a-large-canonical-document)
and [industry-practice research](ux-flow-model-research.md). The owner requested
that research before settling the model; schema and consumer migration remain
future implementation work.
The [UX information and documentation synthesis](ux-documentation-synthesis.md)
captures the imported references and the owner's subsequent requirement for
publication-neutral input. It distinguishes product relationships from document
placement and provides the background for the concrete method below.
The owner's next direction is the [single-pass UX/UI production method](single-pass-ux-ui.md):
assume parsing and the facts-to-UX handoff are satisfactory; focus on one authoring
pass per design agent, optional linear reconciliation, mechanical assembly,
overlap through independently reviewed batches, compact file-based transfers,
and sufficient retained meaning for product and
later technical documentation. The method is documented, not yet implemented.
This narrows the next work to the design stages; earlier interpretation changes
below describe the previous implementation and are not an instruction to reopen it.
This work takes priority over further product-document format refinement.
The owner expects to be AFK, delegates routine decisions to the assistant's
judgment, and wants credit use minimized. Progress does not depend on answers
to optional questions. This plan does not initiate a background job.

## Outcome and scope

Make the initial `refine-design` cycle avoid repeated interpretation and
unnecessary regeneration while retaining product coverage, useful UX/UI,
independent UX review, exact provenance, stable identities, and locks.

Deliver a coherent repository change, local verification evidence, a concise
decision/progress record, and lightweight measurement for future normal use.
Do not promise a measured speedup without comparable run evidence.

Work in this repository on refinement instructions, specialist input contracts,
small assembly/orchestration helpers, relevant fixtures/tests, and user guides.
Retain existing canonical artifact formats wherever possible. PF-01 now evaluates
a simpler UX model with coordinated consumer changes as an alternative to
preserving the current graph structure. No migration has been selected or applied. Keep document
layout work, model/provider comparisons, new agent roles, architecture planning,
and unrelated renderer improvements out of the implementation scope.

The [publication design](../product-publication/document-design.md) remains the
saved baseline. Its object-owned use cases may include supporting dialogs.
Reader hierarchy and page breaks remain the document-structure agent's job.
Do not re-create that organization in refinement to make the initial pass look
complete. The [resilience requirement](../product-publication/resilience.md)
remains in force as a design requirement; this work must distinguish reported
gaps from successfully validated design rather than bypassing a failed gate.

## Evidence already available

| Current behavior                                                                                                                                                                                                                                           | Consequence and response                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Product-model contract](../../skills/refine-design/references/product-model.md) calls for one interpretation and structured downstream inputs, while [UX inputs](../../skills/refine-design/references/ux-design.md) require the entire description again | Reconcile the instructions and supply UX with complete structured product authority plus relevant source evidence                                                |
| [Description contract](../../skills/refine-design/references/product-description.md) requires full prose synthesis and incorporation of selected decisions                                                                                                 | Collect decisions and perform one coordinated writeback before review, rather than editorial updates between dependent stages                                    |
| [UX review](../../skills/refine-design/references/ux-review.md) binds exact description and UX bytes                                                                                                                                                       | Finish formatting and authoritative bindings before requesting review; any later source change still invalidates the receipt                                     |
| [Composable handoff helpers](../../skills/refine-design/scripts/composable-handoff.mjs) gather use-case dependencies and identify affected cases                                                                                                           | Reuse or adapt their graph traversal rather than introducing a second semantic parser; they are currently implementation handoffs, not ready-made planner inputs |
| Model material digests and [impact assessment](../../skills/refine-design/scripts/refinement-impact.mjs) already distinguish material changes                                                                                                              | Preserve unaffected decisions and identify actual dependencies instead of treating every revision as a full redesign                                             |
| [Publication producer](../../skills/refine-design/references/product-publication.md) packages each artifact in dependency order                                                                                                                            | Automate mechanical coordination while preserving exact validation and serial snapshot commits                                                                   |

These are process/code findings, not timing measurements. Do not re-run the
old pipeline merely to manufacture a baseline. Reuse existing evidence when
its input, scope, and provenance are actually comparable.

## Decisions to make without waiting for the owner

| Question encountered                                     | Default decision                                                                                                                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Several plausible implementation approaches              | Choose the smallest reversible change using existing contracts/helpers; record the reason and practical limitation                                                                         |
| Whether a whole document needs rereading                 | Interpretation consumes the complete human input once; later design uses structured authority and retrieves source evidence as needed. Independent review still checks the original intent |
| Whether two claims mean the same thing                   | Retain explicit identities and provenance; use bounded semantic reconciliation for ambiguity. Do not guess equality from wording, headings, or hashes                                      |
| Missing product decision or conflicting evidence         | Record a gap or repair need and continue independent work; do not manufacture accepted behavior or a passing review                                                                        |
| Whether to reorganize product prose                      | Consolidate authorized decisions and format once before review. Avoid cosmetic restructuring that has no effect on the requested refinement                                                |
| Whether to run another specialist                        | Default to no additional consultation. Use an existing named role only for a bounded unresolved question that materially affects the result                                                |
| Whether a failure requires a full restart                | Resume the smallest affected stage from saved inputs; revalidate its dependencies. Preserve unrelated content                                                                              |
| Whether to add a dependency or change a canonical schema | Prefer existing tools and current formats. If unavoidable, isolate and document the need rather than expanding this work into a migration or framework                                     |
| Whether to run an expensive experiment                   | Run it only when a stated uncertainty would change the implementation decision and local evidence cannot answer it                                                                         |

The starting repository state was saved in checkpoint `f0d4ef9`; its working
tree was clean. Inspect current diffs before editing and preserve any subsequent
owner changes. Use the checkpoint adviser and standing commit authorization
below during execution. Installation, pushing, external publication, and
mutation of a consuming product are not part of this repository plan.

The installed `refine-design` skill currently points into this checkout through
a junction. Source edits can therefore affect later invocations without an
installation step. Keep each implementation slice coherent and locally checked
before using it for a live product refinement.

## Target sequence

1. **Capture source meaning.** Read the complete human description in source
   order. Record requirements, constraints, terms, explicit behavior, gaps, and
   exact provenance. Preserve stable IDs; postpone document presentation.
2. **Consolidate the semantic records.** Resolve shared rules, forward references,
   and overlapping claims. Code assembles bookkeeping; bounded reasoning resolves
   meaning. Retain complete source accounting, including unclassified material.
3. **Design from structured authority.** Supply the global application context,
   cross-cutting constraints, and relevant record sets. UX still covers every
   supported activity area, local use cases, participating dialogs, recovery,
   and pruning. Source excerpts remain available for ambiguity. Independent
   visual-foundation work may proceed when its own inputs are settled.
4. **Consolidate decisions and freeze review inputs.** Apply authorized product
   writeback, run the repository formatter when configured, and establish exact
   current product/UX bindings before review. Keep the description human-owned
   ordinary Markdown. Avoid generated ownership markers or a second authority.
5. **Review UX, then compose UI.** Obtain the independent review of the exact
   candidate. UI composition uses a current pass. Required behavioral corrections
   invalidate affected work honestly; mechanical assembly cannot promote status.
6. **Assemble and hand off.** Package current artifacts, verify replay and resource
   bindings, and leave reader organization to `generate-prd`. Save sufficient
   progress and issue state to resume without reconstructing the run from chat.

"Once" means one semantic interpretation of the original human input, not one
filesystem read. Hash checks, source coverage checks, and independent comparison
with owner intent remain necessary. A changed source still requires a complete,
exactly bound model proposal under today's contract. Eliminating reinterpretation
of an assistant-authored writeback requires verified decision patches and source
mapping; never achieve it by replacing digest fields on an obsolete proposal.

## Execution milestones

### A. Align instructions and stage boundaries

Read only the relevant current contracts and existing diffs. Reconcile
`skills/refine-design/SKILL.md`, its product-description/model and UX/UI/review
references, affected specialist instructions, and user guides. Correct directly
encountered contradictory schema/version or publication-ownership guidance.
Keep structural validation, independent review, and whole-product scope intact.

Specify each stage's inputs, outputs, reuse rule, and invalidation condition.
Separate interpretation, design judgment, independent review, and deterministic
assembly so a later agent cannot turn each into another whole-product rewrite.
Do not shorten the input by discarding cross-cutting rules or unsupported areas.

**Exit:** one consistent operational sequence; no source-edit step scheduled
after review as ordinary housekeeping; concrete remaining helper work identified.

### B. Add lightweight run evidence and resumable stage records

Record stage name/status, exact input/output identities, elapsed duration,
specialist-call purpose, source interpretations/writebacks, and correction
attempts. Save available usage with its provenance; mark unavailable values
unknown. Do not infer billed credits or child-only usage from aggregate totals.
Avoid storing raw prompts or duplicating product content for telemetry.

Reuse an existing report mechanism if suitable; otherwise add one small local
record/helper. It must not start agents, add a service, change product authority,
or introduce a monitoring framework. Resume only when saved input identities
still match. Persist assumptions and repair needs alongside completed stages.

**Exit:** local fixtures demonstrate recording/resuming work, invalidating changed
inputs, and retaining explicit unavailable measurements without external calls.

### C. Remove mechanical re-authoring

Implement a narrow structured planner-input builder and deterministic assembler
where code can prove the mapping. Preserve global context and dependency closure
for scoped records. Derive indexes, exact bindings, collection assembly, and
packaging from accepted records rather than asking an agent to restate them.
Keep semantic choices, UX design, pruning rationale, and visual composition
with their existing authorities. Do not invent a generic agent framework.

Handle selected decisions as explicit changes to saved candidates, not repeated
fresh full designs. Attempt the source-writeback shortcut only with a complete
mapping from accepted decision patches to final formatted source and model
claims. Verify unchanged meaning and affected dependencies. If that mapping
cannot be established reliably within this slice, retain the current correct
re-interpretation for the changed source, record the remaining cost, and finish
the other improvements. A partial optimization is preferable to false freshness.

Package artifacts in dependency order; do not parallelize competing writes to
the current snapshot. Cache or reuse validation only when exact inputs and
validator identity match and the relevant trust boundary remains checked.
Profile before pursuing low-level hashing or filesystem micro-optimizations.

**Exit:** fixture-driven execution removes identified manual repetition while
producing current validated artifacts with unchanged identities and coverage.

### D. Verify locally before any live evaluation

Reuse existing synthetic fixtures and saved specialist outputs where suitable.
Add only missing cases that exercise the new behavior. Local replay is simulated
specialist evidence, never a claimed fresh specialist run.

Required cases: a moderate multi-area cold start; a cross-cutting rule declared
late in the description; a local use case with a supporting dialog; unchanged
replay; accepted decision writeback; a material change affecting one case;
a lock conflict; a stale review; and one recoverable failure with later usable
work. Assert coverage, source/semantic identity, exact bindings, preserved
unaffected content, correct review invalidation, and finite recovery.

Use stage/call counters to verify the nominal workflow does not re-interpret
unchanged source or re-consult an agent for assembly. This demonstrates avoided
work in the coordinator, not a measured improvement in model quality or latency.

Run focused changed tests first, then the refinement package's required checks
once the slice is coherent. `npm --prefix skills/refine-design test` is the fast
gate. Use its `test:design` command when UX/UI/component/design-language behavior
changes; it already includes the fast gate. Do not immediately repeat both.
Run directly affected cross-skill/tooling tests when shared contracts change.
Avoid repository-root `npm test` as a routine precaution: it invokes the full
refinement matrix. Run broader checks only for a concrete unresolved concern
or when an applicable contract requires them.

**Exit:** focused and applicable package checks pass, deviations are recorded,
and the candidate has no unresolved defect that a live trial would merely repeat.

### E. Evaluate only when the result can change a decision

Use the next already-authorized real refinement when its product inputs are
available; keep its evidence in that product's repository. Otherwise finish the
repository work using local evidence. Do not invent a consuming-product task
because the owner is absent or time remains.

One live candidate run is the ceiling, not a quota. A small synthetic live case
is justified only for an important uncertainty that saved-output replay cannot
answer, such as whether the planner can use the new structured input without
losing a cross-cutting rule. Use ordinary patterns and the smallest representative
scope. It is not a substitute for validating whole-product coverage locally.

Within that evaluation, use only the required named specialist stages, at most
one targeted correction/review cycle, and no side-by-side old-pipeline run.
If a failure would require more paid exploration, save its evidence, address
what can be tested locally, and report the remaining live verification need.
Never claim review passed or output is current to fit the evaluation allowance.

**Exit:** report either observed stage/call/usage results with quality limits,
or "locally verified; live performance not yet measured." No percentage gain
without a comparable baseline and equivalent delivered scope.

## Credit and stopping rules

- Use one primary agent for repository work; avoid exploratory agent fan-out,
  repeated specialist consensus, and agent-written restatements of saved facts.
  The owner-requested checkpoint adviser is a separate, bounded consultation
  at meaningful commit boundaries, not another product-design evaluation.
- Start no paid baseline replay, broad benchmark matrix, or model comparison.
- Load narrow references once and retain a concise working record. Batch
  independent reads/checks; use targeted repair rather than complete regeneration.
- After a successful check, repeat it only for a relevant change or new concern.
- Diagnose repeated identical failures instead of blindly retrying. Bound
  automatic retries; record the blocked unit and continue independent work.
- Optional uncertainty is resolved by the defaults above, with its rationale
  recorded. Do not wait for an AFK answer. Required external authority is not
  inferred from silence; defer only that action and finish unaffected work.
- Stop when the scoped deliverables are complete. Do not fill the owner's time
  away with extra evaluations or resume cosmetic document work automatically.

No numeric credit/token budget was supplied. These operational limits bound
discretionary work; they do not promise a particular bill or remove required
validation. Expand evaluation only on new owner direction.

## Checkpoint advice and standing commit authorization

The owner explicitly requested the checkpoint adviser during execution and
preapproved the suggested commit messages for this plan. This is standing
authorization for successive in-scope checkpoints; do not wait for another
message approval before each commit.

At execution startup, activate checkpoint-adviser monitoring through
`review-standards`, following its infrastructure, calibration, standards, and
formatting/evidence requirements. Use its configured adviser role and model.
Do not spawn the adviser outside that lifecycle or activate unrelated reviewers
solely because checkpoint advice was requested.

Request advice after a coherent, verified implementation slice, before a risky
structural step, and at final handoff when changes remain. Milestones A, B, and
C/D are candidate boundaries, not a required commit count. Combine small changes
when they form one useful checkpoint. Reuse the adviser session; do not poll or
repeat a consultation when the repository and verification evidence are unchanged.

For `CHECKPOINT_RECOMMENDED` or `CHECKPOINT_URGENT`, the primary agent inspects the
complete repository state, prepares and displays the concrete commit message,
and runs `check-point` under the owner's standing preapproval. The adviser stays
read-only; it does not draft the final message, stage, or commit. Preserve the
checkpoint workflow's snapshot, scope, validation, and post-commit checks.
Routine in-scope changes can be re-inspected and the message updated under the
same authorization. Unexpected unrelated changes or material file concerns
require resolving the scope or concern before committing the complete state.

For `NOT_READY`, address the stated blocker within scope and consult again only
after relevant evidence changes. If adviser startup is blocked, record the exact
failed requirement and continue independent implementation; do not bypass its
gates or claim that parent judgment is adviser approval. Standing message
preapproval does not authorize unrelated infrastructure setup or publishing.

## Progress and handoff

Update this table at meaningful checkpoints. Record the decision, changed paths,
checks with results, adviser recommendation and snapshot fingerprint, commit
hash when created, remaining issue, and next concrete action. Do not create long
transcripts or duplicate the implementation in this plan.

| Milestone                           | State                            | Evidence / next action                                                                                                                                                      |
| ----------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan and current-process inspection | Complete                         | Source findings linked above; implementation results recorded below                                                                                                         |
| Initial repository checkpoint       | Complete                         | `f0d4ef9`; clean working tree after commit; owner subsequently authorized adviser-triggered commits and their suggested messages during plan execution                      |
| A. Instruction/stage alignment      | Complete                         | Skill, product-description/UX/review/publication contracts, planner/designer instructions and user guide now share the pre-review freeze sequence                           |
| B. Run evidence and resume          | Complete                         | `refinement-run.mjs`: immutable stage receipts, exact file checks, request/contract invalidation, observed durations/counts and explicit unknown usage                      |
| C. Structured inputs and assembly   | Complete within selected scope   | `refinement-input.mjs` and `refinement-assembly.mjs`; full structured authority retained, existing graph and validators reused; changed prose still requires interpretation |
| D. Local verification               | Complete after package repair    | Later recorded root suite passed 489 tests; earlier obsolete-fixture failures are historical. No code tests were rerun for the performance findings document.               |
| E. Conditional live evaluation      | First ordinary run measured      | Alexa refinement took 101.80 minutes through partial context; publication unmeasured. [Findings and fixes](performance-findings.md) record the remaining work.              |
| Checkpoint adviser                  | Simplified after initial handoff | Semantic functionality is its sole criterion. Earlier startup and review-ledger gates are no longer adviser prerequisites; see the later simplification entry.              |

Final handoff states what repetition was actually removed, which contracts and
helpers changed, what local checks passed, any live evidence and its limits,
remaining repair/deferred work, commits created and any uncommitted changes,
and the next useful action. Distinguish reduced
mechanical work from demonstrated end-to-end performance. Preserve the product
publication samples and their outstanding implementation plan for later work.

## Execution evidence, 2026-09-26

### Changes and decisions

- [Stage contract](../../skills/refine-design/references/refinement-cycle.md):
  capture complete source meaning once per changed source, plan from structured
  authority, consolidate decisions and formatting before review, preserve exact
  review bindings, then compose UI and assemble. Removed mandatory repeated
  editorial synthesis and the planner's second general prose interpretation.
  Corrected directly encountered obsolete review/design-language versions and
  publication ownership guidance; no document samples or renderers changed.
- [Planner input](../../skills/refine-design/scripts/refinement-input.mjs):
  verify the live source against the store, derive exact model/UX bindings and
  existing use-case handoffs, retrieve requested exact source-claim excerpts.
  Retain the entire structured model for global rules, unclassified content,
  gaps, locks and identity history. This deliberately does not claim aggressive
  token pruning; narrowing authority before measuring its adequacy is deferred.
- [Run evidence](../../skills/refine-design/scripts/refinement-run.mjs): one
  small receipt helper because existing publication reports describe artifacts,
  not specialist calls or pre-review stage inputs. Receipts are not canonical
  design authority and cannot replace review or owning validators. No telemetry
  service, prompts, automatic agent runner or credit estimates were added.
- [Assembly](../../skills/refine-design/scripts/refinement-assembly.mjs): sort
  explicit existing requests, commit serially with current bindings, return
  compact context identity, and retain independent successes after a failure.
  Failed/ambiguous units and dependency cycles have repair messages; dependents
  cannot fall back silently to an older requested artifact. Retries are caller
  decisions, not a loop. Lock changes remain outside the automatic assembler.
- The prose-writeback shortcut is deferred: arbitrary Markdown rewrites have
  no verified patch-to-claim mapping. Actual source changes still use the full
  current model proposal and preserve unchanged material identity. This is the
  explicitly allowed fallback in milestone C, not a claimed eliminated cost.

### Verification

- Current-schema suite: **18 passed, 0 failed** with
  `node --test --test-isolation=none skills/refine-design/scripts/refinement-efficiency.test.mjs skills/refine-design/scripts/product-composable.test.mjs skills/refine-design/scripts/ux-composable.test.mjs skills/generate-prd/scripts/prd-outline.test.mjs`.
  The 11 efficiency cases cover six activity areas/22 requirements, a late
  cross-cutting rule and unclassified material, a two-step local use case with
  a supporting dialog, exact replay, changed-source writeback, selective impact,
  stale review, current locks, invalid identities, dependency cycles and finite
  recovery. Saved proposals and synthetic review data are explicitly fixtures,
  not claims of fresh specialist review or measured product quality.
- The reusable current UX fixture was extracted from the test module so new
  tests can share it without importing and executing another test file.
  `test:efficiency` runs the focused cases; the fast package gate also includes
  them. No existing failing tests were removed or weakened.
- Positive CLI smoke: planner input, stage receipt persistence/reuse checking,
  and publication assembly all succeeded with a temporary synthetic product.
- Skill-creator `quick_validate.py skills/refine-design`: passed.
- `git diff --check`: passed.
- Baseline `npm --prefix skills/refine-design test` already failed before the
  implementation, principally at product-model 1.0 fixtures rejected by 2.0.
  The required `npm --prefix skills/refine-design run test:design` was run with
  fixture subprocess permission: **32 passed, 83 failed** at that point, with
  obsolete-schema inputs and expectations still failing. Its `&&` chain did
  not reach the additional design smoke. The last two efficiency cases were
  subsequently covered by the 18-pass focused run above. Broad fixture/schema
  reconciliation is a separate outstanding verification task; the package is
  not reported green.

### Initial checkpoint blockers and remaining work

Checkpoint startup used `review-standards` as requested. The installed reviewer
infrastructure and recorded calibration passed. `standards-attestation.mjs`
reported missing `agents/topics/standards/normalization.json`; the folder helper
reported missing `agents/topics/standards/manifest.md`. Formatting preflight
reported no direct root Prettier dependency, no installed local Prettier, and no
required root `format:check` script. No repository normalization, installation,
formatting setup, reviewer startup, or adviser evaluation was performed after
those failures. These are distinct from the old test-fixture failures.

The [review-standards rule](../../skills/review-standards/SKILL.md#startup-eligibility-gates)
states: "Any startup-gate failure blocks the entire run. There is no bypass."
As this plan specified, independent implementation continued. No execution
commits were created; `f0d4ef9` remains the initial checkpoint and these changes
remain in the working tree. The owner's standing commit-message preapproval is
preserved for when adviser eligibility is restored. No push was attempted.

Next useful work is to reconcile the inherited test fixtures with current
schemas. The later authorized setup below restores adviser startup. Then use the next ordinary
product refinement to collect stage durations, calls, usage when available, and
quality evidence. No paid baseline, benchmark, fresh design-agent trial or live
product mutation was used here; **locally verified, live performance not yet
measured**. Publication-format work remains deferred.

### Authorized checkpoint setup follow-up, 2026-09-26

The owner authorized installing Prettier and the actions needed to clear the
checkpoint setup gate. Prettier 3.9.6 is pinned at the root, with canonical
configuration and `format` / `format:check` scripts. The first formatting pass
covered 329 files. Dependency trees, vendored assets, exact-byte fixtures,
sealed calibration evidence, lockfiles and review scratch data retain their
existing bytes. Earlier refinement edits remain in the working tree.

The [standards reconciliation](../../agents/topics/standards/reconciliation.md)
records the folder assignments, two narrow tooling conventions, and the first
normalization marker. The generated [standards guide](../../STANDARDS.md) is
current. No checkpoint rule was disabled.

Two setup defects were repaired: calibration now selects permanent rule IDs
instead of Markdown table spacing, and initial attestation discovery excludes
`.codex-tmp` instruction captures while retaining real subtree instructions.
The helper changes have regression coverage. Formatting preserved the parsed
JavaScript/JSON content of 242 of 246 checked files, allowing for JSX layout
whitespace; the other four contain those two explicit fixes and their tests.
All 963 canonical rule IDs and their order were preserved.

Verification: 168 tooling tests passed; 21 focused normalization/refinement
checks passed; formatting setup and the root formatting check passed; the
complete startup preflight returned `READY`. The renewed synthetic calibration
passed 32 obligations, detecting 14 seeded violations with independent audit.
The prior calibration record is preserved under the ignored review session.
This is reviewer readiness evidence, not a repository-compliance review.

Calibration fingerprint:
`2b66b9bb40e9a1b8a4b919f66c26008a2ee8948d28879bd586a5bbb0ff62d0d6`.

The inherited broad package failures have not been repaired or represented as
passing. No new commit or push has occurred during setup. The adviser evaluated these
restored prerequisites under the owner's existing authorization.

Adviser result: `NOT_READY`. Startup and formatting are restored, but no current
exit-0 repository `review-ledger.mjs validate` result with aggregate `CLEAN`
exists. The earlier broad package failures also remain unresolved. The adviser
inspected 352 changed/new files with no staged changes and confirmed folder
resolution, durable normalization, formatting setup and the root format check.
No checkpoint recommendation or commit was fabricated from calibration.

Evaluated repository fingerprint:
`6a9d348f96543d517f985c4b04a1ff59d2f55a3e60f32b9ed535b8c882a60ad8`.
Evaluated review-context fingerprint:
`sha256:cfe0a993bc55253b0a1e3f27f9b837faaaa6fab72206ff9ac8ff2283f50310ef`.
These identify the evaluation before this status entry was appended, not a
post-edit compliance certificate. Next: repair the inherited package fixtures,
then obtain the required task primary/audit evidence and reevaluate a checkpoint.
The formatting and normalization setup need not be repeated.

### Package test repair, 2026-09-26

The inherited test failures are repaired. Product-model fixtures now use schema
2.0, and UX, UI and component fixtures use their current 0.3 contracts, including
flat flow records, owned state references and exact artifact bindings. Negative
tests still reject obsolete schemas, stale bindings and invalid ownership, and
verify that rejected inputs preserve previously published output. Saved review
fixtures remain explicitly synthetic expected results with updated source hashes.

The repaired tests exposed three runtime defects: component validation still
read the removed UX `states` property; step targets no longer checked that their
surface matched the action; and interaction comparison collapsed distinct named
states into the same value. Those consumers are corrected. Shared component and
UX validators are identical in refine-design and generate-prd. The checkout
fixtures now expose their actual difference in alternative coverage instead of
passing because the comparator ignored their obsolete nested records.

Verification: root `npm test` passed all 489 tests with zero failures or skips.
The explicit `test:composable` tier passed all 7 tests. Root `format:check` and
`git diff --check` passed. This used local automated tests; no paid product
refinement, benchmark or fresh design-agent trial was run.

Checkpoint approval remains pending independently of the repaired tests.
Calibration readiness passes, but review preparation returns `INCOMPLETE`:
`review-context-fingerprint.mjs` rejects the installed managed link for
`agents/architecture-reviewer.toml` as outside the Codex root. Formatting passes
on the final preparation attempt. No repository primary/audit review or new
checkpoint recommendation was produced, and no commit or push was made. The
remaining checkpoint work is to repair managed-link resolution, obtain current
primary/audit evidence, and reevaluate with the existing commit preapproval.

Local verification logs and review preparation evidence are retained under
the ignored `.codex-tmp/` directory; the task baseline is in
`review-standards/session-K8bku6/` beneath that directory.

### Checkpoint adviser simplification, 2026-09-26

The owner replaced the adviser's readiness prerequisites with one criterion:
whether the current changes form a reasonable unit of functionality. A coherent
intermediate step may be worth checkpointing. Formatting, test results,
normalization, calibration, standards-review ledgers and context fingerprints
are no longer adviser prerequisites. Known defects inform functional judgment
instead of creating automatic vetoes. The separate commit workflow still handles
commit authorization and Git writes.

The agent definition, review and bootstrap orchestration, managed global
instructions, and supporting documentation now agree. The installer applied the
reviewed managed-block update and reports a healthy installation. A fresh adviser
recommended a coherent synthetic feature despite missing checks and rejected an
inconsistent API migration despite green checks. All 169 tooling tests passed.
The earlier review-context fingerprint error remains a separate standards-review
issue and no longer prevents checkpoint advice.

The separate standards-review calibration was refreshed with a fresh primary
review and independent audit: all 32 obligations validated, all 14 seeded
violations were detected, and readiness passes. The previous record is preserved
in ignored session `review-standards/session-QdA2l3/`. Checkpoint-adviser files are
excluded from the new calibration inputs, so later adviser edits do not require
another standards-review calibration.
