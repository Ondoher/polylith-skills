# Milestone 3: product and UX source inventory

This historical inventory identifies product-neutral source-contract gaps without choosing document or page organization. Application-bound measurements and examples are maintained in the owning project. The proposed replacement is in [the schema proposal](m3-schema-proposal.md).

## Historical contracts

The product model uses [schema 1.0][product-schema] and
[its invariants][product-contract].
Its purpose, user, capability, and gap records have stable IDs, status, owner,
consumer domains, and source-claim provenance. Source claims partition the
human description's lines exactly once, and model revisions preserve identity,
lineage, material digests, locks, and immutable ancestors. These are strengths
to retain. A capability's `description` and `outcome` can still contain several
separate requirements, rules, or constraints without separate semantic IDs.

The UX artifact uses [schema 0.2][ux-schema] and
[its behavior contract][ux-contract].
Features, use cases, surfaces, components, actions, frames, research, and
questions are top-level records with IDs. Use cases are already a flat catalog.
Their steps and alternatives, action feedback and recovery, surface states,
and component behavior remain nested. Some nested records have IDs; those IDs
cannot yet be addressed by stable, typed cross-artifact references. Other
details, notably component behavior requirements, are plain strings.

## Addressability and missing links

| Semantic unit                               | Current address and evidence                                                                                 | Contract gap                                                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product purpose, user, capability, gap      | Stable `product:<id>` references, source claims, record index, and revision lineage.                         | A capability can bundle several normative statements; the individual statement lacks an ID and lifecycle.                                                                                    |
| Product goal, requirement, rule, constraint | Usually part of purpose, capability description/outcome, or gap prose.                                       | No independent record catalog or typed links among goal, capability, requirement, rule, and UX realization.                                                                                  |
| UX use case                                 | Stable ID in a flat list; feature and action references.                                                     | No declared relation to another use case or exact governing product record.                                                                                                                  |
| UX step and alternative                     | Each has an ID inside a use case; the outline index exposes a positional JSON pointer and `parentRef`.       | The source format has no reusable typed address or explicit branch/sequence graph; array position and prose carry meaning.                                                                   |
| UX action, feedback, recovery               | Actions have top-level IDs. Nested feedback and recovery have IDs.                                           | Feedback/recovery cannot be independently linked, shared, or impact-traced through a stable catalog.                                                                                         |
| UX state, dialog, shared component          | A state is a string scoped to a surface. Dialogs are first-class frames; components are first-class records. | State identity depends on context; substantial component behavior may be undifferentiated strings. A frame or component can exist without a link to the precise use-case branch it supports. |
| UI scene and comp                           | Scenes name a UX frame, surface, state, and use cases; scene nodes bind affordances to UX actions.           | The scene does not explicitly identify every semantic step, decision, rule, or state it depicts. A proposed scene is evidence, not a published comp.                                         |

## Decisions this inventory supports

The proposed contract should retain every existing product source claim and
record identity, introduce independently meaningful product facts, and give
UX interaction elements stable, typed addresses. Product authority should
flow into UX through explicit links, then into UI through exact depiction
links. Reverse navigation can be derived from those links. Missing product
decisions, missing UX detail, missing UI evidence, and missing relations need
separate diagnostics. The contract should remain useful for documentation,
implementation planning, coding, and review without embedding publication
headings, page order, code ownership, or product-specific names.

[product-schema]: ../../skills/refine-design/references/product-model-schema-1.0.json
[product-contract]: ../../skills/refine-design/references/product-model.md
[ux-schema]: ../../skills/refine-design/references/ux-schema-0.2.json
[ux-contract]: ../../skills/refine-design/references/ux-design.md
