# Architecture

## Purpose

<!-- rule: ARCHITECTURE-001 -->
This topic owns the repository-wide structural model: where responsibilities live, how application capabilities are assembled, and how facts are routed into narrower topics. It is a working architecture brief, not a product specification.

## Current Structure

<!-- rule: ARCHITECTURE-002 -->
Use the selected project structure and keep local configuration facts in project documentation. The responsibility boundaries below are canonical across projects.

## Ownership Principles

<!-- rule: ARCHITECTURE-003 -->
- Keep each capability with the narrowest owner that understands its meaning.
<!-- rule: ARCHITECTURE-004 -->
- Feature-local code, CSS, images, and tests are private to that feature until deliberately promoted to a shared layer.
<!-- rule: ARCHITECTURE-005 -->
- Do not create routine dependencies from one feature into another feature's internals. Use a narrow shared service contract when cross-feature composition is intentional.
<!-- rule: ARCHITECTURE-006 -->
- Put shared components in the common application layer when they are already useful across features or are reasonably expected to become cross-feature building blocks.

<!-- rule: ARCHITECTURE-007 -->
- Keep canonical application facts in one service, model, configuration file, or topic; consumers derive views instead of maintaining competing copies.
<!-- rule: ARCHITECTURE-008 -->
- Validate and normalize data at a genuine ingress. Internal layers trust accepted contracts rather than repeating shape checks.

<!-- rule: ARCHITECTURE-009 -->
Ownership follows meaning, not convenience or file proximity. A caller asks an
owner to perform an operation; it does not reproduce the owner's policy,
normalization, mutation, routing, lifecycle, or cleanup rules.

## Runtime Boundaries

<!-- rule: ARCHITECTURE-010 -->
The preferred direction is:

<!-- rule: ARCHITECTURE-011 -->
```text
external input or durable data
  -> model/domain boundary
  -> app-facing service
  -> controller
  -> view service
  -> React presentation
```

<!-- rule: ARCHITECTURE-012 -->
Models own raw transport, persistence, serialization, and reusable domain state. Services expose stable application capabilities and lifecycle. Controllers own user-facing flow and command orchestration. Views organize controller state into presentation decisions. React renders those decisions and reports user intent through callbacks.

<!-- rule: ARCHITECTURE-013 -->
Small features do not need ceremonial files for every layer. The boundary is about responsibility, not file count. Split a layer when behavior has actually emerged; do not let React absorb domain rules merely because a feature began small.

## Feature Ownership

<!-- rule: ARCHITECTURE-014 -->
A feature is a high-level, independently selectable capability, not merely a
folder. It owns its workflow end to end: activation, controllers, views,
presentation components, feature models and helpers, local services, CSS,
assets, configuration, routes, ambient contracts, build metadata, and tests.
It exposes only the smallest app-facing contract needed to activate or consume
that capability.

<!-- rule: ARCHITECTURE-015 -->
Everything beneath a feature is private by default. Another feature must not
import its controller, view, component, model, helper, CSS, type declaration,
test support, or asset. Cross-feature collaboration must use one of these
intentional seams:

<!-- rule: ARCHITECTURE-016 -->
- an app-facing registry service;
<!-- rule: ARCHITECTURE-017 -->
- a contribution registry owned by the host capability;
<!-- rule: ARCHITECTURE-018 -->
- a genuinely shared application model, service, component, or utility; or
<!-- rule: ARCHITECTURE-019 -->
- a documented public feature entry point when direct composition is truly the
contract.

<!-- rule: ARCHITECTURE-020 -->
`index.js` files contain only imports and exports for aggregation or activation.
Any other executable implementation in an `index.js` requires a documented
architectural reason and an applicable architecture-specific exception.

<!-- rule: ARCHITECTURE-021 -->
The app shell and bootstrap may know that feature contributions exist; they do
not know feature implementation files. Client and server feature boundaries do
not need to mirror one another: client features follow user workflows, while
server features follow backend domains and system capabilities.

### Removal Test

<!-- rule: ARCHITECTURE-022 -->
A feature is correctly bounded when removing its build inclusion and owned
tree:

<!-- rule: ARCHITECTURE-023 -->
- removes its behavior, registration, styles, resources, routes, and tests;
<!-- rule: ARCHITECTURE-024 -->
- leaves no dead imports, configuration, selectors, event names, or app-shell
  branches outside the feature;
<!-- rule: ARCHITECTURE-025 -->
- does not break unrelated application startup or behavior; and
<!-- rule: ARCHITECTURE-026 -->
- leaves only deliberate, generally useful host extension seams.

<!-- rule: ARCHITECTURE-027 -->
If removal requires editing another feature's implementation, the boundary is
not complete.

<!-- rule: ARCHITECTURE-028 -->
Promote a component when another feature uses it or could reasonably use it as a general UI building block. Move its styles, tests, type declarations, and support files with it. Anticipated reuse is a valid reason for shared placement; a component meaningful only inside one feature remains feature-private. Helper extraction still follows its real owner and the canonical class/utility rules.

<!-- rule: ARCHITECTURE-029 -->
Keep page-specific derived or draft state in the page feature's model. Promote
it to an app-shared model only after multiple live features require the same
domain contract. Promotion moves the implementation, tests, styles, assets,
types, and documentation together; it does not leave a shared facade over a
private feature implementation.

## Build And Runtime Are Separate Gates

<!-- rule: ARCHITECTURE-030 -->
For a Polylith application, build configuration decides which features, resources, CSS, configuration, loadables, and tests exist in the output. Side-effect imports and service registration decide which included capabilities activate at runtime. When something is missing, check build inclusion before debugging runtime registration.

<!-- rule: ARCHITECTURE-031 -->
Tests follow the same ownership model. Browser specs are selected and bundled by Polylith before Karma runs them; Karma is not the source discovery layer.

## Canonical Documentation Ownership

<!-- rule: ARCHITECTURE-032 -->
- Product requirements and current work belong in `agents/topics/<app-slug>/README.md` once defined.
<!-- rule: ARCHITECTURE-033 -->
- Package and runtime facts belong in `agents/topics/project-foundation/README.md`.
<!-- rule: ARCHITECTURE-034 -->
- Canonical engineering rules live under the global `documentation/standards`
  tree. A project applicability manifest names the standards it uses and
  records explicit local exceptions; it does not copy or restate them.
<!-- rule: ARCHITECTURE-035 -->
- Project topics contain product facts, local structure, current work, and
  decisions that are not global engineering standards.

<!-- rule: ARCHITECTURE-036 -->
Keep current facts, plans, and historical evidence separate. Link to the canonical owner instead of duplicating a changing decision.

## Review Heuristics

<!-- rule: ARCHITECTURE-037 -->
Before adding or moving a capability, ask:

<!-- rule: ARCHITECTURE-038 -->
1. Which layer owns its meaning and lifecycle?
<!-- rule: ARCHITECTURE-039 -->
2. Is the dependency visible through a stable contract?
<!-- rule: ARCHITECTURE-040 -->
3. Is this genuinely shared, or still feature-private?
<!-- rule: ARCHITECTURE-041 -->
4. Is build inclusion distinct from runtime activation?
<!-- rule: ARCHITECTURE-042 -->
5. Can the unit be tested without assembling unrelated application infrastructure?
<!-- rule: ARCHITECTURE-043 -->
6. Is the documentation fact recorded once in the narrowest durable topic?
<!-- rule: ARCHITECTURE-044 -->
7. Would deleting the feature pass the removal test without edits elsewhere?
