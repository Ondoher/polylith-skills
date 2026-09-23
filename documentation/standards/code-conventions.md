# Standards

## Purpose

<!-- rule: CODE-CONVENTIONS-001 -->
This topic owns repository-wide code formatting, naming, placement, validation, diagnostics, presentation boundaries, and general test posture. Repository-specific additions and replacements belong in the repository standards overlay; domain and feature topics retain implementation and product facts rather than standards exceptions.

## JavaScript And Module Shape

<!-- rule: CODE-CONVENTIONS-002 -->
- Use JavaScript/JSX ESM and explicit `.js`/`.jsx` runtime imports.
<!-- rule: CODE-CONVENTIONS-003 -->
- Indent with tabs and use semicolons. Follow the configured formatter when present.
<!-- rule: CODE-CONVENTIONS-004 -->
- A class or React component file uses the primary symbol's `PascalCase` name. A registry-service implementation is the exception: its file uses the registered service identifier normalized to a filesystem-safe `kebab-case` basename, even when it exports a PascalCase class. Feature-local REMVC services may instead use `controller.js`, `views/app.js`, or `views/page.js` when the containing feature supplies the omitted namespace. The adjacent service declaration uses the implementation's basename. Ordinary modules, services that are not registry services or named class modules, CSS, and image assets use `kebab-case`.
<!-- rule: CODE-CONVENTIONS-005 -->
- Export one principal class, service, component, or cohesive namespace per module. Do not attach unrelated constants and helpers to a class file.
<!-- rule: CODE-CONVENTIONS-006 -->
- Put module-level named constants in the owning scope's `consts.js` when they are shared.
<!-- rule: CODE-CONVENTIONS-007 -->
- Prefix an intentionally unused parameter with `_`.
<!-- rule: CODE-CONVENTIONS-008 -->
- Place lower-level helpers before the composed methods that call them; public orchestration normally appears last.
<!-- rule: CODE-CONVENTIONS-009 -->
- Use descriptive identifiers. `config` and `props` are accepted standard abbreviations. `id`, `row`, `key`, `min`, `max`, and `sum` are acceptable only when the lexical context contains one value with that role and makes its type unambiguous. Coordinate names `x`, `y`, and `z` are acceptable only when the lexical context uses one coordinate system. Rename a short identifier when multiple identities, row or key kinds, ranges, accumulations, or coordinate systems would make it ambiguous; a small scope or familiar loop and callback convention does not establish clarity by itself.

## Classes And Utilities

<!-- rule: CODE-CONVENTIONS-010 -->
Keep class-specific support as private instance methods with one leading underscore, including pure operations that do not read instance state. Do not use private static methods or module-local functions for support owned only by one class. Extract an operation only when it has a real reusable contract independent of that class; purity, similar naming, or hypothetical future reuse is insufficient.

<!-- rule: CODE-CONVENTIONS-011 -->
Favor a cohesive PascalCase namespace as the sole public symbol for reusable operations in the same domain. Use an ordinary kebab-case utility module only when a namespace method set would misstate the contract. Do not create a single-function module merely to populate a namespace or combine unrelated operations to form one. Evaluate an existing multi-function module one export at a time: retain only operations with the same real owner, and redistribute independently owned operations to their nearest cohesive namespaces.

<!-- rule: CODE-CONVENTIONS-012 -->
Avoid factories unless construction has an independent lifecycle or orchestration responsibility.

<!-- rule: CODE-CONVENTIONS-013 -->
Use setters only for direct assignment with no processing; use a named method when a state change validates, normalizes, derives, coordinates, or otherwise performs work.

<!-- rule: CODE-CONVENTIONS-014 -->
Prefer small, cohesive modules. Flag a class as it approaches roughly 1,000 lines and split by ownership rather than arbitrary length. A large spec may exceed that size when its behavioral cases justify it, but should still remain navigable.

## Types And Contracts

