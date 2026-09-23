# Iterative Design Planning Skill


Status: implemented refinement workflow. Final PRD publication belongs to generate-prd; implementation planning and coding remain deferred.

## Purpose And Inputs

Accept a broad product idea, an existing design, a changed decision, a focused unresolved question, or an unstructured sentence or note. Treat every invocation as a fresh ingestion rather than an incremental command against remembered structure. Reconstruct the baseline from durable documents and the latest human input. Repeated calls refine the same product meaning, while the description's headings, ordering, grouping, and wording may be rebuilt. A complete specification and every specialist are not prerequisites. The working design is expected to be incomplete at any point. Refine selected areas without inventing missing requirements or treating omission as exclusion; preserve uneven maturity, accepted decisions and explicit unknowns. Only the unresolved prerequisites of a particular downstream task constrain that task.

Read the human-owned product description, relevant PRD pages, accepted decisions and rationale, current proposals/questions, and prior assessment evidence. Establish what changed and what the current invocation should resolve. A user may provide a specific focus or ask the skill to identify the next consequential gap. Do not infer acceptance merely from positive feedback about an assessment.

## Persistence and publication boundary

Refinement performs the semantic read and updates canonical product data.
Downstream final publication consumes a validated PRD context rather than
reinterpreting the human description. The context resolver currently supports
only the prd consumer. Run generate-prd separately to publish the compact or
manifest-selected full HTML site; do not hand-edit generated PRD pages.

## Product And Architecture Planning

