# Wireframe/UI author self-audit pilot

Status: pilot protocol locally verified; the isolated in-session timeline trial
is complete through first-draft diagnostic, self-audit, repair, and ordinary
independent acceptance. Two clean author audits were followed by review
rejections; revision 6 passed after a third audit and review. The early quality
gate did not warrant a matched control or UI trial. See the
[execution record](wireframe-ui-self-audit-execution.md). The scripted
model-execution path is retired for this plan; any continuation must use the
current conversation's agents and tools unless the user explicitly requests a
separate model session.

Test whether the **same wireframe or UI author** can find and repair more defects
before independent review by keeping a compact, source-bound requirement list and
checking the **final rendered revision** against every item. The independent
wireframe and UI reviewers remain the external quality checks. The outcome is
useful only if first-review reliability improves enough to justify the author's
extra work and the end-to-end path becomes cheaper or faster.

The [completed corrected-scope baseline](wireframe-ui-baseline-completion-20261001.md)
is historical context, not a controlled comparison. Its timeline required three
rejected reviews and 49m24.424s of cumulative agent work, including 27m14.003s
of repair and re-review. The
whole three-interface attempt took 57m51.315s active elapsed, with five review
rejections and no finding-free first reviews. These are different measurements:
agent work overlaps and must not be added to elapsed time. A self-audit will not
eliminate the time needed to make a genuine correction; the likely avoidable cost
is repeated reviewer work, downstream UI construction on a flawed wireframe,
and rediscovery of earlier source requirements.

## Scope and controls

- Start with the saved **timeline** change only. It exercises temporal values,
  menu placement, selected versus focused state, and wireframe-to-UI handoff.
  Keep other affected interfaces for a later decision, not this first test.
- Use the saved source facts, corrected impact selection, frozen design language,
  model/effort settings, renderer, and review criteria through in-session agents.
  The existing localhost MCP **data service** is allowed. Do not launch the
  scripted Codex client, a direct backend call, or a model proxy without the
  user's explicit request for that execution path. Preserve the baseline and
  live product unchanged in a new reversible pilot attempt. Reuse existing saved
  data; do not rerun upstream UX.
- Keep one persistent author per stage and the current external reviewers. UI
  starts only after the exact wireframe revision passes its independent review.
  No new reviewer agent is part of the author's self-audit.
- Agent output and reviewer judgments vary between runs. A different failure in
  a fresh run does not prove that this checklist fixed the earlier one. Keep
  fresh control and treatment attempts separate, and compare overall coverage,
  defect severity, review rejections, rework and cost as well as named failures.
- For the first diagnostic, compare both checks against **one frozen author
  draft**. This removes between-author variation from the question of which
  defects each check notices. It does not remove variation in reviewer judgment
  or establish the cost of a full reviewer-only workflow.
- This experiment deliberately tests an exception to the earlier
  [defect-prevention plan](wireframe-ui-defect-prevention-plan.md), which excluded
  an internal repeat check and a parallel requirement list. Do not change that
  production rule or roll out the experiment globally before measuring it.
- Shared code must be product-independent. A reduced, anonymized timeline
  fixture may preserve its failure pattern, while a second unrelated fixture
  confirms that IDs, labels, values, and behavior come from supplied data.

## Small requirement contract

The author first extracts **observable obligations for the changed interface**
from the selected source packet: required actions, states, outcomes, preconditions,
focus/recovery, and exact accepted upstream behavior. Reuse its existing source
paths and action/outcome references. Add only obligations whose correctness needs
an explicit final check. Do not generate a second full UX specification, duplicate
all unchanged source facts, or create a general dependency graph.

Seed an inventory of the packet's required action, state and outcome references
mechanically. The author supplies the testable meaning for each relevant item
and may add source-linked assertions that the inventory does not express. Before
the final audit, reconcile the checklist against that source inventory: every
required reference must be covered or explicitly marked unresolved. Otherwise a
requirement omitted from the initial list would remain invisible to the audit.

Each checklist item needs a stable ID, source reference, short testable assertion,
stage (`wireframe` or `ui`), and current status. A claimed implementation may
point to scene/node evidence; it is **not** a verified result. Suggested statuses
are `planned`, `claimed`, `verified`, and `needs-repair`, plus a short reason for
unresolved or ambiguous items. For example, “the Start trim leaves End unchanged”
and “Ungroup appears in the open Selection actions menu” are separate assertions.
Their wording is fixture data; the server does not infer rules from these words.

