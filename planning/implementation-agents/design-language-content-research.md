# Design-Language Document Contents: Research And Scope

Researched 2026-09-17. The owner clarified that the password specimen is a useful rendering preview but may not belong in every basic design-language document. When needed in a future comp, it should appear at the size specified by that composition. The owner accepted the document structure and initial component selection on 2026-09-17.

## Primary-Source Findings

- [Atlassian foundations](https://atlassian.design/foundations) separate tokens and shared visual rules from components. Topics include typography, color, spacing, grid, iconography, borders, radius, elevation, motion, accessibility and content.
- [Atlassian components](https://atlassian.design/components) separately document reusable UI elements such as buttons, text fields, selects, checkboxes, radios and toggles. Its use of "primitives" also includes layout/text building blocks, so that term is not a universal category for form components.
- [GOV.UK styles](https://design-system.service.gov.uk/styles/) cover layout, spacing, typography and visual elements.
- [GOV.UK components](https://design-system.service.gov.uk/components/) describe reusable interface parts; password input is one component among many.
- [GOV.UK patterns](https://design-system.service.gov.uk/patterns/) address user tasks and page types, combining and adapting components to context. A task pattern is not necessarily the same deliverable as our visual comp.
- [MUI theming](https://mui.com/material-ui/customization/theming/) centralizes palette, typography, spacing, breakpoints, layering, transitions and component customization, supporting shared foundations consumed by many components.

These are organizational examples, not a universal required document template or proof that every mature design-system category belongs in a small app's design-language document.

## Accepted Compact Document

Owner-accepted scope for this project (2026-09-17); the living design can be refined through later explicit decisions:

| Area | Include in the basic document |
| --- | --- |
| Visual direction | Brief identity, tone, density and guiding visual choices |
| Typography | Families, roles, sizes, weights, line heights; representative text |
| Color/theme | Brand palette, semantic mappings, surfaces, text, borders and state colors |
| Spacing/layout | Scale, padding/gaps, alignment, Grid/Flex conventions and resizing principles |
| Shape/surfaces | Border weights, radii and relevant elevation/surface distinctions |
| Iconography | Source/style/size conventions and the already-agreed central required-icon inventory |
| Shared states | Representative focus, hover/pressed, disabled, selected and error treatment where relevant |
| Basic component examples | A small selection that demonstrates the shared visual decisions |
| Decisions/gaps | Accepted versus proposed values, explicit defaults, missing requirements and final open questions |

Motion, illustration, logos and detailed content style can be added when relevant; they should not be obligatory empty sections.

## Accepted Initial Component Examples

Start with button styles (primary, secondary, text and icon-button treatment as relevant), one ordinary text field with label/helper/error styling, and one select/dropdown. Checkbox/radio/switch examples can be added when used or when their styling needs a distinct decision. Shared surface/divider examples may be useful without specifying full dialogs or cards.

Choose examples because they expose a reusable visual decision, not because the renderer supports them. An example can show a small state strip where necessary; avoid exhaustive state combinations and duplicating a complete component catalog.

Detailed password rules, product-specific copy, exact placement and the chosen width for a particular use belong in that use's comp/specification. Complex product components may need their own component comp. The basic document can reference these rather than reproduce them.

## Password Specimen And Renderer Implications

Owner clarification: retaining password as a test/preview is useful; its inclusion in a particular basic document is optional. It is not part of the required initial example set. Do not remove the implemented template or assume Alexa requires a password feature.

Renderer capability, shared component-library membership, and inclusion in a particular document are separate decisions. A supported component need not appear in every design-language document. Conversely, a missing implementation does not erase a design requirement.

Future composition should instantiate the same template at the requested size using shared tokens. The 280px/400px samples are stress-test dimensions, not a mandatory product width. Schema 0.7 implements this document organization with independent basic embedded-button and detailed password-preview selection. Its bounded source still requires the password definition; arbitrary component selection and composition placement remain future work.

## Open Choices

- Refine placement of future specialized previews. Schema 0.7 puts the optional detailed password preview after the main design sections and before Decisions And Gaps.
- Design how a living document selects examples independently of available renderer templates.

This research does not change the renderer or automatically add new component implementations.
