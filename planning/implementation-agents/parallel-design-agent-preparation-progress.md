# Agent preparation execution progress

Started: 5 October 2026. Executing the [preparation plan](parallel-design-agent-preparation-plan.md)
under the independent-execution skill. No broader design decomposition is in scope.

## Milestones

| Milestone                        | Status                 | Evidence / next action                                                                                                                                                                                                           |
| -------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Host feasibility and baseline | Complete               | Actual author creation/readiness/follow-up, source-bound claim, guarded native contribution and structurally valid assembly passed. Runtime17total/config16spawned; closure absent. Independent quality gates remain downstream. |
| 2. Persisted lifecycle           | Happy-path development | Host creation/acknowledgment/follow-up feasibility is observed. Independent lifecycle work overlaps baseline input correction; no milestone signoff before milestone 1 completes.                                                |
| 3. Preparation and guarded reuse | Not started            | One-agent live path before wider preparation.                                                                                                                                                                                    |
| 4. Capacity and recovery         | Not started            | Fake-host faults, multi-agent overlap and live reopen.                                                                                                                                                                           |
| 5. Matched comparison            | Not started            | Declare budget and criteria before measurements.                                                                                                                                                                                 |
| 6. Supported boundary            | Not started            | Publish only the evidence-supported policy.                                                                                                                                                                                      |

## Questions and decisions

1. **How to verify the changed thread setting without exhausting the session?**
   Compare the user configuration with the current session's reported total slots.
   Both indicate 16 spawned threads plus primary. This verifies the reported limit,
   not every boundary error. Do not create dummy agents to fill the host.
2. **How to retire agents when closure is absent?** Keep known or potentially open
   agents counted; reuse compatible authors and reserve later-role capacity. Test
   explicit closure only in the fake host and document that live closure is unavailable.
3. **Where should trial evidence live?** Use `.codex-tmp/agent-preparation/` for a
   product-neutral synthetic trial. Commit only reusable code/tests and general
   progress/findings; no real application data or agent-specific raw trial outputs.
4. **How much new rendering machinery is justified?** None. Reuse existing native
   rendering and capture tools; keep the fixture small and label tooling setup
   separately from startup measurements.
5. **Where can this small fixture provide real preparation overlap?** UI role,
   schema and fixed-foundation loading can overlap actual UX authoring and its
   required review. UX eligibility may be too fast to hide startup. Do not add
   parser work or delay eligibility to manufacture a window.
6. **How to handle missing baseline product-model context?** The first packet
   omitted a structured source-derived model and the author explicitly reported
   placeholder hashes. Build the actual source-derived model with existing data
   tooling and supply its real binding before accepting UX. Do not treat zero
   hashes as provenance. Baseline setup and its focused feedback-reference repair
   are separate from measured agent startup and final comparative timings.
7. **Should lifecycle implementation wait idle during baseline correction?** The
   host feasibility gate's creation, acknowledgment, follow-up and real upstream
   window are observed. Develop the independent happy-path ledger in parallel
   with baseline data correction; keep native assignment integration and milestone
   completion gated on valid baseline evidence. This avoids wasting the correction
   window without claiming completed proof.
8. **Where to save early preparation before a validated operational plan exists?**
   Use a small preparation ledger beside the app's operational coordinator. Do not
   require a fabricated or prematurely validated design plan merely to reserve
   author startup. Later assignment must still bind an actual exact native claim.

## Baseline evidence so far

The source-bound operational plan validates without findings. Actual author
readiness was reported at 18:12:12 UTC; the parent observed it at 18:12:50 UTC.
The pre-creation clock anchor was 18:11:12 UTC and includes a short source-read
and tool-call gap, so the approximately one-minute interval is an upper-bound
request/readiness observation, not pure host startup time. Exact claim and
dispatch intent were saved before actual authoring follow-up. Raw observations
and proposals are under `.codex-tmp/agent-preparation/baseline/`.

The first actual authored proposal failed the existing validator on a missing
selection-feedback reference before canonical writes. A focused author repair
passed native validation. Real product-model input was then persisted and verified;
adding its exact identity made the original attempt stale. A fresh same-author
claim was dispatched for a focused binding repair. Guarded materialization then
passed at 18:21:44 UTC: all three owned native units saved, whole-UX assembly
validated and actual output digests structurally accepted. The obsolete packet
and claim are retained as recovery evidence; no stale canonical contribution was
written. This proves milestone 1's native happy path, not independent UX quality
or any speed gain. Whole-UX review remains required before UI authoring.

## Host observation

Observed at 2026-10-05 18:07 UTC. The current conversation offers `spawn_agent`,
`followup_task`, `send_message`, `list_agents`, `wait_agent` and `interrupt_agent`.
None establishes actual thread closure. Do not equate completion/interruption
with release. Startup-internal timing and per-agent token/cost telemetry have not
been established. Parent request-to-observed acknowledgment will be measured.
Official [subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents)
defines the user setting as concurrently open spawned threads excluding primary;
the actual exposed tools determine what this trial can do.

## Resume

Read this record and the plan, inspect current working tree and temporary run
records, and list agents before allocating any replacement. Unknown creation or
assignment outcomes require reconciliation rather than duplicate creation.
