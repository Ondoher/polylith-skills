# UI Composition And HTML Comps

Schema 0.2 is the structured handoff between accepted UX, the design language, the UI designer, and deterministic HTML comp rendering. It binds every scene to an exact accepted interaction frame, binds behavioral nodes to UX actions, preserves stable node identities, and renders one clean and one annotated page from the same scene tree.

## Entry Gate

Begin composition only after the exact UX schema 0.2 revision and requested scope receive a current `pass` under [the UX review gate](ux-review.md). A stale, unavailable, or `revise` review leaves dependent UI work gated. The restrained grayscale wireframe published from the UX interaction frame is semantic review evidence; it does not prescribe layout, geometry, framework components, theme, typography, or visual treatment.

## Composition Response Mode

For an explicit UI composition assignment, the named `ui-designer` returns only one schema 0.2 JSON proposal. It reads the supplied UX, passing UX-review evidence, and design-language sources in full, selects concrete hierarchy and layout within accepted UX, and does not write files or render HTML. Every selected UI decision is accepted working design by inclusion. It preserves supplied `locked` documents and records exactly unless the current user explicitly requests a change to that scope, and it never creates a lock from its own confidence. Product behavior remains owned by UX; behavior-changing suggestions use explicit UX change requests and return to the parent.

The response contains:

- `schemaVersion: "0.2"` plus stable document identity, revision, status, and honest assessment provenance;
- exact `uxSource` and `designLanguageSource` bindings;
- a top-level `uxChangeRequests` list;
- dimension tokens with design-language or disclosed UI-default provenance;
- versioned templates with `interaction` (`presentational` or `behavioral`), `html.renderer`, semantic `html.element`, namespaced `html.className`, supported states, parameters, sizing, and availability; standard button, icon-button, and text-field templates are behavioral;
- assets and design-role references;
- scenes with a fixed viewport, one `interactionFrameRef`, UX surface/use-case/frame-region/component references, nested Grid/Flex regions, stable node IDs, explicit state, constraints, content, placeholders, completeness, and `deferredInteractionNodeRefs`;
- `interactionNodeRef` and `actionRef` on every behavioral component node;
- optional `transientBehavior` for dialogs, popovers, and menus, recording ordered focusable node IDs, the initial-focus rationale, focus return target, action-group region, Escape/outside/cancel behavior, and content-driven height with an optional maximum;
- paired clean and annotated `.html` render requests below `comps/`;
- unresolved requirements and open UI questions only where no usable choice can be selected.

Schema 0.2 ingress is closed. Every contract-owned object rejects undeclared properties at the root and at nested levels so misspelled or future fields cannot be silently persisted. Only declared free-form JSON payloads, such as a template instance's `parameters` and authored `content`, remain open; parameter keys still must match that template's declared parameter contract.

## UX Traceability And Change Requests

`scene.interactionFrameRef` references one accepted or locked UX interaction frame in the reviewer's passing scope; a surface scene's state matches that frame's state. `uxRegionRef` resolves against the referenced frame's regions. A component node using a behavioral template carries both `interactionNodeRef` and `actionRef`: the interaction-node reference names one affordance in that frame, and the action must equal the affordance's UX action. Presentational templates cannot carry behavior bindings. Bind every affordance in the frame exactly once unless the scene is explicitly partial and lists that affordance ID in `deferredInteractionNodeRefs`. A complete scene has an empty deferral list. Do not use alternate input IDs as separate affordances, duplicate an action merely to fill layout, or bind decorative presentation to an action.

When UI needs an added, removed, merged, or behaviorally changed action, state, transition, frame, feedback, cancellation, or recovery contract, add one top-level request shaped as `{ id, status: "open", sceneRefs, interactionFrameRefs, actionRefs, requestedChange, rationale }`. `actionRefs` may be empty for a requested addition. The request records a proposal only: it does not authorize an unbound node, override accepted UX, or permit the changed behavior to appear in the scene. The parent routes it to UX, persists the revised schema 0.2 artifact, and obtains a fresh UX-review pass before UI resumes against it.

Available HTML renderers are `heading`, `text`, `status`, `button`, `icon-button`, `text-field`, `choice-group`, `image`, `visual`, and `placeholder`. The bounded behavioral `choice-group` represents one UX choice affordance with ordered options as familiar tabs, a list, or a select without multiplying one UX action into duplicate bindings; it requires a label, nonempty stable options, and an optional selected option and disabled state. The `image` renderer uses a declared local image asset, intrinsic dimensions, an accessible scene label, `contain` or `cover` fitting, bounded scale, and pixel offsets inside a clipped viewport. Each image asset has a relative path below an explicit asset root, a supported image MIME type, and the approved lowercase SHA-256 digest. Validation resolves the real root and file, rejects traversal and linked-path escapes, limits the file to 20 MiB, verifies the file signature and declared MIME type, and checks the digest before the verified bytes are copied. Persistence requires `--asset-root` only when the proposal declares an image asset; asset-free proposals do not consult the staging directory as an asset authority. The publisher emits the validated bytes once so review output is deterministic and portable. Regions may select the bounded Material surface treatments `flat`, `outlined`, or `elevation-1`. Button templates select contained, outlined, or text emphasis through their validated class contract. The bounded `visual` renderer is reserved for deterministic complex-component geometry and accepts only registered roles and variants described by [the complex component contract](component-design.md). Specialized product components use a dimensioned placeholder template until their dedicated comp is designed. A scene with an unresolved placeholder is necessarily a partial wireframe and must be labeled that way in every index, inline illustration, link, and report rather than called a comp. When deterministic publication replaces every placeholder with a source-checked component comp, the published artifact may be labeled a comp while the composition source retains its original partial state and component bindings. A structurally complete scene may still be only a wireframe; visual inspection must confirm credible visual hierarchy, styling, density, representative content, and meaningful state treatment before describing it as a finished comp.

