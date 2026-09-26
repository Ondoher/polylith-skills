# Product publication: first-pass plan (historical)

Archived 2026-09-26. The [current correction plan](plan.md) supersedes the
variable-document-set direction and the deferred correction status below.
Retain this record for the original milestones, contract rationale, and failed
Alexa trial. The hierarchy and page-break agent process remains required.

Status: Milestone 6's Alexa publication trial failed owner review. The editor
image is a partial wireframe, not finished UI. The linked HTML is a
source-record catalog, not a usable PRD. Source coverage, bindings, links, and
repeat rendering passed their mechanical checks, but the visual and editorial
exit criteria were not met. The generated Alexa files remain trial output;
no correction approach has been selected yet.

The accepted [joint source inventory](m3-joint-inventory.md) and
[schema and link proposal](m3-schema-proposal.md) explain the milestone's
contract choices. The accepted Milestone 4 structure is the first publication
trial. Source-meaning or editorial changes require new exact bindings; there
is no old-data conversion path. Milestone 6 will replace obsolete-schema tests
and perform the grouped review and consuming-product publication check.

This is the maintained plan for the shared skill change. Consuming products own
their inputs, generated publications, and comparison notes.

## Working boundary

This plan keeps the shared skill product-neutral. Use Alexa early to inspect a
real agent-created outline, while deriving reusable rules from validated
context contracts, artifact relationships, and unrelated synthetic examples.
Alexa's page names, behaviors, and design choices must not become skill defaults.
Keep Alexa-specific trial outputs and comparison notes in its owning repository.

**Locked publication location:** generated reader-facing documents belong under
`documents/<product>/<doc-name>/`. Intermediate models, contexts, outlines,
reviews, and previews belong under `product/<product>/`. Authored descriptions
and papers retain their supplied locations, which may include `documentation/`.
Do not change the generated publication root without a new explicit owner
decision.

Leave a reviewable output at each milestone, with owner feedback at the planned
editorial checkpoints. Do not run reviewer agents for intermediate steps or each
artifact revision. Group implementation review at major milestones; the first
pass needs one grouped review after the publisher is assembled. During that pass,
add only focused positive-case tests for new behavior and run the checks needed
to keep each slice working. Defer a comprehensive test-generation pass,
including systematic failure cases, until after the first pass. This sequencing
reduces redundant credit use without treating early evidence as final
verification.

## Accepted direction

Publish a linked collection of product documents alongside the existing
technical guide. The `document-structure` agent chooses the number of product
documents, each document's purpose and scope, and the content it contains. A
sparse product may need one compact document; a developed product may need
several focused documents. The following are content responsibilities, not a
fixed document count or a prescribed set of titles:

| Content responsibility | Includes |
| --- | --- |
| Product requirements | Goals, scope, product concepts, capabilities, rules, constraints, goal-level use cases, required outcomes, and acceptance criteria |
| Experience and interface | Application organization, detailed interactions, screen comps, state transitions, feedback, dialogs, recovery, and shared visual/component references |
| Technical design | Architecture, contracts, processing, technology decisions, technical evidence, and unresolved implementation questions |

Requirements content remains a detailed statement of required product behavior,
whether it has its own document or shares one with experience content. Use cases
describe goals, conditions, outcomes, and meaningful alternatives. Experience
content elaborates interaction sequences and visuals and links to the governing
use cases. Each rule has one authoritative home; related locations explain their
own aspect and link back rather than maintain duplicate requirements.

Present the publications as one navigable documentation collection. Readers can
move directly between related requirements, interface details, and technical
sections. Technical publication remains owned by `generate-technical`.

`generate-prd` invokes the new `document-structure` agent to decide the product
collection's document count, identities, content allocation, grouping, page
boundaries, reading order, comp placement, navigation, and cross-references. The
skill validates and saves that plan, then renders from it. `refine-design` owns
product meaning and supplies validated product, UX, and UI artifacts and their
relationships. It does not decide document structure or persist a publication
page map. Its output format may change to give the new agent complete,
source-bound input. The new agent retains ownership of the inventory outline
and document organization.