<!-- rule: CODE-CONVENTIONS-015 -->
Runtime remains JavaScript. Shared data and general capability contracts live in included ambient `.d.ts` files and are referenced directly from JSDoc. Give complex public values one canonical named type and document each property. Use a named ambient string union rather than repeating literal unions inline. Application-service interfaces are the exported declaration exception described in the JSDoc standard.

<!-- rule: CODE-CONVENTIONS-016 -->
Component declarations live in their nearest `types` folder instead of beside same-named JSX files. Each application-service declaration sits beside its implementation and exports the interface describing its public service methods. Registry-service interfaces extend the shared ambient `EventBus` contract. See the JSDoc standard for the service-interface exception and full callable/declaration rules.

## Validation And Failure Policy

<!-- rule: CODE-CONVENTIONS-017 -->
Validate at genuine ingress: external callers, configuration, serialized payloads, network boundaries, filesystem content, browser capabilities, and other untrusted providers. Normalize semantic facts there, then let internal code trust the accepted contract.

<!-- rule: CODE-CONVENTIONS-018 -->
Throw for invalid application configuration or failures that prevent safe continued operation. For recoverable missing, malformed, unsupported, timeout, or disconnected data, log a useful `console.warn` or `console.error` and return the empty or failure result defined by the owner. Do not silently invent canonical values.

<!-- rule: CODE-CONVENTIONS-019 -->
Tests assert current public behavior, not the deletion or renaming of implementation details. A changed contract replaces its declaration and typed consumers directly. Add migration, import, downgrade, dual-write, fallback-reader, or old/new switching behavior only when the current owner explicitly requires compatibility for a named, still-existing external consumer or persisted dataset. Historical prototypes, repository-local fixtures, generated output, replaced internal formats, and hypothetical future consumers do not establish that requirement; remove the superseded code, tests, and fixtures when the current contract replaces them.

## React Presentation Boundary

<!-- rule: CODE-CONVENTIONS-020 -->
- React owns concrete presentation and local interaction mechanics, not persistence, transport, domain policy, or broadly shared state.
<!-- rule: CODE-CONVENTIONS-021 -->
- Treat props as immutable. Keep one canonical owner for each state fact and derive values during render when practical.
<!-- rule: CODE-CONVENTIONS-022 -->
- Rendering must be free of observable side effects. Subscribe, fetch, and imperatively integrate only after mount, with matching cleanup.
<!-- rule: CODE-CONVENTIONS-023 -->
- Cancel or ignore stale asynchronous work when a component unmounts or a newer request supersedes it.
<!-- rule: CODE-CONVENTIONS-024 -->
- Use stable semantic keys for mutable lists.
<!-- rule: CODE-CONVENTIONS-025 -->
- Keep event handlers focused on local state or owner-supplied callbacks.
<!-- rule: CODE-CONVENTIONS-026 -->
- Use controlled inputs when values participate in validation, submission, or shared state.

## Markup, CSS, And Layout

<!-- rule: CODE-CONVENTIONS-027 -->
- Prefer semantic HTML: buttons, labels, inputs, headings, lists, fieldsets, legends, navigation, main content, and status regions.
<!-- rule: CODE-CONVENTIONS-028 -->
- Accessibility mode: `use semantic/native behavior always and authored ARIA only when the selected accessibility mode and a demonstrated semantic gap require it`.
<!-- rule: CODE-CONVENTIONS-029 -->
- Localization mode: `follow the selected localization mode and keep user-visible application prose behind the configured text boundary`.
<!-- rule: CODE-CONVENTIONS-030 -->
- JSX defines meaningful regions; CSS arranges them. All authored styling decisions belong in CSS stylesheets, including layout, colors, typography, spacing, responsive behavior, and visual states. Code may set style properties only when their values must be calculated programmatically from runtime data or measurements and cannot be expressed in CSS. Prefer passing those calculated values through CSS custom properties, leaving their visual use in CSS. Selecting a predefined visual state is not a calculation: toggle a class or state attribute and let CSS define its appearance.
<!-- rule: CODE-CONVENTIONS-031 -->
- Components own their internal markup and class names. Parents own child placement and sizing.
<!-- rule: CODE-CONVENTIONS-032 -->
- Keep component and feature layout, focus, state, and interaction styles close to their owner. Broad stylesheets contain genuine tokens and defaults, not one-off rules. Define shared colors, font families, typography scales, and other values standardized across multiple styles as named CSS custom properties. Reuse those variables instead of repeating literal values, and keep their definitions with the theme or nearest shared style owner. Define semantic branding color variables for identity-defining layout surfaces and accents that need distinct treatment from ordinary control styling. Give them names based on their role, such as workspace background, navigation surface, or editor accent, so changing their shared definitions updates the app identity consistently.
<!-- rule: CODE-CONVENTIONS-033 -->
- Use CSS Grid as the default layout system for pages, major regions, and component layouts. Use Flexbox only where needed for smaller groups of elements, such as control groups, that need one-dimensional alignment.
<!-- rule: CODE-CONVENTIONS-034 -->
- Use an `img` when an image is content; use CSS backgrounds for decorative chrome.
<!-- rule: CODE-CONVENTIONS-035 -->
- Never add product-specific styling, routes, data, controls, or workflows without requirements.

