# REMVC

## Purpose

<!-- rule: REMVC-001 -->
REMVC defines application responsibility independently of React, MUI, and build mechanics. It means Registry, Executor, Model, View, and Controller. The app may contain several scoped MVC groupings—normally one per feature or bounded capability—rather than one global model/view/controller trio.

## Preferred Flow

<!-- rule: REMVC-002 -->
```text
model or domain interaction
  -> app-facing service
  -> controller
  -> view service
  -> React component tree
```

<!-- rule: REMVC-003 -->
For page-capable applications, the shell adds:

<!-- rule: REMVC-004 -->
```text
feature controller -> registers page metadata and owns feature behavior
app-pages service  -> owns available pages and stable ordering
app controller     -> owns selection, URL coordination, and mounting
feature view       -> adapts controller state/actions to React
React component    -> renders presentation and reports user intent
```

<!-- rule: REMVC-005 -->
This is a responsibility contract, not a required file count. A small feature
may temporarily combine adjacent roles, but the dependency direction and
prohibitions still apply. Growth requires extracting the leaked responsibility,
not preserving a shortcut as architecture.

## Strict Responsibility Matrix

<!-- rule: REMVC-006 -->
| Owner | Must own | Must not own |
| --- | --- | --- |
| Registry | app-facing service lookup, lifecycle coordination, and event surfaces | feature policy, startup selection, or domain behavior |
| Executor | startup sequencing and initial controller/flow selection from external facts | page workflow, presentation, domain rules, or an implicit first-page policy |
| Model | canonical durable/domain state, transport, persistence, serialization, normalization, and reusable domain rules | JSX, layout, localized labels, navigation, or screen workflow |
| App-facing service | a stable capability, lifecycle, caching, subscriptions, and adaptation over models/internal collaborators | screen-specific presentation or another owner's policy |
| Controller | commands, user-facing workflow, orchestration, feature sessions, activation/mounting, and invalidation | JSX, CSS, DOM mechanics, raw storage/transport, or duplicated canonical state |
| View service | projection of controller state/actions into presentation-ready values, component choice, mounting, and event relay | domain mutation, persistence, transport, routing policy, defaults, or independent workflow |
| React presentation | semantic JSX, MUI/DOM interaction, rendering, and genuinely transient visual state | registry orchestration, model/service calls, durable mutation, URL parsing, or feature mounting |

## Registry

<!-- rule: REMVC-007 -->
The registry is the locator and lifecycle coordinator for app-facing services. Dependency knowledge should live with the conceptual owner close to where it is used. Services normally locate other app services through the registry rather than receiving a large externally assembled dependency graph.

<!-- rule: REMVC-058 -->
Each application owns an independent application registry. Registry service identifiers are unique only within that registry and name the capability they expose; do not prefix an app-local service name with an application slug merely to distinguish it from a service in another app. The host also gives each app the installation registry, a separate shared registry containing services selected for that installation. An app accesses it through the framework's explicit registry handoff or attachment contract rather than merging its service population into the app registry. Cross-app and host integration use installation-service contracts or another documented external boundary and never rely on app-name prefixes to simulate registry isolation.

<!-- rule: REMVC-008 -->
This does not prohibit dependency injection inside one complex internal unit. Helper collaborators may be supplied through construction when the cluster remains one conceptual owner and each helper stays independently testable. Do not add runtime method parameters solely to steer internals for tests.

<!-- rule: REMVC-009 -->
Cross-service calls go through implemented service methods. Do not pass bound service method references across service boundaries. When routed behavior needs registration, register a stable implemented method name or standardized router method so the service retains ownership of dispatch.

## Executor

<!-- rule: REMVC-010 -->
The executor starts the application and chooses the initial controller or flow. It may consider configuration, mount, URL, authentication state, or other external startup facts. It coordinates startup; it does not absorb page behavior or domain workflows.

<!-- rule: REMVC-011 -->
The executor determines the default page from application requirements. Neither registry order nor the first registered page is an implicit product decision.

## Models And Services

<!-- rule: REMVC-012 -->
- Models own raw data access, transport, persistence, serialization, domain normalization, and durable state reusable outside one screen.
<!-- rule: REMVC-013 -->
- Services expose stable application capabilities, caching, lifecycle, and subscriptions over models or internal collaborators.
<!-- rule: REMVC-014 -->
- Controllers and views consume services rather than bypassing them to reach storage or transport.

<!-- rule: REMVC-015 -->
Not every small domain object needs a service. Introduce the boundary when the rest of the app needs a stable capability, lifecycle, or event surface.

<!-- rule: REMVC-016 -->
A transport-neutral domain model may itself implement and register the stable public capability when a separate service facade would only repeat the model's methods. This is a single model-service role, not permission to bypass the registry or blur transport boundaries: it validates and shapes domain writes, reads and validates owned persistence, applies justified read-repair or caching, exposes no framework-specific request/response objects, and remains the one canonical owner. Use a separate service when the capability has independent lifecycle, command orchestration, subscriptions, adaptation, or policy beyond the model. Command-oriented infrastructure normally remains a service.

<!-- rule: REMVC-017 -->
A model is the sole authority for each canonical fact it owns. Controllers and
views may hold references, projections, or drafts, but do not mirror canonical
state. A server may synthesize a UI-facing view model from several canonical
sources; that response is disposable presentation data, not a new source of
truth. The client sends domain actions or draft intent back to the owning
boundary, which validates and reconciles the mutation.

<!-- rule: REMVC-018 -->
Feature-local models own page-specific normalization, grouping, selection, and
editing state when those rules are meaningful only to that workflow. A shared
model owns a domain contract used by multiple features. Generic transport stays
behind a transport service; a domain model gives it domain meaning.

