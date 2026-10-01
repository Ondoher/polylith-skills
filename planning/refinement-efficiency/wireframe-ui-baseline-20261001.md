# Wireframe/UI first-review baseline

Status: baseline finished, **the finding-free goal was not met**. The isolated
run lasted **18m42.980s**, 2026-10-01 02:31:04.013–02:49:46.993 UTC. It follows the
completed [scope correction](wireframe-ui-scope-correction-execution.md).
Three first reviews completed: one pass with a nonblocking finding, two
rejections, and **zero finding-free reviews**. The existing acceptance/dependency
gates withheld the remaining work. No reviewer-directed repair was performed.

## Frozen experiment

- Code: `8cd6f65` (`Correct wireframe/UI impact selection`).
- Inputs: `.codex-tmp/wireframe-ui-scope-correction-20261001/fixture.json`.
- New output: `.codex-tmp/wireframe-ui-baseline-20261001/`.
- Update: Update Named Clip dialog, selection actions menu, timeline.
- Reuse without dispatch: Add dialog, Save Clip dialog, framing/background.
- Fresh author/reviewer threads and fresh outputs; prior repaired candidates are
  not supplied as first-pass solutions. Existing source facts and design language
  are reused. Upstream flow UX is not rerun and remains explicitly unreviewed.
- One persistent wireframe author (Sol/medium), one UI author (Astra/ultra), and
  separate independent wireframe/visual reviewers (Astra/ultra). Normal Codex
  connection, local MCP data service, no model proxy.
- One independent review attempt per element and stage. A rejection is retained
  as a baseline result, with no reviewer-directed repair in this run. Rejected
  wireframes do not proceed to UI. Other independent elements continue.

## Measurements and decisions

Record each first rendered candidate, local changes before submission, submitted
revision, review verdict and findings, and the timing of authoring and review.
Count nonblocking observations separately from blocking rejections: a pass with
findings is not a finding-free result. Keep overlapping role time separate from
elapsed turnaround. Retain all artifacts for later diagnosis and targeted repair.

The new baseline intentionally reruns authors rather than reusing repaired output:
the user wants evidence of first-pass reliability with current tooling. Freeze
shared implementation during the measurement. Tooling failures may be repaired
if needed to complete the test; record any such interruption/change separately.
Do not start another infrastructure project or change criteria to obtain passes.

One preparation mistake occurred before this run: invoking the runner with
`--help` (which it does not support) tried its default historical workspace and
stopped on missing source-linked scope, before any model call. It appended a
non-executing start event there; old artifact contents were not regenerated.
The measured baseline uses the explicit new attempt and corrected fixture.

## Results

| Interface                | First wireframe review                         | First UI review                                                        | Result                                                                                                    |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Update Named Clip dialog | Pass, one nonblocking focus finding            | Reject, one blocking focus finding and one nonblocking outline finding | Saved for later repair.                                                                                   |
| Timeline                 | Reject, two blocking behavior/example findings | Not dispatched                                                         | Early review gate prevented UI work on the rejected wireframe.                                            |
| Selection actions menu   | Not dispatched                                 | Not dispatched                                                         | Its existing dependency on accepted timeline wireframes was not satisfied. It has no first-review result. |

This is **1/2 wireframe reviews passing and 0/1 UI reviews passing**. Across the
three completed reviews there were three blocking and two nonblocking findings.
Those five observations represent four issue families: return focus was raised
twice. Neither an unrun stage nor a pass with findings counts as finding-free.
No selected interface completed both review stages successfully.

### What reviewers found

1. **Return focus was described but not shown.** Update Clip's dismissed scene
   leaves the Selection menu control in its default state, despite a stated
   intent to restore focus there. The wireframe reviewer treated this as
   nonblocking; the visual reviewer rejected the same omission. This exposes
   inconsistent blocking decisions and a defect that survived the early gate.
2. **An enabled secondary-button outline did not match the frozen design language.**
   The visual reviewer marked the faint divider-colored border as a nonblocking
   discrepancy. The responsible authoring/default-rendering mechanism has not
   been diagnosed in this run.
3. **The timeline illustrated a different trim operation from the source.**
   One staged operation moved both Start and End, while the assigned action
   specifies editing one boundary and preserving End during a Start trim.
4. **The ungroup example contradicted inclusive frame boundaries.** Adjacent
   illustrated parts shared an inclusive endpoint, while supposedly excluded
   material also met the retained interval at included boundary frames. Correct
   coordinate alignment did not establish correct example semantics.

Raw findings and exact source/renderer bindings are preserved in
[baseline metrics](wireframe-ui-baseline-20261001-metrics.json) and the private
review receipts. These are observed reviewer results, not a new independent
adjudication or a claim that changing review thresholds would fix the designs.

### Construction before review

| Candidate             | First rendered → first submitted revision | Local work after first render                                                                                                                                       | First render → submission |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------: |
| Update Clip wireframe | r3 → r5                                   | One revision batch: conditional success/failure copy and missing dismissal action reference.                                                                        |                 1m07.090s |
| Update Clip UI        | r1 → r2                                   | One layout adjustment: return scene changed from flex to grid.                                                                                                      |                 2m20.961s |
| Timeline wireframe    | r5 → r15                                  | Five revision batches: text fitting, an outcome reference and example positions, focus/selection states, a missing cancellation result, and consistent part naming. |                 5m01.783s |

