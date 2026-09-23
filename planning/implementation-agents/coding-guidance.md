# Coding Guidance

Status: evolving guidance catalog for the proposed coding agents. This collects techniques and assessment ideas already discussed; it is not an implementation approval or a complete role contract.

## Authority And Use

This document is the single maintained location for complementary coding guidance. Load the categories relevant to the assignment rather than giving every agent the full catalog.

- **Canonical requirements** remain in the folder-selected [engineering standards](../../documentation/standards/README.md) and applicable repository overlays. Links here are references, not additional standards selections.
- **Execution boundaries** remain in the [agent design](design.md): assessment versus implementation, write ownership, production/test separation, escalation, and independent review.
- **Coding guidance** lives here: ways to reason about and perform work within those requirements and boundaries. A different compliant technique is not a standards violation.

The categories below organize existing ideas by use. Some apply canonical requirements through practical questions; they do not make those requirements optional. Product-specific requirements belong in repository context.

All specialties may use [bounded research](research-guidance.md) on their own initiative when a material fact or current technology behavior is uncertain. The parent or orchestrator routes each query to the agent most likely to answer it; a specialist returns out-of-scope questions to the parent as focused consultation requests. Prefer authoritative, version-relevant evidence and keep the research proportional to the assigned decision. Research informs the specialty's work without expanding its ownership or replacing canonical requirements.

## UX Planning

