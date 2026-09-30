# Wireframe/UI reliability execution

Status: complete, 2026-09-30. Plan: [wireframe/UI reliability](wireframe-ui-reliability-plan.md).

All four changed elements passed independent wireframe and visual review. The
normal refinement MCP path now requires accepted wireframes before UI work and
delivery. The trial recorded **zero invalid UI dispatches across 11 assignments**;
all protected inputs remained unchanged. Two renderer defects were repaired and
their acceptance renewed using saved designs.

Evidence: [metrics](wireframe-ui-reliability-20260930-metrics.json) and
[local preview gallery](../../.codex-tmp/wireframe-ui-reliability-20260930/index.html).
The gallery includes two unchanged inventory entries alongside the four updated
elements; those entries were not newly authored.

## Progress

- [x] Shared behavior and renderer contract.
- [x] Reliable incremental authoring and preview inspection (local tests passed).
- [x] Wireframe review before UI dispatch (local tests passed).
- [x] Isolated add-dialog acceptance trial.
- [x] Four-element confirmation, reusing compatible completed work.
- [x] Normal refinement integration and package verification.
- [x] Final measured confirmation report.

## Accepted output and overall timing

| Element            | Accepted wireframe | Accepted UI | Rendered states per artifact |
| ------------------ | -----------------: | ----------: | ---------------------------: |
| Add dialog         |                 r8 |          r5 |                            7 |
| Clip-update dialog |                 r5 |          r3 |                            5 |
| Selection menu     |                 r6 |          r3 |                            4 |
| Timeline           |                r22 |          r5 |                           14 |

All current previews have zero structural validation errors and no unrepresented
required action references. Independent review found no consequential open
defects. Reference coverage and static screenshots do not establish working
runtime behavior.

The outer experiment window runs from the first successful author launch at
19:32:00.749 UTC through final acceptance at 20:50:20.541 UTC. It includes
interruptions, repair/checkpoint/resume gaps, local inspection and renewed reviews.
Implementation before the first launch is outside this window.

| Window and nesting                                                           |       Duration |
| ---------------------------------------------------------------------------- | -------------: |
| **First successful author launch through all current acceptances**           | **78m19.792s** |
| ↳ Active coordinator time intersecting that outer window, including recovery |     73m07.226s |
| ↳ Union of completed native author/reviewer windows, within the outer window |     69m44.779s |
| ↳↳ Union of completed author windows, included in the native union above     |     55m28.570s |

The coordinator row is clipped to the outer boundaries; complete run timestamps
remain in the metrics. Completed-native unions exclude the unsuccessful
interrupted invocation; the outer/coordinator windows include it. The rows are
**not additive**.

The original pilot took **107m44.467s** through its complete review/rework
sequence. This run was about **29m25s shorter**, despite renderer recovery and
renewed reviews. This is a directional comparison: the review ordering, helpers,
scene coverage, reused inputs and recovery work differ. It is not a controlled
estimate of the new workflow's causal speedup.

## Recovery and remaining bottlenecks

- The add dialog's first visual review found missing choice focus. Its attempted
  UI repair occupied 3m17s before interruption. After the code repair, renewed
  author inspection and reviews occupied a 5m41s coordinator run.
- Timeline wireframe repair took 9m01s, then passed a 1m38s recheck before UI
  started. Timeline visual review subsequently found missing trim-handle focus;
  its author retained a draft and returned the renderer blocker after 4m18s.
- The final renderer refresh occupied **13m39.523s**. All four saved designs were
  reused, but conservative renderer fingerprints required eight author refreshes
  and eight reviews. This is included in the 78m20s total, not a separate saving.
- Per-element source packets took **2.956–10.143ms** to assemble and persist.
  Boundary decisions were reused from the original inventory, so there is no
  fresh boundary-selection timing in this trial.
- The service recorded 482 HTTP requests, including initialization: median
  server handling was **1.228ms**, 95th percentile **1.509s**, maximum **26.932s**.
  These measure server handling, not model-command generation or network RTT.
  Browser captures account for the long contribution calls. The delayed marker
  had **13.184s queue time** and only **2.633ms operation time**, confirming the
  queue bottleneck described in the decision log.

The [follow-up list](wireframe-ui-followups.md) records shared timeline geometry,
pre-review scope growth, retained-context reuse, preview queue separation and a
later parallel-author experiment. Those are future optimizations, not unfinished
steps of this plan.

## Decisions

The complete decision log below includes the questions resolved during execution.

1. Reuse the existing pilot and its saved original inputs. Corrected designs are
   regression evidence, not answers supplied to fresh authors.
