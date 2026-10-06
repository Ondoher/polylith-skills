# UI author completeness check: implementation and evaluation plan

Recorded: 5 October 2026.

Status: execution in progress; reevaluated on 5 October 2026. Milestones 1-2 are
implemented as opt-in; behavioral and comparative evaluation are underway.
Default-policy changes have not been made. See
[execution progress](ui-author-completeness-progress.md).
The owner selected an author-owned requirements/omission check and explicitly
excluded returning screenshots to the author for another inspection cycle.
The purpose is to test whether this reduces downstream rework, as the reported
UX omission check did. That UX result motivates this trial; it does not establish
that the same intervention benefits UI.

## Intended flow and scope

Accepted UX, spatial handoff, foundations and assigned scope -> save requirements ->
author UI and map coverage -> look for missed requirements -> repair -> recheck
coverage and affected requirements -> existing parent validation/render/capture ->
existing independent UI review and repair -> existing exact acceptance/publication.

The same UI author performs the omission check inside its authorized assignment.
It receives no additional screenshot-review turn or rendering authority. Keep the
existing independent reviewer and exact acceptance gates. The parent's ordinary
render diagnostics and any existing scoped preview requirements remain in place.
Author readiness is a delivery status, never independent visual acceptance.

Start with a companion requirements ledger and focused author instructions.
Preserve UI/component schemas, research-first planning, shared ownership, scoped
file/MCP delivery, canonical writer authority and current worker limits. Do not
combine this with agent preparation, additional research, planner decomposition,
state/treatment/assembly, renderer changes or another full aesthetic review loop.
Use the [promoted capture flow](persistent-ui-capture-promotion.md) in both trial
conditions so browser reuse cannot be mistaken for a completeness-check saving.

Every durable application-specific requirement, ledger, finding and trial record
belongs in the owning application's product/run folder. Repository-local temporary
trials may use `.codex-tmp/ui-author-completeness/<run>/`. Only reusable instructions,
tooling, unrelated synthetic fixtures and general findings are repository
deliverables. Use current-conversation agents and tools; no separate model session,
backend, model proxy or Codex CLI execution is authorized by this plan.

## Requirements to preserve

| ID    | Requirement                                                                                                       | Proof                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| UC-01 | Persist requirements from exact accepted inputs before authoring.                                                 | Milestones 1-2: saved initial ledger, source identities and assigned scope.        |
| UC-02 | Map each required scene/state/control/content/feedback item to authored coverage or a valid documented exception. | Milestones 2-3: inspected source references and intentional omissions.             |
| UC-03 | Inspect the original inputs for requirements missing from both the UI and the initial ledger.                     | Milestones 2-3: an omitted-ledger-row case is discovered and repaired.             |
| UC-04 | Repair omissions and recheck the complete coverage inventory plus affected requirements.                          | Milestone 3: a repair that removes another required state is caught.               |
| UC-05 | Keep the check within existing author ownership; escalate upstream uncertainty and shared changes.                | Milestones 2-3: scoped-unit, blocked-meaning and shared-owner cases.               |
| UC-06 | Preserve independent review, exact current-subject acceptance and publication.                                    | Milestones 2-4: real unchanged gate exercised after final delivery.                |
| UC-07 | Add no author screenshot inspection or repeated aesthetic review.                                                 | Milestones 2-4: actual dispatch/turn and capture logs.                             |
| UC-08 | Survive context compaction and reject stale readiness after source/draft changes.                                 | Milestone 3: resume using saved inputs/ledger; changed hashes invalidate coverage. |
| UC-09 | Measure actual downstream omissions, repair work, total time and available model usage.                           | Milestone 4: matched comparison, original findings and actual timestamps.          |
| UC-10 | Promote only from demonstrated benefit without concealed regressions or unresolved critical gates.                | Milestone 5: requirement-by-requirement readiness assessment and decision.         |

## Milestone 1 - Freeze the baseline and define the check

Read the current `agents/ui-designer.toml`, the matching role planning document,
`skills/refine-design/SKILL.md`, UI/component contracts and relevant scoped delivery
routes. Locate the available UX omission-check evidence and record which part of
its procedure helped, which did not, and the limits of that comparison. If its
original evidence is unavailable, disclose that instead of inventing a quantified
UX baseline. Keep app-specific copies in their owning project or temporary run.

