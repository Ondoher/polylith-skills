# Default Layout Rules

Use these editable design defaults when assembling a layout reference. They are the current working design until changed in the product description or a later design pass. Accepted app decisions and resolved component metrics take precedence. This is a planning baseline, not a canonical engineering standard or an assertion of MUI defaults.

## Document responsibility

Layout is the single review location for spacing and typography in headers, text, buttons, edit fields, forms, grids and dialogs. Show representative patterns, not every component/state. Components shows appearance and state/color variations and links to layout for dimensions. Typography remains the source for named type roles; layout applies those roles. Avoid repeating color variations in layout.

## Reusable rules

1. Use a small spacing scale. Distinguish padding, related-item gaps, complete-field gaps and section separation. Related items sit closer than separate groups.
2. Specify type by role, font family, size, weight and line height. Measure vertical gaps between line boxes or component borders, not visible glyph edges. Reuse resolved type roles rather than introducing unrelated text sizes.
3. Buttons grow to fit their label plus padding. Center the line box vertically; keep icon size, icon-to-text gap and activation area distinct. Heights are starting minima for implementation, not permission to clip enlarged text.
4. Keep labels, fields and helper/error messages together as one logical input. MUI outlined text and select controls place the visible label in the outline notch; do not add a separate label-to-input gap to those controls. Apply an external-label gap only when the selected component actually renders a separate label. A shared message can serve a composite input. Measure the next-field gap after the final message line box; wrapping increases block height. Do not silently change whether an error replaces or accompanies a helper.
5. Align form groups to shared edges. Use Grid for major regions and local alignment; small Flexbox action groups are appropriate. Default to one form column; place genuinely related short fields side by side only when useful. Use local gaps rather than forcing components onto every page-grid column.
6. Dialogs have their own title, content and optional action regions. Keep their content edges aligned. Default left-to-right action arrangements put secondary before primary at the trailing edge; adapt to locale/platform and task. Initial focus follows the existing accessibility guidance, not the visual ordering alone.
7. Bound readable forms, let workspaces grow, and preserve reading/focus order on reflow. Allow longer labels, wrapped messages and action rows; keep actions reachable when content scrolls. Exact breakpoints, dialog widths and scroll behavior remain app decisions.
8. Show one representative composition plus focused details. Annotate distinct relationships once. Include horizontal and vertical examples, with and without messages. Use neutral drawing colors; do not imply app identity, a new product feature or approved screen architecture.

## Extractable starting values

[layout-defaults.json](./layout-defaults.json) holds the versioned component/surface starting values and type-role mappings. Existing review-layout spacing supplies 4/8/12/16/24px scale, 8px related gaps, 16px complete-field gaps/padding, 24px section separation and 4px helper gap in the initial synthetic design-language fixture. These are editable product-design choices, not MUI or Atlassian mandates and not open questions. Resolved app typography supplies line heights, including helper text; the earlier standalone spacing diagram's 20px helper line does not override it.

The current review layout stores a copy of the layout defaults, so later default-library changes do not silently rewrite an existing design. Its renderer produces a compact rule table and two outlined-font SVGs. Resolve the metrics into an app/component contract before implementation.

## Basis and limits

Consolidates the owner's document-organization decisions and [UI guidance](../../../planning/implementation-agents/ui-guidance.md). [Atlassian spacing](https://atlassian.design/foundations/spacing) and [grid](https://atlassian.design/foundations/grid), and [Carbon spacing](https://carbondesignsystem.com/elements/spacing/overview/) support grouping, alignment and examples at different scales. Specific values, the example dialog and document split are our synthesis. This reference does not establish accessibility conformance or substitute for rendered app checks.