Reusable UX methods and evidence belong in the dedicated [UX guidance reference](ux-guidance.md); [role boundaries](design.md#ux-planning-agent) remain in the design. Start from product-owner domain knowledge and specific interaction ideas, evaluate refinements against applicable evidence, and preserve owner authority over consequential product changes. The reference contains a compact initial set of sourced general principles; targeted domain or interaction research may be performed when an actual task needs it.

For bounded implementation work, the UX planner supplies the [interface inventory](ux-planner.md#ux-to-ui-handoff) needed by UI design: surfaces, content, controls, behavior and states, with accepted requirements distinguished from proposals and unresolved choices. Early exploration remains proportional to the brief.

## UI Design

The [UI design agent](design.md#ui-design-agent) owns visual planning separately from UX and view implementation. Its [compact sourced reference](ui-guidance.md) now provides initial practices; [research notes](ui-research.md) preserve provenance and conditional numeric checks. Organize it around spacing and density, typography and readability, semantic/brand color roles, hierarchy and grouping, placement and alignment, state visibility, adaptation to window size/text expansion, and accessibility practices. Accessibility guidance covers semantic controls/names, keyboard and focus behavior, reading order, contrast/non-color cues, text scaling/reflow, target sizing and feedback, with explicit baseline versus specialized-interface scope and coordination with UX. Keep applicable CSS/Grid, variables, MUI theme and accessibility obligations in canonical standards. Product-specific values belong in product design; design-system conventions are contextual guidance, not universal compliance rules.

For an app-wide assignment, derive proposed visual foundations and recurring patterns from the supplied UX inventory and representative workflows; see the [foundations proposal contract](design.md#app-wide-ui-foundations-proposal). Explain common rules, useful exceptions, concrete options and owner decisions. Keep accepted product foundations in one application reference and reuse them in later screen specifications; engineering-standard changes retain their canonical/overlay route.

For implementation assignments, UI planning produces a concrete React/view handoff: layout and sizing constraints, spacing/type/color tokens or proposed values, control placement, relevant visual states, adaptation rules, accessibility details and observable acceptance criteria. Reuse existing patterns; distinguish accepted decisions from unresolved proposals. General design advice alone is insufficient for an implementation-ready handoff. The view coder owns the technical React/CSS implementation and escalates missing design decisions.

## System Architecture Planning

The assessment-only system architect uses the separate [compact assessment rules](system-architecture-guidance.md), with [research detail](system-architecture-research.md) available on demand. Runtime, storage, API, and trust decisions precede coding architecture; Polylith and React implementation guidance stays with the coding specialists.

## Architecture

Related context: [architectural principles and composition](design.md#governing-architectural-principles), [architecture standards](../../documentation/standards/architecture.md), [ReMVC](../../documentation/standards/remvc.md), and [Polylith](../../documentation/standards/polylith.md).

- Start with the ownership question: does the proposed change keep knowledge with its natural owner, or leak it outward?
- Identify the consuming service and the scope of each dependency before choosing an integration mechanism.
- Compare direct service lookup, a functional contribution registry, and events against the actual relationship: a required capability, independently supplied contributions, or asynchronous observation.
- Walk through registration, startup, integration, and explicit owned-resource cleanup when assessing a service boundary; do not assume a framework stop lifecycle. Consider required-dependency failure and optional-dependency absence separately.
- Use feature removal and implementation substitution as thought experiments to expose hidden coupling.
- Treat repeated code as a prompt to investigate shared meaning and change drivers, not as automatic justification for an abstraction.

### Polylith-First Authoring Guidance

The first architecture agent targets Polylith apps. Shared reasoning includes ownership, cohesion, state authority, contracts, failures, and proportional abstraction. Polylith-specific knowledge includes registries, lifecycle, feature/loadable activation, build metadata, deployment composition, and test integration. Project context supplies the actual host, product constraints, and agreed UX. Alternative architecture agents may reuse the shared reasoning later; do not build a generic selector or assume the current architecture/ReMVC standards are framework-neutral.

- **Decompose from behavior:** start with agreed workflows, domain concepts, and invariants; identify capabilities and owners before naming services or folders. A screen or data noun does not automatically become a feature. Return missing product decisions to UX planning/the owner.
- **Size boundaries deliberately:** compare extending an existing owner, adding a private collaborator, exposing a registered capability, and creating an independently selectable feature. Avoid both fragmented services and a single service accumulating unrelated responsibilities.
- **Request the state assessment:** the model agent leads analysis of authoritative domain state, drafts, derived values, persistence, mutations, lifetime, and change propagation, with controller input on workflow/session state and view input on transient presentation state. Architecture uses that assessment to define service boundaries and cross-feature contracts and resolves ownership across boundaries; it does not duplicate the specialist analysis. See the [state assessment decision](design.md#state-assessment-ownership).
- **Coordinate specialist-owned contracts:** specialists propose operations, inputs/results, failures, cancellation, ordering/concurrency, lifecycle, notifications, and cleanup for their capabilities. Architecture resolves cross-feature boundaries and disagreements. Derive user-visible failure, cancellation, recovery, and preservation-of-work behavior from agreed UX; return feasibility conflicts and missing product choices for resolution before dependent work. Leave private implementation choices to their owners. The owning specialist identifies affected consumers and coordinates updates before implementation; JSDoc-backed type checking then verifies structural compatibility, while behavioral tests cover semantics. See [contract design ownership](design.md#contract-design-ownership) and [contract change impact](design.md#contract-change-impact-before-implementation).
- **Choose integration by relationship:** architecture guides the choice using specialists' proposed contracts, rather than preferring one mechanism everywhere:
  - Direct service lookup fits a capability needing another capability to perform an operation.
  - A contribution registry fits independently included features supplying options or behavior to a host, such as pages or commands. The registry has a coherent functional purpose rather than collecting unrelated objects.
  - Events fit announcing something that happened so interested consumers can respond. Do not disguise a required operation as an event.
- **Consume the system design:** use the runtime/process, deployment, host, trust, communication, and major resource boundaries established by [system architecture planning](design.md#system-architecture-planning-agent). Request an upstream assessment when boundaries are missing or need to change; do not silently decide them within coding architecture. Coordinate UX tradeoffs with the owner and avoid cloud abstractions without a product need.
- **Exercise relevant changes and failures:** specialists assess local behavior; coding architecture checks cross-service effects; UX guides visible recovery; system architecture handles cross-runtime failures. Consider absence, substitution, interruption, stale results, dependencies failing after startup, and owned-resource release where the task creates those risks. Identify the actual mechanism and verification needs rather than assuming framework support. See [failure assessment and current Polylith limits](design.md#change-and-failure-assessment): there is no stop workflow or service dependency management, and singletons persist for the app lifetime. Do not infer hot replacement, automatic teardown, or dependency ordering from registration. Avoid unrelated checklist scenarios.
- **Hand off structure:** provide scope/ownership boundaries and relevant system/UX decisions, specialist-agreed contracts and affected consumers, dependencies/sequence, proposed specialist work and shared files, verification needs, framework gaps, and open decisions. Scale the handoff to the task. The orchestrator retains scheduling and exclusive file assignments. See the [architecture handoff decision](design.md#architecture-handoff).

Priority expansions: worked product decomposition, state ownership, and contract examples; then integration choices and lifecycle debugging. A draft-record workflow can exercise provisional versus durable state and validation ownership without prescribing a product domain.

Private implementation classes are an accepted decomposition tool when the extracted responsibility needs no independent application contract. Construction and test substitution are separate implementation decisions. Private collaborator substitution and mockable factories remain a [deferred decision required before implementation](design.md#deferred-decision-private-collaborator-test-seams). No default injection/factory pattern has been selected.

### From Product Requirements To Responsibilities

Recommended method for the architecture agent; scale the detail to the task. This is authoring guidance, not a mandatory file structure or a new compliance checklist.

1. Start with agreed user workflows: what the user accomplishes, what changes, and which outcomes must remain true. Keep unresolved product questions explicit rather than filling them with architectural assumptions.
2. Identify the meaningful domain operations behind those workflows before choosing classes, services, or files.
3. Assign ownership of facts and decisions. Identify who owns each operation's data, rules, mutation, and lifecycle; check existing owners before proposing new ones.
4. Group responsibilities by cohesion and independent change. Shared meaning and change drivers suggest grouping; distinct authority, lifecycle, or independently selectable behavior suggest separation.
5. Map those groups onto Polylith and ReMVC: features, private collaborators, registered services, controllers, and views. Not every group needs every layer.
6. Trace a representative workflow through the proposed structure. Look for duplicated policy, unnecessary hops, hidden dependencies, and responsibilities leaking into presentation.

Output a small responsibility map with the reason for each proposed boundary and links to the workflows it supports. Explain consequential alternatives, particularly when an existing owner could absorb the work. Derive structure from behavior and ownership; screens, data nouns, and folder conventions provide supporting information rather than predetermined boundaries.

An illustrative draft-record workflow prompts these questions:

| Behavior | Ownership question |
| --- | --- |
| Begin editing | Who creates and owns the provisional state? |
| Change a field | Who validates the draft and derives dependent values? |
| Commit the record | Who owns durable mutation and reports the result? |
| Discard the edit | Who coordinates cleanup without losing unrelated work? |
| Filter the surrounding list | Is this presentation state, session state, or a domain query? |

These are questions to resolve, not five predetermined services or approved product architecture.

### Loadables For Distinct Workflows

Assess Polylith loadables when an app contains clearly distinct workflows that users enter separately, especially where substantial workflow-specific code would otherwise load before use. Independently entered tools or games are common examples. This is a candidate boundary, not a mandate to split every feature or screen.

- Keep a small entry or contribution available to discover and enter the workflow; defer the workflow implementation through Polylith's declared loadable mechanism.
- Check actual dependency overlap and expected use. Frequently shared behavior may belong in a common owner; tightly interleaved workflows may gain little from separate loadables. Weigh potential startup savings against first-entry delay and boundary complexity rather than assuming a performance improvement.
- Describe activation, loading feedback, failure recovery, repeated entry, and navigation away during loading. Confirm what the installed loader supports before promising retries or cancellation.
- Distinguish build inclusion, deferred loading, service registration/readiness, active workflow lifetime, and cleanup. Loading is not process isolation or a guarantee that code/resources unload when the user leaves.
- Keep loadable declarations, assets, styles, and tests with their owner. Follow canonical Polylith test inclusion: deferred production code still participates in the feature's test build; runtime dynamic loading is not assumed in that lane.
- Verify generated loading and lifecycle behavior against the project's installed Polylith version. Examples illustrate usage, not new framework contracts. Record the proposed boundary, shared dependencies, entry contract, loading/failure behavior, and verification needs in the architecture handoff.

Local evidence inspected on 2026-09-16: poly-gc-react's `src/gc/features/tetris/build.json` and `tetris.js` declare a loadable and enter it through `load('tetris')` before adding/showing its page; `src/gc/features/mj/build.json` also declares a game loadable. The legacy Polylith builder's `packages/builder/plugins/plugin-loader.js` and `loaderTemplate.txt` generate dynamic imports, declared CSS loading, optional prefix-scoped registry startup, and cached promises. This inspection does not establish newer-version behavior or promise unloading, retry, or cancellation support.

## Model

The initial model specialty is Polylith-aware. Load relevant [Polylith](../../documentation/standards/polylith.md) and [ReMVC](../../documentation/standards/remvc.md) concepts: application versus installation registries, service registration/lookup, capability contracts and consumer-owned dependencies, feature activation/privacy, model/service boundaries and lifecycle. Understand contributions/loadables when relevant without inferring runtime unloading or service teardown. Keep React implementation and unrelated build/deployment detail outside this role's context.

Preserve the [owner-confirmed lifecycle](design.md#current-polylith-lifecycle-and-dependency-limits): asynchronous start for local initialization, intentionally serial ready for dependency-driven setup. Serial invocation is distinct from awaiting callback promises; non-awaiting alone is not a defect. Assess asynchronous model capability needs through explicit contracts, not an assumed framework redesign. Distinguish app-lifetime singletons from shorter-lived domain/resource state; no stop hook or automatic dependency management is implied. Verify consequential framework claims against authoritative implementation evidence and report mismatches without silently changing policy.

### State Assessment And Operation Rules

These working rules consolidate existing canonical requirements and agreed role decisions. Source references retain authority; this is not a second engineering standard or a new set of reviewer rule IDs. The compact state map below is a recommended assessment format, not a required implementation artifact. Apply only the rules relevant to the task's paths and scope.

1. **Start from agreed behavior, not a storage schema.** Identify the state and domain operations required by the accepted workflows. Record unknown semantics rather than inventing defaults, boundary meanings, or recovery policy. Establish meaning and authority before choosing classes or representations. Basis: [product-to-responsibility method](#from-product-requirements-to-responsibilities) and [contract ownership](design.md#contract-design-ownership).

2. **Lead assessment without taking every state's ownership.** The model agent coordinates the inventory with controller input for workflow/session state and view input for transient presentation state. Architecture resolves cross-boundary ownership questions. Assessment leadership does not make the model the owner of all state. Basis: [state assessment decision](design.md#state-assessment-ownership).

3. **Give each canonical fact one authority.** Classify relevant values as authoritative facts, drafts, projections, caches, or transient state. Consumers may hold references or derived values; they do not maintain competing truths. Record the source of each projection/cache and when it becomes stale. Basis: [ReMVC](../../documentation/standards/remvc.md#models-and-services), REMVC-017/018; [React](../../documentation/standards/react.md#props-state-and-events), REACT-020.

4. **Assign ownership by meaning and lifetime.** A local draft field can remain presentation state; editing state with domain rules belongs to its feature model. Workflow sequencing belongs to the controller, and shared domain state needs its real domain owner. Move state beyond component lifetime when its consumers or meaning require it, not merely because it is called a draft or selection. Basis: REMVC-018/019 and [React presentation boundary](../../documentation/standards/react.md#presentation-boundary), REACT-009.

5. **Define mutations and invariants at the owning boundary.** Identify the allowed domain operations, what must remain true, and the observable result or failure. Controllers translate user intentions into those operations; views do not mutate canonical domain state. Trace only the transport/persistence boundaries actually present. Basis: REMVC-012 through REMVC-020 and [server boundaries](../../documentation/standards/server.md#structure-and-lifecycle), SERVER-009 when applicable.

6. **Validate real ingress and keep representations owned.** Validate and normalize external inputs and stored data where they enter the domain; internal layers trust accepted contracts instead of repeating shape checks. Do not leak raw transport/storage objects into presentation or assume the project needs a server/database. Database conventions require applicable folder selection; a JSON project file does not itself select database identifiers or time representations. Basis: [code conventions](../../documentation/standards/code-conventions.md), CODE-CONVENTIONS-017/018; REMVC-012/016; [persistence applicability](../../documentation/standards/data-persistence.md#purpose-and-applicability), DATA-PERSISTENCE-001/002.

7. **Describe state lifetime using available mechanisms.** Identify creation, commit, discard, invalidation, persistence, and release where relevant. Distinguish persistent service singletons from shorter-lived sessions and resources. Do not infer a Polylith stop workflow or dependency manager. Basis: [current framework limits](design.md#current-polylith-lifecycle-and-dependency-limits) and [change/failure assessment](design.md#change-and-failure-assessment).

8. **Make change propagation and interrupted work explicit.** Identify consumers, how they observe changes, and relevant stale-result, ordering, concurrency, retry, or partial-effect cases. UX determines user-visible failure/cancellation intent; the model/service states its technical guarantees and the controller coordinates the workflow. Return mismatches for a decision rather than silently promising rollback or cancellation. Basis: [contract ownership](design.md#contract-design-ownership), REMVC-017/020, and the model role's existing responsibility inventory.

9. **Publish one behavioral contract and assess its consumers early.** Describe operations, inputs/results, and failure semantics through the project's JSDoc/type conventions. Coordinate affected consumers before implementation, then use type checking to verify included consumers and behavioral tests for semantics. Do not preserve competing old/new contracts without an accepted compatibility need. Basis: [contract impact decision](design.md#contract-change-impact-before-implementation), [types](../../documentation/standards/types.md), TYPES-003/007, and CODE-CONVENTIONS-019.

10. **Keep structure proportional and testable.** A transport-neutral model can expose a registered capability when another facade would only forward calls; separate services when their responsibilities justify them. Identify isolated behavior and integration cases for test authors. Private-class decomposition is accepted, but construction and mock substitution remain deferred. Basis: REMVC-015/016, [testing](../../documentation/standards/testing.md#service-and-lifecycle-tests), TESTING-042, and the [deferred decision](design.md#deferred-decision-private-collaborator-test-seams).

### Assessment Output

For each relevant state item, summarize its meaning/kind, authoritative owner or source, allowed mutations/invariants, lifetime/persistence, consumers/change propagation, and unresolved decisions. Add proposed operations, affected contracts, and verification needs where they clarify the handoff. Keep this a compact map; do not force every field into a table or choose a database schema, class hierarchy, or fixed set of services prematurely.

To expand: a worked state/operation assessment, data-lifecycle debugging, and implementation examples after the deferred construction decision is resolved.

## View

Related context: [view responsibilities](design.md#view-agent), [React](../../documentation/standards/react.md), [general styling](../../documentation/standards/code-conventions.md#markup-css-and-layout), and [MUI](../../documentation/standards/mui.md).

- Understand the relevant [Polylith](../../documentation/standards/polylith.md)/[ReMVC](../../documentation/standards/remvc.md) context: registries and service lifecycle, feature activation/privacy, view-service/controller boundaries, page or UI contributions and loadables when used. Framework awareness does not authorize React components to perform registry orchestration, invoke model/services directly or own workflow policy.
- Distinguish app-lifetime view services from mounted React instances, subscriptions and other shorter-lived presentation resources. Preserve asynchronous start and intentionally serial ready as described in the [framework context](design.md#current-polylith-lifecycle-and-dependency-limits); neither React unmount nor a loadable implies singleton teardown or a Polylith stop hook. Non-awaiting of ready callback promises alone is not a defect. Flag real asynchronous capability requirements through the owning contract.
- Load framework detail only where it affects the assigned view integration; architecture still owns structural/framework changes. View mounting does not initiate unrelated domain work.
- Establish meaningful semantic regions and CSS layout before wiring interactions when that helps clarify the presentation structure.
- Work from the agreed UX and view/controller contract: project state into presentation values and intent callbacks, keeping only genuinely transient visual state local. Do not duplicate canonical domain state.
- Follow the selected React component conventions: substantial components are classes; function components are reserved for very small stateless wrappers/utilities (REACT-011 through REACT-013). Role references to React expertise do not prescribe a hooks-first implementation.
- Use the existing responsibility inventory to assess presentation states, accessibility, localization, responsive behavior, and reusable components.
- Consult the canonical Grid, CSS-variable, branding, and CSS-owned styling rules when making layout and appearance choices. This catalog does not duplicate those rules.

The [view assessment contract](view-agent.md) operationalizes this guidance as a component/state/intent map, lifecycle and styling plan, unresolved-contract list and UI-test handoff. Treat UX/UI reports as proposals until accepted; return missing visual direction to UI/owner rather than silently designing it. Assess actual concrete component APIs, text resolution and CSS/asset build inclusion before suggesting new abstractions.

To expand: worked view-service/component handoffs, layout examples, and interaction/debugging sequences.

## Controller

Related context: [controller responsibilities](design.md#controller-agent), [ReMVC](../../documentation/standards/remvc.md), and [Polylith](../../documentation/standards/polylith.md). The initial controller specialty is Polylith-aware; load relevant framework concepts, not just generic orchestration principles.

- Establish the relevant Polylith concepts before assessing coordination: app versus installation registries, service registration/lookup, executor versus controller responsibility, feature activation and privacy, start/ready phases, and app-lifetime singletons versus owned session resources. Understand functional contributions and loadables when the task uses them; neither a build contribution nor a loadable establishes arbitrary runtime unloading or service teardown.
- Preserve the owner-confirmed lifecycle: `start()` is asynchronous and may run in parallel for local initialization; `ready()` intentionally runs serially for dependency-driven setup. Serial invocation is distinct from awaiting promises returned by callbacks. Do not characterize the intended ready phase as a defect or recommend making it asynchronous merely because returned promises are not awaited. If a workflow needs asynchronous capability preparation, identify the explicit capability contract rather than assuming a framework lifecycle change.
- Read the relevant canonical Polylith/ReMVC sections and confirm consequential details against authoritative framework code when necessary. Separate owner-stated lifecycle intent, observed installed behavior and actual capability requirements; report material mismatches without silently redesigning Polylith. Keep build/deployment internals outside the assessment unless they affect the assigned workflow.
- Start with the agreed UX workflow; map user intentions to service operations and success/failure/cancellation/retry transitions. Own workflow/session coordination without taking domain policy or visual presentation decisions.
- For cancellation, UX defines the intended experience, the controller coordinates requests and transitions, and the model/service defines what can stop and which effects have already occurred. Surface mismatches rather than promising rollback or cancellation that is unsupported.
- Invalidate stale work when context changes and account for controller-to-controller handoffs; producing a mountable view must not start unrelated domain work.
- Trace each workflow-owned resource through its explicit cleanup path. Persistent service singletons do not imply persistent workflow resources; Polylith provides no stop workflow.

These working steps derive from existing ReMVC responsibilities and the agreed UX/contract ownership decisions. Worked implementation examples remain to be developed.

To expand: worked orchestration sequences, cancellation races, error-flow diagnosis, and state-transition examples.

## Unit And Service-Integration Testing

Related context: [test-author ownership](design.md#unit-and-service-integration-test-agent), [testing standards](../../documentation/standards/testing.md), and [Polylith test-flow integration](design.md#polylith-test-flow-integration).

- Choose the proof level first (TESTING-042): construct the real service with narrow fakes for isolated decisions; use actual registries/lifecycle when readiness, registration, or cross-service wiring is the subject. Do not require a full registry setup for every unit test.
- Use actual feature registration and realistic separate registries for service-integration cases. Consider service population, lifecycle cooperation, contributions, dependency scope, substitution, and absence of a feature or optional installation service.
- For controller unit tests, use mock view and model contracts to isolate orchestration without rendering React.
- Derive expected results from the agreed behavioral contract rather than reproducing the production implementation. Select relevant edge cases, control time/randomness/environment, and wait on bounded completion conditions rather than arbitrary sleeps (TESTING-024 through TESTING-032).
- Test actual owner-controlled resource-release paths; do not invent a Polylith stop hook. TESTING-043 shutdown wording is flagged for canonical reconciliation in the plan. Private-collaborator construction and substitution remain deferred; these testing principles do not select a factory convention.

To expand: fixture-design examples, choosing unit versus integration coverage, and distinguishing a faulty test from a production defect.

## UI Testing

Related context: [UI test-author ownership](design.md#ui-test-agent), [testing standards](../../documentation/standards/testing.md), and [React testing](../../documentation/standards/react.md#testing).

- Exercise observable content, user-intent callbacks, state transitions, focus, and resource cleanup through public view contracts. Use the appropriate rendered/browser lane and stable semantic assertions rather than component internals or incidental markup.
- Select cases from the relevant presentation states and user interactions, including focus, keyboard behavior, localization, accessibility, and responsive behavior where those are part of the assigned contract.
- Use rendered feature-view integration when the behavior spans components; assess browser or full-application coverage separately when it is explicitly assigned.
- When a scenario exposes a missing production seam or unclear behavior, describe the observable case and needed contract in the handoff. The design retains the rule that test authors do not repair production code themselves.

To expand: worked rendered scenarios, browser failure diagnosis, and UI fixture patterns.

## Orchestration And Handoffs

Related context: [specialist assessment](design.md#specialist-assessment-before-implementation) and [task flow](design.md#task-flow). Their required sequencing and ownership are execution boundaries, not optional techniques.

- Keep operational handoffs focused on work needed, proposed ownership, contracts, dependencies, missing decisions, risks, and verification needs.
- Retain the assessing specialist for implementation where practical so useful investigation is not repeated.
- Reuse settled decisions and involve only materially relevant specialists. Scale reasoning effort to the role and assignment: focused, well-specified work can start lower; ambiguity, consequential boundaries, or difficult failures justify escalation. Evaluate cost/time and quality together under the [pre-deployment efficiency gate](design.md#efficiency-evaluation-before-deployment); do not weaken review or ownership guarantees to save usage.
- Use dependencies and contract stability to choose parallel versus sequential assignments; parallelism is not a goal by itself. Group work into substantial coherent chunks. During construction, use focused positive-path tests; defer the consolidated negative and adversarial matrix and broad regression pass to chunk finalization. Follow TESTING-065: strict test-first development is not required.
- Classify a failure before routing a correction: production defect, faulty test, structural ambiguity, unresolved product decision, or infrastructure gap.
- Reassess the work affected by a changed decision rather than repeating unrelated assessments.
- Schedule independent review at planned substantial stable boundaries for generated code and tests, using the main conversation's existing review-standards workflow. Do not request another review for each small implementation increment. Use an earlier focused gate only when a consequential architecture, contract, persistence, or security uncertainty could invalidate substantial dependent work. Keep the reviewed snapshot stable, route findings promptly, reuse unaffected evidence, and retain final integrated review. See [review scheduling](design.md#early-review-scheduling).

To expand: task-contract examples, progress reporting, interruption/resumption, and bounded correction loops.

## Reuse And Refactoring

Related context: [feature colocation](design.md#feature-colocation), [removability and substitution](design.md#removability-and-substitution), and [the proposed refactoring role](design.md#reuse-or-refactoring-role).

- Compare ownership, meaning, and likely change drivers before extracting similar code.
- Evaluate whether a shared concept belongs within the feature, at application scope, or at installation scope.
- Consider whether promotion preserves the service contract, dependency ownership, removability, and substitution behavior.

This is guidance for architecture and assigned refactoring work, not a decision to add a continuously active refactoring agent.

To expand: extraction/promotion examples and cases where similar code should remain separate.

## Expanding The Catalog

Add techniques under the appropriate category with their intended use, a concrete example when useful, limitations, and references to relevant requirements. Keep unresolved ideas labeled as such. Link to existing entries from the design, plan, and eventual role resources instead of creating competing copies.

If a proposed entry imposes a mandatory engineering constraint on the resulting code, address that constraint through the canonical standards process. If it changes write ownership, orchestration, or escalation, update the agent design. Ordinary techniques remain here and are evaluated for usefulness without becoming extra reviewer obligations.
