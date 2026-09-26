# Working with product-design skills

The product-design workflow turns human intent into durable requirements, interaction designs, visual specifications, and a published review document. You can start with a rough idea, refine one decision, or develop a complete design over several calls.

These skills own different parts of that work:

| Skill | Use it when | Main result |
| --- | --- | --- |
| [attach-detail](attach-detail.md) | An existing authored technical white paper needs a link from the product description. | One checked relative link in the human-owned description. |
| [refine-detail](refine-detail.md) | A linked white paper needs research, clarification, or an information-preserving revision. | An improved authored paper with sourced findings and a checked revision ledger. |
| [refine-design](refine-design.md) | You want to develop or revise product, UX, UI, or bounded architecture decisions. | Current product and design artifacts, with a context package ready for publication when requested. |
| [generate-prd](generate-prd.md) | The current UI pass and its source-bound publication context are ready. | A source-bound outline for review, or a deterministic HTML publication and integrity receipt. |
| [generate-technical](generate-technical.md) | Reconciled technical context is ready for developers and coding agents. | A linked Markdown architecture guide and publication receipt. |
| [reset-design](reset-design.md) | You explicitly want to discard the complete derived design and rebuild from the current human description. | A fresh product/design history, reset evidence, and optionally a new PRD. |

These skills plan and document a product. They do not implement its application code. Project scaffolding belongs to `initialize-project` and `create-app`; code compliance belongs to the separate [review-agent workflow](review-agents.md).

## Who participates

The **parent** in the flows below is the main assistant running the skill. It scopes the work, gives specialists their inputs, reconciles their findings, checks research, and operates validation, persistence, and rendering tools. It also asks you to resolve consequential choices that cannot responsibly be settled from the available evidence.

Specialists receive bounded assignments and return assessments or structured proposals. They do not write the product files, render the final artifacts, implement code, or independently commission other agents. Cross-specialty questions return through the parent.

| Agent or participant | Responsibility | Typical contribution |
| --- | --- | --- |
| Product owner | Intent, requirements, constraints, and explicit lock/reset authority | A description, correction, reference, unresolved choice, or instruction to protect a decision. |
| Parent assistant | Scope, semantic interpretation, specialist coordination, synthesis, and artifact operations | A current product model, validated design records, checked research, and an honest handoff. |
| `ux-planner` | Tasks, journeys, surfaces, actions, interaction states, feedback, cancellation, recovery, and removing unnecessary steps | A structured UX proposal and semantic wireframes describing what users can do and what happens. |
| `ux-reviewer` | Independent product-design review of the saved UX and requested scope | A `pass` or `revise` receipt covering coherence, action economy, recovery, accessibility baseline, research, and UI handoff. |
| `ui-designer` | Visual foundations, presentation, hierarchy, layout, component states, and visual accessibility | Structured design-language, whole-product composition, or specialized-component proposals. |
| `system-architect` | Runtime and host boundaries, storage, APIs, trust, resources, and failure tradeoffs | Technical feasibility, architectural options, and missing guarantees relevant to the requested decision. |
| `technical-researcher` | One linked technical paper and bounded ambiguous questions | Read-only primary-source findings, alternatives, evidence limits, and an advisory revision proposal. |
| `polylith-architect` | Feature, shared-capability, service, and registry boundaries when they matter | A provisional structural map tied to current product and repository evidence. |
| `model-agent` | Domain meaning, authoritative state, invariants, operations, and persistence/transport contracts | Read-only assessment of the guarantees the product or architecture needs. |
| `controller-agent` | Workflow coordination, sessions, races, cancellation/retry, resource ownership, and view-facing contracts | Read-only assessment of how operations and lifecycle transitions should be coordinated. |
| Independent UI-design assessment agent during reset | Qualitative review of fresh rendered surfaces and component states | A `pass` or `revise` assessment against the UI-design review contract, separate from the producing designer. |

The last row describes a fresh assessment assignment, not an additional installed role named `ui-designer-reviewer`. It uses the [UI-design assessment contract](../planning/implementation-agents/ui-designer-review.md). It is also distinct from `ui-reviewer`, the engineering standards reviewer.

