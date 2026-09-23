# Implementation Agents Design Discussion


## Status

Product refinement, PRD publication, and the cataloged read-only specialist
roles are implemented. Production-writing modes, independent test-authoring
roles, implementation planning, and coding orchestration remain deferred.
The future workflow sections below describe proposed behavior, not existing
bootstrap integration or authorization to run it. REMVC means Registry,
Executor, Model, View, Controller.

The [roadmap](plan.md) separates current operation from remaining decisions.
The [refinement design](planning-skill-design.md) describes the implemented
planning boundary. Role contracts and the installed catalog govern actual
availability; historical evaluation reports do not establish current readiness.

## Iterative Design Planning

### Planning Consultation Through Refine-Design

Within a user-requested planning task, the implemented [refine-design skill](../../skills/refine-design/SKILL.md) may consult the existing UX/system planners and model/controller roles in read-only assessment mode without enabling the coding workflow. The parent provides bounded questions and accepted/provisional inputs, coordinates results and owns authorized product-document updates. Specialist spawning is explicitly authorized by the skill; specialists themselves do not delegate or write.

This path is distinct from isolated role evaluation and full coding orchestration. It does not issue code/file ownership assignments for implementation, claim integrated architecture readiness, change engineering standards, or waive coding-workflow opt-in. The installed UI designer also supports this entry point. View and Polylith architect roles are installed for read-only assessment under their contracts; dedicated test-authoring roles remain deferred. Role absence is reported rather than bypassed or hidden. The skill can return useful parent-authored analysis without claiming unavailable agents ran. Its bounded refinement cycle and durable decision record are specified in the skill, not duplicated here.

### Proposed Implementation-Planning Skill

The owner has identified a separate future skill that converts accepted design, architecture, and repository evidence into discrete implementation deliverables. Its [preserved proposal](implementation-planning-skill.md) places it between design refinement and coding orchestration. It prefers bounded, reviewable vertical outcomes, records dependencies and readiness gaps, and produces a durable handoff for one future coding-orchestrator task. It does not replace UX, UI, system or Polylith architecture, and it does not perform task-level implementation assignment or coding. Implementation planning and coding are explicitly deferred until the owner resumes that stage; the skill is not yet created, and its name, output format, readiness rules, and evaluation remain open.

## Repository Opt-In

Implementation agents are repository opt-in. Standalone advisory UX planning and system architecture are separate entry points excluded from this implementation activation requirement; neither enables coding workflows. Installing global agent definitions or an orchestration skill only makes the capability available; it does not authorize implementation agents in every repository.

The eventual workflow must require an explicit durable declaration in the repository-root `AGENTS.md`. A likely form is the standalone directive:

```text
Implementation agents: enabled
```

The exact syntax must be finalized before implementation, but the activation semantics are fixed:

