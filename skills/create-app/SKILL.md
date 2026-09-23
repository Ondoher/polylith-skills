---
name: create-app
description: Add a new Polylith application to an established normalized repository while preserving repository infrastructure and integrating builds, routes, tests, standards mappings, and documentation.
---

# Create App

Create one application inside an established Polylith repository. Reuse repository capabilities, make app-scoped additions, verify the complete integration, and leave Git writes to the developer.

## Eligibility and safety

Run `node <skill>/scripts/inspect-repository.mjs <repository>` before collecting options. Stop when the repository does not declare an explicit Polylith apps array on Polylith 1.3+, has never normalized standards, lacks its standards manifest or overlay, or lacks Prettier plus the standard `format:check` package script. Do not treat the legacy `multiple` flag as the authority for whether an apps-array repository can own another app.

Read repository-root `AGENTS.md`, the active topic, folder standards manifest, and overlay before planning. Preserve every existing file except the specific shared JSON and documentation files shown by the dry-run plan. Never reinitialize the repository, replace an existing app, overwrite an app path, or perform a Git write.

Use other repositories only as private global implementation references. Never emit their names, paths, links, or copied local policy into the target repository.

## Configure

Read [application-options.md](references/application-options.md). Determine repository posture from its own configuration and documentation. A configured `discover` root establishes hosting posture; when local-only versus discoverable is not recorded, ask the engineer rather than inferring it from app count.

Collect and normalize the app choices with:

```text
node <skill>/scripts/normalize-application-options.mjs <answers.json> <normalized.json>
```

Use a temporary options file outside the repository. Reject a duplicate app slug or mount. Only one resident app may claim `/`; default another resident app to `/<app-slug>`. Show the engineer the app name, slug, repository posture, standalone mount, configured/composed mount, app capabilities, implied testing, and any repository-wide dependencies or flags that will be added.

## Plan and apply

Generate the exact mutation summary first:

```text
node <skill>/scripts/apply-app.mjs <repository> <normalized.json> --dry-run
```

Read every canonical standard named by the plan from `$CODEX_HOME/documentation/standards`, falling back to `~/.codex/documentation/standards`. Review every create/update path. Resolve a misunderstanding or unexpected collision before mutation.

Apply the same normalized options without `--dry-run`:

```text
node <skill>/scripts/apply-app.mjs <repository> <normalized.json>
```

Apply formats exactly the disclosed create/update paths with the repository-installed Prettier executable. It never runs a repository-wide formatting write. Install existing dependencies first if that executable is absent.

The shared application engine is authoritative for both this workflow and the initial app created by `initialize-project`. Do not reproduce its templates manually. The existing-project mode may append the app declaration, merge missing dependencies, add app-specific scripts, add `deployment.setup` when absent, and update the topic index and folder standards manifest. It must not replace repository-owned dependency versions or unrelated scripts.

Read [integration-rules.md](references/integration-rules.md) whenever the app uses a server, testing, coverage, discovery, or repository-wide capability.

## Standards and documentation

The new folder assignments select canonical rules for the app; they are not local overrides. Preserve the repository overlay. Recreate and validate the normalization attestation after the manifest update, then regenerate and check the human-readable guide:

```text
node <codex-root>/skills/normalize-standards/scripts/standards-attestation.mjs create --repo <repository>
node <codex-root>/skills/normalize-standards/scripts/standards-attestation.mjs validate --repo <repository>
node <codex-root>/skills/write-standards-guide/scripts/standards-guide.mjs write --repo <repository> --codex-root <codex-root>
node <codex-root>/skills/write-standards-guide/scripts/standards-guide.mjs check --repo <repository> --codex-root <codex-root>
```

When a selected canonical standard is not yet linked by the repository manifest, resolve it from the canonical standards root and add it only to the new app's applicable generated set. Stop if the canonical file is missing. Do not copy its prose, invent a local substitute, or silently broaden an existing set.

## Install and verify

Run `npm install` after the engineer-approved mutation so the lockfile matches merged dependencies. Ensure `NPM_CONFIG_OFFLINE=false` for registry-capable npm commands. Then run:

```text
node <skill>/scripts/validate-app.mjs <repository> <normalized.json>
npm run format:check
npm run build
```

Run `npm run test:<app-slug>` when testing is enabled and `npm run coverage:<app-slug>` when coverage is enabled. The generated tests participate in the repository's established Polylith flow; do not create a parallel harness. Run any existing whole-repository validation required by `AGENTS.md`.

On failure, preserve partial output and report the exact created and updated paths. Do not retry over partial output. At handoff, report the app choices, repository changes, dependency installation, build/test/coverage results, standards attestation and guide status, and anything not verified.