`view-agent` exists in the wider toolkit but is not an automatic participant in refinement. The Polylith architect and technical researcher run only for their bounded structural or paper-research questions. Their availability alone does not authorize a coding workflow.

## What carries decisions between calls

Conversation history is not the durable design record. Repository-backed work persists its product-design data under `product/<name>/` at the repository root, regardless of where the source description is located.

### Establish the product name

`refine-design` reads the complete human description for a clear product name.
If it is missing or ambiguous, the skill asks you for it before saving any
product-design data. An explicit name already supplied in your current request
answers that question. It does not infer the name from the repository, topic,
source filename, or an example product.

The folder preserves a safe name's spaces and case: `Field Journal` becomes
`product/Field Journal/`. Unsafe names require an explicitly chosen portable
folder name, recorded alongside the display name. An existing human description
stays where it is; a new one normally lives in the named product folder.

```text
repository/
  documentation/product-description.md    # Existing human input can stay here
  product/
    Field Journal/
      current.json
      sources/
      models/
      snapshots/
      artifacts/
      artifact-resources/
      contexts/prd/<digest>/context.json
      ux/ux-spec.json
      design-language/design-language.json
      ui/ui-spec.json
      ui/components/
  documents/
    Field Journal/
      <selected-product-document>/       # Linked pages, comps, assets, and receipt
```

Generated product documentation uses repository-root
`documents/<product>/<doc-name>/`. The structure plan selects product document
names; each owns its linked pages, comps, and assets. Use the same confirmed
product folder name as the data store. Technical documents follow the same
location convention but have independent publication ownership.

The data root is also used for scoped planning, research, and review receipts.
A changed product name or pre-existing store elsewhere needs an explicit
identity/relocation decision rather than an automatic second store or reset.
Detached context packages and explicitly requested PRD exports remain portable.

```mermaid
flowchart LR
    H[Human product description] --> M[Versioned product model]
    M --> A[UX, UI, and other scoped artifacts]
    A --> C[Detached PRD context package]
    C --> P[Static HTML publication]
```

The description remains readable Markdown. The parent interprets it into a structured model with stable record identities, exact source snapshots, and explicit changes. Specialty artifacts reference the product decisions and other artifacts they depend on. Deterministic writers validate and store those decisions; they do not infer the meaning of prose.

This supports incremental work. A change to cancellation behavior can invalidate affected UX, UI, and controller advice without reopening unrelated typography. A wording-only change may require rebinding evidence without changing the material design. Prior artifacts remain auditable, while stale or locked-conflict payloads are excluded from downstream context.

| Decision state | What it means for you |
| --- | --- |
| Accepted working decision | A concrete choice has been incorporated. Ordinary refinement can revisit it; a separate approval click is not required for every selected specialist recommendation. |
| Unselected alternative or unresolved gap | No usable choice has been adopted. The workflow records the uncertainty instead of pretending the design is complete. |
| Locked decision | You explicitly protected a named scope. Ordinary refinement cannot change its content or dependency bindings without current authority for that scope. |
| Stale or locked-conflict artifact | An upstream change affects the artifact. It must be reassessed, or the lock conflict resolved, before dependent work can rely on it. |

A human edit to the description takes precedence over conflicting derived working choices. A lock conflict is reported and preserved rather than silently resolved. Only an explicit whole-design reset authorizes discarding the targeted accepted and locked derived history together.

## Refine a product: UX through UI

Use a request that identifies the product and the outcome you want:

```text
Use $refine-design product: develop documentation/product-description.md into
the main user workflows, reviewed UX, and representative UI compositions.
```

The following is the normal whole-product refinement flow: `refine-design` completes both UX and UI. A narrower call may stop after a specific product decision or UX revision, but dependent UI must be brought current before a PRD handoff. Refinement does not run every specialist simply because it is installed.

