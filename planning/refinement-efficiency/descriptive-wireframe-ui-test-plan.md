# Descriptive wireframe to UI test plan

Status: executing. Created 2026-10-02. Stages 1-3 are complete, including the
first independently approved matched pair. Stage 4 repeated pairs continue.
Progress and evidence are saved in
[the execution report](experiments/descriptive-wireframe-ui/execution.md).

Test whether a descriptive layout can replace an intermediate rendered wireframe
for a complicated interface, while preserving the quality of the final UI and
reducing the work required to reach approval. Use Alexa's video composition
surface as the fixture. Keep the method and contracts independent of Alexa.

The primary comparison is total elapsed time through an approved UI, including
reviews and repairs. Faster layout creation alone is insufficient if the UI
author must reconstruct missing UX decisions or requires more repair.

## Scope and execution boundaries

- Begin with the current accepted UX. Do not rerun product reconciliation or
  general-flow UX authoring for this experiment.
- Include the complete composition surface: player, timeline, their surrounding
  controls, contextual properties and directly related editing states/dialogs.
  Determine the exact set from source references, rather than a preset component
  list. A timeline-only result is not the whole-surface test.
- Include project/library information needed to understand composition tasks as
  context. That dependency does not authorize redesigning those other surfaces.
- Freeze inputs once; work in isolated experiment directories within this
  checkout. Leave the live product, current pointers and accepted artifacts intact.
- Use the current conversation, its available agents and the local MCP data
  service. **Do not launch a separate Codex session, call the backend directly,
  or use a model proxy, redirect or request observer.**
- No permanent workflow or schema migration is part of this test. Reuse current
  UI rendering, capture and progressive contribution tooling where applicable.

## Stage 1: freeze the composition test packet

Resolve `C:/dev/alexa/product/Alexa/current.json` and its referenced snapshot.
At planning time the current snapshot is revision 8, with SHA-256
`12c09ddff7478114a793a51cfefb8293754276ed03d663d8837694312a5cf007`.
If the product has changed before execution, record the change and freeze the
new current version; do not silently mix generations.

The retained source description at planning time is
`sources/5502890f811ef8c74ffc3b03e5e3b6461fdcc05402fe6c5f1a02df100f7f9ffe/product-description.md`
under that product directory. Resolve the model, accepted UX and design language
through the snapshot, and verify their review bindings. The live
`ux/ux-spec.json` is a discovery aid, not authority to bypass those bindings.

Build one reusable packet containing:

- Source requirements, applicable clarifications and still open questions.
- Composition goals, tasks, flows, actions, visible outcomes, states, guards and
  recovery behavior; preserve meaningful numeric values, units and scope.
- Relevant surfaces, interaction frames and contextual components. Start
  discovery at `video-workspace` / `video-view` and follow their actual references.
  Candidate related flows include `edit-video`, `frame-composition`, `mix-audio`,
  `save-clip` and `update-clip`; include only applicable relationships.
- Relevant findings from the saved `research/product-research-brief.md`, including
  the cohesive workspace guidance and unresolved alternatives. Research advice
  is not an adopted requirement merely because it appears in the brief.
- The same accepted design language, sample content, viewport(s) and UI rendering
  capabilities for both paths.

Use existing selection/reference helpers to assemble the packet mechanically.
Separate authored scope from context-only dependencies. Withhold previous
wireframe geometry, finished comps and review findings from both authors.

Save an input manifest with paths, hashes, record counts, byte counts, scope and
the selected scenario list. Record conflicts or missing information explicitly.
Supply any necessary provisional interpretation identically to both paths and
document it outside the interface; do not silently settle product policy.

Choose a bounded set of scenarios from the accepted UX before either measured
run. Cover the base workspace and consequential distinctions such as range versus
object selection, contextual properties, player versus timeline zoom, editing
outcomes and relevant saving/failure states. Do not generate every combination
of independent states. Both paths must produce the same selected scenario set.

**First deliverable:** a frozen packet and a short coverage manifest that make
the authored interface boundary and expected results inspectable.

## Stage 2: define the descriptive layout and prove the path works

Use a readable Markdown layout document with stable region/component references.
Avoid introducing a second large scene schema. Each coherent region describes:

- Its purpose and the tasks/actions/states it serves, by reference to the packet.
- Parent/child relationships, ordering, grouping, adjacency and relative placement.
- Priority, persistent versus conditional content, and contextual changes.
- Expansion, wrapping, scrolling and responsive intent where these affect use.
- Required affordances and visible outcomes that the UI must preserve.

For example, a description may place the composed preview above an editing area,
group timeline navigation with the timeline, and explain which selection exposes
which properties. It leaves exact dimensions and visual control treatment to UI.
The source and research determine the actual arrangement; this example is not a
fixed template.

Do not require absolute coordinates, pixel rectangles, typography, colors or
intermediate screenshots. Preserve functional information such as time units,
selection boundaries and which control changes which scale. Open questions and
design commentary belong in accompanying documentation, never on the canvas.
A placed but underspecified component may use a placeholder; specified controls
and states must still be represented.

Use an explicitly scoped experimental agent contract. Existing wireframe roles
require geometric scenes, rendering and inspection, so do not assume they will
produce descriptions simply by changing the assignment. Where those contracts
conflict, use an in-session agent with the isolated experimental instructions.
Record its actual model and effort, and match the control author accordingly.

