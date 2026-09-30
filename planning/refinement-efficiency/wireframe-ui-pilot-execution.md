# Wireframe-to-UI pilot execution

Status: running. Implements the [staged plan](wireframe-ui-pilot-plan.md).

## Progress

- Execution rules loaded; normal Codex connection and isolated outputs retained.
- Existing UX records, renderer and UI component path inspected.
- Deterministic previews, progressive storage, scoped handoff and native client
  are locally verified. Development helpers are not extra design authors and
  their time is not counted as measured design time.
- Actual wireframe and UI authors started at 2026-09-30T16:40:29Z after the
  environment allowed the normal Codex launch. Per-element output is in progress.

## Questions and decisions

1. **Which source?** Reuse the latest saved Sol first-pass units and their exact
   earlier UX4 baseline. Assemble by code; do not rerun flow design or alter live
   Alexa files. Preserve the source's unreviewed status.
2. **What does one agent mean?** One persistent wireframe author and one persistent
   UI author, as specified in the accepted plan. Reuse each conversation across
   elements; no per-element worker pool.
3. **What to reuse for rendering?** Existing parts, scenes and native UI rendering
   vocabulary. The old semantic wireframe display alone does not show spatial
   design; a small isolated adapter will add neutral rendering and provisional
   preview labels without weakening canonical review gates.
4. **How to deliver ready work?** MCP stores immutable contributions and the
   coordinator schedules each saved ready handle. A waiting UI conversation is
   resumed instead of paying for polling or asking another model to repackage it.
5. **Which color record governs?** The frozen design-language JSON explicitly
   withdrew the resting label/outline equality override, while colors.md retains
   stale wording. Follow the JSON; use black filled-button labels, separately
   defined resting label/border colors and matching focus/error state colors.
6. **Why did the first launch fail?** The filesystem sandbox rejected process
   creation. Automatic approval then twice rejected the normal Codex run as an
   insufficiently authorized external-data transfer. The launch was permitted
   after the owner reiterated no local model proxy and renewed execution. Keep
   these permission delays separate from design timings. No proxy was introduced.

## Verification and remaining work

Nine local tests cover the happy-path toolchain and encountered client lifecycle
failures. Source protection covers 631 files. Component authoring, separate
review/rework, full affected-set coverage, performance analysis and checkpoint
remain in progress. No measured speed or quality conclusion is available yet.
