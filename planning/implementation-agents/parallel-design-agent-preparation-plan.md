# Proactive design-agent preparation

Recorded: 5 October 2026.

Status: lifecycle implemented and independently reviewed; budgeted live trial
executed with promotion gates still open. See the
[readiness assessment](parallel-design-agent-preparation-readiness.md) and
[execution progress](parallel-design-agent-preparation-progress.md). The owner
selected proactive preparation with a maximum pool of four author agents and
backoff when the host reaches its thread ceiling. Existing design boundaries,
canonical stores and review gates remain the baseline for this change.

The [state → treatment → assembly exploration](parallel-design-followup-exploration.md)
is deferred. Do not combine that decomposition change with preparation work.

## Intended behavior

The parent planner supplies an early forecast of likely author roles, counts and
scopes. The coordinator proactively tries to create those agents before their
work becomes ready, allowing startup and relevant input loading to overlap
research and planning. The forecast is advice, not ownership or dispatch authority.

Produce a cheap preliminary forecast as soon as parsed product scope and stable
role requirements permit; do not wait for the completed operational plan. Refresh
it at meaningful upstream input changes and stage boundaries. The coordinator
first checks its compatible available agents, then reserves missing capacity and
requests preparation. Request independent preparations without waiting for each
agent's acknowledgment before requesting the next. Their preparation turns should
overlap each other and upstream work; serialize only the required pool mutations
or host tool calls. The parent continues upstream coordination while they prepare.

Maintain a maximum of four open author agents in the managed preparation pool,
including authors currently assigned work. This pool ceiling is separate from
the current supported limit of two concurrently authoring local workers and from
the host's overall thread capacity. Account for researchers, reviewers and
coordinators when observing available host capacity; leave room for independent
review rather than filling every remaining slot speculatively.

Before each preparation batch, record the observed host limit and known open
threads, outstanding creation intents and the reserve for upcoming mandatory
roles. Reserve at least one independent reviewer slot, and more when the next
stages require it. Distinguish configured limits from runtime-reported capacity;
do not assume an edited configuration is active or exhaust the host to verify it.
If capacity is not observable, use a conservative bounded target and report the
uncertainty. Four is a ceiling, not a target to fill despite missing demand.

Reserve managed-pool capacity for required later author roles as well as host
capacity for reviewers. If threads cannot be closed and specialists cannot be
repurposed, filling all four slots with the current role could block the next
stage. Test that stage transition and reduce speculative preparation before it
creates a dead end. On-demand fallback remains subject to the same accounting;
it cannot bypass the ceiling by creating untracked authors.

Prepared agents receive role instructions and bounded saved inputs, acknowledge
readiness and wait. They do not author design, discover new research, acquire a
design-work claim or gain canonical write authority during preparation.

Preserve the research-first sequence and the single initial UX researcher and
single initial UI researcher. Use the owning app's saved research and coverage
records; newly discovered research gaps return to the existing research path.
An early author forecast can accompany that sequence without advancing design
authoring ahead of validated planning or duplicating research in prepared agents.

Once the operational plan is validated and saved, the coordinator assigns ready
work to an available compatible prepared agent first. Save the current exact
claim, final inputs and dispatch intent before providing the scoped authoring
assignment. Preparation never bypasses the existing mutation guard.

Retain useful authors for repairs or another compatible assignment. Release
unneeded threads when the host supports closure. Keep actual contributor
provenance; independent reviewers cannot review work they authored. Reviewers
are not interchangeable slots in the author preparation pool.

Compatibility includes the agent's actual role/instructions, product/run scope,
current input packet and existing contributor provenance. Adopt a preexisting
compatible author only after confirming availability and recording it in the
pool; do not relabel an incompatible specialist as another role. Before reuse,
resolve the previous assignment under the existing coordinator contract, revoke
its write capability and positively establish that the agent has stopped that
work. Receiving a delivery alone does not make an agent available. Provide a new
bounded assignment packet so previous work is not mistaken for current authority.

If no compatible agent is available, use remaining pool and host capacity to
prepare one or queue the item. On a thread-ceiling error, stop further speculative
creation and continue with the available pool. Retry after a positive capacity
change; do not repeatedly retry the same failed spawn or claim that interrupting
an agent necessarily closes its thread.

## Lifecycle and ownership

