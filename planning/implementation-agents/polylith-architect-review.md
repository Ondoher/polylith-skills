# Polylith Architect Assessment Review

Date: 2026-09-16. Scope: formalization and static review of the read-only Polylith architecture role. Product questions may remain unresolved during a bounded assessment; its recommendations remain advisory.

## Rule And Prompt Review

The [preparation matrix and twelve scenario walkthroughs](polylith-architect-preparation.md) supply the initial traceability. The final [role contract](polylith-architect.md) and installed prompt have been checked against those boundaries by the authoring parent. This is not independent compliance review.

| Review concern                                    | Required output or constraint                                                                                                     | Independent reviewer relevance |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Product/system/specialist authority               | Conditional proposals, explicit conflicting reports and targeted upstream questions; no invented acceptance.                      | Architecture/contracts.        |
| Natural ownership, privacy, reuse and removal     | Grounded responsibility map, boundary rationale and whole-artifact promotion; no service-per-noun or feature-internal imports.    | Architecture/UI.               |
| Registry, contribution, event and lifecycle       | Scoped dependency/contract map; async local start, serial ready, explicit owned-resource release.                                 | Architecture/contracts.        |
| Contract change and partial evidence              | Affected consumers and semantic guarantees before type checking; missing specialist inputs visible.                               | Contracts/verification.        |
| Host/trust/resource boundaries                    | Do not infer Electron capability exposure or direct filesystem access from application registry design.                           | Privacy/security/architecture. |
| Build and verification                            | Inclusion versus activation, feature-owned asset/test contributions, narrow proof levels and early coherent review opportunities. | Architecture/verification.     |
| Read-only assessment and orchestration separation | Text report only, no delegates/writes/execution, proposed slices rather than writer assignments.                                  | Scope/verification.            |

The prompt preserves each preparation scenario, including useful incomplete-input analysis, no-work triage, private collaborator uncertainty, UI/domain reuse distinctions, required versus optional dependencies, late results, loadables, consumer impact, upstream boundaries, deferred test assessment and embedded write requests. These are static walkthroughs, not twelve independently executed evaluations.

An additional hypothetical case leaves all material product questions intentionally unanswered. Expected behavior is a conditional structural proposal plus a ranked question list identifying which later decision each answer affects. Asking the owner to settle everything before giving a report, or silently choosing answers, fails this case.

The installed configuration follows the [official custom-agent schema](https://learn.chatgpt.com/docs/agent-configuration/subagents) verified during this session: unique name, description, developer instructions, inherited model, medium reasoning and read-only sandbox. Instruction prohibitions hold even if parent overrides widen effective permissions; configuration alone does not prove runtime enforcement.

## Evaluation Inputs And Limits

Supply a bounded question, current accepted facts, prior specialist recommendations with their decision status, applicable constraints and explicit unresolved questions. Missing product or system decisions remain conditional; evaluation does not select an implementation feature. Store application-specific inputs and results in the owning project.

## Static Validation

All 13 installed agent TOML files parsed with unique names. The new role has the required description/instructions, read-only sandbox, medium effort and no model override; its prompt is 554 words. All 140 local links/anchors across the role, preparation, review and connected topic documents resolved before execution.

Application-specific assessment outputs and live evaluation evidence are maintained in the owning project.
