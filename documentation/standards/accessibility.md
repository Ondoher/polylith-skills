# Accessibility

## Purpose And Scope

<!-- rule: ACCESSIBILITY-001 -->
Accessibility support is enabled independently in each application's root context. It is part of that app's component and interaction contract from the start, but this scaffold does not by itself claim WCAG conformance. MUI provides a useful baseline for standard controls; application code remains responsible for page structure, custom interactions, dynamic status, focus transitions, and non-visual meaning.

<!-- rule: ACCESSIBILITY-002 -->
The governing order is:

<!-- rule: ACCESSIBILITY-003 -->
1. use native semantic HTML and browser behavior;
<!-- rule: ACCESSIBILITY-004 -->
2. use the documented MUI behavior and props for the chosen control;
<!-- rule: ACCESSIBILITY-005 -->
3. add authored ARIA only when the first two do not express a necessary relationship, state, or announcement.

<!-- rule: ACCESSIBILITY-006 -->
Do not add a role that duplicates or conflicts with a native element. Do not attempt to detect whether a screen reader is running; make ordinary application behavior accessible.

## Global Context And Component Defaults

<!-- rule: ACCESSIBILITY-007 -->
`src/<app>/common/AppContext.js` owns `accessibilityEnabled`. Semantic markup, standard properties, MUI keyboard behavior, and visible labels remain required regardless of the flag. The flag controls optional authored accessibility behavior such as additional descriptions or live announcements.

<!-- rule: ACCESSIBILITY-008 -->
Base components always retain accessibility capability. With accessibility disabled they avoid optional authored ARIA, but they do not become semantically degraded controls. With accessibility enabled they add only the relationships the component contract requires.

## Semantic Structure

<!-- rule: ACCESSIBILITY-009 -->
- Use real `button`, `input`, `select`, `label`, `fieldset`, `legend`, heading, list, table, `nav`, `main`, `header`, and dialog primitives where they match the interaction.
<!-- rule: ACCESSIBILITY-010 -->
- Give every form control a visible label or a deliberate accessible name.
<!-- rule: ACCESSIBILITY-011 -->
- Use `fieldset` and `legend` when one label or helper message describes a group of controls.
<!-- rule: ACCESSIBILITY-012 -->
- Maintain a useful heading hierarchy and landmarks so the page remains navigable outside the tab order.
<!-- rule: ACCESSIBILITY-013 -->
- Use an `img` with alternative text when an image is content. Hide a decorative image only when it conveys no information.
<!-- rule: ACCESSIBILITY-014 -->
- A custom canvas, SVG, visualization, or embed that communicates meaning needs a concise accessible name or nearby textual summary. Visual-only children may be hidden only when the equivalent is supplied elsewhere.
<!-- rule: ACCESSIBILITY-015 -->
- Keep visible text, accessible names, descriptions, helper text, and validation messages sourced together so they do not drift during localization.

## Keyboard And Focus

<!-- rule: ACCESSIBILITY-016 -->
Ordinary actions must be reachable and operable with a keyboard. Preserve native tab order and visible focus indicators. Do not add positive `tabIndex` values to manually reorder a page.

<!-- rule: ACCESSIBILITY-017 -->
Controls or help revealed on hover must also be revealed on focus or `:focus-within`. Do not make a hover-only action the sole editing path. Use a real button instead of a clickable generic element; if a custom widget is unavoidable, follow the relevant WAI-ARIA Authoring Practices keyboard model.

<!-- rule: ACCESSIBILITY-018 -->
Dialogs and other focus-moving surfaces require explicit review:

<!-- rule: ACCESSIBILITY-019 -->
- opening moves focus into a meaningful element;
<!-- rule: ACCESSIBILITY-020 -->
- modal focus remains contained by the MUI dialog primitive;
<!-- rule: ACCESSIBILITY-021 -->
- Escape and close controls follow the component contract;
<!-- rule: ACCESSIBILITY-022 -->
- closing restores focus to the invoking element when it still exists;
<!-- rule: ACCESSIBILITY-023 -->
- reset or rerender behavior does not unexpectedly steal focus;
<!-- rule: ACCESSIBILITY-024 -->
- every icon-only action has an accessible name.

<!-- rule: ACCESSIBILITY-025 -->
For an unavailable action that must remain discoverable so its explanation can be read, prefer a focusable control exposing `aria-disabled="true"` and block activation in component logic. Use native `disabled` when discoverability is not required. Never present an action as unavailable only through color or pointer behavior.

## Names, Descriptions, Errors, And Status

