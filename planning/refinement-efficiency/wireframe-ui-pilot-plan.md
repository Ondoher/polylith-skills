# Wireframe-to-UI pipeline: staged experiment

Status: completed, 2026-09-30. All six experimental goals are complete: four
affected elements, eighteen final states, two explicit reuse decisions, and exact
wireframe/visual review passes. See the
[execution report](wireframe-ui-pilot-execution.md) and
[metrics](wireframe-ui-pilot-20260930-metrics.json). Production integration and a
controlled comparison with the old path remain subsequent decisions.

## Question and scope

Can a dedicated UX wireframe author identify coherent interface boundaries and
produce usable spatial wireframes that reduce the UI author's work? Can delivery
of each completed element overlap UI design with the next wireframe, without
duplicating decisions or introducing enough coordination to erase the benefit?

Use **one persistent wireframe author and one persistent UI author**. The UI
author prepares its shared context once and receives completed wireframes as they
become ready. Include multiple changed interface elements, measuring each
separately. Start with the first element as an early checkpoint, then a small
multi-element pilot, then the complete affected set from the recent Alexa update.
Do not add a pool of authors or rerun the general-flow UX stage.

Optimize model-side work and request-to-result time. Smaller payloads matter when
they remove reconstruction, repetition or bookkeeping; encoding complexity that
increases reasoning is a regression. Keep the larger read window, parallel
independent reads when available, and progressive output already implemented.

## Reuse the saved Alexa update

Freeze the inputs recorded in the
[Sol first-pass report](ux-sol-medium-first-pass-20260930.md): the saved
snapshot16/model7/UX4 baseline and the subsequent materialized UX authoring units.
The private completion receipt and store paths are under
`.codex-tmp/ux-full-native-20260929/sol-medium-first-pass-20260930/workspace/`.
Its `proposalHandle` is a finish receipt, not a combined UX document: retrieve the
referenced units and assemble the experimental input mechanically.

The recorded changes are three flows: `edit-video`, `save-clip` and `update-clip`,
plus `element:video-workspace` and `context:document`. Those five changed records
are not five separate interfaces. Build the scope from changed use-case meaning,
including changes to referenced actions, states and alternatives. A revised
timestamp, context record or unrelated requirement alone must not cause redraws.

Candidate areas to investigate are the timeline/grouped-clip interaction and the
interfaces used to save and update named clips. These are candidates, not a
preselected decomposition. The wireframe author must identify their actual
boundaries from the saved flows. Treat the timeline as one coherent component;
its ruler, tracks, clips and playhead are not separate agent jobs. A containing
composition region may arrange the timeline and other components by reference.

For every affected interface record:

- Which changed use case requires work, and what changed for the user.
- Existing identity, owning surface, related dialogs and reusable components.
- Whether its wireframe needs revision, whether only UI treatment changes, or
  whether its existing representation already supports the change.
- Any effect on a parent or another use site. Include that interface only when
  the changed use case affects its interaction or composition contract.

Preserve unchanged elements and research by reference. Maintain a coverage list
so the fuller test covers every affected interface without redesigning the whole
application. If the pilot finds fewer distinct changed elements than expected,
report that; do not invent product changes or split one coherent component just
to increase the sample size.

These first-pass UX inputs are **structurally ready and unreviewed**. Keep that
status visible. Existing production UI contracts require an exact UX review pass.
The experiment therefore needs an explicitly isolated, provisional preview path;
it must not fabricate a passing review or relax the normal publication gate.

## Responsibilities and minimal handoff

| Owner                 | Work                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing flow UX      | Supplies saved goals, flows, actions, outcomes, alternatives and constraints. No new flow-authoring run.                                                                              |
| Wireframe UX author   | Selects affected coherent interfaces; decides grouping, spatial organization, action placement, navigation/focus and state presentation from usage context.                           |
| UI author             | Turns each wireframe into a designed component using the existing design language; researches unfamiliar patterns and decides concrete geometry, density, controls and visual states. |
| Tools and coordinator | Store contributions, generate IDs and receipts, resolve references, render previews, record events and deliver ready handles. No separate assembly agent.                             |

The UI author still makes meaningful design decisions. A timeline needs credible
tracks, objects, gaps, selection, playhead and transport treatment; coloring a
labeled rectangle is not a completed comp. A proposed behavior change returns as
a focused UX question rather than being silently introduced by UI.

Save an element's contributions as its decisions become usable. Code constructs
the handoff from those saved contributions, containing only:

- Stable element ID, revision and exact source-flow references.
- Purpose and usage constraints, using references instead of repeating flows.
- Parent placement/size constraints and reusable child references.
- Spatial structure, visible content/actions and required state variants.
- Relevant focus, feedback and recovery intent; explicit unresolved questions.
- Rendered wireframe location, structured artifact handle and readiness status.