```mermaid
sequenceDiagram
    actor Owner
    participant Parent as Parent: refine-design
    participant Store as Validators and artifact store
    participant UX as Fresh ux-planner
    participant Review as Fresh ux-reviewer
    participant UI as Fresh ui-designer
    Owner->>Parent: Product description, requested scope, constraints
    opt Product name is unclear and not already supplied
        Parent->>Owner: What is the name of this product?
        Owner-->>Parent: Confirmed product name
    end
    Parent->>Parent: Resolve repository-root product/name directory
    Parent->>Store: Persist current semantic product model
    Parent->>UX: Bounded UX question and current authority
    UX-->>Parent: UX proposal, selected patterns, research, gaps
    Parent->>Parent: Reconcile intent and verify material sources
    Parent->>Store: Validate, persist, and replay exact UX
    Parent->>Review: Saved UX, exact description, scope, checked evidence
    Review-->>Parent: pass or revise
    alt revise or unavailable independent review
        Parent-->>Owner: Blocking findings or unavailable gate
        Note over Parent,Review: Revise UX, persist, and use a fresh review. Dependent UI stays gated.
    else validated pass
        Parent->>UI: Reviewed UX and current visual foundations
        UI-->>Parent: Composition proposal and any UX change requests
        Parent->>Store: Validate, persist, render, and inspect
        opt Specialized components required
            Parent->>UI: Fresh bounded component assignment
            UI-->>Parent: Component scenes, states, research, limits
            Parent->>Store: Validate and render component and owning surface
        end
        Parent->>Store: Package current artifacts and PRD context when requested
        Parent-->>Owner: Saved decisions, review output, gaps, next useful step
    end
```

The UX planner owns the interaction: task order, available actions, state transitions, feedback, cancellation, and recovery. It may research an unfamiliar pattern before selecting an adaptation. The parent checks material sources and reconciles the result with your intent before persistence. If selected behavior changes the human description, the product model and downstream bindings must be brought current as well.

The independent UX reviewer assesses the exact persisted candidate. A `revise` verdict returns findings to UX synthesis; correction requires new validation and a fresh review. A `pass` is bound to the description, UX bytes, and reviewed scope. Changing any of those makes the receipt stale. It is a readiness gate for dependent UI work, not proof of usability, accessibility conformance, or implementation correctness.

The UI designer works within that accepted interaction contract. It chooses geometry, hierarchy, typography, colors, and visual states. A proposed behavior change goes back through the parent to UX; a composition cannot silently add actions or redefine cancellation. Behavioral nodes are bound to the reviewed UX actions, and scenes reference exact interaction frames.

Specialized components use the UI designer's component mode. For unfamiliar or product-specific interfaces, it supplies research, alternatives, states, and an explicit account of what the rendering can represent. The parent checks sources and renders both the component and its owning surface. A labeled placeholder remains a partial wireframe; it is not promoted to a finished comp merely because HTML was generated.

### Refining visual foundations alone

You can establish a design language from a sparse brief without commissioning a complete application map:

```text
Use $refine-design to establish visual foundations from this brief, keeping
unresolved branding choices explicit and avoiding invented product screens.
```

```mermaid
flowchart TD
    O[Owner brief and existing visual decisions] --> P[Parent scopes visual-foundation work]
    P --> D[Fresh ui-designer: design-language proposal]
    D --> V[Parent checks normalization, research, and locks]
    V --> S[Validate and persist design language]
    S --> R[Render specimens, replay, and inspect]
    R --> H[Return foundations and explicit gaps]
    H --> C[Later composition combines foundations with independently reviewed UX]
```

Foundations cover application-wide color, typography, spacing, ordinary controls, and reusable patterns. They do not invent product behavior to fill out a component catalog. Product-specific surfaces and controls belong in compositions or component designs. Composition and component work dependent on UX still require the independent UX pass described above.

### Refining an architecture question

Architecture planning is a second scope within the same skill:

```text
Use $refine-design architecture: assess what guarantees are needed for an
export to continue after the user leaves the screen. Preserve accepted UX.
```

