# Polylith

## Purpose And Deployment Posture

<!-- rule: POLYLITH-001 -->
A Polylith repository may own one or more self-contained deployable applications. Each application has a unique `<app-slug>`, can run independently for development, and may be composed below an existing Polylith server root. Do not assume an application is the host's main/root application merely because it is the repository default.

## Configuration Ownership

<!-- rule: POLYLITH-002 -->
- `polylith.json` owns the declaring repository's local app catalog and paths. In a server-root repository it additionally owns discovery roots, deployment-wide setup and destination, mechanical server capabilities, and composed mounts for resident apps. A discovered app repository retains authority over its own app and build declarations.
<!-- rule: POLYLITH-003 -->
- One `builds/<app-slug>.json` per application owns that app's entry, test entry, HTML template, CSS/resources, feature list, router module, standalone destination, and test destination. Application destinations and test destinations must not collide.
<!-- rule: POLYLITH-004 -->
- `src/<app>` is the application-owned source root.
<!-- rule: POLYLITH-005 -->
- An app served by itself may use build `routerRoot: "/"`. When multiple apps are composed into one server, each app declaration owns a unique, non-overlapping mount. When default app routing is enabled for an app, its final router mounts static middleware for that app's deployment directory before its index fallback. Keep HTML assets and browser routing relative to the served document so the same build can move between standalone `/` and a composed `/<app-slug>` mount without rebuilding.
<!-- rule: POLYLITH-006 -->
- At most one app declaration uses `default: true`. It selects an app for local CLI commands that omit a slug; it does not make that app another server's root app, exclude sibling apps from repository-wide commands, or define deployment composition.

<!-- rule: POLYLITH-007 -->
Keep all paths relative to the repository that declares them. Never embed a developer-specific absolute path in build or runtime configuration.

## Repository And Deployment Roles

<!-- rule: POLYLITH-049 -->
Every Polylith repository is master-capable: when run from its own root for development or standalone deployment, it owns the active server process and acts as the master. Repository posture instead describes discovery and composition responsibility. An application repository hosts only its local apps. A discoverable application repository can also be composed beneath another active master. A hosting repository, called the server-root repository by Polylith, declares one or more `discover` directories and may additionally own resident local apps. The server-root label denotes responsibility for discovering and hosting other repositories, not exclusive ability to act as master. Determine posture from discovery and hosting responsibilities rather than app count or the `multiple` flag, and record it with every local or discoverable app in the foundation documentation.

<!-- rule: POLYLITH-050 -->
A repository intended to be discovered remains independently buildable and runnable from its own root. It uses the explicit multi-app configuration shape with `multiple: true` and an `apps` array even when it currently contains one app. Each app declaration owns its name, build file, and deployment mount. The repository may also own one optional deployment setup entry point used in both standalone and discovered roles. The server root does not duplicate or override that catalog or entry point.

<!-- rule: POLYLITH-051 -->
The server root owns mechanical server settings, its deployment destination, optional `deployment.setup`, and discovery locations. Discovery is shallow: each direct non-tool child containing `polylith.json` is an independently owned repository. Do not make the server root enumerate discovered app names, build files, or mounts, and do not treat nested discovered repositories as host-owned source.

<!-- rule: POLYLITH-052 -->
When a server root composes a discovered app, source, build, and deployment-setup paths remain relative to the discovered repository while generated deployment output is written below the server root's destination using the app's mount or name-derived segment. The master remains authoritative for mechanical server configuration and destination, but each selected discovered repository may contribute installation setup through its own entry point.

<!-- rule: POLYLITH-053 -->
From a server root, Polylith build, watch, run, and serve operations compose resident apps first and discovered apps afterward. Polylith test operations remain local to the current repository and never discover child repositories. Each discoverable app repository owns and runs its own unit, browser, server, and coverage commands.

<!-- rule: POLYLITH-054 -->
Each app owns an independent application registry; app-local services do not share a namespace and need no app-name prefix. The repository owning the active master/server process creates one installation registry for that installation, regardless of its discovery posture. Its setup and every selected discovered repository setup receive that same registry before any app router initializes, and every local, resident, and discovered router later receives it explicitly. An app may consume or contribute installation services only through documented contracts; it does not merge the installation registry into its local registry or infer which other apps are installed. The installation registry creates no implicit parent-child relationship between app registries.

