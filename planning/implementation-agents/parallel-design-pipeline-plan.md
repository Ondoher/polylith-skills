# Research-first planning and parallel design: execution plan

Status: all seven milestones complete within the proven native two-workflow scope. See the
[milestone progress record](parallel-design-pipeline-progress.md) and
[operating scope](parallel-design-readiness.md). Serial remains the default;
explicit bounded parallel use retains whole-stage exact review gates. Broader
live cases and hosts require their own evidence. Preserve the milestone
acceptance checks below when expanding or repairing the implementation.

## Intended outcome

The initial pipeline becomes:

**Parser → product/UX researcher → UI researcher → planner → scoped parallel design workers.**

The parser establishes source-bound product authority. One product/UX researcher
assesses interaction questions and existing coverage; one UI researcher consumes
those findings and assesses remaining presentation questions. Both use the same
product-owned research catalogue. The planner proposes ownership, work boundaries
and dependencies. Deterministic code validates and persists the plan, computes
readiness, tracks assignments and recovers execution. Model conversation history
is not required to reconstruct the work.

Design workers retain their specialties and existing independent review gates.
The parent coordinates canonical writes. New research gaps return through one
queue to the appropriate research role instead of prompting independent searches
by several workers. Research assignments remain bounded; release researchers
after their saved handoff and issue a new assignment only for a material gap.

## Starting point and implementation boundaries

Reuse these maintained mechanisms:

- [Product location](../../skills/refine-design/references/product-location.md)
  and `product-location.mjs` resolve the owning app's product and research roots.
- [Research library](../../skills/refine-design/references/research-library.md)
  defines question coverage, verification, reuse and preservation. Keep its
  maintained Markdown catalogue; do not replace it with a second research schema.
- [Single-pass authoring](../../skills/refine-design/references/single-pass-design.md),
  `design-records.mjs` and `design-contributions.mjs` preserve units, explicit
  references and revision-checked contributions.
- [Shared MCP workflow](../../documentation/workflows/mcp.md),
  `scripts/mcp/WorkflowService.mjs` and `DomainOperations.mjs` provide scoped
  assignments, saved results and existing-writer operations.
- [UX review](../../skills/refine-design/references/ux-review.md) binds acceptance
  to exact source/UX bytes and passing scope. Existing UI review, rendering and
  publication rules continue to apply.
- [Refinement cycle](../../skills/refine-design/references/refinement-cycle.md)
  requires coherent source writeback before freezing review inputs.

The current single-pass contract explicitly uses one UX author and one UI author.
Parallel authoring needs an explicit, tested mode added during integration; editing
this planning document alone does not override that contract. The existing parent
conversation initially performs the planner assignment. Add a dedicated managed
planner role only if the live evaluation demonstrates a need; add its catalog
entry and definition together if that happens.

Keep the new work plan operational. It references canonical meaning and existing
artifact identities; it is not another UX graph, requirements model or publication
outline. No canonical product/UX/UI schema replacement, general-purpose coding
orchestrator, application implementation or final-publication redesign is in scope.

Store each app's durable execution state under
`product/<name>/planning/<plan-id>/`, with evidence under its product-owned run
folder. Research stays under `product/<name>/research/`. Skills-repository
deliverables contain only reusable instructions, code and unrelated synthetic
fixtures. Temporary experiments may stage app data under `.codex-tmp/`; preserve
useful app results before retiring those copies.

Use this conversation's available agents and tools for live model work. Repository
scripts provide deterministic operations and fake-worker simulations. They must
not launch another Codex session, call a model backend or introduce a proxy.

## Milestones

### M1. An inspectable plan with enforceable ownership and dependencies

**Deliverable:** a small operational plan contract, validator and inspection
command, plus a synthetic example with two independent workflows sharing one
component. A person can inspect the source coverage, shared owner, prerequisites
and initially eligible work before any worker is launched.

Work:

1. Inventory the existing unit, assignment and review contracts. Identify which
   fields can be referenced directly and which execution metadata is missing.
