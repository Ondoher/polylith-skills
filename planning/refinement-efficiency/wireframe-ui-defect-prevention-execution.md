# Wireframe/UI defect prevention execution

Status: in progress, 2026-09-30. Governed by the personal independent-execution skill.

Plan: [defect prevention](wireframe-ui-defect-prevention-plan.md).

## Progress

- Instructions and prior reliability evidence loaded; original inputs and accepted artifacts remain untouched.
- Stages 0–3: numeric placement, source-to-result links, supported-state fixtures and browser checks implemented. Ten captures cover both themes, clipping/occlusion regressions and alignment at two widths. Source-review hashes are retained in `.codex-tmp/wireframe-prevention-inputs/provenance.json`.
- Stage 4: component-state exercise passed both first reviews. Its first rendered candidates were submitted unchanged. Geometry wireframe also passed its first review; UI work is running. Outcome exercise follows with fresh task context.
- Stage 5: normal MCP and canonical UI paths share the helpers; role instructions and contracts updated. Package gate passed 566 tests and experiment harness passed 18. Subsequent small validation changes are checked with focused tests.
- Next: complete isolated trials, freeze contracts/renderer, then run the four-element saved Alexa confirmation.

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

First rendered candidates, immutable revisions and review receipts will be retained. Native intervals include model/tool orchestration and are not pure reasoning time. Role windows may overlap; nested inspection windows must not be added to their parent durations.

## Checkpoints and verification

The geometry author's first preview required two local corrections: separating
a marker label into its own row and expanding the viewport from 260 to 320px.
These are first-construction defects, even though its independent wireframe
review passed. The shared numeric values aligned; vertical layout/viewport
budgeting still required judgment. The handoff now explicitly distinguishes
numeric positioning from vertical space allocation. Original revisions 2–4
remain saved in `.codex-tmp/prevention-geometry-20260930/workspace/outputs/geometry`.

Component-state trial: `.codex-tmp/prevention-states-20260930`, [saved metrics](wireframe-prevention-states-metrics.json). Sequential role windows: wireframe author 136.969s; wireframe review 81.036s; UI author 145.038s; UI review 79.740s. Nine scenes (including redundant aliases), both first reviews passed, zero invalid UI dispatches, protected inputs unchanged.

Local browser captures: initial completed set 29.169s; expanded state-matrix set 37.574s. These measure browser startup/capture, not model reasoning. Measurements and screenshots remain under `.codex-tmp/wireframe-prevention-browser/`. `npm run test:wireframe:browser` runs the explicit browser verification; ordinary package tests avoid repeating that matrix.

Local checkpoints pending. Full confirmation follows successful isolated exercises. General negative testing, upstream UX review and worker-pool/prewarming experiments remain outside this plan.
