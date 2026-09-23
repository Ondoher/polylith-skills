# Design-Language Output Format Alignment

Implemented 2026-09-17 after the owner's acceptance of the [document structure and component scope](design-language-content-research.md).

Schema 0.7 organizes the generated Markdown into Visual Direction, Typography, Colors And Theme, Spacing And Layout, Shape And Surfaces, Iconography, Basic Component Examples, Shared States, Decisions And Gaps, and final Open Questions. Foundation notes can remain explicitly unspecified. Component metrics are labeled as examples rather than silently becoming app-wide conventions.

The basic example now shows the password field with its embedded visibility button, omitting the helper and requirements list. The detailed password preview is independently optional and disabled in the current review document. Existing detailed source data and SVGs are preserved for reuse. New button, generic text-field/error and select specimens have not been implemented; their gaps are visible in the document and report.

The installed skill reference, read-only UI-role handoff and topic requirements have been updated. This is output-format alignment after Slice 5; the planned state slice remains outstanding.

## Verification

All 63 tests passed (57 previous plus six document-format tests). Coverage includes section order, honest missing coverage, simple-versus-detailed SVG contents, independent preview selection, in-place 0.6 migration preserving old SVGs/decisions/owner text, byte-stable refinement and conflict rejection. Skill metadata validation and UI-agent TOML parsing passed.

The existing review document migrated in place from revision 1/schema 0.6 to revision 2/schema 0.7. Its generated heading order and image links were inspected. The new basic field SVG was visually inspected in Chromium. Actual VS Code/Markdown preview and live named UI-agent evaluation remain pending.

The bounded source still retains the password definition even when previews are hidden; this does not implement arbitrary component-library selection. Foundation prose is currently proposed text or null, without new prose-acceptance targets. Existing typed design-value acceptance remains protected.
