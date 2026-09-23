# Base Components

## Purpose And Boundary

<!-- rule: BASE-COMPONENTS-001 -->
The generated base layer supplies reusable MUI building blocks with consistent localization, accessibility, validation, and testing seams. `BaseXXXX` components are foundations for concrete product components, not a vocabulary that feature screens should assemble indefinitely.

<!-- rule: BASE-COMPONENTS-002 -->
If a base component is genuinely useful directly, promote or wrap it as a concrete shared component with a product-shaped API. Avoid feature wrappers that merely rename props without adding a stable contract.

## Inventory

<!-- rule: BASE-COMPONENTS-003 -->
`src/<app>/components` contains:

<!-- rule: BASE-COMPONENTS-004 -->
1. `BaseText`
<!-- rule: BASE-COMPONENTS-005 -->
2. `BaseTextInput`
<!-- rule: BASE-COMPONENTS-006 -->
3. `BaseSelect`
<!-- rule: BASE-COMPONENTS-007 -->
4. `BaseCheckbox`
<!-- rule: BASE-COMPONENTS-008 -->
5. `BaseRadioButtons`
<!-- rule: BASE-COMPONENTS-009 -->
6. `BaseButton`
<!-- rule: BASE-COMPONENTS-010 -->
7. `BaseHelperText`
<!-- rule: BASE-COMPONENTS-011 -->
8. `BaseFormMessage`
<!-- rule: BASE-COMPONENTS-012 -->
9. `BaseDialog`

<!-- rule: BASE-COMPONENTS-013 -->
Concrete components initially include:

<!-- rule: BASE-COMPONENTS-014 -->
- `Text`, built from `BaseText`;
<!-- rule: BASE-COMPONENTS-015 -->
- `TextInput`, built from `BaseTextInput`;
<!-- rule: BASE-COMPONENTS-016 -->
- `Select`, built from `BaseSelect`.

<!-- rule: BASE-COMPONENTS-017 -->
There is no generated tooltip because tooltip content and focus/hover behavior require a separate accessibility contract. There is no concrete `Button` yet; product button meaning and variants are deferred.

## Shared Text Resolution

<!-- rule: BASE-COMPONENTS-018 -->
Every base control that displays a label, description, option, helper, error, warning, title, or action uses the shared text-resolution boundary. Base components treat strings literally by default. Concrete components localize by default when localization is enabled. Explicit caller intent may override the default for user-authored or canonical literal text.

<!-- rule: BASE-COMPONENTS-019 -->
Missing localized text resolves to no text after logging through the localization service. Do not introduce local fallback behavior in a component. HTML is off by default and is supported only by the explicit text component contract.

## Accessibility Contract

<!-- rule: BASE-COMPONENTS-020 -->
Semantic and MUI behavior is always active. Optional authored ARIA is controlled by global context and explicit component props.

<!-- rule: BASE-COMPONENTS-021 -->
- Labels must reach the actual form control, not only a wrapper.
<!-- rule: BASE-COMPONENTS-022 -->
- Helper and error ids remain stable and are associated through supported MUI/native properties.
<!-- rule: BASE-COMPONENTS-023 -->
- Radio buttons use grouped `FormControl`, `FormLabel`, and `RadioGroup` semantics.
<!-- rule: BASE-COMPONENTS-024 -->
- Checkbox labels use the native/MUI label association.
<!-- rule: BASE-COMPONENTS-025 -->
- Invalid state is visible and programmatically exposed.
<!-- rule: BASE-COMPONENTS-026 -->
- Icon-only actions receive an accessible name when accessibility behavior is enabled.
<!-- rule: BASE-COMPONENTS-027 -->
- An unavailable action that must remain focusable uses the established `aria-disabled` contract and blocks activation.
<!-- rule: BASE-COMPONENTS-028 -->
- Dialog labels/descriptions reference real rendered ids; close restores the invoking focus when possible.

<!-- rule: BASE-COMPONENTS-029 -->
Do not create custom prop names unless the component explicitly maps them to the correct DOM/MUI property and tests prove the mapping.

## BaseDialog Contract

<!-- rule: BASE-COMPONENTS-030 -->
`BaseDialog` is a generic declarative dialog foundation, not a product workflow. It supports:

