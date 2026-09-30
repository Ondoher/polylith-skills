# Preventing wireframe and UI review failures

Status: stages 0–5 complete, 2026-09-30. Stage 6 is prepared but its launch is blocked by automatic approval review pending explicit payload/destination authorization. See [execution record](wireframe-ui-defect-prevention-execution.md) for results, evidence and decisions. The plan is not complete.

Build and test each prevention mechanism independently before rerunning the full
saved Alexa change set. The primary goal is correct first construction, making
consequential review failures rare without increasing authoring/inspection cost
or weakening review. Corrections discovered during internal inspection still
represent defects that the construction process failed to prevent.

Evidence: [reliability execution](wireframe-ui-reliability-execution.md) and
[metrics](wireframe-ui-reliability-20260930-metrics.json). That run had three
rejected reviews: invisible chooser focus, invisible trim-handle focus, and one
wireframe rejection covering inconsistent temporal geometry and a missing
concrete successful result. The two rendering defects are already fixed.

## Constraints

- Prevent known defects through tested components, complete source inputs,
  consistent generated geometry and bookkeeping owned by code. Apply outcome
  expectations while constructing the interface. Keep cheap validation and the
  existing preview inspection as safeguards; add no internal reviewer or repeated
  self-review loop. Fix the construction mechanism when a known defect recurs.
- Shared agents, contracts, renderers and validators remain product-independent.
  Product terminology, grouping rules, destinations, endpoint conventions and
  expected behavior come from input data. Useful Alexa-derived examples may
  become permanent regression fixtures after anonymizing names and incidental
  identifying details. Preserve the behavior, relationships and geometry that
  make the case useful. Product-specific behavior in fixture data does not
  authorize product-specific branches in shared code. Audit the touched shared
  paths for accidental assumptions.
- Exercise each generic mechanism with an unrelated example. A component should
  work with supplied labels, theme and values, without detecting the product.
- Reuse existing flows, actions, source references, parts, scenes, incremental
  edits, renderer capability declarations and review receipts. Add no parallel
  requirements document, general workflow graph or arbitrary validation language.
- Reuse saved inputs and newly generated work. Keep the current review-before-UI
  gate. Preserve unreviewed upstream UX status, exact revision bindings and
  isolated, reversible trials.
- Use normal Codex connections and the existing MCP service. Keep model/effort,
  read windows and worker counts fixed for comparisons. No model proxy,
  prewarming experiment, new worker pool or permanent compatibility path.
- Start with working cases, then add the specific observed-failure regressions.
  Run code reviewers/checkpoint advice at coherent milestones during execution,
  using the user's preapproved checkpoint-message policy. Avoid repeated broad
  reviews or paid full-product runs for instrumentation.

## Milestones

| Stage | Build and isolated test                                 | Exit evidence                                                                    |
| ----- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 0     | Freeze fixtures and measurement definitions             | Each known failure has a small reproducible case; source hashes recorded         |
| 1     | Verify reusable component states in the browser         | Intended states actually render; old focus defects are detected                  |
| 2     | Generate consistent geometry from shared numeric values | Equal values align across all supplied elements and viewport sizes               |
| 3     | Connect declared outcomes to concrete rendered evidence | Missing result evidence is detected; semantic uncertainty stays explicit         |
| 4     | Run small independent author/reviewer exercises         | Each mechanism works through agent authoring with measured local correction cost |
| 5     | Integrate the proven checks into normal handoffs        | Local failures stay repairable; review and UI gates retain exact bindings        |
| 6     | Rerun all four saved Alexa changes once                 | First-review outcomes and total acceptance cost compared with saved evidence     |

Publish a short result at each exit. If a stage fails, repair and rerun that
isolated case; continue independent development where useful. Do not advance a
failed mechanism to the full Alexa trial.

## Stage 0: Prepare small, reusable evidence

Extract minimal fixtures from the saved bad previews and original source facts:
focused chooser, focused visual handle beside selection, misaligned values, and
a success message whose supposed result is absent. Keep the corrected artifacts
as regression oracles; do not supply them as answers in fresh author trials.

Prefer anonymizing and reducing a useful real case over reconstructing an
equivalent synthetic case. Promote it into the ordinary test suite when useful;
it need not remain experimental. Keep anonymization consistent across IDs,
references and labels, and verify that the reduced fixture still reproduces the
original defect. Retain private provenance separately when needed.

