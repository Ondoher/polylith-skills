# Persistent browser capture experiment

Recorded: 5 October 2026.

Status: all five experiment milestones passed. See the [readiness assessment](persistent-ui-capture-readiness.md) and
[execution progress](persistent-ui-capture-progress.md). This is a bounded follow-up
to the [agent-preparation trial](parallel-design-agent-preparation-readiness.md),
whose screenshot replacements exposed font fidelity and browser timeout problems.
The experiment changes capture tooling, not UI authoring or review policy.

## Questions and scope

Can one persistent Puppeteer-controlled browser accept successive saved HTML
pages, produce faithful screenshots, and reduce capture time? Can it detect
missing fonts and recover from a failed request without contaminating later work?

Reuse frozen synthetic HTML, CSS and local assets. Do not regenerate product
designs, invoke new researchers or time model review. Keep the current renderer,
scene definitions, clean/annotated variants, viewport and screenshot evidence
contract unchanged. Do not combine this experiment with selective re-review,
agent preparation, HTML publication changes or state/treatment/assembly work.

Keep prototype dependencies, scripts, browser profiles, logs and captures under
`.codex-tmp/persistent-ui-capture/<run>/`. Application-specific material remains
in its owning project; only reusable findings and the plan belong here. No
separate Codex session, model backend or proxy is involved.

## Proposed worker boundary

Use a local Node worker with a request queue and one browser for the run. Start
with one request at a time and a fresh page for each request. Browser reuse is
the variable being tested; do not add concurrent capture or a page pool yet.

Use a pinned compatible `puppeteer-core` version and the installed Edge binary
to avoid changing browser engines in the comparison. Record both versions and
the selected executable. Stage experimental dependencies locally; do not change
managed package dependencies before the prototype proves useful.

The first request interface can be JSON lines over stdin/stdout. No always-on
HTTP service is needed. Each request identifies the run, request ID, saved HTML
path, scene/variant, expected HTML and asset identities, viewport, scale, output
path and deadline. Loading saved pages preserves their relative asset locations;
direct HTML-string input is deferred until there is a demonstrated caller need.

Return success only after the image is written and validated. Retain request ID,
input identities, PNG digest and dimensions, readiness observations, browser
generation, stage timings and structured failures. A failed request must not
publish a success record or leave an old PNG masquerading as its output.

Wait for the styles, required fonts, images and final layout before capture.
Await `document.fonts.ready`, then positively verify that each declared required
font face loaded successfully. That promise alone does not prove that the
intended font loaded or that an image decoded. Detect missing/failed assets and
fail explicitly rather than accepting a visually plausible fallback. Bound all
readiness checks by the request deadline; freeze animations for static comps.

Close the request page on completion or failure. If a page cannot be recovered,
restart the browser before processing the next request, increment its generation
and record the restart cost. Shut down the worker and its browser at the end of
the run. Persist inputs and results so a fresh coordinator can determine which
requests completed without relying on conversation memory.

## Milestone 1: Freeze the workload and baseline

Create a manifest for seven synthetic scenes, each with clean and annotated HTML,
giving 14 capture requests. Prefer the existing trial's saved synthetic outputs
when available; otherwise render equivalent reusable fixtures once. Copy only
into the temporary run directory and freeze their bytes for all comparisons.

Include required local font files, images, narrow layouts, selection and focus
treatments. Inventory every expected asset. Record browser version, viewport,
scale, hardware context and actual original-helper flags. Keep the original
helper's behavior intact as comparison A, including its current readiness policy.

Capture and inspect a trusted reference set with demonstrably loaded required
fonts. An original-helper image that uses a fallback font is a failed quality
sample, not the visual reference. Save the manifest, reference evidence and all
failed baseline attempts.

**Gate:** all 14 HTML inputs and their assets have frozen identities; the workload
is repeatable without model work; expected appearance and asset readiness can be
checked. If this cannot be established, stop before building the worker.

## Milestone 2: Prove faithful persistent capture

Implement the small temporary worker. Send all 14 requests through one browser,
with a fresh page per request. Instrument launch, queue wait, page load, font and
image readiness, screenshot, output validation and cleanup separately.

Verify exact output dimensions, scene/variant association and input bindings.
Inspect all 14 first successful images against the trusted references. Use
automated asset checks for every request, and examine heading typography,
clipping, focus and annotated overlays in the images. Record pixel differences
in the same frozen environment; unexplained differences require investigation,
not an arbitrary tolerance that hides font changes.

Add one delayed-font fixture and one missing-font fixture. The delayed font must
load before a successful capture; the missing font must fail with usable evidence.
Neither may silently produce an accepted fallback-font image.

**Gate:** all ordinary scenes render correctly in a single browser generation;
the two font cases behave as specified; saved outputs retain the existing capture
evidence fields. Performance claims remain closed until milestone 4.

## Milestone 3: Prove bounded failure and recovery

Exercise these cases in sequence, followed by a known-good scene:

- A missing image or stylesheet produces an asset failure.
- An asset that never becomes ready reaches the request deadline.
- An input changed after its manifest was frozen is rejected.
- A deliberately terminated browser produces an explicit failure; the worker
  starts a new browser generation and successfully handles the next request.
- Two successive scenes with different styles and focus states retain their own
  presentation, without prior-page state leaking into the result.

