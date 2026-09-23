# App Shell

## Purpose And Variant

<!-- rule: APP-SHELLS-001 -->
The shell owns application chrome, page availability, active-page presentation, and optional URL coordination. Pages own their internal content and never calculate around shell header, drawer, or tab dimensions.

<!-- rule: APP-SHELLS-002 -->
The project's local architecture topic records the selected shell variant.

## Page Registry

<!-- rule: APP-SHELLS-003 -->
`src/<app>/services/app-pages.js` owns records shaped like:

<!-- rule: APP-SHELLS-004 -->
```js
{
	id: 'settings',
	label: 'settings.title',
	urlSlug: 'settings',
	order: 10,
	default: true,
	controller: 'settings-controller',
}
```

<!-- rule: APP-SHELLS-005 -->
The service supplies `order: 0` and `urlSlug: id` defaults, updates a record re-added with the same id, and returns defensive copies sorted by order then id. It emits add/update/updated events. Duplicate URL slugs and multiple explicit defaults are configuration failures. The service never infers a default from order.

<!-- rule: APP-SHELLS-006 -->
The executor selects the application default from real requirements. A generated initial page is normally the explicit default. With no default, the app root may intentionally have no loaded page.

## Shell Ownership

<!-- rule: APP-SHELLS-007 -->
- `features/app/controller.js` owns active selection, controller mounting, route reconciliation, and not-found state.
<!-- rule: APP-SHELLS-008 -->
- `features/app/views/app.js` adapts controller state/actions for presentation.
<!-- rule: APP-SHELLS-009 -->
- `features/app/components/AppShell.jsx` renders semantic chrome and the active presentation.
<!-- rule: APP-SHELLS-010 -->
- a page feature owns its own controller, view service, component, CSS, build metadata, and tests.
<!-- rule: APP-SHELLS-011 -->
- a page feature owns its own model/helper state, ambient contracts, page
  registration, loading, commands, and workflow transitions when present.

<!-- rule: APP-SHELLS-012 -->
The shell component does not subscribe to the registry, parse URLs, choose a default, or import page components. Page metadata names a controller service; the controller mounts through the feature's view service.

<!-- rule: APP-SHELLS-013 -->
The app controller may locate a page controller by its registered service name,
but it does not know page model, view, or component implementations. A page
controller may request cross-page navigation through the app controller; it
does not import the destination feature. Shell layout and routing remain
independently replaceable from page workflows.

<!-- rule: APP-SHELLS-014 -->
For every page, preserve the strict chain `React page <-> page view <-> page
controller -> models/services`. The view relays component events and publishes
render state. The controller owns server/model calls, loading, commands, and
navigation. The React page never calls the controller or model directly.

<!-- rule: APP-SHELLS-015 -->
The configured project topic records which shell variant and routing mode are active.

## Navigation Variants

### Left Navigation

<!-- rule: APP-SHELLS-016 -->
Left navigation requires MUI. Use semantic header, navigation, and main regions. At `md` and above, use a permanent drawer that is expanded initially and can be fully collapsed or restored with a persistent header control. Keep this presentation state local to the shell; do not persist it until the application explicitly selects a persistence policy. Because page icons are not required, collapse the drawer fully rather than generating an empty icon rail. Below `md`, use a separate temporary overlay drawer opened by a labeled header menu button and close it after page selection.

<!-- rule: APP-SHELLS-017 -->
Render records with MUI `List`, `ListItem`, `ListItemButton`, and `ListItemText`; expose the active item through MUI selected state. Use CSS Grid and scoped CSS for shell regions and independent content scrolling. Do not use fixed drawer offsets, branding assumptions, or desktop-only persistence as generic shell behavior.

### Top Tabs

<!-- rule: APP-SHELLS-018 -->
Top tabs require MUI. Use a sticky application header and scrollable `Tabs` with automatic scroll buttons. On narrow screens, place the tabs on a full-width second header row without changing their semantic ownership. Render one active page in `main`; pages own their own headings and internal scrolling.

### App Directed

