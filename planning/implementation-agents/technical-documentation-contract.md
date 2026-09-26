# Technical documentation: working contract

Status: agreed audience, depth, and publication format for a future technical-documentation consumer. This is a design contract, not an installed skill or an instruction to generate Alexa documentation now.

The [research note](technical-documentation-research.md) records the external guidance used to calibrate this contract and its limits. The [delivery plan](technical-documentation-delivery-plan.md) breaks the future workflow into reviewable milestones.

## Purpose and reader

The document prepares developers and coding agents to implement a product. It explains the accepted technical direction, the boundaries that must hold, and the choices that are still open. A reader should be able to identify the owner of each consequential behavior, locate its source requirement, and see which decisions must precede implementation. The document is a living design reference, not a claim that proposed behavior already exists in code.

## Authority and inputs

- Reuse the current product model and verified snapshot. If they do not exist, upstream refinement must first interpret the human-owned description and establish them. Read accepted UX, UI, and component artifacts only where they affect technical behavior. The human product description remains owner authority; a downstream publisher must consume a validated technical context rather than reinterpret its prose. A missing PRD or set of comps does not block technical analysis.
- Inspect the target repository to establish its _current_ runtime, source layout, build, integration, and test facts. Record the inspected commit and relevant uncommitted paths, and label current facts separately from proposed target architecture. Cite repository paths for consequential code claims.
- Make a bounded system-architect assessment the primary technical input. Consult the Polylith architect where the proposed system boundaries need translation into application, feature, service, registry, or REMVC (Registry, Executor, Model, View, Controller) ownership. Ask model, controller, or view specialists only about a consequential contract within their remit. Preserve selected decisions and explicit gaps; a generated document must not turn unselected advice into accepted architecture.
- Apply repository standards and overlays to implementation claims. Link to the governing rules; do not copy their full text into the product document.
- Research uncertain platform or library capabilities through current primary sources. A proposed guarantee without adequate evidence remains conditional and gets a specific verification task.

## Consultation and document ownership

The parent workflow owns the technical context and published pages. It first assembles accepted product decisions, the inspected code baseline, and governing standards, then asks the system architect to assess runtime and host boundaries, storage and data authority, external interfaces, trust, resources, failure behavior, and significant tradeoffs. The system architect returns a read-only assessment with decisions to resolve and evidence to collect; it does not write or approve the document.

Where Polylith structure materially affects the design, the parent gives the Polylith architect the selected system boundaries and a narrow structural question. That assessment maps the boundaries to applications, features, services, registry contracts, and REMVC ownership. It cannot silently change a system boundary; a conflict returns to the parent for reconciliation, with the owner involved when a product decision is needed. A routine technical guide does not require a Polylith pass when those structural questions are absent.

The parent reconciles the assessments with accepted authority, records what was selected or left open, and prepares a validated technical context for deterministic Markdown publication. A focused white paper is authored separately using the same scoped product authority, technical decisions, and evidence; it is not generated from the general-guide template. Specialist reports remain advisory and read-only; neither report alone becomes a published decision.

## Depth

Document the whole system at the boundary level: processes and deployment, external capabilities, data authority, trust boundaries, major services, and quality constraints. Identify a small set of prioritized quality goals and describe what observable scenario would test each one. For each significant boundary, name its owner, consumers, exchanged information, lifecycle, and important failure behavior. Where the consulted architects find it useful, explain how those responsibilities map to application features and shared capabilities, and name the important conceptual models with their authority, identity, relationships, and lifecycle. Distinguish observed code from candidate placement. Do not infer a feature for every screen or prescribe a fixed feature/model inventory for every product.

Go deeper for an operation only when its contract is likely to change architecture or cause data loss, security exposure, costly rework, or a visible broken promise. Capture its preconditions, state and identity rules, success and failure effects, atomicity or durability needs, cancellation/retry behavior, and verification path. Record specific interfaces or data shapes only when an established cross-boundary contract requires them; local classes, every registry entry, every component prop, and routine function signatures belong to implementation work.

The document should answer the major technical questions well enough to begin a bounded implementation-planning task. It need not solve every future implementation detail. A missing product or UX decision is called out with its owner and affected scope, rather than guessed away or used to block unrelated sections.

## Content structure

Publish linked Markdown pages. `index.md` is the entry point and status map. The other groups may occupy one or more focused pages when there is enough material; avoid empty template pages:

