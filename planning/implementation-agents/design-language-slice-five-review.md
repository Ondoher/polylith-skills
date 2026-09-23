# Design-Language Slice 5: Password Component

Status: implemented and fixture-tested on 2026-09-17. Actual VS Code review and live named UI-agent evaluation remain pending.

## Implemented

The owner selected modmod's password component as the first reusable component specimen. Schema 0.6 adds one MUI-inspired outlined password input at two widths, assembled from existing typography, color and icon references. This is not an Alexa feature requirement, a full comp or live password validation.

The synthetic fixture uses 280px and 400px fields, a floating label, twelve masking bullets, a visibility adornment, helper text and three illustrative requirements with mixed supplied outcomes. Visibility/VisibilityOff and CheckCircle/Cancel are added to the pinned MUI catalog and central icon inventory. The masked-state icon follows the inspected modmod convention; the intended action label is "Show password".

A separate layout module shapes actual bundled fonts, wraps supporting text by measured word width, and calculates content height. Field padding, font metrics, icon sizes and adornment area remain fixed as width changes. Width and spacing annotations use the same resolved metrics as rendering. The source stores a masked length only, never credentials.

Missing metrics retain null with explicit fallbacks. The example's ruleGap remains unspecified with a 4px default; it also inherits the previously unresolved body line height and border mapping. Accepted components cannot depend on defaults and protect consumed typography, icon and color values against unapproved dependency changes.

The read-only UI role's bounded handoff and skill references now document schema 0.6. Earlier contracts remain available. No application source or modmod files were changed.

## Verification

All 57 tests passed: the previous 48 plus nine password tests. Checks cover measured wrapping and content-driven height, fixed dimensions, annotation/default reporting, selective updates, accepted references, invalid geometry/contracts, 0.5 migration with history/owner notes, byte-stable rerenders, edited SVG preservation and stale revisions.

The fixture's longer requirement occupies two lines at 280px and one at 400px. A component spacing change updates only its two SVGs among the existing image artifacts. Prior palette, typography and icon files survive migration unchanged.

Skill validation and UI-role TOML parsing passed. Browser image-embedding inspection showed both generated SVGs side by side, including the floated label, outlined field, masked value, visibility adornment, wrapped helper/rule text, distinct pass/fail shapes and annotations. No clipping was visible. This is Chromium evidence, not actual VS Code or live specialist validation.

## Review Artifact

 See [the installed contract](../../skills/refine-design/references/design-language.md).

## Limits And Next Slice

The template is a static MUI-inspired SVG specimen, not a pixel-perfect browser rendering or an interactive form. Its password rules are illustrative data, not application policy. Text is bounded LTR word wrapping; oversized individual words receive a diagnostic, with no general hyphenation engine. Drawings are limited to the populated masked configuration in this slice.

Slice 6 adds representative empty/populated, masked/revealed, focus, disabled, error and requirements shown/hidden cases, plus a missing-component placeholder. These familiar variations remain design-language component specimens; they do not automatically require a full comp.
