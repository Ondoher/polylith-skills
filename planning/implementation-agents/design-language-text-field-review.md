# Ordinary Text Field And Message Pattern Review

Implemented the requested ordinary text-field slice in schema 0.11: label, supplied value, helper and error text in default, focused, disabled and error states at 280px and 400px. The shared field-message pattern owns type, helper/error color expressions, gap/inset/message spacing and retain/replace policy. Fields reference it and supply content. This documents a reusable presentation pattern, not an implementation-class decision or new validation service.

 Existing font measurement/outline rendering and theme expressions are reused. Focus consumes the brand-mapped primary role; errors use the MUI semantic error role with visible Error text. Messages wrap and extend the sheet; invalid geometry or unwrappable words fail before publication.

components.md now has Ordinary Text Field and Field Messages: Helper And Error sections. The fixture proposes retaining helper instructions before adding a corrective error. It leaves the 4px message gap as an explicit default. The duplicate-name example is supplied illustrative content, not an accepted Alexa constraint. Validation and announcement timing remain UX decisions. Stable description IDs, aria-describedby and aria-invalid are handoff guidance, not behaviors implemented by the SVG.

Pattern and field acceptance require resolved consumed defaults and explicit owner targets. Accepted fields protect their shared message pattern as a dependency. Migration preserves IDs, histories, owner notes in both documents, and earlier SVGs.

Verification: all 88 renderer tests passed, including six new field tests for states, pattern documentation, wrapping/retain-versus-replace layout, defaults propagation, stable rerender, migration, shared acceptance protection, invalid inputs and artifact conflicts. Skill validation and UI-role TOML parsing passed; generated Markdown links resolve. Visually inspected both widths in headless Chrome: labels/values/messages fit; helper wraps at 280px and remains one line at 400px; error is readable separately with retained helper. No actual VS Code preview, live specialist assessment, runtime input/validation or accessibility certification was performed.

Remaining scope: select/dropdown specimens, embedded-button field states, empty/multiline/hover/combined field states, extra button variants, unsupported-component placeholders and specialized comps. Ordinary field/helper/error is now supported; prior reports calling it a gap are historical.
