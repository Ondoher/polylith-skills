# Localization

## Purpose And Current Scope

<!-- rule: LOCALIZATION-001 -->
Localization is enabled as anticipatory application infrastructure. The initial and current locale is `en-US`; locale persistence and a locale selector are deferred until another language creates a real requirement. The absence of a selector does not permit user-visible strings to bypass the localization boundary.

<!-- rule: LOCALIZATION-002 -->
Each application's root context owns that app's canonical current locale and `localize` service. Components consume their owning app's context rather than maintaining local locale facts or reaching into a sibling app. Locale-sensitive formatting belongs at the presentation boundary; stored values, identifiers, routes, protocol tokens, and domain data remain locale-neutral.

## Phrase Ownership And Format

<!-- rule: LOCALIZATION-003 -->
The initial phrase file is `src/<app>/phrases/en-US.json`. The localization service at `src/<app>/services/localize.js` owns loading, lookup, replacement, plural selection, and locale-change notification.

<!-- rule: LOCALIZATION-004 -->
Phrase data uses the canonical flat JSON phrase model:

<!-- rule: LOCALIZATION-005 -->
- phrase keys are flat dot-separated names;
<!-- rule: LOCALIZATION-006 -->
- phrase leaves are strings or plural-category objects;
<!-- rule: LOCALIZATION-007 -->
- replacements use named `%{name}` tokens;
<!-- rule: LOCALIZATION-008 -->
- plural selection uses `Intl.PluralRules` for the active locale;
<!-- rule: LOCALIZATION-009 -->
- a plural object must contain `other`;
<!-- rule: LOCALIZATION-010 -->
- full sentences are preferred over grammar assembled from translated fragments.

<!-- rule: LOCALIZATION-011 -->
Keep the initial phrase set small and expand it with real UI. Keys describe stable meaning rather than visual position. Visible labels, accessible names, descriptions, helper text, validation, and announcement text should draw from the same phrase family so translations cannot silently diverge.

## Lookup And Failure Contract

<!-- rule: LOCALIZATION-012 -->
Localization failures are visible during development but do not disrupt the application:

<!-- rule: LOCALIZATION-013 -->
- invalid phrase JSON is an application/configuration failure and throws;
<!-- rule: LOCALIZATION-014 -->
- a missing phrase logs a warning and resolves to an empty string;
<!-- rule: LOCALIZATION-015 -->
- there is no implicit English, key-as-text, or invented text fallback;
<!-- rule: LOCALIZATION-016 -->
- a plural value without `other` logs `console.error` and resolves safely;
<!-- rule: LOCALIZATION-017 -->
- unsupported phrase value shapes log `console.warn` and resolve to empty text;
<!-- rule: LOCALIZATION-018 -->
- invalid replacement values log `console.error` and do not inject invalid output;
<!-- rule: LOCALIZATION-019 -->
- an unknown replacement token logs a warning and resolves that token to empty text;
<!-- rule: LOCALIZATION-020 -->
- locale switches to unloaded locales warn and leave the current locale unchanged.

<!-- rule: LOCALIZATION-021 -->
Do not catch and hide invalid JSON. Limit thrown errors to failures that mean the application's configured localization source cannot be trusted. Missing content and user-facing lookup errors remain diagnostic results.

## Replacements And Plurals

<!-- rule: LOCALIZATION-022 -->
Replacements are a data boundary. Accept only supported primitive display values defined by the local contract; do not stringify arbitrary objects, DOM nodes, functions, or promises into UI copy. Apply replacements after plural selection so every chosen sentence uses the same named fields.

<!-- rule: LOCALIZATION-023 -->
Pass the numeric cardinal separately from the replacement map when it selects a plural category. Include it as a named replacement as well only when the sentence must display the number. Always define `other`, even when the initial locale currently selects only `one` and `other` for known examples.

<!-- rule: LOCALIZATION-024 -->
Use full messages such as `files.deleted` with `%{count}` rather than translating `files`, `deleted`, and punctuation independently. This preserves grammar, word order, and accessibility meaning in later locales.

## Text Components

<!-- rule: LOCALIZATION-025 -->
`BaseText` is the reusable resolution/rendering foundation. `Text` is the concrete component used directly by application presentation.

<!-- rule: LOCALIZATION-026 -->
- Base components support literal and localized values, but treat text literally by default.
<!-- rule: LOCALIZATION-027 -->
- Concrete components localize by default when localization is enabled.
<!-- rule: LOCALIZATION-028 -->
- Callers may explicitly opt in or out where a component contract requires literal user content.
<!-- rule: LOCALIZATION-029 -->
- User-authored values, canonical symbols, identifiers, filenames, and protocol values are not phrase keys merely because they are displayed.
<!-- rule: LOCALIZATION-030 -->
- If a missing phrase resolves to empty text, the component renders no invented fallback.

