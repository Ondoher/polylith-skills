# Refine Design

See [Working with product-design skills](product-design.md) for the agent roster and interaction flows for product/UX refinement, visual foundations, and architecture consultation.

Use this skill to turn an idea, rough notes, or an existing brief into durable product and design decisions. It also supports revisiting a specific interaction or design choice as the product evolves.

## Use it

```text
Use $refine-design to develop documentation/product-description.md into a product model, reviewed UX, and UI compositions.
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
research, and review records share that named root. Generated human-facing documents use
repository-root `documents/<name>/<doc-name>/`. The `generate-prd`
structure plan selects product document names and linked pages. Existing data
elsewhere is not silently moved or reset.

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

documents/Field Journal/<selected-product-document>/  # Linked HTML and assets
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

The human-owned product description is the root input. Refinement formats and checks edited Markdown with the working repository's installed Prettier before recording its final bytes. It then interprets the description's meaning into a structured product model and records exact source bytes, stable record identities, revisions, and immutable snapshots. Updates preserve continued meaning and explicitly account for replaced or removed claims.

For a whole-product refinement, the skill runs both design passes: it persists UX, obtains an independent review of that exact UX, then composes and inspects UI against the reviewed behavior. A narrower request can update only the affected decision or artifact; any dependent UX or UI must be brought current before publication. Specialized components and engineering assessments are consulted when their scope calls for them. Artifacts record dependencies on product decisions and other artifacts. Changed inputs can make affected work stale while leaving unrelated decisions usable.

Concrete specialist choices incorporated by the workflow become accepted working decisions. You can revise them through the product description. Explicitly locked decisions have stronger protection: changing or unlocking them requires current, scope-specific owner authority. Unresolved gaps remain visible instead of being filled with invented requirements.

## Output and handoff

The workflow persists product and scoped design artifacts and can produce a self-contained PRD context package with validated data and declared resources. `generate-prd` consumes that package without reinterpreting your Markdown.

For a technical-documentation request, refinement instead starts from the verified
product snapshot and inspected repository source. A bounded system-architect
assessment is required; the parent reconciles it with the product authority,
preserves its report and a decision receipt, then commits technical records and
freezes a `technical` context. Product-visible open questions remain gaps. The
independent [generate-technical publisher](generate-technical.md) consumes that
context to produce linked Markdown under `documents/<name>/technical/`.
This path does not publish a PRD or change the human-owned description.
An authored technical paper is declared with a labeled relative link in the
description. Refinement records that line as a reference rather than a product
requirement and binds the current paper bytes for technical context. Use
[refine-detail](refine-detail.md) for the paper's research and revision; selected
technical findings need their own reconciled evidence before governing the guide.
Paper questions that remain open become the same product, technical, or evidence
gaps used for questions from the primary description. The publisher shows those
gaps in the common decisions and handoff pages and maps paper-backed records
on a dedicated focused-paper page.

For a product-documentation request, `refine-design` runs the UX pass and its
independent review, then the dependent UI composition pass. It does not hand
off an intermediate UX-only context as the PRD input. After the UI pass,
package the source-bound UX and UI scenes, design
language, publication manifest, and explicit missing-coverage gaps in the PRD
context. Hand that context beneath
`product/<name>/contexts/prd/<context-hash>/` to `generate-prd` for its
source-bound outline and document-structure pass. After
review, that skill previews under `product/<name>/` and publishes the selected
document directories under `documents/<name>/`. If you copy the context for an
export, include its sibling `artifact-resources/` directory when present. An
explicit export destination does not change the canonical data location.

Refinement is planning work. It does not implement application code or publish the final PRD. It accepts current artifact schemas; migration of older artifacts is a separately authorized task. Use ordinary refinement for incremental changes and `reset-design` only to intentionally discard prior derived decisions.

[Operational instructions](../skills/refine-design/SKILL.md) · [Publish a PRD](generate-prd.md) · [Publish a technical guide](generate-technical.md) · [Reset a design](reset-design.md) · [All skills](../README.md)