2. Specify stable plan/work-item IDs, exact input identities, scope, role, owned
   unit/output references, dependency IDs, required gates, unresolved decisions
   and result/receipt references. Define revisions and permitted state transitions.
   A future dependency names its producing item and expected output; bind its
   actual revision when produced. Do not invent hashes for missing artifacts.
   Dispatch requires all necessary input bindings to resolve and be current.
3. Require every requested outcome to map to work or an explicit justified gap.
   Shared outputs have one owner; local adaptations identify their shared inputs.
   Independent review is a distinct assignment, with authors excluded from reviewing
   their own accepted work.
4. Implement validation and a compact inspection/readiness view. Reject missing
   prerequisites, cycles, conflicting output ownership, unsupported roles/stages,
   invalid references and unaccounted requested scope. Identify semantic overlap
   that needs planner judgment rather than pretending IDs prove unique meaning.

**Acceptance:** the synthetic plan has one shared owner and at least two independent
work items that can run concurrently once their prerequisites are satisfied.
Malformed plans produce actionable findings. Repeated inspection produces the same
eligible set. An independent source-coverage checklist exposes omitted outcomes.

**Checkpoint:** plan contract, validator and a readable dependency/ownership view.
No agent dispatch or canonical writes are needed to establish this milestone.

### M2. Saved execution state that survives interruption

**Deliverable:** a deterministic coordinator that runs the M1 plan with fake workers,
saves state before dispatch, and resumes from disk without conversation history.

Work:

1. Persist the validated plan before its first assignment. Keep a compact current
   state and the transition evidence needed to explain recovery. Derive readiness
   from current dependencies rather than trusting a stale saved ready flag.
2. Implement single-writer coordination, atomic persistence and revision checks.
   Claiming a work item records its attempt, role, scope and exact inputs before
   dispatch. Reject conflicting claims and stale updates.
3. Record delivery separately from validation and acceptance. Duplicate delivery
   is idempotent; an incompatible result becomes a repair notice. Workers do not
   grant themselves canonical authority or a passing review.
4. Reconcile dispatch intent with observed worker state. After interruption, query
   available live assignments before redispatch. If liveness cannot be established,
   retain an explicit uncertain assignment instead of assuming failure or acceptance.
5. Reuse saved contributions when replacing a failed worker. Late results from an
   earlier attempt cannot overwrite its replacement. Reissue process-local MCP
   capabilities after restart; never persist access tokens as durable plan context.

**Acceptance:** restart with only saved files and current worker observations yields
the same eligible work and accepted results. Completed units survive. Duplicate
delivery, competing claims and stale/late results cannot duplicate acceptance or
overwrite current work. An uncertain dispatch is visible and recoverable.

**Checkpoint:** an offline demonstration that pauses, restarts and finishes the
synthetic plan with its shared output still owned once.

### M3. Failure and change behavior proved before live agents

**Deliverable:** a bounded scenario suite and recovery report covering dependency,
review and persistence failures. This tests coordinator behavior, not copied
implementation details.

Exercise:

- Out-of-order completion, partial delivery, worker failure and repeated receipts.
- Interruption before dispatch, after launch, after output save, during review and
  around state promotion; truncated or inconsistent saved state fails explicitly.
- A failed/unavailable UX reviewer: independent work continues, dependent UI stays
  gated. Structural validation and a transport receipt cannot stand in for review.
- A shared input changes while dependents are running: affected work becomes stale,
  late results are retained as history, and unaffected reusable work survives.
- A human-source change: use the existing complete interpretation/writeback rules
  and exact review invalidation; never repair freshness by changing hashes alone.
- A discovered overlap or dependency cycle: revise and validate the plan before
  dispatching the affected work. Preserve completed contributions and ownership.
- Canonical state may have changed after an uncertain write: inspect it before
  retrying through the existing writer and compare-and-swap boundaries.

