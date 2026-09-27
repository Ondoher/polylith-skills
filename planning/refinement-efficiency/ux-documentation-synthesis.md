# UX information and product documentation: working synthesis

Recorded 2026-09-26. This captures the discussion following performance finding
PF-01, the industry-practice research, and the owner's two imported reference
documents. It is a basis for the next discussion about what to collect and
store versus what to present. It does not select a schema or implement a new
design or publication process.

Subsequent owner direction is captured in the [single-pass UX/UI method](single-pass-ux-ui.md).
It treats parsing and the facts-to-UX handoff as satisfactory and gives the next
concrete process: one authoring pass per design agent, optional linear issue
processing, assembly, and compact file-based handoffs supporting product and
later technical documentation. This synthesis remains the discussion background.

The imported documents are exploratory information, not decisions. Examples,
standards references, and assistant recommendations do not become accepted
product behavior merely by appearing in this note.

## 1. Problem and purpose

Two concerns meet here:

- **Refinement cost.** The first measured fresh Alexa refinement took 101.80
  minutes through a validated partial design context. The UX planner reported
  substantial effort expanding decisions into actions, states, frames, and graph
  records. The final UX artifact was 480,856 bytes. These observations motivate
  evaluating simpler authoring and storage; they do not isolate serialization
  cost or establish a speedup. `generate-prd` was not run in that measurement.
- **Publication quality and consistency.** Earlier generated material resembled
  a formatted information hierarchy. The owner wants a recognizable PRD and a
  detailed interaction document whose treatment remains consistent across runs
  and agents. The document-structure agent must retain responsibility for the
  information hierarchy and page breaks.

See the [performance findings](performance-findings.md) for measurements and
limits, and the [earlier publication design](../product-publication/document-design.md)
for the saved format exploration.

The current direction is to make product meaning explicit while leaving its
publication arrangement open. A simpler interaction description should support
design, review, UI composition, and publication without requiring each consumer
to reconstruct the same behavior.

## 2. Owner requirements and proposal status

| Subject                           | Status and meaning                                                                                                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two core documents                | The PRD describes product requirements; the interaction document describes application structure, flows, detailed use cases, and comps.                                                                                                              |
| Separate design-language document | A proposed third document, still to be settled. Shared visual material needs a consistent home whichever option is chosen.                                                                                                                           |
| Document organization             | Preserve the document-structure agent's inventory, information-hierarchy, and page-break process.                                                                                                                                                    |
| Publication-neutral input         | The organizing agent should receive information without an imposed document hierarchy. Product relationships may still be explicit.                                                                                                                  |
| Local interaction scope           | Use cases are associated with identified interaction objects, such as a form or editor. Supporting dialogs and reusable interactions can participate in the same task.                                                                               |
| Simpler UX model                  | The owner proposed major interface elements with named flows, linear steps, supporting-element references, and errors as alternate flows. The model is under discussion after an industry-practice check; its schema and migration are not selected. |
| Terminology                       | **Flow** is the working term for these local interaction descriptions. It has not yet replaced terms in current contracts.                                                                                                                           |
| Identity and numbering            | Internal references remain stable independently of the document hierarchy. External decimal section numbers follow the published hierarchy and may change when it is reorganized.                                                                    |
| Consecutive numbering             | Each document starts at `1`; every sibling sequence starts at `1` and has no gaps. HTML page breaks do not restart numbering. Action-step numbers are separate from section numbers.                                                                 |
| Resilience                        | Mark unusable or incomplete material for repair, preserve usable work, and continue independent work. If a branch cannot continue across or down, return to a usable ancestor. Show errors and actionable remediation in the output.                 |

The detailed resilience exploration is in [resilience.md](../product-publication/resilience.md).
Continuing means producing an honest partial result with repair needs, not
claiming that invalid data passed validation. Recovery must finish rather than
retry indefinitely.

## 3. Product relationships and reading structure

An unopinionated input still needs enough meaning for an agent to organize it.
For example, these are product facts or design decisions:

- A particular flow belongs to the Collection Editor.
- A step opens the shared Content Selector and receives selected items.
- A rule applies to several flows.
- A comp illustrates an element or a particular point in a flow.
- A flow realizes a requirement.

These are editorial decisions:

