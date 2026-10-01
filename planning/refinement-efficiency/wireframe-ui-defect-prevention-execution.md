# Wireframe/UI defect prevention execution

Status: implementation, isolated exercises and the corrected-scope
[baseline including rework](wireframe-ui-baseline-completion-20261001.md) are
complete. The finding-free target remains unmet. No run is currently active.
Preserve the saved attempts and measurements as experimental evidence. The
original four-element scope is superseded by three updates and three reused
interfaces. Historical execution details follow.

Subsequent fresh measurement: the [initial segment](wireframe-ui-baseline-20261001.md)
was incorrectly stopped after first reviews. The user clarified that the baseline
must include rework, and the saved run resumed to acceptance of all three selected
interfaces. Total active elapsed time was 57m51s. First reviews passed 2/6 times,
none finding-free; the complete sequence included five rejections. Matched agent
work was 90m36s versus 74m11s in the earlier attempt. Shared implementation stayed
frozen. See the complete baseline report for comparison limits and measurements.

Plan: [defect prevention](wireframe-ui-defect-prevention-plan.md).

## Progress

- Instructions and prior reliability evidence loaded; original inputs and accepted artifacts remain untouched.
- Stages 0–3: numeric placement, source-to-result links, supported-state fixtures and browser checks implemented. Ten captures cover both themes, clipping/occlusion regressions and alignment at two widths. Source-review hashes are retained in `.codex-tmp/wireframe-prevention-inputs/provenance.json`.
- Stage 4: all three independent exercises passed their first wireframe and UI reviews: six passes, no rejected reviews, no invalid UI dispatches, and protected inputs unchanged. Four of six first rendered candidates were submitted unchanged. The geometry wireframe required two local corrections; the outcome wireframe received an optional spacing refinement. All three UI candidates were submitted unchanged.
- Stage 5: normal MCP and canonical UI paths share the helpers; role instructions and contracts updated. Package gate passed 566 tests and experiment harness passed 18. Subsequent small validation changes are checked with focused tests.
- Stage 6: the original four-element confirmation is preserved as historical evidence. Following scope correction, the fresh three-interface baseline resumed through all necessary repairs and acceptance with implementation frozen at `8cd6f65`. Normal Codex connection, no model proxy. Full measurements are linked above; first-pass quality did not improve in this sample.

## Decisions

| Question                                      | Decision and reason                                                                                                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How broad should geometry support be?         | One numeric domain on a layout region and numeric positions on its children. Shared arithmetic owns coordinates; surrounding layout and product semantics remain authored.                                 |
| How should outcomes be checked?               | Link existing source paths to rendered nodes; compare structured expectations when supplied. Prose correctness remains author/reviewer judgment. No second requirements graph or business-word heuristics. |
| How should existing failures become fixtures? | Reduce the recorded failure mechanisms to neutral examples, preserve provenance hashes privately, and verify the broken and corrected behavior in the browser.                                             |
| Should this add an internal reviewer?         | No. Deterministic construction and the existing preview inspection precede independent wireframe and UI reviews. Any local defect correction still counts against first-construction success.              |

## Measurement

Additional execution decisions:

- An outline-width declaration is insufficient: this browser reported a width even with `outline-style:none`. The probe checks style, bounds, clipping and sampled occlusion; screenshots are also inspected. It is a fixture check, not proof for every possible layout.
- The first author called finish before required scene IDs existed, then created redundant aliases. Clarified using required IDs directly and saving unfinished contributions without finish. Recorded as overhead rather than a defect in the first rendered candidate.
- Scalar evidence must bind a parameter the template actually displays. An unused metadata field cannot prove a visible result. Exact source values are checked; prose remains a judgment question.
- Numeric placement owns horizontal extent. Conflicting width constraints require local repair instead of silently changing alignment.
- Sandbox subprocess errors were resolved by rerunning the local browser/package commands with authorized subprocess permissions. No model redirect or live-product mutation was introduced.