```mermaid
flowchart TD
    O[Accepted intent and bounded technical question] --> P[Parent selects relevant consultations]
    P --> S[system-architect: runtime, storage, trust, failure]
    P --> M[model-agent: state authority and operation guarantees]
    P --> C[controller-agent: sessions, cancellation, coordination]
    S --> R[Parent reconciles technical assessments]
    M --> R
    C --> R
    R --> Q{Does a product choice need resolution?}
    Q -->|Yes| U[Owner or bounded UX consultation through parent]
    U --> R
    Q -->|No| A[Persist scoped architecture advice and dependencies]
    A --> H[Handoff options, limits, and unresolved guarantees]
```

The branches are possible consultations, not three mandatory calls. Independent questions may run concurrently; a question that depends on another role's answer must wait. A technical assessment cannot silently decide whether users should be allowed to leave the screen or what cancellation promises them. Those choices belong to product/UX authority.

The default is one focused consultation round, usually one or two roles, with at most one targeted follow-up round unless your request calls for broader work. Zero consultations is appropriate for recording an explicit decision or reusing a still-current assessment. Specialists are fresh for each bounded assignment; durable records supply future context.

### Preparing and publishing a technical guide

The documentation path makes the architecture work durable and then publishes
it through a separate, deterministic skill. It starts from an accepted product
model and verified snapshot; the current source is inspected without requiring
a clean working tree. A real, current system-architect assessment is required.
The Polylith architect is consulted only when the structural mapping changes
the guide. The parent retains the report, reconciles recommendations within
accepted product intent, and routes product-visible choices back to the owner.

```mermaid
flowchart TD
    A[Verified product snapshot] --> B[Parent inspects relevant repository paths]
    B --> C[System architect assesses bounded boundaries and failures]
    C --> D{Does feature or registry mapping matter now?}
    D -->|Yes| E[Polylith architect gives provisional mapping]
    D -->|No| F[Parent reconciles advice and owner gaps]
    E --> F
    F --> G[refine-design commits technical artifact and freezes context]
    G --> H[generate-technical validates context and publishes linked Markdown]
```

The publisher calls no agents and does not reopen decisions. The normal output
is `documents/<product>/technical/`, with supporting records under
`product/<product>/`. See the [preparation contract](../skills/refine-design/references/technical-preparation.md)
and [publication guide](generate-technical.md). A deeper issue document can
follow the general guide when one boundary needs more evidence and contracts.

### Attaching a focused technical paper

The globally installed [attach-detail](attach-detail.md) skill makes one small
edit to the product description after an authored paper exists. It writes a
`White paper:` link whose target is relative to the description file, then
checks that the link resolves inside the product repository.

```mermaid
flowchart LR
    A[Owner names description and existing paper] --> B[attach-detail checks paper and product]
    B --> C[Add or correct one labeled relative link]
    C --> D[Verify link and report stale derived artifacts]
```

