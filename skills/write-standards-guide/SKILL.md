---
name: write-standards-guide
description: Generate or check repository-root STANDARDS.md from normalized folder standards sets, folder assignments, and repository overlay entries. Use for the human-readable guide, not standards authoring or reconciliation.
---

# Write Standards Guide

## Shared MCP operations

When configured `workflow_*` tools are available, use standards.guide. Use the existing owned guide CLI to write/check STANDARDS.md from the same validated inputs; the service result retains the generated content and provenance. Read `documentation/workflows/mcp.md` under the governance checkout (the parent of the physical Codex documentation directory) for the shared protocol. Inspect exact operation inputs with `workflow_catalog`; keep large results in handles and pass them with `inputHandles`. Specialists use only parent-issued assignment capabilities and return handles/paths. Reuse completed data and repair affected units rather than restarting. The maintained CLI instructions below remain bootstrap/recovery or explicitly retained host routes; do not generate ad hoc wrapper scripts for operations provided by the service.

Generate a deterministic developer reference without creating another standards authority.

## Authority Boundary

Resolve the topics folder from root `AGENTS.md` through the standalone `Topics folder:` directive, defaulting to `.agents/topics`. Paths below describe that default and use the selected folder when an exception exists. Read the durable marker and current manifest/overlay under that folder; the marker's original manifest path is historical provenance and does not override current topic-location configuration.

Effective rules come only from canonical global standards, the named sets and folder assignments in `.agents/topics/standards/manifest.md`, and matching `ADD` or `REPLACE` entries in `.agents/topics/standards/overlay.md`. Topics and generated output do not affect standards selection.

Do not generate unless the durable ever-normalized marker validates. Current changes never make that marker stale. A missing or stale guide does not invalidate normalization; bootstrap and review workflows refresh it automatically before reviewers start.

## Modes

- `write` creates or replaces only `<repository-root>/STANDARDS.md`. Fresh-project initialization, standard bootstrap, and reviewer preflight have standing authorization to invoke this mode after the durable marker validates.
- `check` is read-only and reports `missing`, `stale`, or `current`.

Run:

```text
node <this-skill>/scripts/standards-guide.mjs <write|check> --repo <repository-root> --codex-root <codex-root>
```

The helper uses the shared folder-standards parser, validates canonical links, and renders:

- the first-normalized date and separate repository-configuration, local-overlay, selected-canonical, and combined source fingerprints;
- every named set, its parent, and canonical standards it adds;
- folder-to-set assignments;
- repository-wide overlay entries; and
- folder-specific overlay entries.

The helper formats `STANDARDS.md` with the target repository's installed Prettier and resolved configuration in both `write` and `check` modes. The formatted bytes are the deterministic guide content. Install declared repository dependencies before invoking it; a declared but unavailable formatter blocks publication.

Canonical standards links, including governance and overlay section targets, use GitHub URLs derived from the owning checkout's `governance.json` (`repository.canonicalRemote`, `repository.defaultBranch`, and the physical standards path). Resolve that checkout through the real installed documentation path so Codex-home junctions and symlinks work. Missing or invalid publication metadata is an error; do not silently emit machine-local links. Repository manifest and overlay links remain repository-relative.

Read and hash canonical files locally exactly as before. The generated guide explains that GitHub shows the latest published branch while its fingerprints describe local inputs, which may be unpublished. Include publication metadata in the guide source fingerprint so a repository or branch change makes the guide stale. Publication uses `update-standards`; this generator neither commits nor pushes and never fetches remote standards.

The output begins with an explicit generated-reference warning that says not to modify the file directly. It also provides this copyable prompt for immediate regeneration: `Use $write-standards-guide to update this repository's generated STANDARDS.md now.` It copies local overlay rules for developer readability, but the overlay remains authoritative.

When explicitly invoked in `check` mode, report whether the guide is current. Bootstrap and review preflight use `write` mode automatically; ordinary guide checks remain read-only. Never stage or commit the guide.
