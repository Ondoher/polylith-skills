# UI Research Notes

Consulted 2026-09-16. Primary publisher sources only. This notebook supports [compact UI guidance](ui-guidance.md); load it on demand. No full empirical literature review or product usability study was conducted.

## Sources And Transfer Limits

| Source | Evidence type and useful contribution | Limits |
| --- | --- | --- |
| [IBM Carbon spacing](https://carbondesignsystem.com/elements/spacing/overview/) | Design-system publisher guidance; spacing tokens, proximity, grouping and density. Page footer updated 9 September 2026 when consulted. | IBM's exact scale and components are not universal or adopted dependencies. |
| [Carbon typography](https://carbondesignsystem.com/elements/typography/overview/) | Publisher guidance; coordinated type roles and productive versus expressive presentation. | Calibrated to IBM fonts/context; no universally optimal font sizes established. |
| [Carbon color](https://carbondesignsystem.com/elements/color/overview/) | Publisher guidance; role-based tokens, themes and interaction states. | Its brand colors and layering recipe are examples, not target-product requirements. |
| [GOV.UK buttons](https://design-system.service.gov.uk/components/button/) | Official government design-system guidance; action labels, emphasis and secondary/destructive variants. | Transactional public-service context. No universal button-placement or one-action-per-editor rule inferred. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | W3C normative recommendation; criteria/levels determine conformance when applicable. | A selected subset is not full conformance or proof of usability. Linked Understanding pages explain criteria and are informative. |
| [APG introduction](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/), [keyboard guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/), [modal pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | W3C informative authoring guidance; native semantics, expected keyboard/focus mechanics and widget patterns. | Examples are not automatic browser/assistive-technology compatibility certification; use supported native/library behavior and verify. |

## Conditional Numeric Reference

These are WCAG 2.2 AA criteria, not a newly adopted app-wide conformance target. Consult complete definitions/exceptions for the actual scope.

- **Text contrast, 1.4.3:** ordinarily 4.5:1; 3:1 for large-scale text (18 pt, or 14 pt bold, as defined). Inactive/incidental content and logotypes have exceptions. Font size is not itself a universal usability prescription. [Explanation](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Non-text contrast, 1.4.11:** 3:1 against adjacent colors for necessary component/state cues and meaningful graphical objects, subject to criterion exceptions. Not a requirement for every decorative line. [Explanation](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- **Target size, 2.5.8:** 24 by 24 CSS pixels, with defined spacing, equivalent-control, inline, user-agent and essential exceptions. This is not an icon-size rule or the AAA enhanced target-size criterion. [Explanation](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- **Reflow, 1.4.10:** vertically scrolling content at 320 CSS-pixel width, or horizontally scrolling content at 256 CSS-pixel height, without loss or two-dimensional scrolling except where two-dimensional layout is needed for meaning/use. Apply exceptions to the relevant content, not the whole app. [Explanation](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- **Text spacing, 1.4.12:** tolerate user overrides to line height 1.5 times font size, paragraph spacing 2 times, letter spacing 0.12 times and word spacing 0.16 times without lost content/functionality, subject to language/script applicability. These are not required default styling values. [Explanation](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

## Adoption Boundaries

The compact practices are our synthesis. Cross-source application to dense desktop editors is reasoned guidance, not a controlled research finding. No specific font, spacing scale, brand palette, responsive breakpoint or component library is selected. Existing canonical CSS/Grid/MUI/accessibility obligations retain authority. Full accessibility design for specialized direct-manipulation surfaces, role installation and alternate comp-generation formats are not activated by this research.

For later role evaluation, exercise dense expert controls, missing branding choices, text expansion, focus versus selection, low-contrast secondary text, destructive-action emphasis, and a written-spec-only assessment. Detailed motion, icons, data visualization and specialized direct-manipulation patterns can be researched when an actual task needs them; do not load an exhaustive design handbook now.

## Atlassian Foundation Coverage

Owner accepted additional category coverage on 2026-09-17 following comparison with existing guidance. Primary sources consulted on that date: [spacing](https://atlassian.design/foundations/spacing), [grid](https://atlassian.design/foundations/grid), [radius](https://atlassian.design/foundations/radius), [border](https://atlassian.design/foundations/border), [elevation](https://atlassian.design/foundations/elevation), and [iconography](https://atlassian.design/foundations/iconography). These are design-system conventions, not controlled usability findings; border and radius pages were marked beta.

Useful extensions: spacing ranges by relationship and optical adjustment; fluid versus bounded content; radius families; coordinated border width/color; surface/elevation relationships; consistent icon style and alignment. Choosing fluid or bounded regions for an editor is a product-context inference. Category-to-document mapping lives in [design-language requirements](design-language-mode.md#accepted-foundation-coverage).

Acceptance covers the decision categories only. Exact scales, radii, palettes, typefaces, icons and breakpoints remain app decisions. Canonical CSS-owned styling, Grid-first layout and MUI theme-variable rules remain authoritative; Atlassian's styling APIs/token infrastructure are not adopted. Specimens and structured fields not yet supported by our renderer remain explicit gaps, rather than assumed capabilities.

## General Form Arrangement: Adopted Principles

Owner-approved scope, 2026-09-17: borrow broadly applicable arrangement principles from [Atlassian grid](https://atlassian.design/foundations/grid). See compact UI guidance, practice 12. This is publisher design-system guidance, not empirical proof of an optimal form layout. Grouping fields and retaining helper/error text within the logical input combine it with our existing guidance. No Atlassian column count, breakpoint, fixed width, mobile requirement or implementation primitive is adopted. Dialog typography, action ordering and numeric spacing still require their own guidance; this grid source does not settle them.
