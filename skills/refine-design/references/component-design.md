# Complex Component Design

Component mode is the structured path for a product-specific component whose behavior or visible states cannot be communicated by an ordinary design-language control. It sits between surface composition and application implementation:

```text
UX component requirement -> UI component design -> deterministic focused comps -> registered surface replacement
```

Use component mode for a diagram editor, spatial planner, layered canvas, data visualization, or another interaction that needs multiple meaningful states. A familiar text field, select, menu, or ordinary button remains in the design language and does not need a dedicated comp.

## UI Designer Response

For an explicit `component` assignment, the named `ui-designer` returns one JSON-only schema 0.2 composition document with `designMode: "component"`. It uses the normal UI composition scene vocabulary and adds:

- `artifactKind`: `comp` only when the scene expresses finished visual hierarchy, geometry, styling, information density, representative content, and meaningful state distinctions; otherwise `wireframe`;
- `patternResearch`: an auditable bounded comparison of similar controls from primary product or platform documentation, including the search method and queries, outcome, source type and access date, URLs, observed shared patterns, the selected adaptation, rejected patterns, evidence limits, and parent verification status;
- `fidelity`: the concrete visual decisions, state distinctions, and representative content that make a comp reviewable, or the explicit work still missing when the artifact is a wireframe;
- `componentTemplate`: stable component ID, name and version; exact UX component reference; exact placeholder template ID/version it replaces; supported states; parameter descriptions; sizing; accessibility semantics and keyboard intent; and one state-to-scene mapping per supported state;
- `promotion`: `app-local` or `shared-candidate`, with rationale and concrete promotion criteria;
- component-focused scenes whose `subject.kind` is `component` and whose subject matches `componentTemplate.uxRef`;
- paired clean and annotated HTML requests for every state scene;
- unresolved requirements when behavior or presentation cannot responsibly be selected.

Every scene still binds exact UX and design-language revisions. A whole-component `locked` state freezes its structured comp and those exact bindings; a dependency update therefore produces a reported conflict or stale comp rather than a silent visual revision. The UI designer preserves a supplied lock and may only propose changing it when the current user explicitly names that component and requests the change. Grid owns the component's structural layout, while Flexbox may align compact groups. Ordinary controls reuse semantic renderers. The bounded `visual` renderer supplies deterministic non-control geometry through a product-neutral vocabulary of surfaces, items, selections, handles, indicators, thumbnails, labels, tracks, thumbs, dividers, and reusable visual variants. Product-specific meaning comes from the component specification's composition, content, accessible labels, and linked assets rather than a product-specific renderer role. The renderer does not accept arbitrary HTML or CSS.

Research is required when an unfamiliar or product-specific component has established comparables. The absence of an immediate reference triggers a bounded online search; it does not permit the designer to jump directly from general principles to a comp. Prefer current official product documentation, platform guidance, standards, or maintained project manuals. Record the actual search queries. A claimed shared pattern needs evidence from at least two independent products, unless one source is itself a normative standard or platform guideline. The designer extracts common visual and interaction vocabulary without copying trade dress or changing accepted UX.

Durable research records contain public evidence and reusable conclusions only. Source URLs must use public HTTPS hosts without credentials, secret query keys, private IPs, IPv4-compatible or NAT64 private/loopback forms, or local/internal names. URL paths, queries, and fragments plus queries, observations, notes, and limits are decoded through bounded percent-encoding layers before scanning and must not contain bearer/vendor tokens, credential-shaped assignments, file URLs, or private absolute filesystem paths. Ordinary design prose about passwords remains valid.

If relevant comparables cannot be found, set the research outcome to `no-established-comparable`, keep shared patterns empty, record the search scope and limitation, and continue as a wireframe or novel direction awaiting review. Do not manufacture a common pattern from a single implementation.

The UI designer returns research verification as `pending`. Before persistence as a comp, the parent opens the material sources, confirms that they are primary and that their cited observations support the selected pattern, then records `source-checked`, the date, and a short note. Failed or irrelevant evidence returns to the designer for one focused correction. The validator rejects an unverified comp, so this check cannot be skipped by the publisher or placeholder-registration path.

Calling an artifact a comp is a substantive claim. Labeled structural boxes, placeholder prose, or flat blocks without credible content treatment remain a wireframe even when their dimensions and states are correct. A wireframe may be rendered for review, but it cannot register as the final replacement for a product-comp placeholder. The parent promotes it only after the missing visual work is present and browser inspection confirms the claim.

