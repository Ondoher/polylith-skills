# Alexa Polylith Architecture Assessment

Date: 2026-09-16. Historical output from the owner-requested isolated Polylith architect evaluation. The owner deliberately left the product/system questions unanswered for iterative refinement. All new structural recommendations remain proposals. This is not an orchestration test, implementation assignment or accepted product architecture. See the [role review](polylith-architect-review.md#live-alexa-evaluation) for evidence and limits.

The captured report follows with file references made portable.

The named `polylith-architect` role spawned successfully. Its complete report follows with file references made portable.

**Alexa can extend its existing shell and editor feature, but needs new domain and media contracts.** Unanswered product and system questions block particular contracts, not the whole structural assessment.

Accepted direction comes from the design and prompt: JSON projects, the complete composition hierarchy, frame-accurate selection, composition playback without export, separate MP4 output, intended WebCodecs processing, and selected Electron hosting. All specialist recommendations remain proposals. Source uses the manifest’s `browser` standards; build metadata uses `base`; there are no overlays.

The editor controller currently registers and mounts a heading-only page. Build metadata includes shell and editor features; package.json has no Electron dependency. Existing scaffolding establishes integration seams, not media behavior.

Proposed names and boundaries below are provisional:

| Responsibility | Proposed owner and rationale |
|---|---|
| Navigation and page mounting | Extend existing `features/app` and `app-pages`. The shell consumes page contributions without importing editing implementations. |
| Editing workflow | Extend `features/editor`: controller owns commands, session context and pending operations; feature model owns validated editing drafts; view projects state; React owns local gestures, focus and measurement. |
| Project/composition authority | One project capability owns accepted source references, clips, assemblies, constructed videos and playlists, including serialization and validated mutations. Private collaborators can separate substantial rules without creating services per noun. A model-service can expose this capability without a forwarding facade. |
| Media execution | A proposed media capability owns source inspection, frame resolution, decoding resources and playback/export execution. Container handling, indexing, scheduling and muxing start as private collaborators unless independent consumers justify public boundaries. |
| Desktop access | An application adapter consumes the eventually accepted host interface. Existing `io` is HTTP transport and supplies no filesystem guarantee. Process placement remains upstream system work. |

Project authority is logically shared across editing, playback and output. Physical placement should follow actual feature consumers: retain editor-specific drafts privately; promote their domain contracts only when multiple live features require them. Separate playback/output features are candidates only if independently selectable workflows justify them. The hierarchy does not require five features.

The [view proposal](view-agent-alexa-assessment.md) supports private player, timeline and selection components. View leads reusable-control judgments; cross-feature promotion moves associated assets, declarations and tests together. Anticipated general UI reuse can justify shared components under [architecture rules](../../documentation/standards/architecture.md); domain-model promotion has the stricter live-consumer threshold.

Application services use Alexa’s application registry. Controllers call project/media capabilities; project persistence and media readers consume the desktop adapter. Dependencies remain with consumers. Required dependency absence invalidates the affected composition rather than implying successful degraded operation. Optional facilities, such as a proposed persistent thumbnail cache, need explicit absence behavior.

Use capability calls for seek, mutation, save and export; `app-pages` contributions for independently included pages; events for accepted changes and observed progress. No generic contribution hub is warranted. Installation services require explicit registry attachment and documented scope; neither Electron IPC nor installation-registry availability in the renderer is established.

The model report leads domain contracts; the controller report leads session coordination. Their reconciliation requires common project/source/frame identity, position units, context freshness, failure outcomes and resource ownership. Revision counters remain one possible mechanism. Resolve affected consumers before writing ambient data contracts and adjacent exported service interfaces under [types](../../documentation/standards/types.md) and [JSDoc](../../documentation/standards/jsdoc.md).

For the representative trace: source selection reaches the editor controller through its view; the controller requests media resolution and seek. Media returns a confirmed frame identity associated with the originating context. A boundary intention updates the model-owned draft; an accepted retention operation creates project-owned clip facts. Assemblies reference clips, constructed videos reference assemblies, and playlists contain constructed videos under still-undecided membership semantics. Playback and export consume consistently interpreted composition input, with separate execution policies. Zoom changes presentation coverage without changing accepted boundaries. Superseded results are invalidated; cancellation separately requests work cessation. Neither guarantees rollback.

Material proposal conflicts resolve as follows:

- The system report’s main/renderer/worker split, staged writes and snapshot policies remain conditional.
- The UX report’s clip journey is an assessment trace, not first-implementation selection.
- Google Fonts preference supersedes the UI report’s system-font suggestion; no visual foundation is approved.
- Installed registry behavior preserves asynchronous local `start()` and serial dependency-driven `ready()`. Unawaited ready promises alone are not a defect. There is no service dependency manager or stop workflow.

Singleton lifetime does not cover session resources. Controllers release acquired subscriptions and request handles; media owners release decoders, frames and buffers; presentation releases its own observers and borrowed-resource references according to explicit transfer contracts. Background-export survival needs an accepted host owner.

Conditional work slices are contract examples, media/host feasibility evidence, project authority, editor coordination/presentation, then composition playback/output. Contract analysis can proceed while policy questions remain open. Shared declarations, app activation/build metadata and test assembly need coordinated single-writer ownership when scheduled. Feature assets/tests stay colocated. Loadables require distinct-workflow justification and installed-loader verification; none is established here.

Prioritized unanswered questions are:

1. Boundary inclusion, single-frame meaning and source/frame identity: enable consistent selection and composition timing.
2. Supported media/audio and Electron trust/resource boundaries: enable concrete media and desktop contracts.
3. Reference reuse, ordering and deletion semantics: enable composition mutations.
4. Source ownership, saving, replacement, interruption and retry policy: enable persistence and recovery.
5. First implementation scope, interactions and visual direction: enable a bounded delivery plan.

Early review should examine one end-to-end contract trace before implementation expands. Verification needs include JSON/reference integrity, variable-timing boundaries, reversed seek completion, newer edits during saves, cancellation/completion races, resource release, real-registry wiring, and player/timeline accessibility. Current [testing rules](../../documentation/standards/testing.md) retain authority; older collaborator-construction guidance remains unresolved without a presumed workaround. Unit/service assessment was deferred; UI-test assessment is unavailable. No tests, builds, runtime validation or measurements ran; this report establishes neither orchestration readiness nor a compliance verdict.