<!-- rule: BASE-COMPONENTS-031 -->
- localized or literal title and description;
<!-- rule: BASE-COMPONENTS-032 -->
- ordered action definitions;
<!-- rule: BASE-COMPONENTS-033 -->
- child-driven action state updates;
<!-- rule: BASE-COMPONENTS-034 -->
- disabled or unavailable action behavior;
<!-- rule: BASE-COMPONENTS-035 -->
- focus capture/restoration;
<!-- rule: BASE-COMPONENTS-036 -->
- optional status announcements;
<!-- rule: BASE-COMPONENTS-037 -->
- a reset token for deliberate state reinitialization;
<!-- rule: BASE-COMPONENTS-038 -->
- close/cancel/confirm callbacks without embedding feature decisions.

<!-- rule: BASE-COMPONENTS-039 -->
The dialog should not own persistence, server calls, feature state, or validation rules beyond presenting results supplied by its owner. Preserve MUI's modal, focus-trap, Escape, and portal behavior.

## Ownership And Extension Rules

<!-- rule: BASE-COMPONENTS-040 -->
- Keep base APIs generic and presentation-oriented.
<!-- rule: BASE-COMPONENTS-041 -->
- Keep feature/domain decisions in concrete components, controllers, or services.
<!-- rule: BASE-COMPONENTS-042 -->
- Prefer semantic/native behavior, then MUI behavior, then narrowly necessary ARIA.
<!-- rule: BASE-COMPONENTS-043 -->
- Treat props and callback payloads as immutable inputs/outputs.
<!-- rule: BASE-COMPONENTS-044 -->
- Use controlled state when a value participates in validation or submission.
<!-- rule: BASE-COMPONENTS-045 -->
- Keep component styling and focus/state CSS with the component.
<!-- rule: BASE-COMPONENTS-046 -->
- Move styles, tests, types, and support files together when promoting a component.
<!-- rule: BASE-COMPONENTS-047 -->
- Avoid premature abstraction based on similar markup alone.

<!-- rule: BASE-COMPONENTS-048 -->
Ambient component declarations live in `src/<app>/components/types`. Never place a same-named declaration beside a JSX component because editor navigation may prefer the declaration over the implementation. Runtime imports continue to name the `.jsx` implementation explicitly.

## Test Harness

<!-- rule: BASE-COMPONENTS-049 -->
Shared support lives in `src/<app>/testing`. The harness provides:

<!-- rule: BASE-COMPONENTS-050 -->
- mounting under the real app context shape;
<!-- rule: BASE-COMPONENTS-051 -->
- registry and service injection;
<!-- rule: BASE-COMPONENTS-052 -->
- configurable locale, localization, and accessibility modes;
<!-- rule: BASE-COMPONENTS-053 -->
- React `act` wrapping;
<!-- rule: BASE-COMPONENTS-054 -->
- rerendering through the same root;
<!-- rule: BASE-COMPONENTS-055 -->
- DOM input, click, and keyboard helpers;
<!-- rule: BASE-COMPONENTS-056 -->
- portal-aware document queries for dialogs;
<!-- rule: BASE-COMPONENTS-057 -->
- console warning/error capture;
<!-- rule: BASE-COMPONENTS-058 -->
- reliable unmount and cleanup.

<!-- rule: BASE-COMPONENTS-059 -->
The harness has its own tests. Keep it small and aligned with production provider/lifecycle behavior; do not create a second application architecture solely for tests.

## Behavioral Test Expectations

<!-- rule: BASE-COMPONENTS-060 -->
Component specs live in `src/<app>/components/_tests`. Exercise every generated public contract, including applicable:

<!-- rule: BASE-COMPONENTS-061 -->
- literal and localized defaults and explicit overrides;
<!-- rule: BASE-COMPONENTS-062 -->
- labels, descriptions, options, helper, warning, and error text;
<!-- rule: BASE-COMPONENTS-063 -->
- input values, changes, checked/selected state, and callback payloads;
<!-- rule: BASE-COMPONENTS-064 -->
- required, invalid, disabled, and focusable-unavailable behavior;
<!-- rule: BASE-COMPONENTS-065 -->
- exact accessibility relationships with mode on and off;
<!-- rule: BASE-COMPONENTS-066 -->
- dialog ordering, state updates, focus, reset, announcement, confirm, cancel, and close behavior;
<!-- rule: BASE-COMPONENTS-067 -->
- invalid public inputs and diagnostic behavior;
<!-- rule: BASE-COMPONENTS-068 -->
- cleanup after rerender and unmount.

<!-- rule: BASE-COMPONENTS-069 -->
These are behavioral tests, not aggregate smoke tests. When coverage reporting is enabled, the tests should fully exercise the generated components; the project does not enforce a global coverage threshold.

## Verification

<!-- rule: BASE-COMPONENTS-070 -->
```text
npm test
npm run coverage
```