Decision: distinguish product and architecture planning within the same repeatable skill. Product planning refines user/domain meaning, requirements, workflows, UI direction and acceptance criteria; architecture planning refines technical responsibilities, data authority, contracts, runtime boundaries and lifetimes within accepted product intent. The [skill](../../skills/refine-design/SKILL.md#choose-the-planning-focus) owns routing and handoff details. A role may contribute to either scope; the question and decision authority determine the scope, not the role name.

Product planning defaults to UX/UI consultation with targeted technical feasibility input. Architecture planning defaults to relevant technical assessment with owner/UX consultation for behavior changes. Mixed requests retain separate decisions and dependencies without automatically running every agent. The durable record identifies the scope and links cross-scope consequences. Advisory architecture planning remains distinct from the gated integrated coding-architecture test.

Each query is routed to the available agent most likely to answer it from its specialty, ownership, and evidence access. Start with one best-fit role rather than broadcasting to the roster. A specialist may research material uncertainty within its own scope; when the question belongs elsewhere, it returns a focused consultation request to the parent for routing. This preserves specialist knowledge without forcing the parent to absorb every domain or allowing one agent to guess across boundaries. See the [shared inquiry guidance](research-guidance.md).

## Product Description And PRD

The owner selected a simple human-authored product description as the durable product source and the generated product requirements document as the human-reviewable result. The description is both input and output: any human text can feed the next refinement, and accepted product decisions return to an organized version of it. Human input is not expected to retain structure and may consist of a single informal direction. When structure is present, headings, nesting, and grouping can help infer the author's meaning. The description may also request UX advice for a complex interaction that remains undefined; the UX planner may use bounded online research to propose evidence-backed alternatives. A concrete direction selected within the planner's authority becomes accepted working UX when incorporated; unselected alternatives and gaps without a usable direction remain proposed or unresolved. The skill performs a complete semantic read on every invocation and may reorganize the result around whichever capabilities and UX flows best explain the product. It uses ordinary Markdown without tables, generated regions, rigid required headings, or a stable structural schema. It preserves owner meaning and explicit unknowns rather than section identity. It is the root product input for eventual code generation.

The PRD expands that description through a breadth-first progression from the whole application to its deepest current details. It starts with application organization and the complete activity map, then introduces all peer product capabilities, all work surfaces, workflows, and component behavior before ending with consolidated open questions. Within one surface, regions remain ordered top to bottom. Product capabilities do not predetermine Polylith feature boundaries; windows, menus, and dialogs may span capabilities and are described once when shared. UI renderings appear with the UX material they illustrate. The [output format](product-specification-format.md) and [rendering design](ui-rendering-design.md) define the static HTML review site, structured sources, and deterministic comps.

Selected PRD and organized product-description content is accepted working design by default. A human may explicitly mark a named design scope `locked`. The parent persists that state in the owning structured artifact and preserves it across fresh stateless agent runs. General refinement, regeneration, new evidence, dependency changes, or unrelated product edits do not authorize a locked change; only a current explicit human request naming the locked scope may change its content, update its bindings, or unlock it. Agents may report a conflict or recommend reconsideration but cannot silently reconcile it. Generated review output visibly identifies locks while ordinary accepted content remains unmarked.

## Bounded Refinement Cycle

1. Establish the current baseline and requested change. Distinguish accepted requirements, preferences, hypotheses, proposals and missing evidence. Reuse existing product files rather than creating duplicate sources of truth.
2. Identify affected decisions and select the smallest useful specialist set. Give each a focused assignment, relevant accepted inputs, prior findings, changed assumptions and an expected response. Do not load every source library into the parent or start idle specialists.
3. Spawn fresh agents for the selected bounded consultations. Consult independent specialties in parallel only where their inputs are sufficiently independent and the benefit justifies the cost. Sequence dependent questions. Collect each result and release the agent when its assignment is complete. Missing findings remain explicit; no simulated agent is presented as an actual named role.
4. Synthesize recommendations, conflicts, alternatives and consequences. Route contradictions to the responsible specialty or owner instead of choosing by majority vote or silently rewriting requirements. Further consultation must resolve a material question, not produce endless consensus rounds.
5. Present the next useful owner decisions, prioritizing those that unblock dependent design. Continue independent reasoning while choices are unresolved; dependent work remains conditional.
6. Within the authorized documentation scope, update accepted product decisions in the product description and persist proposals and open questions in the owning structured artifacts for later PRD publication. Preserve rationale and identify which dependent findings need reassessment. Specialists return text; the parent owns durable updates.
7. End with a concise change summary, decisions still needed, evidence limits and an appropriate next refinement. Stop when the requested question is answered, an owner decision is needed, or available evidence cannot resolve uncertainty. Repeated invocation is the normal continuation mechanism, not an unbounded autonomous loop.

## Specialist Routing

| Need | Candidate consultation |
| --- | --- |
| User tasks, surfaces, components, behavior and recovery | UX planner |
| App-wide visual foundations, concrete UI and accessibility design | UI designer |
| Host/runtime, storage, trust and major technical capabilities | System architect |
| Domain meaning, state authority, invariants and operations | Model assessment |
| Workflow coordination, sessions, races and resource ownership | Controller assessment |
| React presentation feasibility and implementation handoff gaps | Installed view assessment under its read-only contract |
| Structural integration or verification feasibility | Installed Polylith architect assessment; test specialists remain deferred |

A specialist reports only its assigned questions and their implications. The skill owns coordination and the conversation, not the expertise of every role. It may return useful planning without a coding handoff. Prior accepted UX, visual foundations and system decisions are reused, with affected portions revisited when inputs change.

## Durable Continuity And Cost

Use product/<name>/ at the owning repository root as the durable planning home. Ask for a missing or ambiguous name before saving. Preserve an existing human description at its supplied location. Agents are stateless across invocations, so keep enough compact state to reconstruct every later assignment: accepted decisions with rationale, open choices and dependencies, proposals with source/evidence, and assessment inputs or document revisions. Research worth reusing records its question, material sources and versions/dates, findings, applicability, limitations and affected decisions. The parent persists this evidence because current specialists are read-only. Links can point to longer reports. Temporary assessment files are useful evidence but cannot be the only durable record for accepted decisions. Do not persist full conversation transcripts or every intermediate thought.

A changed decision invalidates affected recommendations, not all prior planning. For example, changing source-media ownership can affect model persistence, system I/O and UX recovery without reopening the typography scale. Reports should say which inputs changed and what remains reusable. Capture actually available latency/usage for material consultation runs; do not invent credits or require every agent on every invocation. No numeric cost threshold is yet agreed.

## Authority And Preparation

Product authority remains with the owner, including explicitly delegated decision scope. Product documentation never overrides canonical engineering standards or folder overlays. This workflow does not start coding, authorize production/test writes, certify compliance, or publish arbitrary generated images. Its bounded HTML/CSS and vector-asset path is planning output only.

The current standalone UX/system entry points and isolated evaluation contracts remain available. The skill provides an explicit [planning consultation path](design.md#planning-consultation-through-refine-design) for model/controller assessment through refine-design. It authorizes bounded read-only design advice, not coding orchestration or combined implementation architecture integration. Other specialists require explicit contract support and availability. The skill uses one initial consultation round and at most one targeted follow-up by default; user scope can adjust that bound.

The installed version persists canonical models, specialty artifacts, snapshots, and contexts under the named product root. Its maintained evaluation covers incomplete briefs, repeated calls with no material change, changed accepted decisions, locked dependency conflicts, missing specialists with honest parent provenance, transient surfaces, research-backed complex components, promotion candidates, and scoped preservation of unrelated artifacts. Guidance and installed roles are reused rather than copied into the skill.
