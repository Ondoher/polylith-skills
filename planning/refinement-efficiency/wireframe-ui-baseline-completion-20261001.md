# Complete wireframe/UI baseline, including rework

Status: **complete through independent acceptance of all three interfaces**.
Active elapsed time was **57m51.315s**, including the initial segment and resumed
repairs. The finding-free goal is **not met**. Compared with the same three
interfaces in the preceding defect-prevention attempt, cumulative agent work
increased **22.1%**, and first-review passes fell from **3/6 to 2/6**.
This run does not demonstrate improved first-pass reliability or less agent work.

The user clarified that the baseline must include rework to judge improvement.
Stopping after one review was an assistant scope mistake. The
[initial 18m42.980s segment](wireframe-ui-baseline-20261001.md) was resumed from
saved drafts, threads and receipts; its costs and failures were not discarded.

## Scope and execution

- Frozen implementation: `8cd6f65`, following the
  [scope correction](wireframe-ui-scope-correction-execution.md).
- Updated: Update Named Clip dialog, timeline, selection actions menu.
  Add dialog, Save Clip dialog and framing/background remained reused.
- One persistent wireframe author, Sol/medium; one UI author and two independent
  reviewers, Astra/ultra. Normal Codex connection and local MCP data service;
  no model proxy, redirect or performance observer.
- Preserved source facts, design language and review criteria. Applied targeted
  reviewer-directed changes without modifying shared implementation.
- Accepted wireframe revisions before releasing dependent UI. Independent
  author/reviewer work overlapped through the existing role queues.
- This tests the wireframe-to-UI stages. Upstream flow UX remains explicitly
  unreviewed; this is not full refine-design completion or production approval.

Resume command:

```powershell
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/run.mjs --execute --resume --attempt=wireframe-ui-baseline-20261001 --elements=all --review-attempts=4
```

## Results, including repair

| Interface      | First wireframe review                                              | First UI review                  | Reviewer-directed work                                                                                   | Accepted revisions   |
| -------------- | ------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------- |
| Update Clip    | Pass with return-focus observation                                  | Reject: return focus not shown   | One UI repair                                                                                            | Wireframe r5; UI r3  |
| Timeline       | Reject: trim behavior and inclusive boundaries                      | Reject: Ungroup outside its menu | Two wireframe repairs and two UI updates/repairs; the first UI update introduced simultaneous focus cues | Wireframe r27; UI r4 |
| Selection menu | Reject: selectable result and middle-cut fragments not demonstrated | Pass with outline observation    | One wireframe repair before UI                                                                           | Wireframe r15; UI r1 |

There were **12 independent reviews: seven passes and five rejections**. The six
first reviews produced two passes, four rejections and **zero finding-free
results**. All blocking findings were resolved in the final accepted UI outputs.

The final UI reviews retain one shared **nonblocking secondary-button outline
discrepancy**: the renderer uses a faint divider border instead of the frozen
body-text border. The accepted Clip and timeline wireframes also retain focus
observations subsequently corrected in their UI overrides. Acceptance does not
mean every artifact has zero observations.

Two issues were identified by wireframe review as nonblocking, then rejected by
UI review: Clip's absent return-focus cue and timeline's simultaneous object/menu
focus cues. The early gate identified these issues but did not prevent downstream
rework. Ungroup's missing menu context was first caught by UI review. The menu's
missing selectable objects and middle-cut fragments were caught before UI.

## Elapsed time

These are sequential runner segments, **not nested stage totals**:

| Segment                                                       | UTC boundaries, 2026-10-01 | Active elapsed |
| ------------------------------------------------------------- | -------------------------- | -------------: |
| Initial authoring and first reviews                           | 02:31:04.013–02:49:46.993  |     18m42.980s |
| Resume through repairs, remaining authoring and final reviews | 13:17:21.811–13:56:30.146  |     39m08.335s |
| **Total active elapsed**                                      | **Both segments added**    | **57m51.315s** |

The interval between segments was **10h27m34.818s**, during the user-discussion
pause. It is reported but excluded from active processing. The full calendar
span was 11h25m26.133s. Parent reporting/checkpoint work after completion is also
outside the runner measurements.

## Where the work went, compared with the earlier run

The following rows are disjoint categories of **cumulative native agent work**.
Agents overlapped, so their total is **not elapsed turnaround** and must not be
added to the elapsed table above. Reading, generation, inspection, waiting and
tool execution are included; none of these totals measures pure reasoning.

| Work category                                          | Earlier, same three interfaces | Current baseline |
| ------------------------------------------------------ | -----------------------------: | ---------------: |
| First authoring, including local inspection/correction |                     36m11.797s |       37m15.122s |
| First independent reviews                              |                     11m47.111s |       15m30.588s |
| Authoring repairs and dependent UI updates             |                     14m33.936s |       23m32.683s |
| Re-reviews                                             |                     11m38.470s |       14m17.590s |
| **Total agent work**                                   |                 **74m11.314s** |   **90m35.983s** |

