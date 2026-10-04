# Folder Standards Manifest

Canonical links resolve through the installed Codex documentation directory to
this source-of-truth checkout. Folder sets govern source files; they do not
reinterpret quoted standards, fixtures, or skill instructions as application code.

## Standards Sets

### `base`

Extends: none
Standards:

- [documentation.md](../../../documentation/standards/documentation.md) — Repository governance, shared source conventions and toolchain ownership.
- [code-conventions.md](../../../documentation/standards/code-conventions.md) — Repository governance, shared source conventions and toolchain ownership.
- [project-foundation.md](../../../documentation/standards/project-foundation.md) — Repository governance, shared source conventions and toolchain ownership.

### `node-tooling`

Extends: base
Standards:

- [jsdoc.md](../../../documentation/standards/jsdoc.md) — Standalone JavaScript helpers and their tests.
- [types.md](../../../documentation/standards/types.md) — Standalone JavaScript helpers and their tests.
- [testing.md](../../../documentation/standards/testing.md) — Standalone JavaScript helpers and their tests.

### `component-templates`

Extends: node-tooling
Standards:

- [react.md](../../../documentation/standards/react.md) — Generated browser component sources and their harness.
- [mui.md](../../../documentation/standards/mui.md) — Generated browser component sources and their harness.
- [base-components.md](../../../documentation/standards/base-components.md) — Generated browser component sources and their harness.
- [accessibility.md](../../../documentation/standards/accessibility.md) — Generated browser component sources and their harness.
- [localization.md](../../../documentation/standards/localization.md) — Generated browser component sources and their harness.

### `socket-client-templates`

Extends: node-tooling
Standards:

- [polylith.md](../../../documentation/standards/polylith.md) — Generated client transport service and its contract.
- [socket-io.md](../../../documentation/standards/socket-io.md) — Generated client transport service and its contract.

### `socket-server-templates`

Extends: socket-client-templates
Standards:

- [server.md](../../../documentation/standards/server.md) — Generated server transport adapter and its tests.

## Folder Assignments

- `.` — `base` — Governance, package configuration, documentation and planning.
- `scripts/` — `node-tooling` — Repository installer tools.
- `skills/bootstrap/scripts/` — `node-tooling` — Topic-location discovery and bootstrap helpers.
- `tests/` — `node-tooling` — Repository tooling tests.
- `skills/create-app/scripts/` — `node-tooling` — Skill helper modules and colocated tests.
- `skills/generate-prd/scripts/` — `node-tooling` — Skill helper modules and colocated tests.
- `skills/generate-technical/scripts/` — `node-tooling` — Skill helper modules and colocated tests.
- `skills/initialize-project/scripts/` — `node-tooling` — Skill helper modules and colocated tests.
- `skills/normalize-standards/scripts/` — `node-tooling` — Skill helper modules and colocated tests.
- `skills/refine-design/scripts/` — `node-tooling` — Skill helper modules and colocated tests.
- `skills/refine-detail/scripts/` — `node-tooling` — Skill helper modules and colocated tests.
- `skills/reset-design/scripts/` — `node-tooling` — Skill helper modules and colocated tests.
- `skills/review-standards/scripts/` — `node-tooling` — Skill helper modules and colocated tests.
- `skills/write-standards-guide/scripts/` — `node-tooling` — Skill helper modules and colocated tests.
- `skills/initialize-project/assets/components/` — `component-templates` — Browser component scaffold sources.
- `skills/initialize-project/assets/socket-io/client/` — `socket-client-templates` — Client transport scaffold.
- `skills/initialize-project/assets/socket-io/server/` — `socket-server-templates` — Server transport scaffold.

## Repository Overlay

[overlay.md](./overlay.md) contains the local engineering-rule differences.
