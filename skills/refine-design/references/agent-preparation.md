# Experimental author preparation

Use only when explicitly requested within a [bounded parallel design](parallel-design.md)
run. Serial and on-demand author creation remain the default. Deterministic
lifecycle coverage and bounded actual retained-file observations support only the
recorded operating boundary. General performance benefit and broader host support
remain unproved. Keep the pool small and expand only within observed capacity.

Read the [recorded operating boundary and evidence](../../../planning/implementation-agents/parallel-design-agent-preparation-readiness.md)
before choosing a trial's scope. The supported host boundary must distinguish
actual retained-file observations from deterministic in-process service coverage;
broader performance benefit remains unproved.

The current retained-file trial observed guarded preparation, existing-author
reuse and saved recovery. The baseline whole UI was accepted within the fixed
trial deadline. The prepared branch remains under revision for four font captures
after a partial recapture timed out; its whole-UI quality gate is open. The trial
has ended, and the timing comparison is inconclusive. Successful native delivery
and assembly do not establish rendered design acceptance. Keep preparation
experimental and do not promote a speed benefit.

Preparation changes when a compatible author reads saved inputs. It preserves
the current research-first sequence, single initial UX researcher and single
initial UI researcher, two-author execution limit, exclusive native ownership,
whole-UX independent review, exact rendered UI acceptance and parent canonical
writes. State/treatment decomposition and per-flow UX-to-UI overlap remain outside
this mode. Research gaps return through the existing parent research handoff;
prepared authors do not repeat discovery or make speculative product decisions.

## Ownership and early forecast

Create `DesignPreparation` with an explicit directory beside `DesignCoordinator`
under the consuming app's `product/<name>/planning/<plan-id>/` root, for example a
`preparation/` child. Its `state.json` is operational metadata owned by that product
and run. Initialize with `initialize({scope})`; no operational plan is required.
The separate coordinator still requires a validated plan before any author claim.
Keep application packets, observations, receipts and measurements in the app.
Temporary synthetic trials may use a dedicated repository-root `.codex-tmp/` run.

Forecast as soon as parsed product scope, stable role requirements and useful saved
inputs permit. Save `advise({forecast, capacity, expectedRevision})` before each
preparation batch. Refresh advice at material upstream changes and stage boundaries.
Advice is demand forecasting, never ownership, readiness or dispatch authority.
Use the current conversation's host tools for creation, follow-up, observation and
supported closure. These scripts perform data operations only: never launch a
separate Codex session, backend request or proxy through them.

The production contracts are in [ambient preparation types](../scripts/types.d.ts)
and [DesignPreparation](../scripts/DesignPreparation.mjs):

| Record     | Required data                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `forecast` | `revision`, `demands: [{role, count, packet}]`, `laterRoles: [{role, count}]`. Supported author roles are `ux-planner` and `ui-designer`; counts are one to four.        |
| `packet`   | `scope`, `revision`, actual role `instructions`, and exact saved `bindings: [{ref, digest}]`. The complete JSON packet is bounded to 16,384 UTF-8 bytes.                 |
| `capacity` | `id`, `observedAt`, `runtimeLimit`, `configuredSubagentLimit`, all observed `openThreadIds`, `reviewerReserve`, and `conservativeSlots`. Unobservable limits are `null`. |

Supply instructions and relevant source, schema, accepted foundation or research
inputs that already exist. Require the author to read, acknowledge the exact
packet and wait. It receives no design-work claim, writable unit ownership,
canonical authority or service author token during preparation. A source or schema
subset can be useful early context; it is not the final authoring packet.

## Capacity and read-and-wait lifecycle

Count at most four known or potentially open managed authors, including preparing,
available, assigned, uncertain and failed/retired records whose thread absence or
closure is unconfirmed. Count unresolved author assignments separately, at most
two. Confirmed no-thread creation failure frees its reservation. Positive closure
frees thread capacity while preserving contributor provenance and unresolved work
effects. Completion, delivery, interruption and the label `retired` do not prove
thread closure.

Observe host use across the primary, authors, researchers, reviewers, coordinators
and outsiders. `runtimeLimit` counts the primary; `configuredSubagentLimit` is
evidence of configuration, not an assumed active runtime limit. Reserve at least
one independent reviewer slot, and more when mandatory upcoming reviewers need
them. With unobservable runtime capacity, choose an explicit conservative batch
budget of zero to two `conservativeSlots` and report the uncertainty. Four is a
ceiling, never a target to fill. Do not change or exhaust host limits to test them.

