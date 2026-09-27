# Research: interface elements with linear interaction flows

Research date: 2026-09-26. Status: proposal under discussion. The owner requested
an industry-practice check before settling PF-01; this note does not approve a
schema migration or change any current product artifacts.

The later [working synthesis](ux-documentation-synthesis.md) incorporates the
owner's imported references and publication-neutral-input clarification. The
element-based grouping discussed below is a possible reading arrangement;
semantic association with an element does not prescribe document placement.

## Finding

The proposed linear flows, alternate error flows, and references to shared
behavior have strong precedent in use-case and interaction-design practice.
Grouping flows under major UI elements is a reasonable interaction-document
organization, but the sources do not prescribe that exact hierarchy. Keep each
flow centered on a user goal and allow it to visit supporting elements.
This is our synthesis, not certification against a document-format standard.

## Evidence

**Textual sequences and error alternatives.** IBM's use-case specification
outline describes a primary flow, alternatives including failures, starting
conditions, and outcomes. It also requires clarity about information exchanged.
This supports ordered interaction steps and named error paths without requiring
our existing node/edge JSON. IBM positions this as a sample outline, not a
mandatory universal template. [IBM: Use case specification outline](https://www.ibm.com/docs/en/engineering-lifecycle-management-suite/doors-next/7.2.0?topic=cases-use-case-specification-outline).

**Goal-based scope.** Nielsen Norman Group describes user flows as specific
interactions that accomplish a task within a product. The task can involve
several screens. Our inference: an editor or form can provide a flow's home in
the document, while its goal and completion determine the behavioral scope.
[NN/g: User Journeys vs. User Flows](https://www.nngroup.com/articles/user-journeys-vs-user-flows/).

**Interface-oriented specifications.** NN/g's wireflow guidance combines screen
design with interaction sequences, especially for applications whose screens
change dynamically. That supports connecting flows to dialogs, forms, and comps.
Its suggested visual artifact does not prescribe our data storage model or prove
that all interactions should have one compulsory graphical representation.
[NN/g: Wireflows](https://www.nngroup.com/articles/wireflows/).

**Reuse.** IBM's explanation of UML inclusion explicitly supports factoring shared
behavior into a separately defined use case. Referencing a reusable content
selection interaction follows that principle. Mapping it to a reusable dialog
is our UI-specification adaptation; we need not introduce UML terminology or
claim that every dialog reference is formally a UML include relationship.
[IBM: Include relationships](https://www.ibm.com/docs/en/dma?topic=diagrams-include-relationships).

**A formal precedent for UI composition.** OMG's Interaction Flow Modeling
Language (IFML) is a formal visual modeling standard for front-end content,
interface composition, interaction, and control. Its authors' primer describes
view containers, components such as forms, and their input/output parameters.
This establishes precedent for modeling interaction around identified interface
elements. It does not establish that our simpler textual proposal conforms to
IFML or should adopt its full machinery.
[OMG: IFML overview](https://www.omg.org/ifml/),
[IFML authors: Primer](https://www.ifml.org/ifml-primer/).

## Important distinction

Traditional requirements use cases and UI interaction specifications serve
different purposes. IBM's outline keeps presentation details out of requirements
use cases; our proposed document explicitly describes interaction with UI
elements. Calling its entries **flows** fits that purpose. The PRD can retain
goal/requirement descriptions linked to those flows. This recommendation follows
the distinction in the [IBM outline](https://www.ibm.com/docs/en/engineering-lifecycle-management-suite/doors-next/7.2.0?topic=cases-use-case-specification-outline)
and the screen-oriented [NN/g wireflow guidance](https://www.nngroup.com/articles/wireflows/).

Error handling can be an alternate flow, but the text still needs to say what
the user sees, what remains available, and whether work is retained. Loading,
empty, and disabled conditions also need a description where relevant; they
need not become a separate graph. NN/g's prototype-specification guidance
explicitly calls for explanations of responses and control availability.
[NN/g: Prototype specifications](https://www.nngroup.com/articles/prototype-specifications/).

## Candidate form to discuss

Keep the proposed structure lightweight:

1. **Major interface element:** purpose, relevant information, and links to its flows.
2. **Flow:** goal-oriented name and any necessary starting condition.
3. **Linear steps:** user action and visible application response.
4. **Supporting elements:** reference to a dialog or shared interaction, with
   its result and the caller's continuation when relevant.
5. **Alternate flows:** triggering condition, steps, and an explicit outcome
   or return to a primary-flow step.

Treat the major element as the flow's semantic home without prescribing its
document location or truncating the user's task. Document shared rules once.
Keep internal references stable as
reader-facing numbering changes. Comps may attach to an element or a relevant
step. Those are proposed adaptations for this project, not additional claims
about what the sources require.

The research supports evaluating this model for the interaction document. It
does not prove the proposed schema's completeness, migration safety, or speed.
One saved element with a main flow, error alternate, and reused dialog should
be sufficient for the next local comparison before committing to a migration.

## Access and scope limits

The NN/g pages, OMG IFML overview, and IFML primer were opened directly. IBM's
official documentation was available through search-indexed text; direct page
opens failed in this session. The IREB handbook redirected to a login page,
and the current UML specification PDF could not be opened; neither is used to
assert detailed normative requirements here. No claim of a single universal
UX document standard, mandatory diagram, or formal conformance is made.
