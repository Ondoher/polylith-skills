# MUI Color Baseline

Owner decision, 2026-09-17: when the application is MUI, start ordinary UI colors from the target MUI version's defaults, not newly invented colors. Preserve supplied application overrides and branding; standard theme colors do not define a new app identity. Use the app's selected palette mode; absent a selection, follow the existing default-light policy and state that assumption. A known framework baseline is not a missing color requirement.

## Source And Scope

Read the target's installed @mui/material version and actual theme overrides. The current bundled assets/mui-palette-defaults.json snapshot contains light and dark uncustomized createPalette results from @mui/material 9.4.0 installed in the sample product. It records package version and hashes of createPalette and Button sources. This is version-specific reference data, not a new runtime dependency or a claim about all MUI releases. For another version, inspect its installed package and deliberately refresh/review the snapshot rather than silently reusing it. Do not execute untrusted theme/project configuration merely to extract colors.

Primary references: [MUI palette](https://mui.com/material-ui/customization/palette/), [default theme viewer](https://mui.com/material-ui/customization/default-theme/), [CSS theme variables](https://mui.com/material-ui/customization/css-theme-variables/usage/), accessed 2026-09-17. Use default theme data, not the documentation website's custom branding.

## Parent Preparation

Use scripts/design-language-mui.mjs exported withMuiDefaults(proposal, options) before the normal applyProposal persistence call. Options require framework: mui, exact version, explicit light/dark mode, roleTokens mapping existing/new semantic IDs to {token, onToken?}, and optional replace containing explicitly chosen role IDs. The helper returns {proposal, imported, preserved} without writing. It fills missing/new roles and preserves specified roles by default. Explicit replacement prepares a remapping but does not bypass normal accepted-record/dependency protection during persistence.

Select relevant roles: primary/secondary, success/error/warning/info, text, backgrounds, divider and action states. Keep standard color variants tied to the corresponding MUI role. Do not fill every catalog color or invent extra branding roles. Current schema 0.14 bounds still apply. Use [extras-proposal.json](extras-proposal.json) as the reproducible current-schema specimen.

The helper adds separate mui-<mode>-<role-id> palette members and maps semantic roles to them, preserving existing identity members. Every imported member/role records library/version, mode, original palette token and raw value in its purpose/rationale. Current schema 0.14 uses proposed for records that have no individual acceptance event; this is an inherited framework baseline, not an unresolved value or a request to redesign each MUI color. An app-specific override remains an explicit design decision. Do not grant acceptance automatically.

## Outlined Field Labels And Outlines

For MUI outlined text fields and selects, specify the visible `InputLabel` and the notched outline together for each state. Focus and error synchronize their colors. A floating or shrunken label alone does not imply focus: a populated, unfocused field retains its resting label color. This applies to design-language specimens, composition and component scenes, and UI handoffs.

Verified against installed @mui/material 9.4.0 and the upstream [FormLabel source](https://github.com/mui/material-ui/blob/master/packages/mui-material/src/FormLabel/FormLabel.js) and [OutlinedInput source](https://github.com/mui/material-ui/blob/master/packages/mui-material/src/OutlinedInput/OutlinedInput.js), checked 2026-09-27. The following values describe the uncustomized light theme; preserve the target's selected mode, component color and explicit overrides.

| State                                      | Visible label                         | Notched outline                                     |
| ------------------------------------------ | ------------------------------------- | --------------------------------------------------- |
| Resting, including populated/shrunken      | `text.secondary`: black at 0.60 alpha | Black at 0.23 alpha                                 |
| Hover, enabled and unfocused without error | Resting label color                   | `text.primary`: black at 0.87 alpha                 |
| Focused without error                      | `palette[color].main`                 | The same `palette[color].main`, with a 2 px outline |
| Error, enabled, including focused error    | `error.main`                          | The same `error.main`                               |
| Disabled without error                     | `text.disabled`: black at 0.38 alpha  | `action.disabled`: black at 0.26 alpha              |

Use the control's selected theme color for focus (`primary` by default), so an app's primary-color override affects both the focused label and outline. Error overrides that focus color. Do not leave the label in its resting gray when the enabled field is focused or in error. Resting and disabled labels are intentionally darker than their outlines; universal color equality would be an explicit application override rather than a MUI default.

The entered value and helper text have their own state rules; do not recolor all text merely because the outline changes. A renderer that cannot show the required label/outline state pairing must disclose that fidelity gap in the affected scene. Preserve the MUI design intent in the handoff and retain the scene's partial status until its required states can be represented.

## Alpha And Component States

The bounded schema stores six-digit hex colors. An alpha token therefore requires onToken naming an opaque MUI preview background; preserve the original RGBA expression and surface in provenance. Flattened preview colors are not runtime CSS values and are not reusable on arbitrary surfaces. For app-customized surfaces, calculate and document the actual combination separately; do not pretend a stock white-surface result applies. Dark primary contrastText also contains alpha, so supply its actual component background explicitly.

For the current light contained-button specimen, default uses primary.main and primary.contrastText; hover uses primary.dark. Disabled background uses action.disabledBackground over background.paper, and disabled foreground uses action.disabled over that disabled background. The 9.4.0 light action.disabled alpha is 0.26, distinct from text.disabled 0.38. Keep compositing explicit through the existing mix expressions. Pressed treatment, focus-ring geometry and loading presentation remain specimen proposals; pulling palette defaults does not make the whole SVG a pixel-perfect MUI capture.

Runtime implementation must use applicable standard MUI CSS variables under the existing CSS-owned styling rules. Extracted hex previews do not authorize hardcoded app colors or a duplicate theme system. This helper prepares one selected mode per document, not a theme-switching renderer or automatic live synchronization with app CSS.
