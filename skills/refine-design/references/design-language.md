# Design Language 0.14

Schema 0.14 is the only design-language input accepted by `refine-design`, and version 7 is the only review-layout input. Earlier and later versions fail before output writes. The complete product-neutral executable example is [extras-proposal.json](extras-proposal.json). Use it to learn the current object shape, then replace its synthetic content with decisions supported by the current product and UI assessment. Do not use an earlier proposal as a starting point.

## Scope

The design language owns application-wide visual foundations, ordinary components, and reusable interaction patterns:

- optional identity palette and supporting semantic theme roles;
- typography, spacing, density, shape, surface, elevation, and shared states;
- reusable component-internal icons;
- contained, outlined, text, and icon-button treatments;
- ordinary text fields and shared guidance/error presentation;
- a bounded checkbox-group composite and single-selection select; and
- explicit missing requirements and editable rendering defaults.

Product-specific surfaces, specialized components, workflow actions, and app-specific icons belong to product comps. Generic component examples demonstrate the design language without creating product requirements.

## Current-schema workflow

1. Read the complete product description, current schema 0.14 source when one exists, and relevant product-neutral UI guidance.
2. Ask the UI designer for one schema 0.14 proposal. A parent-authored fallback records `source.kind: "parent-assessment"`.
3. Normalize qualitative choices with [design-language-normalization.md](design-language-normalization.md). For an MUI app, apply [design-language-mui.md](design-language-mui.md) using the target version's verified defaults.
4. Validate the complete proposal before writing. Unknown, earlier, and later schema versions fail without creating or replacing artifacts.
5. Persist one current structured design source. Reuse stable IDs and preserve accepted or locked current decisions unless current owner authority permits a change.
6. Generate the current HTML review, repeat it for byte stability, and inspect representative output. Rendering never accepts a choice or resolves a missing requirement.

A partial brief still produces schema 0.14. Represent missing decisions in its current unresolved fields and disclosed defaults instead of selecting a smaller historical schema or copying unrelated fixture values.

## Acceptance and locks

Selected agent choices become accepted working design within UI authority when incorporated. A proposed alternative retained for comparison remains proposed. Only explicit current user direction naming a scope may create, alter, or remove a lock. An accepted record that consumes provisional defaults cannot be locked or treated as complete.

Derived colors should remain expressions of persisted base roles where the relationship is computable. Identity colors are optional and separate from the ordinary theme. For MUI applications, implementation uses MUI CSS theme variables; preview values do not authorize hardcoded application colors.

## Validation

Use `npm test` for the fast current-schema and policy gate. Use `npm run test:design` for the bounded current-design smoke after changing design-language, UX, UI, or component behavior. Use `npm run test:renderer` to exercise the exhaustive renderer matrix directly, `npm run test:design:full` for the design smoke plus that matrix, and reserve `npm run test:full` for deliberate release validation. Historical schema fixtures, migration tests, importers, downgrade logic, and dual-write output are outside this greenfield skill.
