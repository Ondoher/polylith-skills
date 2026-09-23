# MUI

## Purpose

<!-- rule: MUI-001 -->
MUI supplies standard application controls and a CSS-variable theme without becoming the owner of product layout or domain presentation. This topic defines the provider stack, supported import/style paths, and the boundary between MUI component behavior and application CSS.

## Provider And Theme Ownership

<!-- rule: MUI-002 -->
`src/<app>/services/theme.js` owns a stable MUI CSS-variable theme with neutral light and dark color schemes. The initial scheme is light. Theme selection and persistence are intentionally deferred. The service owns theme creation and provider configuration; application-authored visual values and branding overrides belong in the CSS theme layer, not JavaScript theme objects. Consuming MUI-generated default variables does not authorize adding static application styling to the service.

<!-- rule: MUI-003 -->
`src/<app>/main/main.jsx` installs providers in this order:

<!-- rule: MUI-004 -->
1. `StyledEngineProvider` with `enableCssLayer`;
<!-- rule: MUI-005 -->
2. `ThemeProvider` using the registry-owned theme;
<!-- rule: MUI-006 -->
3. `CssBaseline`;
<!-- rule: MUI-007 -->
4. that application's root context;
<!-- rule: MUI-008 -->
5. application presentation.

<!-- rule: MUI-009 -->
Use stable MUI APIs. Import `createTheme` and `ThemeProvider` from the supported `@mui/material/styles` export. Do not use the older experimental CSS-variable provider APIs.

## Import Rules

<!-- rule: MUI-010 -->
Prefer direct component imports:

<!-- rule: MUI-011 -->
```js
import Dialog from '@mui/material/Dialog';
import FormControl from '@mui/material/FormControl';
```

<!-- rule: MUI-012 -->
Do not import components from the `@mui/material` barrel. Direct imports keep the build graph clear and avoid unnecessary Rollup tree-shaking work. Use only package subpaths actually exported by the installed MUI version; the styles package is the deliberate grouped-import exception.

## Styling Responsibility

<!-- rule: MUI-013 -->
Use this order when deciding where a UI concern belongs:

<!-- rule: MUI-014 -->
1. MUI props for component behavior and semantic configuration;
<!-- rule: MUI-015 -->
2. `slotProps` for behavior, semantics, and CSS class names on a documented component slot, not static style objects;
<!-- rule: MUI-016 -->
3. theme `components` defaults for application-wide behavior and semantic configuration, not authored visual declarations or static `styleOverrides`;
<!-- rule: MUI-017 -->
4. standard CSS variables exposed by the configured MUI theme, such as `var(--mui-palette-text-primary)`, for theme-provided colors, fonts, typography, and other shared values; use supported variables from the installed MUI version rather than hard-coded equivalents or a duplicate custom palette or font system;
<!-- rule: MUI-018 -->
5. scoped component or feature CSS for product layout and appearance;
<!-- rule: MUI-019 -->
6. high-specificity `.Mui...` descendant overrides only when no supported API exists.

<!-- rule: MUI-020 -->
All authored styling belongs in shipped CSS with stable application class names, including application-wide MUI visual customizations. Do not use static `sx`, `style`, `styled()`, theme `styleOverrides`, or other JavaScript style objects for visual decisions. Only style properties whose values must be calculated programmatically from runtime data or measurements and cannot be expressed in CSS may be set in code; prefer exposing those values as CSS custom properties. Use classes or state attributes for predefined visual variants rather than choosing literal style values in code. Keep brand-defining color, spacing, density, and typography values out of component logic when CSS tokens can own them. Use the standard MUI theme CSS variables wherever the theme provides the required value. Define application-owned semantic CSS variables for shared values without an appropriate MUI theme variable, including branding roles whose product meaning is distinct from standard control styling, and keep them with their shared style owner. A branding role may reference a MUI theme variable when their meanings align; do not duplicate its raw value.

<!-- rule: MUI-044 -->
Define named branding color variables for identity-defining layout surfaces and accents, such as workspace backgrounds, navigation surfaces, and editor accents. Keep these app-owned roles in a central CSS theme or shared branding stylesheet so key color decisions can be changed together. Standard controls continue to use semantic MUI theme variables; where a brand choice belongs to a standard MUI palette role, define its shared theme CSS variable in the CSS theme layer rather than overriding individual controls or duplicating the value in JavaScript. Keep branding values compatible with supported light/dark schemes and the applicable accessibility requirements. Introduce concrete brand colors only when product requirements supply them.

<!-- rule: MUI-021 -->
CSS layers reduce specificity fights; they do not make MUI internal DOM or generated class names a stable public API. Prefer stable wrapper or documented slot classes with CSS rules over selectors that depend on nested MUI structure.

## Component Boundary

<!-- rule: MUI-022 -->
Use MUI for application chrome and established widgets such as:

<!-- rule: MUI-023 -->
- buttons and icon buttons;
<!-- rule: MUI-024 -->
- dialogs, menus, drawers, tabs, and toolbars;
<!-- rule: MUI-025 -->
- form controls, validation, and helper text;
<!-- rule: MUI-026 -->
- lists, selection controls, and settings surfaces.

<!-- rule: MUI-027 -->
Feature CSS owns page layout, editor/document surfaces, custom renderers, visualizations, and product-specific composition. A parent region owns placement and size of child components; a component owns its internal markup and local state styling.

## Accessibility Baseline

<!-- rule: MUI-028 -->
MUI supplies useful native semantics, focus handling, tab behavior, and widget keyboard mechanics. Preserve those defaults. Configure accessible names and descriptions through the documented MUI APIs so values reach the actual interactive element.

<!-- rule: MUI-029 -->
MUI does not own the application's landmark structure, heading hierarchy, custom visualization semantics, dynamic announcements, or focus transitions between features. The accessibility topic owns those requirements. Authored ARIA remains conditional on enabled accessibility behavior and a demonstrated semantic gap.

## Theme Evolution

<!-- rule: MUI-030 -->
The theme exposes both light and dark schemes now so components do not hard-code a single palette. Until product requirements define a selector:

<!-- rule: MUI-031 -->
- start in light mode;
<!-- rule: MUI-032 -->
- do not add localStorage persistence;
<!-- rule: MUI-033 -->
- do not invent branded colors;
<!-- rule: MUI-034 -->
- consume semantic MUI variables instead of raw palette constants;
<!-- rule: MUI-035 -->
- test components against both schemes when a visual state depends on contrast or palette meaning.

<!-- rule: MUI-036 -->
If controllers or services later need to read or write runtime custom properties, introduce a small registry-owned CSS-variable service. Ordinary component styling must not route through a service when a stylesheet is sufficient.

## Review Checklist

<!-- rule: MUI-037 -->
1. Is the component imported through a supported direct path?
<!-- rule: MUI-038 -->
2. Is behavior expressed through props before styling workarounds?
<!-- rule: MUI-039 -->
3. Does a documented slot class or shared CSS rule own the styling, with code limited to required calculated values?
<!-- rule: MUI-040 -->
4. Is feature CSS scoped through stable application classes?
<!-- rule: MUI-041 -->
5. Does the component preserve MUI keyboard and focus behavior?
<!-- rule: MUI-042 -->
6. Are light/dark values semantic and free of product assumptions?
<!-- rule: MUI-043 -->
7. Has code avoided depending on MUI's private nested DOM structure?
