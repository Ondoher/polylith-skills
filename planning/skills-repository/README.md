# Skills And Standards Repository


This topic records the operating design for the dedicated `polylith-skills` repository. The repository is the versioned source for managed Codex skills, agents, canonical engineering standards, and portable developer documentation.

## Goals

- Version skills and canonical standards together.
- Allow one trusted update workflow to validate, commit, and publish affected documentation.
- Keep agent standards processing local and deterministic.
- Make generated standards documentation useful on machines without the skills installed.
- Make links work when either a consuming repository or the governance repository is viewed on GitHub.
- Avoid machine-specific paths in checked-in consumer repositories.

## Two Operating Modes

### Installed mode

The developer has a local checkout of the governance repository and links its skills into the Codex user skill location. Skills and review agents resolve standards only from the local checkout. Authorized governance workflows may modify that checkout and may commit and push after their explicit approval gates.

Standard-profile bootstrap synchronizes the checkout before loading standards when installation state is available. The explicit instructions-only profile skips that update and reviewer startup. Installed workflows provide standards-driven review, normalization, guide generation, canonical-standard promotion, and governance publishing.

### Documentation-only mode

The developer does not have the governance skills or checkout installed. Generated repository documentation still links to the canonical documents on GitHub and remains readable in a browser or directly on GitHub. This mode does not provide automated standards resolution, review, normalization, or canonical publishing, and those GitHub documents are not locally editable through the absent skills.

## Authority And Links

The local governance checkout is the only standards authority used by installed skills and agents. GitHub is the publication and portability surface, not a runtime fallback for standards processing.

The current folder manifest selects a standard by its filename label, such as
`architecture.md`, and a local canonical Markdown link. Installed agents resolve
that link to the local file. Generated `STANDARDS.md` independently uses the
configured GitHub repository and branch for human-facing links. Bare identifier
resolution remains a planned change, not an accepted manifest format.

```text
folder manifest: architecture.md with a local canonical link
        |
        +-- installed agent --> <governance-root>/documentation/standards/architecture.md
        |
        +-- generated guide --> https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/architecture.md
```

Links within the governance repository should be repository-relative whenever
possible. Canonical-document links emitted into generated `STANDARDS.md` use
the configured GitHub repository and default branch, never a developer's local
checkout path. Links to the consuming repository's own manifest and overlay
remain relative. The machine-consumed manifest still uses local canonical links;
the human-facing URL change does not change runtime standards resolution.

Links target the configured default branch so publishing a standards change updates existing links without rewriting every consumer repository. Content fingerprints continue to record whether a consumer's generated guide reflects the current local standards content.

## Repository Layout

```text
polylith-skills/
|-- AGENTS.md
|-- README.md
|-- governance.json
|-- .agents/
|   `-- skills/
|       |-- install-polylith-skills/
|       `-- uninstall-polylith-skills/
|-- skills/
|   `-- <managed-skill>/
|-- agents/
|-- codex-home/
|   `-- AGENTS.md
|-- planning/
|   `-- <maintained roadmap and design notes>.md
|-- docs/
|   `-- <human-facing skill and workflow guides>.md
|-- documentation/
|   `-- standards/
|-- scripts/
`-- tests/
```

`governance.json` records non-machine-specific repository metadata such as the canonical GitHub URL and default publication branch. Local checkout paths belong in installer state or Codex configuration and must never be committed.

The install and uninstall entry points live under `.agents/skills`, which makes them repository-local and callable before installation or after global links need removal. Managed source skills live under `skills/<name>` so their repository-relative documentation links have the same shape in the checkout and when linked under the Codex skill root. The installer creates one linked user skill folder per governed skill, links the agents and documentation directories, resolves planning contracts through the physical documentation target's parent, and maintains a delimited Polylith block in the Codex-root `AGENTS.md`. Linking individual skills preserves separately installed system or personal skills.

## First Installation

The installer cannot run before Codex can discover it. The minimal portable bootstrap is therefore Git-first:

