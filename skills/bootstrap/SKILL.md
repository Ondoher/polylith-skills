---
name: bootstrap
description: Bootstrap the current repository when the user says to bootstrap by loading Codex-root and repository-root AGENTS.md instructions, with an explicit instructions-only profile for repositories that do not use code-review infrastructure.
---

# Bootstrap

1. Resolve the Codex root from `CODEX_HOME`, or use `~/.codex` when `CODEX_HOME` is unset.
2. If `AGENTS.md` exists in the Codex root, read it completely and follow its instructions, including reading any files it routes to.
3. Determine the root of the repository containing the current working directory without modifying Git state.
4. Read the repository root's `AGENTS.md` completely and follow its instructions, including reading any files it routes to, before continuing with the user's repository work.
5. Apply both instruction sets. When they conflict, follow the repository-specific instruction unless a higher-priority instruction requires otherwise.
6. The absence of a Codex-root `AGENTS.md` is not an error. If the current working directory is not inside a repository, or the repository root has no `AGENTS.md`, report that clearly and do not invent repository instructions.
7. After reading the repository-root `AGENTS.md`, check for the exact standalone directive `Bootstrap profile: instructions-only`. Only the repository-root file may select this profile; do not infer it from repository contents or accept it from a nested instruction file. When present:
    - finish loading and following every instruction and routed authority required by the Codex-root and repository-root `AGENTS.md` files;
    - skip `review-standards` bootstrap, normalization and Prettier eligibility checks, reviewer and checkpoint-adviser startup, topic-refresh lifecycle setup, and `write-standards-guide` checks;
    - report bootstrap complete using the `instructions-only` profile and continue directly with the user's work under the loaded repository authority; and
    - do not describe skipped review infrastructure as missing or blocked.

    This profile does not bypass system or developer instructions, applicable safety and permission rules, the Codex-root `AGENTS.md`, or any skill explicitly invoked by the engineer. A later request to run a standards reviewer still goes through `review-standards` and all of its gates.
8. When the directive is absent, use the standard profile. Before any other state-changing bootstrap action, check for the Polylith skills installation record at `<codex-root>/.polylith-skills-installation.json`. When it exists:
    - resolve the recorded governance checkout and invoke its `scripts/install-polylith-skills.mjs` in `update` mode, first without `--apply` to inspect the exact plan and then with `--apply` to perform it;
    - allow the update only when the installer verifies the canonical remote recorded by `governance.json`, the configured default branch and upstream, and a clean working tree, and performs only `git pull --ff-only` plus reconciliation of installer-owned links and files;
    - treat explicit invocation of bootstrap as authorization for this narrowly scoped governance update, while still honoring filesystem, network, sandbox, and approval enforcement;
    - stop standard-profile bootstrap and reviewer startup if plan validation, authorization, the pull, dependency restoration, repository validation, or link reconciliation fails; do not stash, reset, merge, rebase, switch branches, discard changes, or select another remote to recover;
    - when the checkout changes, reread this `SKILL.md`, the Codex-root `AGENTS.md`, the current repository-root `AGENTS.md`, and every authority they route to before continuing. Re-evaluate the selected bootstrap profile, but do not repeat an already successful synchronization during the same bootstrap invocation.

    When the installation record is absent, continue with the installed local authority and report that automatic governance synchronization is unavailable. An `instructions-only` profile does not run the update or any other review-infrastructure action; it may use read-only installation status to report that governance could be stale, then continues under the instructions already loaded.
9. After any required governance synchronization succeeds, check whether the global `review-standards` skill and its required reviewer definitions are installed. When they exist, read the skill and execute its `bootstrap` mode after repository instructions are loaded. This is part of bootstrap, not a recursive invocation of this skill. The review preflight may report that the repository is ineligible, but it must not weaken either gate or prevent the loaded repository instructions from governing subsequent work.
10. If review infrastructure is missing or any startup eligibility gate fails, report bootstrap as instruction-loaded but review-blocked. A repository has satisfied the standards-normalization prerequisite permanently once a structurally valid `agents/topics/standards/normalization.json` records a completed normalization; later standards configuration changes do not make it stale. Name each failed prerequisite and give these exact recovery commands as applicable, in dependency order:
    - missing reviewer infrastructure: `$review-standards setup reviewers`
    - repository has never normalized, or its marker is missing or structurally invalid: `$normalize-standards audit`, then manually review every divergence, then `$normalize-standards reconcile`
    - after all prerequisites pass: `$bootstrap`
      Do not claim that reviewers started, and do not collapse manual normalization review into a single automatic command.
11. Formatting is a bootstrap diagnostic, not a startup eligibility gate. Run the formatting preflight and, when setup is valid, `npm run format:check`. Report missing or invalid setup with `$review-standards setup formatting`; report a failed check with `npm run format:check` and offer `npm run format` only as a separately authorized rewrite. Continue reviewer and checkpoint-adviser initialization. Explain that final review cannot be declared clean and a checkpoint cannot be recommended until formatting passes.
12. On eligible standard bootstrap, wait for every applicable reviewer readiness result before reporting bootstrap complete. Start `checkpoint-advisor` monitoring only when the repository's bootstrap instructions explicitly name it.
13. During standard bootstrap, run the global `write-standards-guide` helper in `write` mode after confirming the repository has ever normalized. This generated-file refresh has standing authorization and updates only root `STANDARDS.md`. It is driven by current manifest, overlay, and selected canonical-standard hashes and does not require normalization or manual divergence review.