Evaluate the product-model and UX formats together for more composable
semantic elements:
independently meaningful requirements, rules, goals, use cases, interactions,
states, visuals, complex shared components, shared definitions, and questions
with stable identities, status, provenance, and typed relationships. Preserve
coherent records rather than splitting every sentence. Do not encode document
sections, page order, or an information outline in those elements. The
publication agent remains free
to group and recombine them for different readers and later consumers.

The product model and accepted UX artifact are complementary semantic sources.
Product records own goals, requirements, rules, scope, and unresolved product
questions; UX records own accepted interaction behavior and its limits. Give
independently meaningful product facts their own stable identities and typed
links where the current capability narrative bundles them. Preserve the
human-owned description's source coverage and lineage when doing so. Make UX
use cases a flat catalog of identified user goals, with
explicit links among related use cases and to the semantic elements they use.
Give independently meaningful interaction steps, alternatives, decisions,
recovery paths, states, dialogs, feedback, and shared complex components stable
identities and typed relationships. Preserve the order and ownership of a flow
through those links, without making feature nesting, array position, or a
document hierarchy its meaning. Do not split every sentence into a record.
Link relevant product requirements and rules to their UX realization
explicitly, and link UI scenes and comps to the
exact UX elements they depict. The publication agent can then build a reading
path without treating the UX feature list as a mandatory table of contents. A
complex component used by several interactions keeps one source-bound behavior
and state account with links to each use, avoiding copied definitions.

`refine-design` is an upstream producer for documentation and, as those
workflows mature, implementation planning, code generation, and review. Its
canonical records and consumer contexts should expose accepted product meaning,
identity, relationships, evidence, and unresolved gaps in forms those later
stages can use. A downstream coverage problem may reveal a missing upstream
contract; improve that reusable source contract rather than forcing the
downstream stage to infer product facts or moving its editorial decisions into
refinement.
The composable product and UX graph should let an implementation planner select
a bounded user goal, find its governing requirements and dependencies, and
identify work that can be sequenced or shared. A coding agent should be able
to trace that same goal through actions, states, feedback, alternatives,
recovery, and UI evidence without treating a published page as the
specification. These sources describe product and interaction behavior;
technical architecture and implementation ownership remain separate decisions.

`refine-detail` has the same upstream obligation for linked, authored technical
white papers. It preserves their information, evidence, decisions, alternatives,
and open questions with exact source and revision bindings so later technical
documentation, planning, code generation, and review can use them. Its research
does not silently accept proposals as product or architecture decisions, and it
does not choose publication layout. Technical preparation maps paper claims and
questions into the appropriate downstream records; product-behavior changes
return to `refine-design` and the human-owned description. A downstream gap may
call for a paper revision or a stronger reusable handoff, with the paper's
information-preservation rules still applying.

## Adaptive organization

Organize around coherent product areas and user goals. Keep the steps, rules,
outcomes, and relevant visuals for an interaction close together. Shared visual
language and component catalogs are supporting experience references.

Choose document and page boundaries using content volume (including visual
footprint), independent subjects, use-case depth, reading continuity, cross-page
jumps, and duplication. Sparse content may fit in one short document. Developed
content may warrant several documents, area pages, or substantial workflow
subpages. Neither a fixed document count, word limit, nor one page per schema
category determines the structure. Each additional document needs a clear
audience, reader purpose, and enough related content to justify a separate
destination. A new document must be understandable on its own: it introduces
the product context, terms, scope, relevant behavior, and unresolved questions
its audience needs without requiring another document as a prerequisite.
Cross-document links can offer evidence or deeper detail, but cannot carry
essential explanation out of the document. If a subject cannot stand alone
without duplicating mutable authority, keep it as a page in the owning document.

The `document-structure` agent performs a scheduling pass over the reviewed
outline hierarchy. It assesses each node's relative weight from the amount of
source material, use-case and interaction depth, states and alternatives, visual
footprint, shared-reference load, and links across nodes. Raw JSON size or
source count alone is not a reading-load measure. The agent records why a node
is heavy or light, then chooses document entry points and pages. Independent
reader purpose supports a new document; depth within a coherent subject
supports linked pages. Strong continuity or cross-node dependencies can favor
keeping material together even when it is large. Weights inform the agent's
decision rather than impose fixed numeric split thresholds.