## Validate And Persist

Run:

```text
node scripts/component-design.mjs \
  --input <proposal.json> \
  --ux <ux-spec.json> \
  --ux-review <ux-review.json> \
  --product-description <product-description.md> \
  --source-root <authoritative-source-root> \
  --design-language <design-language.json> \
  --output <component-design.json> \
  [--asset-root <component-asset-root>]
```

`--source-root` is the canonical base for paths declared by the UX artifact and the authority boundary for component assets; for repository-relative source paths, pass the repository root even when the UX artifact is stored deeper. The selected source path and `--product-description` must resolve to the same real file. Use `--product-description-id <ux-source-id>` when the UX artifact has multiple human-owned product-description sources. `--asset-root` is required exactly when the proposal declares image assets, and that root must remain inside the same non-filesystem source root after realpath resolution. Asset-free proposals may be staged outside the source root because no staging path is treated as asset authority.

Validation includes all UI composition constraints plus artifact classification, research evidence, fidelity evidence, single-component scene ownership, state coverage, exact state-to-scene mappings, a bounded parameter contract, accessibility intent, and promotion metadata. The writer also requires the current passing UX-review receipt to match the authoritative product-description and UX bytes and cover the component's consumed UX scope. It writes only after the complete input and gate pass.

Use `--lock-reason <current-user-request>` to lock the component and `--locked-change-reason <current-user-request>` only for a specifically requested change to or removal of that lock. The persistence guard rejects changes before replacing the component source.

## Render And Register

Standalone rendering writes `component-comps/index.html`, paired state pages, `assets/component-composition.css`, the shared design-language `assets/prd.css` and bundled font files, and a component-specific report under `ui/components/`. It reads the design language's sibling `review-layout.json` when present and otherwise uses the maintained neutral layout defaults. Pass `--layout` to select an explicit review-layout source.

```text
node scripts/component-design-html.mjs \
  <component-design.json> <ux-spec.json> <design-language.json> <prd-output-root> \
  --source-root <authoritative-source-root> [--layout <review-layout.json>]
```

For the combined PRD, pass both the owning surface UI and the component design:

```text
node scripts/prd-html.mjs \
  <ux-spec.json> <design-language.json> <prd-output-root> \
  --source-root <authoritative-source-root> \
  --ui <ui-spec.json> \
  --component <component-design.json>
```

When a UI or component declares assets relative to a broader authorized source root rather than its JSON folder, pass `--ui-asset-root <asset-root>` and one `--component-asset-root <asset-root>` for each repeated component argument. The publisher validates every explicit root beneath `--source-root`; it never searches for missing assets or widens authority implicitly.

Registration is exact: `componentTemplate.replacesTemplateRef` must identify an existing placeholder template with the same version, and `artifactKind` must be `comp`. Each matching placeholder instance resolves by its declared state. The renderer keeps the surface node, placement, constraints and identity stable, and embeds the corresponding clean component state page inside that box. Wireframes and nonmatching placeholders remain labeled. Reports distinguish total, resolved and unresolved placeholders and preserve source hashes and revisions.

An app-local component may be marked `shared-candidate` after its parameters, states, sizing, accessibility contract, and research evidence are sufficiently product-independent. `buildComponentPromotionCandidate` produces a deterministic review-only handoff containing those contracts, provenance, evidence, and criteria. The handoff always records that explicit user direction is required and that no shared-library mutation has occurred. Applying the candidate to a shared skills/component repository remains a separate authorized repository workflow.

The combined publisher accepts independently owned component-design sources and registers each exact placeholder/template/state match. Runtime parameter substitution remains deferred; the renderer does not infer it.

## Promotion

App-local is the default scope for a newly designed product component. Mark it `shared-candidate` only when its states, parameter meaning, accessibility contract and visual behavior are product-independent enough to review for a standard component library. Promotion is metadata and a future review trigger; it does not silently move files or broaden the component's authority.

Run `component-design.test.mjs`, `component-design-html.test.mjs`, `ui-composition-html.test.mjs`, and `prd-html.test.mjs`. Inspect focused clean/annotated pages and the owning surface. Verify recognizable domain patterns, credible visual finish, state legibility, keyboard/focus intent, stable surface layout, exact placeholder replacement, and visible remaining gaps. If inspection shows only structural boxes, correct `artifactKind` to `wireframe` and keep the placeholder unresolved.
