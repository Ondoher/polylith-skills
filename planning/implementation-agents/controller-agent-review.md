# Controller Agent Assessment Role Review

Scope: the owner's request to create the controller assessment capability. Authoring-parent rule review, not independent standards certification. No implementation mode is installed. The [isolated evaluation path](design.md#isolated-assessment-evaluation) permits requested bounded runs; full coding workflow gates remain unchanged.

## Traceability And Static Review

Reviewed the existing controller guidance, responsibility inventory, shared specialist response and resource/lifecycle constraints before defining the role.

| Authority | Required behavior and handoff | Scenario / downstream concern |
| --- | --- | --- |
| DOCUMENTATION mapping/overlay governance | Resolve selected paths; preserve inheritance and overrides; flag missing applicability. | All scoped assessments; architecture. |
| REMVC-006/007/009 and registry ownership decisions | Consumer-owned dependencies, correct app/installation lookup, implemented capability calls. | Optional dependency/cross-feature navigation; architecture/contracts. |
| REMVC-017/019/020/021 | Model authority versus controller sessions; intent translation, transitions and stale-state invalidation. | Save, seek, repeated sessions; architecture/contracts. |
| REMVC-022 through 025 | View projection and controller workflow remain distinct; mounting does not trigger unrelated work. | View creation; UI/architecture. |
| TYPES-003/007; CODE-CONVENTIONS-019 | Canonical contract and consumer impact, no unsolicited compatibility layer. | Changed async result; contracts. |
| TESTING-042 | Isolated controller proof with narrow fakes versus actual registry/wiring proof. | Verification handoff; verification. |
| TESTING-043 through 049 and framework/deferred notes | Report lifecycle/test-seam discrepancies; no invented stop hook or construction policy. | Session release; architecture/verification. |
| UX/model/system authority | UX supplies intent, services define effects/guarantees, controller coordinates. | Cancel/retry/missing contracts; contracts/UX. |
| Assessment/evaluation and efficiency decisions | Same bounded orchestrator contract, no writes/delegation, no-work response when appropriate. | Embedded instruction/visual-only cases. |

Sources: [documentation](../../documentation/standards/documentation.md), [ReMVC](../../documentation/standards/remvc.md), [types](../../documentation/standards/types.md), [code conventions](../../documentation/standards/code-conventions.md), [testing](../../documentation/standards/testing.md), [controller design](design.md#controller-agent), [controller guidance](coding-guidance.md#controller).

Static walkthrough of the eleven [evaluation cases](controller-agent-evaluation.md): the contract distinguishes context invalidation from cancellation, captured-save results from current edits, session resources from singletons, retry from proven idempotency, and mounting from workflow activation. It preserves product decisions and other specialists' authority, explicitly forbids implementation/delegation and permits a no-work response. This is instruction analysis, not observed model performance.

## Owner Clarification: Polylith Awareness

The owner clarified after the Alexa assessment that start is asynchronous and ready intentionally serial, and that the controller agent must understand Polylith concepts. Updated the live prompt, contract, controller guidance and framework-context note accordingly. Required concepts now explicitly include registries, service lookup, executor/controller roles, feature activation/privacy, lifecycle and resource ownership, with contributions/loadables loaded when relevant. Added a lifecycle-interpretation case. The earlier assessment's observation about returned promises is not itself evidence that the intended ready design is defective; a concrete workflow capability requirement is needed before raising an integration concern. This clarification does not change canonical framework standards or implementation.

The earlier eleven-case walkthrough below predates the added case; the new lifecycle case has received a static instruction walkthrough only. No repeat live assessment is claimed.

## Configuration And Validation

Uses the established standalone TOML format already verified against [official Codex documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents). Inherited model, medium effort and read-only sandbox. Parent live overrides may affect effective permissions; instruction prohibitions remain, but configuration is not proof of sandbox enforcement. No changes to global configuration, bootstrap, repository opt-in or canonical standards.

Static validation passed: all 10 global agent TOML files parse with required fields and unique names. The new role has read-only sandbox, medium effort and no model override. All 89 local links/anchors in its resources and connected design/plan/index resolve; required guidance exists. The prompt is 426 words. These checks did not execute a model assessment. No live controller-agent discovery, behavioral test, Alexa assessment, integration result or cost calibration is claimed. A bounded requested evaluation is the next use; routine deployment remains subject to the existing efficiency and quality gates.
