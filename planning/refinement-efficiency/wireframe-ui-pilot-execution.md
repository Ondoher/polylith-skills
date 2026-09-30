# Wireframe-to-UI pilot execution

Status: completed, 2026-09-30. All six goals in the
[staged plan](wireframe-ui-pilot-plan.md) are complete. Four affected elements
contain eighteen final state previews; all four wireframes and all four comps
passed exact-version experimental reviews. No findings remain unresolved.

The main result is demonstrated early delivery and **6m18.654s of first-pass
overlap**, followed by substantial design rework and renderer repair. This is
evidence for a working split, not a measured net speedup over the existing path.

Saved results:

- [Preview gallery](../../.codex-tmp/wireframe-ui-pilot-20260930/index.html)
  links each exact wireframe and comp, its states and review status.
- [Machine-readable metrics](wireframe-ui-pilot-20260930-metrics.json) retain
  phase boundaries, contribution/read counts, bytes, review/rework, local service
  measurements and per-invocation usage snapshots. Private transcripts,
  capabilities and source contents are excluded.
- Raw events, immutable revisions, findings, private client logs and the source
  manifest remain under `.codex-tmp/wireframe-ui-pilot-20260930/`. All 631
  protected files across seven source/live roots passed the final hash check.

## Progress

- Execution rules loaded; normal Codex connection and isolated outputs retained.
- Existing UX records, renderer and UI component path inspected.
- Deterministic previews, progressive storage, scoped handoff and native client
  are locally verified. Development helpers are not extra design authors and
  their time is not counted as measured design time.
- Actual wireframe and UI authors started at 2026-09-30T16:40:29Z after the
  environment allowed the normal Codex launch. One Sol/medium wireframe thread
  and one Astra/ultra UI thread were reused across elements. The two independent
  reviewer threads used Astra/ultra. Native client processes resume those threads;
  this is conversation reuse, not a continuously resident client process.
- Boundary selection took 77.698 seconds after its explicit start marker. The
  author selected four updates: clip-update dialog, selection-actions menu,
  timeline-add dialog and timeline. Save-clip dialog and framing/background are
  explicit reuse decisions. Coverage includes three changed flows, eight actions
  and five frames.
- First wireframe arrived at 16:44:38Z and its first comp at 16:48:29Z. The
  wireframe author continued while UI worked. All four first comps and the later
  menu correction are saved. Review and rework finished at 18:28:13Z. The fourth
  element completed the entire affected set; the early pilot outputs were reused.

## Cumulative endpoints

Every row below starts at the **same first-author launch** and includes earlier
endpoints. Do not add these durations. Tooling construction and initial approval
delays before launch are excluded. Later repairs, coordinator restarts and fixes
are included, so this is not an uninterrupted production-run benchmark.

| Endpoint reached                                       | Cumulative time from first-author launch |
| ------------------------------------------------------ | ---------------------------------------: |
| First comp                                             |                                7m59.883s |
| All four first comps                                   |                               25m02.932s |
| Authoring complete, including the late menu correction |                               30m36.481s |
| All exact wireframe and visual reviews passed          |                             1h47m44.467s |

The later **review-and-rework phase** took 1h16m38.039s from its first reviewer
launch. Within that phase, reviewer native invocations account for 11m42.458s
for wireframes and 11m04.606s for visual design. Those are subsets of the phase;
the remainder includes author repairs, interrupted attempts, tooling fixes and
coordination. Native wall time is not pure reasoning time.

## Questions and decisions

1. **Which source?** Reuse the latest saved Sol first-pass units and their exact
   earlier UX4 baseline. Assemble by code; do not rerun flow design or alter live
   Alexa files. Preserve the source's unreviewed status.
2. **What does one agent mean?** One persistent wireframe author and one persistent
   UI author, as specified in the accepted plan. Reuse each conversation across
   elements; no per-element worker pool.
3. **What to reuse for rendering?** Existing parts, scenes and native UI rendering
   vocabulary. The old semantic wireframe display alone does not show spatial
   design; a small isolated adapter will add neutral rendering and provisional
   preview labels without weakening canonical review gates.
4. **How to deliver ready work?** MCP stores immutable contributions and the
   coordinator schedules each saved ready handle. A waiting UI conversation is
   resumed instead of paying for polling or asking another model to repackage it.
5. **Which color record governs?** The frozen design-language JSON explicitly
   withdrew the resting label/outline equality override, while colors.md retains
   stale wording. Follow the JSON; use black filled-button labels, separately
   defined resting label/border colors and matching focus/error state colors.
6. **Why did the first launch fail?** The filesystem sandbox rejected process
   creation. Automatic approval then twice rejected the normal Codex run as an
   insufficiently authorized external-data transfer. The launch was permitted
   after the owner reiterated no local model proxy and renewed execution. Keep
   these permission delays separate from design timings. No proxy was introduced.
