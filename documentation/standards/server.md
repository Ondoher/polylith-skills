# Server

## Purpose And Scope

<!-- rule: SERVER-001 -->
Polylith owns the Express lifecycle. The generated server contributes service-based router composition and the standard client HTTP boundary. A basic server installs no sample status, data, or product route; new routes appear only when a feature requirement owns them.

## Structure And Lifecycle

<!-- rule: SERVER-037 -->
`<app-server>` means `server/` when all server behavior belongs to one application and `server/<app>/` when a repository contains multiple server-backed applications. In a multi-app repository, keep app-specific entrypoints, routers, fallbacks, features, and tests below that app's server root; keep only genuinely shared host services and capabilities directly below `server/`. The same app-server ownership applies whether the app is resident in a server root or supplied by a discoverable repository.

<!-- rule: SERVER-002 -->
- `<app-server>/index.js` activates that app's server services and features.
<!-- rule: SERVER-003 -->
- `<app-server>/services/routers.js` owns ordered router registration and that app's final-router slot.
<!-- rule: SERVER-004 -->
- `<app-server>/routing/main-router.js` composes registered routers for that Polylith app router.
<!-- rule: SERVER-005 -->
- `<app-server>/routing/<name>-router.js` owns a narrow HTTP adapter and its transport-focused specs.
<!-- rule: SERVER-006 -->
- `<app-server>/features/<feature>` owns app-specific transport-neutral behavior, models/services, ambient contracts, lifecycle resources, persistence, and colocated feature specs. A genuinely shared server feature instead has one repository-level owner and an explicit public service contract; apps do not import another app's private server feature.
<!-- rule: SERVER-007 -->
- `src/<app>/services/io.js` owns client HTTP policy.

<!-- rule: SERVER-008 -->
HTTP adapters register through their app's router service in `ready()`, after dependencies exist. Ordinary routers are installed in stable registration order; each app/static catch-all is set separately and mounted last within that app's router and mount. Duplicate registration or more than one final router for the same app is a configuration failure; distinct mounted apps may each own one final fallback.

<!-- rule: SERVER-009 -->
Routers and features need not have a one-to-one relationship. A router may compose several public feature capabilities, and one capability may serve several routers, workers, or other features without making HTTP part of its ownership. Router services remain small: Express wiring authenticates as required, parses and validates transport input, delegates domain transitions and orchestration to the owning public feature models/services, and translates their results into HTTP responses. Persistence, filesystem operations, transaction policy, retry policy, and cross-capability workflow live behind feature-owned services or models rather than inside route callbacks. Server features expose no Express objects or HTTP-shaped results through their public contracts.

## Client HTTP Boundary

<!-- rule: SERVER-010 -->
All ordinary application HTTP calls go through the standard `io` service. It owns shared requirements callers should not need to know:

<!-- rule: SERVER-011 -->
- `Accept: application/json`;
<!-- rule: SERVER-012 -->
- `Content-Type: application/json` only when a body is encoded as JSON;
<!-- rule: SERVER-013 -->
- `Accept-Language` from the canonical current locale, falling back to `en-US` only when no localization service exists;
<!-- rule: SERVER-014 -->
- JSON serialization/parsing and consistent failure diagnostics.

<!-- rule: SERVER-015 -->
Feature callers supply method, route, and feature data. They do not repeat locale/header policy or reach for `fetch` directly. Responses should use stable service/model contracts instead of leaking raw transport objects into React.

<!-- rule: SERVER-016 -->
Parse `Accept-Language` at server ingress. Normalize to a supported locale before selecting localized content. Do not make each localized feature implement its own header parser.

## Routing And App Fallback

<!-- rule: SERVER-017 -->
Each app may independently select default app routing, localized Markdown, and Socket.IO when the repository host supports them. App-owned topics record those installed choices and routes; shared host configuration is recorded once by its repository owner.

<!-- rule: SERVER-018 -->
Default app routing is generated for an app only when that app has a shell and selects the option. Its final fallback serves only that app's index, within its mount, after applicable service/API routes so clean deep links refresh correctly. It does not swallow known API failures, capture sibling-app routes, or become a generic sample route.

## Localized Markdown