- absence of the repository-root declaration disables the implementation-agent workflow, except for the explicitly authorized, read-only [isolated assessment evaluation](#isolated-assessment-evaluation) and [refine-design planning consultation](#planning-consultation-through-refine-design) paths;
- nested `AGENTS.md`, topics, prompts, inferred source types, and the presence of package or Polylith files cannot opt in a repository;
- bootstrap detects opt-in, validates implementation-agent infrastructure, resolves the repository's eligible role roster, and records implementation-agent readiness for the session;
- bootstrap does not assign work or authorize repository writes merely because the repository opted in;
- opt-in does not authorize work beyond the engineer's current request or relax filesystem, Git, review, standards, or approval rules;
- a direct workflow request in a repository that has not opted in reports the missing declaration and does not spawn an implementation agent; bounded isolated assessment and refine-design planning consultation follow their respective conditions; and
- disabling the declaration prevents new implementation-agent work and invalidates any active implementation workflow before further writes.

The standard bootstrap owns implementation-agent enablement. For an opted-in repository it must validate and report the implementation-agent roster and readiness before bootstrap completes. Missing or invalid implementation-agent infrastructure blocks that roster and is reported during bootstrap; it does not affect repositories that did not opt in. To control credit use, readiness should not require starting idle model threads unless feasibility testing proves that durable prestarted context is necessary. Actual agents start only when the parent assigns an in-scope implementation task.

The `instructions-only` bootstrap profile does not implicitly opt in to coding agents. Whether it must categorically exclude them or may coexist with a separate explicit opt-in remains a feasibility decision; no implementation should assume the answer.

### Isolated Assessment Evaluation

Decision: the main conversation may act as the calling parent to evaluate one specialist's assessment capability using the same assignment and response contract the future coding orchestrator will use. The initial intended use is the model agent. This is an explicit, bounded evaluation path, not a separate standalone role or a production-workflow activation. It does not require building the orchestrator or opting the repository into the full coding workflow first.

The parent supplies:

- the named role, assessment-only mode, task scope and selected repository/document paths;
- accepted product requirements and behavioral acceptance criteria where available;
- available system/coding architectural constraints and applicable standards context;
- existing contracts or specialist findings, clearly separating accepted inputs from proposals;
- unresolved decisions and missing dependencies, including any unavailable architecture triage; and
- the expected assessment response and evaluation scope.

The specialist returns the ordinary assessment handoff: work needed or no work needed, proposed ownership, operations/contracts/dependencies, sequencing constraints, unresolved questions and risks, and verification needs. Include its role-specific analysis, such as the model's state/operation map. Missing inputs remain explicit; neither parent nor specialist fabricates another agent's findings or implies that architecture integration occurred.

The actual named role must be created, reviewed and ready for its bounded evaluation before invocation. An individual run requires a user-directed evaluation assignment; recording this path does not launch a run or install a role. The specialist remains read-only, returns text and cannot spawn other agents, edit production/tests/specifications, or transition into implementation. The parent may persist a report only within the authorized scope. Deferred collaborator construction and mock-substitution choices remain unresolved and cannot be implemented by assumption.

Record inputs, observed outputs, quality findings, elapsed time and available usage, distinguishing static checks and actual model execution. This evaluates the specialist's contract, not orchestrator behavior, combined integration or routine deployment readiness. Full coding-workflow use, including orchestrated assessment-only integration, retains repository opt-in and the applicable readiness/review gates. Implementation requires its own explicit assignment and authorization; the evaluation path provides no write permission.

## Canonical Requirements And Coding Guidance

Each coding role receives both the canonical engineering requirements used by independent reviewers and complementary role-specific coding guidance. Standards define the constraints the resulting work must satisfy. Coding guidance explains how the specialist can assess, design, implement, troubleshoot, and hand off that work effectively; it may go beyond techniques explicitly described in the standards.

### Shared Canonical Requirements

Writers and reviewers resolve the same canonical standards and applicable repository/folder overlays for each path. Mandatory engineering constraints on the resulting code belong in that shared authority, not only in a writer prompt. Role instructions reference those sources and retain traceability to their obligations instead of copying their text into another rule set.

### Complementary Coding Guidance

Role-specific techniques, assessment questions, examples, pitfalls, and handoff advice are maintained in the [coding guidance catalog](coding-guidance.md). It is the single expandable reference organized by specialty. This design owns the distinction between that guidance, canonical requirements, and execution boundaries rather than maintaining another copy of the techniques.

Guidance is clearly labeled separately from canonical requirements and from mandatory role-execution boundaries such as write ownership, escalation, and production/test separation. Suggested techniques remain adaptable to the task. Role-execution boundaries govern agent conduct; they do not silently add engineering constraints to the resulting code.

Independent reviewers evaluate the applicable standards and task contracts. They must not report a standards violation merely because an author chose a different compliant technique from a guidance example or preferred sequence. Conversely, following coding guidance is not evidence that the resulting code complies with the standards.

Guidance must remain consistent with canonical requirements, applicable overlays, and the agreed task. If developing guidance reveals a missing mandatory engineering constraint, address it through the canonical standards process before treating it as a requirement. Helpful techniques and examples do not need promotion into standards merely because they are useful.

Keep reusable coding guidance in [coding-guidance.md](coding-guidance.md); global role documentation and supporting resources link to its relevant sections and load only what the specialty and task need. Product-specific decisions remain in repository context. Maintaining guidance does not replace standards resolution or require the orchestrator to absorb every specialty's detailed working methods.

### Shared Research And Question Routing

Every planning, architecture, coding, testing, and review role may perform bounded research when it is unsure of a material fact needed for its assigned work. The user does not need to request research explicitly. Follow the [shared research guidance](research-guidance.md): prefer authoritative and version-relevant sources, cite material claims, distinguish facts from inference and recommendations, and preserve evidence limits.

The parent conversation, planning skill, or coding orchestrator routes each query to the available agent most likely to answer it based on specialty, ownership, and evidence access. Begin with one best-fit role and add another only for a real cross-specialty dependency. A specialist that encounters an out-of-scope question returns a focused consultation request to the parent for routing rather than guessing or spawning peers. Research and consultation stay inside the assigned task; neither overrides accepted product decisions, canonical standards, repository instructions, or another specialist's ownership, and neither expands write or execution permissions.

Agents are ephemeral across assignments. Spawn a fresh role with a self-contained task and relevant durable evidence, collect its answer, and release it when the bounded work is complete. Do not retain idle specialists or use thread memory as project state. Research and decisions that later work needs are saved by the parent or another explicitly authorized documentation owner using the [durable evidence contract](research-guidance.md#ephemeral-agent-lifecycle-and-durable-evidence).

## Pre-Implementation Rule Review

A thorough review of the governing rules for every proposed implementation-agent role is a mandatory prerequisite to agent definition, wiring, or pilot execution. This review is intentionally deferred; recording the requirement does not begin it.

The canonical-requirements portion of each role is developed by working backwards from the relevant standards. The role also receives complementary coding guidance and explicit execution boundaries as described above. Its engineering obligations are derived from shared authority, while its useful working techniques need not be limited to techniques enumerated in the standards. For every applicable standard obligation, the review identifies:

- which implementation role must act on it;
- which decisions that role owns;
- which inputs and repository context it requires;
- what the role must produce or preserve;
- what the role is prohibited from changing;
- when it must stop, report ambiguity, or escalate;
- which other writing roles share a boundary with the obligation; and
- which read-only reviewer lane and evidence-ledger entries independently verify it.

The derivation must retain traceability to canonical standard files, sections, and stable rule identifiers where available. Repository and folder overlays remain runtime inputs selected by path; they are not copied into global role definitions. Agent definitions contain durable role behavior and loading instructions for canonical requirements and complementary guidance, not duplicated standards text.

If working backwards exposes an architectural requirement that is absent or unclear in the canonical standards, the standards are corrected and normalized before the agent contract incorporates the rule. Prompts must not become a hidden substitute for standards governance.

The review must, for each role:

- inventory every applicable canonical standard, repository overlay mechanism, lifecycle rule, ownership boundary, permission rule, and reviewer contract;
- identify missing, conflicting, duplicated, ambiguous, or obsolete guidance;
- distinguish canonical engineering requirements, mandatory role-execution boundaries, and suggested coding techniques; identify what independent reviewers and deterministic tooling actually enforce;
- define prohibited writes, escalation conditions, stopping behavior, and handoff evidence;
- confirm that the role receives enough context to perform its specialty without receiving unrelated implementation context;
- map the role's outputs to every read-only reviewer lane that may evaluate them;
- test the proposed rules against representative compliant changes, violations, ambiguous requirements, and cross-agent conflicts; and
- obtain explicit engineer approval before the role is implemented or activated.

The resulting rule-review artifact should include a traceability matrix with one row per relevant standard obligation and columns for source rule, applicable role, required behavior, prohibited behavior, owned artifacts, escalation condition, reviewer lane, and verification scenario. Record complementary guidance separately with its intended use, examples, limitations, and consistency checks; do not manufacture canonical rule identities or reviewer obligations for suggested techniques.

The architecture agent requires the first and most rigorous review because its decisions establish boundaries and contracts that later model, view, controller, and test work will depend upon. Retrofitting corrections after implementation would cause the widest and most expensive changes.

Its rule review must give special attention to:

- feature privacy and colocation;
- keeping dependency knowledge with consuming services;
- application-registry and installation-registry scope, plus the difference between ordinary services and functional subregistries;
- complete registration before lifecycle integration;
- required and optional dependency behavior, missing-service failures, cycles, and cleanup;
- main-application ignorance of concrete feature identity and internals;
- ownership of shared contracts, feature entry points, and cross-specialty files;
- criteria for direct service access, contributions, events, registries, abstraction, and service promotion;
- removability, implementation substitution, A/B variants, and stable registry identities;
- REMVC and Polylith dependency direction;
- testability through exported service classes and isolated registries; and
- alignment between the architecture authoring agent and the independent architecture reviewer.

A possible generic JavaScript architecture standard must be reviewed and normalized before the architecture agent relies on it. Agent roles must not compensate for missing canonical rules by embedding an undocumented architecture policy in their custom agent prompts.

## Governing Architectural Principles

1. Dependency knowledge belongs to the service that consumes the dependency.
2. All concrete code associated with a feature remains colocated with that feature.
3. The main application does not know which features are present and never reaches into a feature.
4. Features register services; excluding a feature removes its services and functionality without requiring application changes.
5. Every app-owned service is accessible through that app's registry. Installation-specific services are accessible through the separate installation registry explicitly given to the app.
6. Registration of the complete installation-service population occurs before app routers initialize, and registration of an app's complete service population occurs before that app's Polylith service lifecycle methods run.
7. A service establishes its integrations during lifecycle processing, after registration is complete.
8. Omitting a service removes the integrations supplied by that service. A missing required dependency fails explicitly; a missing optional dependency removes only the optional integration.
9. Shared structure is promoted only after it represents one stable concept with common meaning and change drivers. Repetition is a reason to evaluate an abstraction, not an automatic mandate.
10. Moving or replacing a service must not require the main application or unrelated features to learn its concrete implementation.

The guiding architecture question is: did a change keep knowledge with its natural owner, or leak it outward?

## Registry And Service Composition

Each application registry is an explicit, replaceable, lifecycle-controlled service context rather than an ambient static singleton. A feature registers its app-owned services with this registry. Each service exports its service class and accepts an optional registry, allowing production composition to use the application registry and tests to supply an isolated one.

The host separately constructs an installation registry for the active deployment. The master repository's optional deployment entry point receives it first, followed by the optional entry point of each selected discovered repository, once per repository rather than once per app. All setup entry points complete before routers initialize; routers then receive the same registry explicitly. This registry owns services selected for one installation, such as host facilities or integrations that resident and discovered apps may use. It is not a merged parent registry, does not expose sibling app internals, and does not tell an app which other apps are present. A consuming service identifies whether a dependency belongs to its application registry or the installation registry and keeps that dependency knowledge local.

A service normally resolves its own required and optional services from the registry during the appropriate lifecycle method. Outer application layers do not construct and propagate the service's transitive dependency graph.

The conceptual lifecycle is:

```text
1. Create the installation registry.
2. Run master deployment setup with the master role.
3. Run setup once for each selected discovered repository with the discovered role.
4. Load each app's selected feature population without exposing sibling apps.
5. Each included feature registers its app-owned services.
6. Complete that app's service registration.
7. Invoke the app's Polylith service lifecycle methods and router integration.
8. Services resolve scoped dependencies and establish integrations.
9. Release shorter-lived owned resources through explicit owner-controlled paths; no framework stop workflow is currently available.
```

Required dependency failures should name the consuming service, missing service, and expected registry scope and occur before partial initialization where possible. Optional dependencies must be queried explicitly so absence has a defined meaning. A possible future Polylith facility could let services declare required and optional dependencies with application or installation scope, validate each complete registry before lifecycle execution, diagnose cycles, and determine ordering where ordering is necessary. That facility is an idea for feasibility review, not a current requirement.

## Functional Subregistries

A service can itself be a registry when accepting contributions is its functional purpose. For example, an application pages registry is a service available through its application's registry, and features contribute pages to it.

Functional subregistries:

- are named for the service or capability receiving contributions, not for contributing features;
- expose a purposeful contribution contract rather than acting as arbitrary property bags;
- own key collision, replacement, ordering, lifecycle, and removal behavior;
- allow consumers to depend on the resulting capability without knowing its contributors; and
- keep contribution code colocated with the contributing feature.

Inversion through a functional registry is the default when independently included features contribute zero or more options to a host capability. Direct service lookup remains appropriate when one service requires another capability. Events remain appropriate for asynchronous observation. The main application does not branch on feature identity in any of these cases.

Decision: architecture guides integration choices from the relationship expressed in specialists' proposed contracts, not from a blanket preference for one mechanism. A required operation uses an explicit capability contract rather than being disguised as an event; events announce occurrences for interested consumers. Contribution registries retain a coherent host purpose. The [authoring guidance](coding-guidance.md#polylith-first-authoring-guidance) records the practical selection criteria.

## Change And Failure Assessment

Decision: assess change and failure scenarios proportionally to the task. Specialists assess behavior within their responsibilities; coding architecture checks cross-service effects, UX guides user-visible recovery and preservation of work, and system architecture handles failures crossing runtime boundaries. The orchestrator coordinates the affected assessments rather than requiring an exhaustive checklist for every change.

Relevant scenarios may include absent features or optional dependencies, a replacement implementation, interruption, stale results, dependencies failing after startup, and release of workflow-owned resources. Select scenarios the proposed work actually introduces. Record the expected behavior, responsible owner, existing mechanism, and verification needs; distinguish a supported behavior from an unresolved product decision or missing framework capability.

### Current Polylith Lifecycle And Dependency Limits

Framework context supplied by the owner: `start()` is asynchronous and `ready()` intentionally runs serially. Keep local initialization and dependency-driven setup distinct; serial invocation must not be confused with awaiting callback promises or treated as a reason to redesign the ready phase. Polylith currently has no stop workflow; service singletons last for the lifetime of the app; and there is no service dependency management. These are current capability limits, not permission to assume automatic dependency validation, ordering, recovery, service teardown, or hot replacement. Confirm the installed framework's behavior when implementing; the framework can evolve.

Registration, service lookup, and start/ready phases do not by themselves provide dependency management. Architecture can describe required and optional relationships, but must identify how the consuming implementation handles them with available mechanisms. Framework-managed declarations, dependency graphs, cycle diagnosis, and automatic readiness ordering remain possible future work, not present guarantees.

Distinguish app-lifetime service singletons from shorter-lived resources they own. Workflow listeners, requests, timers, workers, and similar resources may need explicit owner-controlled release or cancellation during normal operation even though the service itself persists. Do not promise a framework stop callback or introduce a synthetic stop lifecycle merely to satisfy a proposed design. If lifecycle support is necessary, surface the gap and decide explicitly whether bounded app-owned behavior suffices or framework work is required before dependent implementation.

Removal and substitution guidance describes build/composition choices or isolated test composition unless runtime behavior has separately been established. It does not imply unloading a live feature, destroying its singleton, or replacing an active service safely. Existing cleanup obligations remain applicable to owned resources; no unsupported shutdown mechanism is inferred from them.

## Removability And Substitution

Feature and service registration are composition controls:

- Excluding a feature removes all functionality and integrations it provides.
- Not registering one of a feature's services removes the integration owned by that service, provided no remaining service declares it as required.
- Registering a different implementation under the same stable service contract supports replacement, tests, rollback, and A/B variants.

For one selected implementation per application instance, composition registers either implementation. If multiple cohorts must coexist inside one process, the architecture may need scoped registries or a canonical selector service that delegates to private variants. Consumers must not branch on experiment identity.

Every interchangeable implementation must satisfy the same behavioral contract. Persistence, lifecycle, telemetry, and cohort-assignment consequences require explicit design before simultaneous variants are used.

## Feature Colocation

A feature should contain the concrete code needed to register, implement, integrate, test, and remove its behavior. A representative shape is:

```text
feature/
|-- registration
|-- services
|-- model
|-- controllers
|-- views
|-- contracts
|-- integrations
`-- tests
```

This is a responsibility model, not a mandatory filename layout. Cross-feature interaction occurs through registered service contracts, functional subregistries, or events. A feature does not directly import another feature's internals.

When a feature-local service becomes genuinely app-shared, the architecture may promote it to an app-level owner while preserving its stable contract and application-registry identity. Promotion to an installation-wide service is a different architectural operation: it moves ownership to the installation composition boundary and requires an explicit installation-service contract without exposing the original feature or a sibling app. Feature-specific dependencies must first become proper service contracts, contributions, or events.

## Conversation And Coding Orchestration

The agreed coordination structure uses a separately spawned coding orchestrator for each coherent implementation task. It is distinct from the main conversation agent and from the architecture authoring agent. This decision defines the intended workflow; installing or activating it still requires the role-review, feasibility, and repository opt-in prerequisites.

```text
Engineer <-> Main conversation agent
                  |
                  v
         Task coding orchestrator
                  |
                  v
    Architecture / production / test specialists

Coding orchestrator -> Main conversation agent
                    -> existing review-standards workflow
                    -> independent reviewers and audits
```

### Main conversation agent

The main conversation agent retains the engineer-facing product discussion, maintains the human-owned product description and generated PRD, and turns agreed work into a bounded implementation assignment. The product description is the root product input supplied for code generation; the bounded assignment identifies the relevant PRD details, acceptance criteria, exclusions, durable context, and known unresolved decisions. Product documents are context, not blanket authorization to implement everything they describe.

The main conversation agent receives progress, questions, and the final handoff. It resolves product questions with the engineer and sends decisions back to the orchestrator. It does not concurrently edit files assigned to the orchestrator's specialists. Any transfer of write ownership is explicit.

The main conversation agent remains the session authority for bootstrap, reviewer lifecycle, topic refresh, and execution of the existing review-standards workflow. The coding orchestrator requests those operations through it rather than starting a second review roster or creating a parallel compliance process.

### Coding orchestrator

Within an assigned task, the separately spawned coding orchestrator is the parent of the specialist implementation and test agents. References to the parent elsewhere in this document mean this coding orchestrator unless the main conversation agent is explicitly named.

The orchestrator assembles specialist assessments into task decomposition, dependency ordering, file ownership, and assignments, then coordinates integration, failure classification, correction routing, and evidence returned to the main conversation. It requests architecture triage for every coding task and consults the additional specialties recommended by that assessment. Specialist agents own interpretation of their technical disciplines; the orchestrator receives the actionable boundaries, dependencies, decisions, and evidence needed to coordinate them. Architecture does not replace the orchestrator's scheduling and integration responsibilities.

One orchestrator handles one coherent implementation task, including its correction cycles. It does not become a permanent owner of unrelated work and is released after its final handoff. Its handoff records completed work, outstanding decisions, verification and review evidence, reusable research, and remaining limitations so the main conversation can close the task or establish a subsequent assignment with fresh agents.

The orchestrator escalates unresolved product requirements and scope changes to the main conversation rather than inventing requirements. Work dependent on an unanswered decision pauses; independent authorized work may continue. Changed contracts invalidate affected assignments and require an explicit update before dependent work resumes.

Direct implementation by the orchestrator, if supported, must have an explicit bounded write assignment and preserve the same production/test separation as specialist work. Coordination alone does not grant permission to edit another writer's files or rewrite tests to accept an implementation.

### Specialist Assessment Before Implementation

Every coding task begins with architecture triage. This is coding-architecture triage within the established system design; missing or changed system boundaries are referred to the system architecture planner before dependent implementation. The orchestrator asks the architecture agent whether the existing design is sufficient, architectural work is required, or a product decision is missing. Architecture identifies the relevant established contracts and initial boundaries, and recommends which model, view, controller, and test specialties should assess the task. The orchestrator does not independently decide that architecture input is unnecessary. Initial triage also identifies whether interaction decisions require UX planning. Where needed, the orchestrator assigns the UX planner before architecture completes the structural breakdown and before dependent production/test assessments. Purely internal changes may skip UX planning. Triage also identifies missing visual decisions for the [UI design agent](#ui-design-agent); reuse established visual patterns rather than requiring a new UI pass for every task. Existing product UX ideas and domain rationale are supplied as inputs, and consequential proposed changes return to the product owner through the main conversation.

The relevant production and test specialists then assess their own needs against the same behavioral acceptance criteria and initial architectural boundaries. Independent assessments may run concurrently; work that depends on an unresolved boundary waits for it. Each specialist returns:

- whether its specialty requires work, including an explicit no-work-needed outcome when appropriate;
- the proposed work and files or directories it would own;
- required interfaces, contracts, dependencies, and sequencing constraints;
- missing decisions, ambiguities, or risks; and
- verification needs and expected handoff evidence.

Assessment is a mode of each existing role, not a new agent type or permission to begin implementation. During assessment, specialists inspect and report; production, test, and shared-contract writes begin only after the orchestrator issues explicit ownership assignments. The assessment becomes a concise durable handoff. Release the assessing instance, then give a fresh implementation or test-authoring instance that handoff, its exact ownership assignment, and current source context. Do not retain a specialist thread merely to preserve investigation context.

The orchestrator combines these reports into an execution plan. Contract disagreements and structural questions return to architecture; unresolved product questions return through the orchestrator to the main conversation. Contracts and ownership are resolved before dependent implementation begins. A specialist that discovers an overlooked dependency can request another assessment rather than expanding its own assignment silently.

Specialist knowledge remains durable in the relevant standards, designs, and contracts. Specialists interpret and maintain that knowledge within their assigned authority; the orchestrator receives concise operational handoffs rather than loading every specialty's detailed implementation context. Implementers still receive the boundaries relevant to their work, and independent reviewers retain their existing scope and authority.

Assessment is proportional to the task. Architecture triage is always requested, but it may be brief; additional specialists are consulted only where relevant and may return no work needed. Changed requirements or contracts trigger reassessment of affected work rather than automatically repeating every assessment.

### Task Flow

1. The main conversation agent and engineer define the behavior and acceptance criteria, then the main conversation agent assigns that bounded task to a new coding orchestrator.
2. The orchestrator confirms the required bootstrapped opt-in and readiness, establishes the task baseline before any writer begins, and loads the applicable durable context and standards.
3. The orchestrator requests architecture triage, coordinates UX planning and product-owner decisions where interaction work is needed, then obtains the architectural breakdown and assessments from the relevant production and test specialists. Architecture identifies existing contracts or needed structural work; each specialty supplies its proposed scope, ownership, dependencies, questions, and verification needs. The orchestrator resolves the handoffs through the appropriate owners and stabilizes the shared contracts before dependent implementation starts.
4. The orchestrator turns the assessments into an execution plan and explicit production or test assignments. Each identifies its outcome, exact owned files or directories, interfaces, dependencies, verification requirements, and handoff evidence. Every shared file has one writer; assessment alone grants no implementation assignment.
5. Production and test authors receive the same behavioral acceptance criteria. They may work concurrently only when contracts are stable and ownership is disjoint; sequential work is valid when dependencies require it. Tests derive expected behavior from the agreed contract, even when their authors inspect production code.
6. The orchestrator integrates the changes, runs the relevant repository verification, and routes failures to their proper owner. A production defect returns to its production writer; a faulty test returns to its test writer; a structural ambiguity goes to architecture; an unresolved product decision goes to the main conversation. Neither writing side changes the other's artifacts to settle a disagreement.
7. At planned substantial stable boundaries, the orchestrator sends the combined review unit and evidence to the main conversation agent for the existing independent review workflow. It does not open a review cycle for each small implementation increment. The final integrated unit is always reviewed. Findings return through the orchestrator to the responsible writers; corrections receive the verification and refreshed review actually invalidated by those changes.
8. The orchestrator returns the integrated result, changed-file scope, verification results, validated review status, and limitations. The main conversation agent presents the result to the engineer and updates the durable product context for agreed decisions.

The exact task-contract format, progress reporting, interruption/resumption mechanics, and correction-loop limits remain feasibility decisions. A task must not be reported complete while required decisions, verification, or review remain unresolved. Checkpoint advice and Git actions retain their existing independent authorization rules.

## Proposed Agent Roles

### UX planning agent

The UX planner is a general product and interaction planning tool with two entry points, sharing one role contract and one guidance library:

- **Standalone planning:** the main conversation invokes it directly for early ideas, broad app divisions, requirements, existing specifications, or design alternatives. No coding task, architecture triage, coding orchestrator, repository, or implementation-agent opt-in is required for this advisory use. A rough pass may return activity areas, candidate workflows, recommendations, assumptions, and prioritized product questions rather than a complete implementation specification.
- **Coding-workflow planning:** the coding orchestrator requests focused planning when a task needs interaction decisions. Previously accepted planning artifacts are reused and refined only where needed before architectural decomposition and dependent work.

Standalone planning does not start coding, activate implementation agents, or claim implementation readiness. Its advice can be useful even if implementation is deferred indefinitely. Findings remain proposals until accepted; updating durable product documents follows the user's requested scope. Production and test writes remain outside this role. The owner retains domain and product decision authority in both entry points.

The assessment-only UX planner translates product intent into interaction specifications that drive architectural decomposition. It starts from the product owner's domain knowledge, concrete UX ideas, terminology, real workflows, constraints, and rationale. These are substantive design inputs, not suggestions to discard in favor of generic UX principles. The planner distinguishes domain facts, product constraints, interaction preferences, and assumptions without silently reclassifying the owner's intent.

The planner evaluates those inputs against relevant research and accessibility requirements using the dedicated [UX guidance reference](ux-guidance.md). It may propose refinements or alternatives, explaining the original intent, the specific concern, supporting evidence and its applicability, tradeoffs, and what remains uncertain. General research does not automatically outweigh domain expertise; a perceived conflict is a question to resolve with context, not permission to replace the product vision.

Consequential changes to product behavior, workflow, terminology, scope, or acceptance criteria return through the main conversation to the product owner. Unresolved choices remain explicit; dependent architecture and implementation wait for the required decision. The planner can refine details within agreed intent and delegated authority, but cannot silently overwrite agreed product decisions. Accepted product intent stays in the repository's human-owned product description; generated PRD material remains derived until accepted. Reusable guidance belongs in the global reference and must not generalize an unvalidated product choice into a universal rule.

The handoff includes user journeys, screens and semantic regions, interaction states and recovery behavior, observable acceptance criteria, relevant owner rationale, evidence-backed recommendations, hypotheses, and unresolved decisions. For a bounded implementation task, it also includes the explicit [UX-to-UI interface inventory](ux-planner.md#ux-to-ui-handoff): surfaces and their purposes, content and terminology, controls and availability, navigation/interaction behavior, and relevant states. Required presentation choices remain distinct from proposed solutions; consequential gaps are identified before dependent UI design or implementation. Early exploratory assessments may remain lighter. The UI designer uses this behavioral inventory to produce the detailed visual and accessibility handoff for the React/view coder. Architecture uses the agreed interaction specification to define major structural pieces and contracts; the View coder implements the agreed interface. Architecture can return feasibility constraints for UX reconsideration, with consequential product tradeoffs decided by the owner.

The guidance library must be curated before writing the planner's operating instructions. Its entries distinguish research findings, normative requirements, conventions, and product hypotheses, with sources, context, and limitations. An initial set of general sources has been evaluated in the reference; domain-specific evidence and remaining role preparation still require review. The owner has authorized formalization; the [role review](ux-planner-review.md) records the rule review, installation and validation limits. Its standalone advisory entry point must be independently available once defined; it does not depend on coding-orchestrator readiness or a repository implementation pilot.

### UI design agent

The owner authorized the installed assessment-only [ui-designer](ui-designer.md); see its [review and validation](ui-designer-review.md). It is a distinct advisory UI design specialty. UX planning owns user tasks, workflows, interaction behavior and recovery. UI design owns visual hierarchy and the presentation of those agreed interactions. The view coder implements the accepted design; the existing UI reviewer independently checks applicable standards. This role does not replace either one.

UI design covers margins, padding, spacing rhythm and density; alignment and sizing; typography roles, font size, weight and line height; text and surface colors; semantic and branding color roles; control grouping, placement and emphasis; visual states; and adaptation to window size, text expansion and zoom. Grouping and placement overlap UX when they change discoverability, sequence, availability or task meaning. Such changes return through the parent to UX and the owner rather than silently changing the interaction contract.

Decision: the UI designer is externally callable as a standalone planning tool, independently of the coding orchestrator. A user or calling agent can request a bounded assessment or visual specification through the same named `ui-designer` role and shared contract used by the coding workflow. No coding task, repository, implementation opt-in or prior UX-agent run is required. This defines an independent invocation entry point; it does not introduce an HTTP service or public API. Installation, live invocation, and bounded behavioral evaluation are complete.

Like UX planning, it accepts broad requirements, an existing visual design, or a bounded presentation question. No complete UX specification is required for provisional advice. It consumes owner preferences, domain needs, accepted interaction decisions, existing visual conventions and applicable standards. Preserve useful expert density and product identity; do not impose a generic aesthetic or treat invented branding as established. Concrete directions selected within its assigned authority become accepted working UI when incorporated; unselected alternatives and gaps remain distinct. Use available screenshots or rendered evidence for visual findings, and explicitly distinguish an assessment of a written specification from inspection of an actual interface.

The UI designer also owns accessibility design guidance: semantic control choices and accessible names, keyboard and focus behavior, reading/focus order, contrast and non-color state cues, text scaling and reflow, target sizing, and accessible feedback. Coordinate interaction-affecting recommendations with UX; the view coder implements them and the independent UI reviewer checks applicable requirements. Favor native controls and readily accessible technologies when otherwise comparable. Basic accessibility remains expected without a separate product requirement. Full accessibility equivalents for specialized app-specific surfaces require explicit scope unless applicable standards already require them; ordinary controls within those surfaces remain covered. Distinguish sourced best practices from mandatory criteria, identify the applicable conformance target when one exists, and never claim conformance from planning alone.

The output is a concise visual specification: region hierarchy, grouping and placement, spacing/density and typography roles, semantic colors and state treatment, adaptation behavior, accessibility recommendations and scope, relevant evidence, assumptions, owner questions and a handoff to the view coder. Selected values are accepted working UI within this role's authority, not universal standards; unselected alternatives remain proposed. Screenshots or comps are evidence rather than a prerequisite for early planning. The role remains read-only: it returns advice or bounded JSON, while the parent validates, persists, renders, and maintains authorized artifacts.

Applicable canonical styling rules remain authoritative: [CSS/layout ownership and variables](../../documentation/standards/code-conventions.md#markup-css-and-layout), [React layout ownership](../../documentation/standards/react.md#css-and-layout-ownership), and [MUI styling and branding](../../documentation/standards/mui.md#styling-responsibility). The role must carry these constraints into its handoff without duplicating them as a competing rule set. Accessibility requirements still apply to visual choices, including readable states and focus treatment; the agreed custom-interface scope distinction does not waive applicable obligations.

### App-Wide UI Foundations Proposal

Proposed capability: the UI designer can take supplied UX requirements, the interface inventory and representative workflows to recommend application-wide visual foundations and reusable UI patterns before individual-screen design. This is a planning scope of the same role, independently callable, not a new agent or an additional artifact format. Detailed UX for every screen is not required; distinguish common needs established by the supplied workflows from assumptions needing validation.

Inputs include user/domain needs, activity areas, recurring controls and surfaces, state/feedback requirements, intended devices/window sizes, accessibility scope, existing UI conventions and any owner-provided brand direction. Reuse accepted product choices and canonical engineering obligations. Missing brand direction is an owner question or clearly labeled option, not permission to invent the application's identity.

Output is a concise app-wide proposal covering:

- region hierarchy and layout conventions, alignment, spacing scale, padding, control density and adaptation rules;
- typography roles and coordinated values, semantic theme colors and app-owned branding roles;
- recurring control grouping, action emphasis, placement and component/pattern choices;
- consistent focus, selection, disabled, loading, empty, error and completion treatment;
- shared accessibility practices and relevant exceptions within the agreed scope; and
- examples applying the foundations to representative UX surfaces, alternatives/tradeoffs, gaps and owner decisions.

Trace recommendations to recurring UX needs and explain where a shared convention helps. Offer concrete values or bounded alternatives when supported, rather than a generic checklist. Prefer the existing theme and pattern vocabulary; do not create unused token families or a comprehensive design system for hypothetical future screens. Identify legitimate workflow-specific variation instead of forcing all surfaces into identical density or layout. Behavior-changing proposals return to UX and the owner.

Proposals become accepted app-wide design decisions only through owner agreement or explicitly delegated decision authority. The parent maintains accepted product-specific foundations in one durable application design reference, linked from subsequent UI specifications and React/view handoffs. Record affected screens and exceptions when foundations change; do not silently redesign existing work. Product tokens, visual identity and selected patterns belong in product context. Mandatory engineering-rule additions or replacements still use canonical standards or the repository overlay; this mode cannot create competing compliance rules in a product document.

Status: candidate planning capability recorded for role formalization; no app-wide defaults are selected and no separate implementation is installed.

### UI Implementation Handoff

When UI design is requested for implementation, the UI designer supplies the React/view agent with the details needed to code the assigned interface, rather than only general recommendations. The handoff includes:

- region hierarchy, alignment, control grouping and placement, sizing constraints, and scrolling/overflow ownership;
- concrete spacing, padding, typography and density decisions, referencing existing tokens or proposing named tokens and values where needed;
- semantic theme and branding color roles, borders and other visual treatments, without inventing unapproved product branding;
- relevant default, hover, focus, selected, disabled, loading, empty and error appearances, tied to the accepted UX interaction states;
- responsive/window-size and text-expansion behavior, including breakpoints or explicit adaptation conditions where needed;
- accessibility details such as semantic control intent, names, reading/focus order, keyboard/focus behavior, non-color cues and feedback, within the agreed scope; and
- observable visual/accessibility acceptance criteria, accepted decisions, assumptions and any blocking owner or UX questions.

Include only details relevant to the assigned scope and reuse established patterns. A standalone exploratory assessment can remain provisional; label an implementation handoff ready only when consequential design choices are resolved. The view coder should not have to invent missing product or visual decisions. It retains ownership of React component structure, CSS implementation, supported MUI APIs and technical implementation choices under applicable standards. It reports design gaps or feasibility conflicts through the parent for UI/UX clarification rather than silently redesigning the interface. Mockups may supplement the handoff but do not replace explicit behavior, state and sizing details.

Maintain complementary methods in the [compact sourced UI reference](ui-guidance.md), linked from the guidance catalog, with [research notes](ui-research.md) loaded on demand. Distinguish normative accessibility requirements, design-system conventions, empirical evidence and product choices. Research should favor primary sources; do not turn a particular system's spacing scale, type ramp or density into a universal rule. Track guidance deliberately through dated sources and revisions, not an unsolicited background research process.

Orchestration requests UI assessment only when visual decisions are missing or materially changing. Reuse accepted patterns for routine work. UX and UI may inform one another without requiring a serial full-app pass; resolve behavior-affecting proposals before dependent architecture or implementation. Pure visual refinements normally hand off to the view coder within established contracts, with architecture consulted only for structural implications. No UI agent is required for every coding task.

Product-development requirement updated 2026-09-20: static HTML UI renderings are implemented in `refine-design`; see the [structured rendering and reusable-template design](ui-rendering-design.md). The UI designer returns structured composition or component JSON and remains read-only. The parent validates, persists, and renders clean and annotated HTML comps from the same accepted inputs and design decisions. Templates define semantic HTML, supported parameters/states, resizing, token dependencies, and accessibility intent. SVG remains an asset format for icons and component-specific vector geometry rather than a scene format. The detailed UI specification remains the React/view agent's implementation handoff. A comp supports human review and does not by itself prove runtime behavior, accessibility, or implementation readiness.

The implemented comp contract includes an established control vocabulary and annotated design specifications. Use recognizable semantic controls by default, with stable names, expected behavior, and versioned template definitions. MUI-based designs are the selected initial focus for the skill's ordinary component library. Introduce specialized custom components deliberately, documenting their meaning, behavior, evidence, and exact template contract.

A comp should support human-readable callouts, dimension lines or legends for relevant design details:

- margins, padding, gaps, alignment, widths/heights, min/max sizing and layout constraints;
- font family, size, weight, line height, letter spacing and text-role names;
- foreground/background, border, focus, selection and status colors, with semantic token names and resolved values for the displayed theme;
- border widths, corner radii, shadows, icon dimensions and control hit areas where relevant; and
- shown state, viewport/reference size and units, with references to responsive or behavioral rules that cannot be represented by the static image.

Keep annotations distinct from the interface itself and legible without obscuring the composition. Link callouts to specific controls or regions; use a shared legend for repeated values. Clean and annotated HTML variants share one scene tree. Values must match the detailed UI specification and the represented state/theme; distinguish measurements, selected values, alternatives, and unresolved choices. Browser scaling does not change the intended CSS dimensions. The comp remains primarily for human review, and the separate React handoff supplies production behavior and implementation details.

### System architecture planning agent

Accepted [primary-source research](system-architecture-research.md) supports the compact [system architecture assessment rules](system-architecture-guidance.md). Load the rules as working guidance and consult research details only when needed. MongoDB is the owner-selected preferred database when database persistence is needed; the preference does not require a database or supersede accepted product file formats. SQLite material supplies only technology-independent storage questions; database-specific claims require MongoDB sources. These notes do not add canonical engineering requirements.

Decision: system architecture is a separate upstream planning responsibility. It establishes runtime/process topology, deployment shape, host capabilities, trust boundaries, cross-process communication, and major resource ownership. The Polylith coding architect designs features, services, registries, REMVC responsibilities, activation, and implementation contracts within those agreed boundaries.

System architecture is independently usable as an advisory planning tool, like UX planning, before or without a coding task. It does not require a coding orchestrator or repository implementation opt-in and does not authorize production/test writes. The owner subsequently authorized creation of this standalone role; see its [assessment contract](system-architect.md) and [completed preparation/validation record](system-architect-review.md). The broader coding workflow remains subject to its own gates.

UX and system architecture inform one another. Interaction needs can require technical capabilities, and technical constraints can expose UX/product tradeoffs. Consequential product decisions remain with the owner through the main conversation. The system planner returns the proposed or agreed runtime boundaries, external/host contracts, resource and failure responsibilities, rationale, constraints, and unresolved decisions; it does not prescribe the full feature or class decomposition.

The coding architect checks the existing system design during triage and requests system assessment through the orchestrator when required decisions are missing or a task changes those boundaries. Dependent work waits for required decisions; routine changes within an established system design do not require a new system-architecture pass. When the necessary decisions are settled, coding architecture translates the system contracts into app capabilities and specialist implementation work without silently changing the system design.

For a media application, system architecture owns where filesystem access and media processing run; coding architecture owns the Polylith services exposing those capabilities and the controllers consuming them. This illustrates responsibility, not a selected process topology.

### Architecture agent

The clarified name is Polylith coding architect, distinguishing this existing role from the system architect rather than adding another role. The owner requested an [initial assessment contract](polylith-architect.md) inferred from existing standards and designs, with [preparation and remaining information](polylith-architect-preparation.md). The assessment-only role is installed; unanswered design questions remain explicit inputs rather than implied decisions. This does not activate full orchestration or implementation.

The first architecture agent is explicitly Polylith-focused. Alternative architecture agents for other project shapes may be considered later, reusing shared architectural reasoning without inheriting inappropriate framework assumptions. The current architecture and REMVC standards contain framework-specific rules and are not yet a neutral core. Authoring techniques remain in the [Polylith-first guidance](coding-guidance.md#polylith-first-authoring-guidance), including [loadable workflow assessment](coding-guidance.md#loadables-for-distinct-workflows).

An implementation-capable architecture agent would own structural decisions and, when authorized, shared architectural code. Its responsibilities include:

- applying Polylith and REMVC standards;
- applying a possible future generic JavaScript architecture standard;
- defining feature and service boundaries, including assessing loadables for distinct workflows;
- preserving dependency direction and feature privacy;
- defining stable service, lifecycle, event, and contribution contracts;
- selecting direct service lookup, functional subregistry contribution, or event integration;
- defining application and installation registry topology and extension mechanisms;
- owning the shared structure and contract for repository deployment entry points;
- detecting responsibility growth and evaluating component splits;
- evaluating repeated implementations for a real shared abstraction;
- promoting shared components or services while preserving removability; and
- resolving contract disagreements escalated by production and test agents.

The architecture authoring role must remain distinct from the read-only architecture reviewer so implementation and review stay independent.

### Specialized production agents

Production authorship is divided among dedicated model, view, and controller agents. Feature colocation remains a filesystem and ownership-boundary rule: all three specialists work within the same bounded feature, but each receives only the context and files required for its REMVC responsibility. The parent and architecture agent stabilize their shared contracts before concurrent work.

Every production agent may read and run tests but must never create or modify tests, fixtures, mocks, snapshots, or test harnesses. It must not weaken tests to make its implementation pass.

#### Contract design ownership

Decision: specialists propose the behavioral contracts for capabilities they own. Contracts describe operations, inputs/results, failures, cancellation, ordering/concurrency, lifecycle assumptions, change notifications, and cleanup where relevant. Specify observable behavior sufficient for independent implementation and testing without prescribing every private method or implementation class.

User-visible failure, cancellation, recovery, retry, progress, and preservation of work are guided by the agreed UX specification and product intent. The UX planner helps develop missing interaction decisions with the product owner; specialists translate those decisions into technical guarantees and report feasibility constraints. Neither a technical convenience nor a failed operation implicitly decides what happens to the user's work. Distinguish a cancellation request from confirmed completion of cancellation, partial effects, and cleanup when those distinctions matter to the user. Consequential unresolved choices return to the product owner through the main conversation before dependent implementation.

Architecture resolves cross-feature contract boundaries and disagreements, using specialist proposals rather than independently designing every contract. The orchestrator coordinates the proposals and ensures dependent production and test work receives the same agreed contracts. Technical constraints that require a UX tradeoff return for UX/product resolution instead of silently changing the behavior.

#### State assessment ownership

Decision: the model agent leads state assessment. It identifies authoritative domain data, drafts and derived values, persistence, valid mutations, state lifetime, and change propagation. It distinguishes facts from projections or copies and reports unresolved product semantics rather than deciding them implicitly.

The controller agent contributes workflow and session state; the view agent contributes transient presentation state. The model agent coordinates the state assessment without absorbing those specialists' responsibilities. Architecture requests and uses the assessment to establish service boundaries and cross-feature contracts, resolving ownership where boundaries cross rather than independently designing every piece of state. The orchestrator coordinates the needed assessments before dependent assignments.

#### Model agent

The owner authorized creation of this role's assessment part. The installed [model-agent](model-agent.md) is read-only and follows the shared specialist handoff; [review and validation](model-agent-review.md) distinguish static readiness from live evaluation. The production responsibilities below define its assessment scope, not permission to implement.

The model agent owns the complete production model across client and server and understands how both sides interoperate. Its responsibilities include:

- domain concepts, invariants, state, and operations;
- client-side model services and server-side feature services;
- persistence behavior and schemas when the feature owns them;
- client/server transport contracts, validation boundaries, and data-shape conversion;
- exported service classes, required and optional service dependencies, and lifecycle integration;
- errors, concurrency, transaction, retry, and synchronization behavior owned by the model; and
- production types and documentation for the model contract.

It receives server, persistence, transport, data, and model standards applicable to its paths. The initial model specialty also understands Polylith registries, capability lookup, consumer-owned dependencies, feature activation/privacy, model-service boundaries, start/ready semantics and resource lifetimes, with contributions/loadables when relevant. Architecture retains structural/framework decisions; framework knowledge supports sound model integration. It does not receive React-specific implementation context and does not author JSX, hooks, presentation behavior, or controller orchestration.

#### View agent

Current assessment status: [view-agent](view-agent.md) is installed in read-only assessment mode. Its [review](view-agent-review.md) and [evaluation cases](view-agent-evaluation.md) record preparation and evidence. The production responsibilities below remain the intended future mode; this installed version cannot write code or join full orchestration without its separate gates.

The view agent is the only production implementation agent that understands and authors React-specific code. Its responsibilities include:

- React components, lifecycle, and view composition under the canonical class-first component rules;
- presentation state and derived display data;
- semantic user intentions emitted through the agreed controller contract;
- accessibility, localization, styling, responsive behavior, and UI-library usage when applicable;
- feature-owned reusable presentation components; and
- page or UI contributions through the applicable functional registry contract.

It receives React, UI, accessibility, localization, and presentation standards applicable to its paths. The initial view specialty also understands Polylith registries, view-service lifecycle, feature activation/privacy, controller mounting contracts, functional UI contributions and relevant loadables. It distinguishes app-lifetime services from mounted React instances and preserves asynchronous start/intentionally serial ready semantics. This knowledge does not permit React components to bypass controller/view boundaries or assume singleton teardown on unmount. It consumes accepted UX interaction decisions and UI visual specifications, as well as stable view/controller contracts and view-facing data without learning server, persistence, transport, or model implementation details.

React test tooling and rendered UI behavior belong to the dedicated UI test agent. The view agent remains the only production-writing agent that understands and modifies React production code.

#### Controller agent

The owner authorized creation of this role's assessment part. The installed [controller-agent](controller-agent.md) returns workflow transition and contract assessments; its [review](controller-agent-review.md) distinguishes static readiness from live evaluation. The responsibilities below establish assessment scope; no production-writing mode is installed.

The controller agent owns orchestration and understands how all services relevant to the feature are connected. Its responsibilities include:

- controller lifecycle, state transitions, and controller-to-controller handoffs;
- resolving app-owned services through the application registry and installation-specific services through the supplied installation registry;
- coordinating model operations with view-facing state and semantic view events;
- routing, loading, cancellation, retry, and error-flow orchestration;
- integration with application-shell services, events, and functional registries where orchestration owns the relationship;
- cleanup of subscriptions and lifecycle-owned integrations; and
- production types and documentation for controller contracts.

It receives controller, lifecycle, service-integration, and application-flow standards applicable to its paths. The initial controller agent understands Polylith registries, service lookup, executor/controller boundaries, feature activation/privacy, start/ready semantics, resource lifetimes, and relevant functional-contribution/loadable concepts. Framework knowledge is necessary to assess controller integration; architecture retains ownership of structural and framework changes. It does not own domain invariants, persistence, transport implementation, JSX, React hooks, or visual presentation.

#### Shared feature entry points and contracts

Feature registration, shared contract files, and other cross-specialty entry points require one explicit writer. By default the architecture agent owns their initial structure and final integration. Model, view, and controller agents may propose contract changes but do not concurrently edit a shared file unless the parent reassigns exclusive ownership. Individual services and contributions remain with the specialist that owns their behavior.

### Unit and service-integration test agent

The unit and service-integration test agent exclusively authors non-React test code for models, controllers, services, registries, and client/server boundaries. It owns:

- service, model, controller, and contract unit tests;
- feature registration and service-integration tests that do not render React;
- client/server contract and interoperability tests;
- test fixtures, mocks, fakes, and snapshots when justified;
- test-only application and installation registry construction; and
- assigned non-UI test harness code.

It may inspect production code but must never modify it. When a test exposes a defect, missing seam, or ambiguous contract, it reports the issue to the parent for assignment rather than changing production code.

Service and controller testing techniques are maintained in [Unit And Service-Integration Testing](coding-guidance.md#unit-and-service-integration-testing). The applicable canonical standards retain authority over required testing behavior; the production/test ownership boundary remains here.

### UI test agent

The UI test agent exclusively authors tests that require React and UI-specific expertise. It owns:

- React component and hook tests;
- rendered feature-view integration tests;
- semantic interaction and controller-event tests through public view contracts;
- accessibility, keyboard, focus, localization, responsive, and presentation-state tests;
- UI fixtures, render helpers, user-event helpers, and UI snapshots when justified; and
- assigned UI test harness code.

It may understand React internals and inspect view production code, but it never modifies production components, hooks, styles, controller code, or model code. It tests observable UI behavior and public contracts rather than duplicating component implementation. When it needs a production testability seam or finds ambiguous behavior, it reports the issue to the parent for assignment to the view, controller, or architecture agent.

Browser and full-application end-to-end testing may be an explicitly assigned mode of the UI test agent if the required tools and ownership are available. Performance, deployment, and other system verification remain outside both test agents' default scope.

### Polylith test-flow integration

Tests written by either test agent must participate in the standard test flow already used by the repository's Polylith applications and builds. Test agents must:

- place tests, fixtures, and helpers where the existing Polylith test configuration discovers them;
- use the repository's established runners, setup files, environment, and package scripts;
- update existing Polylith build or test manifests only when the normal test topology requires the new feature paths and the assignment grants ownership of those files;
- verify the new tests through the same standard commands used by developers and continuous integration;
- avoid standalone agent-only runners, alternate test trees, duplicate setup layers, or bespoke package scripts; and
- ensure excluding the relevant feature or build excludes its feature-specific tests in the same way as the existing application test flow.

If required coverage cannot be expressed through the current Polylith test flow, the test agent reports an infrastructure gap to the parent. It does not create a competing harness or change global test architecture without explicit architecture ownership and engineer authorization.

### Reuse or refactoring role

A continuously active utility agent is not currently recommended. It could create premature abstractions or repository-wide churn. Repetition should first be reported to the architecture agent. A later, explicitly invoked reuse/refactoring role might perform an approved extraction or promotion after ownership and contracts are settled.

### Early Review Scheduling

Decision: independent standards reviewers still run on agent-generated code and tests, but review is grouped around substantial stable chunks. The coding orchestrator plans those boundaries before implementation and does not request another review merely because a helper, file, narrow assignment, or reversible intermediate change is inspectable. A major chunk may finish before the whole feature; a small task may have only its final review.

During construction, use focused positive-path verification for the chunk's primary behavior. Consolidate negative, adversarial, boundary, rollback, and broad regression coverage during chunk finalization. Request the applicable independent review once that combined behavior and its tests are stable. An earlier focused review is reserved for a consequential architecture, public-contract, persistence, or security uncertainty that could invalidate substantial dependent work.

The main conversation continues to own reviewer lifecycle and execution through review-standards; the orchestrator requests reviews through it rather than creating another reviewer roster or bypassing evidence requirements. Review and test evidence is reused until affected work invalidates it. Unchanged suites and reviewer lanes are not repeated as a routine precaution.

Each review has an explicit scope and stable snapshot/context. Coordinate writes so reviewers do not assess moving content; unrelated, independently owned work may continue when the review protocol permits. Route findings promptly to the responsible writers and resolve blocking contract or structural findings before dependent work builds on them. Changed reviewed content requires refreshed evidence under the existing protocol.

An intermediate focused review does not certify unfinished work or replace final integrated review. Preserve the full task baseline and changed-path inventory, account for later changes and integration effects, and obtain the required final validated aggregate evidence. Passing type checks or tests never substitutes for reviewer evaluation.

### Existing review agents

The existing architecture, contracts, UI, verification, and privacy/security reviewers remain read-only and independent. They review generated code and tests at planned substantial stable boundaries and evaluate the final combined result. The verification reviewer does not replace either test-writing agent.

## Compatibility With The Review-Agent System

Any implementation-agent design must compose with the existing [review-agent design](../review-agents/design.md) and executable `review-standards` evidence-ledger protocol. Implementation agents produce changes; they do not select standards, narrow reviewer coverage, audit their own work, or certify compliance.

The following are compatibility invariants:

1. The parent records the task baseline, including the starting commit and initial staged, unstaged, and untracked state, before any implementation agent writes.
2. Every production, test, fixture, contract, generated, moved, deleted, and untracked path changed by an implementation agent enters the task review unit unless the engineer explicitly excludes pre-existing work.
3. Each path resolves standards independently through the repository's longest matching folder assignment, named standards set, canonical standards, and applicable overlay entries. Implementation prompts and agent-role definitions never copy or replace that authority.
4. Topics supply work context only. Neither implementation-agent selection nor task decomposition may use a topic to add, remove, or replace standards.
5. Implementation and test agents receive the standards applicable to their owned paths, but their claimed adherence is not review evidence.
6. The existing read-only reviewer lanes inspect planned substantial stable chunks and then evaluate the final combined repository change. The coding orchestrator determines timing, avoids review cycles for small incremental edits, and uses an earlier focused gate only for a consequential uncertainty that could invalidate dependent work. Reviewer coverage follows standards and paths, not implementation-agent ownership boundaries.
7. An architecture authoring agent is never the independent architecture reviewer for its own work. The same separation applies to both test-writing agents and the verification reviewer.
8. A passing test suite is useful verification evidence but never substitutes for the required standards evidence ledger, primary lane results, independent lane audits, or ledger validation.
9. Reviewer findings return to the parent, which assigns production findings to the owning architecture, model, view, or controller agent and test findings to the appropriate unit/service-integration or UI test agent. After corrections, affected lanes rerun against the new patch and context fingerprints.
10. A changed instruction, active work context, manifest, overlay, assigned canonical standard, file location, or review-unit path invalidates affected mappings and evidence. Affected writing pauses while the coding orchestrator requests the required context refresh from the main conversation agent, which remaps paths and refreshes affected reviewers through review-standards.
11. Implementation agents never alter reviewer ledgers, normalization attestations, standards manifests, standards overlays, or reviewer configuration merely to make a review pass unless the engineer has explicitly initiated the appropriate governance workflow.
12. Implementation-agent orchestration must not weaken normalization, formatting, reviewer-infrastructure, checkpoint, Git-write, or final-handoff rules already governing the repository.
13. Test evidence must come from the repository's standard Polylith test flow. An agent-only runner or command is not acceptable final verification evidence.
14. Review readiness does not imply implementation-agent authorization. The parent verifies the repository-root opt-in independently before every implementation workflow.
15. Bootstrap is the lifecycle authority for repository opt-in and session readiness. A task-time check confirms the bootstrapped state; it does not independently enable a repository that skipped bootstrap initialization.

The coding orchestrator supplies the task baseline, complete change scope, and verification evidence to the main conversation agent. The main conversation agent executes the existing review-standards workflow, owns reviewer lifecycle and ledger preparation/validation, and returns the validated aggregate state as clean, findings-present, incomplete, or blocked. Findings are routed back through the coding orchestrator. Neither an implementation specialist nor the coding orchestrator may substitute its own compliance judgment for that result.

## Architecture Handoff

Decision: the coding architect supplies a compact structural handoff to the orchestrator and relevant specialists, proportional to the task. Include:

- Scope and ownership boundaries: the capabilities being changed and the relevant agreed system/UX decisions.
- Specialist-agreed contracts and affected consumers: identify the known impact of proposed changes before implementation.
- Dependencies and sequence: decisions or contracts that must settle first and work that can proceed independently.
- Proposed specialist work: responsibility slices and shared files requiring an explicit writer.
- Verification and open decisions: relevant type checks, behavioral tests, framework gaps, and unresolved questions.

The architect proposes the structural breakdown. The orchestrator creates the actual assignments, controls exclusive file ownership, and schedules the work. A small change needs only a small handoff; do not manufacture artifacts or unrelated decisions to fill a template. Unresolved prerequisites block dependent work rather than disappearing from the handoff.

### Contract Change Impact Before Implementation

Decision: the specialist owning a proposed service-contract change identifies affected consumers and coordinates their updates before implementation. Architecture resolves impact crossing ownership boundaries; the orchestrator incorporates the agreed sequence and assignments. Preserve traceability from the changed JSDoc contract to affected consumers and verification needs.

JSDoc-backed type checking verifies structural compatibility across included consumers: changed parameters, result shapes, methods, and incompatible usage. It is a verification backstop, not the first planned discovery of a change's impact. Account for the actual check scope; unchecked consumers are not proven compatible. Behavioral tests cover changed meaning, failure/cancellation behavior, ordering, side effects, and lifecycle assumptions that types do not express. User-visible behavior remains guided by agreed UX.

## Ownership And Coordination Contract

The parent agent coordinates the workflow and owns integration decisions. Every writing assignment must identify exact owned files or directories and a bounded outcome. Concurrent writers must have disjoint ownership and must not revert or rewrite another agent's changes.

Production implementation and test authorship are intentionally separate:

> Production implementation agents never modify test artifacts. Unit/service-integration and UI test agents never modify production artifacts. Neither side resolves disagreement by changing the other side's evidence; the parent or architecture agent resolves ambiguity in the governing contract.

Shared contracts must stabilize before specialized production and test agents independently implement against them. All receive the same applicable acceptance criteria and durable authority, while each receives only its relevant production context and folder-mapped standards. Production agents may run tests, and the test agent may run the same tests, but their write boundaries remain separate.

The task flow is defined in [Conversation And Coding Orchestration](#conversation-and-coding-orchestration). Production and test work may run concurrently only when contracts are stable and their file ownership is disjoint.

## Deferred Decision: Private Collaborator Test Seams

Status: explicitly deferred by the product owner; must be resolved before implementation of the proposed coding-agent workflow or its pilot. Continue design discussion, but do not adopt an injection/factory convention or implement the proposed approach by assumption.

The higher-level architectural choice is accepted: decompose an owner into private implementation classes when those responsibilities need no independent application contract. Only construction and test-substitution details remain deferred.

Resolve this from current standards and portable synthetic examples. No external product implementation establishes the construction or substitution convention.

The concern is isolating a service's unit-test failures from substantial private implementation classes, while testing those classes independently and retaining meaningful integration coverage. Service-owned construction, especially lazy or per-operation creation, may require a mockable factory. Whether and when that is the right convention remains undecided.

Resolve the choice among injected instances, injected constructors/factories, and testing through the owner without an extra seam. Decide when substitution is warranted, production defaults and lifecycle ownership, the balance of isolated and real-collaborator tests, and how much construction detail belongs in the contract. These are options for evaluation, not accepted recommendations.

Review the existing provisions together: TESTING-042 and TESTING-044 through TESTING-049 in [testing standards](../../documentation/standards/testing.md#private-collaborators-and-test-seams), REMVC-008 in [REMVC](../../documentation/standards/remvc.md#registry), and CODE-CONVENTIONS-012 in [class/utility conventions](../../documentation/standards/code-conventions.md#classes-and-utilities). Reconcile any necessary canonical changes through the standards process before incorporating the decision into agent instructions. Existing standards remain in force; this record creates no new factory requirement or exception. Resolution requires an explicit owner decision recorded here and reflected in the guidance before the implementation gate is satisfied.

## Efficiency Evaluation Before Deployment

When authorized, evaluate the installed read-only specialties on unrelated synthetic assignments, then exercise combined architecture integration with explicit inputs and missing-role limits. See the [evaluation requirements](plan.md#evaluation-requirements). This does not substitute for later implementation efficiency comparisons.

Decision: evaluate credit consumption, elapsed time, and outcome quality before deploying the multi-agent workflow for routine use. The existing role-review and pilot authorization gates still apply; an authorized bounded evaluation may precede deployment. Do not require deployment to gather the evidence needed to approve deployment.

Compare at least one small task and one cross-specialty task against a single-agent baseline under comparable task, starting-state, verification, and review conditions. Report model/reasoning settings, total elapsed time, available token/credit usage, repeated context or investigation, assessment/review rounds, correction cycles, and defects found. Identify unavailable usage metrics rather than substituting invented estimates. Account for final integrated review, not just implementation time. Record quality and cost/time tradeoffs and resolve acceptable deployment criteria with the owner before routine rollout; no numerical threshold has yet been selected.

Scale participation to materially affected responsibilities. Retain required architecture triage but keep it brief when appropriate; reuse settled UX/system/state/contract decisions, retain specialists across assessment and implementation, and load focused context. Group ordinary review and broad testing at substantial stable chunk boundaries, use focused positive-path checks during construction, and consolidate negative cases during finalization. Parallelize independent work when its latency benefit justifies its extra cost; use sequencing when dependencies or reduced duplication favor it. Production/test separation, independent reviewers, and required evidence remain intact.

### Role-Specific Reasoning

Reasoning effort is configurable by role and assignment rather than uniformly high. Start with lower effort for narrow, well-specified responsibilities and increase it for consequential architectural choices, ambiguity, cross-boundary effects, or difficult diagnosis. A focused role is a candidate for lower effort, not proof that all its tasks are easy; reviewers also need enough effort for their actual coverage. Evaluate reasoning settings against correctness, missed issues, rework, credits, and elapsed time. Record initial settings and escalation criteria per role before deployment. Exact models and effort levels remain evaluation decisions; these notes do not change current runtime settings.

## Questions Reserved For Feasibility Review

- Which roles require custom global agent definitions versus ordinary bounded worker instances?
- Should the architecture agent write shared structure, advise the parent, or support both explicit modes?
- What durable task contract carries acceptance criteria, production/test file ownership, progress, questions, and evidence between the main conversation agent and the separately spawned coding orchestrator?
- Who owns each feature registration entry point and shared contract after initial architecture, and how do specialists request changes without concurrent edits?
- How should the parent prevent or detect cross-boundary writes?
- What correction-loop limits and escalation triggers apply, and how does the main conversation agent interrupt, resume, or replace a task orchestrator without losing ownership and evidence?
- What concrete assessment response format and relevance criteria keep architecture triage and specialist handoffs concise, and which assessments or implementation assignments may run concurrently?
- What model and reasoning settings provide acceptable quality and credit use for each role?
- Should successful standards bootstrap gate all implementation-agent use?
- What exact repository-root opt-in syntax should be canonical, and should it support a role allow-list in addition to enabled/disabled?
- Can `instructions-only` bootstrap ever coexist with explicit implementation-agent opt-in, or must those profiles be mutually exclusive?
- Should unit and non-UI service-integration testing remain modes of one agent or be split further?
- Which browser and full-application UI tests belong to the UI test agent, and which require a separate system-test role?
- How should cross-feature or cross-client/server work be partitioned without leaking feature knowledge?
- What alternate workflows offer most of the benefit with less orchestration cost?
- What snapshot and evidence-reuse mechanics support earliest-opportunity reviews without weakening the required ledger protocol or final integrated validation? Review timing is owned by the coding orchestrator; postponing all review until the end is not an option.
- What artifact records the prerequisite rule review, its scenarios, unresolved issues, and engineer approval for each role?