The asset root must resolve inside the explicit canonical source root and neither may grant filesystem-root-wide asset access. Validation compares real paths, so linked-root escapes fail. SVG assets reject scripts, embedded active content, SMIL/animation elements, event and style attributes, CSS/style blocks and escapes, nonlocal URL constructs, and external references. They permit literal local fragment references and signature-checked embedded PNG, JPEG, or WebP data only.

For a whole-product composition request, cover every sufficiently defined accepted UX surface with at least one representative scene. Add separate scenes for materially different accepted interaction frames and persistent states or transient surfaces when they change layout, action availability, focus behavior, or the information needed for review. Report uncovered surfaces, frames, actions, and states explicitly; the existence of one detailed scene does not make the product UI pass complete.

For `choice-group` list presentation, each ordered option may include an optional `group` label. The renderer emits a heading whenever that label changes without creating another UX binding. Group labels are invalid for tab and select presentation.

## Validate And Persist

Run:

```text
node scripts/ui-composition.mjs \
  --input <proposal.json> \
  --ux <ux-spec.json> \
  --ux-review <ux-review.json> \
  --product-description <product-description.md> \
  --source-root <authoritative-source-root> \
  --design-language <design-language.json> \
  --output <ui-spec.json> \
  [--asset-root <ui-asset-root>]
```

`--source-root` is the canonical base for paths declared by the UX artifact and the authority boundary for UI assets; for repository-relative source paths, pass the repository root even when the UX artifact is stored deeper. The selected source path and `--product-description` must resolve to the same real file. Use `--product-description-id <ux-source-id>` when the UX artifact has multiple human-owned product-description sources. `--asset-root` is required exactly when the proposal declares image assets, and that root must remain inside the same source root after realpath resolution.

Validation checks the closed schema 0.2 shapes, exact source revisions, interaction-frame/node/action traceability, deferral completeness, UX change-request shape, design roles, templates and versions, supported states, parameters, Grid placement, paths, placeholder disclosure, and one clean plus one annotated request per scene. Before replacing the saved source, the writer also recomputes the current product-description and UX hashes and requires a `pass` receipt whose expanded reviewed scope covers every UX record consumed by the UI. Missing, stale, `revise`, or out-of-scope receipts fail without writing. It rejects a behavior-changing node that is justified only by an open UX change request.

For a transient scene, use a transient UX surface or a dialog, popover, menu, or transient interaction frame owned by its parent surface, and make the interaction contract explicit. The initial focus target is the first item in `focusOrder`. Choose it from the task: normally the first content control, an informational dialog's close action when it has no content control, or the default action when the surface only contains actions. Record return focus, action grouping, cancellation results, and content-driven height. When cancellation names a command, its `nodeRef`, `interactionNodeRef`, and `actionRef` must match one bound behavioral node. The clean dialog comp uses semantic `<dialog>` markup; the annotated variant also presents this contract for review.

Use `--lock-reason <current-user-request>` to record an explicit lock and `--locked-change-reason <current-user-request>` for an explicitly requested change to or removal of a lock. General refinement and regeneration do not authorize either flag. The writer protects both document-level and nested record locks.

## Render Standalone

Run:

```text
node scripts/ui-composition-html.mjs \
  <ui-spec.json> <ux-spec.json> <design-language.json> <prd-output-root> \
  --source-root <authoritative-source-root>
```

The publisher writes `comps/index.html`, every requested comp page, `assets/composition.css`, and `ui/render-report.json`. Clean and annotated pages contain the same scene markup; CSS exposes annotations using the stable data attributes already present in both. Inline styles are limited to calculated layout, placement, constraints, and fixed viewport dimensions from the structured scene.

The renderer refuses linked destinations and unowned files, escapes authored content, publishes only after complete validation, and produces byte-identical output for identical inputs.

## Publish With The PRD

Pass `--ui <ui-spec.json>` and optionally `--ui-label <label>` to `scripts/prd-html.mjs`. The combined publisher validates and renders comps, embeds the clean scene markup directly in its owning UX surface as an illustration, retains links to the full-size clean and annotated views, adds Product comps navigation, and records the UI source and bounded report in the aggregate PRD report. Generate the inline markup from the same structured scene used by the standalone pages. Do not place the scene or any resolved complex component in an iframe: native markup must participate in the PRD's document flow so the page remains the only scroll context.

When a placeholder receives a dedicated design, follow [the complex component contract](component-design.md). Component documents use schema 0.2 and retain the applicable interaction-frame/node/action bindings and UX change-request discipline. The registered component replaces only the exact template ID/version and state while retaining the surface scene's layout and node identity.

Run `scripts/ui-composition.test.mjs`, `scripts/ui-composition-html.test.mjs`, and `scripts/prd-html.test.mjs`. Inspect both comp variants in a local browser and verify semantic structure, source-revision disclosure, frame/action traceability, change-request disclosure, placeholder legibility, fixed-viewport overflow, and annotation overlays.
