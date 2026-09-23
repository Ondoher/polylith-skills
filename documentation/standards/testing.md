# Testing

## Purpose And Lanes

<!-- rule: TESTING-001 -->
Tests provide executable evidence for public behavior, lifecycle, integration seams, and meaningful failure policy. They should make refactoring safer rather than merely increase a number.

<!-- rule: TESTING-002 -->
Use the narrowest lane that can prove the behavior:

<!-- rule: TESTING-003 -->
- direct Node/server tests for backend, transport, filesystem, and server lifecycle behavior;
<!-- rule: TESTING-004 -->
- pure/shared tests for deterministic domain and transformation logic;
<!-- rule: TESTING-005 -->
- Polylith-built browser tests for React, DOM, MUI, browser APIs, and rendering integration.

<!-- rule: TESTING-006 -->
Do not push logic into a browser lane simply because a component eventually consumes it.

## Non-Polylith Headless Projects

<!-- rule: TESTING-007 -->
Headless exploratory projects use Jasmine directly. Specs may live anywhere below `src` and use the suffix `*.spec.js`. The default command is:

<!-- rule: TESTING-008 -->
```text
jasmine "src/**/*.spec.js"
```

<!-- rule: TESTING-009 -->
Do not add Karma unless the project deliberately becomes a supported UI exception. Apply the same behavioral, determinism, cleanup, fixture, and coverage rules described below.

## Browser Build And Runner Boundary

<!-- rule: TESTING-010 -->
Polylith selects and bundles source specs. Karma serves the built output, launches ChromeHeadless, hosts Jasmine, captures console output, and reports results.

<!-- rule: TESTING-011 -->
The inclusion chain is:

<!-- rule: TESTING-012 -->
1. `builds/<app-slug>.json` defines the app spec entry, test destination, and app-level test groups;
<!-- rule: TESTING-013 -->
2. feature-local test metadata contributes feature-owned `_tests/*Spec.js` files;
<!-- rule: TESTING-014 -->
3. `src/<app>/test.js` imports `@polylith/tests`;
<!-- rule: TESTING-015 -->
4. `polylith test <app-slug>` writes the selected browser bundle;
<!-- rule: TESTING-016 -->
5. Karma executes that bundle.

<!-- rule: TESTING-017 -->
Karma does not discover raw source specs. If a spec disappears, check group globs, feature contribution, the synthetic test import, and built output before changing Karma.

## Locations And Ownership

<!-- rule: TESTING-018 -->
- App test entry: `src/<app>/test.js`
<!-- rule: TESTING-019 -->
- Component specs: `src/<app>/components/_tests`
<!-- rule: TESTING-020 -->
- Component harness and shared browser support: `src/<app>/testing`
<!-- rule: TESTING-021 -->
- Feature/service specs: neighboring `_tests` folders
<!-- rule: TESTING-022 -->
- Server test entry: `<app-server>/spec.js` for each server-backed app, with repository-level entries only for genuinely shared host behavior.

<!-- rule: TESTING-023 -->
Keep tests close to the code they cover. Shared setup belongs in the harness only after a stable repeated shape exists. Scenario-specific state remains in the spec so the reason for each test is visible.

## Durable Test Principles

<!-- rule: TESTING-024 -->
- Assert observable results and effects, not private method structure or incidental render markup.
<!-- rule: TESTING-025 -->
- Cover happy paths, empty/min/max/malformed inputs, unsupported values, missing dependencies, timeout, disconnect, cancellation, repeated calls, and cleanup where applicable.
<!-- rule: TESTING-026 -->
- Add a regression case for a production defect.
<!-- rule: TESTING-027 -->
- Control locale, time, randomness, environment, and browser globals when they affect results.
<!-- rule: TESTING-028 -->
- Do not depend on execution order.
<!-- rule: TESTING-029 -->
- Restore globals, DOM, timers, mocks, listeners, sockets, and owned resources after every spec.
<!-- rule: TESTING-030 -->
- Give asynchronous work a bounded completion condition; do not synchronize with arbitrary sleeps.
<!-- rule: TESTING-031 -->
- Prefer stable semantic assertions over large snapshots.
<!-- rule: TESTING-032 -->
- Do not generate expected output with the same implementation under test.

<!-- rule: TESTING-065 -->
Prefer design and implementation first, followed by tests against the intended public behavior, rather than requiring strict test-driven development. This is a workflow preference, not a prohibition on writing a test first or permission to omit regression and behavioral verification. Tests preserve the quality and correctness promises established by the design.

## React And Component Tests

<!-- rule: TESTING-033 -->
Test what a user or owning layer can observe:

<!-- rule: TESTING-034 -->
- semantic content and accessibility state in scope;
<!-- rule: TESTING-035 -->
- literal/localized text and context modes;
<!-- rule: TESTING-036 -->
- callback payloads representing user intent;
<!-- rule: TESTING-037 -->
- controlled/local state transitions;
<!-- rule: TESTING-038 -->
- loading, empty, invalid, error, disabled, and unavailable states;
<!-- rule: TESTING-039 -->
- keyboard/focus behavior where relevant;
<!-- rule: TESTING-040 -->
- setup and cleanup of portal/document/browser resources.

<!-- rule: TESTING-041 -->
Generated component tests are behavioral, not rendering smoke tests. The shared harness uses the real app context shape, controlled registry/service fakes, React `act`, portal-aware queries, rerendering, console capture, and deterministic cleanup.

