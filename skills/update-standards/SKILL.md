---
name: update-standards
description: Commit the complete current state of the canonical standards repository through a reviewed checkpoint, then publish it to its configured GitHub branch. Use to publish local governance changes, not to pull updates or edit standards rules.
---

# Update Standards

Publish the canonical governance checkout so existing branch-based GitHub links display its current standards. Skills and reviewers continue reading local files. This workflow publishes the entire reviewed repository state, including skills, agents, documentation, and other non-ignored changes; it is not a standards-directory-only commit.

## Resolve the repository and publication scope

Resolve the physical checkout owning this installed skill and its `governance.json`. When invoked from a consuming project, operate on that governance checkout, not the consumer's Git state. Read its root `AGENTS.md` and applicable Codex-home instructions. Verify that the physical installed canonical standards directory belongs to the same checkout and matches `install.documentationDirectory/standards`. If the current directory is another repository, explicitly name both the invoking project and the checkout being published.

Read `repository.canonicalRemote` and `repository.defaultBranch` from the local manifest. Require a GitHub remote, the configured branch checked out, no unresolved merge/rebase/cherry-pick, and a single effective `origin` fetch destination and push destination identifying that same GitHub repository. Inspect effective URLs, including `pushurl` and URL rewrites; compare repository identity across supported SSH/HTTPS forms, never print embedded credentials. Reject a mismatched destination rather than changing remote configuration. Do not use the consuming project's branch, an inferred GitHub URL, or an arbitrary caller-supplied destination.

Inspect the remote branch and fetch its current tip into `FETCH_HEAD` when present, without changing the worktree or local branch. Require that remote tip to be an ancestor of local `HEAD`; stop on behind or diverged history. A genuinely absent destination branch is valid for a first push, but an authentication or network failure is not evidence that it is absent. Do not pull, merge, rebase, switch branches, stash, reset, or force-push to repair publication readiness.

Review the full outgoing history as well as the working tree. Existing commits ahead of the destination will also be published; for an absent branch, disclose the full reachable history being introduced. Include their scope in publication review and check for sensitive or accidental content even if it was subsequently deleted locally. Stop for a material issue rather than rewriting history automatically.

## Prepare and commit

Read and follow the sibling [check-point skill](../check-point/SKILL.md) for complete-state inspection, sensitive/large-file checks, the proposed commit message, snapshot fingerprinting, explicit acceptance, staging, hooks, and commit verification. Apply that workflow from the governance root. Do not restrict staging to canonical standards or ignore pre-existing changes.

Before the proposal, validate the canonical rule inventory with:

```text
node skills/review-standards/scripts/rule-inventory.mjs --check documentation/standards
```

Also validate affected skills, links, and changed tooling with their focused checks and any repository-required validation. Confirm cataloged skills and agent files exist and that `node_modules` is excluded. Complete required fixes only within authorized scope, then review the final snapshot. Do not invoke repository initialization or normalization merely to publish this governance checkout.

Show the governance repository, destination branch, whole-state change summary, outgoing history, proposed commit message, and verification evidence. Commit only after acceptance of the exact reviewed checkpoint. Prior authorization remains valid only for the same concrete scope; changed state requires a refreshed proposal. Standalone checkpoint acceptance does not by itself authorize publication.

If the worktree and index are already clean, do not create an empty commit. Continue with review of existing unpublished commits, or report that the destination is already current if there is nothing to publish.

## Publish the reviewed commit

After the commit, identify the exact commit ID and full outgoing range. Obtain explicit publication authorization for that scope and destination if it has not already been given. A request limited to a proposal or local commit never authorizes a push. Do not ask again when the same publication was already explicitly authorized; explain any new approval requirement by identifying the changed scope or destination.

Immediately before pushing, verify that `HEAD` is still the reviewed commit, the worktree and index are clean, the effective remote URLs and manifest publication settings are unchanged, and the remote branch is still at the inspected tip (or still absent). If any changed, stop and reassess the concrete publication plan. Do not sweep later work into another commit automatically.

Push only the reviewed commit to the configured branch, using an explicit refspec and disabling incidental tag publication:

```text
git -c push.followTags=false push --no-follow-tags origin <reviewed-commit>:refs/heads/<configured-default-branch>
```

Run Git through structured arguments or correctly quoted arguments. Never rely on an implicit upstream, `push.default`, `--all`, tags, mirror mode, force, or hook bypass. Normal non-fast-forward protection must remain active. Do not change GitHub branch protection or create an alternate publication branch to evade a rejected push.

On a push failure, preserve the local commit and report the exact remaining state. Do not claim publication or retry with broader permissions or a changed destination. A later retry rechecks the branch, outgoing scope, and authorization; it does not create a duplicate checkpoint.

## Verify and report

Read the remote branch tip after the push and confirm it equals the reviewed commit. Report an unverifiable or concurrently changed tip honestly instead of asserting that the exact publication is current. A successful local commit alone is not publication evidence.

Return the commit ID, committed scope, GitHub commit and standards-directory links, remote verification result, and remaining local changes. Existing `STANDARDS.md` links use the configured branch, so they need no URL rewrite for new contents at the same paths. Moved/deleted standards, a changed repository/branch, and access restrictions are separate concerns; private GitHub documents require access.

Do not regenerate every consuming repository or switch runtime standards resolution to HTTP. Other local installations update through the installer/bootstrap workflow; pushing does not synchronize their working copies. No GitHub Pages deployment, release, tag, or external announcement is part of this skill.
