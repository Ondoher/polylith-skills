# Source-bound document structure proposal

This planning mode turns a reviewed information outline into an editorial
proposal. It does not publish or replace reader-facing files. Save every
support artifact in `<repository-root>/product/<name>/`. After review, the
collection publisher consumes the exact saved plan under the separate
[publication contract](collection-publication.md).

The `document-structure` agent first weighs every outline node. Its assessment
binds `contextId`, `sourceIndexSha256`, and the exact SHA-256 of `outline.json`.
Each node has one `weight` (`low`, `medium`, `high`, or `very-high`), five
`factors` (`sourceDepth`, `interactionDepth`, `visualFootprint`, `sharedLoad`,
`crossLinks`, each `low`, `medium`, or `high`), a short evidence-based
`rationale`, and `gapRefs` naming actual indexed product or UX gaps. The agent
must distinguish current source depth from anticipated design work. A missing
scene or comp contributes a gap, not visual content. `overallNotes` captures
cross-cutting limits. Validate with:

```text
node scripts/prd-structure.mjs weights --context <context.json> --outline <outline.json> --weights <weights.json> --output <assessment.md>
```

Give the same agent the validated weights and exact outline for the scheduling
pass. The structure plan binds the context ID, source-index digest, exact outline
file digest, and exact weights file digest. `revision` starts at 1. It contains a
variable-length `documents` array in reading order. Each document records:

- a safe stable `id`, `title`, named `audience`, `purpose`, and
  `boundaryRationale` explaining why it deserves an independent entry point;
- `standaloneContext` with `orientation`, `terms`, `scope`, `behavior`, and
  indexed `openQuestions` so the document can be understood independently;
- one or more `pages` in reading order. The first page is its entry page and
  has `parentPageId: null`. Each later page names an earlier page in the same
  document as its parent. Each page has a safe stable `id`, `title`, `summary`,
  direct `groupRefs`, current `compRefs`, and a placement `rationale`.

`groupRefs` name outline nodes with direct source references. Each such node
must have exactly one canonical page; descendants can be placed separately.
This preserves every eligible source once without copying 162 source IDs into
the plan. `compRefs` may name only current UI scene or render-request sources
already placed on that page. A proposed frame is not a comp. A page may contain
standalone orientation with no canonical group, but every document needs source
content. The planned page path is derived from the safe IDs as
`documents/<name>/<document-id>/<page-id>.html`; no path is supplied by the
agent. `technical` is reserved as an independently owned document ID, `index`
is reserved as a page ID for the document entry page, and Windows device names
are not valid document or page IDs.

`crossLinks` contains `{from, to, purpose}` records with page references of the
form `<document-id>/<page-id>`. They express useful reader routes and must have
valid, distinct targets. Relationship-derived source links remain available to
the later publisher even when they are not repeated as editorial cross-links.
`peerDecisions` records the presentation choice for each outline parent whose
children land on more than one page. A `peer-pages` pattern gives sibling
subjects comparable page treatment; a `mixed` pattern names child exceptions
with reasons. `notes` records unresolved editorial limits, not omitted sources.

Validate and render the review skeleton with:

```text
node scripts/prd-structure.mjs skeleton --context <context.json> --outline <outline.json> --weights <weights.json> --plan <plan.json> --output <skeleton.md>
```

For a full source outline in the proposed reading order, render a second review
view with visible entry-page and page-break dividers:

```text
node scripts/prd-structure.mjs marked-outline --context <context.json> --outline <outline.json> --weights <weights.json> --plan <plan.json> --output <outline-with-breaks.md>
```

Keep the original `outline.json` and outline-only Markdown unchanged. The
marked view derives every group and source from that exact outline, and every
break from the validated plan. It shows source-free parent context at the first
relevant placement and retains group anchors for cross-references. Save it
under `product/<name>/` beside the plan and format it with the consuming
repository's local Markdown rules.

The validator checks exact input bindings, all canonical group/source
placements, safe IDs, available comps, cross-link targets, and peer-split
decisions. The Markdown skeleton shows document entry points, page order,
content groups, key source references, source counts, gaps, and reading links.
Its nested navigation follows `parentPageId`. Format that Markdown
with the consuming repository's local Prettier configuration. Its links are
review anchors; no planned HTML destination exists yet.

An edited source context, outline, or weight assessment invalidates a saved
structure plan. Ask the agent for a revised proposal against the new exact
inputs; do not carry a prior plan forward by changing its digest fields.
