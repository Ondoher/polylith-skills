# Product Documentation Separation Plan for Polylith Skills

Status: separation accepted; implementation pending. This repository owns the shared skill change; consuming products own only their migration notes.

## Accepted direction

Publish two linked product documents alongside the existing technical guide:

| Publication                          | Owns                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product Requirements                 | Goals, scope, product concepts, capabilities, rules, constraints, goal-level use cases, required outcomes, and acceptance criteria                    |
| Experience & Interface Specification | Application organization, detailed interactions, screen comps, state transitions, feedback, dialogs, recovery, and shared visual/component references |
| Technical Design                     | Architecture, contracts, processing, technology decisions, technical evidence, and unresolved implementation questions                                |

The PRD remains a detailed statement of required product behavior. Separation must
not reduce it to an overview. Use cases in the PRD describe goals, conditions,
outcomes, and meaningful alternatives. The experience specification elaborates
their interaction sequences and visuals through links to those same use cases.
Each rule has one authoritative home; related documents explain their own aspect
and link back rather than maintain duplicate requirements.

Present the publications as one navigable documentation collection. Readers can
move directly between related requirements, interface details, and technical
sections. Technical publication remains owned by `generate-technical`.

`generate-prd` owns publication planning for both product documents: grouping,
page boundaries, reading order, navigation, and cross-references. `refine-design`
owns product meaning and supplies the product, UX, and UI artifacts and their
relationships. It does not prescribe the publication page map.

## Adaptive organization

Organize around coherent product areas and user goals. Keep the steps, rules,
outcomes, and relevant visuals for an interaction close together. Shared visual
language and component catalogs are supporting experience references.

Choose page boundaries using content volume (including visual footprint),
independent subjects, use-case depth, reading continuity, cross-page jumps, and
duplication. Sparse content may fit on one page with distinct requirements and
experience sections. Developed content warrants separate publications with area
pages; substantial workflows may warrant subpages. Neither a fixed word limit nor
one page per schema category determines the structure.

Derive product areas from the supplied product relationships. The two publications can share area identities without requiring identical page trees. No product-specific page names or scope decisions belong in the generator.

Show missing coverage explicitly. Do not invent requirements, acceptance criteria,
interaction decisions, or comps to fill a document template. Avoid empty boilerplate
sections. Preserve useful page identities across small source changes.

## Document-structure agent

Accepted: add one `document-structure` agent, invoked by `generate-prd`, to plan
Product Requirements and Experience & Interface together. The skill owns the
publication workflow; the agent owns its bounded editorial planning task.
Technical-document structure remains outside the initial agent scope.

Inputs: the validated product, UX, and UI context with source identities,
relationships, scope, available comps/resources, and explicit gaps. Supply the
previous publication plan when available to preserve useful page identities.

Responsibilities:

- Allocate supplied content between the two publications and give each item one
  canonical home, with links from other relevant locations.
- Identify coherent product areas and user-goal groupings.
- Select single-page, multipage, or nested structures appropriate to the available
  detail, visual footprint, and reading continuity.
- Specify page purposes, section order, comp placement, navigation, and
  cross-references. Apply breadth-first locally and keep interactions complete.
- Identify missing coverage, unnecessary duplication, thin pages, and excessively
  large pages, with reasons for significant grouping and splitting decisions.

Output: a structured publication plan bound to the exact input context. Include
publication/page identities and hierarchy, each page's purpose, ordered sections,
source references and canonical content allocation, comp/resource placements,
cross-links, coverage gaps, and concise organizational rationale.

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

## Implementation sequence

1. **Inventory and map the current content.** Assign each requirement, use case,
   interaction, comp, shared reference, and unresolved question a canonical home.
   Record links across publications and identify source gaps separately from
   publication problems. Preserve the supplied product scope and explicit exclusions.
2. **Revise the shared skill contracts.** Update `generate-prd` instructions,
   context/publication contracts, and renderer responsibilities to allow bounded
   editorial planning from supplied data. Reconcile `refine-design` publication
   guidance so page organization is no longer upstream policy. Keep product
   interpretation and design decisions in refinement. Inspect both shared and
   standalone renderer copies so they remain consistent.
3. **Implement the document-structure agent and persisted plan.** Add the agent definition and managed catalog entry, wire invocation into `generate-prd`, and validate its structured output. Bind the plan to the exact input context.
   Record publication/page identities, headings, content references, ordering,
   links, coverage gaps, and the rationale for page splits. Planning may use
   semantic judgment; rendering the same context and saved plan must be
   deterministic. Define invalidation when source content changes.
4. **Implement the linked publications.** Render coherent area pages with inline
   relevant comps and state visuals, shared navigation, and direct cross-document
   links. Choose output paths and receipt ownership before implementation. Keep
   all generated documents under output-only `documents/`; authored inputs can
   come from any supported supplied location. Replacing product output must not
   erase the independently generated technical guide.
5. **Exercise small and detailed examples.** Verify a sparse input stays concise,
   a rich input gains useful pages, cross-area use cases retain continuity, and
   partial inputs expose gaps. Verify content preservation, canonical ownership,
   local links/assets, deterministic replay, and safe owned-output replacement.
   Use product-neutral fixtures to guard against product-specific generator policy.
6. **Republish a consuming product and inspect it.** Compare information coverage with current
   sources, inspect desktop reading flow and comp placement, and update the topic
   and publication records to point to the new documents and exact receipts.

## Completion criteria

- Both product publications have clear purposes and preserve all supplied,
  eligible information without competing copies of requirements.
- Readers can find required behavior, corresponding interactions/comps, and
  related technical explanations without traversing unrelated artifact catalogs.
- Sparse and detailed inputs produce appropriate page structures, with the
  generator owning those choices and recording their rationale.
- Use-case coverage and missing visual/behavioral detail are distinguishable;
  representative examples are not presented as complete coverage.
- The document-structure agent plans both publications together; its output passes source coverage, canonical ownership, resource, and link validation before rendering.
- Generated ownership, input binding, links, replay, and desktop presentation are
  verified before replacing the current publication.

## Research basis

This is a shared publication approach informed by complementary practices, not a
claim of conformance to a universal PRD template:

- [Atlassian: product requirements documents](https://www.atlassian.com/agile/product-management/requirements)
- [ISO/IEC/IEEE 29148: requirements engineering scope](https://www.iso.org/standard/72089.html)
- [Jacobson and Cockburn: Use-Case Foundation](https://alistaircockburn.com/Use%20Case%20Foundation.pdf)
- [Nielsen Norman Group: wireflows](https://www.nngroup.com/articles/wireflows/)

Next step: inventory the current content and propose its canonical allocation
before changing skill contracts or regenerating the documentation.

## Experience specification organization proposal

These rules elaborate breadth-first organization for the planned implementation:

- Introduce the application and its main areas before detailed interactions.
- Give each substantial area an overview of its layout, activities, and links to
  related areas; use an annotated main comp where supplied.
- Apply breadth-first locally: explain each scope before descending into its
  workflows. Do not collect all screens, then all workflows, then all states.
- Group detailed interactions by user goal. Keep normal steps, applicable rules,
  alternatives, cancellation, recovery, outcomes, and relevant visuals together.
- Give each page a clear subject: an area, substantial workflow, or shared reference.
  Keep small dialogs and brief behaviors inline with their owning workflow.
- Maintain a single definition of shared behavior, with contextual differences
  described at the point of use. Shared visual/component references support the
  main narrative rather than dictate its organization.
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