Record the current working-tree baseline, including Git HEAD and hashes of the
relevant changed and new files. The promoted capture work may be uncommitted:
checking out HEAD alone must not silently restore the old capture/publication flow.
Freeze trial inputs, model/role configuration and the observation protocol before
seeing comparison results.

Freeze an evaluation-only obligation inventory from each case's accepted inputs
before authoring. Include the required surfaces/states and the permitted gap rules.
Keep it separate from the author's ledger. Use it to detect omissions that escape
both the author and independent review; fewer reviewer findings must not conceal
less complete output. Validate any later discovered obligation against the original
inputs and record it consistently for both conditions, without silently moving
the goalposts. The evaluation inventory is not a new production review gate.

Define a compact companion ledger containing:

- Product/run, author assignment, owned scope and exact upstream source identities.
- Stable requirement IDs, source references, the required observable meaning/state,
  and any explicit dependency on a shared contract.
- Scene/node references, current candidate identity and status: `pending`,
  `covered`, `permitted-gap` or `blocked`.
- Evidence/reason for the status, discoveries added during the omission check,
  repairs and affected requirements to recheck.

The ledger lives beside the assigned proposal/unit in the product run, outside the
UI/component runtime document. Derive requirements from the supplied scope;
inherit existing IDs where useful. Do not invent upstream behavior or require a
whole-product ledger from a worker that owns only one slice. Every required scene
must exist. A permitted missing-detail component inside an existing scene can
remain a documented placeholder under the current exception; it cannot excuse
an omitted scene or a sufficiently specified control. Preserve honest partial
classification. Unresolved behavior goes back to its owning UX path.

Distinguish semantic obligations from checks already enforced mechanically.
Omission coverage must add value beyond schema/reference validation. Review the
original inputs even when all existing ledger rows are marked covered; an empty
or underspecified checklist is not evidence of completion.

**Deliverable:** focused ledger contract, baseline/input manifest, trial cases,
metric definitions and an implementation checklist. The execution packet must list exact files to change, authorized delivery operations, focused verification commands, and the next progress checkpoint before coding starts.
**Pass condition:** the contract supports a whole-scope and a scoped-component
assignment, an omitted initial ledger row, an allowed component gap and stale
input detection without adding runtime UI fields or new author permissions.
**Refinement decision:** simplify the contract before adding tooling if it demands
subjective numeric scores, duplicate source prose or unnecessary per-node records.

## Milestone 2 - Implement an opt-in author workflow

Add a focused reference under `skills/refine-design/references/` and route explicit
trial assignments to it from the UI author instructions and skill. Resolve the
current wording that prohibits another self-review loop: permit this bounded
requirements check, while preserving ordinary design reasoning and the exclusion
of another screenshot/aesthetic review cycle. Keep the matching role planning
reference consistent. Do not rewrite unrelated role guidance.

Use this author procedure:

1. Save the initial requirements and source/scope identities before design work.
2. Author through the existing assignment route and update coverage as work lands.
3. Compare both the draft and ledger with the original accepted inputs. Add missed
   requirements rather than treating the initial ledger as exhaustive.
4. Repair within ownership. Identify shared/upstream gaps explicitly and continue
   unaffected work through existing coordination.
5. Recheck every requirement against the final candidate and its source references.
   Reuse evidence only when the relevant content, bindings and dependencies are
   unchanged. Inspect repair effects in more depth where needed, including shared
   contracts and apparently unrelated requirements. A final all-row check must
   catch a regression outside the author's predicted impact set. Repeat only while
   an actionable omission or regression remains; do not repeat an aesthetic review.
6. Deliver the UI proposal/unit and companion ledger through the authorized
   destination/handle, with compact ready/blocked status and actual repair history.

Reuse permitted assigned-file or local result-store delivery for the companion
record. Establish the exact authorized destination before dispatch. Keep closed
UI/unit payloads unchanged; do not append ledger fields to them or borrow parent
access. Add a deterministic helper only where it can verify concrete identities,
references, statuses and resume behavior reliably. It cannot certify semantic
completeness from an author's checkbox.

