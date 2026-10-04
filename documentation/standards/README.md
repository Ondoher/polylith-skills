# Canonical Standards

These documents are the global engineering standards for Codex-managed projects. Their canonical root is:

```text
$CODEX_HOME/documentation/standards
```

Projects do not copy these documents. Each project selects its topics folder in root `AGENTS.md` with `Topics folder: <repository-relative folder>`, defaulting to `.agents/topics`. Its `standards/manifest.md` defines named standards sets and assigns them to repository folders; repository and folder-scoped additions and replacements live separately in `standards/overlay.md`. See [standards governance](documentation.md#required-repository-shape) for location resolution and legacy bootstrap discovery.

## Standards Index

- `documentation.md` — canonical ownership, folder manifests, overlays, topics, and reviewer selection.
- `project-foundation.md` — repository, package, runtime, dependency, and Git boundaries.
- `architecture.md` — ownership, feature privacy, build/runtime, and layer boundaries.
- `data-persistence.md` — database-neutral persistent identifiers, concrete instants, persistence boundaries, and verification.
- `code-conventions.md` — JavaScript, files, validation, diagnostics, React/CSS baseline, and formatting.
- `types.md` — ambient JavaScript type contracts and declaration placement.
- `typescript.md` — TypeScript source contracts, documentation, privacy, compiler checks, and runtime verification.
- `jsdoc.md` — runtime documentation and service-interface conventions.
- `react.md` — React presentation, state, effects, lifecycle, markup, CSS, and tests.
- `polylith.md` — builds, feature activation, deployment, lifecycle, server ownership, and browser-test assembly.
- `remvc.md` — registry, executor, model, service, controller, view, and presentation responsibilities.
- `mui.md` — provider stack, imports, theming, styling ownership, and accessibility baseline.
- `base-components.md` — base/concrete component contracts, types, harness, and behavioral tests.
- `accessibility.md` — semantics, keyboard/focus, names, validation, status, visual guidance, and testing.
- `localization.md` — locale ownership, phrases, replacements, plurals, text rendering, HTTP, and Markdown.
- `app-shells.md` — page registry, shell ownership, navigation variants, routing, responsive behavior, and tests.
- `server.md` — service-based Express routing, client HTTP policy, Markdown, failures, and tests.
- `socket-io.md` — stream ownership, envelopes, extension hooks, lifecycle, and tests.
- `testing.md` — runner boundaries, placement, behavioral principles, coverage, and lane readiness.
- `local-https.md` — self-signed local certificate generation, trust boundary, renewal, and verification.

Load only the files named by the current project's applicability manifest and the current task. Do not treat the entire standards tree as default context.
