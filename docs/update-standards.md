# Update Standards

Use this skill to commit and publish the current canonical standards repository to GitHub. It makes new standards visible through the branch-based links in generated `STANDARDS.md` guides.

## Use it

```text
Use $update-standards to checkpoint and publish the current governance repository.
```

The skill resolves the actual governance checkout, even when invoked from a consuming project. It reports which repository will be committed and published. It does not commit the consuming project's changes.

## What gets published

The checkpoint covers the complete governance repository state: standards, skills, agent definitions, documentation, tests, and other changed or new non-ignored files. Existing commits ahead of the destination are also included in the publication review. This is not a commit restricted to `documentation/standards/`.

The skill validates affected work and uses the [check-point](check-point.md) workflow to inspect the full snapshot and propose a commit message. You explicitly accept the checkpoint before it is committed. Publication also requires explicit authorization for the reviewed outgoing scope and destination; already-given authorization for that exact publication is reused.

If everything is already committed, the skill can publish reviewed pending commits without creating an empty one. If the remote already matches, it reports that there is nothing to publish.

## Where it publishes

`governance.json` supplies the canonical GitHub repository and default branch. The checked-out branch and effective `origin` fetch/push destinations must agree with that configuration. Publication uses a normal push of the exact reviewed commit to that branch, followed by a remote-tip check.

Behind or diverged history, destination changes, branch protection, authentication failures, or new local changes stop the workflow with a report. It does not force-push, rewrite history, switch branches, or bypass hooks. A failed push leaves the local commit available for a later verified retry.

## What changes for consumers

Generated guides point to URLs such as:

```text
https://github.com/Ondoher/polylith-skills/blob/main/documentation/standards/testing.md
```

After a successful push, the same URL shows the new published file. This needs no GitHub Pages deployment. Private repositories still require access, and moved or deleted files can require link updates.

Skills and reviewers continue reading standards from their local installed checkout. Pushing does not update other developers' working copies; those synchronize through installation maintenance or standard bootstrap. Guide fingerprints describe the local inputs used to generate them, so refreshing a guide remains necessary when those inputs change.

Use [update-canonical-standard](update-canonical-standard.md) to author or promote a rule. Use this skill to publish the resulting repository state. Use the installer’s update mode to pull published work into an installation.

[Operational instructions](../skills/update-standards/SKILL.md) · [Generated standards guide](write-standards-guide.md) · [All skills](../README.md)