Bind ready status to the exact final candidate and upstream hashes. Covered rows
need actual scene/node evidence for their stated requirement, not merely a matching
ID or asserted checkbox. Permitted gaps require the existing exception's reason;
pending and blocked obligations cannot be hidden by a ready summary. A revision
invalidates prior ready status until its requirements are reconciled. Stop an
ineffective repair path when repeated attempts yield no new verified progress,
report the remaining obligation and continue independent scope where authorized.

The parent checks current identities and delivery hygiene before the existing
render/capture and independent-review route. Whole-product/assembled coverage
remains parent-owned; local completion cannot certify another worker's scope.
After independent-review repairs, the responsible author updates the same ledger
and rechecks affected coverage before resubmission. Do not require another whole
omission pass for an unchanged accepted unit.

**Deliverable:** opt-in instructions, companion delivery/resume support and any
small identity validator justified by the contract.
**Pass condition:** one actual author assignment persists and delivers the ledger
without another author image-inspection turn, new transport subsystem or expanded
canonical authority. Existing validation and acceptance still operate.
**Refinement decision:** remove ceremony that does not change an author decision;
keep opt-in until the behavioral and comparative milestones pass.

## Milestone 3 - Prove omission, repair and recovery behavior

Use unrelated synthetic inputs with known obligations. Prefer structurally valid
incomplete designs, so successful schema validation cannot mask missing scope.
Keep intentionally seeded defects separate from the later efficacy comparison.
Exercise the actual author workflow, not only a fabricated passing ledger.

| Case                                                                                   | Observable result                                                                                                           |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Required accepted surface/state omitted from the draft                                 | Author adds the missing representation before independent review.                                                           |
| Requirement absent from both initial draft and ledger                                  | Input reinspection adds a source-bound row and repairs it.                                                                  |
| A repair accidentally removes another required state, outside the predicted impact set | The final all-requirement check catches the loss before delivery.                                                           |
| Already-placed component lacks permitted visual detail                                 | Known role/constraints and placeholder remain documented; surrounding required scenes are still delivered.                  |
| Accepted behavior is unresolved or a requirement lies outside ownership                | Author reports the precise blocked/owned scope without inventing behavior or editing another worker's unit.                 |
| Source, shared contract or draft changes after coverage is recorded                    | Previous ready status becomes stale; affected rows are reconciled against the current identities.                           |
| Context is compacted/restarted before completion                                       | Author resumes from persisted sources/ledger and records actual subsequent work.                                            |
| Two scoped workers cover different pieces of a shared interface                        | Each checks its owned obligations; parent detects assembly omissions and shared changes remain with their designated owner. |
| Complete initial draft                                                                 | Author finishes a short check without cosmetic churn, redundant research or an extra visual-review turn.                    |

Also exercise false coverage: an author marks a row covered using the wrong scene,
a source-linked node that does not express the required state, or stale evidence.
Verify that the final requirement check corrects the claim, while the deterministic
helper is credited only for identity/reference defects it can actually detect.
An omitted scene, renderer limitation or lack of a research comparable must not
be reclassified as the permitted missing-component-detail exception.
For recovery, use actual compaction when available or a fresh continuation given
only persisted inputs and ledger. Label the latter as a simulated context-loss
exercise; do not claim that compaction occurred. Retain actual actor provenance
and re-establish its authorized assignment before any resumed writes.

Run current schema/source validators and relevant delivery/acceptance regressions.
A mechanical-invalid fixture can test diagnostic routing, but its detection does
not count as evidence that the new semantic omission check helped. Independently
inspect source obligations, actual repairs and readiness; checklist assertions
alone are insufficient. Use skill-creator forward-testing guidance for a scoped
independent behavioral assessment when this implemented workflow warrants it.

**Deliverable:** actual before/after drafts, source-bound ledgers, resume/stale
results, dispatch records and a requirement coverage report.
**Pass condition:** every deliberate in-scope semantic omission and seeded
regression is repaired; permitted gaps remain honest; scope and acceptance guards
hold; complete drafts incur no gratuitous redesign.
**Refinement decision:** make narrow instruction/tooling fixes based on observed
failures before proceeding. Stop repeated ineffective retries and report the
blocker; timing estimates are progress checkpoints, not an automatic abort while
new verified progress continues. Retain individual operation deadlines.

## Milestone 4 - Compare the actual full workflow

