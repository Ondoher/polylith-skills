# Project planning

This is the single home for the project roadmap, agent contracts, guidance,
research, and assessment records. The reconciled roadmap and design notes take
precedence over superseded status in historical assessment records. Skill
contracts still govern execution; agents load the specific planning resources
named in their definitions.

Installed agents find this folder in the physical governance checkout through
the existing documentation link. Work topics in consuming repositories remain
separate: they divide local task context, not shared planning authority.

Generated product documentation uses repository-root
`documents/<product>/<doc-name>/`; durable design data stays under
`product/<name>/`. The technical-guide publisher has a first-pass implementation;
the [product publication correction](product-publication/plan.md) has a researched
design proposal following a failed first trial. It restores the required PRD and
interaction-document roles while retaining agent-created interaction hierarchy
and page breaks. Separate design-language publication is proposed.

The [refinement-efficiency implementation](../.codex-tmp/refinement-efficiency/plan.md) now
has focused local verification for structured planner input, stage resume and
serial assembly. Inherited test-fixture failures and checkpoint-adviser
eligibility remain unresolved; live performance has not been measured. Further
publication-format tweaking remains deferred; its saved design is the baseline.

The product-design pipeline and standards tooling are implemented. Additional
context consumers, implementation planning, and coordinated coding remain
unfinished. This consolidation updates resource routing and installer validation;
it does not add coding workflows or rerun live agent evaluations.
Use the [skill guides](../README.md#installed-skills)
for operational instructions and the roadmap below for remaining work.

## Remaining feature planning

| Document                                                                                                | Purpose                                                                                                                      |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [Refinement efficiency](../.codex-tmp/refinement-efficiency/plan.md)                                                  | Implemented workflow streamlining and local evidence; outstanding package/adviser gates and future ordinary-run measurement. |
| [Product publication plan](product-publication/plan.md)                                                 | Stable PRD and interaction-document design, agent-owned hierarchy/page breaks, and repeatable composition and revision.      |
| [Implementation discussion plan](implementation-agents/plan.md)                                         | Role review, feasibility, repository opt-in, and orchestration decisions.                                                    |
| [Implementation-agent design](implementation-agents/design.md)                                          | Coding orchestrator, specialty ownership, test authorship, and review handoffs.                                              |
| [Implementation-planning skill](implementation-agents/implementation-planning-skill.md)                 | Deferred bridge from accepted design to bounded implementation deliverables.                                                 |
| [Product-model pipeline](implementation-agents/product-model-pipeline-plan.md)                          | Durable product artifacts and downstream publication, planning, and coding contexts.                                         |
| [Technical-documentation contract](implementation-agents/technical-documentation-contract.md)           | Agreed audience, depth, Markdown format, authority, and acceptance for a future technical-documentation consumer.            |
| [Technical-documentation delivery plan](implementation-agents/technical-documentation-delivery-plan.md) | Incremental, reviewable milestones from a bounded draft through context, publication, and focused issues.                    |
| [Technical-documentation research](implementation-agents/technical-documentation-research.md)           | Sources and practical design choices behind the technical-documentation contract.                                            |

Implementation planning and coding orchestration remain deferred until explicitly
resumed. Claude Code and GitHub Copilot support is also deferred until the full
feature set is complete; no platform adapter implementation is authorized by
these planning documents.

## Design background

| Document                                                                          | Purpose                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Planning-skill design](implementation-agents/planning-skill-design.md)           | Refinement scope, specialist consultation, and decision ownership.             |
| [UI rendering design](implementation-agents/ui-rendering-design.md)               | Structured rendering and reusable component templates.                         |
| [UI pipeline formats](implementation-agents/ui-pipeline-format.md)                | UX, UI, and HTML handoff contracts.                                            |
| [Design-language build plan](implementation-agents/design-language-build-plan.md) | Maintained publication behavior, verification boundaries, and remaining scope. |
| [UX interaction plan](implementation-agents/ux-interaction-architecture-plan.md)  | Current interaction contract and regression versus live-evaluation evidence.   |

## Review and repository infrastructure

| Document                                                     | Purpose                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| [Review-agent design](review-agents/design.md)               | Standards review architecture and evidence requirements.             |
| [Review-agent plan](review-agents/plan.md)                   | Implemented review infrastructure and deferred tuning.               |
| [Repository operating design](skills-repository/README.md)   | Installation, canonical standards, synchronization, and publication. |
| [Application scaffolding](application-scaffolding/README.md) | Project initialization and application creation boundaries.          |

See the [implementation-agent index](implementation-agents/README.md) for role contracts, guidance, research, and assessment records, and the [review-agent index](review-agents/README.md) for standards-review planning.
