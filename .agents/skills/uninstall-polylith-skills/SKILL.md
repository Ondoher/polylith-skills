---
name: uninstall-polylith-skills
description: Safely remove the global Codex links and managed root instructions installed from this repository while preserving the checkout and unrelated skills.
---

# Uninstall Polylith Skills

Use the repository installer's ownership-aware `unlink` mode. Do not remove global paths manually.

1. Resolve the repository root containing this skill and the active Codex home from `CODEX_HOME`, or use `~/.codex` when it is unset.
2. Run the exact uninstall plan without `--apply`:

   ```text
   node scripts/install-polylith-skills.mjs unlink --repository <repository-root> --codex-home <codex-home>
   ```

3. Inspect and explain every planned removal and record the emitted `planDigest`. The plan may remove only links recorded by `.polylith-skills-installation.json` that still target this repository and the unchanged block delimited by `<!-- BEGIN POLYLITH SKILLS MANAGED BLOCK -->` and `<!-- END POLYLITH SKILLS MANAGED BLOCK -->` in `AGENTS.md`. Text outside the block is user-owned and is not bound into the plan digest. Treat a changed path, changed managed block, malformed state, missing ownership evidence, or unrelated target as a blocking collision.
4. When the user requested uninstallation and did not limit the request to a dry run, that request authorizes the unchanged disclosed plan. Rerun it with `--apply --expect-plan <planDigest>`, subject to normal filesystem and sandbox approval enforcement. The installer must reject a missing or changed digest. If it reports `PLAN_CHANGED`, inspect and disclose the newly emitted plan and do not retry until that plan is authorized.
5. Verify that the installation-state file, every link marked for removal, and the managed block are absent; verify that surrounding `AGENTS.md` text, the repository checkout, and its source files still exist. Do not use `status` as the success check because a successful uninstall intentionally has no installation state.
6. Report any retained collision and tell the user to restart Codex so removed global skills and agents are no longer discovered.

Uninstallation never deletes or moves the repository checkout, a link target, runtime dependencies in the checkout, unrelated global skills, surrounding global instructions, or a modified managed block. It performs no Git operation.