First rendered candidates, immutable revisions and review receipts are retained. Native intervals include model/tool orchestration and are not pure reasoning time. Role windows may overlap; nested inspection windows must not be added to their parent durations. A small successful sample does not establish that future failures will be rare. Upstream UX remains unreviewed.

## Checkpoints and verification

The geometry author's first preview required two local corrections: separating
a marker label into its own row and expanding the viewport from 260 to 320px.
These are first-construction defects, even though its independent wireframe
review passed. The shared numeric values aligned; vertical layout/viewport
budgeting still required judgment. The handoff now explicitly distinguishes
numeric positioning from vertical space allocation. Original revisions 2–4
remain saved in `.codex-tmp/prevention-geometry-20260930/workspace/outputs/geometry`.

Component-state trial: `.codex-tmp/prevention-states-20260930`, [saved metrics](wireframe-prevention-states-metrics.json). Sequential role windows: wireframe author 136.969s; wireframe review 81.036s; UI author 145.038s; UI review 79.740s. Nine scenes (including redundant aliases), both first reviews passed, zero invalid UI dispatches, protected inputs unchanged.

Local browser captures: initial completed set 29.169s; expanded state-matrix set 37.574s; final ten-capture set 34.186s. These measure browser startup/capture, not model reasoning. [Browser metrics](wireframe-prevention-browser-metrics.json) retain per-capture timings and fixture/screenshot hashes. Screenshots remain under timestamped directories in `.codex-tmp/wireframe-prevention-browser/`. `npm run test:wireframe:browser` runs the explicit browser verification; ordinary package tests avoid repeating that matrix.

Implementation checkpoint: `9fd6a0a` — `Prevent wireframe/UI outcome and geometry defects`. The adviser recommended the evidence checkpoint `Record wireframe defect-prevention exercises`, covering the completed trials independently of the pending full confirmation. Both use the user's preapproved local-checkpoint policy; no push.

Verification: 566 package tests and 18 harness tests passed at the integration milestone. Later small validation changes passed focused checks (34, then 9). These are overlapping checks, not additional unique test counts; the full package gate was not rerun after those final changes. Normal MCP checks cover retained invalid drafts and targeted repair, and canonical UI checks cover numeric placement. Product-neutral audit, whitespace checks and the final repository-wide formatting check passed.

## Isolated timings and construction evidence

Each column is an independent exercise with fresh role contexts. Within each column the four role windows ran sequentially; the total contains those rows plus small orchestration gaps.

| Execution order / scope                 | Component states | Numeric geometry | Concrete outcome |
| --------------------------------------- | ---------------: | ---------------: | ---------------: |
| 1. Wireframe author                     |        2m16.969s |        3m11.497s |        2m24.622s |
| 2. Wireframe reviewer                   |        1m21.037s |          52.136s |          56.471s |
| 3. UI author                            |        2m25.037s |        1m46.740s |        2m27.346s |
| 4. UI reviewer                          |        1m19.740s |        1m20.153s |        1m06.343s |
| **Whole exercise, containing rows 1–4** |    **7m22.904s** |    **7m10.649s** |    **6m54.913s** |

Inspection is already included in authoring above; do not add these times again:

| Nested subset                       | Component states | Numeric geometry | Concrete outcome |
| ----------------------------------- | ---------------: | ---------------: | ---------------: |
| Within wireframe author: inspection |          13.885s |          56.573s |          28.367s |
| Within UI author: inspection        |          28.351s |          14.739s |          24.178s |

Saved per-call, role, revision and review evidence:
[states](wireframe-prevention-states-metrics.json),
[geometry](wireframe-prevention-geometry-metrics.json),
[outcome](wireframe-prevention-outcome-metrics.json).
Usage snapshots may be cumulative; no additive credit estimate is asserted.