Use a short declared deadline for fault injection instead of repeatedly spending
the old 60-second timeout. Persist each actual failure and recovery. Restart the
worker from its saved manifest and result records; completed requests must remain
identifiable, and retries use distinct attempt/output paths. Verify shutdown
leaves no worker-owned browser running.

**Gate:** no fault hangs the queue, reports a false success, reuses stale output,
or prevents the subsequent valid capture. A restart must not silently bind a PNG
to changed inputs. Fix any failure and rerun the affected case before timing.

## Milestone 4: Measure browser reuse separately from readiness changes

Compare three capture paths with the same frozen workload and Edge version:

| Path                | Browser lifecycle                           | Readiness                  |
| ------------------- | ------------------------------------------- | -------------------------- |
| A: current helper   | Fresh process/profile per image             | Existing helper behavior   |
| B: controlled fresh | Fresh Puppeteer browser per image           | Explicit asset/font checks |
| C: persistent       | One Puppeteer browser, fresh page per image | Same checks as B           |

B versus C measures browser reuse with matched readiness. A versus C measures
the practical change from the current helper. Count A's quality failures and
retain their times; a failed capture is not a successful fast sample.

Run three rounds, rotating order: A/B/C, B/C/A, C/A/B. Capture paths must run
sequentially, without overlapping browser batches or concurrent design work.
Each C batch begins with a new worker/browser and includes its startup and
shutdown in the total. Separately record its first capture and later captures to
show the cold and warm behavior. Do not discard the first batch as warm-up.

Record total batch time, per-image median and slowest capture, launch cost,
readiness time, errors, retries and restart cost. Use process memory readings
when available; otherwise mark memory unmeasured. Include all attempts rather
than reporting only successes. Record the order and cache policy so shared OS
caches are a visible limitation.

Use 30 minutes as the first progress checkpoint for this timing milestone, not
an automatic shutdown. At that point record completed captures and rounds,
quality failures, diagnosed or resolved issues, remaining work and the next
checkpoint. Continue without renewed permission while valid measurements are
accumulating or demonstrated faults are being resolved. Apply the same progress
assessment at later checkpoints and earlier when repeated failures occur.

Repeated identical timeouts, unchanged errors or retries without new evidence
are not progress. Change approach or stop the stalled path when consecutive
checks show no usable outputs or reduced uncertainty. Preserve the partial
results and the actual reason for stopping. Completing a reliable negative
comparison is also progress; continuation must not depend on whether C is faster.
Keep the frozen workload, three-round sample and success criteria unchanged.
Three rounds establish a local feasibility result, not a general performance
guarantee. An explicit owner-imposed hard deadline or resource cap takes
precedence over this progress-based continuation.

**Gate:** C completes all 42 ordinary captures without fallback fonts, wrong
bindings or unhandled failures. For a useful speed result, its median 14-image
batch should be at least 30% and 10 seconds faster than B, with startup included.
Also report A versus C independently. These thresholds are initial experiment
criteria, not established performance facts. Reliability can justify further work
even if the speed threshold is missed, but cannot be reported as a speed win.

## Milestone 5: Decide whether to integrate

Write a concise result: correctness, reliability, measured timing, uncertainties,
operational cost, and adopt/refine/stop recommendation. Link the frozen manifest,
actual images, timings and fault evidence from the temporary run record.

If the gates pass, test one explicit opt-in capture route through the existing
saved UI/render evidence contract. Reconcile each screenshot with its current
HTML/assets and obtain the existing independent rendered-review acceptance.
Retain the original helper as fallback. Keep shared data-service and installer
changes out of this experiment; propose any necessary managed dependency/catalog
changes as a separate integration unit after proving the prototype.

Replacing the capture mechanism does not make an unaccepted UI pass, reduce the
required review scope, or close the earlier prepared branch's open gate. Reusing
that branch would require its actual current inputs and a fresh bound review.

**Gate:** the recommendation follows the evidence. Mark the experiment complete
when its questions are answered, including an honest negative result. Promotion
requires passing fidelity, recovery and evidence-contract checks; larger-scale
timing and a default-policy change remain separate decisions.

## Progress and execution limits

During execution create a reusable progress document beside this plan with each
milestone's status, evidence paths, decisions, remaining issues and next action.
Keep large logs and trial data in the temporary run directory. On resume, read
the plan, progress, frozen manifest and request results before continuing.

Save the experiment's evidence after each gate. A failed gate prevents downstream
promotion; continue focused repairs while they demonstrably advance that gate.
Repair the smallest demonstrated issue rather than expanding renderer or design
scope. Record operation timeouts and estimated implementation checkpoints in the
run manifest before starting. Apply the same progress assessment to implementation
as to timing, and distinguish any explicit hard limit from an estimate.

Keep individual capture and fault-injection timeouts: they identify a hung request
and allow recovery, rather than ending an otherwise progressing experiment.
Report checkpoint decisions and preserve them for context-independent resumption.
Do not automatically publish, install managed dependencies globally, override an
explicit hard limit or start new model sessions.

References: [Puppeteer HTML input](https://pptr.dev/api/puppeteer.page.setcontent),
[screenshot API](https://pptr.dev/api/puppeteer.page.screenshot),
[font readiness](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/ready).