The coordinator library tracks forecast, preparation intent, actual agent
identity, role, input bindings, preparation acknowledgment, assignment and
retirement. The parent or coordinator agent executes the available host tools.
Persist useful operational state under the consuming app's product planning root.
Keep process-local capabilities out of saved metadata.

Distinguish preparing, available, assigned, failed, uncertain and retired agents.
Only positive observations establish availability or termination. Reconcile
saved pool records with actual agent availability on resume; unknown liveness
does not authorize duplicate creation or replacement. Reassess a prepared packet
after its source changes before using it for an authoring assignment.

Track preparation/assignment state separately from host thread liveness. Every
known or potentially open managed author counts toward four, including a failed
or retired author whose thread closure is unconfirmed. A confirmed creation
failure that produced no thread releases its reservation; unknown creation
outcomes do not. Thread termination releases pool capacity but does not discard
contributor provenance or automatically resolve uncertain authoring effects.

Inspect actual host capabilities before designing creation, follow-up and closure
adapters. Use the current conversation's tools and agents. A separate model
session, backend call or proxy is outside this plan.

## Requirements and proof

These requirements govern every milestone. Record each ID's evidence and any
unresolved limitation in the execution progress record.

| ID    | Requirement                                                                                                                                            | Primary proof                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| AP-01 | Early planner advice triggers proactive coordinator preparation; independent startups overlap upstream work and each other.                            | Milestones 1, 3–5: saved forecast/intent and actual acknowledgment timelines.                              |
| AP-02 | At most four known or potentially open managed authors, at most two authoring concurrently, with host-wide accounting and reviewer reserve.            | Milestones 2 and 4: accounting tests, observed runtime capacity and bounded live evidence.                 |
| AP-03 | Assign a compatible available author first; create only for unmet demand; reuse safely or release unneeded threads when supported.                     | Milestones 2–4: preexisting-author adoption, assignment, revocation, reuse and closure/no-closure cases.   |
| AP-04 | A thread-ceiling error stops speculative creation; retry only after positive capacity change.                                                          | Milestone 4: partial-success and persistent-ceiling tests with bounded retries.                            |
| AP-05 | Preparation acknowledges a bounded packet, grants no authoring authority, and does not repeat upstream research.                                       | Milestones 2, 3 and 5: denied preparation writes, exact packet identities and live role/task records.      |
| AP-06 | Compaction/resume preserves pool intent, actual identities, accepted work and uncertain liveness without duplicate dispatch.                           | Milestones 2 and 4: clean reopen, interrupted creation/assignment and positive-observation reconciliation. |
| AP-07 | Existing claims, ownership, whole-UX barrier, independent reviews and rendered UI acceptance remain in force; state/treatment assembly stays deferred. | Milestones 3–6: existing guard checks, actual review receipts and documented supported boundary.           |
| AP-08 | App-specific research, inputs, pool state and durable evidence stay in the owning app; experiments may use temporary run storage.                      | Every milestone: artifact inventory and locations in the progress record.                                  |
| AP-09 | Measured useful overlap and total benefit justify preparation cost; unfavorable or inconclusive results retain on-demand fallback.                     | Milestone 5: declared comparison criteria, matched outcomes, waste/cost and timing observations.           |

## Evidence and execution rules

The hypothesis is that useful role and input preparation can finish during
existing upstream work, reducing the wait when authoring becomes eligible without
increasing omissions, repairs or recovery effort. Creation alone is insufficient:
an agent must acknowledge its role and exact preparation packet before it is
available. Do not insert artificial upstream delays to manufacture overlap.

Complete milestones in order. At each gate record the evidence, remaining
uncertainties and a decision to continue, revise, narrow or stop. A failed gate
returns to the affected milestone; rerun downstream checks whose assumptions
changed. Simulation proves lifecycle behavior; live observations establish host
behavior and useful overlap. Keep those conclusions separate.

Start with the smallest extension to the existing coordinator and assignment
contracts. Do not introduce a general agent service, change work decomposition,
increase author concurrency or replace existing review gates to make the trial
look better. Preparation is optional; preserve the on-demand route throughout.

### Milestone 1 — Establish host feasibility and a measurable baseline

**Deliverable:** a host capability record, a preliminary forecast/packet contract
and an instrumented on-demand baseline for one bounded author assignment.

Inspect the current conversation's creation, follow-up, observation and closure
tools. Record what can actually be observed, including whether startup itself is
visible and whether completed agents continue to consume thread capacity. Unknown
capacity or unavailable closure remains explicit. Do not change host limits.