<!-- rule: APP-SHELLS-019 -->
App-directed shells render no drawer or tabs. Application behavior calls the app view/controller request path. If an initial page exists it is normally the default; otherwise start with no loaded page. Never automatically select the first record.

## URL Ownership

<!-- rule: APP-SHELLS-020 -->
URL routing exists only when both a basic server and default app routing are configured. Without it, selection stays in memory and no History API service is generated.

<!-- rule: APP-SHELLS-021 -->
With routing:

<!-- rule: APP-SHELLS-022 -->
- derive the app base from the document/Polylith mount instead of hard-coding a deployment root;
<!-- rule: APP-SHELLS-023 -->
- the URL service alone parses paths, constructs paths, handles `popstate`, and performs `pushState`/`replaceState`;
<!-- rule: APP-SHELLS-024 -->
- the URL service does not subscribe to `app-pages` or choose controllers;
<!-- rule: APP-SHELLS-025 -->
- page records own only their page slug, not duplicate full routes;
<!-- rule: APP-SHELLS-026 -->
- a root path activates the explicit default and replaces history with its clean page path;
<!-- rule: APP-SHELLS-027 -->
- a recognized slug activates that page;
<!-- rule: APP-SHELLS-028 -->
- after registration completes, an unknown slug is preserved and renders not-found state;
<!-- rule: APP-SHELLS-029 -->
- browser back/forward remounts the matched page without adding another history entry;
<!-- rule: APP-SHELLS-030 -->
- the server's final app-index fallback makes deep-link refreshes load the application.

## Empty, Initial, And Not-Found States

<!-- rule: APP-SHELLS-031 -->
When no pages are registered/defaulted, left-nav and top-tab shells render the intentional `No pages registered` main-content state. An app-directed shell with no page renders no page. Do not invent controls or workflows.

<!-- rule: APP-SHELLS-032 -->
A generated initial page is a complete feature with a kebab-case id/slug, controller, view service, ambient contracts, and semantic React page. Its visible starter content is only an `<h1>` using the supplied page name.

<!-- rule: APP-SHELLS-033 -->
An unknown routed page is not the same as an empty registry. Preserve its URL and expose an explicit not-found presentation state; do not silently substitute the default.

## Responsive And Accessibility Rules

<!-- rule: APP-SHELLS-034 -->
- Preserve the same navigation/page semantics across breakpoints; change arrangement in CSS.
<!-- rule: APP-SHELLS-035 -->
- Keep menu controls, tabs, and drawer items keyboard-operable through MUI.
<!-- rule: APP-SHELLS-036 -->
- Give navigation a useful label when needed to distinguish it from other navigation regions.
<!-- rule: APP-SHELLS-037 -->
- Restore focus sensibly when a temporary drawer closes.
<!-- rule: APP-SHELLS-038 -->
- Keep active selection visible and programmatically exposed.
<!-- rule: APP-SHELLS-039 -->
- The desktop collapse control remains available in both states and exposes its
  current expanded state and action when accessibility support is active.
<!-- rule: APP-SHELLS-040 -->
- Collapsing desktop navigation must remove its controls from keyboard and
  assistive-technology traversal; it must not affect the selected page.
<!-- rule: APP-SHELLS-041 -->
- Desktop collapse state and mobile overlay state are independent. Crossing a
  breakpoint must not turn a previously collapsed desktop drawer into an open
  mobile overlay.
<!-- rule: APP-SHELLS-042 -->
- Do not make pages know shell chrome dimensions.

## Testing

<!-- rule: APP-SHELLS-043 -->
Shell tests below `src/<app>/features/app/_tests` cover page sorting/updating, duplicate configuration failures, explicit defaults, selection, view events, empty state, not-found state, each configured navigation interaction, desktop collapse/restore behavior, independent temporary-drawer behavior, responsive drawer behavior where applicable, URL parsing/history/popstate behavior when present, and exact listener cleanup.

<!-- rule: APP-SHELLS-044 -->
Run `npm test` after changing page registration, shell selection, navigation, view events, history ownership, or responsive behavior.
