# Update Canonical Standard

Use this skill when a proven local engineering rule should become shared policy, or when you have an explicit change to a canonical standard.

## Use it

```text
Use $update-canonical-standard to promote the active <standard/section> override for <folder> into the canonical standard.
```

Provide the target standard, section or rule ID, and an affected path. You can explicitly supply alternative rule text instead of promoting an existing override.

## What happens

The skill resolves the rules governing the selected path, including inherited standards and the most specific replacement. It promotes the requirement in broadly reusable terms, removing repository-specific names and paths without silently changing meaning.

Existing rule IDs remain stable. An explicitly supplied new ID creates a new rule; an existing ID targets that rule for revision. Connected rules and references are updated as needed for coherent guidance.

Once the canonical rule fully expresses the local requirement, the redundant overlay entry is removed. A still-needed local difference remains with an explanation. Other canonical rules are not removed merely because they might now be redundant unless removal was requested.

## Validation and reach

The workflow checks the rule inventory, resolves the affected path again, refreshes relevant reviewer context, and regenerates the current repository's standards guide. It does not require repeating normalization or change manifests simply to force adoption.

This edits shared authority in the governance checkout and can affect every repository selecting that standard. Staging, committing, and publishing are separate actions requiring their own authorization.

When ready to publish, use [update-standards](update-standards.md). It reviews and commits the complete governance checkout, then pushes to its configured GitHub branch so existing standards-guide links display the published rules.

[Operational instructions](../skills/update-canonical-standard/SKILL.md) · [Standards guide](write-standards-guide.md) · [All skills](../README.md)