- **States:** wireframe first preview r4 and UI r1 submitted unchanged. The earlier missing-ID finish attempt and redundant aliases are pre-preview protocol overhead. Nine scenes remain in the evidence.
- **Geometry:** wireframe r2 → r3 → r4 contained the two defects described above; UI r1 submitted unchanged. Three scenes, ten positioned nodes, three outcome links. Shared numeric alignment worked; vertical spacing still required judgment.
- **Outcome:** wireframe r2 → r3 reduced viewport heights from 430/360/450 to 300/230/315px. Parts, content and outcome evidence were unchanged, and both previews had no geometry warnings. The author's public inspection note identified excessive empty space. This was optional spacing refinement, not a missing-outcome defect, but its extra render/inspection cost remains measured. The initial preview already showed the new record and retained input after failure. UI r1 submitted unchanged; three scenes.

Immutable revisions/screenshots remain under `.codex-tmp/prevention-{states,geometry,outcome}-20260930/workspace/outputs/`. Revision differences and public inspection notes were used for classification; private reasoning was not inspected.

## Further decisions

- Standing user rule reaffirmed: use the normal Codex connection. A local model proxy, redirect or model-request observer may be used only when the user specifically requests it for the run; autonomous execution and performance measurement do not imply that request. Ordinary Codex model use is authorized by the workflow request and does not require a separate permission question. This is recorded in repository `AGENTS.md`. The local MCP data service remains allowed.
- Keep geometry product-independent: only numeric domains and positions in shared code. Product labels, units, endpoint conventions and business rules remain supplied data.
- Evidence links are compact references to existing source and rendered nodes. They do not introduce another requirements graph or prove all prose semantics. A visible-change link requires more than a status message.
- Browser regression fixtures are reduced failure mechanisms with private provenance, not verbatim copies of full corrected candidates. Corrected candidates are not supplied as answers to fresh authors.
- Retain independent wireframe review before UI and independent visual review afterward. No internal reviewer was added; first-construction corrections remain separately visible.
- Do not rerun a paid full product merely for instrumentation. Freeze shared code, use the saved original inputs, and preserve newly completed work for resume.
- Initial browser/package subprocess failures were sandbox restrictions; authorized local reruns passed. One early browser assertion incorrectly treated outline width alone as visibility and was corrected. Successful matrix timings exclude those failed setup attempts.

## Full confirmation: saved attempts; scope correction required

Attempt: `.codex-tmp/wireframe-ui-prevention-20260930`. It contains original product facts and the saved boundary inventory, without corrected candidate designs. The wireframe author started at 2026-09-30T22:42:15.248Z. No live Alexa data is changed.

Automatic approval review initially rejected the launch twice. Its stated reason was that no trusted user message explicitly authorized sending the saved Alexa product/UX artifacts to OpenAI's external Codex service. The second request supplied plan lines 40–42 and 222–245 plus normal-client evidence. The user then clarified that ordinary Codex model use is authorized and should not prompt repeated permission questions. With that new user authorization, the same command was approved and launched. No alternate execution route or model proxy was introduced. This distinction is recorded in repository `AGENTS.md`.

Execution command:

```powershell
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/run.mjs --execute --attempt=wireframe-ui-prevention-20260930 --elements=all
```

Before any further resume, consume the completed scope-correction handoff and
retain all first-candidate corrections/rejections. Compare timings only with their
actual scope and reuse status stated. Full-product improvement is currently
unmeasured. General negative testing and worker-pool/prewarming experiments remain
outside this plan; source conflicts and upstream approval status must be resolved
or explicitly retained in the corrected handoff.

### Construction and review findings

The full confirmation has already missed the zero-defect target. Shared numeric
alignment and concrete changed outcomes passed the timeline review, but focus
ownership and endpoint semantics still required judgment and repair. The isolated
six first-review passes did not predict the full product's first-review results.
Minimal anonymized counterexamples are retained in
[failure reproductions](experiments/wireframe-ui-pilot/prevention-reproductions.md).

- **Clip update:** wireframe r4 → r6 → r8 repaired overlapping comparison rows,
  a missing Cancel action reference and an overlong label. UI r1 → r2 changed the
  editor-return layout from flex to grid because the message was cramped. Both
  first external reviews passed, but those local corrections remain defects.
