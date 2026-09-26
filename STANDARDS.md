# Repository Engineering Standards

> **Generated developer reference.** Do not modify this file directly or use it as standards authority.
>
> To update it now, tell Codex: `Use $write-standards-guide to update this repository's generated STANDARDS.md now.`

## Authority and provenance

- Folder manifest: [`agents/topics/standards/manifest.md`](./agents/topics/standards/manifest.md)
- Repository overlay: [`agents/topics/standards/overlay.md`](./agents/topics/standards/overlay.md)
- Standards governance: [`documentation.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/documentation.md)
- First normalized: `2026-09-26T19:46:12.665Z`
- Repository standards configuration fingerprint: `sha256:a538031acdb995f0e53669375b076aa77a644df75431ebcb98a3322d8a49123b`
- Local standards overlay fingerprint: `sha256:0cd23bf5c1aa033f890f9cc0ac9ef50fc6a341f8544291f922d6bd2c3fe596ab`
- Selected canonical standards fingerprint: `sha256:5eb4182a501a017aa97a527eacf08d13dceda07968cf80687fdf11efd62cc2f1`
- Guide source fingerprint: `sha256:337c15838397f25e58ea031288071274e4e9bce2e164e8d277c9a9ee750fa0b5`

For each file, the longest matching folder assignment selects one named standards set. The set includes its inherited canonical standards, then matching folder-scoped overlay rules modify specific sections. This file is a readable projection only.

Canonical links open the configured GitHub branch and show its latest published standards. Skills and reviewers still read local canonical files; the fingerprints above describe those local inputs, which may contain unpublished changes. Publish the governance checkout with `update-standards` to update the linked documents. Private repositories require GitHub access.

## Standards sets

### `base`

Extends: `none`

Adds:

- [`documentation.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/documentation.md) — Repository governance, shared source conventions and toolchain ownership.
- [`code-conventions.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/code-conventions.md) — Repository governance, shared source conventions and toolchain ownership.
- [`project-foundation.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/project-foundation.md) — Repository governance, shared source conventions and toolchain ownership.

### `node-tooling`

Extends: `base`

Adds:

- [`jsdoc.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/jsdoc.md) — Standalone JavaScript helpers and their tests.
- [`types.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/types.md) — Standalone JavaScript helpers and their tests.
- [`testing.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/testing.md) — Standalone JavaScript helpers and their tests.

### `component-templates`

Extends: `node-tooling`

Adds:

- [`react.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/react.md) — Generated browser component sources and their harness.
- [`mui.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/mui.md) — Generated browser component sources and their harness.
- [`base-components.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/base-components.md) — Generated browser component sources and their harness.
- [`accessibility.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/accessibility.md) — Generated browser component sources and their harness.
- [`localization.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/localization.md) — Generated browser component sources and their harness.

### `socket-client-templates`

Extends: `node-tooling`

Adds:

- [`polylith.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/polylith.md) — Generated client transport service and its contract.
- [`socket-io.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/socket-io.md) — Generated client transport service and its contract.

### `socket-server-templates`

Extends: `socket-client-templates`

Adds:

- [`server.md`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/server.md) — Generated server transport adapter and its tests.

## Folder assignments

- `.` → `base` — Governance, package configuration, documentation and planning.
- `scripts/` → `node-tooling` — Repository installer tools.
- `tests/` → `node-tooling` — Repository tooling tests.
- `skills/create-app/scripts/` → `node-tooling` — Skill helper modules and colocated tests.
- `skills/generate-prd/scripts/` → `node-tooling` — Skill helper modules and colocated tests.
- `skills/generate-technical/scripts/` → `node-tooling` — Skill helper modules and colocated tests.
- `skills/initialize-project/scripts/` → `node-tooling` — Skill helper modules and colocated tests.
- `skills/normalize-standards/scripts/` → `node-tooling` — Skill helper modules and colocated tests.
- `skills/refine-design/scripts/` → `node-tooling` — Skill helper modules and colocated tests.
- `skills/refine-detail/scripts/` → `node-tooling` — Skill helper modules and colocated tests.
- `skills/reset-design/scripts/` → `node-tooling` — Skill helper modules and colocated tests.
- `skills/review-standards/scripts/` → `node-tooling` — Skill helper modules and colocated tests.
- `skills/write-standards-guide/scripts/` → `node-tooling` — Skill helper modules and colocated tests.
- `skills/initialize-project/assets/components/` → `component-templates` — Browser component scaffold sources.
- `skills/initialize-project/assets/socket-io/client/` → `socket-client-templates` — Client transport scaffold.
- `skills/initialize-project/assets/socket-io/server/` → `socket-server-templates` — Server transport scaffold.

## Repository-wide additions and replacements

### REPLACE: Standalone tooling module extensions

- Replaces: [`code-conventions.md#JavaScript And Module Shape`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/code-conventions.md#javascript-and-module-shape)
- Scope: `repository`
- Rule: For this repository's standalone Node helper and test modules, use JavaScript ESM with explicit .mjs runtime imports. Preserve .js and .jsx where the scaffold or host contract selects them. Retain every other obligation in the canonical JavaScript And Module Shape section, including indentation, naming, module ownership and parameter conventions.
- Reason: Existing public CLI paths and the package's module-loading behavior use .mjs; configuring standards must not rename those interfaces or change host loading.

### ADD: Tooling test runner

- Extends: [`testing.md#Purpose And Lanes`](https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/testing.md#purpose-and-lanes)
- Scope: `repository`
- Rule: Run this repository's standalone helper and installer tests with Node's built-in node:test runner through the existing named package scripts. Keep scaffold component and transport tests on their generated application's declared runner. Preserve the canonical behavior, determinism, cleanup, fixture and coverage requirements.
- Reason: These are established toolchain contracts for maintained tooling and generated templates, not a new exploratory application.

## Folder-specific additions and replacements

None.