7. **Which models and role installation?** Use experiment-scoped assignments with
   Sol/medium for wireframes and Astra/ultra for UI and later independent reviews.
   Do not change installed production roles. These bounded assignments make this
   an exploratory measurement, not a controlled comparison with historical runs.
8. **Do four changed interfaces require another larger authoring run?** Continue
   the same saved stream from the first element through the complete four-element
   affected set. Do not regenerate the early results for a nominal full run.
9. **How to handle invalid presentation values?** Preserve contributions and
   repair only scene metadata. The menu and timeline initially used unsupported
   presentation values. Clarify the small contract's accepted values and retain
   repair latency separately; do not silently normalize unknown semantics.
10. **What if a wireframe changes after handoff?** Keep active UI inputs immutable
    and skip superseded work that has not started. The first runner queued every
    menu revision and required the latest wireframe during UI saves. This exposed
    an inconsistency with the plan's immutable-handoff rule. Fix the queue and
    revision binding, retain existing outputs and measure any incurred rework.
11. **How to report usage and tool attribution?** Preserve native usage snapshots
    per invocation; do not add potentially cumulative thread counts. Initial
    service events lack role attribution, so do not invent per-element read
    totals. Add attribution for subsequent sessions without interrupting current
    authoring. Wall time and gaps are not measurements of pure reasoning.
12. **What should reviewers receive?** The first reviewer guessed two invalid
    context pointers because record collections are arrays. Add exact per-element
    flow/action/frame pointers to future UI and reviewer assignments, and spell
    out the timing-marker input shape. Keep the successful review and its real
    recovery cost rather than rerunning it for cleaner measurements. Some initial
    review-start markers used the wrong field name; native invocation boundaries
    still give measured review wall times, but missing phase timing is not filled
    with invented precision.
13. **How should authors inspect a repaired preview?** The second dialog repair
    exposed a missing step: contributors received HTML, while the parent usually
    captured PNG only after their turn ended. The author attempted screenshot
    commands and inspected HTML, adding about 4m31s after its valid preview was
    saved. A separate parent capture took 2.757s; the author had already emitted
    its finished marker, so this is not a measured reduction of that turn. Add
    parent-owned screenshot delivery to ready receipts and reuse concurrent
    capture requests. Keep capture failures explicit while preserving valid HTML.
14. **When should repaired wireframes reach UI?** The first two timeline-add
    repairs each triggered UI work before wireframe re-review. Change the review
    continuation to accept a repaired wireframe first, then update its dependent
    UI once. Reuse exact saved pass/revise receipts when resuming; a review cap
    must report remaining findings rather than falsely claiming completion.
15. **How to load fixes during execution?** Restart only at a durable artifact
    boundary. The second restart retained timeline wireframe r4; its author had
    finished, but the old coordinator had already launched a UI continuation.
    That UI invocation was interrupted after 26.909 seconds without a new comp.
    Preserve the interruption in timing evidence and review the saved wireframe
    before resuming UI. Do not regenerate its completed author work.
16. **Was the first visual failure entirely a design error?** No. The artifact
    used an unsupported `error` status, which the UI author changed to `failed`.
    But the experimental renderer also omitted both failed-status CSS and the
    already-requested level-2 elevation, leaving the browser's default dialog
    border/background visible. Fix the renderer and its focused tests. Preserve
    old previews and mechanically create new UI revisions from existing data;
    that four-element rebuild took 153.582ms, without another design pass.
    Stop the current author at its saved r6 boundary and resume exact-version
    visual review. Record that interrupted invocation, rather than count it as a
    completed repair or misattribute the renderer defect to UX reasoning.
17. **How to handle disabled trim grips that still look active?** The final
    timeline comp already declared both grips disabled while saving. Its visual
    finding exposed another missing renderer style. Stop the unnecessary author
    continuation, retain its 97.794s unsuccessful native interval, add a focused
    disabled-handle rendering test and rebuild only the affected preview from
    saved data before re-review. Keep previously passed components unchanged.

## First previews, before independent review

Both authors launched at 16:40:29Z. The first UI preview arrived after **7m59.883s**;
all four first UI previews arrived after **25m02.932s**. These are cumulative
endpoints from the same launch, not sequential stages. They exclude later menu
correction and independent review.

| Element                | Wireframe start to first ready | First ready to UI start (queue + setup) | UI start to first ready | States |
| ---------------------- | -----------------------------: | --------------------------------------: | ----------------------: | -----: |
| Clip update dialog     |                      1m08.779s |                                 23.713s |               3m27.347s |      3 |
| Selection actions menu |                      1m31.399s |                               2m33.299s |               2m27.314s |      4 |
| Timeline add dialog    |                      1m34.217s |                               3m40.797s |               5m22.981s |      5 |
| Timeline               |                      3m47.763s |                               4m53.876s |               7m42.021s |      5 |

