# Write Standards Guide

Use this skill to generate or check root `STANDARDS.md`, the developer reference for a repository's effective standards configuration.

## Use it

```text
Use $write-standards-guide to update this repository's generated STANDARDS.md now.
```

For a read-only freshness check:

```text
Use $write-standards-guide in check mode.
```

## What it produces

The guide lists named sets and inheritance, folder assignments, repository-wide rules, and folder-specific additions and replacements. It records the first-normalized date and fingerprints of current configuration, overlays, and selected canonical standards.

Links to canonical standards open their GitHub pages on the repository's configured publication branch. Local additions and replacements link directly to the relevant canonical section. The manifest and overlay themselves retain repository-relative links. Readers can follow the canonical links without installing this toolkit, provided they have access to the GitHub repository.

The generator still reads and hashes the local canonical files; GitHub is the human reading surface, not runtime standards authority. Local unpublished edits may differ from what a link currently shows. Use [update-standards](update-standards.md) to commit and publish the governance checkout. Existing links then show the new branch contents without being rewritten. Regenerate the guide when its mappings, local input fingerprints, or publication destination change.

Generation requires a valid initial normalization marker. A missing or stale guide does not invalidate that marker. Standard bootstrap and review preflight refresh the guide automatically.

## Authority and scope

`write` creates or replaces only root `STANDARDS.md`. `check` changes nothing and reports missing, stale, or current. Neither mode stages or commits output.

The guide is a generated reference, not another source of rules. Change canonical standards, the manifest, or the overlay, then regenerate. Do not edit generated content directly.

[Operational instructions](../skills/write-standards-guide/SKILL.md) · [Normalization](normalize-standards.md) · [All skills](../README.md)