1. Install Git and Codex.
2. Clone the trusted governance repository into a developer-selected local directory.
3. Verify that `origin` is the canonical URL recorded in `governance.json`.
4. Start Codex from the governance repository root.
5. Invoke the repository-scoped `install-polylith-skills` skill discovered at `.agents/skills/install-polylith-skills`.
6. Review and approve its proposed user-level links and local installation record.
7. Restart Codex if the newly installed global skills do not appear.
8. Invoke `bootstrap`; subsequent bootstraps synchronize the governance checkout automatically.

Cloning the repository is the only required setup step that cannot be performed by the repository's own installer skill. A later convenience entry point may use `skill-installer` to fetch only `install-polylith-skills`, but it is not required for the core workflow and must ultimately establish the same full local checkout.

## `install-polylith-skills` Skill

The repository-scoped installer owns installation, update, inspection, repair, and safe unlinking of the governance integration. It does not own standards publication.

On install it must:

1. Resolve and validate the repository root, `governance.json`, canonical remote, and current branch.
2. Validate every managed `SKILL.md`, supporting resource, script, and required canonical document before changing user-level state.
3. Determine the active Codex user skill root. Prefer an already configured `CODEX_HOME` installation when present; otherwise use the current officially supported user skill location. Record the selected root explicitly rather than relying on it to be inferred later.
4. Produce a dry-run listing every link it will create and every collision it found, with a deterministic plan digest that a mutating invocation must present unchanged.
5. Create one directory link per managed skill plus directory links for the managed agents and documentation roots, and insert the governed instructions into the Codex-root `AGENTS.md` between fixed Polylith managed-block delimiters.
6. Write local installation metadata containing the checkout path, skill root, agent root, documentation root, canonical remote, branch, link kinds, delimiter format and managed-block content hash. Do not write machine-specific paths into the governance repository.
7. Verify that every installed link resolves back into the selected governance checkout and that local canonical manifest links resolve successfully.
8. Report whether Codex must restart before discovery is guaranteed.

### Platform Link Policy

Installed mode requires live directory links; it does not require every platform to use the same filesystem primitive. A standard Windows installation with Developer Mode disabled and a non-administrator user is a supported baseline. Normal installation must not require enabling Developer Mode or launching an elevated Windows process.

- On standard Windows with local checkout and Codex paths, create NTFS directory junctions for managed skill directories and the documentation root. Before committing to this adapter, verify that the supported Codex client discovers a junctioned skill and resolves all of its resources correctly.
- On macOS and Linux, require Node.js, Git, npm, and permission to create symlinks within the selected Codex home, then create ordinary directory symbolic links. Launch `npm` directly for dependency restoration rather than routing it through a platform-specific shell.
- A Windows symbolic link may be used only after a capability probe succeeds. Codex approval to write outside the active workspace and the Windows privilege to create a symbolic link are separate requirements; one must never be reported as satisfying the other.
- Record each installed link's kind, source, canonical target, and installer ownership. Verification, repair, relocation, and unlink must inspect the actual link or reparse point and operate on the link itself without traversing into or deleting its target.
- If the selected paths cannot support the platform's live-link adapter, stop before changing installation state and report the precise limitation. Do not silently copy skill content, because copying would change the installed-mode update and relocation contract.

The installer must exercise the junction path on a standard Windows test environment and the symbolic-link path on a symlink-capable Windows environment. The repository declares a Windows, macOS, and Linux CI matrix, with POSIX jobs exercising ordinary directory symbolic links and direct `npm` invocation. macOS and Linux support remains best-effort until those hosted jobs have completed successfully. Capability-dependent coverage may be reported as unavailable only after the relevant link-creation attempt, and it must remain visible in the installation verification report.

Installation must be idempotent. A link already targeting the correct source is success. The installer must not overwrite a real directory, replace a link to another target, delete an existing skill, or adopt existing files merely because their names match. Collisions are reported to the engineer. The explicit `--migrate-identical` option may replace an existing copied directory only after recursive equality with the repository source is proven, ignoring runtime `node_modules`; different content and unrelated links remain hard collisions.

