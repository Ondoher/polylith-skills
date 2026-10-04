# Project Standards Handoff

Use this reference only after `initialize-project` or `create-app` has verified its generated project or app integration. Bootstrap owns standards finalization and readiness for both callers. Resolve the topics folder from root `AGENTS.md`; paths below are relative to that folder. `STANDARDS.md` stays at the repository root.

## Fresh Project

Initial attestation is allowed only when all evidence comes from the active initialization run:

- Preflight proved an empty/fresh target with no inherited local standards.
- Every standards metadata file was created by that run, and the inventory identifies those paths.
- The manifest selections match the engineer-approved normalized options and pass canonical-file, link, folder-assignment, and precedence validation.
- The overlay contains exactly `None.` and no local rules.
- Every applicable generated-project check passed.
- No normalization marker already exists.

If these conditions are not established, use the ordinary audit, manual-review, and reconcile recovery. Do not automatically normalize an existing repository.

1. Create `standards/reconciliation.md` from the global normalization skill's reconciliation template. Record fresh initialization with no inherited standards or divergences, identify the selected sets, link Standards Governance and root `STANDARDS.md`, mark configuration and precedence findings clear, and use phase/status `initialized`/`normalized`. Resolve links from the configured folder rather than assuming a fixed depth. Do not invent a developer decision or claim manual divergence review.
2. Create and validate the initial marker:

    ```text
    node <codex-root>/skills/normalize-standards/scripts/standards-attestation.mjs create --repo <repository>
    node <codex-root>/skills/normalize-standards/scripts/standards-attestation.mjs validate --repo <repository>
    ```

3. Record the attestation fingerprint in the reconciliation report. Format only that new report with the target's installed Prettier when formatting is configured.

On a retry after successful marker creation, validate and preserve the marker; resume guide/readiness work rather than creating it again. Missing evidence or an invalid marker requires ordinary normalization recovery.

## Existing Project

Validate the existing normalization marker using the same `validate` command above. Preserve its bytes and historical hashes after app folder assignments change. Preserve all existing overlay decisions. The app generator updates the manifest and reconciliation note; bootstrap does not invent mappings or override decisions.

## Shared Completion

Continue standard-profile bootstrap with current metadata. Reviewer preflight resolves canonical standards locally and initializes or refreshes the applicable roster. Initialization establishes readiness, not a repository-wide compliance audit.

Bootstrap's guide refresh uses the global writer; check the result before handoff:

```text
node <codex-root>/skills/write-standards-guide/scripts/standards-guide.mjs write --repo <repository> --codex-root <codex-root>
node <codex-root>/skills/write-standards-guide/scripts/standards-guide.mjs check --repo <repository> --codex-root <codex-root>
```

For a fresh project, record the guide-source fingerprint and current status in the reconciliation report, then format that report. Run the target's formatting check when configured so it covers the final report and guide; confirm the guide remains current. Do not rewrite unrelated project files.

Handoff requires a current root `STANDARDS.md`, valid normalization evidence, and applicable reviewer readiness. Report missing installed infrastructure or other gate failures precisely; do not silently switch a generated project to `instructions-only`. A guide failure does not invalidate an already valid normalization marker, but project finalization remains incomplete. Preserve partial output for recovery.
