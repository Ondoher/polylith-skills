# Experimental render contract

Both paths use the same production tree renderer through this isolated wrapper.
Rendering and geometry diagnostics are mechanical evidence; independent experimental
reviews record structural and UI approval separately. No production acceptance or
publication receipt is created. The preview's experiment label is outside every
application canvas. Keep uncertainties, provisional interpretations, source gaps,
and review findings in accompanying Markdown, never in application controls.

The candidate's intermediate artifact is readable Markdown. Its UI author creates
the final scene envelope directly from that description and the frozen packet.
There is no required geometric intermediate or intermediate screenshot. The control
UI author may reuse its structured wireframe parts and bounded scene changes.

## Commands

Run from the repository root; paths may be absolute. Use a unique output directory
for every submitted revision, and the same central events file throughout a series.

```powershell
node planning/refinement-efficiency/experiments/descriptive-wireframe-ui/harness.mjs mark --events <events.jsonl> --run <run-id> --stage layout-authoring --phase start
node planning/refinement-efficiency/experiments/descriptive-wireframe-ui/harness.mjs --mode wireframe --input <wireframe.json> --output-dir <revision-dir> --events <events.jsonl> --run <run-id> --stage layout-render --capture
node planning/refinement-efficiency/experiments/descriptive-wireframe-ui/harness.mjs --mode ui --input <ui.json> --output-dir <revision-dir> --events <events.jsonl> --run <run-id> --stage ui-render --capture
node planning/refinement-efficiency/experiments/descriptive-wireframe-ui/harness.mjs capture --output-dir <revision-dir> --events <events.jsonl> --run <run-id> --stage ui-inspection
```

`--capture` and the separate `capture` command use installed Edge, bounded contact
sheets, and the existing geometry inspection probe. `--browser <executable>` selects
another installed Chromium browser; no browser is downloaded. Inspect **every** PNG
listed in `captures.json`, plus its geometry warnings. Warnings require human/model
interpretation, and do not approve visual quality. Source uncertainty remains in
the frozen packet and accompanying author notes.

`mark` saves actual UTC ISO timestamps immediately. `--details '<JSON object>'` may
record decisions, clarification requests, dispatch model/effort, or artifact paths.
It never accepts an author-provided replacement timestamp. Render and capture save
start/end/error events, durations, hashes, byte counts, and diagnostic references.
Failed commands exit nonzero and retain already written evidence. These are phase
and tool timings, not reasoning-token metrics.

## Envelope

The input is JSON with `schemaVersion: "wireframe-ui-pilot-1"`, a stable valid
`elementId`, positive integer `revision`, nonempty `sourceFlowRefs`, explicit
`sourceActionRefs` (an array, possibly empty), `parts`, and `scenes`.
Source references are opaque exact IDs from the frozen packet. A node's `actionRef`
must match one `sourceActionRefs` entry; no prefix or invented policy is required.
The wrapper never fills source requirements, states, or sample values.

Every part has `{id, root}`. Its root is a region. Every scene has
`{id, name, partRef, changes: [], viewport: {width, height}}`; optional
`presentation: "dialog"` uses the renderer's static dialog illustration. Do not
put expanded `root` trees in scenes. Use scenario IDs from the frozen scenario set.

A neutral structural example (illustrative labels and dimensions only):

```json
{
  "schemaVersion": "wireframe-ui-pilot-1",
  "elementId": "example-surface",
  "revision": 1,
  "sourceFlowRefs": ["source-flow-id"],
  "sourceActionRefs": ["source-action-id"],
  "parts": [{"id": "main", "root": {
    "id": "root", "kind": "region", "label": "Workspace",
    "layout": {"mode": "grid", "columns": [{"unit": "fr", "value": 1}],
      "rows": [{"unit": "content"}], "gap": 8, "padding": 16,
      "align": "stretch", "justify": "start"},
    "children": [{"id": "action", "kind": "component",
      "templateRef": {"id": "button", "version": "1"}, "state": "default",
      "actionRef": "source-action-id", "parameters": {"label": "Action"}}]
  }}],
  "scenes": [{"id": "base", "name": "Base workspace", "partRef": "main",
    "changes": [], "viewport": {"width": 800, "height": 600}}]
}
```