This is a small experiment contract, not a second product model or interaction
graph. Unchanged flows, actions, design-language values and research stay in their
existing stores. Agents submit decisions and changes through the local MCP
service; they do not regenerate complete documents or write rendering scripts.

An element becomes ready when its required structure, usage bindings and preview
are available and mechanically valid. Ready means eligible for this experimental
UI pass, not independently approved. Publish an immutable revision and send its
handle. The UI author acknowledges that revision, works from it, and saves its
result before taking the next item. Later revisions supersede queued items or
create targeted corrections to completed ones; they do not silently change inputs.

## Small, reportable goals

### 1. Establish scope, reusable tooling and measurements

Create an isolated experiment directory and a runner that pins source hashes,
copies/references the saved inputs, and records phase events before any model
trial. Reuse the existing MCP service and runtime-log analysis. Record setup and
implementation effort separately from pipeline execution.

Assess the existing
[UX interaction renderer](../../skills/refine-design/scripts/ux-interaction-wireframe.mjs).
It currently renders annotated regions and action lists, explicitly leaving exact
layout to UI. Reuse its semantic bindings where useful, but the new output must
also show spatial placement. Prefer a small neutral rendering mode using existing
structured layout primitives over another rendering language.

Reuse the existing
[component design path](../../skills/refine-design/references/component-design.md)
and UI parts/scenes for the UI artifact. Add only the isolated preview support and
small wireframe contract necessary for this test. Start with a dedicated
experiment-scoped wireframe-author assignment; repository-wide role installation
and workflow rollout are later decisions.

**Deliverable:** frozen source manifest, candidate flow changes, working event
recording, and one deterministic fixture rendered as both a wireframe and a UI
preview. Verify the happy path: store, render, pass a handle, load the exact
revision. This local fixture is tooling verification, not a measured agent result.

### 2. Measure selection and component-boundary decisions

Start the wireframe author and UI author once. The UI author loads shared
instructions/design-language context and reports readiness while the wireframe
author receives the saved changed flows and required surrounding usage context.
Retain context across elements; do not restart either author per component.

Use Sol/medium initially for the wireframe author, matching the current UX planner.
Keep the UI author's existing Astra/ultra setting. Record effective settings and
do not change them between pilot elements. Any later model comparison is a
separate experiment.

The wireframe author saves the affected-interface inventory and its boundary
decisions before detailed layout work. Separate retrieval time from the observed
selection/boundary-authoring interval. Existing unaffected components provide
context without becoming work items.

**Deliverable:** affected-interface list with reasons, reuse decisions and
dependencies, plus measured time to choose the boundaries. This is the first
useful model result and a checkpoint for detecting unnecessary decomposition.

### 3. Complete the first wireframe and its UI

Choose the smallest meaningful changed interface from that inventory. Define its
required state coverage before authoring; finish the happy path first, then any
additional changed states needed to make the element's handoff usable. Save each
useful contribution, render the spatial wireframe and inspect the actual preview.

Deliver the ready handle immediately. The UI author loads it, applies/reuses
relevant research and produces a structured component plus rendered comp. Inspect
the resulting preview, recording any technical correction separately. Source
verification for new research remains explicit; record its cost as well.

The wireframe author may proceed to the next scoped element while UI designs the
first. Maintain a simple ready queue; do not require the parent to rewrite a large
assignment or assemble a new narrative for every handoff.

**Deliverable:** the first element's wireframe and comp side by side, source-use-case
coverage and separate timings for wireframe work, delivery and UI work. Publish
this early result before waiting for all elements. There is no reviewer yet.

### 4. Complete a small multi-element happy-path pilot

Continue with the same two authors through two or three genuine changed elements,
including a richer component when the inventory supports it. Measure every element
independently; do not select only trivial dialogs. Let UI process ready elements
while the wireframe author creates subsequent ones.

For a parent composition, reference completed child components and design the
remaining arrangement. Do not recreate a child's internals. Record waits caused
by unresolved dependencies, UI backlog, or late revisions.

**Deliverable:** per-element measurements, actual overlap and total time to the
last comp, plus the preserved ready queue and outputs. Judge whether handoffs
reduce repeated interpretation or merely move that work between agents. Avoid a
whole-product speed claim based on unlike historical scopes.

### 5. Add and measure reviewers separately

Only after the authoring happy path works, add a wireframe reviewer and an
independent visual-design review assignment. Review completed coherent elements
or small batches, retaining each reviewer's context across the pilot.