Use a product-neutral fixture with a real upstream planning step and a downstream
author assignment. Identify the earliest point at which stable role instructions
and useful saved inputs are available. Forecast only plausible author demand;
preparation must not repeat research or make product decisions. Track forecast
changes and the minimum information needed for an acknowledgment.

**Proof:** run one on-demand assignment through the existing guarded route. Save
creation-request, acknowledgment, work-eligible, assignment and first useful
response observations where available. Test a follow-up to the same author and
record whether reuse works. Record actual capacity errors if encountered; do not
exhaust the session deliberately.

**Gate:** the host supports a usable creation/acknowledgment/follow-up path, and
there is an identified upstream window in which relevant preparation could occur.
If startup cannot be separated from input loading, report their combined latency.
If no useful overlap window exists, revise the forecast point or stop the speed
claim before building a larger pool.

### Milestone 2 — Prove the persisted lifecycle without live model work

**Deliverable:** validated preparation records and inspectable pool status beside
the existing work-item coordinator, with deterministic tests using a fake host.

Persist forecast revision, preparation intent, actual agent identity, role,
source identities, acknowledgment, current assignment and observations. Bind each
acknowledgment to the correct agent, preparation attempt and packet revision.
Reserve pool capacity before requesting creation. Reconcile an interrupted spawn
with its intent rather than assuming it failed or launching a duplicate.

**Proof:** cover partial preparation, duplicate or late acknowledgments, stale
packets, competing assignment requests and pool accounting. All preparing,
available, assigned and uncertain potentially open authors count toward four;
failed or retired authors also count unless thread absence or closure is confirmed. Cover
adoption of existing authors and refusal to reuse an author with an unresolved
assignment or an obsolete write capability. Preparation cannot obtain authoring
permissions, an unavailable author
cannot be assigned, and an available author cannot receive two assignments.

**Gate:** a clean reopen reproduces the same pool and work status, invalid records
are rejected, and existing claim, ownership and guarded-delivery checks still
pass. Refine record/state shape here before adding live orchestration.

### Milestone 3 — Demonstrate useful preparation and guarded reuse

**Deliverable:** an in-session coordinator path that prepares one author before
its work is eligible, then uses the existing claim and assignment machinery.

Supply a bounded packet while actual upstream work proceeds. The agent reads,
acknowledges and waits; it performs no speculative design. After the operational
plan and prerequisites are current, save the exact claim and dispatch intent,
refresh final inputs and grant the normal scoped assignment. Reuse the same
compatible author for one repair or subsequent ready assignment.

**Proof:** retain actual agent IDs, acknowledgment and assignment observations,
exact guarded delivery receipts and a timeline showing whether preparation
overlapped upstream work. Change one prepared input before assignment and show
that the obsolete acknowledgment cannot authorize work. Preserve every actual
contributor in independent-review exclusions.

**Gate:** live preparation reaches availability before it is needed, delivery uses
the existing guard, reuse succeeds, and stale preparation is handled correctly.
If preparation routinely finishes late, reduce packet size or move the forecast
earlier. Do not expand to four agents until this one-agent path is useful.

### Milestone 4 — Prove bounded capacity and recovery

**Deliverable:** a tested capacity/backoff policy and resume procedure, exercised
with deterministic faults and one bounded live interruption/resume scenario.

Extend the managed pool up to four open authors while retaining at most two
concurrent authoring assignments. Inspect known host use and reserve room for
the upcoming independent reviewer. When the host does not expose usable capacity,
record that uncertainty and rely on bounded requests and creation-error backoff.

Request preparation of at least two independent authors before awaiting their
acknowledgments. Retain live observations showing whether their preparation turns
overlap each other and actual upstream work. Include the transition from UX to
UI roles with closure unavailable in deterministic tests; verify that reservation
policy preserves capacity for the later role and independent review.

**Proof:** inject failures before creation, after creation but before identity is
saved, before acknowledgment, and after claim but before dispatch. Cover ceiling
errors after partial success, reduced forecasts, role mismatch, unknown liveness,
no closure support, explicit closure where supported, and a source change during
resume. A ceiling error stops speculative creation for the pool; only a positive
capacity change permits retry. Unknown liveness blocks replacement of that intent
while other confirmed agents can continue.

Reopen from durable files without relying on the old conversation's recollection.
Reconcile actual observations, refresh capabilities through existing mechanisms,
and continue accepted work. Simulated failures must not be reported as live host
observations. Do not force a real thread ceiling merely to reproduce a fake-host
test.