Use three matched cases with different demands: a surface with materially different
states, a focused component with supported states, and a scoped assignment that
contributes to a larger assembly. Select relevant accepted inputs with verified
research and realistic complexity; actual project data stays in its owning product
run or an authorized temporary experiment. Do not choose cases because the new
check has already succeeded on them. Intentional omission fixtures from Milestone 3
prove mechanism, not real-world rework reduction.

Run one small matched pair first. Check protocol feasibility and actual cost before
starting the remaining two. Freeze case selection and the metrics before efficacy
results. Refine the protocol after the smoke test only with a documented version;
rerun or report incomparable observations separately. Reuse the complete-draft
case from Milestone 3 as a separate overhead check; another two full rendered-review
runs are unnecessary when its unchanged output and existing acceptance can be
verified. Report its pure check cost and any gratuitous edits.

For each representative case, dispatch two independent UI authors with the same
accepted inputs, research, owned scope, initial design baseline (if one exists),
model/reasoning configuration and existing delivery permissions:

- **Baseline:** the current author flow, with no added ledger/check obligation.
  Preserve its ordinary competent authoring and existing diagnostics; do not
  disable useful baseline behavior or prompt it to leave omissions.
- **Completeness check:** the same intended flow as Milestone 2: save requirements
  before any new authoring, update coverage, re-read inputs for missed requirements,
  repair and recheck every requirement before delivery.

Retain each branch's original author for its own completeness work and downstream
repairs when available. If a replacement is necessary, record it and provide only
that branch's persisted inputs, ledger where applicable, findings and candidate.
Do not share drafts, review findings or agent history across conditions. Both
branches begin from the same source baseline; they need not generate identical
drafts. Initial drafting differences are part of the full intervention and must
remain visible in the report. Three pairs are a pilot, not causal certainty from
identical model outputs. A shared-draft omission-check comparison may be added as
a diagnostic if uncertainty warrants it, but cannot substitute for these full-flow
trials or for recording requirements before authoring.

Check the actual loaded role instructions and opt-in assignment route. Both arms
must genuinely follow their selected condition without changing global installation
merely for the test. Use separate independent reviewer contexts for each paired
branch; reviewers receive the same kinds of accepted-source and image evidence,
without condition labels, author-ledger hints or other-branch findings. Alternate
review/dispatch order where practical. Record host capacity and reserve review
slots before dispatch. Queue work when needed; do not exceed current worker limits
or activate experimental agent preparation to accelerate this trial.
Bound live trial roles to one author and one independent reviewer per condition
where practical. Reuse these agents for successive cases only within their own
condition, with a new exact assignment packet; record retained-history effects
and never call this fresh-context isolation. Prefer available compatible agents
and positively reconcile prior assignment completion before reuse. Queuing alone
does not free a retained thread slot. If compatible isolated roles cannot be
allocated or reused, report the capacity blocker instead of repeatedly spawning
or invoking a separate model execution path.

Both branches use the same renderer, installed browser, capture settings,
independent review criteria and exact current-subject acceptance route. Keep actual
author/reviewer identities and all failed reviews, validations and repair attempts.
The final reviewed scope covers the same source obligations in both branches;
missing required scenes/states must be repaired through the existing flow. Record
additional captures caused by those repairs. Do not count a reduced image/review
scope as a saving. Test publication handoff compatibility on one final passing
sample; publishing full document collections for every pair is outside the rework
measurement and need not be repeated.

Audit both final outputs against the frozen evaluation inventory. An omission
that escaped an independent pass is an escaped omission, not a successful complete
result. Route necessary repairs through the existing acceptance process. Record
audit-triggered repairs and evaluation-only overhead separately; do not credit a
premature pass as a faster equivalent result. Carry each branch to its guarded
pass with equivalent coverage, or report the incomplete branch explicitly and
exclude it from a completed-time comparison without discarding its failures.

Measure with stable counting rules:

