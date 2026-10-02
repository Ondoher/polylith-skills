# Descriptive wireframe/UI comparison execution

Status: running. Stages 1-3 are complete: the first matched pair has independent
layout and UI approvals. Stage 4 is running in reversed order. Four more approved
arms are required before the comparison is complete.

## Completed preparation

- Frozen current Alexa snapshot revision 8 and verified exact accepted UX/source/
  review bindings. Full composition boundary: 13 authored frames, 55 actions,
  12 primary scenarios and two mandatory related scenes. See [coverage](coverage.md).
- Saved mechanical source/reference closure, shared sample states and accepted
  theme provenance. No prior wireframe geometry, comps or findings reach authors.
- The common renderer/capture harness passes 10 positive tests, including actual
  local Edge capture, receipt provenance and interval closure. Rendering remains
  the existing production library; no separate model client/backend/proxy is used.
- Local infrastructure checkpoint: `0636ede`,
  `feat(experiments): add descriptive wireframe UI test harness`, recommended by
  the checkpoint adviser under the user's preapproval. Unrelated work excluded.

## Early feasibility result — excluded from matched runs

The descriptive author produced an 18,551-byte layout with all selected scenarios.
The UI author produced the whole base composition preview without an intermediate
geometric wireframe. It required clarification of initial fixture state; those
values are now pinned identically before measured runs.

- [Descriptive layout](../../../../.codex-tmp/descriptive-wireframe-ui-20261002/feasibility-B/layout/layout.md)
- [Base UI preview](../../../../.codex-tmp/descriptive-wireframe-ui-20261002/feasibility-B/ui/r2/preview.html)
- [Screenshot](../../../../.codex-tmp/descriptive-wireframe-ui-20261002/feasibility-B/ui/r2/preview.png)
- [UI notes](../../../../.codex-tmp/descriptive-wireframe-ui-20261002/feasibility-B/ui/ui-notes.md)

Chronological, nonoverlapping subintervals inside each author's marked window:

| Author             | Interval                         |       Time |
| ------------------ | -------------------------------- | ---------: |
| Descriptive layout | Start → inputs ready             |   20.921 s |
| Descriptive layout | Inputs ready → first saved unit  | 2m 56.433s |
| Descriptive layout | First saved unit → authoring end |   37.350 s |
| UI preview         | Start → inputs ready             | 4m 00.633s |
| UI preview         | Inputs ready → first preview     | 5m 05.046s |
| UI preview         | First preview → authoring end    | 3m 25.962s |

Encompassing marked author windows are **3m 54.704s** for layout and
**12m 31.641s** for UI. These include the subintervals above; do not add them again.
The phases include tool use and generated text, not just reasoning. Both rendered
UI revisions had zero geometry warnings; revision 2 improved use of available
space, frame-step grouping and mute labels. Independent review was deliberately
not claimed for this feasibility preview.

Parent dispatch-to-observed-completion windows also contain startup, delivery and
coordinator latency. In particular, manual receipt preparation continued beyond
the UI's authoring-end marker. The matched series now uses automatic receipts to
avoid repeating bookkeeping. That tooling development is outside its run clocks.

## Matched series

[Series identity](series.json) pins packet, scenarios and sample hashes.
[Settings](settings.json) request Sol medium for layout and Astra ultra for UI and
independent reviews. Actual backend model identity is not exposed; requested and
verified settings are not conflated.

Order: A/B, B/A, A/B. One path runs at a time. Each starts fresh and receives the
same inputs, 14 required scene IDs, capabilities and quality obligations. The
first pipeline dispatch was 2026-10-02T19:05:54.455Z (`pair-1-A`).

Run results, findings, repairs, full elapsed intervals and aggregate comparisons
will be added as they complete. [Raw events](events.jsonl) and
[interval summaries](measurement/metrics.json) preserve measured observations.
Any open intervals remain incomplete, not zero-duration completed stages.

## Questions and decisions so far

1. **Which execution path?** Current in-session agents only. No model CLI,
   backend, proxy, redirect or observer. Workflow MCP tools are not exposed in this
   session; use the same deterministic renderer through a scoped local wrapper.
2. **Which source is authoritative?** The snapshot-referenced accepted UX with
   exact review/source binding. Research is advisory and does not settle policy.
3. **How to handle retained UX ambiguities?** Preserve accepted provisional
   Ungroup restrictions and select insertion before Add identically in both paths.
   Document qualifications outside the UI; do not invent transfer/reset policy.
4. **Does scope require additional state views?** Yes: staged source cropping and
   Save Video busy freeze need two explicit related scenes. No combinatorial state
   expansion beyond these consequential omissions.
5. **What is the initial sample state?** Frame 0, stopped/Fit, saved project,
   unsaved loaded video draft, no Undo/Redo history, no global operation, Track 1
   active and Append insertion. These are fixture choices, not product rules.
6. **How to avoid model-contract conflicts?** Use isolated default-agent contracts
   with the current role's requested settings, rather than pretending a descriptive
   artifact satisfies production geometric wireframe gates.
7. **Can model names in author prose prove actual settings?** No. Corrected the
   layout receipt's inferred alias; requested settings are explicit, actual unknown.