**Gate:** no duplicate creation or assignment, pool overflow, retry loop, lost
accepted output or review bypass; supported recovery has an inspectable reason
for every retained, reused or replaced agent. If missing host capabilities prevent
safe speculation, narrow the operating policy and document the fallback.

### Milestone 5 — Compare benefit and cost under matched conditions

**Deliverable:** a comparison report and a refined preparation policy, using the
same source-bound fixture, boundaries, author limit and exact review gates for
on-demand and proactive modes.

Before running, specify the eligible forecast point, packet contents, pool size,
timing measures and minimum useful benefit that would justify preparation cost.
Set a trial time/resource budget; stop the trial and record an incomplete result
when it is reached. Do not extend it merely to obtain a favorable comparison.
Use at least two matched pairs if capacity permits, reversing mode order in the
second pair. Use fresh comparable author contexts and equivalent inputs; record
cache/history differences, host contention and tooling changes. If the host cannot
provide comparable runs, report an inconclusive comparison rather than an adjusted
speedup. Keep this fixture small; separate renderer development from measurement.

Record creation-request, acknowledgment, work-eligible, assignment, first useful
response, delivery, review and guarded acceptance times. Measure author wait after
eligibility, preparation that overlapped upstream work, unused or invalidated
preparation, upstream slowdown, total acceptance time, repair counts, research
duplication, recovery interventions and token/cost data when actually available.
Use request-to-acknowledgment latency when host startup time is unobservable.

**Proof:** both modes account for the same required outcomes and pass actual
independent whole-UX and rendered whole-UI review. Test forecast oversupply and a
late input change in deterministic cases, plus a live case where practical, so the
report accounts for wasted preparation as well as successful predictions. A
correct simulation or faster agent acknowledgment alone cannot establish overall
benefit. Two matched pairs are bounded evidence, not a statistical guarantee.

**Gate:** recommend a policy only if measured useful overlap meets the declared
criterion without violating authority, quality or capacity constraints. Refine
forecast timing, packet size, role matching or target pool size from the evidence.
If results are mixed, retain bounded opt-in use and state the applicable conditions;
if benefit is absent, retain on-demand operation and record the finding.

### Milestone 6 — Publish the supported boundary and regression evidence

**Deliverable:** updated operating instructions, readiness assessment and focused
regression coverage for the policy actually supported by milestones 1–5.

Document when preparation starts, what is loaded, how availability is confirmed,
how compatible agents are assigned, how capacity errors back off and how saved
state resumes. Record unsupported host capabilities and exact fallback behavior.
Keep four as the maximum author pool, not a requirement to fill it. Evidence may
support a smaller initial target. Preserve the separate two-author execution
limit, exact claims, contributor provenance and independent review gates.

**Gate:** an operator can reproduce a supported run and recover from saved state
using the instructions and available in-session tools. Relevant existing
coordinator, workflow and pipeline tests plus new lifecycle tests pass. Promotion
states the observed operating boundary; it does not imply support for a larger
graph, a different host or the deferred state/treatment design.

Recheck every AP requirement against the final policy and evidence. A remaining
limitation must narrow the supported boundary or leave the relevant gate open;
do not declare the approach proven because only its successful cases passed.

## Progress and evidence persistence

During execution keep a progress record beside this plan with each milestone's
status, current contract decisions, completed checks, evidence locations, failures,
open questions and next action. Mark a milestone complete only after its gate is
satisfied; checkpointing or a successful code test alone does not complete a live
evidence milestone. On resume, read this plan, the progress record and current
coordinator state before allocating agents.

Reusable progress and general findings may be committed here. Application-specific
inputs, pool state, receipts and measurements belong under that application's
product planning root. Temporary synthetic trials use a dedicated
`.codex-tmp/agent-preparation/` run directory; retain the general conclusions and
reproducible product-neutral tests in the repository, with evidence limits stated.

## Existing contracts

- [Operational plan and recovery](../../skills/refine-design/references/operational-design-plan.md)
- [Bounded parallel design](../../skills/refine-design/references/parallel-design.md)
- [Current supported scope](parallel-design-readiness.md)

Application-specific inputs, decisions and durable run evidence belong to the
owning application. Temporary experiments use `.codex-tmp/`; committed reusable
fixtures remain synthetic and product-neutral.