Page boundaries also establish a presentation pattern. When one child of an
outline node needs a page, consider giving its peer children pages as well so
readers encounter a consistent level of navigation and detail. A shared
overview can remain on the parent page. Keep a peer inline when it is only a
brief preface, belongs with another child's workflow, or would make an
unhelpfully thin page; record that exception rather than applying symmetry
mechanically.

There are two distinct ways to split. One document can have a single entry
point and several linked HTML pages, reducing the reading load of a large,
coherent subject. Separate documents create distinct entry points for subjects
or audiences that deserve independent orientation and navigation. Pages may
rely on their parent document's shared introduction; documents may not rely on
another document to become understandable. The agent may use both forms
together. Page volume alone is not a reason to create a new document, and a new
document should not be used merely to hide a long page.

Derive product areas from the supplied product relationships. Related documents
can share area identities without requiring identical page trees. No
product-specific page names or scope decisions belong in the generator.

Show missing coverage explicitly. Do not invent requirements, acceptance criteria,
interaction decisions, or comps to fill a document template. Avoid empty boilerplate
sections. Preserve useful page identities across small source changes.

## Document-structure agent

Accepted: add one `document-structure` agent, invoked during `generate-prd`, to
plan the complete product-document collection. The agent makes the editorial
decisions about document count, boundaries, and structure for the supplied
product; the skill owns invocation, validation, persistence, and deterministic
rendering. Technical-document structure remains outside the agent's scope.

The same agent may later be extended to plan technical-document format and
structure, but that is a separate decision after the product-facing workflow
has been evaluated. This first version consumes only product-publication inputs
and does not change `generate-technical`, its context, or its guide format.

Inputs: the validated product, UX, and UI context with source identities,
relationships, scope, available comps/resources, and explicit gaps. Supply the
previous publication plan when available to preserve useful page identities.

The agent itself first inventories the eligible product-specific content and
creates an information outline from it. That outline groups meaningful subjects
and their source-bound facts, rules, goals, use cases, interactions, visuals,
shared references, and gaps without deciding document or HTML-page boundaries.
Each eligible source item has an exact reference and one canonical outline
location; related outline locations link to it rather than copy its content.
`generate-prd` validates that the agent's outline covers the eligible sources
and preserves their relationships. Only then does the agent use its outline to
choose document entry points and the linked pages within each document. Neither
`refine-design` nor a preparatory planning step creates this outline.

Responsibilities:

- Inventory eligible source items and relationships in an information outline
  before proposing any document or page boundaries.
- Select the number, identity, audience, purpose, and scope of product documents,
  with a concise reason for each document's existence and standalone context.
- Explain why a subject remains one document with linked pages or becomes a
  separate document entry point; use both forms when warranted.
- Allocate supplied content across those documents and give each item one
  canonical home, with links from other relevant locations.
- Identify coherent product areas and user-goal groupings.
- Select single-page, multipage, or nested structures appropriate to the available
  detail, visual footprint, and reading continuity.
- Specify page purposes, section order, comp placement, navigation, and
  cross-references. Apply breadth-first locally and keep interactions complete.
- Identify missing coverage, unnecessary duplication, thin documents or pages,
  and excessively large ones, with reasons for significant grouping and
  splitting decisions.

Output: an agent-created, source-bound information outline followed by a
structured publication plan bound to the same exact context. The first
outline-only slice returns the outline for review without choosing documents or
pages. The later plan includes
an ordered, variable-length set of documents; stable document and page
identities and hierarchy; each document's and page's purpose; ordered sections;
source references and canonical content allocation; comp/resource placements;
cross-links, coverage gaps, and concise reasons for document and page splits.

The workflow supports inspection and revision of the outline and plan before
publication. Editorial feedback can name a missing outline relationship,
confusing document boundary, misplaced page break, or poor reading path; the
agent receives that feedback with the same exact context and prior output, then
proposes a revision. Validate every revision against the source again. Feedback
that changes product meaning returns to `refine-design`. Routine generation does
not require a separate human approval for each plan.

The agent organizes supplied information. It does not create or change product
requirements, acceptance criteria, interface behavior, visual designs, or technical
decisions. Report missing or conflicting information to refinement. It does not
render or write generated publications.

