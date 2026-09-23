# Design-Language Slice 4: Required Icons

Status: implemented and fixture-tested on 2026-09-17. Actual VS Code preview and live named UI-agent evaluation remain pending.

## Implemented

Schema 0.5 adds semantic icon IDs, exact source/version/variant, size, theme color references, meaning, accessible naming intent and proposal/acceptance status. The UI role returns this bounded JSON; the parent persists the inventory and SVGs in the existing design-language document.

MUI Material Icons is the owner-selected starting source. The bundled Filled set is pinned to @mui/icons-material 7.3.4: PlayArrow, Pause, VideoCall, FileDownload and Download. Source JavaScript is retained as evidence, never executed by the renderer. The package license, source URLs/hashes, bounded path geometry and geometry hashes are bundled in assets/icons. No MUI/React dependency was installed in Alexa or the renderer.

The demonstration shows play, pause, add video, export and an unresolved assembly choice. Camera-plus and download-style metaphors have explicit context limitations; they are proposed examples, not accepted Alexa selections. The unresolved choice remains null with an explicit placeholder requirement and a dashed question-mark box.

Individual icon SVGs and a central labeled sheet are generated. Labels use outlined Roboto; white background, label metrics and sheet spacing are review conventions. Markdown records source provenance, meanings, metrics, status and naming intent. Open Questions remains last.

Accepted icons protect their records and resolved colors, including upstream palette changes. Missing colors propagate visibly and prevent acceptance. A locally unbundled MUI export is reported as a packaging gap, not evidence of inadequate MUI coverage.

## Verification

All 48 tests passed: the previous 38 and ten icon tests. New coverage includes exact geometry/source matching, catalog provenance, placeholder persistence, unique SVG IDs, selective replacement, missing-choice resolution, accepted geometry/size/color protection, inherited defaults, invalid inputs, 0.4 migration, unchanged revisions and artifact conflicts.

Skill metadata validation and UI-agent TOML parsing passed; the role remains read-only. Existing Alexa repository changes were left untouched.

The actual generated central SVG was opened in headless Chromium and visually inspected. All five labeled entries were visible without clipping, including the dashed placeholder and missing-choice label. This is browser SVG inspection, not VS Code or a Markdown preview verification.

## Review Artifact

 The [installed contract](../../skills/refine-design/references/design-language.md) documents the current bounded schema and catalog.

## Limits And Next Slice

Only the bundled Filled assets are currently available. Other MUI exports require verified catalog additions; other sources require a demonstrated requirement gap. No broad icon search, generated custom icons, full comps or application implementation was introduced.

Actual control accessibility and icon meaning still need context review. Icon dimensions are not hit-target dimensions. Unknown/missing packaged files produce a diagnostic; unresolved design choices use explicit placeholders.

Slice 5 is one resizable component, assembling existing typography, colors and icons at two sizes with explicit spacing/padding metrics.
