# Deferred exploration: UI states and shared treatments

Recorded: 5 October 2026.

Status: deferred exploration. No implementation or experiment has started.
This record does not expand the [supported operating scope](parallel-design-readiness.md)
or change the current author limits and review gates.

## Problem to explore

A workspace can contain several related flows and many interface states. Assigning
the whole workspace to one author can leave one oversized branch while other
authors finish. Dividing it into arbitrary patches risks conflicting behavior,
inconsistent visual treatments and difficult integration.

Explore a more explicit handoff:

**UX state inventory → UI treatment plan → assembled UI states.**

Agent preparation is the [next planned change](parallel-design-agent-preparation-plan.md).
Keep this state/treatment/assembly exploration for later so startup effects and
design decomposition effects can be evaluated independently.

## UX defines necessary interface states

UX identifies the necessary states for each interface element from accepted
requirements, frames, actions, feedback and task alternates. Each required state
needs a stable reference and observable meaning: relevant content, available
actions, selection, operation feedback, entry/exit behavior and recovery context.

Include meaningful combinations such as retained selection during a failed
operation. Do not generate every theoretical combination or silently omit a
required state because it shares most of its presentation with another.

Prefer a source-bound inventory derived from existing canonical UX records.
Determine whether any missing semantics need to be authored in those records;
avoid introducing a competing requirements document or behavior authority.
Unresolved cases remain explicit gaps. This handoff preserves the independent
whole-UX review before dependent UI authoring.

## UI plans reusable treatments

One UI planning owner consumes the state inventory and accepted spatial guidance.
It identifies shared structure and recurring visual treatments: selection,
focus, disabled controls, pending operations, errors and other needed conditions.
UX supplies their meaning; UI selects their presentation.

Related selection meanings may require distinct treatments rather than a single
generic selected style. Define their relationship once, including how treatments
combine in required states. Bind reusable templates, components and tokens to
the same saved revision and supply representative examples where useful.

The treatment plan maps every required UX state to its required treatments,
intended scene and authoring owner. Missing mappings, unresolved treatments and
conflicting ownership remain visible. A UI planner cannot remove a required UX
state through this mapping.

State authors return uncovered treatment needs to the shared owner through the
coordinator. Consolidate equivalent requests. A changed shared treatment has a
new identity and invalidates its actual consumers; broader exact review bindings
may require a wider recheck.

## Authors assemble complete states

Explore smaller, independently owned contributions that consume a shared base
and its treatments. Each author produces complete assigned state scenes through
the existing parts/scenes mechanism, with source and treatment references. Keep
shared structure and treatments under one owner.

Prefer this approach to concurrent edits of the same owned element or scene.
Different state names alone do not establish independence: actions, transitions,
shared rules and treatment definitions also need exclusive ownership.

Current scene overrides cannot change child trees or remove behavioral bindings.
States with different control trees require separately owned parts. Investigate
how existing units can express the boundaries before changing schemas or adding
a general patch-merging mechanism.

The parent assembles the contributions. One flow owner integrates the state
meaning into coherent task narratives, including transitions, cancellation,
recovery and captured return context. State decomposition must retain user goals
and cross-state consistency.

Check that every required state has an actual scene or a justified unresolved gap,
that each referenced treatment is current, and that shared treatment use is
consistent. Existing structural checks and independent rendered UI review remain
required; reference coverage alone does not establish visual or behavioral fidelity.

## Bounded evaluation before promotion

When this exploration resumes, use one unrelated synthetic interface, one shared
base, recurring treatments and two independently assigned state contributions.
Include a meaningful combined state. Assemble into existing consumer formats
and obtain the existing independent reviews and actual rendered evidence.

For composition, exercise a missing required state, conflicting ownership, a
treatment change after authoring begins and interruption followed by recovery.
Compare omissions, independent-review findings, correction effort, integration
cost and elapsed time against the current approach. An ordinary dialog or property
panel split is a simpler alternative worth comparing before general state splitting.

Do not combine preparation and composition results into a speed claim or promote
either merely because a dependency graph validates. Keep the existing execution
mode available until evidence supports a revised boundary.

Keep real product inputs, decisions and durable evaluation evidence in their owning
application product folder. Temporary experiments belong under `.codex-tmp/`;
reusable committed fixtures must remain synthetic and product-neutral.

## Questions for the exploration

- Can existing UX records provide a complete per-element state inventory without
  creating another behavior model?
- What is the smallest reusable treatment unit, and how are treatment combinations
  and justified local exceptions represented?
- Which state tasks have independent ownership, and which should remain with a
  shared base or flow owner?
- Can existing units express those boundaries and exact dependencies with safe
  assembly, or is a narrowly scoped contract extension needed?
- Does the smaller work division improve useful concurrency enough to cover its
  planning and integration cost?

## Current contracts to retain

- [Operational ownership and recovery](../../skills/refine-design/references/operational-design-plan.md)
- [Bounded parallel design](../../skills/refine-design/references/parallel-design.md)
- [Incremental UX contributions](../../skills/refine-design/references/ux-contributions.md)
- [Native units and single-pass authoring](../../skills/refine-design/references/single-pass-design.md)
- [UI composition and traceability](../../skills/refine-design/references/ui-composition.md)
- [UX review gate](../../skills/refine-design/references/ux-review.md)