Create only the small input adapter needed to deliver the saved description to
the UI author. Do not manufacture an accepted geometric wireframe or relax live
production gates. A description can receive an experimental structural review
without pretending it passed the production wireframe workflow.

Produce the first composition UI preview before completing every state variant.
Capture layout authoring time, UI authoring time and the author's clarification
requests. This is an early feasibility result, not evidence of a speed advantage.
If the UI author needs missing structural or behavioral decisions, improve the
contract/packet and record that development cost before freezing the comparison.

**Second deliverable:** a readable layout description and a rendered composition
preview showing that the UI author can use it without inventing missing behavior.

## Stage 3: run the matched comparison through review and repair

Run two fresh authoring paths against the frozen packet and scenario set:

| Path                     | Intermediate artifact                                   | Final artifact    |
| ------------------------ | ------------------------------------------------------- | ----------------- |
| A: rendered control      | Structured, rendered wireframe with author inspection   | Rendered UI comps |
| B: descriptive candidate | Saved layout description, without intermediate geometry | Rendered UI comps |

Pin the same model and reasoning effort for corresponding authoring and review
stages. Record actual dispatch settings. Keep prompts, output windows, sample
content, progressive output and render tooling equivalent except where the
representation necessarily changes. Use fresh agent contexts without prior
results. Do not reuse the Stage 2 output as a timed fresh run.

Apply common review responsibilities in both paths:

| Stage                    | Responsibilities                                                                                                                                | Repair owner                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Structural layout review | Source coverage, grouping, priority, contextual visibility, reachable actions, state and recovery representation                                | Layout author; upstream UX only for a genuine source conflict |
| UI review                | Cohesive visual treatment, control conventions, scale/state clarity, text fit, overlap, clipping, readable density and final rendered usability | UI author, unless a finding requires a structural change      |

Review the completed coherent surface/scenario batch. Both paths must pass the
structural check before UI dispatch and the same final UI quality check. Text
overflow caused by chosen dimensions belongs to UI; a layout restriction that
prevents necessary growth is structural. Include representative longer
translations of app-defined text in the final UI inspection for both paths.

This is a rendered control with aligned review ownership, not a reproduction of
every historical production review rule. Report that distinction; historical
timings are context, not a controlled baseline.

Retain independent reviewers as the external quality check. Do not add an extra
self-review loop to just one path. Continue repairs until approval, retaining
each submitted revision, finding and repair timing. Keep rejected first passes
so a fast but incomplete result cannot be counted as a successful optimization.

**Third deliverable:** one matched pair, approved final previews, findings by
stage and an early comparison of total work. Report promising, mixed or worse;
one pair does not establish a reliable effect.

## Stage 4: check whether the result repeats

If the first pair establishes feasibility, complete two more matched pairs,
for three pairs total. Reverse the path order between pairs. Run one path at a
time to avoid introducing concurrent workload as another variable. Keep agents
fresh and inputs/settings fixed. Do not tune between measured pairs; a necessary
contract change starts a separately labeled comparison series.

Report every run, mean, median, range, first-pass approvals, finding counts and
repair rounds. Separate structural/coverage findings from visual UI findings.
Agents are nondeterministic: fewer failures in one run is not proof the method
prevents that class of error. Three pairs provide an initial decision, not a
general scaling claim.

## Measurement and saved evidence

Use existing MCP operation events, receipts and agent dispatch/completion markers.
Add only missing phase markers. Save data as it arrives, including failures.
Host reasoning-token or stream metrics may be included if already available;
otherwise mark them unavailable. Elapsed authoring time includes more than pure
reasoning and must not be labeled as a direct reasoning measurement.

Record phases in execution order, with separate start/end timestamps:

1. Agent instruction preparation and input collection.
2. Layout authoring, plus render/inspection time in Path A.
3. Structural review and each structural repair/re-review.
4. UI input collection, authoring, rendering and author inspection.
5. UI review and each UI repair/re-review.
6. Final approval and report/coordination overhead.

Include tool counts, known tool durations, generated contribution sizes,
clarification requests and rewritten artifact sizes when observable. Keep
tooling-development time separate from repeated execution costs. Failed calls
and recovery remain included in the affected run's total, with their causes noted.

Report request-to-approved-UI elapsed time and stage costs. Show encompassing
windows separately from their subintervals; do not add overlapping agent/root
windows or present nested totals as successive phases.

Store durable manifests, per-run metrics and the report under
`planning/refinement-efficiency/experiments/descriptive-wireframe-ui/`.
Use `.codex-tmp/descriptive-wireframe-ui-<run>/` for isolated working artifacts
and previews. Save exact artifact references and revision hashes so interrupted
runs can resume without recreating completed work. Verify live input hashes at
the end to confirm the experiment left the product intact.

## Decision and completion

Prefer the descriptive path only if it reaches equivalent approved coverage with
lower total authoring/review/repair cost across the repeated runs. Examine whether
any savings exceed run variability and whether UI authoring absorbed the removed
layout work. Also report credit/token usage where available; faster elapsed time
alone does not establish lower credit use.

If results are mixed, identify the missing information or shifted work before
proposing another test. Do not roll out a permanent workflow change based solely
on a faster intermediate artifact.

Completion means the frozen scope, first preview, matched comparisons, reviews,
repairs, metrics, final previews and decisions are saved and linked in an execution
report. Record questions and decisions made during execution. If later invoked
through independent-execution, apply its checkpoint-adviser and preapproved commit
message rules to meaningful tooling/report changes; do not checkpoint unrelated
work as part of this experiment.
