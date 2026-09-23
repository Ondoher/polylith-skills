# Implementation Agents

This directory holds the maintained planning and role contracts for product
design and the deferred coding workflow. The current roadmap is in
[plan.md](plan.md); the [pipeline plan](product-model-pipeline-plan.md)
distinguishes implemented PRD publication from future consumer and coding work.
Reusable tests use synthetic or sanitized data. Historical assessment records
are background, not proof of current readiness or retained live-run provenance.

The current product pipeline persists exact source bytes, canonical product
models, separately versioned specialty artifacts, immutable snapshots, and
self-contained PRD context packages. `refine-design` owns interpretation and
design work; `generate-prd` owns final publication without reading human
Markdown. The publisher supports both a compact product review and the full
manifest-selected design site. Remaining renderer helpers in refinement support
bounded inspection and are not a second final-publication workflow.

Repository-backed product-design data lives in `product/<name>/` at the
repository root. Refinement asks for the product name when the description does
not clearly state it and the current owner has not already supplied it. Existing
human descriptions remain at their supplied paths; new descriptions normally
live in the named product folder. Reset uses fresh agents and returns validated
data to the same location, preserving human inputs. See the
[product-design guide](../../docs/product-design.md) for interaction flows and
the [refinement guide](../../docs/refine-design.md) for the concrete layout.

This topic preserves the design of planning and implementation agents. The standalone assessment-only system architect, UX planner, UX reviewer, and UI designer are authorized installed units; model, controller, React/view and Polylith coding architecture specialties are also installed in assessment-only form for authorized isolated evaluation. The UX reviewer is a qualitative product-design gate outside the engineering-standards reviewer lifecycle. The broader coding workflow remains a design under evaluation.

The [canonical product model and implementation pipeline plan](product-model-pipeline-plan.md) records implemented behavior and deferred work. Its implementation-planning deliverables and coding-orchestrator handoffs remain deferred and are not current implementation scope. The earlier [UX interaction-architecture upgrade](ux-interaction-architecture-plan.md) is completed foundation work. Reusable contracts and evaluations remain product-neutral; a blind holdout cannot supply reusable expected output.

Installed agents load only the contracts and shared guidance named by their TOML definitions. Review, smoke-test, preparation, and first-assessment records are historical validation evidence, not agent instructions or reusable defaults. Product-specific evidence in those records must never supply an exception, shortcut, role behavior, fixture, or design choice for a later assignment; current operational inputs are protected by the refine-design product-neutrality regression test.

- [Polylith architect: assessment contract](polylith-architect.md)
- [Polylith architect: review and evaluation](polylith-architect-review.md)
- [Polylith architect: first Alexa assessment](polylith-architect-alexa-assessment.md)
- [Polylith architect: preparation and information gaps](polylith-architect-preparation.md)
- [View agent: assessment contract](view-agent.md)
- [View agent: review and validation](view-agent-review.md)
- [View agent: evaluation cases](view-agent-evaluation.md)
- [View agent: first Alexa assessment](view-agent-alexa-assessment.md)
- [Controller agent: assessment contract](controller-agent.md)
- [Controller agent: review and validation](controller-agent-review.md)
- [Controller agent: evaluation cases](controller-agent-evaluation.md)
- [Model agent: assessment contract](model-agent.md)
- [Model agent: review and validation](model-agent-review.md)
- [Model agent: evaluation cases](model-agent-evaluation.md)
- [UX planner: usage and assessment contract](ux-planner.md)
- [UX planner: review and validation](ux-planner-review.md)
- [UX planner: evaluation cases](ux-planner-evaluation.md)
- [UX reviewer: interaction-review contract](ux-reviewer.md)
- [UX reviewer: review and validation](ux-reviewer-review.md)
- [UX reviewer: evaluation cases](ux-reviewer-evaluation.md)
- [System architect: usage and assessment contract](system-architect.md)
- [System architect: review and validation](system-architect-review.md)
- [System architect: evaluation cases](system-architect-evaluation.md)
- [UI designer: usage and assessment contract](ui-designer.md)
- [UI designer: review and validation](ui-designer-review.md)
- [UI designer: evaluation cases](ui-designer-evaluation.md)
- [Refine Design: installed planning skill](../../skills/refine-design/SKILL.md)
- [Generate PRD: installed context-only publisher](../../skills/generate-prd/SKILL.md)
- [Iterative planning design and status](planning-skill-design.md)
- [Implementation-planning skill proposal](implementation-planning-skill.md)
- [Product description and PRD output format](product-specification-format.md)
- [Structured UI rendering and reusable component templates](ui-rendering-design.md)
- [UX -> UI -> HTML: structured handoff formats](ui-pipeline-format.md)
- [Design-language mode: first implementation requirements](design-language-mode.md)
- [Design-language contents: research and component scope](design-language-content-research.md)
- [Accepted output format: implementation and verification](design-language-format-review.md)
- [Static HTML PRD and UI-composition skill: vertical-slice build plan](design-language-build-plan.md)
- [Canonical product model and implementation pipeline: current roadmap](product-model-pipeline-plan.md)
- [Product-model pipeline Slice 1: implementation and evidence](product-model-slice-one-review.md)
- [UX interaction-architecture upgrade: completed working plan](ux-interaction-architecture-plan.md)
- [Design-language Slice 1: implementation and evidence](design-language-slice-one-review.md)
- [Design-language Slice 2: palette and defaults evidence](design-language-slice-two-review.md)
- [Design-language Slice 2b: palette-to-theme evidence](design-language-slice-two-b-review.md)
- [Design-language Slice 3: typography evidence](design-language-slice-three-review.md)
- [Design-language Slice 4: required icons evidence](design-language-slice-four-review.md)
- [Design-language Slice 5: password component evidence](design-language-slice-five-review.md)
- [Planning skill validation](planning-skill-review.md)
- [Design discussion](design.md)
- [Coding guidance by specialty](coding-guidance.md)
- [Shared agent research guidance](research-guidance.md)
- [UX guidance and evidence](ux-guidance.md)
- [UI guidance and evidence](ui-guidance.md)
- [UI research notes](ui-research.md)
- [Brand palettes and UI color usage research](brand-palette-research.md)
- [Initial typography font inventory](typography-font-inventory.md)
- [System architecture assessment rules](system-architecture-guidance.md)
- [System architecture research](system-architecture-research.md)
- [Feasibility and alternatives plan](plan.md)

