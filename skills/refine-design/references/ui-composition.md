# UI Composition And HTML Comps

For initial or substantial composition, use [the single-pass route](single-pass-design.md)
and request `single-pass-ui`. Its bounded context/part/scene records replace the
whole-schema agent response below; the parent expands them into this unchanged
consumer contract. Reuse foundations and scene parts, read shared inputs once and
consume bounded UX references after exact review. Do not author a second expanded copy.

Schema 0.4 is the structured handoff between accepted UX, the design language, the UI designer, and deterministic HTML comp rendering. It binds every scene to an exact accepted interaction frame, binds behavioral nodes to UX actions, preserves stable node identities, and renders one clean and one annotated page from the same scene tree.

## Text Economy

Visible UI text has an attention cost. Treat text fields, readouts, captions and
explanatory prose as noise by default unless presenting or editing that text is
the point of the task. Titles, descriptions, labels and other meaningful text
content are appropriate uses. Use editable text fields where text entry or
editing is required, rather than as a generic way to display or explain state.

Do not add text to explain information already conveyed by the content, control,
state treatment or surrounding context, or information that can be communicated
more concisely. Use recognizable controls, visual state, placement, icons and
short purposeful labels to convey meaning. Keep information that is not
immediately useful to the current task out of the primary view. Preserve
necessary names, accessible labels, editing capability and functional meaning;
conciseness must not make a control or state ambiguous.

Research recommendations should specify the meaning users need to perceive
without requiring explanatory captions merely to prove coverage. UI authoring
selects the most concise clear representation. Independent UI review checks the
actual render for redundant readouts, explanatory labels and low-value status
text, and requests removal or consolidation when they add no immediate value.
Schema coverage and source traceability do not justify repeating information
inside the product canvas. Apply this rule to surface and component design within
the existing UI review; it adds no wireframe-description gate or review cycle.

## Entry Gate

Begin composition only after the exact UX schema 0.4 revision and requested scope receive a current `pass` under [the UX review gate](ux-review.md). A stale, unavailable, or `revise` review leaves dependent UI work gated. The restrained grayscale wireframe published from the UX interaction frame is semantic review evidence; it does not prescribe layout, geometry, framework components, theme, typography, or visual treatment.

## Composition Response Mode

Supply the same product-owned research brief and relevant section/evidence
references consumed by UX and wireframe authors, following the
[research handoff](product-research.md). Reuse applicable findings and verification;
research only material visual questions the brief does not adequately cover.
Report conflicts and evidence gaps to the parent. Advice does not override
accepted UX or wireframe arrangements, and a new behavioral recommendation uses
the existing UX change-request route. Keep brief references as assignment inputs
rather than duplicating its payload or adding fields to the composition schema.

### Research into control design

For material visual questions that accepted sources and saved research do not
settle, UI designer may request parent dispatch of `ui-researcher` under its
[standalone contract](../../../planning/implementation-agents/ui-researcher.md).
Supply source identities, accepted UX/spatial description, platform constraints,
existing briefs and a scoped destination. Reuse its product-owned UI research brief
across comps/components; consultation is conditional, not a stage for every comp.
The researcher may return an enriched authored-description copy with
`presentationGuidance`, exact inspected icon assets, accepted menu bindings and
concrete control/state recommendations. This is advisory input: UI selects working
treatment, UX retains behavior and parent verifies new evidence. Keep references
in assignment context/accompanying notes, outside composition schema 0.4 and
renderer inputs. Enrichment retains the exact-hash authored contract and existing
two description criteria; it does not replace independent UI review.

Carry the accepted spatial handoff's functional groups, `interaction` intent and
applicable `guidanceRefs` into the UI assignment. UI chooses actual components,
icons, state treatments and layout. A bound text command is not automatically a
credible representation of a toggle, menu trigger or value adjustment. Make
current state/value, subject scope and access to choices apparent, and visibly
distinguish materially different task groups. Familiar controls need deliberate
construction, not a fresh research exercise for each instance.

Keep a compact account in accompanying notes for material control families:
accepted intent, applicable brief section/evidence, selected visual treatment,
state/value presentation and any departure. Reuse shared reasoning across repeated
instances. Research uncovered material visual questions in composition mode as
well as dedicated component mode; keep new claims pending parent source checks.
A bounded or single-pass assignment does not waive this work. An explicit
restriction on new research must remain visible as a limitation.

