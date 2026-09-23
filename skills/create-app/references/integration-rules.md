# Existing Repository Integration

## Ownership

- App source belongs below `src/<app-slug>/`.
- App server code belongs below `server/<app-slug>/`.
- The build file belongs at `builds/<app-slug>.json`.
- The app router accepts the shared installation registry explicitly and attaches it to the app's package-local registry before lifecycle startup.
- Repository deployment setup runs once per selected repository before routers. It may register installation-wide services and must use `isMaster` for genuinely master-only work.
- App-local service names are not prefixed with the app slug. Shared transport namespaces and mounts remain app-scoped.

## Shared configuration

Append one app declaration to `polylith.json`; never rebuild its existing app array. Preserve existing mechanical server and discovery settings. Add `socketIo: true` only when required. Add `deployment.setup` only when absent and create only the minimal repository-owned setup module in that case.

Merge only missing package dependencies. Preserve installed version policy and never replace an existing dependency range. Add app-specific test and coverage scripts so sibling apps keep independent entry points and report destinations.

## Tests and documentation

Generated tests must use the repository's Polylith test/build output and existing Karma or Node runners. App server tests enter through `server/<app-slug>/spec.js`. Coverage destinations must be app-scoped.

Add an app topic, link it from the current topic index, and add longest-match folder assignments for both app roots. A new standards set may reuse canonical links already present in the normalized manifest. Recreate the normalization attestation and `STANDARDS.md` after the manifest changes.