Coding workflows require repository opt-in. UX planning and [system architecture planning](design.md#system-architecture-planning-agent) also have standalone advisory entry points before or independently of coding, without requiring a coding orchestrator or implementation opt-in. Coding architecture works within the agreed system boundaries. The implementation design keeps dependency knowledge with the consuming service, keeps concrete feature code colocated, divides production work among architecture, model, view, and controller specialties, divides test authorship between non-UI service testing and specialized React/UI testing, runs every generated test through the repository's existing Polylith test flow, and retains the existing read-only review agents and evidence ledger as the sole compliance authority.

The agreed flow uses a separately spawned coding orchestrator for each coherent implementation task. The main conversation agent retains product discussion, the human-owned product description, and the generated PRD, handles product questions with the engineer, and owns the existing review workflow. The coding orchestrator requests architecture triage for every coding task, gathers assessments from relevant production and test specialists, then assigns work after contracts and ownership are resolved. Assessment and implementation are modes of the same roles. The orchestrator coordinates specialist work and returns integrated results and evidence. See [the orchestration design](design.md#conversation-and-coding-orchestration).

A preserved future [implementation-planning skill](implementation-planning-skill.md) will bridge accepted design and coding by organizing work into discrete, reviewable deliverables. It plans delivery boundaries and sequencing; a fresh coding orchestrator later receives one selected deliverable and owns task-level execution. The owner has explicitly deferred implementation planning and coding until that stage is resumed. The design is retained, but the skill is not installed or current implementation scope.

Before any role is implemented or piloted, its governing rules must receive a thorough scenario-based review and explicit engineer approval. The architecture-agent rules are reviewed first and most rigorously because their structural consequences are the hardest to correct later.

Each role combines the canonical requirements used by reviewers with complementary coding guidance, such as assessment questions, implementation techniques, examples, and common pitfalls. Canonical obligations retain traceability to their source rules and reviewer lanes. Guidance is labeled separately and may go beyond the standards without becoming a competing compliance rule set. Missing mandatory engineering policy is corrected in the standards before it becomes a role requirement. See [requirements and guidance](design.md#canonical-requirements-and-coding-guidance).

Every role may perform bounded research when it lacks reliable information needed for its assigned work; this permission does not require an explicit research request. Research remains within the role's scope and follows the [shared evidence and question-routing rules](research-guidance.md). For example, system architecture may research current WebCodecs specifications and platform support before choosing a media boundary. The parent or orchestrator routes each question to the agent most likely to answer it from the relevant specialty and evidence. Research does not grant decision ownership or override product decisions, standards, or repository instructions.

Specialists are ephemeral and stateless across assignments. Spawn one for a bounded question or task, provide a self-contained input, collect its result, and release it when done. Research and conclusions worth reusing are returned as a preservation handoff for the parent or another authorized documentation owner to save durably. Later runs reconstruct context from those records and current source evidence rather than a surviving agent thread.

Any future pilot must target explicitly scoped work in an opted-in repository after role readiness and verification requirements are established. Product-specific pilot choices belong in that product repository.

- [Design-language Slice 6a verification](design-language-slice-six-review.md): command-button states, derived colors and remaining coverage.

- [Separate component reference verification](design-language-components-review.md): linked foundations and compact standard-component documentation from one source.

- [Ordinary text field and shared message pattern verification](design-language-text-field-review.md): two-width states, helper/error reuse and remaining scope.

- [Composite input pattern verification](design-language-composite-review.md): one shared helper/error area for a logical input with multiple controls.

- [Single-selection select slice evidence](design-language-select-review.md) ? shared input messages, five states and two widths.

- [Button variants and missing-component fallback evidence](design-language-extras-review.md).

- [Focused design-language review pages](design-language-review-pages-evidence.md) - compact index, conditional topic pages and preserved decisions.