2. Preserve the user's normal Codex connection; the local MCP data service is
   allowed, but no model proxy or redirect will be used.
3. Keep the upstream UX flow stage unchanged and preserve its unreviewed status.
   The new wireframe review cannot imply upstream approval.
4. Implement locally; invoke design/review agents for the planned trials and the
   checkpoint adviser for coherent commits. No additional coding workers are
   needed for initial implementation.
5. Reuse the original boundary inventory for the focused comparison. This avoids
   another model pass; scope selection is recorded as reused, not newly measured.
6. Move the shared preview/store implementation into refine-design helpers and
   keep small experiment imports. Normal MCP integration will use the same code.
7. Keep unsupported state values as explicit local errors; retain the saved draft
   for targeted correction. Rendering is distinct from inspected submission.
8. The sandbox initially prevented child-process launch (`spawn EPERM`). Automatic
   approval review then rejected the normal-client launch for ambiguous payload
   authorization. After inspecting the client and supplying the invoked plan's
   exact authorization, the retry was approved without changing the connection.
9. Which reviewer should assess comps? Add `ui-design-reviewer` alongside the
   requested wireframe roles. The existing `ui-reviewer` is a code-standards lane,
   so using it for qualitative comp review would conflate responsibilities.
10. Can the geometry check find the old defect? Its initial frame-only check
    missed it. Inspect painted text bounds too, excluding intentional floating
    field labels, clipping/scroll regions and visual overlays. Treat diagnostics
    as warnings for inspection, not proof of usability.
11. What if review discovers a renderer defect? The add-dialog UI review found
    missing choice focus styling. Its author correctly saved a draft instead of
    changing renderer code, but waited on a question outside its assignment.
    Stop that identified trial client, preserve the draft, fix the renderer and
    resume. Updated assignments explicitly return such blockers to the coordinator.
12. Are old passes valid after a renderer repair? No. Bind acceptance to the
    loaded preview/native renderer/parts code, rerender saved drafts and renew
    affected reviews. Record this extra tooling-recovery work separately.
13. How should retries and dependencies survive resume? Count up to three review
    revisions per element/role/current source-render contract from saved files.
    Schedule selected wireframe dependencies first; references outside a bounded
    trial retain their frozen source contract.
14. What about the broader gate's obsolete read-only requirement? Update the
    reviewer infrastructure check to require the already-authorized workspace
    write mode plus explicit scoped-delivery instructions. Do not revert agents'
    delivery permissions or suppress the failing check.
15. Should timeline scope expansion be hidden in authoring time? No. Record the
    13 states produced against five originally required, plus the full local
    inspection/correction window. More checking is only useful if total accepted
    output cost improves; first-review pass rate alone is insufficient.
16. What if a wireframe still fails? The timeline's first review found mismatched
    temporal positions and a missing concrete successful Add result. Enforce the
    gate and repair the source wireframe before any timeline UI dispatch. Do not
    change or weaken the independent review criteria to manufacture a pass.
17. Should repair assignments reread unchanged source facts? The native service
    log shows the same 96,775-byte timeline packet read in four calls during
    initial authoring and again in four calls during repair. Align the replay
    prompt with the managed role's existing read-once contract: retain unchanged
    facts and retrieve again only for changed bindings or missing context. This
    was changed after the observed repair; its performance benefit is unmeasured,
    and no extra paid replay is commissioned to quantify it here.
18. Should a second renderer defect be treated as agent design rework? No. The
    timeline comp declared focused trim handles, but their visual primitive had
    no focus rule. Fix the renderer and the repeated disabled-outlined-button
    treatment, verify actual computed styles in a local browser, and retain the
    candidate. Report the blocked repair and renewed acceptance as tooling
    recovery. Its author returned the blocker instead of waiting for the user.
19. Can accepted elements skip renewed reviews after a shared renderer change?
    The current binding fingerprints the whole renderer, so all four become
    stale. Preserve their designs, rerender and renew exact acceptance. Avoid
    inventing selective migration of review receipts during this experiment;
    record that conservative invalidation's additional cost.
20. Is every long tool interval model overhead? No. Browser capture outliers
    reached 26.876s, and an unrelated timing marker waited 13.187s during that
    capture. The trial hook awaits capture inside the existing workspace mutation
    queue. Preserve operation/queue telemetry, identify this as mechanical
    overhead, and record capture decoupling as a follow-up. Normal-host capture
    remains parent-owned; changing queue semantics is outside this reliability
    comparison.