Reserve managed slots for required later incompatible author roles through
`laterRoles`, especially when the host cannot close threads. For example, three
open UX authors can leave the fourth slot for a UI author; the new UI candidate
fulfills that reservation. An existing specialist keeps its actual role and
instructions. Reduce speculative current-stage demand before it blocks the next
stage. On-demand fallback inside the opted-in run uses the same pool accounting;
it cannot create untracked replacement authors.

1. Prefer compatible available authors already in the ledger. Compatibility
   includes actual role/instructions, product/run scope, current packet and
   contributor provenance. Refresh stale inputs rather than replacing an author
   whose availability or liveness is unresolved.
2. For unmet forecast demand, call `reserve({role, expectedRevision})` before the
   parent requests creation. Inspect the returned state: refusal saves a reason in
   history; a new author record saves its `id`, `attemptId` and `packetDigest`.
   Request independent preparations without waiting for each acknowledgment;
   serialize only ledger mutations and required host calls, while upstream work
   continues.
3. After actual creation, save `created({authorId, attemptId, agentId, observation,
expectedRevision})`. Bind the real host identity to the original intent. A
   crash after creation but before this save leaves an uncertain reservation;
   positively reconcile that same intent before any replacement.
4. Accept `acknowledge({authorId, agentId, attemptId, packetDigest, observation,
expectedRevision})` only for the exact current identity, attempt and complete
   packet. Exact duplicates are harmless; obsolete acknowledgments reject. This
   changes preparation availability and grants no author permissions.

For an existing author, `adopt` requires its actual `agentId`, `role`, equal
`actualRole`, `assignmentResolved: true`, `authorityRevoked: true`, current
`packet`, positive availability `observation`, optional actual `contributions`,
and `expectedRevision`. Verify those facts through the prior coordinator and host;
a receipt or a free-looking slot alone does not establish them. Adoption requires
a fresh exact acknowledgment and preserves the same pool and later-role limits.

Use `failed({authorId, attemptId, outcome, ceiling, observation, expectedRevision})`
for creation errors. `outcome: 'absent'` requires positive no-thread confirmation;
`'unknown'` retains its slot. A ceiling stops speculative creation for the pool,
including after partial success. Continue useful work with confirmed authors and
queue unmet demand. Backoff clears only when a new positive runtime snapshot shows
more free host threads than the saved ceiling snapshot; changing an observation
ID, repeating the same error or changing configuration does not permit a retry.
The ceiling record saves its accounted `freeSlots` at the failure event, including
managed open or uncertain threads omitted from the observed ID list. Omitting a
still-open managed ID cannot create apparent free capacity; positive closure can.
If no positive capacity change is observable, retain backoff.

## Final claim, delivery and reuse

Validate and save the operational plan, complete prerequisite acceptance and
required independent gates, and build the current complete bounded author packet
before assigning design. UI must receive newly reviewed whole UX and current
foundation/native inputs even if it prepared from an earlier source/schema subset.
Use `refreshPacket({authorId, packet, expectedRevision})` when prepared inputs or
instructions change; it saves a new attempt and requires another acknowledgment
without erasing earlier timing/provenance observations.

A changed same-role forecast packet invalidates unassigned acknowledgments and
starts fresh known-author preparation. It preserves an interrupted creation's
original attempt until its actual identity is positively bound, then requires
explicit packet refresh. An assigned author retains its claim and packet but
becomes uncertain; old grants and native writes stay frozen until prior work is
resolved and current inputs are acknowledged anew. A count-only forecast refresh
does not invalidate readiness. A final packet may add reviewed UX, review receipts
and final instructions while retaining the current stable forecast bindings.

Use the existing [DesignWorkflow](../scripts/DesignWorkflow.mjs) with `preparation`
and a synchronous `resolveInputs` observer. Bind `preparationScope` to the actual
current product/run identifier resolved by the parent, never a value copied from
the candidate ledger. For a service host it defaults to `run` and cannot override
that known run identity; a retained-file host supplies it explicitly. A foreign
ledger scope fails before any pool assignment. The observer verifies every final
coordinator input identity; checking only the early preparation subset is
insufficient.

