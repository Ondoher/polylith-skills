# UX Planner Role Review

Date: 2026-09-21. Scope: standalone UX planning and schema 0.2 interaction architecture. This is an authoring and static contract review, not an independent model run, usability study, or engineering-standards verdict.

## Contract Review

The upgraded role was checked against the active [interaction-architecture plan](ux-interaction-architecture-plan.md), [compact UX guidance](ux-guidance.md), [shared research guidance](research-guidance.md), [planner evaluation cases](ux-planner-evaluation.md), and the separate [UX reviewer contract](ux-reviewer.md).

| Required property | Planner behavior | Handoff or failure behavior |
| --- | --- | --- |
| Product authority | Preserve owner goals, terminology, constraints, accepted decisions, and locks; distinguish assumptions and alternatives. | Conflicts return through the parent; no silent reinterpretation or unlock. |
| Broad interaction ownership | Define tasks, information hierarchy, actions, meaningful states, feedback, cancellation, recovery, and semantic frames. | UI receives behavior and priority without pixel styling or framework choices. |
| Action traceability | Every visible action supplies `taskRefs`, outcome, canonical interaction method/input/description, alternate inputs, presentation class, visibility mode/conditions, persistence, priority, applicable states, feedback, and recovery. | Missing interaction methods remain unresolved rather than becoming invented controls. |
| Research before invention | Unfamiliar, app-specific complex, unsupported, or materially conflicting interactions trigger bounded pattern research before selection. | Missing evidence prevents an unsupported researched or novel selection. |
| Honest novelty | A bounded unsuccessful search uses `no-suitable-precedent`, conservative selection, explicit uncertainty, and real-task evaluation. | No fabricated consensus or universal claim. |
| Pruning | One clear path per primary task; duplicate persistent affordances are merged or removed; contextual operations are demoted; redundant explanations are removed. | Necessary contextual access, alternate input, expert density, safety, and accessibility remain. |
| Accessibility baseline | Ordinary semantic behavior, keyboard access, and visible focus remain; readily available accessibility is favored. | No conformance claim or automatic unbounded custom-equivalent scope. |
| Feasibility boundary | Desired user-visible behavior is separate from rollback, cleanup, persistence, and background guarantees. | Focused questions route through the parent to architecture. |
| Read-only authority | Advice or JSON only; no files, code, Git, applications, connectors, messages, elevation, or delegation. | Implementation requests become handoffs. |
| Anti-overfitting | Reusable instructions use task, action, state, surface, region, selection, feedback, and recovery concepts. | No product name, domain-specific control list, preferred layout, or expected scene tree enters the reusable contract. |

## Structured Mode Review

Schema 0.2 replaces the earlier UX schema as a greenfield interaction contract. The planner returns one JSON object and preserves stable product meaning, accepted status, source bindings, and locks. It supplies `patternResearch`, task/outcome-traced `actions` with `patternBasis`, semantic `interactionFrames`, and `pruningReview` in addition to the application, use-case, surface, component, state, and question records.

`patternBasis` is declared on actions and frames. `ordinary` has a rationale and no research reference. `researched` references evidence with outcome `pattern-selected` or `conflicting-patterns-resolved`. `novel` references evidence with outcome `no-suitable-precedent` and explicit selection uncertainty. The planner returns newly gathered evidence as pending; only the parent records `source-checked`, which is required before researched or novel behavior is persisted as resolved. Structural validation checks these declarations; the independent UX reviewer challenges qualitative misclassification.

Interaction frames intentionally stop before visual design. They use `taskRefs`, stable region and affordance IDs, and transitions to express information and task order, direct manipulation, contextual actions, transient surfaces, relevant state, and focus intent without exact geometry, typography, color, spacing, or framework components.

## Configuration And Limits

The installed planner remains pinned to `gpt-6-astra` with `ultra` reasoning and a read-only sandbox. The prompt loads only its compact contract, UX guidance, shared research guidance, supplied product context, and material sources. It explicitly rejects embedded scope expansion and agent spawning.

Static configuration parsing, local-link validation, prompt-neutrality checks, schema tests, and live fresh-agent evaluations must be recorded from actual verification rather than inferred here. Behavioral completion requires product-neutral cases first, independent reviewer discrimination, UX-to-UI traceability, and only then a separately stored blind holdout. A holdout preference cannot change reusable guidance until its underlying product-independent principle passes unrelated evaluation.