<!-- rule: POLYLITH-055 -->
An optional repository-owned `deployment.setup` module exports `setup(context, isMaster)` and may be asynchronous. Polylith awaits the active-master repository's setup first with `isMaster: true`, then awaits setup once per selected discovered repository in discovery order with `isMaster: false`, and only then initializes local, resident, and discovered routers. Every repository therefore must support master execution during its own development and standalone deployment; a discoverable repository must support both setup roles. `context` supplies the shared installation registry, active master `serverRoot`, owning repository `appRoot`, and the owning repository's configuration. The setup path resolves from `appRoot`; multiple selected apps from one repository still cause one setup call. Build, test, and non-serving watch operations do not run deployment setup. A configured setup failure aborts server startup before router initialization.

## Build Composition

<!-- rule: POLYLITH-008 -->
Polylith is the only bundler. The build explicitly assembles:

<!-- rule: POLYLITH-009 -->
- the app entry and HTML template;
<!-- rule: POLYLITH-010 -->
- included features;
<!-- rule: POLYLITH-011 -->
- app and feature CSS;
<!-- rule: POLYLITH-012 -->
- copied resources;
<!-- rule: POLYLITH-013 -->
- aggregated configuration;
<!-- rule: POLYLITH-014 -->
- build-declared loadables;
<!-- rule: POLYLITH-015 -->
- the optional browser test entry and selected specs.

<!-- rule: POLYLITH-016 -->
Source files do not join the app merely because they exist. There are two independent gates:

<!-- rule: POLYLITH-017 -->
1. build inclusion makes a capability available;
<!-- rule: POLYLITH-018 -->
2. runtime side-effect imports and registry registration activate it.

<!-- rule: POLYLITH-019 -->
When app code, CSS, a resource, or a browser spec is missing, inspect build metadata and synthetic-module inclusion before debugging runtime behavior.

## Copied Assets And Runtime Paths

<!-- rule: POLYLITH-020 -->
For a copied CSS or resource descriptor, `cwd` is the source root, `glob` selects files below that root, `dest` is the emitted runtime directory, and `keepNest: true` preserves the hierarchy below `cwd` under `dest`. A file that must exist in generated output belongs under a declared source tree and must match its build descriptor; source colocation alone does not ship it.

<!-- rule: POLYLITH-021 -->
Derive browser URLs from the emitted layout rather than the source tree. JSX and HTML use the path produced by `dest`, while CSS `url(...)` values are relative to the emitted CSS file. For example, a descriptor with `cwd: "assets/images"`, `glob: "**/*.{png,jpg,svg}"`, `dest: "feature/images"`, and `keepNest: true` emits `assets/images/icons/status.svg` beneath `feature/images/icons/status.svg`; consumers address that built path.

<!-- rule: POLYLITH-056 -->
Ship application stylesheets through declared copied-asset descriptors rather than JavaScript/JSX CSS module imports. Keep each stylesheet in its owning app or feature asset tree, include it through that owner's build metadata, and derive runtime URLs from the emitted layout. CSS module imports for shipped styling are prohibited. CSS `url(...)` references continue to follow emitted asset paths.

## Synthetic Modules And Features

<!-- rule: POLYLITH-022 -->
The application entry imports Polylith's generated feature aggregate so included feature entrypoints execute. Build-generated configuration and loadables likewise remain declared build concerns. Do not replace those seams with a manually maintained list of feature implementation imports.

<!-- rule: POLYLITH-023 -->
Each feature may contribute source activation, configuration, CSS, resources, loadables, and test groups. Keep contributions with their feature. App-level configuration owns only genuinely app-wide assets and shared test globs.

<!-- rule: POLYLITH-024 -->
`index.js` is the feature's runtime activation boundary. Keep most
feature-crossing imports there: it imports the owned implementations that
register services and contributions. Consumers locate app-facing capabilities
through the registry. A feature view may directly import its own concrete React
tree and private presentation helpers; that exception does not make those files
public to other features.