## Controllers

<!-- rule: REMVC-019 -->
Controllers own user-facing flow, command handling, behavior decisions, and orchestration between services, models, and views. They may own scoped sessions for repeated rendered instances. Controllers do not own CSS or concrete JSX.

<!-- rule: REMVC-020 -->
The controller initiates feature data loading, translates user intent into
domain operations, coordinates success/failure transitions, and invalidates
stale feature state when application context changes. Merely producing a
mountable view must not trigger unrelated data work. A controller may navigate
to another feature through the app controller or another documented service;
it does not import that feature's controller implementation.

<!-- rule: REMVC-021 -->
A controller-mounted session is useful when several presentation instances need feature actions without direct service access. The component reports a gesture such as `performAction('edit')`; the controller decides what it means and which actions are available.

## Views And React Presentation

<!-- rule: REMVC-022 -->
A view service organizes controller state and intent into renderable presentation decisions. React owns JSX, MUI controls, DOM events, and genuinely local visual state.

<!-- rule: REMVC-023 -->
The strict page boundary is:

<!-- rule: REMVC-024 -->
```text
React page <-> page view <-> page controller -> models/services
```

<!-- rule: REMVC-025 -->
The page view is a thin presentation coordinator. It selects the concrete
component, exposes presentation-ready state and actions, relays component
events to its controller, and publishes updates needed to rerender. It does not
fetch data, apply domain rules, select defaults, or make workflow transitions.
The controller does not import or render React components; it asks the view
service to mount the named presentation.

<!-- rule: REMVC-026 -->
React components:

<!-- rule: REMVC-027 -->
- receive data and callbacks from their owning view;
<!-- rule: REMVC-028 -->
- may read global app context for registry-independent presentation flags;
<!-- rule: REMVC-029 -->
- do not subscribe directly to unrelated controllers or models;
<!-- rule: REMVC-030 -->
- do not select page defaults, parse URLs, mount arbitrary features, or perform durable mutation;
<!-- rule: REMVC-031 -->
- report user intent back through the view/controller boundary.

<!-- rule: REMVC-032 -->
A very small feature may initially have the controller render through a thin view boundary, but direct controller-to-React ownership is an implementation compromise, not the architectural target.

### External Adapter Exception

<!-- rule: REMVC-033 -->
A framework-owned DOM or lifecycle boundary, such as a rich-text editor embed,
may require a narrow adapter that registers with the framework, translates its
native document/event format, owns its imperative mount/detach lifecycle, and
bridges to React. That adapter may know framework-specific concepts because
they are its real contract. It must not accumulate reusable domain rules,
workflow decisions, persistence, or durable mutation. Those remain with the
model/controller; presentation still reports gestures through controller-owned
actions or sessions.

## Service Lifecycle

<!-- rule: REMVC-034 -->
Registry services have two startup phases.

### `start()`

<!-- rule: REMVC-035 -->
- initialize local state and owned resources;
<!-- rule: REMVC-036 -->
- implement the service's public methods;
<!-- rule: REMVC-037 -->
- leave the service internally usable once dependencies become ready;
<!-- rule: REMVC-038 -->
- do not call other services or assume their initialization is complete.

### `ready()`

<!-- rule: REMVC-039 -->
- resolve/subscribe to other registry services;
<!-- rule: REMVC-040 -->
- install cross-service listeners;
<!-- rule: REMVC-041 -->
- perform dependency-driven precaching or setup.

<!-- rule: REMVC-042 -->
Services may start in parallel. Presence in the registry does not prove readiness. Non-service objects wait for their own runtime-ready boundary—such as React mount—before locating services.

<!-- rule: REMVC-043 -->
Every owned subscription, listener, timer, observer, connection, and imperative resource needs precise, idempotent cleanup. Replacing a transport or remounting a view must not accumulate listeners.

## Feature Activation And Privacy

<!-- rule: REMVC-044 -->
Feature activation comes from Polylith build configuration and side-effect entry imports. Main entries import the generated feature aggregate; they do not directly import individual page components. Page metadata names a controller service, never a React component.

<!-- rule: REMVC-045 -->
Feature-internal code and assets are private. When another feature needs a capability, expose a narrow service or promote a genuinely shared building block instead of importing feature internals.

<!-- rule: REMVC-046 -->
Feature entry modules activate owned implementations and register contributions
with app-facing hosts. A host exposes facts and extension methods; contributing
features retain their behavior and presentation ownership. Contribution seams
must not require the host to branch on feature names or import contributor
implementations.

<!-- rule: REMVC-047 -->
Canonical shell files are below `src/<app>/features/app`; page features are below `src/<app>/features/<page>`.

## Review Heuristics

<!-- rule: REMVC-048 -->
1. Does dependency knowledge live with the owner that understands it?
<!-- rule: REMVC-049 -->
2. Does the model own raw domain/transport work and either a service own the app-facing capability or a justified transport-neutral model-service expose it without a redundant facade?
<!-- rule: REMVC-050 -->
3. Does the controller own flow without taking presentation detail?
<!-- rule: REMVC-051 -->
4. Does the view organize state without owning domain mutation?
<!-- rule: REMVC-052 -->
5. Does React receive data/actions instead of reaching through layers?
<!-- rule: REMVC-053 -->
6. Are cross-service calls deferred until `ready()`?
<!-- rule: REMVC-054 -->
7. Can a feature be removed without another feature depending on its internals?
<!-- rule: REMVC-055 -->
8. Are lifecycle resources cleaned up exactly once?
<!-- rule: REMVC-056 -->
9. Does the React page talk only to its view, and the view only to its controller?
<!-- rule: REMVC-057 -->
10. Is every canonical fact owned once, with drafts and view models clearly non-canonical?
