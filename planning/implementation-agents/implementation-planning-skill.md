# Implementation Planning Skill Proposal


Status: deferred design preserved for future work. The owner has explicitly
deferred implementation planning and coding until that stage is resumed. This
records the intended boundary and output so they are not reinvented; it does
not create or install a skill, invoke agents, approve coding orchestration, or
select a final artifact format. The current resolver supports PRD contexts only. Additional consumer views and the planning handoff remain prerequisites; see the [product model pipeline](product-model-pipeline-plan.md).

## Purpose

Create a separately callable skill that turns the current accepted product,
UX/UI, system architecture, coding architecture, and repository evidence into a
sequence of discrete implementation deliverables. It bridges design and coding
without becoming either the product-design skill or the coding orchestrator.

A deliverable is a bounded, reviewable outcome that can be selected as the
input to one coding-orchestrator task. Prefer vertical slices that produce an
observable or independently verifiable capability. A foundation-only
deliverable is valid when later slices truly depend on it, but organizing the
plan as broad model/view/controller phases should require a concrete dependency
rather than convenience.

## Role Boundaries

- `refine-design` develops product intent, UX/UI direction, acceptance criteria,
  and advisory architecture decisions.
- System architecture establishes runtime, host, storage, API, trust, and major
  technology boundaries.
- The Polylith architect establishes application structure, responsibility
  boundaries, and cross-specialty contracts when that detail is needed.
- The implementation-planning skill selects useful delivery boundaries,
  prerequisites, sequencing, and readiness gaps from those inputs.
- A fresh coding orchestrator receives one selected deliverable and decomposes
  it into assignments, file ownership, execution order, verification, and
  review activity.

The planner does not implement code, assign live writers, run the coding
workflow, issue compliance verdicts, or silently decide missing product or
architecture behavior. It may expose that a proposed deliverable needs further
UX, UI, system, model, controller, view, testing, or coding-architecture input.

## Inputs And Stateless Operation

Every invocation starts from supplied durable input rather than remembered
conversation state. Input may include the human-owned product description,
relevant PRD sections and comps, accepted decisions, architecture records,
repository source/build/test context, earlier implementation plans, completed
deliverables, and explicit constraints. The skill may start from incomplete
material and produce a conditional partial plan; it must not manufacture
readiness.

Route each material question to the available agent most likely to answer it,
following [shared research, routing, and lifecycle guidance](research-guidance.md).
Specialists are spawned for bounded questions and released after answering.
They may research uncertainties within their scope. Reusable findings are
persisted by the skill's parent or another authorized documentation owner, not
left in agent memory.

## Proposed Deliverable Record

Each deliverable should be understandable without the planner's live context
and should contain only the detail needed to decide, execute, and verify it:

- **Outcome:** the user-visible, system-visible, or independently verifiable
  capability produced.
- **Scope:** included behavior and meaningful exclusions.
- **Inputs and authority:** accepted product, UX/UI, architecture, contract, and
  standards references on which the deliverable depends.
- **Dependencies:** preceding deliverables, external capabilities, and decisions
  required before work can start or finish.
- **Responsibility boundaries:** expected specialties and established owners;
  exact files only when repository evidence makes them useful and reliable.
- **Acceptance:** observable behavior and completion criteria inherited from the
  governing design.
- **Verification and review:** meaningful tests, integration evidence, and the
  earliest coherent review point.
- **Risks and unknowns:** unresolved decisions, feasibility questions, migration
  concerns, or evidence gaps, distinguishing blockers from conditional work.
- **Handoff:** enough current context for a fresh coding orchestrator to accept
  this deliverable as its bounded task.

Do not inflate a deliverable with every eventual implementation task. The
coding orchestrator owns task-level decomposition after selection. Avoid time
estimates without a defined estimation method and project evidence; relative
complexity or risk may be useful when its basis is stated.

## Plan Behavior

The plan is a living durable artifact. A later invocation rereads current
design and repository state, marks completed or superseded deliverables,
reorders dependent work when evidence changes, and preserves still-valid
rationale. Stable identifiers may help track deliverables, but the human-facing
document must remain readable and must not rely on an agent thread or hidden
state.

Planning should identify the smallest useful first deliverable and explain why
its boundary is coherent. Independent deliverables may proceed separately;
dependent ones retain explicit ordering. A deliverable is ready for orchestration
only when its required product behavior, architectural boundaries, acceptance
criteria, and verification path are sufficient for that work. Global product
completeness is not required.

## Questions For The First Design Pass

- Select the skill name and invocation language.
- Decide the durable output filename and whether machine-readable companion data
  is useful in addition to the human-authored or human-reviewable Markdown plan.
- Define how deliverable identity, status, supersession, and completion are
  represented without making ordinary editing difficult.
- Define the minimum readiness check before a deliverable can be handed to the
  coding orchestrator.
- Decide when the planner requests Polylith-architecture synthesis versus using
  an already accepted architecture record.
- Define how completed implementation and review evidence feeds back into the
  plan without duplicating the review ledger or Git history.
- Create evaluation cases for over-large phases, fragments too small to review,
  unresolved product behavior, architecture gaps, independent parallel slices,
  and replanning after a completed deliverable.