Each column contains six initial author assignments, six follow-up author
assignments, six first reviews and six re-reviews. Follow-up authoring is counted
as repair even when an older runner log calls a dependent UI restart
`author-start`. Initial construction is not relabeled as review-driven rework.

| Interface      | Earlier agent work | Current agent work |
| -------------- | -----------------: | -----------------: |
| Update Clip    |         12m24.676s |         16m53.792s |
| Timeline       |         39m32.793s |         49m24.424s |
| Selection menu |         22m13.845s |         24m17.767s |

The largest increase was author repair: **8m58.747s more**. The timeline accounts
for about 55% of current agent work. Its menu-context wireframe repair alone took
8m37.334s, followed by review, UI update and another focus correction. Correcting
the work list avoided unrelated Add-dialog authoring, but did not make these
retained interfaces more reliable in this sample.

The comparator is the saved `wireframe-ui-prevention-20260930` attempt: these
three interfaces were accepted there, despite unrelated Add-dialog work remaining
unresolved. It had three first-review passes out of six, including two
finding-free reviews. The current outputs have 29 scenes versus its 32. Source
packets, illustrated coverage and resume history differ; one run per condition
does not establish a causal regression or a stable performance ratio.

The broader four-interface pilot (107m44.467s) and reliability trial
(78m19.792s from first author to final acceptance) are historical context, not
matched elapsed-time baselines. Their scope and recovery work differ.

### Additional observations

- **26 previews/captures:** measured render computation totaled 0.810s;
  browser captures totaled 55.066s. These are nested within agent/tool windows.
- **420 recorded MCP service calls:** cumulative service handling was 63.447s,
  including captures; the largest call was 3.612s. This excludes unobserved
  client/model preparation and is not an end-to-end network measurement.
- Two rejected capability calls occurred in the initial segment and recovered.
  There were no new service failures during continuation, and all 24 native
  invocations completed. These are separate from five design-review rejections.
- After saving the menu's passing wireframe re-review, its agent took
  **2m04.724s** to finish the native turn, with no further tool calls recorded.
  UI dispatch waited for turn completion. The cause within this gap is unknown;
  do not label it as reasoning or network latency.
- Native-process union was 57m48.935s, contained within active runner time.
  Usage snapshots are retained but not summed into token or credit estimates
  because cumulative accounting across resumed threads is not established.

## Questions and decisions

| Question                                                               | Decision and reason                                                                                                                                  |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Restart after the user's correction?                                   | Resume the same baseline, retaining initial costs and failures.                                                                                      |
| Stop on the next rejection?                                            | Continue repair and re-review to acceptance using the existing four-review budget; it was sufficient.                                                |
| Change implementation, models or review thresholds to improve results? | Keep them frozen to measure current behavior; repair only assigned artifacts.                                                                        |
| Fix the renderer's nonblocking outline issue during this run?          | Preserve it for follow-up; changing the renderer would change the baseline.                                                                          |
| Add the newly requested translation-layout rule now?                   | Keep it in follow-up notes; do not introduce a new criterion mid-run.                                                                                |
| Compare against the old four-interface total?                          | Compare matched three-interface agent work; broader elapsed times are historical context.                                                            |
| Reintroduce detailed model instrumentation?                            | Use saved normal-client/MCP events; no model proxy or additional paid replay.                                                                        |
| Run broad code reviews or tests?                                       | No implementation changed. Verify artifacts, protected inputs, frozen code and report consistency; use the checkpoint adviser for the evidence unit. |

## Evidence and verification

- [Full metrics](wireframe-ui-baseline-completion-20261001-metrics.json) and
  [matched comparison](wireframe-ui-baseline-completion-20261001-comparison.json).
  The [initial metrics](wireframe-ui-baseline-20261001-metrics.json) remain unchanged.
- Private append-only events, every artifact revision, exact review receipts,
  screenshots, native results and gallery:
  `.codex-tmp/wireframe-ui-baseline-20261001/` (`index.html` for inspection).
- Protected fixture, candidate UX and live Alexa description hashes matched
  before/after. The runner's protected-input verification passed. Outputs remain
  isolated; no live product artifact was replaced.
- Zero invalid UI dispatches. No changes to frozen MCP, renderer, runner or
  author contracts. Final baseline status is `review-complete`.
- Report/metrics passed formatting and consistency checks before checkpoint.
  No new application tests or claim of executable interaction correctness;
  these are reviewed static designs.

The baseline is complete. The finding-free quality target and recorded
[follow-ups](wireframe-ui-followups.md) remain future work.

Checkpoint adviser: this is a coherent evidence milestone, with the preapproved
message **Record complete wireframe/UI baseline**. The initial segment remains
in checkpoint `dbc24a1`; the completion checkpoint includes this report, complete
metrics/comparison and corrected plan/follow-up status. No push is authorized.
