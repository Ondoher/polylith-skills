---
name: generate-prd
description: Publish a deterministic static HTML product requirements document from a validated persisted PRD context. Use after product refinement has produced the context; do not use to interpret product prose or make design decisions.
---

# Generate PRD

Publish an existing PRD context without changing its meaning. This skill is a mechanical consumer of persisted product data.

## Input

Repository-backed refinement saves canonical context packages under
`<repository-root>/product/<name>/contexts/prd/<materialSha256>/context.json`.
Use `<repository-root>/product/<name>/prd/` as the normal publication destination
when no different export destination was requested. A detached context may still
be published outside its original repository; the publisher does not ask for a
product name, reinterpret prose, or relocate the canonical data store.

Require one JSON context conforming to [references/prd-context.md](references/prd-context.md). Do not read a product description, call an agent, conduct research, select defaults, or repair missing data. Return validation errors to the producing workflow.

## Publication

Run:

```text
node scripts/generate-prd.mjs --context <context.json> --output <output-directory>
```

The command validates the complete context, embedded artifact envelopes, dependency closure, locks, exclusions, material digests, structured publication packages, and declared resource bytes before writing. Without a `prd-publication` manifest it emits the compact product-model review (`index.html` and `assets/product.css`). Exactly one manifest activates the full linked publication from its named UX 0.2, design-language 0.14 plus review-layout 7, optional UI-composition 0.2, and ordered component-design 0.2 artifacts. The full site includes the requirements index, design-language review, standard-component catalog, product comps, component comps, local fonts and media, diagnostics, and shared CSS supported by those inputs.

Every mode also emits `publication-receipt.json`. Its recursive file inventory owns every generated file by path, size, and digest, and its resource inventory records every context-declared binary consumed during rendering.

The output is deterministic for the same exact context bytes. Read [references/publication.md](references/publication.md) when diagnosing validation, ownership, or replacement behavior.

Treat `publication-receipt.json` as the durable integrity record binding the publication to its context, product model, and exact source-snapshot revision. It is not authenticated provenance. Do not hand-edit generated output.

Render current accepted, partial, and locked PRD artifacts supplied by the context. Present partial artifacts with their explicit gaps. Show stale, locked-conflict, and superseded exclusions as unavailable metadata only; their payloads are absent and must never be reconstructed.

Read [the structured publication artifact contract](references/product-publication.md) for the exact manifest, payload encoding, and resource descriptor shapes. The compact fallback CSS is product-neutral presentation; a manifest-selected site renders the supplied design authority without inventing design choices.