The existing outcome-evidence and revision machinery should supply references
and bookkeeping. The server can validate source pointers, stable IDs, evidence
node existence, structured values when available, status transitions, and exact
source/render revision bindings. It cannot declare prose behavior correct merely
because a scene or node exists. That judgment belongs to the author inspecting
the **actual final capture** and, independently, the reviewer.

The pilot protocol should support:

1. **Plan:** save the checklist once before construction; allow justified
   additions discovered during construction, recording when and why they arose.
2. **Build:** submit progressive scene/part changes through the existing
   `pilot.contribute` path. Mark covered IDs and evidence in that same call where
   possible, avoiding a separate model/tool turn for each checkbox.
3. **Freeze the first draft for the experiment:** after the ordinary construction
   and preview inspection, but **before the dedicated full-list self-audit**, end
   the author's first assignment at a coordinator barrier. Save its exact artifact,
   screenshot pages, source binding and revision. Resume the **same author thread**
   to self-audit that snapshot while an external reviewer independently checks
   the same immutable snapshot and source packet. The reviewer saves a separate
   diagnostic receipt that cannot count as normal acceptance or release UI. The
   reviewer cannot edit the working draft; the author cannot see the diagnostic
   findings until self-repair and its normal independent review are complete.
4. **Inspect:** inspect every capture page, reconcile the checklist with the
   required source-reference inventory, and retrieve the complete checklist,
   including previously claimed items. Check each assertion against that exact
   rendered revision and record `verified` or `needs-repair` with evidence. The
   server returns unresolved items compactly.
5. **Repair:** correct unresolved items without discarding valid work. Any edit
   invalidates the prior final-audit receipt. Audit **all** items again against
   the new revision, because one correction may undo another. Continue until a
   pass makes no changes and all mandatory items are verified, or record an
   explicit blocker after at most three self-audit repair rounds in this pilot.
   Do not spin indefinitely or quietly mark an unresolved item complete.
6. **Submit:** require a clean audit receipt bound to the submitted revision
   before `pilot.submit` in checklist-mode. Run the ordinary independent review
   of that final revision; the earlier diagnostic verdict on the frozen first
   draft does not substitute for it. Withhold the author's checklist and
   self-audit verdict from the reviewer until after its verdict, so they cannot
   cue the reviewer. Use a fresh ordinary reviewer thread for final acceptance
   so the diagnostic review does not prime it; record that startup separately.
   An unresolved or ambiguous mandatory item is reported as needing repair;
   unaffected elements may proceed.

The final audit is a deliberate extra author pass. Measure it separately from
initial construction and local repairs. Do not treat checklist completion as a
review pass or weaken the external review standard.

## Milestones and early evidence

| Milestone                                     | Implement and test                                                                                                                                                                                                                                                                                                                                                        | Evidence required to continue                                                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Freeze comparison                          | Save source/fixture hashes, accepted historical receipts, role settings, review criteria, and metric definitions. Inventory the timeline's prior blocking findings without handing its corrected artifact to new authors as an answer. Define fresh control as the existing author process without the checklist.                                                         | Reproducible inputs and a predeclared comparison sheet.                                                                                                                                                                    |
| 1. Build pilot protocol                       | Add pilot-only checklist persistence, revision-bound audit and diagnostic receipt operations with scoped MCP permissions. Split the author assignment at the frozen-draft barrier and resume the same thread for self-audit. Reuse the current store, preview and normal review contracts.                                                                                | A neutral positive fixture saves, retrieves, claims, audits, edits, re-audits and submits one accepted revision. An immutable diagnostic snapshot never grants acceptance or UI access. No Alexa condition in shared code. |
| 2. Paired first-draft diagnostic              | Start a fresh checklist-enabled timeline wireframe author on the saved packet. Freeze the first complete, ordinarily inspected preview before full-list audit. Send that exact snapshot to the external reviewer for a separate diagnostic receipt while the same author thread self-audits it. Seal the reviewer findings through self-repair and ordinary final review. | A finding-by-finding comparison on the same artifact, exact revisions and timing for both checks, and final reviewer outcome. A poor early result may stop the paid pilot here; a good one is only a signal.               |
| 3. Matched wireframe comparison, if warranted | Run a fresh no-checklist control and another fresh checklist-enabled treatment from the same frozen inputs. Use separate attempts, the same role/model/effort and blinded review criteria; alternate execution order for any later pair. Complete the same review/rework bounds in both.                                                                                  | Per-attempt quality and cost, including different errors each author made. Repeat another pair only if the first comparison is inconclusive and the answer is worth the credit.                                            |
| 4. UI trial, only if warranted                | Feed an **accepted** wireframe to fresh UI authors under matched control/treatment conditions, scoped to visual obligations and preserved behavior. Run unchanged UI review, including ordinary rework.                                                                                                                                                                   | Per-stage and end-to-end measurements, final captures, outstanding issues, and comparison of like-for-like UI runs.                                                                                                        |
| 5. Decide                                     | Analyze quality and cost before any three-interface replay or production integration.                                                                                                                                                                                                                                                                                     | Written decision to adopt, refine once with a specific hypothesis, or drop the approach.                                                                                                                                   |

