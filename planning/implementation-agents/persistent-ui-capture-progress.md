# Persistent browser capture progress

Started: 5 October 2026. Governing [plan](persistent-ui-capture-plan.md).

Status: all five experiment milestones passed; managed integration remains a separate unit.
Prototype and raw synthetic evidence remain under
`.codex-tmp/persistent-ui-capture/run-2026-10-05/`. Existing design artifacts and
the earlier prepared branch's open review gate remain unchanged.

| Milestone                      | Status | Evidence / next action                                                                                                                                                                               |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Frozen workload / baseline  | Passed | `manifest.json`: 24 source-checked files, seven scenes / 14 variants; `reference-approved-results.json`: actual loaded-font references.                                                              |
| 2. Faithful persistent capture | Passed | All 14 outputs visually inspected; both required font families loaded. Delayed-font success and missing-font failure verified in `fault-results-v2.json`.                                            |
| 3. Failure and recovery        | Passed | Eight actual fault/isolation cases and eight subsequent source-identical captures; three browser generations. `protocol-results.json` verifies real JSON-lines calls, persisted resume and shutdown. |
| 4. Measured comparison         | Passed | Three rotating rounds, 126/126 successful captures; `assessment.json`: A/B/C medians 137.2 / 99.5 / 27.5 seconds.                                                                                    |
| 5. Integration decision        | Passed | Isolated opt-in native render contract and actual independent pass, 14/14 screenshots; `opt-in-acceptance.json`. Separate managed integration recommended.                                           |

Questions and decisions are retained in the run's `decisions.json` and are
included completely in the final execution summary. Timing estimates are progress
checkpoints; operation timeouts remain enabled to detect hangs.

The first fault harness incorrectly required all font waiting to occur in the
explicit readiness stage; Edge had already awaited the injected delay during
page load. The assertion was corrected to include both stages and retain a
successful loaded-face witness. The failed first attempt is preserved separately.
No visual or asset criterion was relaxed.

Milestone 4 is now passed: `benchmark-results.json` / `assessment.json` retain
126/126 successful captures and median A/B/C batch times of 137.2 / 99.5 / 27.5
seconds, including startup and shutdown. Browser reuse alone reduced the median
by 72.4%; the practical change versus the original helper reduced it by 80.0%.
Eleven tiny rounded-border variations were inspected individually without a
whole-image tolerance. Final recorded worker browser PIDs were all absent.

Milestone 5 passed: the isolated opt-in `DesignUiReview` subject validates the
actual final C images and copied current source/UX/foundation/render inputs.
The actual independent reviewer inspected all 14 required screenshots and returned
`pass` with no actionable findings. Parent `requirePassing` validation succeeded;
`opt-in-acceptance.json` records this isolated experimental review. The previous
trial's acceptance gate remains unchanged. See [readiness](persistent-ui-capture-readiness.md).

Recommendation: adopt the persistent-browser boundary in a separate managed
integration unit; keep this prototype temporary and the original helper available.
Raw final summary: `.codex-tmp/persistent-ui-capture/run-2026-10-05/execution-summary.md`.
All 16 questions/decisions and actual evidence limits are retained there.

Local checkpoint: `890a885` records the rule, plan and milestones 1–3. The final
result checkpoint uses the advised message
`docs: record persistent capture experiment results`; resolve its hash through
Git history. No push or global installation occurred.