8. **How much visual fidelity is available?** Schematic media and fixed renderer
   typography are shared limitations, documented in [renderer limits](renderer-limitations.md).
   Experimental review still assesses visible usability and semantic completeness.
9. **Can all elapsed time be attributed?** No. Preserve stage/tool markers and
   unknowns. Host reasoning-token/stream metrics are unavailable; preparation before
   the first exact parent marker is unmeasured.
10. **Should authors rebuild measurement metadata?** No. Added a small automatic
    receipt command and fixed `authoring-end` interval closure before timed runs.
    Authors retain brief meaningful decisions/corrections rather than copying data.
11. **How to preserve exact CRLF research receipts?** Narrow `.gitattributes`
    entries retain normal whitespace checks while accepting those two immutable
    fixtures' original CRLF. Trimmed only an extra projected-research EOF blank
    line and rebuilt hashes before the series. Actual staged whitespace check passed.
12. **How to recover preparation errors?** Correct unsupported reader options,
    Windows argument quoting and oversized diagnostic output; retain usable data.
    These setup incidents do not masquerade as measured comparison failures.

## Remaining work

Complete the first matched pair through structural review, UI review and repairs;
then the two additional pairs. Save every independent subject hash and verdict,
report individual results and mean/median/range, verify live input hashes, and
checkpoint the finished report/evidence. No permanent workflow rollout is authorized
by this experiment and none has occurred.

## First measured rendered layout submitted

`pair-1-A` pipeline dispatch: 2026-10-02T19:05:54.455Z. Layout dispatch:
19:05:55.102Z; parent observed completion: 19:17:06.721Z (11m11.619s).
Within this enclosing window the author recorded start at 19:06:40.651Z,
inputs-ready at 19:07:12.718Z, first-unit-saved at 19:09:04.047Z and
end at 19:16:37.858Z. These nested intervals must not be added to the total.

First submitted subject SHA-256:
`2f39e5a7058ca66d8a53ef78767bc5833d580161aea2fc0294a2122a6898c4b6`.
The 169,510-byte artifact covers all 14 required scene IDs and declares 49 action
references. Declaration is not evidence of semantic coverage; independent
structural review began at 19:17:07.056Z. Eight numbered render iterations are
retained; notes document intrinsic sizing and retained-state corrections. Pure
text-overflow diagnostics are deferred to UI review under the common contract.
The exact first submission is retained in `runs/pair-1-A/layout-submission-1/`.

First independent structural review completed at 19:31:18.652Z after dispatch
at 19:17:07.056Z (14m11.596s). Verdict: revise, 10 source-linked structural
findings. Exact review SHA-256:
`1640de0a6a9c913d929303d0e0fd99674a0e3cb024ea2058cc5581598e616619`.
The same author began repair dispatch at 19:31:19.012Z. All findings are preserved
in `runs/pair-1-A/reviews/structural-review-r1.json`; no UI work has been approved.

The in-session matched-series coordinator now owns sequential benchmark
orchestration and durable results for all six arms. It uses the unchanged frozen
contracts and requested stage settings, fresh contexts between arms, and retained
author/reviewer contexts only within each repair loop. Root retains final report,
live-source verification and checkpoint responsibilities. This delegation does
not launch another model client or run multiple comparison arms concurrently.

## First rendered layout accepted

`pair-1-A` structural review round 3 passed the exact layout subject
`5e3edb08e24f57883bd6bafd17ad6d9b208b4fc4ba84967fcdf59cb06bb3265a`.
The pass receipt SHA-256 is
`d79c0412e50f09344e35a14b8b23770175d65d0ff831147fae393531eb1236e5`.
Two structural repair rounds were required. The first re-review closed seven
original findings; three residual issues were fixed in the second repair.

Final structural re-review was observed complete at 19:58:59.357Z. Fresh UI
author dispatch was 19:59:00.752Z, using the same frozen theme/scenarios and
requested Astra/ultra settings. This is an intermediate layout approval, not an
approved final UI or a completed matched pair.

Evidence precision: revision suffixes such as r8/r14/r15 are identifiers, not
counts of successful render calls. Use logged operations and retained captures
for observed counts; pre-render failures may lack operation events and remain
included in stage elapsed time. Artifact JSON bytes are not model-emitted token
counts; generated helper source and serialization can differ substantially.

## First UI submission and upstream repair

UI author dispatch 19:59:00.752Z through observed submission 20:13:01.729Z
was 14m00.977s. The 879,725-byte materialized UI and distinct generated helpers
are retained. Readiness markers are self-reported boundaries, not pure reading
or reasoning: helper preparation can precede the inputs-ready marker.

Independent UI review dispatch 20:13:03.086Z through observed verdict at
20:25:17.016Z was 12m13.930s. Its verdict was revise for one source-coverage
finding: persistent project New/Open/Save As affordances were absent from both
the submitted UI and previously accepted layout. No visual blockers were raised.
The original structural pass and UI rejection remain separate exact evidence.

