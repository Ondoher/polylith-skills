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

Standing user rule: use Codex's normal model connection for all agent work,
workflow runs and performance tests. Do not start, enable or route model requests
through a localhost proxy, local model redirect or model-request observer proxy
unless the user specifically requests that proxy for the run. General permission
to execute a plan, work independently or measure performance is not permission to
use a proxy. Do not introduce one as a fallback. The local MCP data service is
separate from the model connection and remains allowed.

Requests to execute these workflows authorize their ordinary use of Codex models
through the normal authenticated connection, including processing the task's
product facts and artifacts. Do not ask for separate permission merely because
that normal model connection is being used. This does not authorize a local
model proxy or override an actual platform approval restriction.
