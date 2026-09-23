# Initialization Contract

This reference owns generator-specific decisions. Engineering standards live only under `$CODEX_HOME/documentation/standards` and must not be restated here.

## Package And Repository Choices

- npm only; ESM runtime code.
- Initial package version `0.0.1`; application packages default to `private: true`.
- Latest compatible stable Node and React unless explicitly overridden or blocked by a genuine peer requirement. Resolve them without reusing Polylith initialization's dependency lock or installed modules, verify the installed graph with `npm ls --all`, and prove compatibility through the generated project's real build and applicable test lanes.
- Apply a compatibility pin discovered during initialization only to the generated project. Updating the global generator is a separate, explicit maintenance decision.
- Accept Polylith 1.x deprecated transitive build-package warnings when the resolved graph, real build, and applicable tests pass. Defer upstream dependency cleanup until Polylith 2.0 is available.
- Runtime code is JavaScript/JSX with ambient TypeScript declarations until the Polylith runtime deliberately supports TypeScript.
- Polylith projects retain the CLI baseline development commands: `dev` launches the watcher and nodemon server, with separate `dev:watch` and `dev:serve` commands and root nodemon configuration watching `server` and `config`.
- GitHub owns root `README.md`, `LICENSE`, and `.gitignore`; one root `*.code-workspace` file is permitted and remains developer-owned; developers own every Git write.
- Never overwrite a pre-existing path without explicit instruction.
- Do not add emoticon dependencies or other product-specific behavior without an explicit project requirement.
- Other repositories may be consulted as global implementation references, but their names, absolute paths, and file links must not appear in generated project artifacts. Generated output must stand on its repository-owned facts, published dependency contracts, and canonical standards references.

## Generated Documentation

Create:

```text
AGENTS.md
STANDARDS.md
agents/topics/
  README.md
  active-topic.md
  <app-slug>/README.md
  project-foundation/README.md
  architecture/README.md
  standards/manifest.md
  standards/overlay.md
  standards/reconciliation.md
  standards/normalization.json
```

Add project-local `app-shell`, `server`, and `testing` topics only when those capabilities are generated. These topics record selected paths, routes, commands, and configuration; they do not reproduce global standards.

`agents/topics/standards/manifest.md` identifies `$CODEX_HOME/documentation/standards` as canonical, defines reusable standards sets, assigns the root and generated source/server folders, links only canonical files applicable to the normalized options, and links `overlay.md`. The overlay begins with `None.` and is the only repository file allowed to own local engineering-standard `ADD` or `REPLACE` rules using repository or folder scope. `AGENTS.md` routes readers through the active topic, manifest, and overlay; topics do not alter standards applicability.

After the generated project passes its checks, initialization records the no-divergence standards result in `reconciliation.md`, creates and validates `normalization.json`, and invokes the global `write-standards-guide` skill to create root `STANDARDS.md`. The guide is generated developer reference, never standards authority. This direct initial attestation is restricted to a preflight-confirmed fresh project whose standards surface was wholly generated from the engineer-approved options and whose overlay remains empty.

The initial app topic remains a short statement that the project needs to be defined. Do not invent product requirements.

## Global Context

Every Polylith React app generates one application context with the registry, `en-US` locale, optional localization service, and Boolean localization/accessibility modes. Enable values from normalized options; do not invent persistence or selection behavior.

## Generation Boundary

For Polylith projects, the generator runs the installed `polylith init` and `polylith app <app-slug> --multiple`, builds one deployable child app through the shared `create-app` application engine, reconstructs `package.json`, and runs the final npm install. For headless projects it creates `src`, the manifest, and selected formatting/testing support.

The project and initial app have separate display names and slugs. The generated app records its standalone, composed, and configured repository mounts. Its final app router serves static output from the app deployment directory, while its HTML and browser services derive their base from the served document.

Every Polylith repository receives `deployment.setup`. It attaches the installation registry to the package-local registry in both master and discovered execution, uses `isMaster` to gate master-owned lifecycle work, and resolves before routers. App server files are scoped below `server/<app-slug>/`; their router receives and attaches the same installation registry explicitly.

The generator may replace only files its own Polylith subprocess created during this run. On failure, preserve partial output and report it rather than retrying over the scaffold.
