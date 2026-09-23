# Publication behavior

The publisher validates and renders entirely in memory before it creates or changes the output directory. It applies the product-context contract's shared 2 MiB aggregate byte limit to the exact input file before parsing. A malformed, oversized, structurally invalid, or digest-mismatched context cannot alter an existing publication.

## Output

- Without a `prd-publication` manifest, `index.html` contains the persisted orientation, users, capabilities, gaps, current artifact coverage, partial-artifact gaps, unavailable-artifact exclusions, locks, scope, and binding metadata. Generic payloads remain escaped deterministic inspection blocks.
- Exactly one `prd-publication` manifest selects the full site. Its exact dependencies identify one UX 0.2 artifact, one design-language 0.14 artifact containing review-layout 7, an optional UI-composition 0.2 artifact, and ordered component-design 0.2 artifacts. The publisher uses the copied product-neutral renderers to emit linked requirements, design-language, component-state, product-comp, component-comp, asset, and diagnostic pages. It does not consult another installed skill.
- `publication-receipt.json` binds the exact context-byte hash and material hash to the source snapshot ID and revision, product model, generator version, every recursively emitted file's path/size/hash, and every consumed resource descriptor.

No output contains a generation timestamp or absolute path. Repeated publication of the same context therefore produces the same bytes in every output file.

## Replacement

The command stages a complete publication beside the destination and then swaps directories. It may replace:

- an absent destination;
- an empty destination; or
- a destination with the exact supported `generate-prd` publication shape and internally consistent receipt and file hashes.

It refuses an input or output path with any existing symbolic-link or junction component, a destination containing additional files or directories, or an output directory that contains the input context. After checking those components, it resolves the physical paths and uses them for the read and publication transaction. A recognized publication requires a closed receipt from the supported generator version. A recursive link-safe walk must match exactly the receipt's files and their implied directories, and every stored size and hash must match. A failed swap attempts to restore the prior directory. Once the staged publication has been installed, failure to delete the backup cannot roll back the valid new output.

The receipt is integrity metadata rather than authenticated provenance. A process with write access to the destination can construct a format-shaped directory and a matching receipt, which the generator will treat as replaceable. Use a dedicated output directory with appropriate filesystem permissions; do not use the receipt as proof of author identity.

Staged files are flushed before directory swaps, and directory entries are flushed on platforms that support directory synchronization. On startup the generator inspects only its exact reserved sibling names. If output is absent, it restores one valid backup and removes an optional complete stage only when both share the transaction ID. A backup may be the empty destination that the command was explicitly allowed to replace. With valid or explicitly allowed empty installed output, it removes at most one complete stale stage or validated backup. Invalid, multiple, mismatched, linked, malformed, and stage-only states fail without deleting candidates.

Run only one publisher for a given output directory at a time. The publisher uses fail-closed recovery rather than a cross-process output lock; concurrent publishers can see each other's live staging directory as an ambiguous interruption.

## Boundaries

Publication never:

- opens `product-description.md` or another provenance source;
- invokes an agent or research tool;
- follows record identifiers as paths;
- reads structured sources or arbitrary asset trees named by an artifact;
- supplies missing product facts or design defaults;
- mutates the PRD context.
- renders payload content for an artifact listed only as stale, locked-conflict, or superseded.

The only external bytes it may read are first-class resource descriptors from included publication artifacts. Their paths are content-addressed siblings under the exact persisted context directory, and publication verifies ordinary-file status, containment, media signature, byte length, and digest before rendering. See [product-publication.md](product-publication.md).

Return missing or invalid information to the producer of the context. Do not repair it in generated HTML.
