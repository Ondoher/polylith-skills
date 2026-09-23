# Product model and downstream workflow plan

## Implemented pipeline

The current chain is:

~~~text
human description
-> refine-design semantic interpretation
-> immutable product model and specialty artifacts
-> verified snapshot and PRD context
-> generate-prd static HTML publication
~~~

The source description remains human-owned. Refinement owns interpretation,
design decisions, dependency impact, locks, provenance, and context production.
The publisher consumes persisted data without rereading product prose,
researching, consulting agents, or choosing design defaults.

Repository-backed state lives under product/<name>/. Refinement asks for a
missing or ambiguous product name before saving. The normal final output is
product/<name>/prd/; explicit detached exports are supported. Reset preserves
human inputs and rebuilds derived design through the same location contract.

## Current artifacts and contracts

| Layer | Current role |
| --- | --- |
| Product model | Stable product records, typed meaning, locks, dependencies, and source traceability. |
| Specialty artifact | Independently versioned UX, visual, UI, component, and other supported structured decisions. |
| Snapshot | Exact model/artifact bindings, lifecycle states, and dependency graph. |
| PRD context | Validated frozen publication input with scoped records, included artifacts, gaps, locks, and exclusions. |
| Publication | Compact model review or full manifest-selected design site, with generated-file and resource receipts. |

The [refinement skill](../../skills/refine-design/SKILL.md#greenfield-artifact-policy)
owns current schema versions. The [context contract](../../skills/refine-design/references/product-context.md)
and [publisher](../../skills/generate-prd/SKILL.md) define executable behavior.
Each persisted kind accepts its current version only; compatibility work needs
an explicit real consumer and owner authorization.

Full PRD publication and the refine-design/generate-prd responsibility split
are implemented. Renderer helpers retained under refinement support bounded
inspection and shared rendering; their location does not make refinement a
second final publisher. The old instruction to physically move every renderer
is not a remaining acceptance requirement.

## Unimplemented consumer expansion

The context resolver currently accepts only prd. Technical documentation,
implementation planning, system-architecture views, and coder packages remain
future consumers, even where model metadata can describe those domains.

Before adding each consumer:

- Define its required records, artifact kinds, closure, locks, gaps, and exclusions.
- Reuse the verified model and snapshot; do not reinterpret raw Markdown.
- Prove deterministic filtering and rejection of inaccessible dependencies.
- Test that unrelated visual or technical payloads do not leak across views.
- Publish its context contract and consuming workflow together.

No prior slice number or completion date authorizes this work automatically.

## Deferred Implementation-Planning And Coding Design

The following design is intentionally retained for later implementation. It
defines how future consumers use the parsed product model and prevents the
planning/coding workflow from being redesigned from scratch. It remains deferred and does not authorize creating or running these units.

### Implementation-planning skill

Create a separately callable planning skill, provisionally
`plan-implementation`. It consumes an implementation-planning context lockfile,
accepted UX/UI and architecture artifacts, a repository baseline, applicable
contracts and standards mappings, earlier plans, and completion evidence.

Persist canonical `implementation-plan.json` plus a generated human-readable
view. Each deliverable records a stable ID; lifecycle status; observable
outcome; scope and exclusions; product, UX, UI, and architecture references;
dependencies; repository constraints; acceptance criteria; verification intent;
next substantial review boundary; risks; readiness; and the
coding-orchestrator handoff.

Deliverable lifecycle is `proposed`, `ready`, `active`, `blocked`,
`superseded`, `completed`, or `invalidated`.

Acceptance:

- deliverables are coherent vertical outcomes rather than broad discipline
  phases or tiny implementation fragments;
- missing decisions become routed gaps rather than planner inventions;
- product changes invalidate only affected deliverables; and
- planner output remains useful without its agent thread.

### Work package and coding-orchestrator handoff

Selecting one ready deliverable produces immutable `work-package.json` with
exact plan/snapshot hashes, record references, architecture contracts, scope,
exclusions, acceptance criteria, verification, review gates, expected
specialties, repository baseline, and staleness rules.

Before execution, the separately spawned coding orchestrator resolves a frozen
context, refreshes repository and standards evidence, rejects stale bindings,
requests mandatory coding-architecture triage, reuses accepted architecture,
requests only relevant specialist assessments, stabilizes contracts, assigns
disjoint file ownership, starts fresh implementation agents, and requests
review at the planned substantial chunk boundaries.

Missing or contradictory input produces a typed decision request naming the
affected records and owning specialty. Coders do not invent the answer.

Acceptance:

- an assessment-only dry run produces assignments and dependency order without
  writing code;
- every coder receives only relevant records and standards;
- no coder receives `product-description.md`;
- two assignments cannot own the same file; and
- a stale work package cannot start.

### Bounded coding pilot

After the existing role-readiness and repository opt-in gates pass, run one
small coherent implementation deliverable with established behavior,
architecture, observable verification, and a planned substantial review point.

Persist `implementation-result.json` bound to the work package and source
hashes. Record changed files, completed acceptance references, tests, reviews,
deviations, remaining gaps, reusable research, and final disposition. Feed this
evidence into a later planning run without duplicating Git history or the
review ledger.

### Change handling, efficiency, and coding-workflow cutover

Change one product-model record, recompute dependency impact, preserve
unaffected artifacts and deliverables, invalidate affected packages, assess
active work explicitly, replan the affected scope, and regenerate relevant
publications.

Measure context bytes/tokens, elapsed time, repeated facts, agent and reviewer
calls, correction cycles, and quality against a comparable single-agent
baseline. Use greater reasoning for semantic parsing, UX, system architecture,
and difficult architecture triage; reduce it as assignments become narrower and
contracts more explicit.

After these future checks, remove any remaining downstream
raw-product-description paths in the planning/coding workflow, update global
coding documentation, and run product-neutral workflow evaluations. Use an unrelated product as a withheld full-chain test, with its evidence retained in the product repository.


## Verification expectations

Maintain tests for exact source binding, current-schema rejection, immutable
artifacts, snapshot integrity, scoped dependency invalidation, locks, context
closure, and deterministic publication. Invalid or interrupted publication must
preserve previously owned output; unowned files must not be overwritten.

Future planning and coding tests must also cover stale work packages,
overlapping writer ownership, changed requirements, interrupted work, review
handoffs, and useful restart from durable records. Use sanitized or synthetic
fixtures, and keep product-specific evaluations in their owning repository.
