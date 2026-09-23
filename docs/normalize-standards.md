# Normalize Standards

See [Working with review agents](review-agents.md#configure-which-rules-apply) for concrete manifest and overlay examples, precedence, and validation guidance.

Use this skill to establish a repository's standards configuration or compare its local engineering rules with canonical standards. It reconciles rules and applicability rather than reviewing application code.

## Use it

```text
Use $normalize-standards audit for this repository.
```

After reviewing every proposed disposition and resolving outstanding choices:

```text
Use $normalize-standards reconcile using the reviewed reconciliation report.
```

## How standards are represented

The repository's `agents/topics/standards/manifest.md` defines named sets of canonical standards and assigns them to folders. The longest matching assignment governs a file. `overlay.md` contains local additions and replacements, with more specific replacement scopes taking precedence.

Canonical standards remain in the installed toolkit. Product facts and implementation decisions do not become engineering standards merely because they contain requirements.

Manifest links resolve local canonical files for skills and reviewers. The
generated `STANDARDS.md` uses GitHub links for human readers; copying those
URLs back into the manifest would change its input contract and is not the way
to configure applicability.

## Audit and reconciliation

Audit creates or refreshes a report with source references, behavioral differences, and recommended dispositions: retain local guidance, promote a reusable rule, remove redundancy, or defer a decision. Developer decisions start as pending.

Reconciliation requires manual review, resolved ambiguity, no pending decisions, and an explicit request to apply the decisions. The skill then changes only approved configuration and guidance and validates the result. Deferred items prevent declaring normalization complete.

## Result

Successful first normalization records a durable `normalization.json` completion marker and generates `STANDARDS.md`. Later standards changes do not make that marker stale or require repeating normalization. Edit the manifest or overlay for later applicability changes and refresh the guide; a later audit remains available when useful.

The workflow does not stage or commit its changes.

[Operational instructions](../skills/normalize-standards/SKILL.md) · [Standards guide](write-standards-guide.md) · [All skills](../README.md)
