# Agents

This repository is the source of truth for the managed Codex skills, agents, and documentation listed in `governance.json`.

Keep the manifest catalog closed and explicit. Add or remove a managed package and its catalog entry in the same change. Do not commit `node_modules`; the installer restores locked runtime dependencies with `npm ci --ignore-scripts`.

Use the repository-local `install-polylith-skills` skill for installation, inspection, repair, update, and relocation. Use `uninstall-polylith-skills` for ownership-aware unlinking. User-level mutations require review of the dry-run plan and explicit authorization.