The same layout author repaired the omitted header controls, and the same
structural reviewer verifies that changed subject before UI propagation. This
finding stays inside A's contexts; no hints, source edits or contract changes
are given to fresh future arms. Repeated findings should be distinguished from
new unique defects and from reviewer grouping choices.

## First complete measured arm

`pair-1-A` is independently approved. Pipeline dispatch through observed
approval was **100m05.104s** (19:05:54.455Z to 20:45:59.559Z). This enclosing
total includes initial authoring, review, three layout repairs, one UI repair,
and re-reviews. Review reports contain 14 finding instances across rounds; these
are not 14 unique defects. The final UI review reports no blocking findings.

Exact approved subjects and independent passes are recorded in
[the approved result](results/pair-1-A.json). The source-coverage omission found
in UI review was repaired upstream and independently checked before propagation
to the final UI. Those findings were withheld from future fresh arms.

[The running analysis](analysis/summary.md) distinguishes initial stages, repairs,
and nested author windows. It has one approved arm so far; no matched speed
comparison or aggregate conclusion is available yet. The remaining five arms
continue under the frozen contracts.

## Descriptive first-pass review

`pair-1-B` delivered its initial descriptive layout in 6m38.829s, versus
11m11.619s for A initial layout. Its first structural review requested two
corrections: explicit playback scope and the transport/scrub/frame-step controls
disabled during Save Video commit. The same author repairs those gaps before
UI dispatch. This initial layout saving does not yet establish lower approved-UI
cost. The exact report and repairs are retained under `runs/pair-1-B/`.

Descriptive structural review round 2 passed the repaired Markdown subject.
Fresh UI authoring began at 21:10:06.026Z and uses the description directly,
without an intermediate geometric wireframe.

## First descriptive UI submitted

Initial B UI dispatch through observed submission was **25m36.713s**
(21:10:06.026Z to 21:35:42.739Z), compared with A **14m00.977s**.
B includes 370,071 root bytes plus 465,402 required child-envelope bytes,
**835,473 bytes total**. These are saved materialized sizes, not generated
token counts. Required dependencies are preserved and hashed separately.

The author corrected region stacking through supported child references in the
existing renderer. This recovery belongs to B execution cost; it is not excluded
as tooling development. Independent review began at 21:35:44.101Z and will assess
the full 14-state batch, longer labels and retained numeric-edge diagnostics.
No final B approval or matched-pair conclusion is available yet.

Initial B UI review took **11m44.446s** (21:35:44.101Z to
21:47:28.547Z) and requested two visual geometry repairs: proportional source
crop/fitted planes and whole-scene 200% magnification. The description already
specified both, so this is UI implementation repair rather than missing
structural information. The numeric-edge warnings were nonblocking. The same
UI author began repair at 21:47:29.984Z; independent re-review is still required.

## Stage 3 complete: first matched pair

Both final UIs are independently approved. These are encompassing pipeline
windows, including initial work, every repair/re-review and coordinator gaps.

| First pair            | Total through approved UI | Reported finding instances | Repair rounds |
| --------------------- | ------------------------: | -------------------------: | ------------: |
| A: rendered layout    |               100m05.104s |                         14 |             4 |
| B: descriptive layout |                74m10.585s |                          4 |             2 |

B used **25m54.519s less elapsed time (25.9%)** in this pair. Its initial UI
stage was longer (25m36.713s versus 14m00.977s), while layout/review/repair savings
more than offset that difference. This is promising but only one matched pair.
The two additional pairs continue, without contract tuning or prior-arm hints.

Final complete materialized UI is 915,312 bytes for A and 948,720 bytes for B.
B has a 402,739-byte root plus 545,981 required child bytes. Root-only size is
not complete output size; none of these byte counts measures generated tokens.

The [fixed first-pair snapshot](checkpoints/first-pair/summary.json) and
[event archive](checkpoints/first-pair/events.jsonl) exclude later active arms.
Exact final subjects, dependencies, reviews and preview links remain in
[approved A](results/pair-1-A.json) and [approved B](results/pair-1-B.json).

Review counts are finding instances across rounds, not unique semantic defects.
A has eight structural and six coverage instances; B has one structural, one
coverage and two visual instances. Geometry defects can surface at different
stages because only A renders the intermediate layout. Both final UIs face the
same independent quality check. Runtime behavior and credit/token use remain
unverified by this static experiment.

Checkpoint preservation decision: one archived, byte-hashed Windows-authored
helper retains mixed CRLF and an original trailing blank line. A file-specific
Git attribute accepts those original bytes while retaining normal trailing-space
and indentation checks. The helper was not reformatted or reexecuted, and approved
subjects/review hashes are unchanged.

First-pair checkpoint verification: staged whitespace check passes; all 70
indexed evidence references match their recorded SHA-256 values. The staged
scope contains only the first pair and experiment tooling/documentation; active
future-arm output and unrelated repository edits are excluded. The additive
complete-UI-size analyzer reporting passes four positive tests. Its existing
root-only byte metric remains unchanged and explicitly labeled.

A read-only Git subprocess check initially encountered Windows sandbox EPERM;
the same check succeeded through the authorized escalation path. No artifact
bytes or benchmark measurements were changed to recover it.
