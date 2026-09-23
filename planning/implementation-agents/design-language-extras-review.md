# Button Variants And Missing-Component Fallback Review

Schema 0.14 / renderer extras-1.0. Maintained fixture review revision 8.

Added outlined, text and icon-only buttons beside the existing contained treatment, across default, hover, pressed, focus, disabled and loading states. Shared dimensions, typography, derived theme colors and focus defaults feed the comparison. Icon geometry comes from the verified catalog; accessible naming and tooltip intent are explicit handoff data.

Missing UI-spec templates can use dimensioned labeled boxes without inventing component visuals or interactions. The example reserves 560 x 180px for a frame timeline. Its missing renderer requirement remains unspecified in JSON, Markdown and the result report. Placeholders cannot be accepted as finished components. Full comp assembly and future replacement migration remain deferred.

Verification: 101/101 full design-language tests passed (137.1 seconds), including five new tests covering state output, stable rerenders, dimensions/wrapping/escaping, overflow rejection, migration and owner-note preservation, invalid inputs without publication, edited-asset protection, acceptance dependencies and explicit missing-component records. Skill validation, UI designer TOML parsing and generated/new reference document links passed.

Headless Chrome screenshots of the comparison and placeholder were visually inspected: no clipped text or overlapping states. No interactive keyboard/tooltip/accessibility validation, VS Code preview or live UI-designer run was performed. Fixtures remain illustrative and do not accept Alexa design choices. These are MUI-oriented specimens, not exact browser component captures.

See [contract and primary references](../../skills/refine-design/references/design-language-extras.md). Remaining renderer coverage includes toggle buttons, embedded-field state variants and additional select variants; full comps remain a later stage.
