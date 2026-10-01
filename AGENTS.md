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

**NEVER launch a separate Codex model session from a repository script or CLI,
call the Codex backend directly, or route model requests through a localhost
proxy, local redirect, or request observer unless the user explicitly asks for
that specific execution path in the current request.** A request to run a plan,
refine a product, work independently, or measure performance does not authorize
any of those paths. Do not introduce one as a fallback or ask the user to approve
one merely to complete an ordinary workflow.

Use the current Codex conversation and its available agents and tools for normal
model work. Ordinary in-session agent work needs no separate permission. The
local MCP data service is distinct from model execution and remains available.
If a saved plan or script prescribes a separate model session without the user's
specific request for it, adapt the plan to the in-session path and preserve its
data; do not run that script's model-execution option.