- The editor appears in a chapter about managing collections.
- Its simple flows remain on the overview page and a longer flow gets a page.
- The shared selector has one detailed explanation linked from several places.
- A section is displayed as `2.3.1` in this publication revision.

The same product information could support another useful reading arrangement
without changing ownership, behavior, or identity. An element association is a
semantic reference; it does not prescribe a chapter parent, physical record
nesting, or a page boundary. Step order, however, expresses the behavior of a
flow and must survive editorial reorganization.

The earlier suggestion to place every flow and exception beneath its element
is a useful possible reading pattern, not a mandatory publication hierarchy.
Likewise, the fixed chapter lists and detailed patterns in the earlier
publication proposal need reconciliation with this latest owner clarification
before becoming generator rules.

## 4. Candidate interaction description

The proposed model centers design work on a major interface element and the
goals people accomplish through it. A form, editor, panel, or dialog can be
such an element. Its identity and responsibility matter more than the number
of screens the task visits.

Candidate information to describe includes:

- **Element:** identity, name, purpose, relevant information and controls,
  surrounding application context, entry/exit behavior, and visual references.
- **Flow:** identity, goal-oriented name, associated major element, relevant
  starting conditions, ordered steps, and outcome.
- **Step:** user action or another relevant trigger, application response, and
  any supporting interaction or comp needed to explain it. Background completion
  is an application event, not an invented user action.
- **Supporting interaction:** what opens it, any relevant caller context, what
  result it supplies, and where the caller continues or exits. A local dialog
  need not become a separate reusable definition merely because it is a dialog.
- **Alternate flow:** the triggering condition or divergence point, its steps,
  and an explicit outcome or return to the primary flow. Errors, cancellation,
  and recovery fit here when relevant.
- **Shared rule:** behavior that applies in several places and can be defined
  once and referenced, with contextual effects explained where necessary.

This is a candidate information inventory, not a required-field list or storage
schema. Which items are authored, derived, retained, or displayed is the next
design question. Relevant source authority, decision status, and repair needs
must remain distinguishable throughout that work.

Flow goals describe what the user accomplishes. A heading such as **Add content
to a collection** explains the task more clearly than **Use the selector**.
The major element supplies local responsibility; supporting elements can
participate without truncating the goal at the first dialog boundary.

Linear descriptions do not require the product to force a wizard or one
exclusive order of independent actions. Meaningful choices and alternative
orders still need an accurate description where the product supports them.

### Conditions and shared behavior

Loading, empty, disabled, and unavailable conditions need an explanation where
they affect use. A condition such as **Save is unavailable while saving** can
be a concise rule alongside the relevant interaction. A failed save can have
an alternate flow describing the message, retained work, retry, and exit.

The proposal does not require separately authoring a state machine or node/edge
graph that repeats those descriptions. Any additional representation would need
a concrete consumer reason and an account of how it is derived or maintained.
Cross-area rules still need attention: local flow descriptions must preserve
effects on other workspaces and operations rather than hiding them.

## 5. Illustrative multi-step flow

This example illustrates the proposal only. It is not an Alexa requirement,
accepted product behavior, UI-agent design, or prescribed page layout.

**Associated element:** Collection Editor. **Flow:** Add content to a collection.
**Starting condition:** An editable collection is open.

| Step | User action or event                                       | Application response                                                  |
| ---- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| 1    | The user chooses **Add content**.                          | Open the shared Content Selector for this collection.                 |
| 2    | The user completes the selector's **Select content** flow. | Return selected items and show them in the editor's draft collection. |
| 3    | The user adjusts their order.                              | Update the displayed draft order.                                     |
| 4    | The user chooses **Save**.                                 | Show that saving is in progress and prevent duplicate submission.     |
| 5    | Saving succeeds.                                           | Confirm the saved result and keep the resulting collection visible.   |

**Cancel selection:** From the selector, the user cancels. It closes without
changing the editor's draft, and the user returns to the editor.

**Save fails:** At the save operation, show the failure and retain the draft.
The user can retry the save or return to editing. A retry rejoins the save
operation; it does not repeat selection or ordering.

The shared selector's internal actions can be described once in its own flow.
The caller describes its context, returned result, and continuation. References
to steps and elements should survive changes to reader-facing numbering; the
precise reference granularity remains a storage-design question.

## 6. What the imported references contribute

