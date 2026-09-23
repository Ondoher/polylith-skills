---
name: normalize-standards
description: Audit and reconcile repository-local folder standards mappings and rule overlays against canonical Codex standards. Use for standards normalization or comparison, not ordinary code-compliance review.
---

# Normalize Standards

Perform a repository's required first standards normalization without losing useful local guidance. Discovery and reconciliation are separate, manually gated phases. After a successful first normalization, the durable marker remains valid permanently; later manifest, overlay, instruction, or canonical-standard changes do not require another normalization.

## Sources And Scope

1. Resolve the repository and Codex roots.
2. Read applicable Codex-home and repository `AGENTS.md` instructions and routed work context.
3. Treat `<codex-root>/documentation/standards` as the canonical standards root.
4. Treat `agents/topics/standards/manifest.md` as the sole applicability authority. It defines named standards sets and assigns them to repository folders.
5. Treat `agents/topics/standards/overlay.md` as the sole repository authority for local engineering-rule additions and replacements.
6. Treat root `STANDARDS.md` as a generated developer view only when it bears the exact generator warning.
7. Report standards authority found elsewhere as misplaced. Do not classify product, design, or implementation facts as standards merely because they contain requirements.

Canonical [`documentation.md`](../../documentation/standards/documentation.md) defines the exact manifest, folder, set-inheritance, overlay, and precedence rules. Use the shared `scripts/standards-config.mjs` parser rather than inventing another interpretation.

For each file, the longest matching folder assignment selects one named set. Expand that set's inheritance chain. Apply matching `ADD` entries. For one target with multiple matching `REPLACE` entries, the longest folder scope wins; repository scope is least specific. Topics never select, exclude, add, or replace standards.

This skill reconciles standards documentation and configuration. It does not audit application code for compliance.

## Select The Phase

- Use **audit** when the repository has never normalized, no fully reviewed report exists for that first normalization, the user explicitly asks to find divergences, configuration uses the obsolete topic model, or the phase is ambiguous.
- Use **reconcile** only after the developer manually reviews the current report and explicitly requests reconciliation.
- Silence, a blank decision, invocation, or an agent recommendation is not approval.

## Audit Phase

Audit is non-destructive. Its only permitted content change is creating or refreshing `agents/topics/standards/reconciliation.md`, unless repository instructions name another report.

Compare standards semantically. For each divergence:

1. Assign a stable identifier.
2. Cite canonical and repository sources precisely.
3. Describe both rules neutrally.
4. Explain behavioral differences and possible information loss.
5. Recommend exactly one disposition: `promote-global`, `add-local`, `replace-local`, `remove-local`, `already-covered`, or `defer`.
6. Leave `Developer decision` as `pending`.

Also report:

- missing, malformed, cyclic, or unused standards sets;
- missing root assignment, duplicate assignments, nonexistent folders, invalid paths, or glob syntax;
- folders whose assigned set omits an evident capability standard;
- obsolete `## Applicable Files`, `## Standards Review Scope`, or `Scope: topic:...` configuration;
- canonical links outside the global standards root or conflicting links for one standard;
- malformed overlays, document-wide targets, targets absent from all sets, invalid folder scopes, and duplicate equal-scope replacements;
- semantically incompatible matching additions or replacements;
- standards prose outside the overlay, broken references, and competing local sources.

Use [the reconciliation template](assets/reconciliation-template.md). Link its governance field to canonical `documentation.md`. Preserve developer decisions unless new evidence materially changes an item, in which case mark it for re-review.

Audit mode never creates or refreshes `normalization.json`.

## Manual Review Gate

Reconciliation requires:

- no `pending` decision;
- clarification for decisions differing from recommendations;
- no unresolved source, folder, or precedence ambiguity; and
- an explicit request to reconcile.

Otherwise stop and identify the exact unresolved items.

## Reconcile Phase

Re-read all sources and confirm the report remains current. Apply only recorded decisions:

- `promote-global`: update the canonical document without repository leakage.
- `add-local`: create one section-specific `ADD` using `repository` or `folder:<path>/` scope.
- `replace-local`: create one section-specific `REPLACE` using a valid folder scope.
- `already-covered`: replace redundant prose with a canonical reference.
- `remove-local`: remove the approved obsolete rule or topic-based control and repair references.
- `defer`: preserve sources and report the repository as not fully normalized.

For applicability decisions, create or reuse named standards sets and assign them to the narrowest stable folder boundaries. Keep the required root `.` assignment. Use set inheritance for shared bases; do not use topic identities or globs as substitutes for folders.

After editing, validate:

- all approved decisions and only those decisions were applied;
- every set is valid and acyclic and repeats no inherited standard;
- every canonical link resolves beneath the global standards root;
- the root assignment exists and every assigned folder exists;
- every repository file has a deterministic longest matching assignment;
- the union of named sets covers intended repository capabilities without defensive over-selection;
- every local engineering rule appears once in the overlay;
- overlay targets name selected canonical sections and folder scopes exist;
- specificity produces one replacement per file and target;
- no topic standards controls or competing authorities remain;
- references resolve; and
- a repeated audit yields no unexplained divergence except approved deferrals.

Do not declare normalization complete while anything is pending, ambiguous, or deferred.

## Attestation And Guide

After the repository's successful first reconciliation with zero pending, ambiguous, or deferred items:

1. Enumerate the complete audited repository-owned standards surface, including applicable `AGENTS.md`, manifest, and overlay.
2. Run `node <this-skill>/scripts/standards-attestation.mjs create --repo <repository-root>` with additional `--input` values only for audited authorities not automatically discovered.
3. Run the helper in `validate` mode and record its fingerprint and input count in the report.
4. Run `write-standards-guide` in write then check mode and record its source fingerprint.
5. Never stage or commit these files.

The helper validates the folder manifest and overlay using `standards-config.mjs`, verifies assigned and overlay-scoped folders exist, records the initially reviewed repository authority, and writes `normalization.json`. Validation later checks only that this durable completion marker is structurally valid; historical input hashes are provenance and never become a freshness gate.

Only first reconciliation may create the marker for an existing repository. Do not refresh or revoke it for later standards changes. `initialize-project` retains the narrow exception for a fresh project whose complete standards configuration it just generated from explicit choices with an empty overlay.

## After First Normalization

Edit the manifest or overlay directly when repository applicability or local rules change. Preserve their syntax, then refresh `STANDARDS.md`; no audit, manual divergence review, reconciliation, or attestation update is required. An explicitly requested later audit remains available as advice, but it does not gate reviewers.
