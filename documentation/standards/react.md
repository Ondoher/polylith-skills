# React Code

## Purpose

<!-- rule: REACT-001 -->
Use this topic when writing or refactoring React presentation, deciding whether behavior belongs in React or a REMVC view/controller, organizing JSX, managing effects, or placing shared and feature-local components.

## Presentation Boundary

<!-- rule: REACT-002 -->
React is the concrete presentation technology, not the whole REMVC view layer.

<!-- rule: REACT-003 -->
- Controllers determine user-facing flow, commands, and behavior.
<!-- rule: REACT-004 -->
- View services translate controller state and intent into presentation values and callbacks.
<!-- rule: REACT-005 -->
- React components render the UI and own only transient presentation state.
<!-- rule: REACT-006 -->
- Models/services own durable state, persistence, transport, and broadly shared capabilities.
<!-- rule: REACT-007 -->
- Components do not reach directly into models, transport logic, or unrelated registry services.
<!-- rule: REACT-008 -->
- A feature page communicates with its page view only. The view relays intent
  to the controller, and the controller owns model/service coordination.

<!-- rule: REACT-009 -->
Prefer data and decisions flowing into components through explicit props, and user intent flowing outward through callbacks. Local state is appropriate for an open panel, a draft field, focus-related presentation, or temporary selection. Move state outward when several distant consumers need it, it must survive component lifetime, or it represents a canonical application fact.

## Component Shape

<!-- rule: REACT-010 -->
- Name component files in `PascalCase` after their principal component.
<!-- rule: REACT-011 -->
- Implement substantial components as classes by default.
<!-- rule: REACT-012 -->
- Use a function component only for a very small, entirely stateless wrapper or utility with no lifecycle, refs, effects, owned state, several handlers, or meaningful object model.
<!-- rule: REACT-013 -->
- Components with state, lifecycle behavior, refs, effects, multiple handlers, or several semantic regions are classes.
<!-- rule: REACT-014 -->
- Give each component one clear responsibility and an explicit prop contract.
<!-- rule: REACT-STRUCT-001 -->
- Break a large render into focused render methods named for purposeful semantic regions.
<!-- rule: REACT-015 -->
- Prefer values derived during render over mirrored state that must be synchronized.
<!-- rule: REACT-016 -->
- Use stable semantic keys for lists; avoid array indices when items can be inserted, removed, or reordered.
<!-- rule: REACT-017 -->
- Extract shared components when their current use or reasonably anticipated cross-feature use establishes their role as general UI building blocks.

<!-- rule: REACT-018 -->
JSX should expose the meaningful boxes of the interface. A control group, status block, preview, list, toolbar, dialog region, and main content region should usually be represented explicitly rather than inferred from a flat sequence by CSS.

## Props, State, And Events

<!-- rule: REACT-EVENT-001 -->
- Do not use inline event callbacks. Pass named handler references to event props. Define and bind handlers outside render; do not place arrow functions, function expressions, or `.bind(...)` calls in JSX event props or event props inside JSX spreads and input/slot property objects. Render-prop and list-mapping callbacks are not event callbacks. Static checking covers syntactically visible event values; reviewers trace aliases and callback factories that require reasoning.

<!-- rule: REACT-019 -->
- Treat props as immutable inputs.
<!-- rule: REACT-020 -->
- Keep one canonical owner for every state fact.
<!-- rule: REACT-021 -->
- Use controlled inputs when their value participates in validation, submission, or shared state.
<!-- rule: REACT-022 -->
- Keep handlers focused on translating DOM interaction into local state or an owner-supplied callback.
<!-- rule: REACT-023 -->
- Callback payloads communicate user intent and do not expose mutable component internals.
<!-- rule: REACT-024 -->
- Do not pass service method references across service boundaries; let the owning view/controller call the service contract.
<!-- rule: REACT-025 -->
- When props intentionally reset component state, make the reset condition explicit through a stable identity or reset token rather than incidental rerenders.

## Effects And Lifecycle

<!-- rule: REACT-026 -->
Rendering must be free of observable side effects. Do not subscribe, fetch, mutate services, create timers, or imperatively change the DOM during render.

<!-- rule: REACT-027 -->
For class components:

<!-- rule: REACT-028 -->
- perform setup in the matching mount/update lifecycle;
<!-- rule: REACT-029 -->
- store non-rendering mutable resources on the instance;
<!-- rule: REACT-030 -->
- cancel or ignore stale async results when newer work supersedes them;
<!-- rule: REACT-031 -->
- remove every subscription, timer, observer, document listener, portal resource, and owned imperative object during cleanup;
<!-- rule: REACT-032 -->
- keep cleanup safe when setup was partial or called more than once.

<!-- rule: REACT-033 -->
Locate registry services only after the component reaches its runtime-ready boundary, normally mount, rather than in the constructor. Render feature dialogs beneath the normal application root; do not create detached React roots for ordinary dialogs or feature views.

## Components And Dialogs

