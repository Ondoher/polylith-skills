# Agents

This repository is the source of truth for the managed Codex skills, agents, and documentation listed in `governance.json`.

Keep the manifest catalog closed and explicit. Add or remove a managed package and its catalog entry in the same change. Do not commit `node_modules`; the installer restores locked runtime dependencies with `npm ci --ignore-scripts`.

Use the repository-local `install-polylith-skills` skill for installation, inspection, repair, update, and relocation. Use `uninstall-polylith-skills` for ownership-aware unlinking. User-level mutations require review of the dry-run plan and explicit authorization.

Current work is routed through [agents/topics/active-topic.md](agents/topics/active-topic.md). Resolve engineering standards through the [folder manifest](agents/topics/standards/manifest.md) and [repository overlay](agents/topics/standards/overlay.md).

Use `skills/refine-design/scripts/bounded-read.mjs` for large instruction or file
batches. Supply all paths together and forward one raw page per tool response;
follow its continuation instead of combining large command outputs. Keep existing
tool limits and check for truncation. The helper bounds its own output, not extra
text added by callers.

Use Codex's normal model connection for workflow runs and performance tests.
Do not enable a local model redirect or model-request observer proxy unless the
user explicitly requests it. This does not prohibit the local MCP data service.