The publisher validates the returned plan's schema, source/resource references,
coverage, canonical ownership, and link targets before rendering. Invalid plans
return to the structure agent with diagnostics; unresolved source gaps remain
explicit. The renderer consumes the saved plan deterministically. Agent planning
is not claimed to reproduce identical choices on every fresh invocation.

Implementation includes the agent definition and its managed catalog entry in the
same change, following this repository's governance. No agent installation or
runtime invocation is performed by recording this plan.

## Milestones

Each numbered action leaves a source-bound artifact, a working slice, or a
validation result. The outline and navigation skeleton are deliberate editorial
review points; routine internal actions do not require separate review rounds.

### 1. Produce the first outline, using Alexa as a test example

Build the smallest `generate-prd` outline-only path that invokes the new
`document-structure` agent. Add its initial read-only definition and managed
catalog entry together. Establish the initial input and outline contract from
the shared validated context and a product-neutral synthetic example. Alexa is
the first real test of that contract and the first outline shown for editorial
review; its content does not define reusable agent behavior, schema fields, or
publication defaults. Immediately before the Alexa run, verify its exact
context, snapshot, and source bindings. If the source changed, obtain a fresh
validated context first.

The agent inventories the eligible context content and returns its
source-referenced information outline. `generate-prd` checks source coverage
and renders a readable outline without asking the agent for document or HTML
page boundaries. This first request stops at the outline so it can be reviewed;
the same agent makes document and page decisions in the next step using that
outline and feedback. The checkpoint does not limit the agent's later editorial
authority. Outline grouping expresses information relationships, not a draft
table of contents. Save the structured outline and Markdown review view under
Alexa's `product/Alexa/` support area, bound to the exact context identity.
Do not replace the current PRD or technical guide. Keep the trial's product
facts and outputs out of this shared skills repository.

Start with the existing context format. If its structure obscures necessary
source identity, relationships, accepted detail, or coverage, make the smallest
validated `refine-design` output change that supplies those inputs as reusable
source information, not as documentation layout fields. Express any deficiency
found through Alexa as a general source-contract need and check the fix on an
unrelated synthetic case before rerunning Alexa.
`refine-design` may package source data, but the new agent alone inventories and
outlines it. Refinement does not arrange documents. Mirror any shared context
validator changes in the publisher.

Intermediate steps:

1. Inspect the shared PRD context and artifact contracts. Define the minimum
   source references, relationships, and coverage checks using an unrelated
   synthetic input; leave product-specific grouping to the agent.
2. Add the read-only agent definition and managed catalog entry. Give it a
   bounded outline-only assignment and a closed response shape with exact
   source references.
3. Add the `generate-prd` outline-only path and minimal coverage validation.
   Run the synthetic input without planning a document.
4. Resolve Alexa's current PRD context against `product/Alexa/current.json`;
   record its context ID, snapshot digest, and source digest. If it lacks an
   accepted source type or relationship, make a generic `refine-design` output
   change, verify that change with a second unrelated synthetic case, and then
   resolve Alexa's context again.
5. Run the agent on the bound Alexa context. Save its structured result and a
   locally formatted Markdown view in Alexa's product support area, then show
   the outline and coverage summary for review.

**First reviewable artifact:** the agent's Alexa inventory outline, with source
references, visible gaps, and a short account of what was included or omitted.
Document organization comes in the next agent pass. Present the outline for
editorial review before implementing document splitting or a full renderer.
Structural validity alone does not make the outline useful.

### 2. Refine the outline and generalize its contract

Use feedback on the Alexa outline to improve the agent's grouping, terminology,
coverage, and treatment of open questions. Show what changed between outline
revisions and why. Preserve source facts and exact references; route a requested
product-behavior change back to `refine-design`. Give the agent the prior outline
and feedback for each revision, and validate coverage again.

After that first real review, record the reusable source-type and coverage rules
in a `source-contract-map.md` here. Check them against unrelated sparse and
developed synthetic contexts so Alexa's areas and language do not become
reusable defaults. This is a contract map for what the agent may read and what
the publisher can validate, not a developer-authored product outline. A complete
count of current source-index entries does not prove that each entry is
sufficiently composable or that the context retained every accepted source fact.

Intermediate steps:

1. Annotate the reviewed Alexa outline with specific missing, misplaced,
   duplicated, or unclear items, each tied to its source reference where one
   exists. Check whether important use-case alternatives, substantial UX
   substeps, dialogs, and recovery are visible at a useful outline depth rather
   than buried in one source line.
   Save this gap register as the first reviewable output.
2. Inventory complex interactions, dialogs, and reusable complex components in
   accepted product flows and current UX frames. For each substantive substep,
   dialog, or component, record its owning or invoking UX, whether it is shared,
   existing states and comps, and any decision still needed from the product
   owner. Classify each finding as hidden outline depth, incomplete source
   input, or an unresolved product decision. Do not invent behavior to fill a
   source gap.
3. For accepted complex interactions, dialogs, or shared components with
   incomplete UX detail or comps, run bounded `refine-design` cycles to develop
   their substantive substeps, meaningful states, cancellation and recovery,
   and corresponding comps. Persist the resulting artifacts and regenerate the
   bound PRD context.
   Keep behavior that depends on an unresolved product decision visibly open;
   it does not block work on accepted flows. Save the revised UX and comp
   coverage as a second reviewable output.
4. Inspect coarse or bundled context entries for independently meaningful
   facts that the agent cannot place or relate separately. Where justified,
   define a product-neutral, source-bound `refine-design` output change; keep
   editorial groups and publication order out of that contract. Check any
   change with unrelated synthetic input and regenerate the bound context.
   Check whether UX use cases, surfaces, actions, frames, and product
   requirements have explicit usable links; do not infer missing traces from
   similar labels or artifact-wide coverage alone.
5. Give the agent the exact current context, prior outline, and bounded
   feedback. Save the revised outline with a concise change account and recheck
   full coverage. Nest substantive substeps, including dialogs, within their
   owning UX so the interaction remains understandable as a whole. A complex
   component reused across flows may have a separate shared section describing
   its behavior, states, and comps. Link to its canonical section from each
   invoking flow, while retaining the context and effect of using it there.
   Apply the same single-home rule to shared dialogs or substeps. Save this as
   the third reviewable output.
6. Extract reusable source-type and coverage rules into
   `source-contract-map.md`, then check them against unrelated sparse and
   developed synthetic contexts. Revise the rules if they encode Alexa-specific
   names or divisions.

**Exit:** the reviewed Alexa outline is a usable working account of its current
validated context. Each accepted complex interaction exposes its substantive
substeps, including dialogs, nested under the owning UX or linked to a shared
home. A complex shared component has a separately referenced account when that
clarifies its reusable behavior. These subjects have meaningful-state comp
coverage or a specific source or product-decision gap. The product-neutral
contract map can explain and validate coverage without encoding Alexa-specific
content.

### 3. Make the product and UX sources independently composable

The current product model has stable records and source-claim coverage, but a
capability's description and outcome can bundle multiple requirements or rules.
The UX artifact already stores `useCases` in a top-level array, but steps and
alternatives are embedded in each case, and substantial component behavior can
remain undifferentiated text. The outline helper currently splits some nested
fields after publication. Improve both canonical handoffs together so later
documentation, planning, code generation, and review can identify and reuse
the same semantic parts without depending on the outline helper's extraction.
This is an upstream `refine-design` contract change, not a document-structure
decision. Preserve coherent records, source authority, accepted decisions,
stable identities, provenance, source-claim coverage, lineage, and locks.

Intermediate steps:

1. Inventory the product-model and UX schemas against the Alexa outline's
   compressed sources. Identify independently meaningful product requirements,
   rules, goals, constraints, and gaps, alongside UX goals, steps,
   alternatives, decisions, recovery, states, dialogs, shared components, and
   feedback. Record current IDs, source claims, links, and places where prose,
   array position, or similar names carry meaning. Use Alexa as a test case
   only. Save the joint inventory as the first reviewable artifact.
2. Propose one product-neutral relationship contract for both sources. Define
   which product facts deserve separate records and how they relate to
   capabilities and source claims. Keep a flat UX use-case catalog with typed
   links to related cases and ordered interaction elements; define how shared
   elements are invoked. Preserve meaningful records without splitting every
   sentence. Keep document sections, page order, and publication grouping out
   of both artifacts. Show a small graph and two contrasting synthetic examples
   before coding.