Add small unrelated examples: a record-entry dialog, a numeric range display,
and a create-record flow ending in a visible new record. These are fixture data,
not hardcoded shared behavior. Reuse existing generic fixtures where suitable.

Capture fixture/source hashes, renderer versions and local render/check durations.
Use the existing native-client and service telemetry for later model trials.
No new upstream UX run or paid baseline is needed.

## Stage 1: Verified component states

Use `wireframeCapabilities` in `wireframe-contract.mjs` as the declared support
inventory. Add reusable state fixtures for the components used by the workflow,
starting with choices, visual handles, buttons and outlined fields. Cover normal,
focused, selected, disabled and error states where supported, plus important
combinations such as a focused target inside a selected container.

Render with the maintained preview/browser path. Check actual computed styles
and geometry, and retain screenshot comparisons for painted state distinctions.
An enum, CSS class or nonzero outline declaration alone is not evidence that an
indicator is visible: include clipping, occlusion and distinction from selection.
Inspect the small state sheet once when establishing the fixture expectations.

Use a neutral wireframe theme and an unrelated supplied UI theme. Expected colors
come from their tokens; shared checks contain no Alexa palette or brand values.
Verify disabled outlined and contained treatments separately.

Exit: valid state examples pass, the saved focus regressions fail the relevant
checks, and corrected examples pass. Record check runtime. Future additions or
changes to supported states require an updated fixture before normal author use.
Run these component checks when the component contract changes, rather than
rerunning the complete state matrix for every authored element.

## Stage 2: Geometry by construction

Implement the smallest useful numeric scale/layout helper, independently tested
before adding it to the authoring path. Its inputs are a domain, viewport and
supplied values/ranges; output coordinates use one transform. Ticks, intervals
and markers share that transform. Reuse existing layout primitives for surrounding
rows and containers.

The helper owns arithmetic and alignment. Product data supplies units, labels,
precision and any endpoint policy. It has no concepts of clips, tracks, grouping,
collision movement, append destinations or successful editing operations.
Avoid introducing a general diagram or layout language.

Test an unrelated measurement-range display and the saved temporal fixture with
the same helper. Verify equal values map to equal coordinates, interval endpoints
match their labels, and resize/scale changes preserve the relationships. State
numeric tolerances explicitly. A saved misaligned example must be detectable.

Exit: local tests establish the relationships, and the renderer can consume the
helper output without manual coordinate duplication. Agents provide meaningful
values and layout choices; code supplies repeatable positions.

## Stage 3: Concrete outcome evidence

Extend the existing action-reference coverage with a small source-to-evidence
mapping. Reuse a flow/step/alternate reference or stable source path, linked to
the scene and nodes that demonstrate its result. Code supplies identifiers and
bookkeeping. Reuse an existing scene when it suffices; do not require a screenshot
for every step or generate extra scenes solely for exhaustive enumeration.

Separate two levels of checking:

1. Mechanical checks establish that evidence exists and resolves to rendered
   nodes. Where existing structured input provides an expected identity, value
   or relationship, compare that expectation with structured result data. A
   generic success message cannot substitute for a declared visible change.
2. The author uses the supplied outcome to construct its result scene and checks
   that evidence during the existing preview inspection. This adds no separate
   internal review pass. The reviewer uses the same expectation and evidence.
   Prose meaning that cannot be mechanically established remains a judgment check.

Do not claim a reference proves semantic correctness. Do not derive business
rules by matching words such as “Add,” “clip” or “saved.” If a prose outcome needs
interpretation, record it once beside its source reference and reuse it; avoid
inventing a second specification. Missing/contradictory source facts become
explicit repair issues, with unaffected work preserved.

Test a create-record example with a visible identified result, an update example
with the changed value, and a navigation outcome that correctly changes no data.
Then exercise the saved success-message-without-result failure. Distinguish what
the validator catches from what still requires author/reviewer judgment.

Exit: the known omission is exposed by concrete evidence checks or the specified
walkthrough, valid outcomes pass, and the input/output burden remains small.

## Stage 4: Small authoring trials, one mechanism at a time

After each local mechanism passes, use the saved fixtures for bounded exercises:

