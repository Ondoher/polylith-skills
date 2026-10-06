---
name: generate-prd
description: Inventory validated product context with the document-structure agent, plan a variable product-document collection, and preview or publish its linked HTML pages. Use after refine-design has produced a current PRD context.
---

# Generate product documents

## Shared MCP operations

When configured `workflow_*` tools are available, use context.resolve, collection.preview, and collection.publish. The document-structure agent still owns hierarchy, weighting and page breaks; consume its exact saved files. Read `documentation/workflows/mcp.md` under the governance checkout (the parent of the physical Codex documentation directory) for the shared protocol. Inspect exact operation inputs with `workflow_catalog`; keep large results in handles and pass them with `inputHandles`. Specialists use only parent-issued assignment capabilities and return handles/paths. Reuse completed data and repair affected units rather than restarting. The maintained CLI instructions below remain bootstrap/recovery or explicitly retained host routes; do not generate ad hoc wrapper scripts for operations provided by the service.

Start after `refine-design` has completed a current UI composition pass and
resolved a PRD context containing its source-bound UX 0.4 and UI 0.4 artifacts,
design language, independently reviewed `ui-capture` 1.0 images, and a publication
manifest 1.1 selecting those captures with exact dependencies. A partial UI pass is usable only
when it discloses its missing scenes and coverage; do not treat an earlier UX
or UI package as current merely because its names match. If the handoff is
missing, return to `refine-design` before creating the outline or PRD preview.

Use the validated, persisted PRD context produced by `refine-design`. This
skill owns the product information outline, editorial document/page plan, and
deterministic publication. It does not decide product meaning, UX behavior, or
technical architecture. Keep support files under repository-root
`product/<name>/`; publish the selected document directories under
`documents/<name>/<doc-name>/`. Use the confirmed product folder name from the
context package, not a name inferred from prose.

## Inventory and structure

For an outline-only request, follow [the information outline procedure](references/outline.md).
Consult the read-only `document-structure` agent, validate exact source
coverage, and save the original `outline.json` and Markdown review view. That
first view makes no document or page decisions.

For a reviewed outline, follow [the structure proposal contract](references/structure-plan.md).
The same agent assesses hierarchy weight, then chooses a variable number of
standalone document entry points and linked pages. Validate and save the
source-bound `weights.json` and `plan.json`. Render the navigation skeleton and
page-marked outline for review without changing the original outline. An
edited source context, outline, or weight assessment requires a fresh bound
plan; do not update digest fields to carry an old plan forward.

## Preview and publication

Read [the collection publication contract](references/collection-publication.md).
Use the exact context, outline, weights, and plan files:

```text
node scripts/product-collection.mjs --context <context.json> --outline <outline.json> --weights <weights.json> --plan <plan.json> --preview <new-product-support-directory>
```

Preview requires a new directory under `product/<name>/` and never replaces a
current publication. Inspect its links, source coverage, page order, gaps, and
available reviewed images, their captions/alternative text and full-size links.
Reuse the exact clean and annotated PNGs accepted by refinement; do not launch
a browser, recapture scenes or embed regenerated scene markup inline during
publication. Keep linked HTML views for selectable text and source inspection.
When publication is requested, run the same command
with `--output <repository-root>/documents/<name>` instead of `--preview`.
The publisher replaces and retires only receipt-owned product document
directories. It leaves `technical/` and unrelated content alone. A current
combined `prd/` may be retired only when its existing receipt validates.

The operational publisher also requires every current UI scene to be selected
in the structure plan, either directly or through one of its render requests.
Inspect scene fidelity and explicit missing-coverage notes before publishing;
an available scene is not automatically a finished comp.

The renderer uses source identities and relationships from the exact context;
it does not read the human description, repair missing decisions, or invoke an
agent during publication. Source-backed comps and assets are placed near
their owning page content when selected in the plan. Every generated document
has a receipt binding its inputs and file bytes. Edit source artifacts or the
structure plan and republish instead of editing generated HTML.
