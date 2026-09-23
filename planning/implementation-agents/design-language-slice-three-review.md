# Design-Language Slice 3: Typography

Status: implemented and fixture-tested on 2026-09-17. Live named UI-agent evaluation and actual VS Code Markdown/standalone-SVG review remain pending.

## Implemented

Schema 0.4 adds one to eight typography roles to the existing palette/theme document. Each role has a bundled font ID, normal style, weight, CSS-pixel size and line height, theme color reference and one to four explicit sample lines. Missing font/size/weight/line-height choices retain null source values and explicit defaults. The Markdown displays metrics, sample text, asset hashes, status and missing decisions; Open Questions remains last.

The sample uses Roboto 16px/400 with provisional 24px line height and Merriweather 32px/700 with proposed 40px line height. Merriweather is the agreed serif exploration candidate; neither pairing nor metrics select Alexa typography.

Fontkit 2.0.4 shapes bundled Google Fonts into self-contained SVG paths. SHA-256 checks prevent unintended font replacement; no installed fonts or network are needed during rendering. Font sources and SIL licenses are packaged in assets/fonts. Non-weight variation axes are fixed and recorded in SVG metadata. Font names in the catalog distinguish the public family from Merriweather's internal "Merriweather Light" name.

Parent persistence, ownership protection and acceptance remain centralized. Accepted typography protects its record and resolved color; changing an upstream proposed color cannot bypass acceptance. Previous schemas still work; upgrading 0.3 preserves colors, history and owner prose. Typography-only revisions preserve color SVGs.

## Verification

All 38 tests passed: the previous 28 plus 10 typography tests. They exercise actual glyph paths and weight variants, explicit baseline spacing, byte-stable refinement, missing metrics, unchanged palette artifacts, invalid/unsupported inputs before publication, accepted color dependencies, 0.3 migration, downgrade/deletion rejection, manual SVG conflicts and stale revisions.

Skill validation and UI-role TOML parsing passed. The role retains its read-only sandbox and returns JSON only. Its installed contract now includes schema 0.4, but it was not invoked in this session.

A headless Chromium harness loaded the generated SVGs as image elements without font imports. Visual inspection confirmed legible Roboto and Merriweather specimens and no clipped text. This was browser image-embedding inspection, not a VS Code preview or actual Markdown renderer test.

## Review Artifact

 The complete JSON contract and installation requirement are in [the installed reference](../../skills/refine-design/references/design-language.md).

## Limits And Next Slice

Normal-style Roboto and Merriweather only; no implicit font substitution. Other inventoried families remain future additions. Explicit left-to-right sample lines only; no automatic wrapping, italic assets, full comps or generalized text editing. White background and 16px padding are specimen review conventions, not accepted app styling. Outlined text is not selectable; readable sample text remains in Markdown.

Fresh installations need npm ci --ignore-scripts in the skill directory and the bundled font assets/licenses. The pinned package and lockfile belong to the future skills-repository migration. Font/rendering dependency upgrades require explicit artifact migration if they change generated output.

Slice 4 is the central labeled icon sheet with asset identity and explicit missing assets.
