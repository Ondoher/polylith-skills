# Structured UI Rendering For Product Planning


Status: implemented static HTML design. This document describes the current renderer architecture; earlier general SVG scene proposals are retired. SVG remains an asset format for icons and component-specific vector geometry.

## Pipeline And Ownership

~~~text
human description -> refine-design -> product model and specialty artifacts
-> verified snapshot -> PRD context -> generate-prd -> static HTML review
~~~

UX owns tasks, behavior, states, outcomes, cancellation, and recovery. UI owns hierarchy, geometry, typography, colors, component selection, and presentation accessibility. The UI designer returns structured JSON and does not write or render files. The parent validates and persists refinement artifacts and may render bounded inspection views. Final publication runs through generate-prd from a validated context. A behavior-changing UI idea returns to UX.

The browser performs text flow, Grid/Flex layout, wrapping, and font rendering. The publisher performs schema validation, escaping, template assembly, local-asset publication, deterministic ordering, diagnostics, and generated-file ownership checks. It does not make a new visual decision during assembly.

## UI Scene Contract

A surface scene binds exact UX and design-language document IDs and revisions. It records:

- a stable surface, use-case, region, component, scene, and node identity;
- one explicit viewport, theme, state, and completeness result;
- nested Grid regions and small Flexbox groups;
- versioned semantic HTML templates, parameters, states, constraints, tokens, and assets;
- explicit dimensioned placeholders for unavailable specialized templates;
- one clean and one annotated HTML request from the same tree;
- unresolved product, UX, or UI requirements without filling them during rendering.

The clean scene is the product illustration. The annotated scene adds layout measurements, source/template identity, and review metadata. Missing components do not block unaffected content. They retain their intended template ID/version, UX owner, dimensions, state, and purpose so a later component design can replace them without moving or renaming the surface node.

Transient scenes also define presentation kind, focus order, initial-focus rationale, focus return, action grouping, cancellation behavior, and content-driven height. Dialog comps use semantic `<dialog open aria-modal="true">` markup. The interaction record guides later implementation; a static comp does not claim runtime focus trapping or keyboard testing.

## Reusable Templates And Complex Components

The ordinary template registry begins with semantic text, headings, buttons, icon buttons, text fields, status, and placeholders, then reuses the design-language component patterns. Templates declare a stable ID/version, renderer, semantic element, supported parameters and states, sizing, token dependencies, and accessibility intent. MUI-based application design is the initial family; a complete MUI catalog is not required.

Product-specific controls remain local placeholders until component mode designs them. Component mode requires:

- bounded research when no immediate recognized pattern exists;
- primary product/platform sources, or applicable standards and maintained manuals;
- two independent products for a claimed shared product pattern unless a normative platform source directly governs it;
- parent source verification before a result can be registered as a comp;
- finished visual hierarchy, geometry, density, styling, representative content, and state distinctions for `artifactKind: comp`;
- a versioned template contract, full supported-state mapping, sizing, parameters, keyboard/accessibility intent, and exact placeholder target.

Wireframes remain useful and honest but cannot replace a comp placeholder. A registered comp replaces only matching template ID/version/state instances while preserving the owning surface node, placement, and constraints.

## App-Local To Shared Promotion

A component begins app-local unless current evidence supports broader reuse. A `shared-candidate` records why its semantics, parameters, states, sizing, and accessibility contract are portable and which criteria remain. The skill can create a deterministic promotion handoff containing the contract, origin, research evidence, criteria, and an explicit `approval: required` state. It never applies that handoff to a shared library. Explicit user direction and a separate repository workflow own review, versioning, installation, and migration.

## Change And Publication Safety

Structured sources remain authoritative; generated HTML is replaceable output. Validate all inputs and cross-references before replacing a valid publication. Refuse unowned output paths and linked roots. Identical inputs produce byte-identical output.

Record-level dependencies distinguish stale artifacts from unchanged ones. A material source-record change stales consuming comps; a revision-only change requires exact rebinding; unrelated comps remain reusable. Locked artifacts report conflicts and retain both content and source bindings until explicitly changed by the user.

The renderer reports source hashes/revisions, generated files, scenes, placeholders, resolved component replacements, unresolved requirements, and complete/partial outcome. A complete render means its supplied scene requirements rendered without unresolved dependencies. It does not certify product completeness, runtime accessibility, or implementation readiness.

## Maintained Verification

Tests cover schema references, exact revisions, Grid placement, templates/states, paired variants, escaping, deterministic regeneration, ownership, invalid-input preservation, placeholder disclosure, complex-component registration, transient interaction contracts, lock enforcement, and scoped impact classification. Representative HTML must also be inspected in the target Chromium environment when available.

Interactive review-page behavior, general responsive breakpoint generation, production component code, complete framework catalogs, automated visual baselines, and automatic shared-library mutation remain later work.