The wireframe reviewer checks the rendered artifact against its use cases:
functionality surfaced, hierarchy, discoverability, focus, feedback, alternate
flows and coordination with reused elements. The visual reviewer checks whether
the comp communicates those decisions with credible component treatment and the
design language. The existing `ui-reviewer` is a code-standards role; do not treat
its name as an existing visual-design review contract.

Freeze and record each first review result before rework. Keep review startup,
initial review, findings, author corrections and affected-scope re-review separate.
Bind findings to exact artifact versions. A wireframe correction invalidates only
dependent UI work; preserve unaffected results. Avoid repeating general-flow UX
review under another name.

**Deliverable:** review findings and quality observations alongside their own
timings, including any work the added stage caused downstream. Report first-comp
time and reviewed-completion time as different endpoints.

### 6. Run the complete affected Alexa set when ready

After the pilot establishes a usable contract, expand to every affected interface
identified from the same saved update. Reuse completed pilot elements and record
which were reused versus newly timed. Report the additional work actually run;
do not present resumed execution as a fresh full-run benchmark.

For a later clean end-to-end measurement, replay the frozen inputs into a fresh
output store. Keep tooling and cached research fixed and record those conditions.
This repeat is optional after evaluating the early results, not a prerequisite to
learning from the pilot.

**Deliverable:** complete affected-interface coverage, component and parent previews,
review results where run, and a recommendation to retain, simplify or defer this
split. Production integration is a subsequent decision supported by this evidence.

## Performance evidence

Record event timestamps mechanically with run, agent, element and revision IDs.
Use monotonic durations within one process and a consistent clock for cross-agent
events. Every element needs the following sequential lifecycle markers:

| Phase                    | Boundary                                                  |
| ------------------------ | --------------------------------------------------------- |
| Ready for wireframe work | Required usage context and boundary decision available    |
| Wireframe work           | Start through saved, structurally valid spatial preview   |
| Handoff and queue        | Wireframe ready through UI work starting                  |
| UI work                  | Start through saved, rendered first comp                  |
| Later review lifecycle   | Separate first-review, correction and re-review intervals |

Within wireframe and UI work, record input collection, research, contribution
generation, tool execution/rendering and technical repairs where observable.
These are **subsets**, not durations to add to their parent intervals. When
reasoning and generation cannot be separated, label the interval as authoring.
Pre-command gaps and output emission are not pure reasoning-time measurements.

Report shared setup, input retrieval and boundary selection once for the run,
not once per element. Preserve per-element boundary timings when individually
observable; otherwise report the joint interval without dividing it arbitrarily.
Record UI preparation and idle waiting separately. The overall run is measured
from launch to the chosen endpoint; overlapping agent intervals must not be summed
into elapsed time. Show sequential phases and cumulative/nested windows in
separate tables, with containment explicit.

For each element also retain contribution/read counts, generated bytes and token
usage when available, time to first saved contribution, state/use-case coverage,
reused parts/research, revision count, errors, compactions and targeted repairs.
Identify research cache hits. Without the optional model observer, unavailable
stream/usage detail stays unavailable rather than being estimated as reasoning.

The principal outcomes are time to first usable comp, time to all scoped comps,
actual overlap, amount of repeated design work, and later quality/rework cost.
Historical UI timings are context only. A controlled claim of improvement would
require the same inputs, scope, quality endpoint and model settings for the old
and new paths; decide whether that extra run is worthwhile after the pilot.

## Execution boundaries and retained outputs

Use the normal Codex model connection and the local MCP data service. Do not use
a local model redirect or observer proxy. Keep source and baseline artifacts
immutable; all generated artifacts live in an isolated output store. Preserve
hashes so rollback means selecting the original baseline, not undoing live edits.

Save progress during this run too. Resume from exact completed revisions after
fixes; rerun only affected work. Record missing data and unresolved design questions
on the relevant element, continue independent elements, and never silently mark
an incomplete component as a finished comp. Keep production publication gated.

Keep reviews sparse and begin with happy-path tooling tests. Comprehensive
negative testing and repository-wide integration do not precede the pilot. Any
development-only data conversion stays isolated from permanent compatibility code.

Planned home: `planning/refinement-efficiency/experiments/wireframe-ui-pilot/` for
the small runner, contract and analysis, with private artifact stores under
`.codex-tmp/`. Retain source and scope manifests, append-only events, contribution
handles, rendered previews, queue state, and review receipts. Produce a Markdown
report and machine-readable metrics with questions/decisions, per-element results,
shared overhead, overlap, limits and next recommendation. During later execution,
use checkpoint advice at coherent implementation milestones with the owner's
standing preapproval of suggested commit messages.
