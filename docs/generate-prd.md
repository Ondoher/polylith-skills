# Generate product documents

See [Working with product-design skills](product-design.md#outline-and-publish-a-prd-no-new-product-decisions)
for the handoff from refinement.

`generate-prd` organizes a validated product context into a source-bound
outline, asks the `document-structure` agent to choose document and page
boundaries, and publishes the reviewed plan as linked HTML. The agent decides
how many product documents the content warrants. Publication is deterministic;
it does not ask an agent to reinterpret the product description.

## Getting started

Finish the current UI composition pass in `refine-design` first. It must supply
source-bound UX and UI artifacts, available scenes, the design language, and a
publication manifest. Missing scenes and incomplete coverage stay explicit;
older comps cannot be rebound by matching their names. Then start with the
current context package saved by `refine-design` under
`product/<name>/contexts/prd/<digest>/context.json`. Keep its sibling
`artifact-resources/` directory when moving the package. Ask the skill for an
outline-only inventory first:

```text
Use $generate-prd to create an outline-only inventory from <context.json>.
```

The skill checks the repository-backed source binding, prepares exact source
references, and consults the read-only `document-structure` agent. It saves
`source-index.json`, `outline.json`, and a Markdown review view under
`product/<name>/`. The outline covers each eligible source once and makes no
document or page decision.

After reviewing the outline, ask for a structure proposal. The same agent
assesses the weight of each outline group, then chooses a variable number of
self-contained document entry points and linked pages. The saved weights and
plan bind the exact context, source index, and outline. The navigation skeleton
shows the page hierarchy and reading links. A second Markdown outline shows
all source entries in proposed reading order with visible page breaks; the
original outline stays unchanged. These are support files under
`product/<name>/`.

## Preview and publish

Create a non-replacing preview from the saved files:

```text
node scripts/product-collection.mjs --context <context.json> --outline <outline.json> --weights <weights.json> --plan <plan.json> --preview <new-product-support-directory>
```

Review document boundaries, links, gaps, and supplied comps in that preview.
The operational publisher checks that every current UI scene is selected in
the plan. Scene availability alone does not prove finished visual fidelity.
To publish the same plan, use `--output <repository-root>/documents/<name>`
instead of `--preview`. The product name is the confirmed repository folder
name; the command does not infer it from the description. Each document gets
its own `documents/<name>/<doc-name>/` directory, entry page, linked subject
pages, local assets, and integrity receipt. The publisher can retire an older
combined `prd/` only after validating its receipt and files. It leaves the
independently owned `technical/` and unrelated siblings untouched.

Related requirements and interactions link through their source identities.
Selected current UI scenes appear inline on their owning page, with a
full-size comp link when one is available. Partial sources and missing detail
remain visible rather than becoming invented publication content. Change
source artifacts or the plan and republish; do not edit generated HTML.

[Operational instructions](../skills/generate-prd/SKILL.md) ·
[Refine a design](refine-design.md) · [All skills](../README.md)