The installer owns only the `CODEX_HOME/AGENTS.md` content between `<!-- BEGIN POLYLITH SKILLS MANAGED BLOCK -->` and `<!-- END POLYLITH SKILLS MANAGED BLOCK -->`. Installation inserts that block without replacing existing instructions. Repair and update may replace its content only when its recorded hash still matches. Unlink removes only the verified block. Text outside the delimiters remains user-owned, is excluded from plan identity, and must survive installation, repair, update and unlink even when it is added after a dry run. Duplicate or malformed delimiters and locally modified managed content are blocking collisions. Installation state schema 2 stores an `agentsBlock` record with `path`, `source`, `beginMarker`, `endMarker`, `sha256` for the exact marked block, and `sourceSha256`.

The skill should also support:

- `status`: inspect links, checkout configuration, remote, branch, and local documentation resolution without mutation;
- `update`: fast-forward the clean governance checkout, validate the updated repository, and reconcile the installed skill links against the updated managed-skill catalog after showing the exact pull and link plan;
- `repair`: recreate only missing or broken links after showing the exact changes;
- `unlink`: remove only links proven to target the recorded governance checkout, without deleting the checkout or unrelated skills; and
- `relocate`: update installation metadata and links after the engineer has moved the checkout, without copying or deleting repository content.

The repository-local `uninstall-polylith-skills` skill is the human-facing entry point for `unlink`. It shows the exact ownership-aware plan and its digest before applying it, requires that digest on the mutating invocation, verifies link and managed-block removal without treating the intentionally absent installation state as an error, preserves surrounding Codex-root instructions, the checkout and every link target, and reports that Codex should restart. It performs no Git operation.

Existing linked skills need no file copy when their contents change: the links expose the new checkout content immediately after a successful pull. Update reconciliation is required when skills are added, renamed, or removed. It may add links for newly managed skills and may remove obsolete links only when the installation record proves that the installer created them and the engineer approves the disclosed removal. It must never remove an unrecorded same-named skill.

The update operation must use `git pull --ff-only` and the same clean-tree, trusted-remote, configured-branch, failure, and post-update validation rules as bootstrap. If the installer skill itself changed, reread its updated instructions before applying link reconciliation. A failed pull or failed validation leaves the existing links in place and reports that the installation was not updated.

User-level filesystem changes remain subject to Codex approval and sandbox enforcement. Installation authorizes only the disclosed link and installation-record changes; it does not authorize modifying unrelated Codex configuration, Git commits, pushes, or deletion of the governance checkout.

## Bootstrap Synchronization

When installed mode is available, governance synchronization is the first state-changing bootstrap action:

1. Resolve the governance checkout from trusted local installation metadata or the linked bootstrap skill.
2. Verify that the checkout, configured remote, branch, and upstream match governance configuration.
3. Require a clean working tree.
4. run `git pull --ff-only` against the configured trusted upstream.
5. If the checkout changed, reread the updated bootstrap skill, Codex-root `AGENTS.md`, and every applicable standard before continuing.
6. Compute standards fingerprints and start eligible reviewers only after synchronization succeeds.

Invoking bootstrap explicitly authorizes this narrowly scoped fast-forward pull in the governance repository. It does not authorize merges, rebases, stashing, discarding changes, commits, or pushes.

Bootstrap must not resolve a dirty or diverged checkout automatically. If the checkout is dirty, diverged, misconfigured, or cannot be synchronized, report the precise condition and stop standards-dependent bootstrap and reviewer startup. An explicitly selected instructions-only profile may continue under the repository instructions after reporting that local governance could be stale.

Network access and filesystem permissions remain subject to Codex sandbox and approval enforcement. The bootstrap workflow may request the required approval but must not weaken those controls.

## Standards Publishing Workflow

The installed `update-standards` skill owns the checkpoint-and-publish workflow. It resolves this governance checkout even when invoked from a consumer, reviews the complete repository state and any existing outgoing commits, validates affected work, and uses `check-point` for the accepted local commit. Publication requires explicit authorization for the exact outgoing scope and configured GitHub destination; existing authorization for that same publication remains valid. A clean checkout with pending commits can be published without an empty commit. It verifies the remote branch tip after a normal, explicitly targeted push and leaves a failed publication's local commit intact.

