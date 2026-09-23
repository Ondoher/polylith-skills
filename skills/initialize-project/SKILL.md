---
name: initialize-project
description: Initialize a brand-new application project in an empty folder or fresh repository. Use for the first project scaffold only; do not use to add an app to an established project or modify existing project files.
---

# Initialize Project

Initialize one fresh project from explicit configuration choices. Preserve the user's files, use current compatible dependencies, verify the result, and leave all Git writes to the developer.

## Safety boundary

- Work only in an empty folder or a fresh repository containing at most `.git/`, GitHub-created `README.md`, `LICENSE`, and `.gitignore` files, plus one root-level `*.code-workspace` file.
- Never overwrite or modify an existing file unless the user explicitly identifies that file and authorizes the overwrite.
- Do not create or edit the root `README.md`, `LICENSE`, or `.gitignore`; preserve them through initialization. A permitted `*.code-workspace` file is developer-owned and may be updated by configured project tooling.
- Do not run `git init`, `git add`, `git commit`, `git push`, or any other Git write operation.
- This skill creates the first app/project. Do not use it to add another app later.
- Before asking configuration questions, run `node <skill>/scripts/preflight.mjs <target>`. Stop on any conflict.

## Configure before writing

Read [decision-flow.md](references/decision-flow.md), ask every applicable question, and normalize the answers before mutation. Ask for the full project name and project/package slug first. For Polylith projects, collect the initial application name and slug separately even when the project values are accepted as defaults. Do not infer skipped conditional options.

Save the collected answers to a temporary JSON file outside the target or pass them through stdin, then run:

```text
node <skill>/scripts/normalize-options.mjs <answers.json>
```

Show the user a compact summary of the effective choices, including implied choices such as base components enabling Karma testing. Continue unless the summary exposes a misunderstanding that materially changes the project.

## Execute

Always read [project-rules.md](references/project-rules.md). Resolve the canonical standards root from `$CODEX_HOME/documentation/standards`, falling back to `~/.codex/documentation/standards` when `CODEX_HOME` is unset. Run `node <skill>/scripts/validate-standards.mjs <standards-root>`. Stop with a clear error if validation fails; do not substitute a copied project standard.

Read `README.md`, `documentation.md`, `project-foundation.md`, `architecture.md`, `code-conventions.md`, `types.md`, and `jsdoc.md` from that canonical root for every project. When the selected project persists application data in any database, also read and manifest `data-persistence.md`; omit it when no database persistence exists.

For a non-Polylith project, also read canonical `testing.md` when testing or coverage is selected. The generator creates only `src/` as application structure, then applies selected Prettier and Jasmine setup. It does not create UI, server, component, localization, or app-shell files.

For a Polylith project, read the routed canonical standards below before running the generator so you can review the generated result intelligently:

1. Read canonical `polylith.md` and `react.md`.
2. Read only the canonical standards needed by the selected options:
    - shell: `remvc.md` and `app-shells.md`
    - MUI: `mui.md`
    - base components: `base-components.md`
    - accessibility: `accessibility.md`
    - localization: `localization.md`
    - basic server or Markdown: `server.md`
    - Socket.IO: `socket-io.md`
    - local HTTPS: `local-https.md`
    - testing or coverage: `testing.md`
3. The generator creates project-local facts, the intentionally undefined initial app topic, a folder standards manifest with generated named sets, and an empty repository standards overlay. It must not copy canonical standard prose into the project.

Apply the normalized configuration for either branch with:

```text
node <skill>/scripts/apply-scaffold.mjs <target> <normalized-options.json>
```

The generator owns deterministic baseline assembly, runs the installed `polylith init` and `polylith app <app-slug> --multiple` commands for the Polylith branch, invokes the shared `create-app` application engine in `initial-app` mode, reconstructs `package.json`, discards the lockfile and `node_modules` created by Polylith initialization, and runs the final `npm install` from a fresh dependency resolution. It allows up to ten minutes for installation commands because Polylith initialization and registry access can take more than a minute. Do not duplicate its baseline writes manually.

Generation is not proof that every selected behavioral contract is complete. After it returns, compare the generated files and tests with every applicable canonical standard, then complete any missing behavior only in files created by this run. This review is mandatory for base components, `BaseDialog`, shells, localization, Markdown, server routing and Socket.IO. Do not report completion until the selected canonical contracts and meaningful tests are satisfied.

Review `agents/topics/standards/manifest.md` and `agents/topics/standards/overlay.md` after generation. The manifest must define valid named standards sets, assign the required root and generated source/server folders, include exactly the canonical standards applicable to the normalized options, use `$CODEX_HOME/documentation/standards` as their owner, provide working local Markdown links, contain no copied standards prose, and link the overlay. The overlay must contain `None.` and no invented local rule.

## Finalize standards governance