All three candidates changed after their first preview. Revision batches mix
defect corrections and refinements; they are not seven independent blocking
review failures. Earlier unfinished contributions are incremental construction,
not rework. Timeline scene count grew from nine to ten. Its first two previews
had text-overflow warnings; its final captures had none. Structured coverage and
geometry checks still did not catch the two semantic example errors.

Private `preview-change-evidence.json` records exact before/after field changes.
No feedback from reviewers was fed into this baseline's authoring after a review.

## Timing, in execution order

The rows below are sequential windows. Concurrent work is shown **inside** its
containing row; it must not be added to that row's elapsed time.

| Execution window                                      |        Elapsed | Work inside this window                                                                                                                                        |
| ----------------------------------------------------- | -------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Update Clip wireframe author                       |      4m07.487s | Inputs, authoring, local inspection/correction, submission and final response.                                                                                 |
| 2. Timeline wireframe author                          |     11m01.594s | Timeline inputs, construction and local corrections. **Concurrently:** Update Clip wireframe review 1m45.075s → UI author 4m53.925s → visual review 2m14.972s. |
| 3. Timeline wireframe review                          |      3m33.458s | Independent first review; rejection also withheld dependent menu work.                                                                                         |
| **Whole runner window, including orchestration gaps** | **18m42.980s** | Six completed native invocations; three author assignments and three reviews.                                                                                  |

The author input/submission measurements are nested inside their role windows:

| Author                | Start → inputs ready | Inputs ready → submission |
| --------------------- | -------------------: | ------------------------: |
| Update Clip wireframe |              52.798s |                 3m03.168s |
| Timeline wireframe    |            1m09.948s |                 9m42.458s |
| Update Clip UI        |            1m04.092s |                 3m37.692s |

Ten preview renders totaled 229.401ms of measured rendering; ten browser captures
totaled 19.756s. These operations are already inside author/tool windows.
Author inspection markers can contain contribution and capture work, so they
are not pure visual-inspection or reasoning durations. Native timing and usage
snapshots remain in the metrics; cumulative usage semantics are not established,
so no additive token or credit estimate is made.

This 18m43s run is shorter in scope than a fully repaired/accepted run: timeline UI
and the menu were withheld. It is **not evidence of an end-to-end speedup**.
The primary result is first-review reliability, which remains below the goal.

## Preservation, verification and next decision

The runner completed normally with status `review-incomplete`, not a process
crash. All six native invocations exited successfully. Two capability calls were
rejected (a timing marker and an input read) and recovered; the server attributed
them to `coordinator`, so they are recorded separately from per-author failed-call counts.
There were zero invalid UI dispatches. Hash checks confirm that the corrected
fixture, copied source UX, and live human Alexa description remain unchanged.
Shared code, model settings and reviewer criteria stayed frozen during the run.

The [local gallery](../../.codex-tmp/wireframe-ui-baseline-20261001/index.html) links
saved candidates; it is an inspection aid, not accepted publication. Candidate
and receipt files remain beneath `workspace/outputs/` in the attempt directory:
Update Clip wireframe r5/UI r2, and timeline wireframe r15. Preserve all earlier
revisions and the three review receipts. Upstream flow UX remains unreviewed.

No shared implementation changes or broad test/review rounds were introduced for
this baseline. Metrics were generated from the existing analyzer and augmented
with explicit baseline counts, withheld-stage reasons and the recovered protocol
errors. The next decision is how to prevent these specific failures at construction
time. The saved evidence is ready for that discussion; no repair run has started.

## Questions and decisions

| Question                                                                 | Decision                                                                                                                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse previous repaired candidates or create a new baseline?             | Fresh author outputs and role threads, using existing resolved source facts and design language. Repaired candidates would not measure first-pass reliability. |
| Which UX stage is being exercised?                                       | The current wireframe-to-UI experiment. Do not rerun upstream flow UX; retain its explicit unreviewed status.                                                  |
| Should a rejected design be repaired during this measurement?            | No. One first review per stage preserves the requested baseline. Keep author-local pre-submission changes visible.                                             |
| Should a nonblocking finding count as success?                           | Count the pass verdict, but not as finding-free. Record all findings separately by blocking status.                                                            |
| Should rejected wireframes or blocked dependencies be forced downstream? | No. Preserve existing gates. Timeline UI and both menu stages remain unmeasured, not failures of their authors.                                                |
| Should code or criteria change to improve this run's results?            | No. Keep the baseline frozen. No infrastructure repair was needed during execution.                                                                            |
| How should earlier work and live data be handled?                        | Preserve them; write to the new attempt only and verify protected input hashes afterward.                                                                      |
| How should model calls be made?                                          | Normal Codex client, local MCP data service, no model proxy.                                                                                                   |
| What is next?                                                            | Discuss the observed failure families using these saved candidates before authorizing another implementation or repair experiment.                             |

## Checkpoint

The checkpoint adviser recommended saving this completed evidence unit with the
preapproved message **Record wireframe/UI first-review baseline**. Changed-file
formatting, whitespace checks and the saved-metric consistency checks passed.
No shared implementation was edited and no broad package rerun was needed.
No push.