| Parent operation                                                                                     | Contract                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claimPrepared({authorId, itemId, bindings, observation, preparationRevision, coordinatorRevision})` | `bindings` are positively observed current preparation inputs. Checks scope, readiness and coordinator revision before saving pool assignment intent, records any prior attempt for crash reconciliation, links the exact new claim, and verifies its complete final inputs through the existing guard. |
| `assignPrepared({authorId, preparationRevision, ...assignment})`                                     | Issues the normal owned-unit service assignment only after the exact linked claim. Existing handles, file grants, scope and UI wireframe requirements still apply; tokens stay in parent memory.                                                                                                        |
| `authorizePreparedFile({authorId, preparationRevision, ...claim})`                                   | Records parent-owned retained-file authority without minting a service token.                                                                                                                                                                                                                           |
| `withPreparedClaim({authorId, ...claim}, syncAction)`                                                | Holds the preparation and existing coordinator guards across the exact synchronous native contribution/delivery action. Load modules and await transport outside the guard.                                                                                                                             |
| `releasePrepared({authorId, observation, preparationRevision})`                                      | Revokes known prior authority and requires a resolved prior coordinator assignment plus exact positive stop evidence before reuse.                                                                                                                                                                      |

Save the existing coordinator dispatch observation before handing off the scoped
authoring assignment. Use only current owned references, input bindings and
contribution revisions; do not carry authority forward from the preparation turn.
For retained files, authors write scoped proposals and the parent materializes
them under `withPreparedClaim`. A plain CLI native delivery outside the guard does
not establish an authorized parallel write. Neither delivery nor import grants
design acceptance; retain all existing assembly and independent review gates.

With a ledger configured, ordinary native `assign` and `withClaim` also require
the actual author to have a tracked, current, granted pool assignment. Omitting an
optional prepared-author field cannot bypass accounting or readiness. Review
assignments retain their existing independent guarded route and consume no author
pool slot. On-demand native authors must be adopted or prepared under the same
managed limits before receiving authority.

The service route has deterministic in-process coverage. There is no new automatic
remote MCP preparation endpoint: the CLI and ledger do not install host callbacks.
A configured remote host must retain both the pool and exact coordinator guards,
including the complete current-input observer, before parallel native mutations.
If it cannot, use the supported parent-owned guarded file route or the existing
serial/on-demand fallback. An opted-in fallback still accounts for every managed
author and preserves all applicable claim and review gates.

Release requires `observation: {status: 'stopped', agentId, attemptId, ref}` for the
exact prior work. Its coordinator attempt must be accepted, failed or stale, and
its old grant must be revoked. Receiving a delivery alone is insufficient. A
service grant missing from a new adapter remains unconfirmed; do not infer its
revocation from a lost token. The retained-file route has no invented token and
revokes its saved file authority before release. Supply a fresh bounded assignment
packet for the next compatible work. Keep every actual retained contributor in
independent-review exclusions, including original owners and repair authors.

## Reopen and data-only inspection

Reopen the ledger and coordinator from app-owned files, inspect saved intents,
actual IDs, packet identities, current assignments and accepted work, then obtain
positive host observations. Use `observe({authorId, agentId, status, observation,
expectedRevision})`: `unknown` retains capacity and freezes authority; `live`
reconciles an exact surviving assigned author without inferring idle availability;
`available` confirms availability without resolving existing work; `closed`
requires actual termination evidence. Reconcile the same native attempt through
the existing coordinator before further guarded writes. Refresh changed packets
and obtain new acknowledgments before new author assignments.

A crash between pool assignment intent, coordinator claim and claim linking does
not authorize a second claim. Inspect both ledgers. `bindClaim({authorId,
coordinatorState, expectedRevision})` links the verified current exact surviving
claim. A claimless intent remains reserved until positive reconciliation and
stopped-work evidence permit `release`; uncertain authoring effects stay retained
even after a thread terminates. A surviving `writer.lock` is inspected with
`lockInfo()` and recovered with `recoverLock(exactToken)` only after a positive
dead-process observation. Live, inaccessible or changed owners retain the lock.

The data-only CLI [design-preparation.mjs](../scripts/design-preparation.mjs)
accepts `inspect` with `--directory` and optional `--author`. Its mutation commands
are `initialize`, `advise`, `reserve`, `created`, `failed`, `adopt`, `acknowledge`,
`refresh-packet`, `observe`, `retire`, `bind-claim` and `release`; supply a JSON
request file through `--input`, bounded to 65,536 bytes. After initialization, each
state mutation uses the exact observed `expectedRevision`. A stale revision requires rereading state
and reconciling facts, not blindly repeating a host operation. The CLI returns
compact nonsecret status and never creates an agent, grants author capabilities,
performs native delivery or installs a claim guard. It is not an MCP host adapter.

Run the named `test:preparation` lane for lifecycle and native-guard regression;
`test:planning` also includes the preparation records. Keep deterministic fault
evidence separate from actual host and specialist observations. For live trials,
record request, acknowledgment, eligibility, assignment, useful response,
delivery, review and guarded acceptance; account for invalidated/unused preparation,
upstream slowdown, repairs and observable usage. Startup and input-loading latency
may be inseparable. Promote a policy only after the declared live, recovery,
quality and matched performance gates pass; an incomplete or inconclusive trial
retains experimental opt-in and the on-demand default.