<!-- rule: POLYLITH-025 -->
As an exception to the general import-only `index.js` rule, the application
entry-point `index.js` may additionally create, configure, and start the
application registry. Feature activation indexes remain import-only.

<!-- rule: POLYLITH-026 -->
Feature build and test contributions are independent. A feature owns its test
entry/groups and browser specs, and removing the feature removes those tests
from the aggregate. Loadable production code still belongs in the owning
feature's test build even though runtime loadables are not dynamically loaded
during testing.

## Service Lifecycle

<!-- rule: POLYLITH-027 -->
Polylith registry services initialize in two phases:

<!-- rule: POLYLITH-028 -->
- `start()` initializes local state and owned resources only;
<!-- rule: POLYLITH-029 -->
- `ready()` resolves dependencies, installs cross-service listeners, and performs dependency-driven setup.

<!-- rule: POLYLITH-030 -->
Services may start in parallel. Registry presence is not proof of readiness. Cross-service behavior belongs in `ready()` and every listener/resource requires matching cleanup.

## Server And Deployment Ownership

<!-- rule: POLYLITH-031 -->
Polylith owns bundling, static serving, Express startup, app-router mounting, deployment destinations, and optional Socket.IO attachment. Do not create a second bundler, a competing Express lifecycle, or a socket server that closes the shared host transport.

<!-- rule: POLYLITH-032 -->
Each app router contributes that app's feature routes and optional final app-index fallback through the Polylith router contract. A standalone app uses its build config's `routerRoot` for the Express mount. Under the explicit multi-app discovery contract, each app declaration may instead own a composed `mount`; that value takes precedence over the discovered build's standalone `routerRoot`. Normalized mount identities must be unique. A root or ancestor URL mount may coexist with a deeper app mount only when its fallback remains scoped so it cannot capture a sibling app's routes. URL mounts are transport routing and are unrelated to registry service naming. Do not add a top-level `mount` outside that contract. When deployed into an existing server, each app's output is placed below that server's destination according to its composed mount rather than overwriting the host root or a sibling app.

## Browser Tests

<!-- rule: POLYLITH-033 -->
Polylith owns browser-spec selection and bundling:

<!-- rule: POLYLITH-034 -->
1. each test-bearing app build defines its own `spec`, non-colliding `testDest`, and app-level test groups;
<!-- rule: POLYLITH-035 -->
2. feature-local test metadata contributes feature-owned specs;
<!-- rule: POLYLITH-036 -->
3. `src/<app>/test.js` imports `@polylith/tests`;
<!-- rule: POLYLITH-037 -->
4. `polylith test <app-slug>` builds the selected test output;
<!-- rule: POLYLITH-038 -->
5. Karma executes that built output.

<!-- rule: POLYLITH-039 -->
The build's `testDest` is generated output, just like its deployment `dest`. Ignore both output trees and do not commit their bundles or source maps. Authored specs remain under their source owners and are the durable test inputs.

<!-- rule: POLYLITH-040 -->
Karma does not discover raw application specs. If a spec does not run, verify the test group, feature contribution, generated bundle, and only then the Karma file list.

## Commands And Troubleshooting

<!-- rule: POLYLITH-041 -->
```text
npm run build
npm test
npm start
```

<!-- rule: POLYLITH-042 -->
Use package scripts as the normal interface. In a multi-app repository, the root build and test commands cover every locally declared build or test-bearing app; targeted per-app scripts may provide the narrow development loop but do not replace complete repository verification. A server-root build or serve command additionally composes discovered apps, but its test command remains local and does not replace verification in discovered repositories. The installed CLI behavior is authoritative. If an app or feature is absent from output, check in order:

<!-- rule: POLYLITH-043 -->
1. app/build discovery;
<!-- rule: POLYLITH-044 -->
2. feature inclusion and feature build metadata;
<!-- rule: POLYLITH-045 -->
3. generated feature/config/test aggregate imports;
<!-- rule: POLYLITH-046 -->
4. runtime registration;
<!-- rule: POLYLITH-047 -->
5. copied resource and CSS destinations.

<!-- rule: POLYLITH-048 -->
Each app must build from its declaring repository and remain deployable independently or below another server root without absolute paths, sibling-app coupling, or host-specific product assumptions.