| Metric                             | Definition                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary: downstream omissions      | Distinct in-scope missing requirements first identified after author delivery, deduplicated by source obligation. Include parent diagnostics, independent findings and escaped omissions; report detection stage separately.                                                 |
| Downstream repair episodes         | Actual repair submissions/turns caused by those omissions, with obligation IDs and other findings included in the same episode. Do not make one batched patch look cheaper by dropping its requirement count.                                                                |
| Initial independent-review outcome | First-review pass/revise verdict and distinct findings, classified as omission, visual treatment/layout, renderer, upstream gap or integration.                                                                                                                              |
| Work moved into the author         | Requirements discovered, author repairs, ledger/check time and false positives/unnecessary changes.                                                                                                                                                                          |
| Total repair work                  | Internal plus downstream repair episodes and affected requirements; identify regressions and repeated attempts separately.                                                                                                                                                   |
| Full cost to equivalent acceptance | Actual elapsed time from each branch's initial author dispatch to final guarded pass with audited equivalent coverage, including requirement saving and initial drafting; author/reviewer turns, captures and available model usage. Record evaluation-only time separately. |
| Quality/coverage                   | Final obligation coverage, permitted gaps, escaped omissions and regressions, under unchanged independent review criteria.                                                                                                                                                   |

Report all three pairs, pooled omission counts, absolute differences, median
elapsed time and visible ranges. Separate identifiable host/queue delays from
active work and disclose unavailable usage data. Retain actual timings; do not
substitute estimates or suppress slow/failing branches. Reduced reviewer findings
can mean work moved earlier. Claim less total rework or faster completion only
when the corresponding total measures improve.

**Deliverable:** full-flow comparison, original drafts/ledgers/findings, final
coverage audit, overhead case, publication-handoff sample and cost report.
**Pass condition:** comparable branches and metrics sufficient to judge benefit.
Zero baseline omissions are a floor effect; they establish no measured omission
benefit. Incomplete, contaminated or materially mismatched comparisons remain
inconclusive. Do not hunt indefinitely for favorable cases: add a representative
case only to resolve a named uncertainty, document why, and keep it distinct from
the originally selected comparisons.
**Refinement decision:** retain 25% fewer pooled downstream omissions and benefit
in at least two of the three pairs as a working usefulness signal. Also report
absolute counts, downstream repair episodes and the complete-draft overhead.
Percentages based on tiny counts do not establish a general benefit. No serious
coverage regression is acceptable. Before promotion, show whether total repair
work and elapsed/model cost improve, remain similar or increase, and explain why
the observed tradeoff supports adoption. If benefit or cost is unclear, keep opt-in
and refine or conclude inconclusive rather than promoting on fewer findings alone.

## Milestone 5 - Decide, promote narrowly and preserve evidence

Assess UC-01 through UC-10 against actual artifacts. Decide from the results:

- **Promote:** meaningful downstream omission reduction in full-flow trials, preserved audited final coverage and independent acceptance, and an explicit assessment of total repair/time/model cost. Fewer external findings alone are insufficient. Make the compact check
  standard for applicable composition/component assignments, with scoped ledgers
  for local workers and parent-owned assembly coverage.
- **Refine/retest:** omissions decline but overhead, false positives, scope handling
  or recovery remain problematic. Keep opt-in and make a narrow evidence-driven
  correction before another bounded comparison.
- **Do not promote:** no useful reduction, hidden regressions or persistent unjustified
  cost. Preserve general findings and retain the previous default.

For promotion, update the UI role, matching maintained references and refine-design
routing together; remove superseded opt-in wording and contradictions. Validate
skills, run relevant regressions and document migration/resume expectations.
Global installation follows the repository-local installer and its reviewed
user-level mutation rules only when separately requested. Checkpoint/publishing
also follows its explicit workflow when requested.

Preserve application evidence in its owning product folder. Keep only a reusable
readiness/progress assessment here, with no application names, paths, domain data
or copied requirements. Temporary synthetic evidence stays temporary. Document
what improved, what merely moved earlier, what cost more, and what remains uncertain.

**Deliverable:** requirement-by-requirement readiness assessment, adoption decision
and, only when justified, the final maintained author-completeness flow.
**Completion condition:** the implementation is evaluated and its disposition is
explicit; a passing internal ledger alone cannot complete the plan.

## Reevaluation outcome

The plan now tests the pre-authoring requirements ledger as part of the actual
workflow, not only a post-draft intervention. It requires a final all-requirement
check, catches false/stale coverage and regressions outside predicted impact,
audits omissions that escape the reviewer, separates unique obligations from
batched repairs, and includes initial authoring in measured cost. It reuses the
complete-draft overhead proof and checks publication compatibility once to avoid
unnecessary full-pipeline repetitions. Runtime implementation has not started.
