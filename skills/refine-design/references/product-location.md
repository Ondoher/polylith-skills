# Product name and repository data location

For repository-backed design work, save durable product-design data beneath:

```text
<repository-root>/product/<name>/
```

This is the shared product-document and artifact-store root for `refine-design` and `reset-design`. It is not relative to the current shell directory, active topic, supplied description, skill installation, or Codex home. Low-level writers still accept explicit roots so tests and isolated reset staging remain possible; the parent must route ordinary persistence through this location contract.

## Establish the name before persistence

Read the complete human product description and determine whether it clearly names the product being refined. A clear title or ordinary sentence is sufficient; no mandatory heading, metadata field, or rigid template is required.

If the name is missing, ambiguous, only implied by a repository/folder name, or confused with an example product or component, ask the owner: **What is the name of this product?** Do not invent a name, use an anonymous/default directory, or treat a directory basename or prior agent output as the answer. If the current user instruction already explicitly supplies the name, use that answer rather than asking again. Record the clarified name in the description in natural language when document maintenance is authorized so future calls can recover it.

Keep useful read-only analysis moving while the answer is pending, but do not save product-design data or start dependent persistence under a guessed location. A discussion-only request may remain unsaved. If no repository is available, ask which repository should own saved data rather than creating a repository or saving in Codex home.

Use the stated name as one folder component, preserving spaces and capitalization; do not silently slugify it. For example, a product named `Field Journal` uses `product/Field Journal/`. The path helper accepts a portable name beginning with an ASCII letter or digit and containing letters, digits, spaces, dots, underscores, or hyphens, up to 100 characters. It rejects separators, traversal, reserved Windows names, and trailing spaces/dots. If the display name cannot safely form that component, ask for a safe folder name and record its association with the unchanged display name in the human description. A safe explicitly supplied folder name does not rename the product itself.

## Resolve and use the root

Resolve the repository root with repository inspection, then run the read-only helper with the clear or owner-confirmed name (or its explicitly chosen safe folder name):

```text
node scripts/product-location.mjs --repo <repository-root> --name "<name>"
```

The script path is relative to the installed `refine-design` skill. It validates repository-root and path boundaries and returns canonical paths without creating directories. Pass its `productRoot` to product-model `--output-root` and to UX, design-language, UI, component, and root-bound artifact persistence helpers. Use its `currentPath` for artifact commits and context resolution. Place durable planning/research records and review receipts under that same product root. Do not add a second `product/` layer inside it.

The canonical layout is:

```text
<repository-root>/
  product/
    <name>/
      current.json
      sources/<source-sha256>/product-description.md
      models/<revision>-<model-sha256>/product-model.json
      snapshots/<snapshot-sha256>/product-snapshot.json
      artifacts/<owner>/<artifact-id>/<revision>-<artifact-sha256>.json
      artifact-resources/
      contexts/prd/<material-sha256>/context.json
      contexts/prd/<material-sha256>/artifact-resources/
      ux/ux-spec.json
      design-language/design-language.json
      design-language/review-layout.json
      ui/ui-spec.json
      ui/components/<component-id>.json
      prd/                         # Default generated publication destination
```

Optional data appears only when needed. Preserve each writer's internal filenames and relative-path contracts; this rule changes their shared base directory, not the artifact schemas. Publication may use an explicitly requested export destination; it must not create a competing canonical data store there. Detached PRD contexts remain usable outside their originating repository.

## Keep the human source distinct

Keep an existing human-owned description at its supplied location. Do not move or duplicate it merely to place generated data under `product/<name>/`. When creating a new description, prefer `product/<name>/product-description.md` after establishing the name. Exact immutable source snapshots in `sources/` are evidence, not a second editable description.

Persist the original source's repository-relative label. For UX review, explicitly pass the repository root as `sourceRoot`, with the original repository-relative source path and exact description bytes, even when the data root is elsewhere. Do not infer source-root identity from the UX output directory. During an authorized reset, use the corresponding isolated staging root and its preserved source copy.

## Existing data, identity, and reset

Before writing an existing target, verify its stored product identity and current snapshot belong to the intended product. A folder name alone is not ownership evidence. Reject unrelated data and case-only folder collisions. Do not generate a new product ID on every call or create a second store merely because the source document moved.

A changed product name, existing data outside this layout, or an ambiguous association needs an explicit relocation/identity decision. Report the current and required paths; do not silently move, delete, merge, reset, or reparse existing history as a fresh product. This location rule does not authorize schema migration. Once an owner-chosen folder association is recorded, keep it stable until the owner deliberately changes it.

`reset-design` rebuilds into the same resolved canonical product root. If that root contains the human description or preserved resources, inventory and purge only the derived files and subdirectories; never delete the whole `product/<name>/` directory or the repository-wide `product/` directory. A root containing only proven derived data can be a single verified target. Fresh staging is temporary isolation, not another durable product store; install validated outputs back under the canonical root at completion.