<!-- rule: SERVER-019 -->
When configured, the Markdown feature owns:

<!-- rule: SERVER-020 -->
- exact route `GET /api/markdown/:name`;
<!-- rule: SERVER-021 -->
- safe name normalization that cannot escape the content directory;
<!-- rule: SERVER-022 -->
- localized files below `<app-server>/data/markdown/en-US/`;
<!-- rule: SERVER-023 -->
- locale selection from parsed `Accept-Language`;
<!-- rule: SERVER-024 -->
- a client model/service call and `Markdown` presentation component;
<!-- rule: SERVER-025 -->
- server and client tests.

<!-- rule: SERVER-026 -->
Missing Markdown returns `404`. The client warns, resolves empty content, renders nothing, and does not cache the miss. Unexpected I/O and transport failures log errors; throw only when the application cannot safely continue. Static localized Markdown is a help/content path, not a route for user state or mutations.

## Failure Policy

<!-- rule: SERVER-027 -->
Validate method parameters, route parameters, headers, envelopes, filenames, and serialized bodies at ingress. Invalid application/server configuration throws. Recoverable invalid requests return an explicit failure/status result and log at the owner. Network, filesystem, timeout, and parse failures use useful diagnostics without inventing data.

<!-- rule: SERVER-028 -->
Do not expose stack traces or internal filesystem paths as client-facing failure payloads. Keep machine-facing reasons stable enough for the client service to interpret, while presentation decides how to localize user-visible text.

## Tests

<!-- rule: SERVER-029 -->
App-specific server specs are composed by `<app-server>/spec.js`. Transport-focused router specs remain with `<app-server>/routing`; feature behavior, model/service, lifecycle, and persistence specs remain with their owner under `<app-server>/features/<feature>`. Shared host behavior and its specs remain with their repository-level owner. The complete repository test command runs every applicable app-specific and shared server lane. Cover:

<!-- rule: SERVER-030 -->
- router ordering, duplicate/final-router rules, and composition;
<!-- rule: SERVER-031 -->
- header defaults and overrides in the client HTTP service;
<!-- rule: SERVER-032 -->
- `Accept-Language` parsing and supported-locale normalization;
<!-- rule: SERVER-033 -->
- each generated route's success, invalid input, missing content, and unexpected failure behavior;
<!-- rule: SERVER-034 -->
- final app routing without swallowing API routes;
<!-- rule: SERVER-035 -->
- exact cleanup of owned server resources.

<!-- rule: SERVER-036 -->
When coverage is enabled, measure authored server code separately from browser bundles and exclude specs/test entry/support. Multi-app reporting keeps each app-server result distinct and reports genuinely shared host code without attributing it to an arbitrary app. A passing test lane does not by itself prove deployment or production security.

## Server-Root Composition

<!-- rule: SERVER-038 -->
The repository acting as the active server root owns the Express and transport lifecycle, mechanical middleware, deployment destination, and optional deployment setup. Every Polylith repository assumes this responsibility when running itself for development or standalone deployment. A hosting/server-root repository additionally owns discovery roots. Local, resident, and discovered apps contribute routers; they do not start competing HTTP, HTTPS, or Socket.IO servers or replace host middleware policy.

<!-- rule: SERVER-039 -->
The active-master repository's deployment setup runs first, followed by setup once for each selected discovered repository, before any app router initializes. Every setup receives the same installation registry plus its owning repository context and role. Every repository's setup must support `isMaster: true`; a discoverable repository must additionally support `isMaster: false`. Master setup normally establishes host-wide services; discovered setup may attach that registry to its package-local registry and register or integrate installation-specific capabilities without duplicating work for each app in the repository. Each router later receives the same installation registry explicitly and may ignore it when no installation integration is required. A discovered app validates required installation services and degrades or fails clearly according to its documented required/optional dependency contract; it does not inspect installed app identities or reach into server-root implementation files.

<!-- rule: SERVER-040 -->
Router initialization order establishes service readiness, not permission for an earlier app to capture later apps' paths. Every app fallback remains confined to its effective mount. A resident root app and deeper resident or discovered mounts may coexist only when deep links and missing routes resolve to the owning app rather than the root fallback.