3. Define exact cross-artifact links from product authority to the UX behavior
   that realizes it and from UI scenes or comps to the UX states and
   interactions they depict. Distinguish a missing link from a missing product
   decision or a merely similar label. Specify identity, status, provenance,
   revision binding, and impact traversal for consumers.
4. Implement the selected product-model and UX schemas, validators, planner
   handoffs, persistence, context packaging, and outline-index changes in
   coordinated slices, starting with product authority. This is a greenfield
   contract replacement: derive fresh artifacts from human-owned descriptions
   and current decisions, with no old-data converter, compatibility reader,
   dual writer, or legacy context path. Preserve source-claim coverage and
   accepted meaning in that fresh derivation. Record missing relationships as
   gaps rather than fabricating them.
5. Run focused positive checks with sparse and developed unrelated synthetic
   inputs. Then regenerate Alexa's product model, UX, PRD context, and outline
   as a trial; compare source coverage, required behavior, flow ordering,
   shared-element reuse, and open questions with the prior bound outline.
   Save the comparison and new outline for one grouped milestone review.
6. Walk one bounded use case through implementation-planning and coding
   handoffs. Show its governing product requirements and rules, ordered UX
   actions and states, alternatives, recovery, shared dependencies, UI
   evidence, and unresolved gaps using IDs and links alone. Check that a change
   to one shared product or UX element identifies every affected use case.
   Record missing relations as source-contract gaps; do not assign classes,
   files, tickets, or architecture in either artifact.

**Exit:** a consumer can traverse product authority, the flat use-case catalog,
and their typed links to reconstruct accepted requirements, rules,
interactions, alternatives, recovery, shared elements, and UI evidence without
parsing narrative prose or inventing a document hierarchy. Bounded planning
and coding handoffs can use the same graph without silently inventing behavior.
The Alexa comparison shows retained meaning and reports source gaps explicitly.

### 4. Plan and review both forms of split

Using the reviewed outline from milestone 3, have the same agent first assess
the hierarchy's relative weight, then propose a variable-length set of document
entry points and the linked HTML-page hierarchy inside each one. The weight assessment is
the first reviewable artifact for this milestone and includes the factors and
rationale behind likely split points without fixing the split in advance.
Source-contract findings from milestone 3 can revise that input; do not freeze
document boundaries while a material source gap remains.
The plan names each document's audience, reader purpose, standalone context,
each page's subject, canonical content placement, comp placement, navigation,
cross-links, and reasons for choosing a new document versus another page in an
existing one. Bind the plan to the exact context and outline. A source or
outline change requires the appropriate revision rather than silent reuse.

Make the structure inspectable before full publication: present the plan and a
lightweight navigation/content skeleton that shows document entry points, page
links, headings, source coverage, and gaps. Iterate on editorial feedback with
Alexa as a concrete trial, then test transfer with a large coherent synthetic
subject that should remain one document with linked pages and with distinct
subjects that warrant separate document entry points. The agent may use both
forms in one collection.

Intermediate steps:

1. Give the agent the current outline and exact context. Ask it to assess
   relative weight at each hierarchy node, citing source depth, UX complexity,
   visuals, shared material, and cross-node relationships. Review this
   annotated outline before choosing boundaries.
2. Ask the same agent to schedule candidate document entry points from the
   weighted hierarchy. Require a named audience, independent reader purpose,
   needed standalone context, and a reason for each boundary or decision to
   keep a subject together.
3. Ask it to divide each document into one or more linked HTML pages where that
   reduces reading load while preserving a coherent document entry point.
   Compare sibling outline nodes together: once one becomes a page, evaluate
   peers for the same treatment and explain any inline exception.
4. Validate unique canonical placement, complete outline coverage, safe stable
   identities, UX use-case and interaction relationships, each document's
   standalone context, resource references, and local and cross-document link
   targets.
5. Render a navigation skeleton showing document entry points, page headings,
   key source references, and gaps. Inspect the consistency of sibling page
   treatment before rendering full prose or replacing any current output.
6. Feed structural feedback to the agent and compare its revised plan. Check
   the same planning contract on synthetic one-document/many-page and
   multiple-document cases.

