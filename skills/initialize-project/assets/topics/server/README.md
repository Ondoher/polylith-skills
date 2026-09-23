# Server

## Installed Configuration

Polylith owns the Express lifecycle. Repository deployment setup starts at `server/setup-deployment.js`. Initial-app routing starts at `server/{{APP_SLUG}}/index.js`; router registration lives in `server/{{APP_SLUG}}/services/routers.js`; the client HTTP boundary is `src/{{APP_SLUG}}/services/io.js`.

{{SERVER_FEATURES}}

Socket.IO, HTTP headers, route ordering, localized Markdown, failure handling, and test rules are mapped through the [folder standards manifest](../standards/manifest.md). This topic owns only the routes and infrastructure actually installed in this project.

## Verification

Server specs are composed by `server/{{APP_SLUG}}/spec.js`. When configured, server coverage is reported separately for each app from browser-source coverage.