21. Why did the first author make a failed scope call? The replay still granted
    the old boundary-discovery operation even though the coordinator now reuses
    the frozen inventory. Remove that unnecessary author capability; boundary
    preparation remains coordinator-owned. The single rejected call cost 1.205ms
    of service execution and did not change the inventory. No extra paid rerun
    is needed to test an operation that this fixed-scope trial never requires.

## Evidence and timing

Implementation, verification, trial timings, checkpoints and recovery evidence
are retained below. Prior discussion documents remain part of the record.

- Implementation marker: 2026-09-30 19:17:01 UTC.
- Twenty focused tests passed: native client, existing renderer and store,
  analyzer, new source packet/dialog construction, targeted edits, inspected
  submission, exact acceptance, rejection preventing UI, and restart reuse.
- Local preparation retained unchanged protected inputs. The first failed launch
  produced no design results; it is setup evidence, not design-agent timing.
- Authorized add-dialog author started at 2026-09-30 19:32:00.749 UTC. Attempt:
  `.codex-tmp/wireframe-ui-reliability-20260930/`. All new artifacts remain there.
- Checkpoint adviser recommended: `Harden wireframe authoring handoffs`.
- Created checkpoint `bb9c3b1` with that preapproved message. No push.
- First wireframe author: 282.776s; first independent wireframe review: 97.893s,
  pass. Two draft previews and author inspection preceded submission; this is not
  zero local correction effort.
- First UI author: 228.204s; first visual review: 156.310s, revise for a renderer
  focus defect, with two nonblocking content/token observations. UI repair saved
  its draft, then waited for renderer ownership; the identified client was stopped
  after 197.373s and protected inputs remained unchanged.
- Renderer repair adds visible choice focus, disabled choice/icon behavior and
  explicit disabled foreground/background theme tokens. Twenty focused checks
  passed after the fix. Renewed wireframe inspection/submission: 80.334s; its
  independent recheck: 69.158s, pass. These are additional recovery windows.
- Add-dialog final visual recheck passed; first author launch to both acceptances
  was **23m29.243s**, including the interrupted UI repair, local renderer repair
  gap and renewed inspection/reviews. Active coordinator windows were 16m03.578s
  and 5m41.326s; these exclude the intervening repair gap and are not another
  additive total on top of the 23m29s window.
- Geometry regression: the saved broken selector produces 50 text-overflow
  warnings; the accepted neutral wireframe produces zero. Local browser probes
  took 746ms and 834ms respectively. These warnings do not test semantic time
  alignment or runtime interaction.
- Full `npm test`: **557 passed, zero failed**. Additional experiment lifecycle
  and analyzer checks passed. Package log:
  `.codex-tmp/wireframe-reliability-package-tests.log`.
- Created checkpoint `15ae1a5`, `Integrate reviewed wireframe-to-UI workflow`,
  using the checkpoint adviser's preapproved message. No global agent install or
  push was performed; the plan requests repository integration.
- Four-element continuation began at 19:56:12 UTC. The accepted add dialog is
  reused. Clip-update passed both first reviews without requested rework.
- The selection menu also passed both first reviews. Timeline wireframe review
  required consistent temporal alignment and a concrete successful Add scene.
  Its repair passed before timeline UI dispatch. Timeline visual review then
  exposed the trim-focus renderer defect; the author retained its draft and
  returned that blocker after 258.082s. Protected inputs remained unchanged.
- The second renderer fix passed 14 focused tests. A 3.050s hidden-browser probe
  confirmed three focused trim handles have a solid 2px outline and disabled
  outlined controls retain the surface background. Evidence:
  `.codex-tmp/wireframe-focus-regression/result.json`.
- Resume at 20:36:41 UTC reuses saved work and renews exact acceptance under the
  corrected renderer. The shared code fingerprint conservatively refreshes all
  four elements; these additional invocations will be reported separately.

## What is implemented

The normal MCP path exposes `wireframes.prepare`, `packet`, `contribute`,
`submit`, `status` and `review`. Existing facts produce the source/acceptance
packet mechanically. Dialog patterns, native choices, supported-state checks
and targeted structural edits make valid construction easier. Previewing is
separate from inspected submission. Independent wireframe acceptance binds exact
source, artifact and renderer versions before UI authoring or unit delivery.

Managed source roles now include `ux-wireframe-planner`, `ux-wireframe-reviewer`
and `ui-design-reviewer`; UI ownership and the closed governance catalog are
updated. Normal-host capture remains parent-owned. The isolated trial supplies
capture directly and uses the same store and renderer. Upstream UX approval and
canonical persistence remain separate from candidate acceptance.

