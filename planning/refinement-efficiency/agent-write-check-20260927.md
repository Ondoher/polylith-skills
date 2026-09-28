# Agent write-permission check after restart

Result: **16 of 16 managed agents passed** on 2026-09-27.

Each fresh role instance wrote its own name to `probe.txt` inside its assigned scratch directory and read it back. The parent independently checked the exact file bytes. All source TOML files parsed, used `workspace-write`, and matched the installed linked configurations. No permission escalation or configuration repair was needed during the agent checks.

The check window took **180.017 seconds**, including coordinator preparation and staggered dispatch with overlapping agent work. This is not a measurement of isolated agent reasoning or tool execution. Usage totals were not available.

| Agent                     | Configuration/link | Live write/read | Parent byte check |
| ------------------------- | ------------------ | --------------- | ----------------- |
| architecture-reviewer     | Pass               | Pass            | Pass              |
| checkpoint-advisor        | Pass               | Pass            | Pass              |
| contracts-reviewer        | Pass               | Pass            | Pass              |
| controller-agent          | Pass               | Pass            | Pass              |
| document-structure        | Pass               | Pass            | Pass              |
| model-agent               | Pass               | Pass            | Pass              |
| polylith-architect        | Pass               | Pass            | Pass              |
| privacy-security-reviewer | Pass               | Pass            | Pass              |
| system-architect          | Pass               | Pass            | Pass              |
| technical-researcher      | Pass               | Pass            | Pass              |
| ui-designer               | Pass               | Pass            | Pass              |
| ui-reviewer               | Pass               | Pass            | Pass              |
| ux-planner                | Pass               | Pass            | Pass              |
| ux-reviewer               | Pass               | Pass            | Pass              |
| verification-reviewer     | Pass               | Pass            | Pass              |
| view-agent                | Pass               | Pass            | Pass              |

The check confirms scoped file delivery after restart. MCP submission and service-side permission enforcement still need verification when the service exists. Denied-path behavior was outside this positive-case check. No product refinement, broad review, or commit was performed.

Raw evidence and configuration hashes: [measurement record](agent-write-check-20260927.json). Probe files are preserved under `.codex-tmp/agent-write-check-20260927/`.
