---
name: install-polylith-skills
description: Install, inspect, repair, update, relocate, or safely unlink the managed skills and agents from this repository in the user's Codex home.
---

# Install Polylith Skills

Use the repository's deterministic installer rather than creating links or copying files manually.

1. Run the requested mode without `--apply` and inspect its JSON plan. Record the emitted `planDigest`:

   ```text
   node scripts/install-polylith-skills.mjs <mode>
   ```

2. Explain every collision and user-level mutation. Obtain authorization immediately before rerunning a mutating mode; approval for one plan does not authorize a changed plan.
3. Run the approved command with `--apply --expect-plan <planDigest>`. The installer must reject a missing or changed digest before reconciling Codex-home paths. If it reports `PLAN_CHANGED`, inspect and disclose the newly emitted plan and do not retry until that plan is authorized.
4. Run `status` after a successful install, repair, update, or relocation. Tell the user when Codex should restart to guarantee skill discovery.

Use `--migrate-identical` only when the user wants existing copied content migrated. It permits replacement only after recursive equality with the repository source, ignoring `node_modules`, and rolls back on failure. It never permits replacing different content or an unrelated link.

`install`, `repair`, and `update` restore locked skill runtime dependencies with `npm ci --ignore-scripts` before switching links. `update` additionally requires the trusted branch and remote, a clean worktree, and a fast-forward-only pull. If the installer changes during that pull, stop and invoke the freshly updated skill again.

Use the platform adapter selected by the installer: directory junctions on Windows and directory symbolic links on macOS or Linux. macOS and Linux require Node.js, Git, npm, and permission to create symlinks within the selected Codex home. Dependency restoration launches `npm` directly on POSIX. Do not substitute copied directories when live links are unavailable.

`status` and `unlink` must inspect the actual link without following it for ownership decisions. In `CODEX_HOME/AGENTS.md`, the installer owns only the block delimited by `<!-- BEGIN POLYLITH SKILLS MANAGED BLOCK -->` and `<!-- END POLYLITH SKILLS MANAGED BLOCK -->`. Preserve all surrounding text, including additions made after a dry run. Refuse to update or remove a managed block whose recorded content hash no longer matches. The installer may remove only recorded links and that verified block. It must never delete a link target, checkout, unrelated skill, surrounding global instructions, or modified managed block.

The repository declares installer tests for Windows, macOS, and Linux. Treat macOS and Linux behavior as best-effort until the corresponding hosted CI jobs have completed successfully, and report platform-specific failures rather than weakening link or ownership checks.
