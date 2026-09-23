# Application Scaffolding


This topic records the design and implementation of the global `initialize-project` and `create-app` skills. Polylith 1.3.0 completed the release gate for the refined deployment-entry contract used by both workflows.

## Authority And Release Gate

- [Polylith](https://github.com/Ondoher/polylith) is the authoritative implementation for Polylith behavior.
- These repository references are global implementation notes only. Never copy their names, absolute paths, or cross-repository file links into a generated project.
- Polylith 1.3.0 is the minimum published version that supports `deployment.setup(context, isMaster)`.
- Test generated projects against the published package rather than a local-source fallback.

## Implemented `initialize-project` Update

The release-gated option-model and generation update implements the following behavior:

1. Record universal master capability separately from repository discovery posture. Every repository runs as master during its own development and standalone deployment. Ask whether it hosts only local apps, may also be discovered by another active master, or is a hosting/server-root repository that discovers other repositories and may contain resident apps. Determine posture from discovery and hosting responsibility, not app count, the `multiple` flag, or master capability.
2. Separate project/package identity from initial application identity. Collect and normalize the project name and package slug, application name and slug, and application mount as distinct facts, even when defaults make them equal.
3. Generate a repository-owned `deployment.setup` entry point when applicable and reference it from `polylith.json`. It must implement the published `setup(context, isMaster)` contract, attach the supplied installation registry for local service access, avoid invented installation services, and support `isMaster: true` in every repository. A discoverable repository must also support `isMaster: false`; gate genuinely master-only work with that argument.
4. Update generated app-router entry points to accept the explicitly supplied installation registry and verify that setup and router initialization receive the same registry.
5. Keep execution and composition mounts distinct. An app defaults to `/` when its repository runs as master by itself. When the repository is composed beneath another master, a discoverable app defaults to `/<app-slug>` unless the engineer selects another valid composed mount. An initial resident root app in a hosting repository also defaults to `/`.
6. Generate folder standards assignments at application boundaries so later sibling apps can select different standards. Prefer `src/<app-slug>/` and, where applicable, `server/<app-slug>/` assignments rather than assuming every future app inherits one `src/` or `server/` selection.
7. Update generated foundation, architecture, server, shell, and testing topics to record deployment role, application catalog, per-app paths and commands, mounts, discovery ownership, and the deployment setup entry point without conflating package and app identity.
8. Remove application-slug prefixes from app-local registry service names. Retain app scoping only for shared transport paths such as Socket.IO namespaces and deployment mounts.
9. Make test and coverage generation app-aware. Root tests cover locally owned apps and host lanes, never discovered repositories. Keep browser, server, and coverage destinations non-colliding by application.
10. Expand normalization, scaffold planning, project validation, generated-file checks, and behavioral tests for local-only, discoverable, and hosting-with-resident-app repository postures, including master execution for every posture.
11. Exercise the published deployment contract: active-master-first setup, one setup call per selected repository rather than per app, shared installation-registry identity, correct `serverRoot`/`appRoot`/configuration context, every repository's master execution, both `isMaster` values for discoverable repositories, omission during build/test/non-serving watch, and failure before router initialization.
12. Run isolated end-to-end initialization trials against the published Polylith package for every supported deployment role and option combination affected by the change.
13. Verify generated source, configuration, documentation, manifests, comments, fixtures, and tests contain no names, absolute paths, or file links from repositories consulted as implementation references.

## Implemented `create-app` Skill

`create-app` is the conceptual owner of application generation. It exposes a deterministic application option schema plus planning, application, and validation primitives that `initialize-project` also uses. A second set of app templates, normalization rules, or validators must not be added to `initialize-project`; the direct module boundary enforces the shared contract.

The shared application engine must support two explicit modes:

- `initial-app`: called by `initialize-project` after it has performed fresh-repository preflight, collected repository identity and deployment posture, and established repository-wide infrastructure. This mode may establish the initial application catalog and defaults.
- `existing-project`: called by `create-app` after it has verified an established compatible repository and inspected its capabilities. This mode must make additive, app-scoped changes and deliberately update shared catalogs or configuration without reinitializing repository infrastructure.

`initialize-project` continues to own repository creation, root dependency and tool configuration, deployment-posture selection, initial standards normalization, and final whole-project verification. `create-app` owns application choices and the reusable machinery that produces app folders, build configuration, mounts, routes, tests, documentation, and folder standards assignments. Each skill retains its own preflight and handoff behavior around the shared engine.

The skill preserves all applicable application-initialization options while integrating with an established repository. It distinguishes:

- a new resident app added to a hosting/server-root repository;
- a new local app added to an application repository of any discovery posture; and
- repository capabilities that should be reused or deliberately extended rather than installed in parallel.

It must update the existing app catalog, build and mount configuration, app-scoped server entry points, package scripts, tests, coverage, documentation, folder standards mappings, reconciliation artifacts, and generated developer guide without reinitializing repository-wide infrastructure or overwriting unrelated files.

Test the shared engine once against both modes, then run workflow-level tests for the boundaries unique to each skill. Verify that equivalent application choices produce equivalent app-owned artifacts in both modes, while repository-owned files differ only where initial creation and established-project integration require it. Neither mode may emit paths or names from repositories used as global implementation references.

## Current Status

Implemented through the shared application engine: create-app owns option normalization and generation primitives, and initialize-project imports them for the initial application. Current script tests exercise additive boundaries, app-aware configuration, version gates, standards normalization, and guide generation. Earlier external pilot results remain historical; no new end-to-end deployment or hosted-platform run was performed during this documentation cleanup.
