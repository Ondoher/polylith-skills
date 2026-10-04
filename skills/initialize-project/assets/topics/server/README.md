# Server

## Installed Configuration

Polylith owns the Express lifecycle. Repository deployment setup starts at `server/setup-deployment.js`. Initial-app routing starts at `server/{{APP_SLUG}}/index.js`; router registration lives in `server/{{APP_SLUG}}/services/routers.js`; the client HTTP boundary is `src/{{APP_SLUG}}/services/io.js`.

{{SERVER_FEATURES}}

This topic records the routes and infrastructure installed in this project.

## Verification

Server specs are composed by `server/{{APP_SLUG}}/spec.js`. When configured, server coverage is reported separately for each app from browser-source coverage.
