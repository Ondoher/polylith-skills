# Install Polylith Skills

Use this repository-local skill to install the toolkit into your Codex home or maintain an existing installation. Open this checkout in Codex and ask:

```text
Use $install-polylith-skills to install the managed skills.
```

For inspection without changes, ask it to report installation status. You can also request repair, update, or relocation. Codex home is selected by `CODEX_HOME`, or defaults to `~/.codex`.

## Install

Clone the repository, start Codex from its root, and invoke the repository-local `install-polylith-skills` skill. The skill first runs a dry plan. After approval, it creates:

- one live directory link in `CODEX_HOME/skills` for every cataloged skill;
- live links for the complete `agents` and `documentation` directories; and
- a delimited managed block from `codex-home/AGENTS.md` inside `CODEX_HOME/AGENTS.md`.

The installer owns only the text between `<!-- BEGIN POLYLITH SKILLS MANAGED BLOCK -->` and `<!-- END POLYLITH SKILLS MANAGED BLOCK -->`. Existing instructions before or after that block remain user-owned. Their content is excluded from the plan digest, so unrelated additions made after planning remain intact when the approved plan is applied. A changed managed block is an ownership collision and is never overwritten or removed automatically. Installation state schema 2 records this as `agentsBlock` with its path, source, delimiters, exact block hash, and source hash.

Windows uses directory junctions so a standard non-administrator installation works without Developer Mode. macOS and Linux use directory symbolic links and require Node.js, Git, npm, and permission to create symlinks within `CODEX_HOME`. On POSIX, dependency restoration launches `npm` directly rather than through a platform shell. Installation state is local to `CODEX_HOME` and is never committed.

Existing ordinary files or directories are collisions by default. `--migrate-identical` may replace them only when their content recursively equals the repository source; `node_modules` directories are ignored for that comparison. Mutations are transactional and restore migrated content if reconciliation fails.

Skills containing `package-lock.json` receive `npm ci --ignore-scripts` before links are switched during install, repair, or update. A missing corresponding `node_modules` directory makes status unhealthy.

`status` and `unlink` inspect the installed link itself. They do not follow a link while deciding ownership, and unlinking removes only the owned link rather than its repository target.

The installer test workflow declares Windows, macOS, and Linux jobs. macOS and Linux support remains best-effort until the hosted POSIX jobs have completed successfully.

Run the deterministic CLI directly when troubleshooting:

```text
node scripts/install-polylith-skills.mjs <plan|status|install|repair|unlink|update|relocate> [--codex-home PATH] [--repository PATH] [--migrate-identical] [--apply --expect-plan SHA256]
```

Mutating modes are dry runs without `--apply`. Each dry run emits a deterministic `planDigest`; apply that exact plan with `--apply --expect-plan <planDigest>`. A missing digest is rejected, and a changed plan returns `PLAN_CHANGED` before Codex-home reconciliation. `update --apply` requires a clean checkout on the manifest branch with the manifest remote configured as `origin`, then uses `git pull --ff-only` before validating and reconciling. `relocate` relinks an existing installation after the checkout has already been moved; it never moves or deletes the checkout.

## Pick up newly added skills

Live links expose changes to an already installed skill, but a new catalog entry
needs its own installed link. If your checkout already contains a new skill such
as `update-standards`, open this repository and ask the local installer to repair
the installation. Review and authorize its reconciliation plan, then restart
Codex if needed. Use installer `update` when you also need to fetch published
checkout changes; that mode requires a clean working tree.

Installer update pulls published work into the local checkout.
[update-standards](update-standards.md) performs the opposite direction: it
checkpoints and pushes the reviewed governance state to GitHub.

## Remove the integration

Start Codex from this repository and invoke the repository-local `uninstall-polylith-skills` skill. It first runs the ownership-aware `unlink` plan, binds the apply command to that plan's digest, then removes only the recorded links and unchanged managed block in `CODEX_HOME/AGENTS.md`. Text outside the delimiters, the checkout, link targets, runtime dependencies, and unrelated global skills remain intact. Restart Codex afterward to refresh skill and agent discovery.

[Operational instructions](../.agents/skills/install-polylith-skills/SKILL.md) · [Uninstallation guide](uninstall-polylith-skills.md) · [All skills](../README.md)
