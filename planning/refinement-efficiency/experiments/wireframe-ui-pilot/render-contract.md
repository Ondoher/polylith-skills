# Provisional preview contract

This experiment uses the existing `UiParts.materialize` and
`renderInlineScene` functions. Parts, scene variations, region grids/flex layouts,
component nodes, placement, controls and visual roles retain the existing UI
composition vocabulary. This adapter does not call the production publication
path, produce review receipts, or change its exact UX review requirement.
Every rendered page says **Provisional experiment · structurally ready,
unreviewed source UX**. Mechanical validity is not UX or visual approval.

`renderPreview(document, {mode: 'wireframe' | 'ui', sceneId?, references?})`
returns `{html, sceneIds, validation}`. `validatePreview(document, options)`
returns `{valid, errors}`. Rendering throws for invalid input. Both functions are
pure, store-independent and synchronous. `references` is an object keyed by
`elementId@revision`, containing exact child documents. HTML contains inline CSS
and no JavaScript, external resources, font downloads or file dependencies.

The saved envelope is:

```json
{
  "schemaVersion": "wireframe-ui-pilot-1",
  "elementId": "save-clip",
  "revision": 1,
  "sourceFlowRefs": ["saved-ux-revision-4:flow:save-clip"],
  "sourceActionRefs": ["saved-ux-revision-4:action:save-clip"],
  "parts": [{"id": "dialog", "root": {"id": "dialog-root", "kind": "region",
    "label": "Save named clip", "surfaceTreatment": "outlined",
    "layout": {"mode": "grid", "columns": [{"unit": "fr", "value": 1}],
      "rows": [{"unit": "content"}, {"unit": "content"}, {"unit": "content"}],
      "gap": 16, "padding": 24, "align": "stretch", "justify": "start"},
    "children": [
      {"id": "title", "kind": "component", "templateRef": {"id": "heading", "version": "1"},
        "state": "default", "parameters": {"text": "Save clip"}},
      {"id": "name", "kind": "component", "templateRef": {"id": "text-field", "version": "1"},
        "state": "focus", "parameters": {"label": "Clip name", "value": "Opening sequence", "helperText": "Required"}},
      {"id": "save", "kind": "component", "templateRef": {"id": "button", "version": "1"},
        "state": "default", "actionRef": "saved-ux-revision-4:action:save-clip", "parameters": {"label": "Save clip"}}
    ]}}],
  "scenes": [{"id": "save", "name": "Save clip", "partRef": "dialog", "changes": [],
    "viewport": {"width": 480, "height": 300}, "presentation": "dialog"}],
  "ui": {"theme": {"primary": "#315da8"}, "sceneChanges": [
    {"sceneRef": "save", "changes": [{"nodeRef": "dialog-root", "set": {"surfaceTreatment": "elevation-1"}}]}
  ]}
}
```

The store owns revision assignment and merges progressive contributions. The
renderer does not assign IDs or read source flows. Source flow/action references
remain opaque nonempty strings; the frozen-source manifest and harness resolve
their provenance. Bare IDs such as `save-clip` are valid; no `ux:` prefix is
required. A node's `actionRef` must exactly match a `sourceActionRefs` entry.
Optional envelope metadata such as purpose, constraints,
focus intent, recovery intent and open questions is retained by the store.

Wireframe mode ignores `ui`. UI mode requires `ui` and applies its optional
`parts` replacements by part ID, then `sceneChanges` by scene ID. A change uses
the native `{nodeRef, set}` operation: shallow field replacement, with no identity
or children mutation. Supply a complete `layout` or `parameters` field when
changing that field. Structural edits use a replacement part. Unchanged parts
and state scenes are inherited; the UI author need not copy the wireframe.

Supported built-in template IDs (all version `1`) are `heading`, `text`,
`status`, `button`, `button-secondary`, `icon-button`, `text-field` and `visual`.
Text templates use `parameters.text`; buttons use `parameters.label`;
icon buttons use `parameters.accessibleLabel` and `glyph`. Fields have visible
labels and optional `value` and `helperText`. Controls are static illustrations.
States are class names such as `default`, `focus`, `selected` and `disabled`.
For a failure message using the `status` template, use `failed` (or `unavailable`
when appropriate). `error` is a text-field state and does not style a status
message. UI surfaces support `flat`, `outlined`, `elevation-1` and `elevation-2`;
dialog backgrounds use the supplied surface role. Wireframes suppress elevation.

`visual` uses the existing roles `surface`, `item`, `selection`, `start-handle`,
`end-handle`, `indicator`, `thumbnail`, `trigger`, `label`, `track`, `thumb` and
`divider`. Optional `variant` uses the existing class vocabulary, for example
`selected`, `dark`, `grid`, `major`, `minor`, `horizontal`, `pattern-a`.
`text` and `accessibleLabel` supply representative content. A credible timeline
uses rows for the ruler/tracks, grid columns for temporal placement, overlapping
`item` / `selection` / `indicator` nodes for clips and playhead, plus transport
controls. These are one component tree, not separate agent work items.

Grid tracks are `{unit: 'px' | 'fr', value: number}` or `{unit: 'content'}`.
Node `placement` uses one-based `row`, `column`, optional `rowSpan`, `columnSpan`;
sharing a grid area deliberately overlays nodes. Layout `gap` and `padding` use
nonnegative pixel numbers; padding may also use `{top,right,bottom,left}`.
Flex layouts use `mode: 'flex'`, `direction: 'row' | 'column'`, `wrap: boolean`.
Both layouts require `align` and `justify`. Optional node `constraints` accepts
the existing `minWidthPx`, `maxWidthPx`, `minHeightPx`, `maxHeightPx` fields.
Viewport dimensions describe the intended preview size; no responsive behavior
is inferred. Additional state scenes reference the same part and use `changes`.
The only supported `presentation` value is `dialog`; otherwise omit that field.
A contextual menu is an ordinary scene containing its menu layout, not a new
presentation enum value.

For parent compositions, retain the existing placeholder registration mechanism.
Add `childRefs: [{templateId, elementId, revision}]` to the envelope, and use a
native component node whose `templateRef` is `{id: templateId, version: '1'}`,
whose `state` equals a child scene ID, and whose `placeholder` is
`{label, description}`. Its `parameters` is `{}`. Supply the exact child document
in `references`. The adapter registers and renders the child inline; no custom
child node kind, duplicated internals, iframe or mutable latest reference is used.

UI theme fields are `primary`, `onPrimary`, `surface`, `background`, `text`,
`muted`, `border`, `accent`, `danger`, `fieldBorder`, `fieldLabel` (hex colors),
plus `radius`, `fieldRadius` and `fontSize` (pixels).
Pass these values from the frozen design language; defaults are only tooling
fixture values. Theme is intentionally small and does not replace the design
language artifact. Node geometry and content remain structured decisions.

Text fields use a floating label that masks the outline beneath it, with the
native label/input association retained. Resting label and outline colors are
separate tokens. `focus` sets both to `primary` with a 2px border; `error` or
`invalid` sets both and helper text to `danger`. Disabled fields retain the
surface and use black at 38% for labels/values and 26% for outlines, matching the
frozen Alexa JSON. Its current `textField` contract supersedes the stale generated
`colors.md` equality description: label `#636365`, outline `#BEBEC2`, focus
`#B87152`, error `#D32F2F`, surface `#F7F7FC`, field radius 4px. The retained filled
command-label token is `onPrimary: '#000000'`.