## Service And Lifecycle Tests

<!-- rule: TESTING-042 -->
Construct a service directly with narrow fakes to prove isolated behavior. Use the real registry/lifecycle only when startup order, readiness, event registration, or cross-service wiring is the subject. Keep those two proof levels explicit.

<!-- rule: TESTING-043 -->
Test `start()` as local initialization and `ready()` as dependency-driven setup. Verify repeated readiness/shutdown behavior does not accumulate listeners or resources.

### Private Collaborators And Test Seams

<!-- rule: TESTING-044 -->
Preserve the public architecture while choosing the narrowest useful seam for a private collaborator:

<!-- rule: TESTING-045 -->
1. Cover a small file-private detail through its owner's observable public behavior.
<!-- rule: TESTING-046 -->
2. When a substantial collaborator has independent rules or edge cases, place it in an internal module and export it to same-owner production code and tests. That module export does not make it a public feature or package contract.
<!-- rule: TESTING-047 -->
3. Use an injected constructor factory for external resources, time-dependent objects, workers, or an intentionally file-private implementation whose construction must be controlled.
<!-- rule: TESTING-048 -->
4. Promote a collaborator to a public service only when it has an independent capability, lifecycle, or multiple real consumers—not merely to make it easier to test.

<!-- rule: TESTING-049 -->
Do not add test-only public services, cross-feature imports, production environment branches, or runtime method parameters whose only purpose is steering tests. Respect the canonical feature boundary even when a private internal module is directly testable by its owner.

## Commands

<!-- rule: TESTING-050 -->
```text
npm test
npm run karma:watch
npm run coverage
```

<!-- rule: TESTING-051 -->
Each one-shot browser command builds the selected app and exits with its result. Root `npm test` runs every locally declared test-bearing app plus every applicable shared and app-specific server lane owned by that repository; targeted app commands and watch commands are narrower development loops, not complete repository verification. A server-root test command does not discover or replace tests owned by child app repositories. Console-oriented `spec` output remains visible.

## Coverage

<!-- rule: TESTING-052 -->
When enabled, coverage measures authored source, emits console and HTML reports, and does not enforce a project-wide threshold.

<!-- rule: TESTING-053 -->
When enabled, source coverage instruments authored `src/<app>` code before bundling and excludes specs/testing support. Do not instrument the completed bundle because it contains React, MUI, and dependencies. Server coverage measures authored server source in a separate report. Emit a console summary and HTML inspection report without enforcing a project threshold.

<!-- rule: TESTING-054 -->
When a scaffold generates coverage support, its complete generated runtime
baseline must report 100% statements, branches, functions, and lines. This
includes generated components, services, models, controllers, views, routes,
transports, and runtime composition modules. Tests must prove behavior rather
than merely execute lines. Test files, test harnesses and mocks, ambient
declarations, configuration, and generated dependencies are not runtime code
and remain outside the measurement.

<!-- rule: TESTING-055 -->
Client and server reporting remain separate. A single-app repository may place
client output below `coverage/src` and server output below `coverage/server`.
A multi-app repository isolates app results below app-named destinations such as
`coverage/src/<app-slug>` and `coverage/server/<app-slug>`; genuinely shared
server coverage also has its own non-colliding destination. Each lane emits a
console summary, HTML report, and machine-readable JSON summary. Do not merge
the figures or enforce a project-wide threshold. The 100% requirement describes
the installed generated baseline; future product code is reported honestly
without inheriting a numeric gate. Coverage is produced by the repository that
owns the tested source; a server-root composition does not absorb discovered
application coverage into the host report.

## Debugging Missing Or Misleading Tests

<!-- rule: TESTING-056 -->
1. Is the spec under the correct owner and naming convention?
<!-- rule: TESTING-057 -->
2. Does the app/feature test group select it?
<!-- rule: TESTING-058 -->
3. Does the app spec entry import `@polylith/tests`?
<!-- rule: TESTING-059 -->
4. Did `polylith test <app-slug>` rebuild that app's expected destination?
<!-- rule: TESTING-060 -->
5. Is Karma loading the fresh built output and applicable CSS?
<!-- rule: TESTING-061 -->
6. Is a focused runner executing a stale bundle?
<!-- rule: TESTING-062 -->
7. Is coverage measuring authored source rather than dependencies?

## Definition Of An Established Lane

<!-- rule: TESTING-063 -->
A lane is established only when source discovery is explicit, a representative spec proves it, the documented one-shot command terminates, failures return nonzero status, generated output is reproducible, and the lane has run successfully in its claimed environment.

## Deployment Composition Tests

<!-- rule: TESTING-064 -->
A repository tests the active-master composition it owns during development and standalone execution. A hosting/server-root repository additionally tests resident/discovered ordering, mount uniqueness and fallback isolation, deployment setup, installation-registry availability and lifecycle, host middleware, and generated deployment destinations. Deployment-setup coverage proves master-first ordering, one call per selected repository rather than per app, shared registry identity, correct `serverRoot`/`appRoot`/configuration context, the same repository's `isMaster: true` standalone behavior and `isMaster: false` discovered behavior when discoverable, omission for unselected repositories and non-serving commands, and failure before router initialization. App integration tests prove required and optional installation-service behavior using a controlled installation registry without coupling to concrete sibling apps. These tests use representative child fixtures or explicitly coordinated integration inputs; they do not substitute for the discovered repositories' own unit, browser, server, and coverage lanes.
