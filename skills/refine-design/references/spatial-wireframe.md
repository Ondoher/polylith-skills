# Spatial structure, proportions and constraints

Use the [JSON Schema](spatial-wireframe-schema-1.0.json) and
[synthetic example](spatial-wireframe-example.json) for the authored UX handoff.
The owner corrected this boundary on October 3, 2026: wireframes define nested
structure, important proportions and necessary constraints. UI owns actual layout.

This is an authored-file contract. Its exact hash binds acceptance; it adds no
canonical artifact kind, renderer or inspected-preview integration. Previous
Alexa descriptions and their copied schema remain historical evidence of the
superseded detailed-layout approach. Their review does not accept this replacement.

## Structure

A part contains a tree of functional regions and semantic elements. Nodes need
identity, role and purpose; regions also name their children. Containment expresses
grouping. Child membership does not specify rows, columns or geometry. Use a
relationship only when adjacency, association, meaningful reading order or a shared
scale matters to the task. A reading-order relationship lists nodes in that order.

Preserve accepted UX frames, states, actions, subjects and destinations through
references and applicable bindings. Reuse the reviewed UX for behavior and guards;
reopen a question only for a changed dependency or an actual contradiction. Purpose
is explanatory metadata. Optional text is plausible interface content.

### Control intent and research guidance

Use nested functional groups when accepted UX or applicable research distinguishes
tasks such as inspection, navigation and editing. Name the group's purpose and
scope; containment communicates membership, not a toolbar widget or arrangement.
Do not leave a materially different set of tasks as one unexplained command list.

Optional `interaction` records an existing control's `kind` and `scope`, plus
`stateMeaning` or `valueMeaning` when these matter to interpretation. Examples of
kind are command, toggle, menu-trigger, value-adjustment and directional-step.
Describe what the current state/value means, including which subject owns it;
reuse accepted UX rather than defining transitions, guards or new controls here.
UI chooses the component, glyph, visible state treatment and value presentation.
A menu trigger needs recognizable access to choices; a toggle needs a legible
current state. These are semantic outcomes, not mandatory icon or widget choices.

Optional `guidanceRefs` names applicable IDs in `evidence`. Place shared guidance
on the containing region; add control-specific references only when needed.
Retain the finding's applicability and explain adaptations or departures in the
accompanying notes. Merely citing a whole brief does not explain how a material
finding informs the handoff. Sparse omissions remain intentional; these fields
do not create per-node paperwork or a third description-review criterion.

## Optional presentation recommendations

An assigned `ui-researcher` may enrich a new copy with top-level
`presentationGuidance`; see its [research contract](../../../planning/implementation-agents/ui-researcher.md).
This advisory layer preserves authored parts/scenes and accepted semantics.
Each entry requires `id`, existing `nodeRefs`, `evidenceRefs`, `ownership`,
`recommendation` and `rationale`. `accepted-ux-detail` restates supplied meaning;
`ui-working-default` proposes concrete presentation for UI to select or adapt.
Optional `bindings` reuse accepted UX bindings. `control` names a kind and accessible
name, with optional label. `icon` names exact library, version, asset, variant and
meaning supported by inspected evidence. `menuEntries` name entries with accepted
bindings; `states` name accepted state references and visible treatment. Do not
invent actions/options/destinations, menus, states or source semantics. Missing
meaning or an unresolved asset remains a gap in the research brief.

Recommendations can make a toggle, value control or menu recognizable without
choosing scene layout, coordinates, tracks, spacing, geometry, typography or styling.
UI retains final treatment and layout; UX retains behavior. Reuse a product-owned UI
research brief and dispatch the specialist only for useful material questions,
including UI designer's request through the parent. It is not required for every
comp. The enriched copy has a new exact hash and does not inherit input acceptance.
Schema 1.0 remains an authored-file contract; no canonical artifact, runtime field,
rendering integration or third description-review criterion is added.

## Sparse quantitative guidance

Constraints are optional. Omission intentionally leaves a decision to UI. Give
only guidance that materially affects the task and has an applicable source,
research adaptation or explicit working rationale:

- A proportion expresses preferred emphasis relative to a named region: for example,
  contextual detail around 30 percent of the content region's width. It does not
  reserve a grid track, distribute residual space or require totals of 100.
- An extent gives a meaningful minimum, maximum or preference for one dimension,
  such as an icon footprint. It does not require both axes on every node.
- An aspect ratio preserves a content relationship such as a 16:9 output target.
  UI chooses fitting, dimensions and available-space allocation.
- An interaction-target constraint belongs to the action owner. An icon footprint
  belongs to its symbol; target research does not establish a glyph size.
- A visibility constraint preserves necessary access or full content. UI chooses
  scrolling, wrapping, truncation policy and persistent-control layout accordingly.

Preferences guide UI; explicit bounds and ratios constrain it. Author guidance
only where it is needed; UI resolves concrete geometry. Logical reference-pixel
measurements need applicable host evidence. The example's 30 percent, 20-pixel icon
and 32-pixel target are disclosed illustrations, not defaults or research consensus.

Domain scales and intervals retain common units, values and endpoint policy. They
express temporal or other numeric relationships, not pixel positions, row heights,
label offsets or handle placement.

Do not encode fill/content sizing, grids, tracks, row/column spans, alignment,
padding, gaps, offsets, per-axis overflow or generic content-growth policies.
Renaming a layout instruction to a constraint does not bring it into this stage.
Do not manufacture numeric precision merely to populate the JSON.

## Evidence and review

Evidence records product facts, accepted UX and relevant research with applicability.
Each constraint or relationship references a decision bound to its owning node or
region and its exact property path. Research remains advisory; selected adaptations
are working choices. A source-required constraint needs applicable source authority.

Scenes identify accepted frames, states and applicability. Reuse parts and focused
changes. Optional outcome witnesses identify structural changes or retained regions;
do not repeat every upstream operation or clone workspaces to demonstrate behavior
already accepted by UX. Preserve necessary state distinctions through references.

Independent description review has exactly two substantive criteria:

- **Completeness:** required regions and elements in the assigned scope are
  represented, with accepted UX references and necessary structural guidance for
  the UI handoff. Find omissions against that scope. Omitted geometry, optional
  dimensions and per-node decision records are intentional.
- **Adherence to applicable research guidance:** relevant supplied findings are
  reflected, with adaptations or departures explained. Respect each finding's
  applicability and distinguish advice from requirements. Ordinary nodes need
  no research citation when no guidance applies.

Every blocking finding must identify a concrete omission or departure from
applicable research guidance. Do not add layout, geometry, consistency or behavioral
review gates. Reuse accepted UX and the existing research; do not audit guards,
transitions, focus, payloads or outcomes again. Review prior findings and affected
changes under these same two criteria during corrections.

The parent may run basic JSON/schema/reference diagnostics as format hygiene.
Schema authoring rules are not an additional substantive review checklist, and
format validity does not establish either criterion. Rendering, screenshots,
painted fit and geometric solvers are outside description review.

UI preserves accepted behavior, grouping and meaningful constraints while choosing
concrete geometry, layout methods, visual representation, typography and styling.
A change to a functional relationship or source-required constraint returns to UX;
an ordinary layout decision within those boundaries stays with UI.