**Acceptance:** each case has an explicit expected state, eligible/blocked set,
retained outputs and next recovery action. No dependent result is accepted against
stale inputs or missing reviews. Invalidation follows actual binding scope: a
whole-document review can require wider invalidation than an individual work item.
Tests do not promise narrower reuse than the current consumer can verify.

**Checkpoint:** a runnable fake-worker failure demonstration and passing scenario
suite, including a fresh-process recovery run.

### M4. One coordinated research handoff and a source-bound model plan

**Deliverable:** the parser → UX research → UI research → planner handoff, producing
an app-owned saved plan that the M1–M3 coordinator can execute.

Work:

1. Reuse parsed product authority and saved research; derive UX/UI questions from
   source and current scope. Run the initial product/UX research assignment first,
   then give its evidence and remaining gaps to one UI research assignment.
   An adequately answered question needs no ceremonial new search.
2. Track question ownership and outstanding assignments in the execution state,
   referencing catalogue IDs. Record reuse, recheck, extension and owner/technical
   dependencies. Group overlapping questions by actual scope; a matching URL alone
   does not establish that two claims have the same coverage.
3. Preserve useful partial research and parent verification in the app. Pending
   verification cannot close a material research gate. Keep factual verification,
   applicability and design acceptance distinguishable.
4. Define a bounded planner assignment consuming parsed authority, the shared
   research handoff, existing designs/locks and unresolved dependencies. It proposes
   decomposition and shared ownership; deterministic code validates and saves it.
5. Test planner quality on independent workflows, shared components, conflicting
   evidence, sparse inputs and unresolved owner decisions. Use a rubric for coverage,
   coherent boundaries, useful parallelism and honest uncertainty. Accept different
   valid decompositions rather than comparing wording with a golden response.

**Acceptance:** the saved plan is bound to the supplied facts and evidence, has
complete scope accounting, and makes common ownership and blocked decisions
inspectable. A second invocation retrieves applicable findings and completed work.
A late question is checked against answered and assigned questions before research
is dispatched; it cannot silently trigger duplicate discovery in several workers.

**Checkpoint:** a reviewable model-proposed plan plus its validation, coverage
assessment and research-reuse record. Planning is complete before workers start.

### M5. Parallel authoring through existing stores and exact review gates

**Deliverable:** a bounded parallel mode in refine-design, exercised against the
synthetic fixture through the existing assignment, contribution and writer routes.

Work:

1. Dispatch ready work with explicit owned record references, source/dependency
   identities and proposal paths or scoped MCP capabilities. Give context/shared
   units one owner. Keep canonical assembly and persistence parent-owned.
2. Integrate status, contributions, completion and repairs with the existing stores.
   Demonstrate that simultaneous independent contributions preserve each other's
   meaning, and that an overlap is rejected or reconciled explicitly.
3. Consolidate consequential decisions into the authoritative description before
   freezing review inputs. Workers propose changes; they do not independently
   rewrite shared authority or acceptance state.
4. Start with a safe phase boundary: parallel UX contributions → assembled/frozen
   UX → independent review → parallel eligible UI contributions. Allow shared visual
   foundation work only under its existing rules. Per-track UX→UI overlap is a later
   optimization unless exact independent scope bindings are demonstrated here.
5. Use real review subjects and receipts. Rendering, qualitative UI inspection and
   final assembly retain their existing gates. An unavailable reviewer preserves
   partial work and an explicit block, without a fabricated pass.
6. Update the skill, single-pass instructions, research role handoffs and MCP
   documentation together. Expose the new mode explicitly; retain the serial route
   for repair, comparison and hosts that cannot support scoped parallel delivery.

**Acceptance:** the synthetic parallel path creates valid existing-format artifacts
with one shared owner, independent UX review before dependent UI, and the required
UI/render evidence. A changed shared input produces the expected repairs. Supported
MCP and retained file/CLI delivery preserve the same ownership and gate semantics.

