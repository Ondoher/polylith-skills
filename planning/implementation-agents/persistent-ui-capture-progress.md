# Persistent browser capture progress

Started: 5 October 2026. Governing [plan](persistent-ui-capture-plan.md).

Status: milestones 1–3 passed; timing comparison next. Capture prototypes and synthetic evidence are contained in
`.codex-tmp/persistent-ui-capture/run-2026-10-05/`. Existing design artifacts and
the earlier prepared branch's open review gate remain unchanged.

| Milestone                      | Status  | Evidence / next action                                                                                                                                                                               |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Frozen workload / baseline  | Passed  | `manifest.json`: 24 source-checked files, seven scenes / 14 variants; `reference-approved-results.json`: actual loaded-font references.                                                              |
| 2. Faithful persistent capture | Passed  | All 14 outputs visually inspected; both required font families loaded. Delayed-font success and missing-font failure verified in `fault-results-v2.json`.                                            |
| 3. Failure and recovery        | Passed  | Eight actual fault/isolation cases and eight subsequent source-identical captures; three browser generations. `protocol-results.json` verifies real JSON-lines calls, persisted resume and shutdown. |
| 4. Measured comparison         | Pending | Three rotating A/B/C rounds; startup and failures included.                                                                                                                                          |
| 5. Integration decision        | Pending | Reconcile real render evidence and independently review opt-in outputs if gates pass.                                                                                                                |

Questions and decisions are retained in the run's `decisions.json` and will be
included completely in the final execution summary. Timing estimates are progress
checkpoints; operation timeouts remain enabled to detect hangs.

The first fault harness incorrectly required all font waiting to occur in the
explicit readiness stage; Edge had already awaited the injected delay during
page load. The assertion was corrected to include both stages and retain a
successful loaded-face witness. The failed first attempt is preserved separately.
No visual or asset criterion was relaxed.