- Component-state exercise: one small UI element using the verified states.
- Geometry exercise: one coherent range/axis element authored from numeric facts.
- Outcome exercise: one form flow with a concrete result and an alternate flow.

Use the actual wireframe/UI roles where their work is relevant. Review the exact
candidate at its normal handoff; preserve wireframe acceptance before UI. These
are separate tasks with fresh task context and recorded startup costs, avoiding
answer leakage from prior remedies. Reuse context within each task's repairs.
Limit each to the states needed to demonstrate its assigned behavior.

Keep model settings fixed to the preceding reliability trial: wireframe
Sol/medium; UI and independent reviewers Astra/ultra. Prefer one exercise per
mechanism initially. Retry only the failing exercise after a specific change.
These tests establish usability and prevention, not a causal speedup estimate.

Preserve the first rendered candidate and record whether it needed defect
corrections. Separate those corrections from ordinary unfinished contributions
or optional design refinements. Record first submission, local failures/edits,
first review outcome, repair and recheck time, generated contribution size when
available, and total acceptance time. Record any extra author effort introduced
by the checks. A failure moved ahead of review is still correction work, not a
successful prevention result.

Exit: each mechanism is usable by its intended author, known failures are caught
before independent review, and no unexplained cost regression remains. If a
semantic check fails this test, revise the handoff and repeat the small example.
Do not declare it solved solely because a structural validator passes.

## Stage 5: Normal workflow integration

Promote the proven helpers/checks through the existing shared implementation:

- `wireframe-contract.mjs`: supported states and compact acceptance/evidence rules.
- `wireframe-preview.mjs`, `wireframe-inspection.mjs`, and the native part renderer:
  rendered checks and consumption of generic layout output.
- `wireframe-store.mjs` and `scripts/mcp/WireframeOperations.mjs`: saved evidence,
  precise local repairs, inspected submission and exact acceptance bindings.
- Wireframe/UI author and reviewer definitions plus `wireframe-design.md`:
  identical expectations, retained context and focused rechecks.

Keep drafts saveable when validation finds a problem. Return local findings with
source/scene/node references and remediation; repair the affected element before
review submission while independent work continues. Existing generic primitives
remain available for designs outside the new scale helper's scope.

Run focused normal-MCP happy-path tests and the observed failure regressions.
Verify UI still requires current wireframe acceptance, targeted edits preserve
unrelated work, and resume reuses matching evidence. Broader package checks run
once at the coherent integration milestone. Audit shared code for product-specific
identifiers, constants, branches and assumptions, not just the word “Alexa.”

Exit: the ordinary path and isolated harness use the same contracts and checks.
No temporary experiment workaround is required for normal operation.

## Stage 6: Full saved Alexa confirmation

Proceed only when stages 1–5 pass. Freeze the renderer/contracts first, then run
the four original changed elements through wireframe authoring/review and UI
authoring/review in a new isolated attempt. Use original product facts and the
saved boundary inventory; keep all unchanged data. Do not seed authors with the
already corrected designs. Scope selection is reused and labeled accordingly.

Reuse newly completed work within this attempt after interruption. If a failure
appears, preserve the first-pass result, classify its cause, create the smallest
regression, and repair the affected element. A shared renderer change requires
the existing exact-binding refresh rules; count that recovery rather than
silently reusing stale passes. Do not restart the entire product by default.

The target is zero known consequential defects in the first rendered candidates
and their first reviews, with complete source coverage and no weakened criteria.
Report every first-review rejection even if later repaired. Compare against the
saved 78m20s reliability run and its 3/4 wireframe, 2/4 UI first-review outcomes,
including pre-review corrections, scope growth and renderer recovery. Keep
overlapping and nested intervals explicit; no pure-reasoning or credit estimate
without supporting telemetry.

Finish with a summary of implementation, questions/decisions, verification,
per-mechanism results, full-run findings, timing limitations and checkpoints.
One successful replay cannot establish that future failures are exceedingly
rare. Continue tracking first-review acceptance and defect classes during
ordinary refinements instead of commissioning repeated paid benchmarks.

## Deferred work

Worker pools, model changes, prewarming, general renderer-refresh optimization,
preview-queue decoupling and upstream UX-flow review remain separate. They can
change the performance comparison and are not required to test these prevention
mechanisms independently.