The owner supplied [UI documentation references](../../ref/ui_documentation_reference.md)
and a [PRD and interaction blueprint](../../ref/prd_interaction_blueprint.md).
They offer useful prompts for coverage, with some claims and examples that need
qualification.

| Imported idea                                | Candidate use in our work                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product context, purpose, users, and success | Help the PRD explain why requirements matter. Include actual known information; template blanks do not authorize invented personas, metrics, owners, or release dates. |
| Navigation and spatial context               | Explain where an element sits in the app, how users reach and leave it, and what remains visible around it.                                                            |
| Surface anatomy                              | Describe significant information, controls, and regions once. Do not require every element to have the example header/body/footer arrangement.                         |
| Action-and-response table                    | Make behavior readable step by step. Technical endpoints and backend operations need not be compulsory columns in the interaction document.                            |
| Visual references                            | Connect comps with the element, step, condition, or alternate they explain.                                                                                            |
| Shared component directory                   | Avoid repeated definitions. Distinguish reusable product interactions from ordinary visual components and from code implementation units.                              |
| Conditions and exceptions                    | Preserve their behavior while evaluating local rules and alternate flows as simpler ways to express it.                                                                |

The example API endpoints, colors, breakpoints, z-index values, loading
thresholds, validation behavior, and save/close/toast sequence are examples.
Each would require actual product or design authority before becoming part of
a specification. Known technical detail may be linked when it helps explain
behavior; authoring an interaction does not require inventing an implementation.

### Research findings and attribution corrections