For milestone 1, begin with the happy path and meaningful exact-revision checks:
all items are returned for the final audit, source references are accounted for,
prior `claimed` items require fresh verification, an edit invalidates that
receipt, resume retains the checklist, the frozen diagnostic snapshot remains
immutable, its receipt does not release UI, and UI cannot start before ordinary
wireframe acceptance. Then add small reproductions for observed failures and the
needed permission/scope guard. Defer a broad
negative-case matrix until the intended path works. Code review is appropriate
after the coherent protocol milestone, not after every small edit.

Implement in the experimental pilot first. `PilotStore.mjs` currently only
re-exports `WireframeStore`; make a pilot-only extension there (or a similarly
isolated wrapper) rather than assuming checklist logic already exists. Update its
focused tests, `run.mjs` assignment permissions, `reviewed-pipeline.mjs` author
barrier and diagnostic path, and `analyze-reviewed.mjs` timing output. The normal
`pilot.review` operation requires an inspected submitted revision and writes an
acceptance-eligible receipt, so the frozen draft needs a **different** diagnostic
receipt path. Keep the normal `wireframes.*` MCP contract unchanged until the
trial supports rollout. If it does, define one
shared contract for the pilot and normal path rather than maintaining two
different checklist semantics.

## Measurement and decision rule

Record timestamps and available usage for requirement extraction, first
contribution, each contribution, first capture, the author barrier,
frozen-snapshot review, source-inventory reconciliation, each final-audit pass,
local repair, submission, every independent review, reviewer-directed repair, and
acceptance. Report **elapsed critical path** and **cumulative agent work**
separately, with overlapping windows marked. Also report checklist item count,
items added late, calls/output generated, captures, audit loops, and any
unresolved item. Tool execution alone is not reasoning time; label unobserved
model time accordingly.

Use the saved timeline's **49m24.424s agent work** and review history to size the
problem, but judge improvement against fresh matched control attempts. Keep
inputs, settings, reviewer rubric and stopping rules fixed. Score coverage of
all source obligations and severity-weighted findings, including **new** errors
that neither the historical run nor another attempt made. Do not score success
only by whether the checklist catches the specific earlier trim or menu defects.
For the paired snapshot, match self-audit findings and independent findings by
the underlying source obligation and visible defect, then report items found by
both, only by the author, only by the reviewer, and by neither but discovered
later. Adjudicate disagreements against the frozen source and render; preserve
uncertainty where neither proves an answer. Include false alarms and time to
identify and repair each finding. The
parallel diagnostic review is **experiment overhead**, not time saved by the
production self-audit path; report it separately from the final-review path.
Do not disclose its findings to the author between the paired check and final
review, or the final result would no longer test self-repair.
Report each attempt and the spread across attempts; a single unusually careful
or careless author must not stand in for a process effect. A first run can reject
the idea early, but cannot establish a reliable gain. Even repeated small runs
give directional evidence, not a guaranteed failure rate.

The strongest signal is consistently fewer blocking findings at first review
with no loss of demonstrated behavior. The approach is worthwhile only if its
additional extraction and full-audit time is offset by less reviewer/rework and
downstream disruption, or by a clear quality gain at comparable cost. If it
merely moves the same corrections into a longer author turn, record that and
stop rather than broadening the mechanism. Reviewer observations that are
nonblocking still count in the quality report; do not relabel them as clean.

Preserve every source binding, checklist revision, author claim, audit receipt,
capture, independent finding, metric, and decision in each isolated attempt and
a concise execution report. Do not infer a general speedup from this pilot or
apply a new production gate until the evidence justifies it.