**Exit:** readers can review the proposed reading paths and trace every eligible
outline item to one canonical destination or explicit gap. The agent can revise
a valid split without losing content or turning Alexa choices into fixed policy.

### 5. Complete the contract and publisher

Update `generate-prd` and `refine-design` guidance and the context/publication
contracts around the reviewed outline and plan. `refine-design` supplies
validated source material and may improve its context format, but does not make
the outline or publication structure. Define safe and stable document/page
identities, collection navigation, resource references, preview behavior,
receipt ownership, source-change invalidation, and replacement of the existing
combined PRD from fresh current inputs. Reconcile rendering helpers shared
with refinement and the standalone publisher so their source contracts do not
drift.

Render the agent-selected documents and linked HTML pages deterministically
from the saved context, outline, and plan. Keep relevant comps near their
interactions and direct links between related requirements, experience, and
available technical material. Generated product documents use
`documents/<product>/<doc-name>/`; `technical/` stays independently owned by
`generate-technical`. A changed plan may add or retire only receipt-owned
product outputs. Continue to reject unowned or modified generated output.

Intermediate steps:

1. Freeze the reviewed outline/plan schema and exact input binding, including
   rules for source changes, previous-plan reuse, and invalid revisions.
2. Set document/page path rules, collection navigation, resource ownership,
   receipt boundaries, and safe retirement of generated documents. Keep the
   independent technical destination outside these replacements.
3. Update the two skill contracts and reconcile shared rendering helpers. Keep
   source interpretation in refinement and all layout choices in the new agent.
4. Render a one-document, one-page case from the saved context, outline, and
   plan. Confirm its output is deterministic before adding more page shapes.
5. Add linked pages within one document, then distinct document entry points
   with collection navigation. Keep each addition driven by the saved plan.
6. Place supplied comps and local assets, produce a non-replacing preview, and
   record receipt ownership for every generated file.
7. Exercise safe replacement and retirement, inspect links and reading flow,
   and repeat the render. Correct renderer defects without silently changing
   the agent plan.

**Exit:** the full collection can be previewed and safely published. Links and
assets resolve, each generated file is receipt-owned, and a repeat render from
the same saved inputs is byte-stable. Replacing product output cannot erase the
technical guide or unrelated files.

### 6. Verify the first pass after the UI pass and republish a consuming product

During the first pass, add focused positive-case tests for outline coverage,
outline revision, one document with linked pages, multiple entry points, and
partial inputs. After the complete first pass, run the broader existing suite
and one grouped review of editorial quality, contracts, coverage, ownership,
links, replacement, and presentation. Record missing failure coverage for the
later comprehensive test-generation pass. After a current UI composition pass
has produced a source-bound context, publish in the authorized consuming
repository and compare the output with its current sources. Inspect
document boundaries,
desktop reading flow, inline comps, unresolved questions, and exact receipts.
Keep product-specific replacement evidence in that repository.

Intermediate steps:

1. Add focused positive-case checks as each slice lands: complete outline,
   revised outline, one document with linked pages, multiple entry points,
   partial content, and stable rendering.
2. Once the first pass is assembled, replace or remove obsolete-schema tests,
   fixtures, and reference files instead of adding compatibility code. Run the
   broader current-schema suite and one grouped review of content coverage,
   editorial quality, contracts, output ownership, links, and presentation.
3. Fix material findings and rerun the checks affected by those fixes. Record
   additional test cases for the later comprehensive pass.
4. Complete Alexa's current-schema UI pass before restarting its outline and
   structure proposal. The older export scenes are bound to UX/UI 0.2 and
   cannot be attached to UX 0.3 by matching names. Preserve them as design
   evidence while supplying current scenes and explicit gaps.
5. Republish Alexa from a freshly verified context, compare every eligible
   source item with its published home, inspect the desktop reading path, and
   record product-specific results and remaining gaps in Alexa's repository.

**Exit:** the completion criteria below are supported by product-neutral tests
and one real integration assessment. Resolve findings or record them as explicit
follow-up work before claiming the publication change complete.

## Completion criteria

- The first reviewable artifact is the new agent's Alexa inventory outline,
  with exact source references and no document or page organization proposal.
