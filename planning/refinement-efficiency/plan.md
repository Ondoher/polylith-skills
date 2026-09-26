# Refinement efficiency: autonomous execution plan

Status, 2026-09-26: execution plan prepared; implementation has not started.
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
Retain existing canonical artifact formats wherever possible. Keep document
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

| Current behavior | Consequence and response |
| --- | --- |
| [Product-model contract](../../skills/refine-design/references/product-model.md) calls for one interpretation and structured downstream inputs, while [UX inputs](../../skills/refine-design/references/ux-design.md) require the entire description again | Reconcile the instructions and supply UX with complete structured product authority plus relevant source evidence |
| [Description contract](../../skills/refine-design/references/product-description.md) requires full prose synthesis and incorporation of selected decisions | Collect decisions and perform one coordinated writeback before review, rather than editorial updates between dependent stages |
| [UX review](../../skills/refine-design/references/ux-review.md) binds exact description and UX bytes | Finish formatting and authoritative bindings before requesting review; any later source change still invalidates the receipt |
| [Composable handoff helpers](../../skills/refine-design/scripts/composable-handoff.mjs) gather use-case dependencies and identify affected cases | Reuse or adapt their graph traversal rather than introducing a second semantic parser; they are currently implementation handoffs, not ready-made planner inputs |
| Model material digests and [impact assessment](../../skills/refine-design/scripts/refinement-impact.mjs) already distinguish material changes | Preserve unaffected decisions and identify actual dependencies instead of treating every revision as a full redesign |
| [Publication producer](../../skills/refine-design/references/product-publication.md) packages each artifact in dependency order | Automate mechanical coordination while preserving exact validation and serial snapshot commits |

These are process/code findings, not timing measurements. Do not re-run the
old pipeline merely to manufacture a baseline. Reuse existing evidence when
its input, scope, and provenance are actually comparable.

## Decisions to make without waiting for the owner

| Question encountered | Default decision |
| --- | --- |
| Several plausible implementation approaches | Choose the smallest reversible change using existing contracts/helpers; record the reason and practical limitation |
| Whether a whole document needs rereading | Interpretation consumes the complete human input once; later design uses structured authority and retrieves source evidence as needed. Independent review still checks the original intent |
| Whether two claims mean the same thing | Retain explicit identities and provenance; use bounded semantic reconciliation for ambiguity. Do not guess equality from wording, headings, or hashes |
| Missing product decision or conflicting evidence | Record a gap or repair need and continue independent work; do not manufacture accepted behavior or a passing review |
| Whether to reorganize product prose | Consolidate authorized decisions and format once before review. Avoid cosmetic restructuring that has no effect on the requested refinement |
| Whether to run another specialist | Default to no additional consultation. Use an existing named role only for a bounded unresolved question that materially affects the result |
| Whether a failure requires a full restart | Resume the smallest affected stage from saved inputs; revalidate its dependencies. Preserve unrelated content |
| Whether to add a dependency or change a canonical schema | Prefer existing tools and current formats. If unavoidable, isolate and document the need rather than expanding this work into a migration or framework |
| Whether to run an expensive experiment | Run it only when a stated uncertainty would change the implementation decision and local evidence cannot answer it |

Preserve the existing mixed working tree. Inspect relevant diffs before editing;
do not reset, stage, or commit unrelated work. Progress checkpoints are saved
records, not automatic Git commits. Installation, pushing, external publication,
and mutation of a consuming product are not part of this repository plan.

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

## Progress and handoff

Update this table at meaningful checkpoints. Record the decision, changed paths,
checks with results, remaining issue, and next concrete action. Do not create
long transcripts or duplicate the implementation in this plan.

| Milestone | State | Evidence / next action |
| --- | --- | --- |
| Plan and current-process inspection | Complete | Source findings linked above; no implementation or live evaluation performed |
| A. Instruction/stage alignment | Pending | Start with the once-only interpretation versus full-description UX input conflict |
| B. Run evidence and resume | Pending | Reuse existing report infrastructure where possible |
| C. Structured inputs and assembly | Pending | Keep canonical outputs and integrity checks; implement only proven mappings |
| D. Local verification | Pending | Reuse fixtures; add targeted behavior cases |
| E. Conditional live evaluation | Not scheduled | Maximum one candidate evaluation; no baseline replay |

Final handoff states what repetition was actually removed, which contracts and
helpers changed, what local checks passed, any live evidence and its limits,
remaining repair/deferred work, and the next useful action. Distinguish reduced
mechanical work from demonstrated end-to-end performance. Preserve the product
publication samples and their outstanding implementation plan for later work.