<!-- rule: ACCESSIBILITY-026 -->
Prefer visible labels associated through native/MUI APIs. Add `aria-label` only when there is no suitable visible label. Use `aria-labelledby` when visible content should name a region, group, or dialog, and `aria-describedby` when helper or explanatory content should describe it.

<!-- rule: ACCESSIBILITY-027 -->
Validation state must be both visible and programmatically associated with the owning control or group. Do not attach one group-level error to an arbitrary child field. Base helper and form-message components own stable ids and relationships so controls can identify descriptions and errors without duplicating wiring.

<!-- rule: ACCESSIBILITY-028 -->
Important asynchronous changes that are otherwise difficult to perceive may use a polite status announcement. Urgent errors may use an assertive alert only when interruption is justified. Avoid announcing ordinary rerenders or duplicating content already reached through focus.

## Visual And Motion Guidance

<!-- rule: ACCESSIBILITY-029 -->
Use WCAG 2.2 contrast values as the baseline comparison:

<!-- rule: ACCESSIBILITY-030 -->
- normal text: at least `4.5:1`;
<!-- rule: ACCESSIBILITY-031 -->
- large text: at least `3:1`;
<!-- rule: ACCESSIBILITY-032 -->
- meaningful non-text controls, boundaries, and state indicators: at least `3:1` against adjacent colors.

<!-- rule: ACCESSIBILITY-033 -->
Color must not be the only carrier of selection, validity, warning, progress, or other meaningful state. Add a border, icon, marker, pattern, label, or value difference. Allow labels and controls to expand rather than assuming English string length. Respect reduced-motion preferences for nonessential animation.

## MUI And Custom Components

<!-- rule: ACCESSIBILITY-034 -->
MUI is preferred for buttons, menus, dialogs, form fields, tabs, drawers, toolbar controls, and other standard widgets because it supplies established semantics and keyboard mechanics. Configure MUI through its supported label, slot, input, and state APIs; do not rely on a custom prop name reaching the actual interactive DOM node.

<!-- rule: ACCESSIBILITY-035 -->
MUI does not solve application landmarks, page heading hierarchy, custom rendered objects, canvas/SVG meaning, cross-surface focus movement, or application-specific announcements. Those remain owned by the feature and must be documented when introduced.

<!-- rule: ACCESSIBILITY-036 -->
When evaluating a third-party component, prefer documented keyboard support, semantic DOM, stable labeling hooks, controllable focus, and a way to provide non-visual descriptions. A visually capable component is not sufficient when its meaning cannot be exposed.

## Testing And Manual Checks

<!-- rule: ACCESSIBILITY-037 -->
Automated component tests cover observable semantics and behavior, including applicable:

<!-- rule: ACCESSIBILITY-038 -->
- accessible names and visible label association;
<!-- rule: ACCESSIBILITY-039 -->
- helper/error relationships and grouped-control semantics;
<!-- rule: ACCESSIBILITY-040 -->
- keyboard activation and focus restoration;
<!-- rule: ACCESSIBILITY-041 -->
- focusable unavailable actions and blocked activation;
<!-- rule: ACCESSIBILITY-042 -->
- announcement text and priority;
<!-- rule: ACCESSIBILITY-043 -->
- accessibility mode on and off;
<!-- rule: ACCESSIBILITY-044 -->
- exact ARIA forwarding to the interactive element rather than a wrapper;
<!-- rule: ACCESSIBILITY-045 -->
- cleanup of document listeners, timers, portals, and focus state.

<!-- rule: ACCESSIBILITY-046 -->
Automated tests do not replace keyboard and assistive-technology review. For a stable user-facing flow, walk it with keyboard only, inspect the browser accessibility tree, and spot-check NVDA with Chrome or Firefox plus VoiceOver with Safari when those environments are available. Record any deferred custom-widget or screen-reader issue in the owning feature topic.

## Component Author Checklist

<!-- rule: ACCESSIBILITY-047 -->
For each new user-facing component, answer:

<!-- rule: ACCESSIBILITY-048 -->
1. What semantic element or established widget pattern owns it?
<!-- rule: ACCESSIBILITY-049 -->
2. What is its visible label and accessible name?
<!-- rule: ACCESSIBILITY-050 -->
3. Can its ordinary action be completed from a keyboard?
<!-- rule: ACCESSIBILITY-051 -->
4. Where does focus move when it opens, closes, disables, or updates?
<!-- rule: ACCESSIBILITY-052 -->
5. How are helper text, validation, and asynchronous status perceived?
<!-- rule: ACCESSIBILITY-053 -->
6. Is any meaningful state conveyed only by color, animation, or pointer position?
<!-- rule: ACCESSIBILITY-054 -->
7. Does localized text expansion preserve the layout and relationships?