<!-- rule: LOCALIZATION-031 -->
HTML rendering is off by default and requires the explicit `html={true}` property. HTML is trusted only because phrase sources are controlled and any user-derived content has already been sanitized before entering them. Do not turn ordinary replacement values into an HTML injection path.

## Locale Lifecycle And Formatting

<!-- rule: LOCALIZATION-032 -->
The localization service owns loaded translators and exposes the active locale/language. Locale changes notify subscribed presentation so visible and accessible text update together. Component subscriptions must use the service's canonical event names and clean up on unmount.

<!-- rule: LOCALIZATION-033 -->
Use `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.PluralRules`, and related platform APIs at display boundaries. Do not localize canonical machine identifiers, persisted numeric forms, compact technical symbols, URLs, API fields, or transport envelopes. Allow layouts to expand around translated labels rather than encoding current English width assumptions.

## HTTP And Localized Markdown

<!-- rule: LOCALIZATION-034 -->
When a server exists, the standard client HTTP service sends `Accept-Language` from the canonical current locale. The server parses that header at ingress and selects supported localized content without making callers understand transport policy.

<!-- rule: LOCALIZATION-035 -->
When the localized Markdown option exists, long-form help content lives below `server/data/markdown/en-US/` and is fetched through `GET /api/markdown/:name`. The server validates the name so it cannot escape the content directory. Client content is requested through the localization service/model path so Markdown replacements share phrase replacement behavior.

<!-- rule: LOCALIZATION-036 -->
Missing Markdown behaves like missing phrase text: the server returns `404`, the client warns, resolves empty content, renders nothing, and does not cache the miss. Invalid paths and unexpected I/O or transport failures use the server topic's failure contract. The Markdown component is generated only with the Markdown service.

<!-- rule: LOCALIZATION-037 -->
Localized Markdown is for static help and guidance. It is not a path for feature state, user data, mutations, account behavior, or general server-driven presentation.

## Testing Guidance

<!-- rule: LOCALIZATION-038 -->
Maintain focused tests for:

<!-- rule: LOCALIZATION-039 -->
- valid JSON loading and invalid JSON failure;
<!-- rule: LOCALIZATION-040 -->
- nested-key flattening and direct key lookup;
<!-- rule: LOCALIZATION-041 -->
- missing keys and unloaded locales;
<!-- rule: LOCALIZATION-042 -->
- supported and unsupported phrase values;
<!-- rule: LOCALIZATION-043 -->
- named replacements, missing replacements, and invalid replacement values;
<!-- rule: LOCALIZATION-044 -->
- plural categories, required `other`, and cardinal display;
<!-- rule: LOCALIZATION-045 -->
- literal versus localized base/concrete component defaults;
<!-- rule: LOCALIZATION-046 -->
- trusted HTML opt-in and default text rendering;
<!-- rule: LOCALIZATION-047 -->
- locale event updates and listener cleanup;
<!-- rule: LOCALIZATION-048 -->
- locale-sensitive formatting helpers;
<!-- rule: LOCALIZATION-049 -->
- `Accept-Language` propagation and parsing when a server exists;
<!-- rule: LOCALIZATION-050 -->
- Markdown success, missing content, replacement, cache, and path validation when generated.

<!-- rule: LOCALIZATION-051 -->
Do not make tests depend on the host machine's default locale. Supply the locale explicitly and use deterministic dates, numbers, and expected strings.

## Component Author Checklist

<!-- rule: LOCALIZATION-052 -->
Before adding user-visible text, ask:

<!-- rule: LOCALIZATION-053 -->
1. Is this application prose, user-authored content, or a stable technical symbol?
<!-- rule: LOCALIZATION-054 -->
2. Which phrase key owns it and is it a complete grammatical message?
<!-- rule: LOCALIZATION-055 -->
3. Do visible and assistive strings remain synchronized?
<!-- rule: LOCALIZATION-056 -->
4. Are replacements named, validated, and safe for the rendering mode?
<!-- rule: LOCALIZATION-057 -->
5. Does plural behavior include `other`?
<!-- rule: LOCALIZATION-058 -->
6. Can the layout expand for another language?
<!-- rule: LOCALIZATION-059 -->
7. Is locale-sensitive formatting confined to presentation?