- The agent selects as many product documents as the supplied content warrants;
  each names an audience and stands alone for that reader, and the collection
  preserves all eligible information without competing copies of requirements.
- Readers can find required behavior, corresponding interactions/comps, and
  related technical explanations without traversing unrelated artifact catalogs.
- Sparse and detailed inputs produce appropriate document counts and page
  structures, with the `generate-prd` document-structure agent making and
  recording those choices.
- The agent's source-bound inventory outline is complete before either split
  is chosen; document entry points and within-document HTML pages have
  distinct, justified purposes.
- Use-case coverage and missing visual/behavioral detail are distinguishable;
  representative examples are not presented as complete coverage.
- The canonical product model and UX source expose independently meaningful
  product facts and a flat catalog of use cases, with stable, typed links among
  requirements, rules, interactions, shared elements, and UI depictions.
  Consumers need not extract those relationships from prose or array position.
- The document-structure agent plans the complete variable-length collection;
  its output passes source coverage, canonical ownership, resource, and link
  validation before rendering.
- Editorial feedback can improve the saved plan without changing source facts,
  and a preview makes the resulting reading structure inspectable before
  replacement.
- Generated ownership, input binding, links, replay, and desktop presentation are
  verified before replacing the current publication.

## Research basis

This is a shared publication approach informed by complementary practices, not a
claim of conformance to a universal PRD template:

- [Atlassian: product requirements documents](https://www.atlassian.com/agile/product-management/requirements)
- [ISO/IEC/IEEE 29148: requirements engineering scope](https://www.iso.org/standard/72089.html)
- [Jacobson and Cockburn: Use-Case Foundation](https://alistaircockburn.com/Use%20Case%20Foundation.pdf)
- [Nielsen Norman Group: wireflows](https://www.nngroup.com/articles/wireflows/)

Correction planning is deferred until the owner resumes it. Keep technical
output independently owned.

## Experience-content editorial heuristics

These are considerations for the document-structure agent wherever experience
content appears, not a required standalone document, fixed page map, or
`refine-design` output contract. The agent applies them where the supplied
content supports them and records a different organization when it serves the
reader better:

- Introduce the application and its main areas before detailed interactions.
- Where supplied, explain the shared shell's navigation, persistent controls,
  status, and workspace transitions before the area details. Show unresolved
  window-chrome choices as gaps rather than silently specifying them.
- Give each substantial area an overview of its layout, activities, and links to
  related areas; use an annotated main comp where supplied.
- Apply breadth-first locally: explain each scope before descending into its
  workflows. Do not collect all screens, then all workflows, then all states.
- Group detailed interactions by user goal. Keep normal steps, applicable rules,
  alternatives, cancellation, recovery, outcomes, and relevant visuals together.
- Nest substantive phases and substeps of a complex interaction within its
  owning UX section. Give dialogs the same treatment, with their meaningful
  states and supplied comps. If UX detail or comps are missing, show the gap
  rather than inventing them. Give a substep or dialog shared by several flows
  one common home and link to it from each invoking flow. A nested section
  does not automatically require a separate page.
- When a reusable component has substantial behavior or states, consider a
  separate shared UX section for its definition and comps. Link to it from each
  interaction that uses it, while explaining the component's role and effect
  in that interaction. A separate section need not be a separate page or
  document.
- Give each page a clear subject: an area, substantial workflow, or shared reference.
  A small dialog's section can stay on its owning workflow page.
- Maintain a single definition of shared behavior, with contextual differences
  described at the point of use. Shared visual and component references support
  the main narrative rather than dictate its organization.
- Preserve cross-area journeys as complete overviews linking to their detailed
  stages. Navigation boundaries must not fragment the user's story.
- Show a full-context comp first, followed by focused state or region visuals when
  available. Repeat a full-screen comp when the overall layout materially changes.
- Provide a predictable workflow sequence: goal and starting conditions, linked
  requirement/use case, normal steps and visuals, alternatives at their divergence
  points, resulting state, shared references, and unresolved questions.
- Check that overview pages explain the whole application and that one interaction
  can be understood without visiting unrelated pages.

Publication planning must distinguish accepted source facts from editorial
organization. Missing relationships or visuals remain explicit gaps, not invented
product decisions. These proposals are planning guidance until skill contracts
and renderers implement them.
