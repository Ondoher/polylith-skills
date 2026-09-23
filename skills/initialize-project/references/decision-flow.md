# Decision Flow

Collect answers before writing. Ask in small coherent groups and explain dependencies when they affect available choices.

## Identity

Always ask:

1. Full project name. Use it for human-facing titles and descriptions.
2. Project/package slug. Require lowercase kebab-case. Use it for repository and package identity, not automatically for the initial app.
3. Is this a Polylith app?
4. Will the application persist data in any database?

## Non-Polylith branch

Non-Polylith projects are normally headless exploratory exceptions. Create only `src/`, then ask:

1. Set up Prettier?
2. Set up unit testing?
3. If testing: add coverage reporting?

Skip all UI, MUI, shell, a11y, localization, components, server, Markdown and Socket.IO questions.

## Polylith branch

All Polylith projects use the explicit multiple-app shape and create one initial deployable app.

Ask:

1. Initial application display name and slug. Default them from the project identity but collect them as separate facts.
2. Repository posture: local-only, discoverable by another master, or hosting/server-root. Every choice remains master-capable for development and standalone execution.
3. Initial app standalone and composed mounts. Default the standalone mount to `/` and the composed mount to `/<app-slug>`.
4. Create and configure a self-signed certificate for local HTTPS?
5. Use MUI?
6. Create a REMVC shell app?
7. If shell: which type?
    - left navigation (requires MUI)
    - top tabs (requires MUI)
    - app-directed
8. If shell: create an initial page feature?
9. If initial page: what is its name?
10. Support accessibility?
11. Support localization?
12. If MUI: generate the standard base components?
13. Create a basic server?
14. If server and shell: add default app routing?
15. If server and localization: add the localized Markdown service?
16. If server: support Socket.IO?
17. Set up Prettier?
18. Set up unit testing?
19. If testing is effective: add coverage reporting?

## Dependencies

- Left-nav and top-tab shells require MUI. Do not offer them without MUI.
- Local HTTPS is available for every Polylith project because Polylith owns the development server; it does not require the basic service-routing server option.
- Local HTTPS uses fixed initialization defaults: `localhost`, port `8443`, and 365-day validity. Do not prompt for those values.
- Base components require MUI and force unit testing/Karma on.
- Base components always contain a11y and localization capability. The global context flags control default behavior.
- Default app routing exists only with both a server and shell.
- Markdown exists only with both server and localization. Generate the `Markdown` component only with this service.
- Socket.IO exists only with the basic server and forces client/server unit testing on.
- Coverage exists only with testing and never adds a threshold.
- Database persistence selects the canonical `data-persistence.md` standard in either project branch; it does not choose or scaffold a database product.
- When localization is off, do not generate locale files, localization services, `BaseText`/`Text`, or Markdown.
- Hosting posture creates a discovery root; discoverable posture does not imply that the repository itself discovers siblings.
- Repository deployment setup is generated for every Polylith project and supports both `isMaster` values. App routers receive the same installation registry explicitly.

## Defaults controlled by execution

The executor chooses the application default page from actual requirements; do not ask a separate default-page question. For a new scaffold, the generated initial page is normally the default. If no suitable page exists, assign no default. Navigation order never implies a default.