**Checkpoint:** a reproducible end-to-end synthetic run and updated operational
instructions. Report the actual concurrency boundary, including any full-UX barrier.

### M6. Live proof of quality and recovery with bounded in-session workers

**Deliverable:** one serial baseline and one parallel run for the same small
synthetic product, followed by an interrupted/recovered parallel run.

Use two workflows sharing one component. Freeze the same source and applicable
research packet for comparison. Bound the author pool initially to two concurrent
workers; shared work has its designated owner. Assign independent reviewers
separately and keep every assignment self-contained and ephemeral.

Measure source coverage, independent review findings, shared-output consistency,
research reuse and duplicate assignments, repair/restart effort, elapsed time and
available usage evidence. Mark unavailable measurements unknown. Do not bypass
review or count failed attempts as savings. Compare outcome quality, not exact
layout or identical model decomposition.

At a defined dispatch/delivery boundary, end the coordinator's active assignment
and resume with a fresh in-session coordinator supplied only durable state,
operating instructions and current live-assignment observations. This approximates
loss of conversation context; it is not a claim that the client forcibly compacted.

**Acceptance:** all requested outcomes remain accounted for, exact review gates
pass, shared work has one owner, and recovery needs no replay of accepted authoring.
No unplanned duplicate research or dispatch occurs. Explain any quality regression,
extra review work or lack of speed improvement before expanding scope. Keep live
results distinct from fake-worker evidence.

**Checkpoint:** a side-by-side evidence report and a fresh-coordinator recovery
receipt. This is the first evidence for model-plus-coordinator behavior.

### M7. Broader evaluation and a supported operating mode

**Deliverable:** a bounded evaluation matrix, final operating guidance and an
explicit readiness assessment for routine use.

Exercise a sparse product, a larger interdependent design, an incremental update,
and a change to a shared dependency. Include late research gaps, conflicting
findings and a missing specialist. Use synthetic products for reusable fixtures;
an authorized real-app trial stores its inputs, plan and results in that app.

Finish recovery guidance: where the plan lives, which files a fresh coordinator
loads, how it verifies current inputs/reviews, how it reconciles active workers,
how it claims ready work, and how it reports blocked or uncertain operations.
Keep the recovery entry point small and link to detailed saved artifacts. Do not
resume a clean reset from previous derived research or plans; reset retains its
fresh-input rules.

**Acceptance:** the evaluation demonstrates source coverage, unique ownership,
reliable restart and exact gate preservation across the matrix. Measured benefits
and limits are explicit. Resolve material failures or leave the mode scoped to
its proven cases; never claim general readiness from the small pilot alone.

**Checkpoint:** the reviewed readiness report, final instructions and remaining
bounded follow-up list. Global installation or publication follows the existing
explicit workflows when requested.

## Execution and verification discipline

For each milestone, save its scope, completed deliverables, validation evidence,
unresolved issues and next eligible milestone. A milestone is complete only when
its stated acceptance checks pass; starting code or producing a draft is not its
exit. Keep repairs within the affected milestone and preserve successful prior work.

Place new deterministic helpers and meaningful tests under the existing
`skills/refine-design/scripts/` ownership. Add named package scripts for the
coordinator/scenario suites as those tools are implemented. Add service integration
coverage to the established MCP tests where needed. Do not invent commands as if
the helpers already exist. Use current named fast/design and focused MCP lanes
according to the changed contracts; widen testing when an integration change or
unresolved failure justifies it. Documentation-only planning needs formatting,
link and consistency checks rather than application tests.

Record live model measurements only in M4/M6/M7 when actual assignments run;
offline deterministic milestones do not imply live agent quality. All runtime
plans and milestone evidence for consuming apps are app-owned. This generic plan
and its synthetic fixtures are the reusable repository deliverables.

First execution step: inventory the existing record, assignment and review
contracts, then produce M1's operational contract and synthetic dependency/ownership
view. Do not begin live fan-out until the offline persistence and recovery gates
are demonstrated.
