# Separate Component Reference Review

Implemented the owner-approved split into design-language.md foundations and a sibling components.md compact standard-component reference. Both consume the same saved JSON and existing SVG assets. Schema 0.10 adds no new design fields.

The component reference contains the six-state command-button sheet, field-with-embedded-button examples, relevant metrics/defaults, role references, usage limitations and coverage gaps. Optional password detail moves there when selected. Shared foundation decisions and open questions remain centralized in the design-language document, with links in both directions. Specialized component comps remain separate future work.

Migrated the existing review folder to revision 4, retaining its one-color modmod identity and MUI baseline. No design values or SVGs changed.

Both generated documents preserve owner notes outside their markers. Unowned, edited or missing companion files block publication before source/other document changes. The existing staged rollback path includes both Markdown outputs; crash-proof recovery and concurrent writers remain unsupported. Downgrade is blocked and unchanged rerenders preserve bytes/revision.

Verification: 78 existing tests passed in the full run; four new companion tests all passed after correcting one assertion to account for existing Markdown escaping (no implementation fix was required). The new checks cover shared links/assets, compact separation, migration/history/note preservation, rerender stability, preview selection and conflict protection. Skill validation and UI-role TOML parsing passed. Inspected both generated Markdown documents and their heading structure; SVGs reuse the previously visually inspected assets. No VS Code preview or live specialist evaluation was performed.
