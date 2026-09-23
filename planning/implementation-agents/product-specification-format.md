# Product Description And PRD Output

Status: implemented reusable contract for the product-planning scope of [refine-design](../../skills/refine-design/SKILL.md). Static HTML is the maintained human-review format. Architecture planning remains a separate scope.

## Authority And Inputs

One human-owned product description supplies intent. Keep an existing document
at its supplied location; prefer `product/<name>/product-description.md` when
creating a new one. All durable design data lives in repository-root
`product/<name>/` under the [product location contract](../../skills/refine-design/references/product-location.md).
If the description does not clearly name the product and the current owner has
not supplied the answer, refinement asks before choosing a data location.

The description is ordinary Markdown intended for direct editing. A person may use headings and bullets, but their presence, order, and nesting carry no required machine semantics. Every invocation reads the entire document as fresh, potentially unstructured input. The skill preserves meaning, owner decisions, and explicit unknowns while reorganizing the document when that improves clarity.

The authority chain is:

```text
human description           original editable product intent
product/<name>/current.json  current immutable snapshot binding
models/ and snapshots/      versioned product meaning and dependencies
ux/ux-spec.json              structured UX decisions
ui/ui-spec.json              structured surface compositions
ui/components/*.json         structured complex-component designs
design-language/*.json       structured visual foundations
prd/*.html and assets        generated human-review output
```

After `current.json`, relative paths above are beneath `product/<name>/`.
`refine-design` interprets and persists the model and specialty artifacts.
It produces `contexts/prd/<digest>/context.json` with declared resources;
`generate-prd` consumes that package to publish the final review site. Specialists
do not independently reinterpret the human description for downstream publication.

Human text that conflicts with a derived accepted decision wins and triggers reassessment of the affected structured records. Technical architecture choices stay in engineering design records. The PRD contains product and UX decisions, visible behavior, UI review material, and product/UX questions; it does not contain API, storage, schema, codec, or service-decomposition questions.

The design is a living, incomplete body of work. A missing section is an unknown rather than an exclusion. A selected specialist recommendation becomes accepted working design when incorporated. `proposed` is reserved for an unselected alternative and `unresolved` for a gap without a usable direction. Ordinary accepted content carries no acceptance badge in the PRD.

A user can explicitly mark a named scope `locked`. The owning structured record and generated review page show that exceptional state. General refinement, regeneration, new evidence, changed dependencies, or broad product-description edits cannot change the lock or its exact bindings. Only a current explicit user instruction naming that scope may lock, change, rebind, or unlock it.

## Breadth-First PRD Organization

The generated PRD proceeds from the whole application to detailed behavior:

1. Product orientation and intended users.
2. Application organization: top-to-bottom shell regions, navigation, active workspace, persistent status, and the complete activity-area map.
3. Every peer product capability at comparable depth.
4. Every work surface and its top-to-bottom functional regions.
5. Workflows and use cases with triggers, ordered interactions, visible responses, outcomes, alternatives, cancellation, failure, and recovery.
6. Shared component behavior.
7. One consolidated product-and-UX open-question section.

This organization is generated presentation, not a required shape for the human-owned description. Product capabilities describe user-facing abilities and do not predetermine Polylith features, services, or folders. Shared windows, workspaces, dialogs, menus, and components are described once and referenced from each capability that uses them.

Design defaults such as spacing, typography, density, ordinary component metrics, and an initial theme are current editable choices. They belong in the design language and review pages rather than the open-question list. Open questions are for missing product behavior, consequential UX alternatives, or a dependency that prevents a responsible current recommendation.

## Static HTML Review Site

The maintained output is a directly openable, server-free site:

```text
product/<name>/prd/
  index.html
  design-language/index.html
  components/index.html
  comps/index.html
  component-comps/index.html
  assets/
  render-report.json
  publication-receipt.json
```

Generate semantic HTML and CSS with local relative assets. CSS Grid owns major regions and forms; Flexbox may align compact control groups. Shared design values become CSS variables. Local fonts, MUI icon SVGs, and other vector assets remain deterministic assets. Generated HTML is write-only from the workflow's perspective: review it, then return changes through the product description or the owning structured source.

The UX writer persists `ux/ux-spec.json`. It no longer publishes `prd.md`. Its exported Markdown renderer remains diagnostic compatibility code until the useful validation it carries can be removed safely. Earlier Markdown PRDs and general SVG scene/specimen publications are historical evidence, not parallel output contracts.

## Design Language, Surface Comps, And Components

The design-language section contains reusable application-wide foundations and ordinary component patterns: visual direction, optional brand palette, theme roles, typography, spacing, layout rules, ordinary controls, shared state treatment, and reusable component-internal icons. Product-specific actions and specialized controls belong to the comps that use them.

Each UX surface state may have one structured UI scene and paired clean/annotated HTML comps. The clean comp appears inline with the owning UX surface and links to both full-size variants. Both variants come from the same scene tree. The annotated view adds dimensions, source bindings, region names, and interaction contracts without becoming a separate design.

Dialogs, popovers, and menus record focus order, initial-focus rationale, return-focus target, action grouping, Escape/outside/cancel behavior, and content-driven height. The renderer uses semantic dialog markup for dialog comps and exposes the full contract in the annotated view.

An unfamiliar or product-specific component receives a dedicated component design. Bounded primary-source research establishes recognizable patterns before a result is called a comp. Structural boxes remain wireframes. A source-verified comp defines a versioned template, representative states, sizing, parameters, accessibility intent, and exact placeholder replacement. It may remain app-local or become a shared candidate. Promotion produces a review-only handoff and requires explicit user direction plus a separate authorized repository workflow; the design skill does not mutate a shared library automatically.

## Change Impact And Reproducibility

Stable IDs preserve meaning across reordered or rewritten documents. Exact source revisions preserve bindings. A change invalidates only records and artifacts that consume the changed decision. Revision-only changes require rebinding; unrelated artifacts remain reusable. A dependency that reaches locked content is reported as a lock conflict and does not change the artifact.

Identical inputs must produce byte-identical owned JSON, HTML, CSS, and assets. Independent agent runs are compared by decision-bearing normalized content rather than run descriptions, source paths, dates, or revision labels. IDs, statuses, relationships, behavior, selected values, and visible copy remain material.

The render report records input identities and revisions, generated files, completeness, placeholders, unresolved requirements, and lock conflicts. Rendering never promotes status or claims whole-product completeness.

## Deliberate Post-MVP Work

- Interactive JavaScript in review pages.
- A general responsive-breakpoint engine; explicit scenes cover current variants.
- Production React or application-code generation.
- A complete MUI component catalog.
- Automated screenshot baselines.
- Automatic shared-library mutation.
- A separately installed component-design skill.

These limits do not prevent iterative product planning, static comps, or further accepted design decisions.
