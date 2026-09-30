# Wireframe/UI defect prevention execution

Status: implementation and isolated exercises complete, 2026-09-30. Full saved Alexa confirmation is prepared but blocked before launch by automatic approval review. The plan is not complete. Governed by the personal independent-execution skill.

Plan: [defect prevention](wireframe-ui-defect-prevention-plan.md).

## Progress

- Instructions and prior reliability evidence loaded; original inputs and accepted artifacts remain untouched.
- Stages 0–3: numeric placement, source-to-result links, supported-state fixtures and browser checks implemented. Ten captures cover both themes, clipping/occlusion regressions and alignment at two widths. Source-review hashes are retained in `.codex-tmp/wireframe-prevention-inputs/provenance.json`.
- Stage 4: all three independent exercises passed their first wireframe and UI reviews: six passes, no rejected reviews, no invalid UI dispatches, and protected inputs unchanged. Four of six first rendered candidates were submitted unchanged. The geometry wireframe required two local corrections; the outcome wireframe received an optional spacing refinement. All three UI candidates were submitted unchanged.
- Stage 5: normal MCP and canonical UI paths share the helpers; role instructions and contracts updated. Package gate passed 566 tests and experiment harness passed 18. Subsequent small validation changes are checked with focused tests.
- Stage 6: original inputs and boundary inventory prepared for the four-element saved Alexa confirmation. Contracts/renderer frozen in `9fd6a0a`. Full replay has not started because automatic approval review requires direct user confirmation of the payload and destination; details below.

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

- Keep geometry product-independent: only numeric domains and positions in shared code. Product labels, units, endpoint conventions and business rules remain supplied data.
- Evidence links are compact references to existing source and rendered nodes. They do not introduce another requirements graph or prove all prose semantics. A visible-change link requires more than a status message.
- Browser regression fixtures are reduced failure mechanisms with private provenance, not verbatim copies of full corrected candidates. Corrected candidates are not supplied as answers to fresh authors.
- Retain independent wireframe review before UI and independent visual review afterward. No internal reviewer was added; first-construction corrections remain separately visible.
- Do not rerun a paid full product merely for instrumentation. Freeze shared code, use the saved original inputs, and preserve newly completed work for resume.
- Initial browser/package subprocess failures were sandbox restrictions; authorized local reruns passed. One early browser assertion incorrectly treated outline width alone as visibility and was corrected. Successful matrix timings exclude those failed setup attempts.

## Full confirmation: prepared, awaiting authorization

Attempt: `.codex-tmp/wireframe-ui-prevention-20260930`. It contains original product facts and the saved boundary inventory, without corrected candidate designs. No full-replay author has started and no live Alexa data has changed.

Automatic approval review rejected the launch twice. Its stated reason was that no trusted user message explicitly authorized sending the saved Alexa product/UX artifacts to OpenAI's external Codex service. The second request supplied plan lines 40–42 and 222–245 plus evidence that the normal installed Codex client is used and local model redirects are refused. Review still demanded direct user confirmation. That confirmation has been requested; elapsed time is not approval. No alternate execution route was attempted.

Once authorized, execute the already prepared attempt:

```powershell
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/run.mjs --execute --attempt=wireframe-ui-prevention-20260930 --elements=all
```

Then preserve first-candidate corrections/rejections, complete targeted repairs, and compare with the saved 78m20s reliability run. Full-product improvement is currently unmeasured. General negative testing, upstream UX review and worker-pool/prewarming experiments remain outside this plan.
