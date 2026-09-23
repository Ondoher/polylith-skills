# Design-Language Slice 1: Implementation And Evidence

Status: implementation and deterministic fixture verification complete; a live named UI-role invocation and review in VS Code remain pending. This is not a claim that every end-to-end Slice 1 acceptance criterion has passed.

## Implemented Scope

The installed [refine-design skill](../../skills/refine-design/SKILL.md) now routes product/design-language requests to a [bounded one-color workflow](../../skills/refine-design/references/design-language.md). The read-only UI designer can return its JSON proposal as text. The parent invokes the Node helper to validate and save the source, draw a labeled SVG swatch and maintain one Markdown document.

Artifacts follow the agreed base-folder convention: `design-language.md`, `design-language/design-language.json` and `design-language/specimens/colors.svg`. Refinements preserve document/color IDs and owner text outside the marked generated section. Unchanged proposals preserve revision and byte content. Invalid/stale proposals and manual edits inside generated artifacts are reported rather than overwritten.

Only proposed colors are supported. Accepted-color editing, palettes, missing-value defaults, typography, icons, component templates and full comps remain outside this slice. The current slice-1.1 SVG is a 40 by 20 pixel table swatch without visible text. Its name, value and status appear in the Markdown row.

## Verification Performed

- Node 25.4.0: all 9 behavioral tests passed using isolated temporary folders.
- CLI creation produced consistent JSON, SVG and a relative Markdown embed.
- A follow-up refinement changed the value while preserving identity and owner notes.
- Identical current proposals produced byte-identical artifacts without incrementing revision.
- Stale revisions, changed IDs, invalid colors, unknown fields, unsupported accepted status, unowned existing files and manual generated-file edits were rejected.
- SVG/Markdown escaping and refusal to write through linked output directories were exercised.
- The skill-creator metadata validator passed.
- The UI-agent TOML parsed successfully and retained its read-only sandbox.
- The original large synthetic specimen was rendered with headless Chromium and visually inspected. Following owner feedback, slice-1.1 replaces it with a compact 40 by 20 pixel SVG inside the Markdown table, whose text supplies the status; all 9 tests pass after this change. The current Markdown/SVG review artifacts were updated while preserving their source revision.

The sandbox initially prevented Node test subprocess creation (spawn EPERM). The same test suite passed under a scoped approved execution with isolated temporary outputs; this was an execution restriction, not a code failure.

## Review Artifact

The sample is intentionally synthetic, with source.kind `fixture`; it is not an Alexa branding decision or a UI-agent assessment.

## Remaining Evidence

The active session does not expose `ui-designer` as a callable named role. Its installed definition and structured-output contract were updated, but that is not evidence of a live specialist run. Use an environment/session exposing the role to run the actual skill with a small brief, then refine the saved proposal.

The user selected VS Code's SVG viewer and Markdown preview. Chromium inspection does not establish VS Code behavior; review the example directly and through its Markdown embed there. Do not claim full slice acceptance until those checks are complete.

The helper stages files and rolls back caught write failures. It does not guarantee recovery across process termination midway through multi-file publication, and concurrent writes to one design folder are unsupported. No package dependencies, full layout framework or application code changes were introduced.
