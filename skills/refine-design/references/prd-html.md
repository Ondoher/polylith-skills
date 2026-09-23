# Static HTML PRD

This document describes the underlying rendering contract used for structured
design inspection and full-site rendering. Final PRD publication belongs to
`generate-prd`, which consumes the detached context produced by
[the structured publication workflow](product-publication.md). Do not use this
lower-level entry point to bypass that context handoff during refinement.

The renderer consumes current UX schema 0.2 and design-language schema 0.14
sources. UI composition and component sources, when supplied, use schema 0.2 and
bind to the exact UX interaction frames and actions they present. It leaves all
structured inputs unchanged. Canonical data belongs under repository-root
`product/<name>/`; final output normally uses its `prd/` subdirectory, while
isolated inspection output must not compete with that published site.

The final site produced through `generate-prd` is the maintained PRD publication.
The UX writer persists structured JSON only; any earlier `prd.md` is historical
evidence. SVG remains available for local icons and vector assets but not as a
parallel scene or specimen publication.

For authorized renderer inspection or maintenance, the lower-level command is:

```text
node scripts/prd-html.mjs <ux-spec.json> <design-language.json> <prd-output-root> --layout <review-layout.json> [--source-root <authoritative-source-root>] [--ui <ui-spec.json>] [--component <component-design.json>]... [--ux-label <label>] [--design-label <label>] [--ui-label <label>] [--component-label <label>]... [--layout-label <label>] [--design-title <title>]
```

The publisher validates every supplied source and their cross-source bindings before writing. It regenerates the design-language section with site navigation, writes `index.html`, `components/index.html`, `assets/product.css`, the existing shared design-language assets, and one aggregate `render-report.json`. The design-language publisher writes its bounded diagnostics to `design-language/render-report.json` so report ownership does not overlap. Repeat `--component` to register independently owned custom components in one surface. Repeat `--component-label` in the same order when explicit source labels are needed.

## Product Requirements Page

Render the product overview, intended users, application areas, features, surfaces and ordered functional regions, use cases and visible responses, accepted actions and interaction frames, alternatives and recovery, selected pattern evidence and its limits, pruning results, product component requirements, and open product/UX questions. Use stable source IDs for anchors and links. Do not expose technical questions or implementation decomposition.

Content presented as the selected design is accepted working design by inclusion. Do not render accepted, proposed, or default pills. Render `locked` visibly because it removes ordinary refinement authority: only an explicit current user request naming that scope may change or unlock it. An unselected candidate may appear only as clearly labeled comparison material. Explicitly identify missing requirements and unresolved behavior as gaps. Show only open questions; answered questions have already been incorporated into the design.

## Semantic Interaction Wireframes

For every surface with `interactionFrameRefs`, render each referenced interaction frame as deterministic restrained grayscale native HTML inside the owning surface. Place it after the surface's functional arrangement and state description and before any detailed UI comp. Generate it from the same schema 0.2 frame, action, feedback, cancellation, recovery, focus, and transition records used by the UX validator; do not create a second hand-authored interpretation.

Use headings, lists, groups, and text links that expose semantic order rather than simulated application controls. Preserve stable `data-ux-frame`, `data-ux-region`, `data-ux-content`, `data-ux-affordance`, and `data-ux-action` hooks. Show labels, action priority and availability, canonical and alternate input meaning, feedback persistence, cancellation and recovery, focus intent, and textual state/frame/surface/completion transitions when they materially aid review. Accepted and default records remain unbadged; identify locked, proposed, and unresolved material explicitly.

The wireframe is interaction-architecture evidence. Its caption states that UI owns exact layout, component choice, spacing, typography, color, and treatment. Do not add JavaScript, fake interactive controls, device chrome, a fixed device viewport, pixel or source geometry, framework components, application theme colors, an iframe, or a standalone wireframe publication. Do not infer missing actions from conventional UI or from a fixture. If a UI comp is available, render it after the semantic wireframe and retain the frame/action traceability links so reviewers can compare the semantic contract with its visual realization.

## Component-State Catalog

Render the standard design-language components in ordinary HTML/CSS:

- contained button states and contained, outlined, text, and icon-only variants;
- text-field default, focus, disabled, helper, and retained-error treatment;
- shared helper/error feedback;
- checkbox-group states;
- select closed, open, focus, disabled, and error states, keeping selected and keyboard-active options distinct;
- the bounded embedded-action field example;
- dimensioned labeled placeholders only when the structured source still records an unsupported component.

Use the saved labels, content, metrics, theme tokens, and component-internal icons. A generic specimen does not create a product requirement. Product-specific complex components use schema 0.2 [component mode](component-design.md): focused state comps are published under `component-comps/`, and the exact registered placeholder is replaced inside the owning surface comp.

## Publication Rules

Use semantic landmarks and headings, local relative links, escaped source text, stable ordering, namespaced CSS, and accessible labels. Published sections link to one another. Reject linked destinations and unowned output. The aggregate PRD report is the sole current report at its path and subsequent writes require the owning generator. Invalid input must leave the last valid publication unchanged. Validate UX action/frame references, UI scene/frame/node/action bindings, every deferral in partial scenes, and a component source's exact placeholder registration before any output is planned. A complete scene cannot defer a frame affordance. Disclose open `uxChangeRequests` as pending UX gaps; never render their requested behavior as accepted UI.

Require a byte-identical repeat publication, run `scripts/prd-html.test.mjs` and `scripts/design-language-html.test.mjs`, inspect the complete pages in a browser, and report unresolved visual or content limits honestly. Verify that semantic wireframes remain legible in grayscale, preserve source order and textual transitions, do not present fake controls, and precede any corresponding UI comps.

Before republishing changed inputs, use `scripts/refinement-impact.mjs` when record-level dependency data is available. Treat selected pattern decisions, actions, interaction frames, pruning dispositions, UI frame/node/action bindings, and UX change requests as material dependencies. Regenerate stale or revision-rebind artifacts, preserve reusable artifacts byte-for-byte, and report locked conflicts without changing their records or exact bindings.
