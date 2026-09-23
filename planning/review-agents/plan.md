# Review Agents Implementation Plan


## Current Direction

The system uses folder-based standards applicability. Topic-based standards exclusions and topic-scoped overrides are removed.

## Implemented Work

1. Define canonical folder-manifest grammar with reusable named sets.
2. Require a root assignment and deterministic longest-folder matching.
3. Define set inheritance with cycle, duplicate, and conflicting-link validation.
4. Restrict local overlay scopes to `repository` and `folder:<path>/`.
5. Give the most-specific matching folder replacement deterministic precedence while accumulating additions.
6. Centralize parsing and path resolution in a shared helper.
7. Add a review helper that returns per-path sets, standards, and overlay rules.
8. Replace topic-context fingerprint naming with review-context fingerprint naming while retaining topics as non-authoritative work context.
9. Update normalization, guide generation, initialization, review orchestration, and reviewer definitions.
10. Provide consumer normalization, attestation, and generated-guide workflows.
11. Pin every reviewer lane and the checkpoint adviser to `gpt-5.6-terra`; use `medium` reasoning for architecture and privacy/security and `low` for the remaining roles, and make those pins part of infrastructure validation.

## Maintained verification

These are verification areas supported by the tooling, not claims of new runs during this planning cleanup.

- Shared manifest/overlay parser behavioral tests.
- Normalization attestation create and validate round trip.
- Generated guide write and current check.
- Initializer regression suite and representative generated manifest validation.
- Review and initialization skill package validation.
- Consumer formatting and Markdown-link checks.

## Deferred Pilot Tuning

- Whether large repositories need multiple manifest files composed by folder.
- Whether a persistent path-to-set cache is worthwhile after measured review cost.
- Whether pilot measurements justify changing a specific lane from its pinned `gpt-5.6-terra` reasoning baseline.