Independent UI review assesses these meanings in the actual render. Coverage and
schema validity do not establish recognizable controls or successful research
translation. Keep this in the existing UI visual review; the upstream description
review still checks only completeness and adherence to applicable research.

For an explicit UI composition assignment, the named `ui-designer` returns only one schema 0.4 JSON proposal. It reads the supplied UX, passing UX-review evidence, and design-language sources in full, selects concrete hierarchy and layout within accepted UX, and may write only assigned temporary proposal JSON under the [file-delivery boundary](single-pass-design.md#proposal-file-permission-and-delivery). The parent consumes saved files directly and owns canonical persistence and HTML rendering. Every selected UI decision is accepted working design by inclusion. It preserves supplied `locked` documents and records exactly unless the current user explicitly requests a change to that scope, and it never creates a lock from its own confidence. Product behavior remains owned by UX; behavior-changing suggestions use explicit UX change requests and return to the parent.

For semantic button templates, explicitly declare supported parameter keys:
`leadingAssetId`/`trailingAssetId` on `button`, and `assetId` on `icon-button`.
These optional image references use existing verified assets and the owning
node's `assetRefs`; publication copies them through the approved image path.
Both renderers also accept declared `hasPopup` (`menu`, `listbox` or `dialog`),
`expanded`, `pressed` and `accessibleLabel` parameters. Bind these presentations
to accepted UX rather than creating behavior. Asset parameters do not introduce
an icon library or permit unverified external assets. Undeclared template keys
remain invalid under the existing composition contract.

The response contains:

- `schemaVersion: "0.4"` plus stable document identity, revision, status, and honest assessment provenance;
- exact `uxArtifactBinding` (`id`, `revision`, SHA-256 of recursively key-sorted canonical UX JSON) and `designLanguageSource` bindings;
- a top-level `uxChangeRequests` list;
- dimension tokens with design-language or disclosed UI-default provenance;
- versioned templates with `interaction` (`presentational` or `behavioral`), `html.renderer`, semantic `html.element`, namespaced `html.className`, supported states, parameters, sizing, and availability; enabled control templates are behavioral;
- assets and design-role references;
- scenes with a fixed viewport, one `interactionFrameRef`, UX surface/use-case/frame-region/component references, nested Grid/Flex regions, stable node IDs, exact `stateRef`, `depictsRefs`, constraints, content, placeholders, completeness, and `deferredInteractionNodeRefs`;
- `interactionNodeRef` and `actionRef` on every behavioral component node;
- optional `transientBehavior` for dialogs, popovers, and menus, recording ordered focusable node IDs, the initial-focus rationale, focus return target, action-group region, Escape/outside/cancel behavior, and content-driven height with an optional maximum;
- paired clean and annotated `.html` render requests below `comps/`;
- unresolved requirements and open UI questions in their existing schema fields; describe working visual assumptions in accompanying documentation outside the depicted scene, without adding a new schema field.

Canonical schema 0.4 stores `parts: [{id, root}]` and scenes with `partRef` and `changes: [{nodeRef, set}]`. Scene metadata uses `flowRefs`; a scene has no `root`. Parts own the existing region/component tree vocabulary. Changes shallowly replace declared node fields and cannot change identity, children or prototypes; structural variation needs another part. Expansion occurs only in validation/rendering memory.

Schema 0.4 ingress is closed. Every contract-owned object rejects undeclared properties at the root and at nested levels so misspelled or future fields cannot be silently persisted. Only declared free-form JSON payloads, such as a template instance's `parameters` and authored `content`, remain open; parameter keys still must match that template's declared parameter contract.

## UX Traceability And Change Requests

Visible unavailable controls may use presentational `button`, `icon-button`,
`text-field` or `choice-group` templates only when each resolved instance is
explicitly disabled through `state: "disabled"` or `parameters.disabled: true`.
These nodes carry no action, affordance, alternate or interaction-instance
bindings. Scene overrides cannot re-enable them. Use behavioral templates with
exact accepted frame affordances for enabled controls; this exception does not
create an action in a pending frame or waive affordance coverage.

`scene.interactionFrameRef` references one accepted or locked UX interaction frame in the reviewer's passing scope; a surface scene's `stateRef` matches that frame's `stateRef`. `uxRegionRef` resolves against the referenced frame's regions. A component node using a behavioral template carries both `interactionNodeRef` and `actionRef`: the interaction-node reference names one affordance in that frame, and the action must equal the affordance's UX action. Presentational templates cannot carry behavior bindings. Bind every affordance to one owner (including declared inactive alternatives); repeated subject instances require the explicit distinct containing-region scopes described below. Unscoped affordances appear exactly once unless the scene is explicitly partial and lists that affordance ID in `deferredInteractionNodeRefs`. A complete scene has an empty deferral list. Do not use alternate input IDs as separate affordances, duplicate an action merely to fill layout, or bind decorative presentation to an action.

When UI needs an added, removed, merged, or behaviorally changed action, state, transition, frame, feedback, cancellation, or recovery contract, add one top-level request shaped as `{ id, status: "open", sceneRefs, interactionFrameRefs, actionRefs, requestedChange, rationale }`. `actionRefs` may be empty for a requested addition. The request records a proposal only: it does not authorize an unbound node, override accepted UX, or permit the changed behavior to appear in the scene. The parent routes it to UX, persists the revised schema 0.4 artifact, and obtains a fresh UX-review pass before UI resumes against it.

A behavioral component may represent one accepted control whose action alternates
with existing task state. Its primary `interactionNodeRef` / `actionRef` pair names
the action depicted now. Optional `alternateInteractionBindings` is a nonempty
array of `{interactionNodeRef, actionRef, condition, label}` for inactive alternatives
on that same owner. Each pair resolves to an accepted affordance in the same frame
and counts once toward coverage. `condition` describes the already accepted UX
situation; it is explanatory metadata, not executable logic or a new state machine.
Do not use this field to combine unrelated controls or invent behavior. For example,
one Play control may retain Stop as its alternate while preview is playing. The
renderer paints only the primary control and documents alternatives outside the
canvas in the annotated view; rendering does not simulate those transitions.

Repeated instances of the same accepted control, such as an audio mute control
on each track, may carry `interactionInstanceRef` naming their containing UI
instance region. Repeated bindings require distinct instance regions on every
owner; a repeated unscoped binding or a duplicate within the same instance remains
invalid. Every instance still uses the exact same-frame UX affordance/action pair.
Instance references preserve subject context, not new UX actions or states. A
generic affordance is covered by these explicit instances without changing the
source inventory; independent UI review checks that the repetitions and subjects
are supported by the accepted wireframe and UX.

Available HTML renderers are `heading`, `text`, `status`, `button`, `icon-button`, `text-field`, `choice-group`, `image`, `visual`, and `placeholder`. The bounded behavioral `choice-group` represents one UX choice affordance with ordered options as familiar tabs, a list, or a select without multiplying one UX action into duplicate bindings; it requires a label, nonempty stable options, and an optional selected option and disabled state. The `image` renderer uses a declared local image asset, intrinsic dimensions, an accessible scene label, `contain` or `cover` fitting, bounded scale, and pixel offsets inside a clipped viewport. Each image asset has a relative path below an explicit asset root, a supported image MIME type, and the approved lowercase SHA-256 digest. Validation resolves the real root and file, rejects traversal and linked-path escapes, limits the file to 20 MiB, verifies the file signature and declared MIME type, and checks the digest before the verified bytes are copied. Persistence requires `--asset-root` only when the proposal declares an image asset; asset-free proposals do not consult the staging directory as an asset authority. The publisher emits the validated bytes once so review output is deterministic and portable. Regions may select the bounded Material surface treatments `flat`, `outlined`, or `elevation-1`. Button templates select contained, outlined, or text emphasis through their validated class contract. The bounded `visual` renderer is reserved for deterministic complex-component geometry and accepts only registered roles and variants described by [the complex component contract](component-design.md). Specialized product components use a dimensioned placeholder template until their dedicated comp is designed. A scene marked partial or containing an unresolved placeholder is a wireframe and must be labeled that way in every index, inline illustration, link, and report rather than called a comp. After placeholders and deferred interaction nodes are resolved, revise and validate the scene as complete before publication labels it a comp. A structurally complete scene may still be only a wireframe; visual inspection must confirm credible visual hierarchy, styling, density, representative content, and meaningful state treatment before describing it as a finished comp.

The asset root must resolve inside the explicit canonical source root and neither may grant filesystem-root-wide asset access. Validation compares real paths, so linked-root escapes fail. SVG assets reject scripts, embedded active content, SMIL/animation elements, event and style attributes, CSS/style blocks and escapes, nonlocal URL constructs, and external references. They permit literal local fragment references and signature-checked embedded PNG, JPEG, or WebP data only.

For a whole-product composition request, cover every sufficiently defined accepted UX surface with at least one representative scene. Add separate scenes for materially different accepted interaction frames and persistent states or transient surfaces when they change layout, action availability, focus behavior, or the information needed for review. Report uncovered surfaces, frames, actions, and states explicitly; the existence of one detailed scene does not make the product UI pass complete.

Every required comp must be built, even when its visual specification is incomplete or unclear. For a whole-product pass, every accepted UX surface is required; lack of visual detail does not exclude it from scope. Choose a coherent working visual state consistent with accepted UX, depict the controls and content that can be shown, and record each assumption or unanswered question in the accompanying interface documentation. A component already placed in an accepted wireframe may remain a visual placeholder in the UI when its supplied detail is insufficient for responsible component design. Preserve its geometry and known role, document the missing detail outside the canvas, and retain honest schema completeness and publication labels. This exception permits the surrounding UI stage to complete with documented component gaps; it neither asserts finished component design nor permits omitted scenes or placeholders for sufficiently specified controls. Do not put planning commentary, TODOs, uncertainty labels, placeholder descriptions, or review notes inside either a comp or wireframe canvas. Visible words belong there only when they are plausible end-user UI copy. If a sufficiently specified component cannot be rendered, extend the renderer or use a supported composition that faithfully conveys it; renderer absence alone does not qualify for the missing-detail exception. Do not invent unsupported behavior; route that question to UX and continue independent visual work.

For `choice-group` list presentation, each ordered option may include an optional `group` label. The renderer emits a heading whenever that label changes without creating another UX binding. Group labels are invalid for tab and select presentation.

The static `text-field` renderer accepts declared `label`, `value` and `helperText`
parameters, with optional `multiline` (boolean), `rows` (positive integer) and
`error` (boolean). Multiline values render as a read-only textarea with preserved
line breaks. Helper text is associated with the field; error presentation carries
`aria-invalid`. Use an accepted `focus` state with `error: true` to depict focused
error feedback without inventing another state vocabulary. Focus and select focus
remain visibly distinct from selection and disabled presentation. An explicit
supported `body-text` color role may keep focused labels readable while retaining
the primary border/ring; error treatment takes precedence. Verify actual text and
nontext contrast against the frozen design language rather than assuming every
primary color is suitable for ordinary text. These are rendered design states,
not runtime form behavior or accessibility-conformance evidence. Per-option focus
for list presentation remains outside this bounded parameter contract.

Native HTML specimens use labels above controls. They do not assert MUI outlined
geometry, notching or implementation fidelity. If MUI outlined controls are an
assignment's actual target, retain the applicable MUI label/outline rules; an
explicit body-text role in a native specimen does not waive those rules.

## Validate And Persist

Run:

```text
node scripts/ui-composition.mjs \
  --input <proposal.json> \
  --ux <ux-spec.json> \
  --ux-review <ux-review.json> \
  --product-description <product-description.md> \
  --source-root <authoritative-source-root> \
  [--product-document-root <product/<name>>] \
  [--existing-ux <prior-ux.json>] \
  [--existing-design-language <prior-design-language.json>] \
  --design-language <design-language.json> \
  --output <ui-spec.json> \
  [--asset-root <ui-asset-root>]
```

`--source-root` is the canonical base for paths declared by the UX artifact and the authority boundary for UI assets; for repository-relative source paths, pass the repository root even when the UX artifact is stored deeper. Pass `--product-document-root` when generated support files live under `product/<name>` rather than at the repository root; the UI output must then be `<product-document-root>/ui/ui-spec.json`. The selected source path and `--product-description` must resolve to the same real file. Use `--product-description-id <ux-source-id>` when the UX artifact has multiple human-owned product-description sources. `--asset-root` is required exactly when the proposal declares image assets, and that root must remain inside the same source root after realpath resolution.

When replacing an existing composition whose dependencies have advanced, supply its exact prior dependency files through `--existing-ux` and, when needed, `--existing-design-language` (`existingUxPath` / `existingDesignLanguagePath` in `ui.persist` options). These inputs validate ownership of the existing target using the same current schemas and exact bindings. The incoming composition still requires current dependencies and their passing independent review. Identity, root confinement and lock checks remain mandatory. Omit prior paths when replaying the newly persisted composition against its current dependencies.

Validation checks the closed schema 0.4 shapes, exact source revisions, interaction-frame/node/action traceability, deferral completeness, UX change-request shape, design roles, templates and versions, supported states, parameters, Grid placement, paths, placeholder disclosure, and one clean plus one annotated request per scene. Before replacing the saved source, the writer also recomputes the current product-description and UX hashes and requires a `pass` receipt whose expanded reviewed scope covers every UX record consumed by the UI. Missing, stale, `revise`, or out-of-scope receipts fail without writing. It rejects a behavior-changing node that is justified only by an open UX change request.

For a transient scene, use a transient UX surface or a dialog, popover, menu, or transient interaction frame owned by its parent surface, and make the interaction contract explicit. The initial focus target is the first item in `focusOrder`. Choose it from the task: normally the first content control, an informational dialog's close action when it has no content control, or the default action when the surface only contains actions. Record return focus, action grouping, cancellation results, and content-driven height. When cancellation names a command, its `nodeRef`, `interactionNodeRef`, and `actionRef` must match one bound behavioral node. The clean dialog comp uses semantic `<dialog>` markup; the annotated variant also presents this contract for review.

Use `--lock-reason <current-user-request>` to record an explicit lock and `--locked-change-reason <current-user-request>` for an explicitly requested change to or removal of a lock. General refinement and regeneration do not authorize either flag. The writer protects both document-level and nested record locks.

## Render Standalone

Run:

```text
node scripts/ui-composition-html.mjs \
  <ui-spec.json> <ux-spec.json> <design-language.json> <prd-output-root> \
  --source-root <authoritative-source-root>
```

The publisher writes `comps/index.html`, every requested comp page, `assets/composition.css`, and `ui/render-report.json`. Clean and annotated pages contain the same scene markup. Review annotations and unresolved-placeholder descriptions appear in an accompanying panel outside the scene canvas; stable data attributes remain available for inspection without painting commentary over the interface. Inline styles are limited to calculated layout, placement, constraints, and fixed viewport dimensions from the structured scene.

The renderer refuses linked destinations and unowned files, escapes authored content, publishes only after complete validation, and produces byte-identical output for identical inputs.

## Publish With The PRD

Pass `--ui <ui-spec.json>` and optionally `--ui-label <label>` to `scripts/prd-html.mjs`. The combined publisher validates and renders comps, embeds the clean scene markup directly in its owning UX surface as an illustration, retains links to the full-size clean and annotated views, adds Product comps navigation, and records the UI source and bounded report in the aggregate PRD report. Generate the inline markup from the same structured scene used by the standalone pages. Do not place the scene or any resolved complex component in an iframe: native markup must participate in the PRD's document flow so the page remains the only scroll context.

When a placeholder receives a dedicated design, follow [the complex component contract](component-design.md). Component documents use schema 0.4 and retain the applicable interaction-frame/node/action bindings and UX change-request discipline. The registered component replaces only the exact template ID/version and state while retaining the surface scene's layout and node identity.

Run `scripts/ui-composition.test.mjs`, `scripts/ui-composition-html.test.mjs`, and `scripts/prd-html.test.mjs`. Inspect both comp variants in a local browser and verify semantic structure, source-revision disclosure, frame/action traceability, change-request disclosure, fixed-viewport overflow, and review notes outside the scene canvas. Verify that no reviewer or author commentary is painted within either variant.

# Shared numeric placement

A grid region may declare `layout.scale:{min,max}` with one column. Its direct
children may declare `scalePosition:{start,end?}` alongside ordinary row placement.
The renderer derives interval origin/width or a centered point from the same
numeric transform. Surrounding labels and controls use ordinary layout outside
the scale region. Units, supplied labels and endpoint meaning belong to product
data; the renderer does not infer domain behavior. Values must be finite and
inside the domain. This works in both canonical UI scenes and reviewed-wireframe
previews.