UI mode additionally requires `ui.theme` with **all** fields listed below. Map them
from the frozen `design-language.json`; document a missing role or provisional
mapping identically for both paths. Complete themes prevent the library's demo
palette defaults from becoming accidental product decisions. Colors are six-digit
hex values; sizes are numeric pixels. No palette in this contract is product truth.

```text
primary onPrimary surface background text muted border accent danger
disabledBackground disabledForeground fieldBorder fieldLabel
radius fieldRadius fontSize
```

`ui.parts?: [{id, root}]` replaces existing part IDs. `ui.sceneChanges?:
[{sceneRef, changes: [{nodeRef, set}]}]` applies after base changes. Changes shallowly
replace whole fields such as `layout` or `parameters`; they cannot alter `id` or
`children`. Author a separate part for a structurally different scenario. UI parts
can change dimensions and visual treatment while preserving packet behavior.

## Renderer vocabulary

- Regions use `kind: "region"`, `label`, `children`, and complete `layout`.
  Grid layouts have `columns`/`rows` tracks (`content`, `px`, or `fr`), numeric
  nonnegative `gap` and `padding`, `align`, and `justify`. Flex layouts additionally
  use `direction: "row" | "column"` and boolean `wrap`.
- Components use `kind: "component"`, `templateRef: {id, version: "1"}`, `state`,
  and `parameters`. Templates are `heading`, `text`, `status`, `button`,
  `button-secondary`, `icon-button`, `text-field`, `choice-group`, and `visual`.
  Text/status use `text`; buttons/fields use `label`; icon buttons use
  `accessibleLabel` and `glyph`; fields optionally use `value` and `helperText`.
- Choice groups use `label`, `presentation: "listbox" | "tabs" | "select"`,
  `options: [{id, label}]`, and optional `selectedId`. Visual primitives use
  `role: surface | item | selection | start-handle | end-handle | indicator |
thumbnail | trigger | label | track | thumb | divider`, plus optional `text`,
  `accessibleLabel`, and renderer-supported `variant`.
- State identifiers: text/heading `default`; status
  `default | pending | success | failed | unavailable`; buttons, choice groups,
  icons, and visuals `default | focus | selected | disabled`; text fields
  `default | focus | error | invalid | disabled`.
- `placement` uses positive integer `row`, `column`, `rowSpan`, `columnSpan`.
  `constraints` may set nonnegative pixel `minWidthPx`, `maxWidthPx`,
  `minHeightPx`, `maxHeightPx`. Regions may use
  `surfaceTreatment: flat | outlined | elevation-1 | elevation-2`.
- Numeric geometry uses a one-column grid region's `layout.scale: {min, max}`
  and its children's `scalePosition: {start, end?}` with `placement.row`.
  Preserve source units and values. One transform aligns ranges, ticks and markers;
  numeric placement owns horizontal extent, so omit width constraints there.
- Optional `outcomeEvidence` uses the existing
  `{sourcePath, sceneRef, nodeRefs, resultKind, interpretation?, values?}` contract.
  `resultKind` is `visible-change | navigation | unchanged`; `sourcePath` is an exact
  packet JSON pointer. `--packet <packet.json>` enables source-bound validation.
  Linked nodes must visibly represent the outcome; references alone do not prove it.
- Optional `childRefs: [{templateId, elementId, revision}]` resolve exact child
  envelopes from `--references <references.json>`, an object keyed by
  `elementId@revision`. UI child envelopes also need complete themes. Child slots
  use the registered template, `state` equal to the child scene ID, and
  `placeholder: {label, description}`. The placeholder describes only unresolved
  components, never replaces specified controls.

These capabilities reuse `UiParts.materialize`, numeric geometry and outcome
validation, and `renderInlineScene`. Static previews do not verify runtime events,
focus restoration, keyboard behavior, or persistence. Document the accepted UX
contracts beside the preview so reviewers can evaluate those obligations.
