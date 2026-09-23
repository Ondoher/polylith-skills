# Generate PRD

See [Working with product-design skills](product-design.md#publish-a-prd-no-new-design-decisions) for the publication flow and its handoff from refinement.

Use this skill to publish a static HTML product requirements document from a validated context produced by `refine-design`. Publication preserves the supplied meaning and design decisions.

## Use it

```text
Use $generate-prd to publish the context at <context.json> into <output-directory>.
```

Supply the actual context path and destination. When moving context between locations, copy its complete package directory, including any sibling `artifact-resources/` directory.

Refinement saves repository-backed contexts under
`product/<name>/contexts/prd/<digest>/context.json`. The normal publication
destination is `product/<name>/prd/`; an explicitly requested export may go
elsewhere. The publisher consumes the existing context and does not ask for or
infer a new product name.

The underlying command, relative to the installed skill directory, is:

```text
node scripts/generate-prd.mjs --context <context.json> --output <output-directory>
```

## What it publishes

Without a publication manifest, the result is a compact product-model review with an HTML index and stylesheet. A structured manifest selects the full linked site: requirements, design-language review, standard components, supplied product and component compositions, and supported fonts and media.

The publisher validates context, artifact bindings, dependencies, locks, resource bytes, and material digests before writing. Identical context bytes produce identical output. A `publication-receipt.json` inventory binds generated files to their inputs.

## Boundaries

The publisher does not read the human description, consult specialists, research alternatives, or repair missing decisions. Invalid input goes back to refinement. Partial artifacts display their gaps; excluded stale or conflicting payloads are not reconstructed.

Existing output must satisfy ownership and replacement checks. The receipt is an integrity record, not authenticated provenance. Change source artifacts and republish rather than editing generated HTML manually.

[Operational instructions](../skills/generate-prd/SKILL.md) · [Refine a design](refine-design.md) · [All skills](../README.md)