- **Goal-oriented flows:** NN/G describes flows through user steps and system
  responses toward a specific product task. This supports the proposed scope;
  it does not require grouping every flow beneath a particular chapter.
  [User journeys and user flows](https://www.nngroup.com/articles/user-journeys-vs-user-flows/).
- **Task analysis:** NN/G describes learning how people accomplish goals and
  analyzing the tasks involved. It is broader than the imported guide's
  happy-path/exception-path characterization and does not prescribe that exact
  document template. [Task analysis](https://www.nngroup.com/articles/task-analysis/).
- **Behavior beside visuals:** NN/G's prototype-specification guidance addresses
  control behavior, availability conditions, and content alongside prototypes.
  Our inference is that comps and concise interaction descriptions can complement
  one another without a mandatory separate graph.
  [Prototype specifications](https://www.nngroup.com/articles/prototype-specifications/).
- **arc42:** Its building-block view describes static software decomposition;
  its runtime view describes scenarios and permits numbered natural-language
  steps among several notations. Borrowing the distinction between structure
  and behavior is useful; mapping these sections directly to UI panels is our
  adaptation. State machines are one option, not a required notation.
  [Building-block view](https://docs.arc42.org/section-5/),
  [runtime view](https://docs.arc42.org/section-6/).
- **C4:** Its containers are applications and data stores. C4 levels do not
  directly define a screen/panel hierarchy, and the imported claim of frequent
  adoption for UI specifications was not established by the sources checked.
  [C4 abstractions](https://c4model.com/abstractions).
- **ISO/IEC/IEEE 29148:** This is requirements-engineering guidance and a formal
  standard, distinct from the techniques and vendor guidance listed alongside
  it. The blueprint's attribution of section 5.1 to **User Requirements** is
  inaccurate for the 2018 edition: the official preview labels it **General**.
  The supplied blueprint should not be presented as a prescribed standard
  outline or evidence of conformance.
  [Official standard description](https://www.iso.org/standard/72089.html),
  [official preview](https://www.iso.org/obp/ui?_escaped_fragment_=iso:std:iso-iec-ieee:29148:ed-2:v1:en).
- **Figma:** Its design-system guidance supports shared components, variables,
  and conventions. That is useful precedent for reuse; the imported claim of
  perfect alignment to frontend code is not a guarantee for our artifacts.
  [Figma design systems](https://www.figma.com/design-systems/).

The [earlier industry-practice research](ux-flow-model-research.md) also records
IBM's textual use-case and reuse guidance, NN/G wireflows, and IFML as a formal
UI-modeling precedent. Its access limitations still apply. Those sources support
parts of the proposal without establishing one universal interaction-document
format or requiring adoption of their complete modeling machinery.

## 7. Candidate publication responsibilities

| Document                               | Reader's primary need                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| PRD                                    | Understand the problem, intended users, scope, requirements, constraints, acceptance, and success criteria where specified. |
| Interaction specification              | Understand app structure, major elements, how tasks unfold, alternatives, shared interactions, and associated comps.        |
| Design-language reference, if selected | Apply shared visual foundations, ordinary component conventions, and reusable presentation patterns consistently.           |

These responsibilities describe coverage and audience. They do not assign every
record to a fixed chapter or dictate page breaks. The existing technical guide
remains a separate concern.

Each published document should provide a readable explanation for its audience.
A PRD needs coherent requirement statements and context; exposing a raw inventory
with headings does not complete that work. Cross-links should provide deeper
detail while preserving a usable account within each document.

Comps can accompany an element or the particular interaction they clarify.
Their actual status and coverage matter: an illustrative or partial comp must
remain recognizable as such. Earlier hand-built publication samples did not
exercise the UI agent and cannot establish whether that agent retained MUI
conventions or product branding correctly.

Consistency can come from reusable content and presentation contracts: a flow
has a predictable treatment of its goal, sequence, outcome, and relevant
alternatives; a requirement has a recognizable statement and criteria. The
document-structure agent chooses grouping, reading sequence, hierarchy, and
page boundaries using those materials. Repeated runs should reuse a saved plan
unless changed content or feedback warrants revising it.

The proposed responsibility split is:

1. **Design stages establish product meaning:** requirements, elements, behavior,
   flows, shared rules, visual designs, and their relationships, with appropriate
   authority and review status.
2. **The document-structure agent establishes the reading structure:** first
   inventory the available information, then organize it and plan page breaks.
   Publication composition uses that plan to explain existing meaning.
3. **Rendering applies publication rules:** layout, continuous section numbering,
   resolved cross-references, visual placement, and visible repair notices.

The organizing or rendering stage must not silently redefine product behavior
to make a page look complete. Missing information remains a specific gap with
an appropriate repair path.

## 8. Performance implications to evaluate

The candidate efficiency improvement is to author each element and its flows
once, refer to shared material, and assemble consumer views afterward. This
could reduce repeated descriptions, manual expansion, oversized handoffs, and
the need to regenerate unaffected work.

Assembly can derive numbering, indexes, placement links, and other mechanical
details. Source interpretation, interaction design, reconciliation of shared
rules, and independent quality review still require their respective judgment.
A single source pass may be followed by bounded reconciliation of forward
references or cross-area constraints; “once” must not erase those dependencies.

The simple model should be evaluated with the actual UI, validation, review,
publication, and implementation-handoff consumers. Moving complexity into a
second manually maintained representation would not establish that the original
problem was solved. Current contracts remain authoritative until a coherent
migration is designed and implemented.

Use one saved element, a multi-step flow, a reused dialog, cancellation, and a
failure/retry alternate for an inexpensive local comparison. Check preservation
of product meaning, references, cross-area rules, and useful incomplete output.
No additional full paid refinement is needed merely to discuss this shape.
Performance or credit savings remain unmeasured until comparable evidence exists.

## 9. Next discussion: collection, storage, and presentation

The next pass should classify the information above before selecting fields or
changing schemas. For each information item, determine:

1. **Collection:** where it comes from, who establishes its meaning, and what
   evidence or decision supports it.
2. **Storage:** whether it needs durable identity, revision, relationships,
   provenance, or repair status, and whether it is authored or derived.
3. **Presentation:** which audiences need it, how it is explained, and which
   grouping, formatting, numbering, or navigation choices belong to publication.

Specific questions remain open:

- What is the smallest durable record set that serves the real consumers?
- Which parts of an element or flow need individual stable references?
- Which visual conditions need dedicated descriptions or comps, and which can
  be expressed through existing steps and shared conventions?
- How should supporting interactions express caller context and continuation
  without duplicating their own flows?
- Which coverage and presentation conventions should remain fixed while the
  structure agent is free to organize the material?
- Should design language become a separate document, and how is that choice
  retained across runs?
- How do partial records, unresolved references, and repairs pass through each
  stage without being mistaken for accepted design or stopping usable work?

This note preserves the discussion so that classification can be performed
explicitly. The inventory, example, and proposed responsibility split above
are inputs to that next step, not a completed storage or publication contract.
