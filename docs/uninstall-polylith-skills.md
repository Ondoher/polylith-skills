# Uninstall Polylith Skills

Use this repository-local skill to remove the global integration installed from this checkout. Open the checkout in Codex, even if its global links are broken.

## Use it

```text
Use $uninstall-polylith-skills to show the uninstall plan without applying it.
```

When you want removal, explicitly request it and authorize the disclosed user-level changes under the repository's instructions.

## What happens

The skill runs the installer's `unlink` plan and explains every removal. The plan is bound to a digest so changed paths or ownership evidence cannot silently alter what is removed. It removes only recorded links that still target this repository and the unchanged managed instructions block in Codex-home `AGENTS.md`.

Changed links, a modified managed block, malformed state, and missing ownership evidence block the affected removal. The skill reports retained collisions rather than deleting paths manually.

Afterward it verifies removal of the owned integration and installation-state file, and checks that the checkout and surrounding instructions remain. Restart Codex to refresh discovery. An ordinary installation status check is not the success criterion because successful uninstallation intentionally removes the state file.

## What remains

The checkout, source files, runtime dependencies, unrelated skills, and instructions outside the managed block remain intact. Uninstallation does not move the checkout or perform Git operations. You can reinstall later using the same local installer.

[Operational instructions](../.agents/skills/uninstall-polylith-skills/SKILL.md) · [Installation](install-polylith-skills.md) · [All skills](../README.md)
