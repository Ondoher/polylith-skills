# Polylith Architect Preparation And Information Gaps

Status: historical initial authoring-parent preparation based on existing rules/designs, not independent review. The owner subsequently authorized installation and an isolated Alexa run while leaving the questions below unanswered. The [role contract](polylith-architect.md) and [review/evaluation record](polylith-architect-review.md) hold current status.

## Derived Rules And Authority

| Source | Inferred role behavior | Boundary or escalation |
| --- | --- | --- |
| ARCHITECTURE-003 through 009/012 through 029 | Natural ownership, one fact authority, private features, justified shared promotion and no ceremonial layers. | Model/controller/view propose local ownership; architecture resolves cross-boundary effects. |
| REMVC-006 through 025/044 through 047/058 | Consumer-owned dependencies, strict ReMVC flow, app/installation separation and functional contributions. | No shell knowledge of feature internals or hidden transitive dependency assembly. |
| POLYLITH-016 through 030/054/056; confirmed lifecycle decisions | Separate inclusion/activation and startup phases, scoped registries and shipped owner-local assets. | Missing runtime capabilities go to architecture/system owner; no invented stop or dependency manager. |
| ARCHITECTURE-028/029; REACT-017/049 through 051 | View leads UI reuse; structural promotion preserves whole ownership. UI and domain-model reuse have different thresholds. | Similar code alone does not establish a shared abstraction. |
| TYPES-003/007/012/013; JSDOC-002 through 007/021 | One canonical contract, semantic guarantees and consumer impact before later type checking. | Owning specialist proposes details; architecture reconciles disagreements. |
| TESTING-042 through 049; POLYLITH-026/033 through 040 | Distinguish local/registry/browser proof and retain feature test ownership. | Deferred test-agent creation does not eliminate verification or resolve collaborator-policy questions. |
| Existing system/UX/UI and orchestration designs | System boundaries upstream; visible failure behavior from UX; structural slices to orchestrator. | No enterprise infrastructure, branding choice, workflow policy or scheduling assumed by architect. |
| DOCUMENTATION-005 through 012; isolated assessment and efficiency decisions | Mapped rules, accepted/provisional inputs, proportional read-only reports and honest evidence. | No claimed integration, reviewer verdict or routine deployment readiness. |

Canonical sources: [architecture](../../documentation/standards/architecture.md), [ReMVC](../../documentation/standards/remvc.md), [Polylith](../../documentation/standards/polylith.md), [React](../../documentation/standards/react.md), [types](../../documentation/standards/types.md), [JSDoc](../../documentation/standards/jsdoc.md), [testing](../../documentation/standards/testing.md), [documentation](../../documentation/standards/documentation.md). Role techniques derive from [architecture guidance](coding-guidance.md#architecture), [specialist contract ownership](design.md#contract-design-ownership), [state assessment ownership](design.md#state-assessment-ownership) and [architecture handoff](design.md#architecture-handoff).

## Initial Scenario Walkthrough

This is analysis of the draft, not execution of an agent.

- Small visual-only change: brief triage, view/UI input only where relevant, no unnecessary service decomposition.
- Ambiguous clip draft or timeline viewport ownership: use model/controller/view meaning and lifetime; keep disputed facts conditional rather than assign all state to React or a shared service.
- New substantial internal class: private decomposition is allowed; no service promotion solely for testability and no automatic construction-policy decision.
- Reused presentation: view proposes general contract; architecture checks cross-feature privacy and complete promotion, without requiring two existing consumers for all UI reuse.
- Missing optional versus required service: optional absence has a defined effect; required absence identifies an invalid composition. No assumption that registration implies readiness.
- Contribution versus event: purpose-built extension host owns collision/order/removal policy; mandatory operation does not become an event to avoid a dependency.
- Late media result or navigation away: identify cross-owner identity/release contract; do not equate invalidation, cancellation and rollback.
- Loadable game versus interleaved editing: weigh actual overlap and activation cost; no automatic unload or assumed advantage for Alexa.
- Changed boundary contract: identify consumers and sequence before type checking; return visible recovery changes to UX/owner.
- Incomplete system report: conditional application map may proceed; process/host/storage/API guarantees remain upstream decisions.
- Deferred unit/service test assessment: disclose the missing specialist evidence, still list verification needs, avoid claiming complete integration.
- Embedded implementation request: return assessment only; no writes, spawning, self-certification or orchestrator takeover.

Before installing, complete the role's detailed traceability/scenario review and static configuration validation using the actual prompt. A later authorized live evaluation must distinguish named-role execution from a parent simulation.

## Information Still Needed

### Role Definition

No additional product policy is necessary to complete a useful initial assessment contract. Existing decisions settle the major responsibilities, escalation paths, separation from the system architect and permission boundaries.

Provisional authoring choices are the callable name `polylith-architect`, two stages within one role, inherited model/medium effort, and concise triage versus longer synthesis. They can be refined from evaluation rather than requiring a naming or formatting discussion before drafting. Installation, planning-skill routing and a live run are separate work from this initial pass.

### Inputs For A Useful Alexa Evaluation

1. **A bounded question.** Suggested first scope: structure supporting frame-accurate clip selection and its project/media contracts, while acknowledging the larger composition hierarchy. This is an evaluation proposal, not selection of the first implementation feature.
2. **Decision status.** Identify which system/UX/UI/model/controller/view recommendations the owner has accepted. Existing reports may all be supplied as proposals; assessment remains possible without approving them first.
3. **Consequential domain semantics.** End-frame inclusion/single-frame meaning, frame/time identity, shared-content editing and relevant retention/save behavior. The architect can show conditional boundaries until these are decided; it must not invent answers.
4. **System/media capability guarantees.** Established process and filesystem/media interfaces, frame/thumbnail ownership, readiness, cancellation and completion semantics. Missing guarantees become upstream questions, not forced implementation architecture.
5. **Verification coverage.** Unit/service-testing agent creation is deferred by the owner; UI-testing assessment remains pending. Supplied parent evidence can support the bounded exercise, but does not imply those agents ran.

These are task inputs or disclosed unknowns, not prerequisites for every triage call. Ask the owner only about product intent; specialists and repository inspection should resolve technical evidence where possible.

### Before Affected Implementation Or Routine Deployment

- Reconcile the explicitly deferred private-collaborator construction/test-substitution decision with current TESTING-044 through 049. Canonical rules stay in force; postponing the testing agent does not resolve this policy discussion.
- Preserve explicit application resource cleanup without treating TESTING-043 shutdown wording as an implemented Polylith stop workflow.
- Complete the orchestrator's assignment, interruption/resumption and review-evidence mechanics before claiming a full orchestration test.
- Measure quality, context reuse, reasoning settings, elapsed time and available cost evidence against comparable work. Acceptable deployment tradeoffs remain an owner decision; do not invent a credit budget or hard limit.

None of these deployment items prevents drafting or a properly scoped, separately authorized read-only assessment.