<!-- rule: REACT-034 -->
- Feature forms normally consume concrete shared components such as `TextInput` and `Select`.
<!-- rule: REACT-035 -->
- `BaseXXXX` components are foundations for concrete components, not the routine feature-screen API.
<!-- rule: REACT-036 -->
- Give every substantial dialog its own component instead of embedding a large MUI `Dialog` tree inside another component's render method.
<!-- rule: REACT-037 -->
- Keep dialog workflow decisions with the controller/view; the component presents state and reports actions.
<!-- rule: REACT-038 -->
- Preserve MUI portal/focus behavior and use the shared harness for portal-aware tests.

## Semantic Markup And Interaction

<!-- rule: REACT-039 -->
Use semantic HTML first. Native buttons, labels, inputs, headings, lists, fieldsets, and landmarks provide behavior that generic elements do not. Adding interaction to a non-interactive element requires keyboard, focus, role, and state behavior and should be rare.

<!-- rule: REACT-040 -->
Keep ordinary controls keyboard-operable, preserve visible focus, and make hover-revealed help/actions available on focus. Use ARIA only to fill a semantic gap. Important async status may need an announcement when it would otherwise be imperceptible; ordinary rerenders should not become noisy live-region output.

## CSS And Layout Ownership

<!-- rule: REACT-041 -->
- JSX defines semantic structure; CSS determines visual arrangement. All authored styling decisions belong in CSS stylesheets, including layout, colors, typography, spacing, responsive behavior, and visual states. Code may set style properties only when their values must be calculated programmatically from runtime data or measurements and cannot be expressed in CSS. Prefer passing those calculated values through CSS custom properties, leaving their visual use in CSS. Selecting a predefined visual state is not a calculation: toggle a class or state attribute and let CSS define its appearance.
<!-- rule: REACT-042 -->
- A component owns markup, stable class names, and internal focus/state/interaction styling.
<!-- rule: REACT-043 -->
- A parent region owns placement and sizing of its children.
<!-- rule: REACT-044 -->
- Broad CSS owns genuine tokens and defaults, not one-off component rules. Define shared colors, font families, typography scales, and other values standardized across multiple styles as named CSS custom properties. Reuse those variables instead of repeating literal values, and keep their definitions with the theme or nearest shared style owner. Define semantic branding color variables for identity-defining layout surfaces and accents that need distinct treatment from ordinary control styling. Give them names based on their role, such as workspace background, navigation surface, or editor accent, so changing their shared definitions updates the app identity consistently.
<!-- rule: REACT-045 -->
- Use CSS Grid as the default layout system for pages, major regions, and component layouts. Use Flexbox only where needed for smaller groups of elements, such as control groups, that need one-dimensional alignment.
<!-- rule: REACT-046 -->
- Preserve semantic groups across responsive modes and change arrangement in CSS unless the content itself changes.
<!-- rule: REACT-047 -->
- Use CSS backgrounds for decorative chrome; use an `img` when the image is content and needs intrinsic/alternative-text semantics.
<!-- rule: REACT-048 -->
- Do not author static styling through `style`, `sx`, CSS-in-JS, or JavaScript style objects. Only properties requiring programmatic calculation may be set in code; keep all other declarations in CSS and follow the MUI styling boundary.

## Shared And Feature-Local Ownership

<!-- rule: REACT-049 -->
Keep a component with the feature that owns its meaning when it is useful only there. Create or promote it in `src/<app>/components` when it is already useful across features or is reasonably expected to become a cross-feature building block. Move its stylesheet, tests, type declarations, and support files with it. One feature must not import another feature's private presentation.

<!-- rule: REACT-050 -->
Shared components expose presentation-oriented values and callbacks. They do not silently subscribe to feature services or embed a consumer's domain rules.

<!-- rule: REACT-051 -->
Feature presentation must remain removable with its feature. Do not register
feature CSS globally, import one feature's component from another, or place a
feature-specific selector in shared CSS. When a component becomes genuinely
shared, promote its implementation, CSS, tests, ambient types, fixtures, and
support harness together.

## Testing

<!-- rule: REACT-052 -->
Behavior changes add or update tests at the narrowest useful level. Test observable semantic rendering, localized/accessibility behavior in scope, callbacks, local state transitions, focus/keyboard behavior, and cleanup. Avoid assertions against private methods, React bookkeeping, or exact incidental markup.

<!-- rule: REACT-053 -->
Use a real browser lane when DOM rendering, MUI portals, layout, browser APIs, or module bundling is part of the contract. Keep pure data behavior outside the browser.

## Review Checklist

<!-- rule: REACT-054 -->
1. Is the component presentation rather than domain orchestration?
<!-- rule: REACT-055 -->
2. Does one owner hold each state fact?
<!-- rule: REACT-056 -->
3. Are props immutable and callbacks intent-oriented?
<!-- rule: REACT-057 -->
4. Is render side-effect free?
<!-- rule: REACT-058 -->
5. Does setup have exact, idempotent cleanup?
<!-- rule: REACT-059 -->
6. Are semantic regions and controls explicit in JSX?
<!-- rule: REACT-060 -->
7. Is styling owned locally without coupling to another feature?
<!-- rule: REACT-061 -->
8. Does the test assert behavior rather than implementation detail?