- **Timeline:** wireframe r12 → r14 → r16 → r18 repaired clipped messages, a
  missing visible Cancel result, and state overrides lost while replacing a
  reusable part. First wireframe review rejected simultaneous keyboard-focus
  targets; r20 passed. First UI review rejected adjacent ranges sharing an
  inclusive boundary. The r24 repair corrected labels but left a one-frame visual
  gap, so wireframe review rejected it again. Wireframe r26 and UI r2 then passed.
  Four wireframe reviews and two visual reviews were required.
- **Selection menu:** wireframe r5 → r7 widened the result view, increased field
  height and enlarged a return viewport after text crowded controls. The first
  wireframe review passed. UI r1 was submitted without local changes, but its
  first visual review rejected the same inclusive-boundary example. Wireframe
  r9 and UI r2 passed their targeted rechecks.
- **Add dialog:** resumed from the saved r3 contribution after an interrupted
  author invocation. Its first preview r7 contained twenty scenes. Inspection
  found an eight-second chooser value inconsistent with a nine-frame illustrated
  result; the correction is recorded before external review, not counted as
  prevention. Final results are pending.

The observed renderer focus-visibility failures from the preceding reliability
trial have not recurred. Several simultaneously focused targets are a different
failure from an invisible focus indicator. Numeric coordinate alignment likewise
does not establish whether inclusive sample labels and occupied edges agree.
No new product-specific default or shared renderer change was introduced during
this confirmation.

### Long authoring interruption and recovery

The original Add-dialog invocation ran for **37m07.768s** before interruption.
Three contributions had been saved, but no preview was ready. Existing native
metadata showed two unusually long unfinished/finishing call windows:

| Nested observation within that invocation       |       Time | Saved data / local execution                              |
| ----------------------------------------------- | ---------: | --------------------------------------------------------- |
| Reasoning-item first to last observation        |  4m14.364s | Item metadata only; not a complete reasoning-time measure |
| Function item first observed → native MCP start |  9m55.234s | 3,823-byte contribution; 7.892ms service execution        |
| Following function item → native MCP start      |    38.583s | 12,605-byte contribution; 5.731ms service execution       |
| Later unfinished function item → interruption   | 11m35.189s | No completed payload-size measurement                     |

These intervals are subsets, not additional elapsed stages. The first long call's
raw arguments were 3,991 bytes, including 244 whitespace characters; payload size
and local writing do not explain the delay. The logs cannot separate generation,
scheduling and stream stalls. Context compaction was observed between the calls;
that is correlation, not a demonstrated cause. An earlier commentary conflated
the 3.8KB and 12.6KB calls; the table corrects it.

I interrupted only that native author process after the second extended window,
preserving its draft and allowing queued repairs to proceed. The first coordinator
run ended after **78m11.958s** with two accepted elements and saved unresolved work.
The same attempt resumed; accepted results were reused rather than regenerated.
The timeline needed one more targeted repair than the original three-review cap
allowed, so the experimental runner now accepts an explicit `--review-attempts`
budget. The default remains three; this recovery used four and retained every
rejection and the exact acceptance checks:

```powershell
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/run.mjs --execute --resume --attempt=wireframe-ui-prevention-20260930 --elements=all --review-attempts=4
```

The analyzer now retains an interrupted first author in each element's elapsed
acceptance span. Completed-process unions still exclude unsuccessful invocations
and are explicitly labeled; they must not substitute for total turnaround.
A focused regression verifies both interruption time and the gap before resume.

[Diagnostic metadata](wireframe-ui-prevention-20260930-diagnostics.json) preserves
the exact boundaries, sizes and last-request usage observations. The new
[native metadata extractor](experiments/wireframe-ui-pilot/native-item-observations.mjs)
reads existing logs without a model proxy or extra model request. It retains no
private reasoning, arguments, credentials or item identifiers. Two process-counter
samples established activity, not network throughput. A rejected out-of-scope
result read recovered through the assigned source packet.
