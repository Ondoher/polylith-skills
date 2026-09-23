# UX To UI Pipeline Format


Status: greenfield structured handoff. UX, UI composition, and component design use schema 0.2. There is no schema 0.1 compatibility or migration path. Static HTML remains the review output; JSON remains the validated source.

## Authority Flow

The implemented pipeline is `product description -> canonical product model and specialty artifacts -> PRD context -> generate-prd HTML`. UX interaction architecture governs UI composition inside refinement. View implementation is a deferred downstream consumer, not an installed production workflow.

UX owns tasks, actions, canonical and alternate interactions, state, feedback, cancellation, recovery, interaction frames, region order, content, and affordances. UI owns visual hierarchy, geometry, design-language application, templates, responsive presentation, and accessibility detail. The renderer translates validated UI data mechanically. The future view coder will implement accepted UX and UI contracts.

UI cannot create behavior. A behavior-affecting proposal returns upstream as an open `uxChangeRequests` record. The request records affected scenes and interaction frames, existing actions when applicable, the requested change, and rationale. It does not authorize a new action or allow a UI node to remain unbound.

## UX 0.2 Inputs

The UI stage consumes the exact UX document ID and revision. Relevant collections are:

- `useCases`, including task priority, stable steps, and action references.
- `surfaces`, including states and `interactionFrameRefs`.
- `actions`, including outcome, canonical interaction, alternates, visibility, applicable states, feedback, cancellation, recovery, and pattern basis.
- `interactionFrames`, including one surface state, ordered regions, stable content IDs, stable affordance IDs, transitions, and focus intent.
- `patternResearch` and `pruningReview`, which explain unfamiliar conventions and the retained canonical task path.

The UI agent reads the whole bounded UX source. It must not infer behavior from a prior comp or from visual convention when the structured UX source differs.

## UI And Component 0.2 Bindings

Every scene includes:

- `surfaceRef` and one exact `interactionFrameRef`.
- `deferredInteractionNodeRefs`, containing affordance IDs only when a partial scene cannot yet represent them.
- Stable UI node IDs, source question references, completeness, viewport, theme, layout tree, and paired clean/annotated render requests.

Every template declares `interaction: "presentational" | "behavioral"`. Standard buttons, icon buttons, and text fields are behavioral. Every behavioral component node includes both:

- `interactionNodeRef`: an affordance ID from the scene's interaction frame.
- `actionRef`: the exact action referenced by that affordance.

Each affordance in the frame is bound exactly once or explicitly deferred. A node cannot both bind and defer an affordance. Complete scenes permit no deferrals. Presentation nodes cannot carry behavioral bindings. `uxRegionRef` resolves against a region in the bound interaction frame.

Component-design 0.2 uses the same binding rules. A focused component scene may remain partial and defer unrelated frame affordances. A complete focused scene represents all frame affordances relevant to that scene without adding component-local behavior.

For dialog, popover, or menu scenes, `transientBehavior` records focus order, initial-focus rationale, focus return, action grouping, cancellation, and content-driven height. If cancellation uses a visible command, the record names its UI `nodeRef`, UX `interactionNodeRef`, and UX `actionRef`; all three must match the node's binding.

## Rendering And Review

The parent validates before persistence, then renders one scene tree into clean and annotated HTML. A scene with an unresolved specialized placeholder remains a wireframe. It becomes a comp only after the missing component has a source-checked component design and exact template registration.

The render report records exact input identities, schema versions, hashes, renderer version, scene and template counts, placeholders, unresolved requirements, UX change requests, and deferred interaction nodes. Generated HTML is review material; editing it does not change the design source.

Structural validation proves source identity, reference integrity, exact interaction binding, completeness rules, safe output paths, and deterministic rendering. Qualitative UI review separately assesses hierarchy, density, typography, spacing, accessible presentation, content fit, and whether the visual design communicates the UX well.

## Research And Product Neutrality

Ordinary familiar controls can use established platform patterns directly. An unfamiliar, product-specific, or conventionally ambiguous component triggers bounded research before a new presentation is proposed. Prefer standards, platform guidance, official product documentation, and maintained project manuals. Record actual queries, sources, observations, variation, selected adaptation, rejected patterns, limits, and parent verification.

Shared prompts, schemas, validators, renderers, fixtures, and expected outputs remain product-neutral. A target product is a holdout input. Its domain terms, control inventory, and preferred arrangement cannot be copied into reusable rules. General findings may be promoted only after being stated independently of the product and checked against unrelated examples.

## Iteration

Each pass reads the current product description and exact structured sources as fresh input, preserves stable IDs and locked designs, and updates only affected records. Included working choices are accepted unless the human changes them. Locked records remain unchanged unless a current explicit user request names that locked scope.

The 0.2 contract is atomic: UX and UI source revisions move together when interaction architecture changes. No adapter silently converts an older scene or fills missing behavior.