1. **Overview and status:** goals, scope, source revision, current code baseline, proposed design status, key constraints, and a map of open decisions.
2. **System architecture:** runtime and deployment boundaries; major components and responsibilities; data ownership, storage, and trust; key quality needs and technical tradeoffs. Include an agent-derived feature/capability map and important conceptual models when these clarify how the product will be built. Keep this above the level of individual views, classes, and registry entries.
3. **Critical flows and contracts:** a small set of cross-boundary scenarios that establish important guarantees. Each traces to product behavior, identifies owners and failure paths, and states what remains conditional.
4. **Decisions and gaps:** architecturally significant accepted decisions with a stable identity, context, choice, meaningful alternatives, consequences, and status; unresolved product, technical, and evidence questions, with a responsible owner and impact. Superseded decisions retain their history.
5. **Implementation handoff:** stable constraints and contracts available to implementation planning, bounded experiments or proofs required before a risky slice, and links to existing build/test guidance rather than copied commands.

Use Mermaid source in Markdown for a context/runtime diagram where it makes an ownership boundary easier to understand. Add a component or sequence diagram only for a materially complicated boundary or flow. Give each diagram a title and scope, label important relationships, and explain any notation that is not self-evident. Diagrams must name the same owners and interfaces as the prose and must not imply an implementation that has not been selected. Every diagram needs adjacent text explaining its meaning and limits, so it is not the sole source of a contract.

## Publication and update behavior

Publish under repository-root `documents/<product>/technical/`, using the same confirmed product folder name as the support data in `product/<product>/`. Link between published pages and include the needed requirement, source-fact, and evidence summaries inline; the guide must stand alone without links to product support data or repository source files. Keep diagrams as editable Mermaid blocks; place other needed assets beside the Markdown pages. Generated support data, source bindings, review evidence, and any detached technical context belong under `product/<product>/`; generated human-facing pages and their assets belong under the published document directory.

A normal first publication might contain `index.md`, `architecture.md`, `critical-flows.md`, `decisions.md`, and `handoff.md`. These filenames are navigation defaults, not an obligation to generate an empty page for every heading. Technical reference detail for a risky boundary may be split into a linked page rather than crowding the overview.

## Focused technical white papers: follow-up capability

Some technical issues deserve an authored standalone white paper with a deeper account than the general guide. Use one when a boundary has multiple interacting owners, consequential unresolved mechanisms, or enough alternatives and evidence that a short section would hide important reasoning. The topic and shape come from the product's technical problem and the consulted agents' findings, not from a required list in the general-guide skill. The first technical-documentation consumer need not create these papers merely to publish its general guide. The [working white-paper workflow](technical-white-paper-workflow.md) describes the description link, research consultation, and information-preserving revision path proposed for this follow-up.

Each white paper remains at its supplied repository location; there is no required authored-input folder. Its author chooses the sections needed to explain the issue; a useful paper ordinarily covers its scope and status, governing product behavior, accepted constraints, proposed architecture and alternatives, state/resource behavior, evidence gaps, and implementation implications. Add linked detail pages or diagrams only when they improve that particular issue. Preserve its source assessment and other support records under `product/<product>/`; generated `documents/<product>/<doc-name>/` folders are output only. The paper is the single editable authored source, linked from the product description and researched and revised with agents. Revisions may change its wording and structure but must preserve every existing fact, decision, alternative, question, and cited finding semantically or explicitly resolve or supersede it with its context intact. It is not mechanically emitted by `generate-technical`.

The general `technical/index.md` links to each published white paper and gives only a short summary, decision status, and reason to read it. A proposed paper without content is an open writing task, not a dead link or an empty publication. A white paper links back to the general architecture and includes its needed requirement and evidence summaries inline. Treat its accepted decisions and contracts as part of the same product authority and change-impact chain. Updating one issue should identify whether the overview or another white paper has become stale; shared contracts must not drift into independent conflicting copies. Linking an authored paper from a generated index requires an explicit publication mechanism that preserves generated-file ownership; do not hand-edit an owned page.

Regenerate only affected content when upstream decisions change. Preserve stable decision identities and mark superseded decisions explicitly. A changed product model, architecture decision, source baseline, standard, or material technology fact should expose affected sections and stale claims. A dirty working tree is a valid inspected baseline; publication must not require a commit. Do not silently overwrite human-owned documents or claim repository code was verified merely because a design artifact was validated.

## Acceptance for the future consumer

- A reader can tell **current code fact**, **accepted target decision**, **conditional proposal**, and **open question** apart on every consequential point.
- The document covers all selected system boundaries and the few critical flows without repeating the PRD or transcribing the whole source tree.
- A risky contract names guarantees and their limits, affected consumers, and the evidence or experiment needed to trust it.
- Every material decision traces to an accepted product/technical source or repository fact. Missing or stale dependencies appear as gaps; unrelated visual data does not enter the technical context.
- Publication is repeatable from the same exact context, keeps its own assets inside the document directory, and does not overwrite unowned files. Relative links resolve and Mermaid blocks parse before the output is treated as publishable.
- When white papers are later supported, the general index links each published one; changing a shared decision flags affected documents without rewriting unrelated issues or leaving contradictory copies.