Attaching does not research the paper or accept its proposals as requirements.
The [paper-refinement flow](#develop-and-publish-a-focused-technical-paper) binds,
researches, and revises linked papers before technical publication.

### Availability and completion

When a named planner is unavailable, ordinary refinement can continue with honestly labeled `parent-assessment` work. The parent cannot substitute its own reread for an independent UX review: useful product and UX work may continue, while dependent UI remains gated.

The result should tell you what changed, where it was saved, what remains unresolved, and which evidence or capabilities were unavailable. A discussion-only request can return advice without creating files. A saved design is planning output, not an automatic implementation authorization.

## Outline and publish a PRD: no new product decisions

For a PRD request, refinement completes the UX pass and its independent review,
then the UI pass before this handoff. Once it has prepared a context
package with its UX, UI scenes, design language, and publication manifest:

```text
Use $generate-prd to inventory and plan the product documents from <context.json>.
```

```mermaid
sequenceDiagram
    actor Owner
    participant Parent as Parent: generate-prd
    participant Context as Detached context and resources
    participant Structure as Document-structure agent
    participant Publisher as Deterministic publisher
    participant Output as Product support or documents root
    Owner->>Parent: Current context path
    Parent->>Context: Locate complete package
    Parent->>Context: Verify current UI handoff and prepare source index
    Parent->>Structure: Ask for source-bound information grouping
    Structure-->>Parent: Outline with exact source references
    Parent->>Parent: Check complete unique coverage
    Parent->>Output: Save original outline for review
    Parent->>Structure: Assess weight and choose documents and pages
    Structure-->>Parent: Bound weights and structure plan
    Parent->>Output: Save navigation and page-marked outline
    Parent-->>Owner: Review reading paths and gaps
    Parent->>Publisher: Render exact context, outline, weights, and plan
    alt Preview
        Publisher->>Output: Create new support-directory preview
    else Publish
        Publisher->>Output: Replace only receipt-owned product documents
    end
    Publisher-->>Parent: Document receipts and result
    Parent-->>Owner: Output location and publication evidence
```

The outline-only path uses the read-only `document-structure` agent to inventory
the validated source information. Its first pass does not choose documents or
HTML pages. Its later pass assesses the outline and chooses standalone product
documents and linked pages. The publisher uses that exact reviewed plan; it
does not read the original Markdown, consult UX or UI agents, conduct product
research, or fill gaps. A publication request cannot resolve a design
disagreement.

The context package is self-contained. If moving it, copy its complete
directory, including `artifact-resources/` when present. A new preview goes
under `product/<name>/`; final generated documents go under
`documents/<name>/<doc-name>/`. Repeating the same bound inputs produces the
same generated bytes. Receipts inventory generated files and consumed
resources; they record integrity, not authenticated authorship. The technical
document remains independently owned.

Refinement may render bounded specimens and comps for inspection. Finish that
UI pass before starting the final PRD workflow. Its current scenes and explicit
coverage gaps become inputs to the document-structure agent. The final PRD
publication handoff belongs to `generate-prd`. Update structured source
decisions and republish instead of editing generated HTML.

## Reset a design: a fresh sequence with independent gates

A reset is an explicit decision to discard the target product's complete derived design, including accepted and locked derived artifacts:

```text
Use $reset-design to rebuild the complete design for <product-topic> from its
current product-description.md. Preserve the explicitly named owner resources
and include a new PRD.
```

Ordinary dissatisfaction with one component or a request to regenerate the PRD is not reset authority. Use refinement for those cases.

```mermaid
flowchart TD
    O[Explicit owner reset request] --> I[Parent verifies product scope and permitted inputs]
    I --> N[Resolve product name and canonical product/name destination]
    N --> P[Inventory derived roots and review digest-bound removal plan]
    P --> X[Purge derived design, including locks]
    X --> S[Clean staging, input manifest, new product model]
    S --> U[Fresh ux-planner]
    U --> V[Parent validates and persists fresh UX]
    V --> R[Independent fresh ux-reviewer]
    R -->|Revise| U
    R -->|Pass| D[Fresh ui-designer: visual foundations]
    D --> C[Fresh ui-designer: whole-product composition]
    C --> K[Fresh component-mode design for required specialized components]
    K --> T[Parent validates and renders scenes and component states]
    T --> Q[Independent UI-design assessment of rendered output]
    Q -->|Visual revision| C
    Q -->|Behavioral revision| U
    Q -->|Pass| A[New publication artifacts and detached context]
    A --> B{PRD requested?}
    B -->|Yes| G[generate-prd: publish and compare repeat output]
    B -->|No| H[Complete fresh design handoff]
    G --> H
    H --> F[Verify canonical outputs and save reset receipt]
```

Every design and review assignment receives only permitted starting inputs and fresh upstream artifacts from this run. A repeated stage uses fresh consultation context; it does not revive an old agent thread. Visual findings return to the relevant composition or component designer. Behavioral findings return through UX and require the affected downstream stages to run again.

The reset sequence has an additional explicit qualitative UI gate. A new independent UI-design assessment inspects clean and annotated renders with the exact fresh UX and visual foundations. It checks whether controls, hierarchy, density, labels, states, focus, and other details are credible implementation guidance. Structural schema validation alone does not satisfy that gate. Unresolved placeholders stay wireframes.

The parent records source and artifact hashes, actual agent identities, new research, review outcomes, render evidence, and final output locations. Completion includes required reviews, relevant browser inspection, and byte-stable repeat-publication evidence when publication is requested. Unavailable required specialists or independent reviewers leave the reset incomplete.

**The purge is irreversible and occurs before fresh design work.** There is no rollback copy of prior derived authority. If rebuilding fails, the old design remains absent and fresh failure evidence is retained. The current human description and eligible owner resources survive; application code, unrelated documentation, and external systems are outside the reset.

Fresh validated data returns to `product/<name>/`. If the human description or
preserved resources live inside that directory, the reset removes only verified
derived children, not the containing product folder. Other products under the
repository's `product/` directory are outside the reset scope.

The isolation claim is limited: the workflow controls supplied inputs and records their provenance, but the shared agent workspace does not provide an audited per-agent filesystem sandbox. Text already in the human description also remains input even if it originated in an earlier design discussion.

## Develop and publish a focused technical paper

Use [attach-detail](attach-detail.md) to register an existing authored paper in the human product description. Refresh the product model so the declaration is a document reference, then use [refine-detail](refine-detail.md) for a bounded research and revision cycle. The paper remains the sole editable document; source snapshots, research evidence, and revision ledgers live in the product support store. A linked paper may contain proposals and unresolved questions without changing product requirements or accepted architecture.

```mermaid
sequenceDiagram
    actor Owner
    participant Attach as attach-detail
    participant Parent as refine-detail parent
    participant Research as technical-researcher
    participant Store as Product support store
    participant Guide as Technical preparation and publisher
    Owner->>Attach: Identify an existing paper
    Attach->>Attach: Check target and add description link
    Attach-->>Owner: Link and product-model refresh needed
    Owner->>Parent: Focused paper question
    Parent->>Store: Verify reference and snapshot current paper
    Parent->>Research: Current paper, constraints, bounded questions
    Research-->>Parent: Sources, options, gaps, proposed revision
    Parent->>Parent: Check evidence and map all prior information
    Parent->>Store: Save research and revision ledger
    Parent->>Guide: Map paper claims and open questions to technical records
    Guide-->>Owner: Focused paper section and shared question register
```

The research role advises; the parent owns evidence checks and the edit. Consult the system architect for consequential runtime or trust boundaries and the Polylith architect for feature or registry placement. Reuse current assessments when their inputs still apply. Technical preparation maps the paper's claims into ordinary technical records and its open questions into the common gap register, reusing an existing question when it has the same meaning. `generate-technical` gives the paper a focused mapping page while also showing those gaps in the shared decisions and handoff pages. The authored paper links back to the general guide. A paper change calls for a scoped recheck of any guide section or other paper using its conclusions.

## Choose the next useful action

| Situation | Next action |
| --- | --- |
| You have rough notes or a new product idea | Start a bounded `refine-design product` request. |
| A workflow feels cumbersome | Refine that UX scope, then obtain a fresh independent UX review before updating dependent UI. |
| Colors, type, or ordinary control treatment need direction | Refine the design language; preserve product behavior. |
| A specialized control is still a labeled placeholder | Request component-mode design through refinement, including research and representative states. |
| A technical guarantee affects a product promise | Use a bounded architecture consultation and return product implications to their owner. |
| A technical issue needs a researched, authored treatment | Link the existing paper with `attach-detail`, then use `refine-detail` for one bounded question. |
| The current UI pass and its available scenes are ready to share as HTML | Resolve the current PRD context and invoke `generate-prd`. |
| An input change reaches a locked design | Identify the conflict and explicitly decide whether that named lock should change. |
| You want all derived choices reconsidered without old-design influence | Explicitly request `reset-design` for the complete named product scope. |

The design gates and engineering review gates serve different purposes. A UX pass or credible comp does not certify implementation compliance, and a standards-clean code review does not establish that the product design is useful. Use both at the stage where they can evaluate actual evidence.

[Refinement skill](refine-design.md) · [PRD publication](generate-prd.md) · [Design reset](reset-design.md) · [Engineering review agents](review-agents.md) · [All skills](../README.md)
