# Check Point

Use this skill for one reviewed Git commit containing the entire current repository state.

## Use it

```text
Use $check-point to propose a checkpoint for all current changes.
```

The proposal phase is read-only. The skill inspects staged and unstaged changes, deletions, renames, relevant submodule changes, and untracked files. Ignored untracked files remain excluded. The scope includes more than files changed in the current conversation.

## Review before committing

The skill proposes an imperative commit header and bullets describing material outcomes, alongside scope and validation results. It flags likely secrets, personal data, accidental output, and large data files before acceptance.

Large-data checks include likely data files of at least 1 MiB, aggregate likely data of at least 10 MiB, and any individual file of at least 10 MiB. Concerns require specific resolution or informed confirmation; generic acceptance of a message does not resolve them.

You can revise the proposed message. Only explicit acceptance of the latest message and reviewed scope authorizes the commit.

## Commit and result

Before staging, the skill checks that the snapshot still matches what you accepted. A changed snapshot requires a new proposal. Otherwise, it stages the complete state with `git add -A`, verifies the staged diff, runs required validation, and commits with the accepted message.

The handoff reports the hash, summary, validation, and remaining changes. Failed hooks or validation leave the resulting state visible; the skill does not bypass hooks or silently reset staging. Acceptance authorizes one commit, not a push, amend, tag, or history rewrite.

[Operational instructions](../skills/check-point/SKILL.md) · [Standards review](review-standards.md) · [All skills](../README.md)
