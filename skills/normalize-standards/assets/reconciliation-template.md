# Standards Reconciliation

## Status

- Repository:
- Canonical standards root:
- Standards governance: [Standards Governance](documentation.md-link-from-the-repository-manifest)
- Generated developer guide: [STANDARDS.md](../../../STANDARDS.md)
- Audit date:
- Audit basis:
- Phase: `awaiting-developer-review`

## Summary

| Recommended disposition | Count |
| ----------------------- | ----: |
| `promote-global`        |     0 |
| `add-local`             |     0 |
| `replace-local`         |     0 |
| `remove-local`          |     0 |
| `already-covered`       |     0 |
| `defer`                 |     0 |

## Divergences

### DIV-001: Brief descriptive title

- Canonical source:
- Repository source:
- Canonical rule:
- Repository rule:
- Behavioral difference:
- Information at risk:
- Agent recommendation:
- Recommendation rationale:
- Developer decision: `pending`
- Developer notes:
- Re-review required: `no`
- Reconciliation result:
- Validation evidence:

## Configuration and reference findings

- Missing applicable standards:
- Invalid or ambiguous standards sets or folder assignments:
- Missing or malformed overlay:
- Invalid overlay targets or scopes:
- Nonspecific or unselected override targets:
- Invalid folder-scoped overlay entries:
- Conflicting applicable folder overrides:
- Misplaced standards outside the overlay:
- Local standards without canonical counterparts:
- Broken references:
- Ambiguous precedence:
- Competing local sources:

## Review gate

- [ ] Every divergence has been reviewed manually.
- [ ] No developer decision remains `pending`.
- [ ] Decision-specific clarification is sufficient.
- [ ] No source or precedence ambiguity remains.
- [ ] The developer has explicitly requested reconciliation.

## Generated developer guide

Generate or refresh the root `STANDARDS.md` only after the final normalization attestation validates. Run `$write-standards-guide`, then its read-only check mode. The guide is derived developer reference and does not affect normalization status.

- Guide status: `not-generated`
- Guide source fingerprint:
- Guide validation evidence:

## Final validation

- [ ] Every approved decision was applied exactly as recorded.
- [ ] No pending decision was applied.
- [ ] Canonical standards contain no repository-specific leakage.
- [ ] The repository manifest defines valid named sets, includes a root assignment, maps every configured folder deterministically, and links the overlay.
- [ ] Every retained local engineering rule appears exactly once in the overlay as `ADD` or `REPLACE`.
- [ ] Every overlay entry targets a selected canonical section as `filename.md#section`.
- [ ] Every folder-scoped entry resolves and specificity produces one applicable replacement per file and target.
- [ ] Superseded local standards are no longer accidentally authoritative.
- [ ] Standards references resolve.
- [ ] Re-audit has no unexplained divergences.
- [ ] After attestation validation, `STANDARDS.md` was generated or refreshed and its check mode reports `current`.

Normalization status: `not-reconciled`