Rows overlap across agents. The measured intersection of first-wireframe and
first-UI work intervals is **6m18.654s**. This is observed concurrent work, not a
controlled estimate of improvement over the previous UI workflow.

Shared preparation is separate: wireframe launch to inputs-ready **1m24.326s**;
boundary-selection marker to saved scope **1m17.698s**. UI warm-up ran alongside
that work and completed in **38.192s**. Per-element UI input collection is a
subset of each UI interval: about 22 seconds for the first three elements,
**2m22.419s** for timeline. The wireframe author also made later menu corrections;
those are outside the menu's first-preview interval.

After all first comps were durable, the coordinator was deliberately restarted
to apply the tested queue/revision fix. Resume retained both author threads and
all four previews; only the menu's newer wireframe required UI correction. That
continuation took 4m23.297s of native invocation wall time and completed at
17:11:03Z. This interruption and correction remain visible in completion totals.

## Independent wireframe review and repair

These are **native invocation wall times**, including each invocation's context
loading and finishing work. Rechecks and author repairs are separate calls, not
subsets of the first-review column. Rounded values below are backed by exact
timestamps in the metrics. The first-preview table above excludes all of them.

| Element                | First review | Later rechecks | Wireframe author repair |    Dependent UI repair |
| ---------------------- | -----------: | -------------: | ----------------------: | ---------------------: |
| Clip update dialog     |        1m58s |              — |                       — |                      — |
| Selection actions menu |        3m32s |              — |                       — |                      — |
| Timeline add dialog    |        1m25s |    1m04s + 53s |           3m28s + 8m55s |          7m40s + 5m49s |
| Timeline               |        1m50s |          1m00s |                   8m47s | 7m58s after acceptance |

All four exact wireframes passed. Add-dialog findings covered the missing
specific-content selector, then clipping/overlap in its repair. Timeline
findings covered ruler/playhead alignment, feedback hidden below the viewport,
and incorrect trim-handle labels after ungrouping. The 8m55s add-dialog repair
includes about 4m31s after saving its preview, during which the author attempted
screenshot tooling. The timeline's completed 8m47s author turn is retained even
though its enclosing coordinator repair window was interrupted; an ensuing
26.909s UI invocation was interrupted separately.

## Independent visual review and repair

The same native-invocation basis applies here. The earlier UI corrections caused
by wireframe changes are in the preceding table and are not repeated below.

| Element                | First visual review | Recheck | UI author correction after visual finding                                   | Final pass |
| ---------------------- | ------------------: | ------: | --------------------------------------------------------------------------- | ---------- |
| Clip update dialog     |               2m27s |     50s | 4m13s interrupted after saved status edit; renderer corrected separately    | UI r7      |
| Selection actions menu |               1m32s |     46s | 1m08s                                                                       | UI r12     |
| Timeline add dialog    |               1m40s |     56s | 1m19s                                                                       | UI r21     |
| Timeline               |               2m02s |     52s | 1m38s interrupted; renderer corrected the already-declared disabled handles | UI r12     |

All first visual reviews requested correction. The findings were missing
failure-state treatment, missing dialog elevation/surface rendering, and disabled
trim handles that still looked active. Three components used `error` where the
status template expects `failed`; the renderer also lacked supported failed-state,
elevation and disabled-handle styling. Tests and the rendering contract now cover
the encountered defects. New immutable previews retain the earlier evidence.

Four deliberate coordinator restarts retained completed work and exact review
passes. There were 30 completed native invocations, including warm-up, authoring
and review, plus explicitly retained unsuccessful/unclosed attempts. Usage is
stored per invocation; potentially cumulative thread counters are not summed
into a consumption or credit estimate.

## Local operations

Successful service method observations include coordinator traffic; they are not
client round-trip or model command-generation measurements.

| Operation          | Observations |  Median | 95th percentile |
| ------------------ | -----------: | ------: | --------------: |
| Read               |          150 | 0.237ms |        96.390ms |
| Execute            |          150 | 4.322ms |        29.772ms |
| Store              |           63 | 4.626ms |        15.624ms |
| Screenshot capture |           31 |  2.158s |          3.369s |

Recent finish operations include screenshot capture, so execute and screenshot
durations overlap and must not be added. The renderer-only corrections reused
existing design data: all four comps rebuilt in 153.582ms; the later timeline
disabled-handle rebuild took 42.974ms. These local timings do not establish an
equivalent reduction in model-side work.

## Observations

- UI is the slower first-pass stage: about 19 minutes of marked component work
  versus 8 minutes of marked wireframe work. A growing UI queue explains later
  ready-to-start waits. More UI authors were deliberately outside this trial.