Do not perform this section until the **Verify** section below and every applicable generated-project check have succeeded. Then finalize the fresh project's standards before handoff. This initialization path is valid only because preflight proved the target was empty or fresh, every repository standards file was created by this run, the manifested selection came from the engineer-approved normalized options, the overlay still contains exactly `None.`, and no inherited local standards exist. If any condition is false, do not attest directly; run the normal `$normalize-standards audit`, manual-review, and reconcile workflow.

For the qualifying fresh project:

1. Create `agents/topics/standards/reconciliation.md` from the global normalization skill's reconciliation template. Record that this is a fresh-project initialization with no inherited standards or divergences, identify the manifested selections, link Standards Governance and root `STANDARDS.md`, mark configuration and precedence findings as clear, and use phase and status `initialized`/`normalized`. Do not invent a developer decision or pretend a divergence was reviewed.
2. Create and validate the initial normalization attestation with the global normalization helper:

    ```text
    node <codex-root>/skills/normalize-standards/scripts/standards-attestation.mjs create --repo <target>
    node <codex-root>/skills/normalize-standards/scripts/standards-attestation.mjs validate --repo <target>
    ```

3. Run the global standards-guide writer and its read-only freshness check:

    ```text
    node <codex-root>/skills/write-standards-guide/scripts/standards-guide.mjs write --repo <target> --codex-root <codex-root>
    node <codex-root>/skills/write-standards-guide/scripts/standards-guide.mjs check --repo <target> --codex-root <codex-root>
    ```

4. Record the attestation and guide-source fingerprints in the reconciliation report, rerun the project's formatting check so the generated guide is included, and confirm the guide check remains current.

Failure to create or validate the attestation blocks guide generation and project completion. Guide generation or freshness failure after a valid attestation does not invalidate normalization, but the initialization remains incomplete until the required guide is current.

The generator may replace only files created by its own Polylith subprocesses during the current run. It refuses every path that existed at preflight, including GitHub-owned files. On failure, preserve its partial output and report the exact error; do not rerun over that partial scaffold.

Global planning notes and implementation examples may use other local repositories to understand framework behavior. Generated projects must remain self-contained: do not emit absolute development paths, repository names used only as references, or links to files in other repositories into generated source, configuration, documentation, manifests, comments, fixtures, or tests. Refer only to published packages, canonical standards through their established `$CODEX_HOME` indirection, and files owned by the generated repository.

Use JavaScript/JSX ESM for runtime code. Apply the canonical type/JSDoc/component standards to ambient declarations. Polylith is the only bundler. Use npm only.

After generation, inspect the installed dependency resolution. The generator's successful `npm ls --all` check proves that npm found a structurally valid dependency graph, but it does not prove runtime compatibility. Compare important resolved versions with current registry metadata, resolve any genuine peer conflict using the latest compatible versions, update only the generated project's manifest values, and rerun `npm install` with explicit user authorization if that requires another mutation. A compatibility pin discovered during one project initialization remains local to that project; changing the global generator is a separate maintenance decision requiring explicit direction. If current registry metadata cannot be obtained, report dependency freshness as unverified rather than treating cached metadata as current.

Polylith 1.x may report deprecated transitive build packages. When its installed dependency graph, build, and applicable tests pass, treat those warnings as deferred upstream maintenance rather than a present incompatibility. Do not add workaround pins or change the global generator solely for those warnings. Reassess this policy when Polylith 2.0 is available.

## Verify

Run `node <skill>/scripts/validate-project.mjs <target> <normalized-options.json>`, confirm every applicable canonical standards file exists, then run every applicable project check:

- Prettier check when configured.
- Jasmine for non-Polylith testing.
- Polylith build for all generated apps.
- Karma in ChromeHeadless for Polylith UI/component testing.
- Optional coverage, confirming separate `src` and generated-server console,
  HTML, and machine-readable summaries without enforcing a threshold. Before
  handoff, every generated runtime statement, branch, function, and line must
  report 100% in its applicable `src` or `server` report. Test files, test
  harnesses/mocks, declarations, configuration, and generated dependencies are
  outside runtime coverage. Do not combine client and server measurements.

Dependency compatibility is a real-run gate. Confirm the installed Node, npm,
React, MUI, Polylith, and other selected foundation versions, then execute the
generated build and every applicable test lane using that exact installed tree.
Generator regression tests, peer-range inspection, and `npm ls` are supporting
evidence only. Do not report dependency compatibility unless the generated
project itself completes those commands.

Treat every generated test as part of its generated runtime capability. Verify
meaningful behavior, not merely file presence or lines executed for their own
sake. The 100% expectation applies to the generated baseline only; do not add a
project-wide threshold or claim that future developer code remains at 100%.

On failure, stop, preserve partial output, report the exact failure and files created, and do not retry by overwriting. At handoff, report choices, created structure, install/build/test results, normalization and guide fingerprints, and anything not verified.