## Formatting

<!-- rule: CODE-CONVENTIONS-036 -->
Prettier is the canonical formatter for every JavaScript repository. Declare `prettier` as a direct project `devDependency`, keep an explicit Prettier configuration in the repository, and do not rely on a global installation or configuration. Preserve an existing compatible declared version. When adding Prettier, install the current compatible stable release and retain the resulting lockfile so the resolved version is reproducible.

<!-- rule: CODE-CONVENTIONS-037 -->
A repository may use any configuration source supported by Prettier, including the `prettier` key in its root `package.json`, provided the resolved configuration is owned by that repository. When no configuration exists, use this canonical starting profile:

<!-- rule: CODE-CONVENTIONS-038 -->
```json
{
	"printWidth": 120,
	"tabWidth": 4,
	"useTabs": true,
	"semi": true,
	"singleQuote": true,
	"trailingComma": "all",
	"bracketSpacing": false,
	"arrowParens": "always",
	"endOfLine": "lf"
}
```

<!-- rule: CODE-CONVENTIONS-039 -->
Preserve an existing configuration when it is compatible with applicable standards and explicit repository exceptions; the starting profile is not a reason to rewrite compatible project choices. For an npm workspace repository, the root dependency, configuration, ignore rules, and scripts govern the complete repository. Express package-specific needs as overrides in the root Prettier configuration rather than independent workspace gates.

<!-- rule: CODE-CONVENTIONS-040 -->
Every repository exposes the same read-only npm command in its root `package.json`:

<!-- rule: CODE-CONVENTIONS-041 -->
```json
{
	"scripts": {
		"format:check": "prettier --check ."
	}
}
```

<!-- rule: CODE-CONVENTIONS-042 -->
Run `npm run format:check` for formatting verification. A separate `format` script using `prettier --write .` is recommended for applying fixes but is not part of the verification contract. Keep an appropriate `.prettierignore` when generated artifacts, vendored content, or other repository paths must be excluded.

<!-- rule: CODE-CONVENTIONS-043 -->
Prettier does not own import ordering or architectural organization. Preserve the established local import order and use source review for files the formatter does not support.

## Review Checklist

<!-- rule: CODE-CONVENTIONS-044 -->
1. Does the file and primary symbol follow the naming contract?
<!-- rule: CODE-CONVENTIONS-045 -->
2. Is the behavior owned by the right layer?
<!-- rule: CODE-CONVENTIONS-046 -->
3. Are external values validated once at ingress?
<!-- rule: CODE-CONVENTIONS-047 -->
4. Are diagnostics proportionate and recoverable failures non-throwing?
<!-- rule: CODE-CONVENTIONS-048 -->
5. Does JSX expose meaningful semantic regions?
<!-- rule: CODE-CONVENTIONS-049 -->
6. Are effects, listeners, timers, observers, and imperative resources cleaned up?
<!-- rule: CODE-CONVENTIONS-050 -->
7. Are types and documentation owned once rather than repeated inline?
