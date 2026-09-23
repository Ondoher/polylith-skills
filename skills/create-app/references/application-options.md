# Application Options

Collect app choices without conflating them with repository identity.

## Identity and deployment

1. Application display name.
2. Application slug in lowercase kebab-case.
3. Repository posture: `local-only`, `discoverable`, or `hosting`.
4. Standalone mount, normally `/` for the first or only local app.
5. Composed mount, normally `/<app-slug>`.
6. Configured mount for this repository. A discoverable repository normally publishes the composed mount; a hosting repository assigns a non-conflicting resident mount.
7. Whether the app persists data in a database.

Every repository is master-capable during development and standalone execution. Posture describes discovery and hosting relationships, not master capability, app count, or the `multiple` flag.

## Application capabilities

Ask the same applicable application questions used by initial project creation:

1. Use MUI?
2. Create a REMVC shell? If yes, choose app-directed, left navigation, or top tabs.
3. Create an initial page and, if so, its display name?
4. Apply strict accessibility standards?
5. Support localization?
6. If using MUI, generate standard base components?
7. Create an app-owned server router?
8. If server and shell are enabled, add default app routing?
9. If server and localization are enabled, add localized Markdown?
10. If server is enabled, add Socket.IO?
11. Add unit/UI testing?
12. If testing is enabled, add coverage reporting?

Left-navigation and top-tab shells require MUI. Base components require MUI and imply testing. Default app routing requires both a server and shell. Localized Markdown requires a server and localization. Socket.IO requires a server and implies testing. Coverage requires testing.

Prettier, local HTTPS, package identity, discovery roots, and root development commands are repository capabilities rather than per-app options. Reuse them; extend a missing repository capability only when the selected app requires it and the pre-write summary identifies the shared change.