`write-standards-guide` emits GitHub branch URLs for canonical documents and overlay section targets, resolving publication metadata from the physical checkout's `governance.json`. Its hashes still come from local canonical content. Repository manifest and overlay links remain relative to the consumer. Publication does not change skill resolution to HTTP or synchronize other local installations.

Canonical-standard changes occur in the local governance checkout:

1. Select an existing standard identifier or add a new identifier.
2. For an existing identifier, promote the active local override unless the engineer supplies different canonical wording.
3. Update the canonical standard and every affected governance index, reference, generated document, test, and fingerprint.
4. Validate standards resolution, documentation links, skill packages, and affected workflows.
5. Show the complete governance diff and propose a structured commit message.
6. Commit only after explicit engineer approval.
7. Push only after explicit engineer approval to publish.

Existing GitHub links then display the updated standard automatically. Consumer repositories do not regenerate documentation merely to change a URL. They regenerate when their selected standards, folder assignments, overlays, explanatory content, or recorded fingerprints change.

Removal of a canonical standard remains deferred. A publishing workflow must not infer permission to remove one.

## Git And Trust Boundaries

- The governance repository is a high-trust executable-instructions source because changes to its skills can affect every linked project.
- Bootstrap may perform only its configured fast-forward pull.
- Standards-update skills may edit governance content but do not receive implicit commit or push authority.
- Commit and push are separate explicit approval phases.
- Consumer-repository Git authority does not automatically extend to the governance repository.
- A skill must disclose which repository a Git operation will affect before requesting approval.
- Publication must use the configured remote and branch; arbitrary remotes or dynamically supplied destinations are not allowed.

## Current Integration And Deferred Work

The repository boundary depends on coordinated standards resolution, publication links, bootstrap synchronization, and installation behavior. Maintain these requirements together as the tooling evolves:

- Keep runtime manifest resolution and standards-guide hashing local.
- Generate canonical GitHub links in `STANDARDS.md` from the physical checkout's publication metadata, including overlay section targets.
- Keep canonical publication metadata in the guide source fingerprint so destination changes require regeneration.
- Maintain `update-standards` as the reviewed whole-repository checkpoint and publish workflow; installer update remains the pull workflow.
- Synchronize governance and reload changed authority during eligible standard bootstrap.
- Maintain the repository-scoped `install-polylith-skills` skill and its dry-run, install, update, status, repair, unlink, relocate, collision, rollback, and ownership checks.
- Keep explicit identical-copy migration coverage so a first installation never silently replaces standalone global skills.
- Validate that generated standards-guide canonical links contain no local governance paths.
- Maintain existing installer and publication tests; assess gaps for offline use, bootstrap reload, and consumer integration before adding coverage. Existing checks do not establish hosted-platform success.

Changes to the manifest identifier format and its installed resolver must ship as one compatible release. Do not publish a manifest format that the installed resolver does not understand.

Bare stable identifiers in manifests, their local resolver, and broader
reconciliation-report publication links remain separate work. The current
GitHub guide links do not imply that those changes have shipped.

## Portability Constraints

GitHub links are universally usable only when the governance repository is public. If it is private, they remain portable for authenticated collaborators but cannot serve anonymous readers. Local standards processing is unaffected as long as the checkout is installed and current.

No consumer repository should require the governance checkout merely to render its developer documentation. Conversely, the presence of portable GitHub links must never cause an installed agent to treat remote content as standards authority.

## Current Status

The source repository is `polylith-skills`; its canonical remote and default
branch are recorded in `governance.json`. Managed skills use `skills/<name>`;
the repository-local installer uses `.agents/skills/install-polylith-skills`.
The installer implements plan-first installation, status, update, repair,
unlink, relocation, identical-copy migration, runtime dependency restoration,
rollback, and ownership-aware reconciliation. Generated standards guides link
to GitHub while reading local source; `update-standards` publishes the reviewed
governance state. Repository visibility remains a deployment fact to observe
rather than infer from the local checkout. See the [human-facing skill catalog](../../README.md)
and [publishing guide](../../docs/update-standards.md).
