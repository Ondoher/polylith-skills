# Product-document research

Researched 2026-09-26 for the shared publication workflow. The owner clarified: the required publications are a PRD and a detailed
interaction document with use cases, flows, and comps. A separate design-language
document is under consideration. This research informs the proposed
[document design](document-design.md) and [implementation plan](plan.md).

## Findings and their application

### A PRD gives readers a product argument and explicit requirements

Atlassian recommends a consistent team template, with project context, objectives,
background, assumptions, user stories, design links, questions, and exclusions.
Its article also allows teams to adapt the format. We adopt the content concerns;
the owner's need for repeatability calls for a more stable publication contract
than the article prescribes. [Atlassian: product requirements](https://www.atlassian.com/agile/product-management/requirements).

**Application here:** lead with the problem, intended users, outcomes, and scope.
Then explain required behavior by product area. Put requirements in complete
sentences with visible acceptance criteria and meaningful identifiers. Link to
detailed interactions. Do not make source-record types the reading sequence.

### Requirements need clarity, verification, and an identifiable source

NASA's requirements guidance emphasizes singular, clear, testable statements,
consistent terminology, explicit unresolved information, and traceability. Its
verification-matrix guidance connects each requirement identifier to its source
and verification approach. These are useful writing disciplines; adopting them
does not make this project a NASA process or impose its formal language.
[NASA: writing requirements](https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/),
[NASA: verification matrix](https://www.nasa.gov/reference/appendix-d-requirements-verification-matrix/).

**Application here:** show a readable requirement, its rationale when supplied,
and the observable condition for acceptance. Keep the technical source pointer
in a secondary disclosure. Never manufacture metrics, priorities, release dates,
owners, or acceptance criteria because a template has a slot for them. A missing
criterion remains an explicit gap.

SEBoK separately describes requirement attributes such as rationale, source,
verification criteria, status, and priority. These attributes help interpret and
manage requirements, but are not the complete document.
[SEBoK: system requirements definition](https://sebokwiki.org/wiki/System_Requirements_Definition).

**Application here:** metadata supports the requirement's explanation. It should
not dominate the page or become a generic field/value rendering of the source.

### Use cases tell a complete goal-oriented story

Jacobson and Cockburn describe a use case in terms of an actor, a goal, and the
scenarios through which the goal succeeds or fails. Their foundation distinguishes
the basic scenario from extensions and identifies the places where an extension
leaves or rejoins the main path. It prioritizes readability and allows detail to
vary with the situation. [Use-Case Foundation, version 1.1](https://alistaircockburn.com/Use%20Case%20Foundation.pdf).

**Application here:** use a repeatable interaction chapter: goal and entry
conditions, main sequence, branches at named steps, cancellation and recovery,
and end states. Keep each substantial user goal together. A click inventory or
a collection of disconnected screens cannot substitute for this chapter.

### Show the interface in the context of the flow

Nielsen Norman Group describes wireflows as a combination of screen layouts and
flow diagrams. They show the action target and the resulting screen or state,
including feedback within a screen. For desktop applications, a focused crop can
show a change without repeating an entire screen at every step. Wireflows can be
low or high fidelity; a flow diagram alone does not demonstrate finished UI.
[NN/g: wireflows](https://www.nngroup.com/articles/wireflows/).

**Application here:** orient readers with a full comp, then place state-specific
visuals beside the steps and branches they explain. Include captions, triggering
actions, outcomes, and full-size access. Show the visual's actual fidelity and
coverage. Do not label a wireframe as a finished comp.

### Shared visual rules can have their own reference

The GOV.UK Design System distinguishes styles, reusable components, and task
patterns. That separation is evidence for different levels of documentation,
not a requirement to replicate its complete catalog.
[GOV.UK Design System](https://design-system.service.gov.uk/).

**Application here:** propose a third, supporting Design language document. It
would give shared visual decisions and ordinary component specimens a stable
home. Product-specific flows and specialized interaction behavior stay in the
interaction guide. The current local design-language contract already separates
these concerns; reuse its source rather than creating another visual authority.
See [current design-language scope](../../skills/refine-design/references/design-language.md)
and [the earlier accepted content study](../implementation-agents/design-language-content-research.md).

## Why the first implementation failed this reading model

The current [collection renderer](../../skills/generate-prd/scripts/product-collection.mjs)
uses `renderSource` to expose selected source fields, raw source identities, and
a JSON disclosure for each record. `renderPage` repeats those record blocks for
each outline group, then appends the selected comps. There is no persisted
reader-facing manuscript between the inventory and the HTML.

The [structure contract](../../skills/generate-prd/references/structure-plan.md)
gives the agent responsibility for the information hierarchy, weight assessment,
and page breaks. The owner has explicitly reaffirmed this process for application
structure, flows, and use cases. Keep that editorial authority. The existing
freedom to choose an arbitrary document set is a separate concern from choosing
the right hierarchy and pages within the interaction document.

These are repository findings. The proposed correction is our design inference:
fix the document roles, retain the agent's hierarchy and page-break process,
persist an editable manuscript and page map, constrain presentation to named page
patterns, and render those saved inputs. Keep the inventory as a coverage tool
and the hierarchy as the authority for interaction organization. Byte-stable
rendering of one plan does not make independently regenerated prose consistent;
use saved editorial baselines and bounded revisions to address that problem.

## Boundaries of the evidence

There is no universal PRD table of contents established by these sources. The
specific three-document proposal, page geometry, section order, version policy,
and revision mechanics in this package are project recommendations. The two
required document roles come from the owner. Separate design-language
publication remains a proposal. Research does not accept new product behavior,
choose the application's visual design, or establish that its missing comps are complete.
