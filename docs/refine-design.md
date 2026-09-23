# Refine Design

See [Working with product-design skills](product-design.md) for the agent roster and interaction flows for product/UX refinement, visual foundations, and architecture consultation.

Use this skill to turn an idea, rough notes, or an existing brief into durable product and design decisions. It also supports revisiting a specific interaction or design choice as the product evolves.

## Use it

```text
Use $refine-design to develop documentation/product-description.md into a product model and UX design.
```

A complete specification is not required. State the product input and desired scope. The skill consults relevant specialists when their expertise can materially affect the result rather than requiring every specialty for every request.

## Product name and saved data

Durable design data is saved under `product/<name>/` at the owning product repository root.
Product-specific evaluations, captured agent inputs and outputs, and review evidence belong there too (for example, `product/<name>/evaluations/`), never in the shared skills repository. The skills repository keeps reusable tooling and synthetic or sanitized test fixtures. Sanitized fixtures must omit private product details, machine-local paths, and live-run identity metadata; label them as test data rather than historical evaluation evidence.
The skill reads the product name from the human description. If it is missing
or ambiguous, it asks for the name before saving; it does not guess from the
repository name or use a placeholder folder. A name already supplied explicitly
in your current request is sufficient, and the clarified name is recorded in
the description when document editing is authorized.

Safe names retain their spaces and capitalization: `Field Journal` uses
`product/Field Journal/`. If a name is unsafe as a portable folder component,
the skill asks for a folder name without changing the product's display name.
An existing description stays at its supplied location. Newly created
descriptions normally live at `product/<name>/product-description.md`.

Models, snapshots, contexts, UX, visual foundations, UI, component designs,
research, and review records share that named root. The default generated PRD
is `product/<name>/prd/`. Existing data elsewhere is not silently moved or reset.

For the example above, an existing description can remain at
`documentation/product-description.md` while the generated data uses:

```text
product/Field Journal/
  current.json
  sources/<source-hash>/product-description.md
  models/<revision>-<model-hash>/product-model.json
  snapshots/<snapshot-hash>/product-snapshot.json
  artifacts/<owner>/<artifact-id>/<revision>-<artifact-hash>.json
  artifact-resources/
  contexts/prd/<context-hash>/context.json
  contexts/prd/<context-hash>/artifact-resources/
  ux/ux-spec.json
  design-language/design-language.json
  design-language/review-layout.json
  ui/ui-spec.json
  ui/components/<component-id>.json
  prd/
```

Optional files appear only when that work is needed. The immutable copy under
`sources/` records the exact input; your original description remains the one
editable source. This directory is relative to the repository root, not the
description's folder, active topic, current shell directory, or Codex home.

If the name is unclear, the skill asks **“What is the name of this product?”**
It can continue useful unsaved analysis while waiting, but does not write to a
guessed path. A named repository is not evidence of a named product. If no
repository is available for requested saved work, it asks which repository
should own the data.

A later rename does not silently move the store, create another product ID, or
discard design history. The workflow identifies the existing data and asks for
an explicit identity or relocation decision. A previously chosen safe folder
association remains stable until you deliberately change it. See the
[product location contract](../skills/refine-design/references/product-location.md)
for exact naming and ownership rules.

## What happens

The human-owned product description is the root input. Refinement interprets its meaning into a structured product model and records exact source bytes, stable record identities, revisions, and immutable snapshots. Updates preserve continued meaning and explicitly account for replaced or removed claims.

Depending on scope, specialist work produces UX interaction design and review, visual foundations, UI compositions, component designs, or engineering assessments. Artifacts record dependencies on product decisions and other artifacts. Changed inputs can make affected work stale while leaving unrelated decisions usable.

Concrete specialist choices incorporated by the workflow become accepted working decisions. You can revise them through the product description. Explicitly locked decisions have stronger protection: changing or unlocking them requires current, scope-specific owner authority. Unresolved gaps remain visible instead of being filled with invented requirements.

## Output and handoff

The workflow persists product and scoped design artifacts and can produce a self-contained PRD context package with validated data and declared resources. `generate-prd` consumes that package without reinterpreting your Markdown.

Use the context beneath `product/<name>/contexts/prd/<context-hash>/` to publish
the default review site at `product/<name>/prd/`. If you copy the context for an
export, include its sibling `artifact-resources/` directory when present. An
explicit export destination does not change the canonical data location.

Refinement is planning work. It does not implement application code or publish the final PRD. It accepts current artifact schemas; migration of older artifacts is a separately authorized task. Use ordinary refinement for incremental changes and `reset-design` only to intentionally discard prior derived decisions.

[Operational instructions](../skills/refine-design/SKILL.md) · [Publish a PRD](generate-prd.md) · [Reset a design](reset-design.md) · [All skills](../README.md)