The coordinator reuses persistent role contexts, matching accepted artifacts and
saved findings. Dependencies are ordered, unrelated roles can overlap, and a
rejected or stale wireframe cannot release current UI work. All source data and
new contributions remain reusable across interruption.

## First-pass measurements

These are complete native-client invocation windows, including input collection,
authoring, preview inspection and delivery. Columns and rows can overlap in wall
time; do not add them to obtain elapsed time. All later repairs and renderer
refreshes are additional work, reported separately in the final metrics.

| Element            | First wireframe author | First wireframe review | First UI author | First visual review |
| ------------------ | ---------------------: | ---------------------- | --------------: | ------------------- |
| Add dialog         |                  4m43s | 1m38s, pass            |           3m48s | 2m36s, revise       |
| Clip-update dialog |                  3m01s | 1m13s, pass            |           2m44s | 1m04s, pass         |
| Selection menu     |                  3m53s | 1m26s, pass            |           2m04s | 1m10s, pass         |
| Timeline           |                  9m33s | 2m18s, revise          |           5m31s | 2m19s, revise       |

First wireframe reviews passed **3/4**, versus **2/4** in the original pilot.
First visual reviews passed **2/4**, versus **0/4**. These are observed outcomes
for four elements, not statistically established pass rates or causal estimates.

The two visual rejections exposed missing renderer focus styles. The timeline
wireframe rejection concerned temporal alignment and a concrete successful Add
result; fixing it took **9m01s**, followed by a **1m38s** recheck. No timeline UI
author was dispatched against the rejected wireframe.

| Timeline first wireframe author window and its subsets                              |  Duration |
| ----------------------------------------------------------------------------------- | --------: |
| **Complete first author invocation**                                                | **9m33s** |
| ↳ Author-marked inspection and local corrections, included above                    |     3m42s |
| ↳ Recorded service execution, also included above and partly overlapping inspection |    9.907s |

The author expanded five required states to thirteen before first submission,
then fourteen during repair. This makes local scope and geometry construction
useful targets for the next optimization. We have no isolated command-generation
or pure-reasoning duration in normal client mode.

## Verification, limits and retained artifacts

- Full package gate: **557 tests passed**. Final verification after the renderer
  correction and experiment adjustments: **23 focused tests passed**, covering
  rendering/store/MCP, native lifecycle/resume and the metrics analyzer.
  Formatting and whitespace checks passed. The final metrics preserve all
  41 observed invocation records, including one failed/unclosed startup and one
  interrupted unsuccessful invocation, rather than counting them as successes.
- Browser regressions verify the saved overflow example, corrected dialog
  geometry, focused visual handles and disabled outlined controls. The complete
  trial has **19 independent review receipts**, with all eight latest
  wireframe/UI receipts passing and no unresolved blocking findings.
- All 11 UI assignments followed an exact matching wireframe pass. The local
  tests also verify rejected/stale revisions cannot release UI work, and that
  saved receipts and contributions survive resume. All protected input hashes
  matched at each completed run boundary; live Alexa state was not changed.
- Source UX remains **unreviewed**. Static previews do not verify live keyboard
  traversal, dragging, playback, persistence or transaction behavior. Broader
  negative/platform tests and a new upstream UX pass remain explicitly outside
  this plan. No new paid baseline, model proxy, or global agent installation was
  performed.
- Current wireframe receipts retain four nonblocking observations: crop feedback
  below the initial scroll view, crop wording in one neutral state, failure-focus
  sequence wording, and the selection summary's missing duration. Final visual
  receipts have no findings. These remain visible in the saved evidence.
- Available usage snapshots are preserved, but may be cumulative across resumed
  threads. No additive token/credit total or pure-reasoning estimate is claimed.

Public metrics include invocation phases, nested input/inspection windows,
contributions, review findings, exact gate evidence, layout checks, captures and
all recorded service HTTP/queue/operation measurements. Private artifacts and
native logs remain in `.codex-tmp/wireframe-ui-reliability-20260930/`; raw transcripts
and source packets are not committed. The generated local gallery points to the
accepted previews and receipts. All six implementation/confirmation stages are
complete; no rerun or additional approval is needed for this plan.

## Checkpoints

- `bb9c3b1` — Harden wireframe authoring handoffs.
- `15ae1a5` — Integrate reviewed wireframe-to-UI workflow.
- **Record wireframe/UI reliability results** — final checkpoint containing this
  report, measured evidence and the last renderer/analyzer corrections. The
  checkpoint adviser judged this a coherent completed workflow-evidence unit;
  its suggested message was preapproved by the invoked execution skill.

All checkpoints are local. Nothing was pushed or published.
