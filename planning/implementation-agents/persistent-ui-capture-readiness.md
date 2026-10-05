# Persistent browser capture readiness

Assessed: 5 October 2026. Governing [plan](persistent-ui-capture-plan.md) and
[progress](persistent-ui-capture-progress.md).

Status: all five experiment gates passed, including actual independent rendered
review of all 14 final screenshots. Parent exact-subject passing validation
succeeded. This is a local experiment, not a promoted managed
capture service or default-policy change.

## Measured result

Three rotating, sequential rounds reused the same seven synthetic scenes, each
with clean and annotated variants. All 126 timed captures succeeded. Whole-batch
times include startup, shutdown, evidence writes and exact pixel diagnostics.

| Path                                        | Batch times, seconds | Median 14-image batch | Median individual capture |
| ------------------------------------------- | -------------------- | --------------------- | ------------------------- |
| Current Edge CLI, fresh process per image   | 86.3 / 137.2 / 228.0 | 137.2 s               | 7.51 s                    |
| Puppeteer, fresh browser per image          | 68.9 / 99.5 / 132.8  | 99.5 s                | 5.61 s                    |
| Puppeteer, persistent browser / fresh pages | 27.5 / 26.1 / 36.3   | 27.5 s                | 1.12 s                    |

Matching the readiness and controller paths, browser reuse reduced the median
batch time by **72.4%**, or **72.0 seconds**, versus fresh-browser Puppeteer.
The practical change versus the current helper reduced it by **80.0%**, or
**109.7 seconds**. Both exceed the predeclared 30% and 10-second usefulness
threshold. Later captures in a persistent batch had a 1.10-second median; the
first captures took 3.02–4.59 seconds. Batch totals include the first capture.

This is three rounds on one Windows host, installed Edge 152.0.4191.66, and
pinned `puppeteer-core` 25.12.0. OS caches were retained; order rotated and browser
profiles were fresh. Variability is visible in every reported batch, including
a 19-second fresh-browser teardown. Memory and model cost were not measured.
These results establish local feasibility, not a general speed guarantee or a
measured reduction in end-to-end design/review time.

## Correctness and recovery

All 84 controlled captures positively verified both required font families;
all 42 persistent captures completed without missing fonts or wrong scene
bindings. All original-helper images also matched the loaded-font references
exactly in this trial; no lower original-helper font-failure rate is claimed.

Thirty-eight persistent and 35 controlled-fresh images were pixel-identical to
their references. The remaining four and seven images differ at precisely eight
gray pixels on rounded option-border corners, by one intensity level. Font,
text, focus and other pixels are unchanged. Exact diagnostics and every changed
pixel are retained; no whole-image tolerance was introduced. The browser's
exact rasterization cause is not established.

Actual tests verified delayed-font success, missing-font/image/stylesheet failure,
request timeout, changed-input rejection, browser termination and recovery, and
style/focus isolation. Eight subsequent normal captures matched their references
exactly. The JSON-lines interface, saved-result reopening and clean worker exits
were exercised. A supplemental valid local image decoded with expected dimensions.

The final exit assessment found no recorded worker-owned browser PID still alive.
An earlier observation briefly found one recorded PID; a read-only identity check
then found it absent. That observation is retained without asserting whether it
was delayed exit or PID reuse. Browser-tree memory and descendant identity were
not independently instrumented.

## Operating recommendation and boundary

Proceed with a separate managed integration unit if the owner selects adoption.
The useful boundary is one run-owned browser, a serial request queue and fresh
pages, with explicit asset readiness and source-bound output records. The temporary
prototype accepts saved HTML paths; direct HTML strings, concurrent pages and a
shared always-on service were not tested.

Keep the original capture helper available as fallback. Production integration
should bound teardown end-to-end and record actual process-exit identity/time;
the observed slow teardown shows why a kill timer alone is insufficient evidence
of a prompt return. Integrate pinned dependencies and ownership metadata together
through the normal managed-package process. No global package installation,
installer catalog change or default capture-policy change occurred here.

The isolated opt-in route binds new PNGs to the existing saved UI, accepted UX,
foundation and deterministic rendered HTML using `DesignUiReview`. It does not
alter the earlier trial's canonical stores or acceptance gate. Capture transport
cannot substitute for independent visual judgment, change review scope or grant
authoring authority. Final independent receipt status is recorded in progress.

Raw synthetic evidence and prototype source remain temporarily under
`.codex-tmp/persistent-ui-capture/run-2026-10-05/`: `manifest.json`,
`benchmark-results.json`, `assessment.json`, `fault-results-v2.json`,
`protocol-results.json`, `happy-image-results.json`, `shutdown-observation.json`
and the opt-in review inputs, subject and images. No application data was used.
