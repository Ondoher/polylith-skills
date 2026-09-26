# Standards Reconciliation

## Status

- Repository: `polylith-skills`.
- Canonical standards root: the installed Codex documentation link, which resolves to this checkout's `documentation/standards/`.
- Standards governance: [Standards Governance](../../../documentation/standards/documentation.md).
- Audit date: 2026-09-26.
- Audit basis: root and Codex instructions, package scripts, managed catalog, helper/test directories, scaffold assets, canonical governance and subject standards.
- Phase: `normalized`.
- Owner authorization: "install prettier and what ever actions are needed to remove the check-point gate" The owner previously delegated routine implementation decisions. Concrete dispositions below are the assistant's review under that authorization; this is not a claim of separate per-item manual owner review.

## Findings and decisions

### DIV-001: Missing repository standards configuration

- Canonical source: [Required Repository Shape](../../../documentation/standards/documentation.md#required-repository-shape).
- Repository source: root `AGENTS.md`, `governance.json`, and absent `agents/topics/standards/` configuration.
- Difference: engineering standards are authored here, but this repository has no folder applicability manifest, overlay or initial normalization record.
- Information at risk: indiscriminate application of browser/server standards to Node tooling, or omission of actual scaffold-template capabilities.
- Recommendation: `already-covered`; create the configuration required by canonical governance, referencing the original standards rather than copying them.
- Decision: apply under the owner's setup authorization. Use a governance/base set, a Node tooling set, and explicit browser-component and socket scaffold sets. Templates and examples retain their own relevant capabilities; document content is not application code.
- Reconciliation result: manifest applied; validation below.

### DIV-002: Standalone Node modules use explicit .mjs extensions

- Canonical source: [JavaScript And Module Shape](../../../documentation/standards/code-conventions.md#javascript-and-module-shape).
- Repository source: `scripts/*.mjs`, skill `scripts/*.mjs`, and root package without a package-wide `type: module` switch.
- Difference: the established tooling uses explicit `.mjs` instead of only `.js`/`.jsx` runtime imports.
- Information at risk: renaming public CLI paths or changing module loading merely to normalize configuration.
- Recommendation: `replace-local`, limited to module-extension selection; retain the rest of the canonical section.
- Decision: preserve explicit `.mjs` for standalone tools; scaffold runtime extensions retain their own contracts.
- Reconciliation result: overlay applied; validation below.

### DIV-003: Preserve the tooling test runner

- Canonical source: [Purpose And Lanes](../../../documentation/standards/testing.md#purpose-and-lanes).
- Repository source: root and skill package scripts use Node's built-in test runner; scaffold templates use their generated application's runner.
- Difference: a repository-specific toolchain choice needs an explicit local home; the exploratory Jasmine example must not be used to migrate these tools or their named test tiers.
- Information at risk: replacing established tests and runners while setting up checkpoint prerequisites.
- Recommendation: `add-local`; record the existing tooling runner while retaining canonical behavior, fixture, cleanup and coverage obligations.
- Decision: preserve Node's built-in runner for repository tooling and the existing runner contracts of scaffold assets.
- Reconciliation result: overlay applied; validation below.

## Configuration review

No pre-existing manifest, overlay, local standards fork or active-topic standards selection was found. The canonical documentation in this repository is the installed standards source, not a competing repository copy. `governance.json` is the managed-package catalog; skill and agent contracts are the product this repository ships. Their instructions and test data are not local engineering-rule overrides.

The root `AGENTS.md` catalog, installation ownership and dependency-restoration requirements are repository operating instructions and remain intact. The active work will route to the saved refinement-efficiency plan without copying its requirements.

Mappings cover Node helper code and tests, browser component templates, and socket client/server templates. No application shell, deployed HTTP application, or application database is created by this setup. Product-document records use authoring/schema contracts; this task does not reinterpret them as application database entities or introduce a data migration.

## Validation

Folder sets, assignments, overlay targets and canonical links validate. The generated guide's write and check commands pass, including canonical-link boundary validation. The rules inventory accepts every formatted canonical standard. A repeated configuration review found no unexplained divergence or deferred decision.

The first normalization marker validates with fingerprint `sha256:1c4e9a928f2eae7e7ce835c2231e3400d76b5618b0adbb651333df2bb4b795e0`. Its 24 recorded inputs preserve the audited authorities. The guide source fingerprint is `sha256:337c15838397f25e58ea031288071274e4e9bce2e164e8d277c9a9ee750fa0b5`.

Formatting preflight and `npm run format:check` pass. The tooling suite passed 168 tests; the focused normalization/refinement suite passed 21. The attestation scanner now excludes temporary `.codex-tmp` captures so they cannot become standards authority, with a regression check preserving genuine subtree instructions.

Normalization concerns standards configuration, not a claim that all source code or existing tests comply. Reviewer calibration and adviser activation are recorded with the active implementation plan; the inherited package-fixture failures remain separate.