- Early handoff bought overlap, but a later menu correction required another UI
  invocation lasting 4m23.297s. Completing use-case coverage before declaring an
  element ready matters more than shaving milliseconds from storage.
- Independent wireframe review found a missing concrete content-selection path
  in the timeline-add dialog. The author added a selector state; first repaired
  wireframe arrived about 3m05s after repair dispatch, and the full author turn
  took 3m27.997s. The replacement contribution was 9,906 bytes. Downstream UI
  correction and re-review are separate work, not part of the original preview.
- Native UI launch to its first element marker was about 19–21 seconds for the
  first comps. That interval includes client/model setup and the first command;
  it is not a measurement of process startup alone.
- The normal client preserves coarse model/turn usage and tool boundaries, but
  does not expose a trustworthy split between reasoning and command generation.
  No localhost model observer was used.
- Some agent-supplied research intervals contain an initial contribution before
  the research-end marker. Preserve these markers, but do not interpret their
  duration as exclusive research time or add it to authoring time.
- The initial review runner applies a wireframe repair to UI before asking the
  wireframe reviewer to accept it. The selector then failed layout re-review,
  causing another dependent update. Prefer accepting repaired wireframes before
  downstream UI updates. The current serial loop also waits for that repair
  before reviewing another independent element; its elapsed time is not an
  optimized review-pipeline benchmark.
- Structural repairs still replace a shared part and then update several scene
  variants. The first selector UI correction included a 15,686-byte contribution
  and further state updates. Smaller structural operations may remove repeated
  output construction, but this trial does not establish their reasoning benefit.
- Even a small correction can incur substantial input/setup work. The update
  dialog's visual repair saved a 396-byte contribution about 13 seconds after
  its inputs-ready marker; UI-start to inputs-ready took 2m36.478s. This is a
  measured interval containing tool use and model work, not pure input-processing
  time. The author was then interrupted to load the renderer fix. Payload size
  alone would not explain this repair's elapsed time.
- The accepted timeline changes still required about 32 KB of UI contributions,
  split between a replacement component and its state edits. Inputs-ready to the
  first 17,021-byte contribution took about 2m38s; the server operation itself
  took 10.624ms. The full native correction took 7m58.187s. This records model-side
  authoring/output work without pretending to separate reasoning from generation.

## Recommendation

Track proposed next work in the [living follow-up list](wireframe-ui-followups.md).

Retain the experimental split and its saved element handoffs. It demonstrated
coherent boundaries, early delivery and real overlap. It has not demonstrated a
net speedup over the existing complete UI stage: this was a single exploratory
run with different assignments, cached research and substantial repair work.

Before a production rollout, prioritize the costs this run exposed:

1. Validate supported presentation/status/surface contracts mechanically and
   provide screenshots through the tool. Several review/repair turns addressed
   contract or renderer defects rather than new design decisions.
2. Put wireframe acceptance ahead of dependent UI work in the eventual live
   pipeline, while continuing other coherent elements. The experiment intentionally
   postponed reviewers to measure the happy path; its add-dialog sequence shows
   the downstream price of applying an unaccepted repair. The repaired
   continuation now waits for acceptance before that update.
3. Investigate structural edit operations and time-aware timeline rendering.
   Authors currently replace component structures and manually coordinate ruler,
   clip and playhead positions. The observed payloads and alignment failures make
   this a concrete candidate; no reasoning-time saving is claimed yet.
4. Only then evaluate another UI author for independent ready elements. The
   first-pass UI queue grew while one author was occupied; this trial deliberately
   kept one author and does not establish a parallel-worker speedup.

No new paid baseline or replay was run just to make the timing evidence cleaner.
Installation of a production wireframe role and changes to canonical artifacts
remain subsequent decisions, as specified in the plan.

## Verification and checkpoints

Seventeen local tests pass, covering the happy-path toolchain, pinned revisions, targeted
resume, analysis and encountered client lifecycle failures. Source protection
covers 631 files, all unchanged. All planned experimental authoring, affected-set
coverage, reviews, repairs and analysis are complete. There is no controlled
speedup measurement.

The checkpoint adviser recommended the coherent tooling/evidence unit under the
owner's standing preapproval. Local checkpoints are `527e84d` — **Prepare
wireframe-to-UI pilot pipeline**, and **Harden wireframe-to-UI pilot workflow**
(the commit containing this final report). No push or publication is part of
this execution.

Comprehensive negative testing, cross-platform browser capture, responsive/runtime
interaction and canonical workflow integration remain outside this experiment.
The source UX is still unreviewed; experimental wireframe/visual passes do not
replace its production approval or prove keyboard/focus behavior at runtime.
