# Streaming assembly: discussion notes

Recorded 2026-09-27. This captures an idea for further exploration, not an
approved implementation plan, schema, new agent role or change to review gates.
The owner subsequently authorized a bounded experiment and finer measurements.
See [the executed experiment](packet-assembly-experiment.md): exact assembly
worked, but packets grew 11.16% and no speedup was established. No new production
packet schema or assembly-agent role has been selected; no product reprocess ran.

Related context: [single-pass UX/UI](single-pass-ux-ui.md),
[performance findings](performance-findings.md#interactive-refinement-target),
and the [efficiency plan](plan.md).

## Purpose and working hypothesis

The owner wants refinement well under one minute, potentially driven by changes
agreed in conversation. Delta handling and determining the reach of changes help
iterative work, but initial processing and large updates also need improvement.
Single-pass authoring and parallel agents do not by themselves reduce the amount
of information each agent must generate and reconcile.

The owner's hypothesis is that design decisions take a fraction of the time,
while recording, organizing, cross-referencing, coordinating and repairing their
representation consume most of it. Existing measurements are consistent with
that possibility but do not establish the proportions. Fast deterministic
assembly excludes the agent work needed to prepare its inputs.

Distinguish design judgment, representation work and execution overhead. A model
can spend reasoning tokens on bookkeeping; provider token categories alone cannot
separate useful design judgment from representation work.

## Owner's proposal and clarifications

An assembly agent could receive information from the design agents and assemble
and cross-reference it while those agents continue their work.

The delivery unit is the **smallest useful packet of information**. It need not
be a complete flow, interface element or canonical record. Partial information
and references to definitions that will arrive later are explicitly allowed.
The earlier suggestion that each packet must be a complete interaction was too
restrictive. Usefulness depends on the meaning contributed, not on a fixed size
or a requirement that every reference already resolve.

Packets may rely on shared context instead of repeating it. They should preserve
enough identity and intent to associate subsequent contributions without guessing
new behavior. How that identity is represented remains to be designed.

## Possible operating method

1. UX or UI saves a useful contribution as it becomes available. The contribution
   can add information to an existing element or flow, introduce a new one, or
   refer to an element whose definition has not arrived.
2. The assembler incorporates it into saved working data, merges compatible
   contributions and tracks unresolved references. It does not require the author
   to finish a complete, internally cross-referenced document first.
3. When a definition arrives, the assembler revisits the contributions waiting
   for it. An index of unresolved references can avoid rescanning all prior data
   after every delivery.
4. Sufficiently complete, validated and appropriately reviewed units become
   eligible for downstream work while other units remain pending. This release
   mechanism is proposed; current whole-artifact review bindings do not yet
   support the proposed pipeline.
5. Each producer explicitly signals completion of its assigned delivery. Final
   reconciliation distinguishes information still expected from information
   missing after delivery has ended. Remaining gaps become visible repair needs.

For example, one packet could identify a flow's invocation of `content-picker`,
a later packet describe its returned selection and continuation, and another
define the picker's behavior. The assembler connects these contributions as they
arrive. A missing or conflicting definition remains explicit rather than being
invented to make the output appear complete.

Delivery completion does not imply semantic completeness, review approval or
successful publication. An unresolved branch should not discard independent
usable work. Conflicts need reconciliation, not silent last-arrival-wins behavior.
Later corrections should revisit only affected assembled units and dependents.

## Multiple producers for one object

The owner clarified that coordination also includes an assembled object waiting
for contributions from two or more agents before it can move to the next stage.
This is distinct from the multi-hop message routing discussed below.

An object's readiness must depend on its required contributions, not merely the
completion of one producer. For example, a downstream package might require UX
behavior, UI composition and the applicable independent review evidence. These
can arrive at different times and contribute to the same saved assembly.

The candidate assembler should track which required contributions have arrived,
which are still pending and which references or conflicts remain unresolved.
Completion signals apply to the producer's assigned contribution or scope; one
agent's completion does not close another agent's outstanding work. Expected
contributors and requirements need an explicit basis, rather than being inferred
from silence or elapsed time. The exact mechanism remains to be designed.

Release the object when its required inputs are present, mutually consistent and
eligible under the next consumer's validation/review contract. Other independent
objects can proceed without waiting for every agent to finish its entire task.
If a required input cannot be delivered, retain the partial assembly and explain
the missing contribution and remedy. Partial-output consumers may use it only
with that status visible. A later revision must invalidate affected assembled
output rather than combine stale and current contributions silently.

Performance measurements should distinguish active assembly from time spent
waiting for each required producer. This also identifies the input whose arrival
actually determines when an object can move forward. The script-driven variant
below can handle this tracking; multiple producers do not inherently require
another coordinating agent.

## Division of responsibility to explore

### Parallel requests and result collection

The owner's proposal is general: send independent requests to participating agents
in parallel and collect their results. The need could be coordination, a contribution,
an assessment, clarification or another bounded task. It is not a special mandatory
coordination-check stage. Avoid turning independent work into a serial chain of
consultations or pairwise conversations.

Each participant receives the relevant context and requested outcome. Its result
may contain work, identify a dependency or uncertainty, or explicitly report that
no contribution or action is needed. Silence or a timeout is not that response.
Conditional results remain conditional when they depend on another contribution.

The assembler retains results as they arrive and tracks the required outstanding
ones. Once the required results are available, it assembles the outcome or directs
targeted follow-up. Only affected participants need that follow-up; do not restart
the full collection merely because one relationship needs clarification. Independent
work can continue while the collection is pending. Actual prerequisite dependencies
still determine which requests can run together.

Receiving every result means the collection is complete, not necessarily that all
participants agree or the assembled object is ready. The next consumer's requirements
determine readiness. Measure the parallel response window and resulting follow-up
work; this pattern should reduce coordination rather than add another routine pass.

### Design and assembly ownership

Design agents own behavior and visual decisions. Assembly owns their organized
representation and cross-references. Product data remains independent of document
chapters, page breaks and external outline numbering; the document-structure agent
continues to organize publication.

The assistant suggested a hybrid assembler: code handles exact reference lookup,
merging, indexes, inherited metadata, validation and output construction; an agent
handles associations requiring judgment and coordinates narrow clarifications.
This is a candidate approach, not a selected architecture. Unknown behavior returns
to its design owner instead of turning assembly into a second design pass.

If the assembly agent generates the same large JSON by hand, parallelism might
reduce elapsed time while leaving total token use unchanged or higher. Tools
should construct mechanical output wherever possible. Retain necessary behavior
for comps, product documentation and later technical documentation; smaller packets
must not silently reduce product coverage.

Temporary files are an acceptable transport. Producers can return file locations
and brief status without repeating the payload. Reuse information already available,
including packets and assembled data created during the current run. Preserve
usable intermediate results so interruption does not require fresh authoring.

## Script-driven assembly variant

The owner's subsequent suggestion is that a script could build up the assembly
and cross-references in reusable JSON documents. The assembly agent would largely
pass deliveries through to that script until receiving the producer's completion
signal, then hand the resulting document to the next consumer. This is a candidate
to explore, not an implemented or selected architecture.

In this variant the script owns the accumulated state: incorporating partial
contributions, resolving explicit references as definitions arrive, saving reusable
JSON and reporting conflicts or missing information. The agent need not reread,
rewrite or manually organize the growing document on each delivery. It invokes
the helper and handles exceptions that actually require judgment, routing missing
design decisions back to their author.

Once the object's required producer contributions are complete, the helper performs final reconciliation and validation
and returns saved document locations plus completion and repair status. The agent
passes those locations and status to the next consumer without reproducing the
JSON in a message. Usable partial output and unresolved dependencies remain clearly
identified; a completion signal does not manufacture review approval or readiness.

Assembly overlaps its producers' authoring in this version, while the next consumer
waits for that object's completion handoff. Releasing reviewed batches earlier is a separate
possible extension, not necessary to test this simpler arrangement. A further open
question is whether ordinary deliveries need a dedicated agent at all, or whether
the existing parent can invoke the helper directly with the same behavior.

The owner identified a tradeoff: an assembly agent could reduce duplicated effort
and centralize adaptation to script protocol changes, but coordination overhead
could offset those savings. Producers could retain a small, stable packet contract
while one assembly owner handles the helper protocol and exceptions. That benefit
must be weighed against additional model turns, handoffs, repeated reads, waiting
and token use. Protocol centralization can also live in a shared script adapter;
it does not inherently require an additional agent.

If a dedicated agent is evaluated, keep its context across bounded batches and
pass file references rather than reserialized payloads. Compare it with direct
helper invocation using the same saved packet sequence and output requirements.
Measure total work and completion time, including producer effort saved and
exception recovery; overlap alone does not establish lower cost. Neither
arrangement has been selected or benchmarked.

The owner also noted that coordination may pass through more than one agent.
Do not assume a direct producer-to-assembler handoff. A possible route is producer
to parent, parent to assembly agent, assembly agent to parent, then parent to the
next consumer; clarification can require a return trip through several of those
participants. Measure the actual route, each model activation, repeated context
processing and waiting, including corrections, rather than only the assembler's
own duration. Shared files can avoid payload reproduction across that route, but
do not eliminate coordination work. Prefer the shortest route supported by the
actual role boundaries and distinguish a notification from a turn requiring model
judgment. Multi-hop coordination is a possible cost to evaluate, not a requirement
to introduce additional coordinators.

## Evidence to gather before choosing an implementation

Measure time to first useful packet, subsequent deliveries, assembly consumption,
reference resolution, downstream release and completed output. Include actual
model requests, tool spans, parent handling, waiting, correction rounds, authored
bytes, reused units and sourced usage when available. Show overlapping activity
without adding it twice. Unknown runtime measurements remain unknown.

Task purpose should distinguish design decisions from encoding and bookkeeping.
Agent progress claims, first-output timestamps and reasoning-token counts alone
cannot establish exact time spent on each category.

A possible bounded experiment would use one representative saved interaction,
including partial delivery, a forward reference, a correction and a missing
definition. Check whether compact contributions can assemble into useful reviewed
UX/UI inputs without substantive redesign or loss of meaning. Compare total work
as well as elapsed time. Reuse generated results; no full paid baseline is needed
to check the mechanical portions. The later commissioned representation replay
and its limits are recorded in [the experiment report](packet-assembly-experiment.md).

Open questions include the minimal packet envelope, identity and ownership of
partial definitions, practical batch sizes, completion signals, conflict handling,
review eligibility and whether a dedicated assembly agent adds enough value over
deterministic tools. Keep these decisions small; this idea is not a reason to
introduce another general workflow framework or backward-compatibility system.
