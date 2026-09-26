# Milestone 3: product and UX source inventory

This is the first reviewable output for milestone 3. It inventories the
current canonical contracts against the accepted Alexa outline, without
choosing document or page organization. Alexa is a diagnostic example, not a
source of reusable schema vocabulary or decomposition defaults. The proposed
replacement contract is in [the schema proposal](m3-schema-proposal.md).

## Current contracts and bound trial

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

The accepted Alexa outline is bound to PRD context
`prd-context-6623432c4683`, snapshot 32. Its source index has 132 eligible
references, placed once in 73 outline groups. The bound product model has one
purpose, one user, 15 capabilities, four gaps, and 21 source claims. The bound
UX payload has four features, four use cases, four surfaces, 12 components,
19 actions, 15 interaction frames, eight nested use-case steps, 13 nested
alternatives, and four open questions. Two proposed UI scenes depict part of
the export flow. These counts describe the trial, not target cardinalities.

## Addressability and missing links

| Semantic unit | Current address and evidence | Contract gap |
| --- | --- | --- |
| Product purpose, user, capability, gap | Stable `product:<id>` references, source claims, record index, and revision lineage. | A capability can bundle several normative statements; the individual statement lacks an ID and lifecycle. |
| Product goal, requirement, rule, constraint | Usually part of purpose, capability description/outcome, or gap prose. | No independent record catalog or typed links among goal, capability, requirement, rule, and UX realization. |
| UX use case | Stable ID in a flat list; feature and action references. | No declared relation to another use case or exact governing product record. |
| UX step and alternative | Each has an ID inside a use case; the outline index exposes a positional JSON pointer and `parentRef`. | The source format has no reusable typed address or explicit branch/sequence graph; array position and prose carry meaning. |
| UX action, feedback, recovery | Actions have top-level IDs. Nested feedback and recovery have IDs. | Feedback/recovery cannot be independently linked, shared, or impact-traced through a stable catalog. |
| UX state, dialog, shared component | A state is a string scoped to a surface. Dialogs are first-class frames; components are first-class records. | State identity depends on context; substantial component behavior may be undifferentiated strings. A frame or component can exist without a link to the precise use-case branch it supports. |
| UI scene and comp | Scenes name a UX frame, surface, state, and use cases; scene nodes bind affordances to UX actions. | The scene does not explicitly identify every semantic step, decision, rule, or state it depicts. A proposed scene is evidence, not a published comp. |

Alexa makes the granularity issue concrete. `product:clip-library` contains
the ordinary-editing rule, explicit update eligibility, impact explanation,
atomic propagation, local-override preservation, and cancel/failure behavior
in one 546-character description. All are supported by
`claim-clip-library`, but none has its own product record. The
`product:video-export` description similarly combines saved-video eligibility,
MP4 defaults, per-attempt destination validation and replacement consent,
progress, cancellation, workspace persistence, retry behavior, and output
correctness. Splitting those meanings must retain their shared claim provenance
and cannot silently create new product policy.

The `export-video` UX use case has two nested steps and four alternatives.
The alternative `export-existing` bundles Replace, Choose Another Location,
Cancel, a nested chooser, and fresh consent on later attempts in its response
and recovery strings. The `clip-operations` component has four
`behaviorRequirements` strings covering distinct eligibility, confirmation,
commit, and failure behavior. UX revision 5 added frames for some export
branches, yet no typed edge connects each branch to its exact frame and scene.
The outline's child references make the current publication more readable;
they do not repair the canonical source relationships.

The UX feature's `sourceRefs` cite the human description broadly. They do not
identify which product capability or individual rule governs a use case,
action, or state. Matching names is unsafe, and a UI scene's frame link does
not prove that every requirement or branch has comp coverage. The four
product gaps remain unresolved decisions; missing UX detail and missing
trace links are separate deficiencies.

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
