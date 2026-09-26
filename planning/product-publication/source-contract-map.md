# Product publication source contract map

This map describes the reusable input to the `document-structure` agent's
information outline. The agent chooses groupings from a validated PRD context;
neither `refine-design` nor the source-index helper chooses documents, pages, or
the outline hierarchy. Product examples remain in their own repositories.

## Authority and eligible units

| Source | Authority and outline use |
| --- | --- |
| Product model purpose, users, capabilities, and gaps | Authority for required behavior, scope, and unresolved product questions. Each record has a stable `product:<id>` reference and source-claim lineage. A capability description or outcome may still bundle several independently meaningful facts. |
| UX application, features, use cases, surfaces, components, actions, frames, research, and questions | Authority for accepted interaction design and its stated limits. Each eligible unit has an exact `artifact:<id>#/<pointer>` reference. Application shell, navigation, regions, and areas remain separately addressable. |
| UX use-case steps and alternatives | Separately addressable children of a use case. The parent source excludes these arrays; each child carries `parentRef` and its exact JSON-pointer reference. This permits nested interaction depth without making a document outline part of the UX artifact. |
| Design language and review layout | Visual foundations and supporting evidence. They do not imply a separate document or page. |
| UI scenes and component designs, when current and selected | Visual and component evidence tied to exact UX frames, actions, and states. The agent can place a substantial shared component once and link its uses. Absence of a scene is a visible comp gap, never permission to infer one. |
| Unavailable artifacts | Context `exclusions` disclose identity, outcome, and reason only. Excluded payloads are not eligible outline sources and must not be reconstructed. |

The index contains source-bound `value`, `label`, `kind`, and `relations` for
each eligible reference. A split parent value omits its separately indexed
children, so placing each reference once also avoids duplicating those facts.
This child split is a current consumer adaptation, not the intended final UX
source shape. The canonical UX artifact already has a flat `useCases` list,
but steps and alternatives are embedded there, and component behavior may be
bundled into prose strings. The product model has stable identities and exact
source-claim coverage, but capability narratives can still bundle requirements
and rules. The [milestone 3 proposal](m3-schema-proposal.md) defines which
independently meaningful product and UX facts need their own stable records
and typed links. Until that contract is implemented, index
coverage must not be mistaken for composability of either canonical source.
`parentRef` expresses structural ownership; extracted `relations` expose typed
`*Ref` and `*Refs` fields and resolve to another indexed record where possible.
An unresolved `targetRef` is an explicit relationship gap, not a license to
match similar labels. Recompute the index from the exact immutable context;
the outline binds its context ID and source-index SHA-256.

Relationship resolution respects the owner of each reference. UI scene
`interactionFrameRef`, `surfaceRef`, use-case, and action links target UX
records even when the UI scene and UX frame share an ID. UI render requests
still target UI scenes. A proposed UI scene or render request is composition
evidence; only verified publication resources establish that a comp was
published. The outline must disclose partial UI coverage and distinguish the
two states.

## Coverage and editorial limits

The outline must place every eligible reference exactly once. It may nest
substeps, dialogs, and substantial component detail beneath an owning UX or
give a shared subject one canonical group with contextual links. Group titles,
summaries, and notes may explain relationships already supported by source
values; they cannot add product behavior. A dialog or component section does
not determine an HTML page or document boundary. A summary can link to an
existing canonical group by its stable ID; the Markdown review view preserves
that internal link and emits an explicit anchor.

Numerical coverage alone is insufficient. Review whether accepted steps,
alternatives, cancellation, recovery, states, and supplied comps are visible at
useful depth. Distinguish three cases:

1. **Hidden source detail:** an exact eligible value contains the fact, but the
   outline suppresses it. Revise the outline or split a genuinely independent
   source field into an exact nested reference.
2. **Incomplete derived UX or UI:** the product source accepts the behavior,
   but the current UX or comp artifact does not express it. Route a bounded
   revision through `refine-design`, then regenerate the PRD context and index.
3. **Unresolved product decision:** neither the description nor an accepted
   planning decision defines the behavior. Keep a question and affected scope
   visible; do not turn an agent's editorial inference into a product decision.

Current UX features cite their human-owned source document through
`sourceRefs`, but that citation alone does not identify the particular product
requirement or rule governing each feature. `featureRef`, `useCaseRefs`, `surfaceRefs`,
`taskRefs`, `actionRef`, `parentFrameRef`, `triggerActionRef`, and component/frame
references provide usable links within UX. A cross-model product-to-UX
trace must be supplied explicitly by a future source contract or remain a
reported trace gap; the agent must not infer it from matching names or broad
artifact coverage.
The flat use-case catalog also lacks an explicit relationship between distinct
use cases; shared actions and frames can imply overlap, but they do not state
the intended relation or its direction.

The future joint contract should permit traversal from a product requirement or
rule to the use cases that realize it, and from any use case to related cases,
ordered interaction elements, shared behavior, governing product authority,
and exact UI depictions. Product facts keep their human-source coverage,
lineage, status, and decisions; UX facts keep their interaction authority.
Those are semantic links; they do not prescribe a publication
outline, document count, or page hierarchy. Implementation planning and coding
should consume these same identities and links to bound work, inspect impact,
and find behavior to realize or verify. Neither artifact assigns code
ownership, technology, files, or implementation order.

## Checks for the first pass

The outline-only tests cover a sparse garden-log context and a developed,
unrelated synthetic UX context. The developed case checks exact parent/child
references and complete source placement; the sparse case checks product
questions without assuming UX or comps exist. The consuming product trial
checks that the same rules retain accepted complex interaction detail and
identify unavailable UX or comps without encoding product-specific names in
the shared helper or agent contract. Broader review and negative-case expansion
belong after the first publication pass.
