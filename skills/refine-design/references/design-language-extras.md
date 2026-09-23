# Current Button Variants

This reference describes the button-variant portion of current design-language schema 0.14. The complete machine-readable example is [extras-proposal.json](extras-proposal.json).

The `mui-button-variants-v1` record contains `id`, `template`, `iconId`, `accessibleLabel`, `tooltip`, `states`, and `status`. States cover outlined, text, and icon treatments in default, hover, pressed, focus, disabled, and loading conditions. Use persisted semantic roles or bounded sRGB mixes instead of unrelated colors for derivable states. Text and icon variants do not paint borders.

Reuse the ordinary button's typography, height, padding, radius, focus treatment, and measured text rules. The icon button uses the shared target height and verified bundled geometry. Loading presentation retains the accessible name. Tooltip text does not replace accessible naming, and hover is never the sole means of discovering required information.

Acceptance target `variants:<id>` requires a recorded agent selection or current owner choice. Consumed metrics, typography, colors, icon identity, and naming remain protected dependencies. Unresolved inputs prevent acceptance.

Specialized components and missing reusable components belong in product comps. Schema 0.14 does not carry placeholder records or a compatibility field for former missing-component formats.
