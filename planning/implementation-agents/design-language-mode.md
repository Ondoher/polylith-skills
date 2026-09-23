# Design-Language Mode: First Implementation Requirements

Status: first-pass feature proposal. The owner selected design-language mode as the first UI mode to implement, with Markdown output for human review. This document defines the full first-stage requirements. Slices 1, 2 and 2b implement compact palette/theme specimens, direct member references, explicit defaults and owner-controlled acceptance; see [current evidence and pending live checks](design-language-slice-two-b-review.md). Later capabilities remain planned. See the [pipeline format](ui-pipeline-format.md#ui-and-component-02-bindings).

The [vertical-slice build plan](design-language-build-plan.md) implements these requirements incrementally through working skill-to-SVG-to-Markdown paths.

Schema 0.8 adds the bounded contained command-button state sheet with theme references/derived colors and explicit defaults. See [Slice 6a evidence and remaining gaps](design-language-slice-six-review.md). App-wide categories remain living decisions; this specimen does not complete their coverage.

## Logical Input Guidance And Feedback

Owner clarified the pattern with modmod's complex inputs: one helper/error area can belong to a composite input with multiple children. Name the shared pattern Input Guidance And Feedback. Place its shared messages beneath the complete logical input, keep individual child labels, and distinguish group-level errors from child-specific errors. Schema 0.12 demonstrates this with a two-width weekday checkbox group reusing the same pattern as the ordinary field. This does not imply a generic comp renderer or an Alexa weekday requirement.

## Ordinary Field And Shared Messages

Schema 0.11 adds the ordinary populated text field in default, focused, disabled and error states at two widths. Helper/error presentation is a separate reusable pattern in components.md, with shared typography, role colors, placement and retain/replace policy; each field owns its content. The example retains helper instructions and adds a corrective error. UX still owns validation/announcement timing. This closes the ordinary field/helper/error specimen gap; selects and additional embedded-field states remain pending.

## Separate Component Reference

Owner decision: standard component examples belong in a compact components.md alongside the shared design-language.md. The foundations document links to it. Both use the same saved values and SVG assets. Show the app's actual styling via reusable templates; specialized components retain their own comps. Schema 0.10 implements this split with preservation of owner notes and artifact conflict checks. This supersedes earlier requirements to embed all basic specimens in the single foundations document; it does not add new component types.

## Accepted Minimal Identity Direction

Owner decision, 2026-09-17: use modmod as the initial model. An app may have no custom identity palette; when useful, start with one color and add up to two more only for distinct, app-specific purposes. Do not manufacture semantic roles to fill slots. Each color has an explicit meaning/use and can map into an appropriate MUI theme role or a direct identity accent. Derived states, neutrals and ordinary MUI defaults do not count as independent brand colors. This compact scope supersedes any implication in earlier research that every app needs full brand families/tones.

The initial demonstration uses modmod's magenta mapped to primary actions, while preserving ordinary MUI colors. It is a reference model, not acceptance of magenta as Alexa branding. Schema 0.9 separates identity from supporting color tables. Existing broad research remains optional background, not required palette scope.

## Purpose And Scope

Turn a product description, UX direction and owner preferences into a concrete, coherent visual foundation that can be reviewed and refined before individual scenes are designed. Maintain a living Markdown document in the supplied documentation folder. It should be useful from a partial brief and remain explicitly incomplete where decisions are missing.

The first implementation delivers the design-language document and a precise handoff for later component and composition work. This first stage includes foundation specimens and individual component examples; comps for complex components as well as screens, windows and dialogs are reserved for a following composition stage. SVG specimens remain the selected visual direction; document their scope and rendering needs. This Markdown increment does not itself satisfy the complete product-development skill's previously agreed rendering requirement.

## Required Features

### 1. Bootstrap And Resume

Accept a target documentation folder, product/UX sources, existing design-language document if present, and the requested focus. Owner preferences, references, brand assets and existing tokens are optional inputs. Do not require a complete UX JSON file to begin; use the available brief or working specification and identify the sources.

Use the supplied design base folder and maintain one human-facing `design-language.md` at its root. Update that same file on later calls; if an equivalent existing document is supplied, reuse it rather than creating a duplicate. Store supporting JSON and SVG artifacts in `design-language/`, with relative image links from the Markdown. Read existing decisions before proposing changes. Support a whole-foundation pass or a focused revision such as typography, density or color. Do not create a new competing report on each invocation.

### 2. Establish Product-Specific Visual Direction

Describe the intended visual character, information density, emphasis and hierarchy in plain language grounded in users, tasks and owner direction. Explain consequential choices briefly. Prefer one coherent recommendation with alternatives only where a meaningful owner decision remains.

Preserve product-specific needs such as frame/time readability, dense editing surfaces or long labels when supported by the input. Missing requirements remain visible; do not infer a whole product workflow from visual conventions.

### 3. Propose Concrete Foundations

| Category | Required first-pass detail |
| --- | --- |
| Typography | Font families/fallbacks, semantic text roles, sizes, weights, line heights and relevant letter spacing; numeric treatment where needed. Prefer Google Fonts for new proposals. |
| Color and branding | Semantic text/surface/action/status/focus/selection roles with proposed values; separate branding roles for app identity. Describe the chosen theme scope without requiring multiple themes. |
| Iconography | Central inventory of required icons, semantic meaning, selected asset/family, style and size conventions, and proposal/acceptance status; a shared SVG review sheet. |
| Spacing and density | Named spacing scale, container padding, component/group gaps, and intended density. |
| Layout conventions | Grid-led region layout, alignment, grouping, small Flex groups where appropriate, and relevant resizing/overflow guidance. |
| Component metrics | Relevant heights, padding, icon dimensions, hit areas, borders, radii and elevation, grounded in the initial MUI/base-component set. |
| States and accessibility | Shared visible focus, disabled, selected, error and loading treatment; contrast/non-color cues, text scaling and keyboard/focus expectations appropriate to this scope. |

For each meaningful value, give a stable semantic name, value/unit, intended use, status and source or rationale. Keep shared values centralized; components reference them rather than duplicating divergent values. Explain product-facing roles in the main tables. Exact MUI/CSS mappings may appear in a compact implementation-handoff section when verified; do not invent framework variable names.

Proposed fonts/colors do not become accepted branding automatically. Distinguish verified font availability, licensing or contrast measurements from checks still needed. Static documentation does not establish runtime accessibility.

Branding should be modeled as a coordinated palette that supplies specific UI uses, rather than a single accent value. The [brand-palette research](brand-palette-research.md) proposes families/tones, role mappings and separately identified variants. Slice 2b now implements one named palette and direct color-role mappings in schema 0.3; generation and variant choices remain open.

Application themes likewise form named reusable combinations of palette mappings, typography, spacing/density and component treatments, with explicit supported variants. See the [application-theme direction](brand-palette-research.md#application-themes). Slice 2b implements the initial color-mapping portion for one named application theme. Broader typography/density composition and variant resolution remain later capabilities.

### Accepted Foundation Coverage

Owner decision, 2026-09-17: adopt the additional design categories identified through Atlassian's foundations, while retaining our existing document sections and engineering rules. The accepted change is coverage, not Atlassian's metrics, visual identity, assets or implementation APIs.

| Existing document section | Decisions to cover |
| --- | --- |
| Spacing And Layout | Reusable spacing scale; density; internal padding, group gaps and region separation; optical alignment; shared alignment; fluid versus bounded regions; resizing, wrapping and overflow. |
| Shape And Surfaces | Radius families and intended uses; border width/color roles for separation and interaction; surface hierarchy; coordinated elevation/background/shadow treatment across supported themes. |
| Iconography | Recognizable meanings; consistent family/style; glyph sizes, optical alignment with text and distinct activation areas; existing central asset inventory and source preference. |
| Shared States | Apply the shared border, focus, surface and icon conventions to relevant states; keep focus and selection distinct. |

For each relevant category, record app-specific choices and their acceptance status, a small annotated specimen when supported and useful, and unresolved requirements. Rendering defaults remain explicitly provisional. Mark a category not applicable with a reason when appropriate; omission must not imply a completed decision. Existing typography and color/theme coverage continues unchanged.

Schema 0.7 can carry brief spacing/layout and shape/surface proposals in its existing prose notes. It cannot yet represent every category as independently tracked structured values or render dedicated specimens for them. Keep these coverage and rendering gaps explicit; do not invent schema fields, claim new renderer support, or promote sample password metrics into app-wide decisions. See the [current skill contract](../../skills/refine-design/references/design-language.md) and [source/adoption notes](ui-research.md#atlassian-foundation-coverage).

Owner decision, 2026-09-17: MUI applications inherit their installed-version palette defaults for ordinary UI colors, preserving app overrides and separate branding. Record mode, source tokens and preview alpha-compositing surfaces. See the [MUI baseline workflow](../../skills/refine-design/references/design-language-mui.md).

### 4. Identify The Initial Component Vocabulary

Owner clarification: the password specimen is useful as a renderer preview, but need not appear in every basic design-language document. Keep renderer capability separate from document inclusion. Favor a small set of basic component examples that demonstrates shared styling; choose specialized components and their exact size when needed in a comp. Owner-accepted initial examples: button styles including an icon button, an ordinary text field with label/helper/error treatment, and a select/dropdown. Add checkbox/radio/switch examples when relevant. The password specimen remains an optional preview, not a required section. See [primary-source research and accepted document contents](design-language-content-research.md). Schema 0.7 now organizes the output by these accepted topics, supports independent basic embedded-button and detailed password-preview selection, and names missing basic specimens explicitly. Its source still retains the password definition; arbitrary component/section selection remains future work.

Reference the existing app-creation base components as the starting library. Record which components/variants matter for the current product, their shared presentation conventions and any needed custom components. Avoid designing the entire MUI catalog.

Use a small set of representative components to make foundations concrete. For a specialized component, describe the design needs and link to future component-design work rather than silently inventing its behavior. Missing renderer support can use a labeled component placeholder.

### Preferred Icon Source

Owner decision: begin with MUI Material Icons (`@mui/icons-material`). Search this set first for each required meaning. Evaluate another source only when a concrete requirement is not adequately served; record the gap and rationale for the exception. Do not preselect secondary libraries.

Use the [official MUI icon catalog](https://mui.com/material-ui/material-icons/) to identify exact assets. MUI provides SVG-based React icons in Filled, Outlined, Rounded, Two-tone and Sharp variants; its default is Filled. Record the exact exported name and variant rather than infer an asset from a semantic label. See [official icon guidance](https://mui.com/material-ui/icons/).

For Slice 4, propose Filled as the initial demonstration style while keeping the product's style choice explicit and reviewable. The owner's source preference does not accept individual icons or establish every app's visual variant. Keep a consistent family/style within each design; explain intentional exceptions.

Keep semantic IDs (such as playback-play) separate from asset identities (such as PlayArrow). Retain package/version, exact export, source/license provenance, intended meaning and size/color references. Render specimens from the actual SVG geometry, preserving viewBox and any opacity, rather than drawing lookalikes or relying on an icon font. Pin the source version when implementing the asset catalog.

If MUI lacks a suitable icon, keep the semantic requirement in the inventory with a labeled placeholder and an unresolved choice. A missing local renderer asset is a packaging gap, not evidence that MUI lacks the icon. External sources or custom designs can be considered when the actual semantic or visual gap is established.

#### Required Icon Inventory

Maintain required icons in one design-language section so the owner can review them together rather than discovering choices across individual comps. Derive the inventory from known actions, navigation, statuses and component requirements; expand it as UX evolves. Each entry has a stable semantic ID, meaning/intended use, source asset name and family/version or custom SVG reference, relevant variants, size/color token references, and decision status. Record source/licensing verification where applicable without selecting an icon library implicitly.

Provide a labeled SVG icon sheet linked or embedded here, showing the proposed icons at intended sizes with their semantic names and meaningful variants. Record pending previews explicitly. Keep visual style consistent across the set, including filled/outlined treatment and stroke weight. Include accessible naming intent for meaningful icons and identify decorative uses where known; the same drawing may have different accessible labels in different contexts.

Comps reference these shared semantic icon IDs and reuse the selected assets. A missing choice remains in the inventory and missing-requirements list, with any provisional asset or labeled placeholder identified. Replacing an accepted icon updates the central decision and marks affected comps stale. Central review complements checking legibility and meaning in context.

### 5. Preserve Missing Requirements And Rendering Defaults

A computable derived color does not require an independently specified value. Where a shared theme/component rule supplies the derivation, reference the base and rule and show the resolved specimen. Treat only missing inputs or derivation rules as gaps; see [derived colors](brand-palette-research.md#derived-colors-are-not-missing-colors). Formula execution is not implemented in the current direct-reference renderer.

Include an explicit missing-requirements table: missing decision, affected values/components, provisional rendering default if any, default source, decision owner and downstream impact. Fonts, padding and line spacing may use recorded defaults to enable previews; they remain missing requirements until decided.

Distinguish:
- Accepted decisions.
- Proposed product choices awaiting review.
- Provisional defaults used only to permit rendering.
- Unresolved requirements with no usable default.

A renderable document is not necessarily a complete or accepted design. Avoid asking about every small value before offering a coherent first proposal. Ask focused questions for consequential direction, and retain nonblocking gaps for later passes.

### 6. Define Representative SVG Specimens

Identify a bounded specimen set: a typography sample, semantic color swatches, a labeled required-icon sheet, spacing/component metrics and a small component-state sheet as relevant. State what each specimen demonstrates and the values, states and assets it consumes.

Link or embed SVGs when actually produced; otherwise label each as awaiting rendering and retain its request/specification. Never imply that a listed preview has been rendered or visually checked. Annotated specimens should expose the current editable design defaults and any alternatives under review. Dedicated comps belong to components whose product-specific use cases/states need explanation beyond familiar conventions, as well as larger interfaces. State count or visual complexity alone is not the criterion; ordinary dropdown states can remain design-language specimens. Required icons and special typography roles remain centrally reviewable in the design language, while the component itself has its own comp showing those choices and its behavior in context. A complex component can be assembled from smaller components and custom drawing regions, then reused as a versioned component design.

### 7. Support Iterative Review And Handoff

Preserve stable names/IDs, owner decisions and important rationale. Record a concise change summary for the current revision. A request to change density should identify affected spacing/component values and specimens while preserving unrelated choices.

Do not overwrite an accepted value with a proposal without making the proposed change explicit. Integrate approved choices into the maintained tables and remove resolved entries from the active missing/open lists. Mark affected visuals or downstream scene specifications stale.

The handoff identifies shared values, selected component variants, scoped exceptions, unresolved requirements and specimen/render needs. Future structured tokens/specifications should be derived from or synchronized with these decisions, with one authoritative value source.

## Markdown Output

Prefer SVG specimens embedded as Markdown images for presentation that Markdown cannot express, including color swatches, font-family samples, font sizes/weights, line spacing, icons and component/layout examples. Store the SVGs as supporting files and reference them with relative image paths, for example `![Typography specimens](../../planning/implementation-agents/specimens/typography.svg)`. This uses the same visual format as component templates and comps. Keep values, semantic names and decision status readable in the accompanying Markdown tables.

The owner will review outputs in VS Code, both as standalone SVGs and embedded in Markdown preview. Use these as the target review surfaces and verify the generated artifacts in both.

Embedded HTML remains permitted when useful, but is not the default mechanism for visual specimens. Prefer referenced SVG image files over requiring inline SVG markup in the Markdown; verify support in the chosen document viewer. SVG typography still needs a defined font-packaging strategy to reproduce selected fonts, so do not assume SVG alone guarantees font fidelity. Record unverified rendering limits. Exact packaging of styles and font assets remains an implementation choice.

Proposed document structure:

```markdown
# [Product] Design Language

Revision, scope and status:
Input sources:

## Visual Direction
Users/tasks, character, density, hierarchy and rationale.

## Typography
Role | Family | Size | Weight | Line height | Status

## Color And Branding
Role | Value | Use | Status

## Required Icons
Semantic ID | Meaning/use | Asset/family | Variants | Size/color tokens | Status
Shared SVG icon sheet or explicitly pending preview.

## Spacing And Layout
Token/convention | Value | Intended use | Status

## Component Foundations
Component/variant | Metrics and shared token references | States | Status

## Shared States And Accessibility
Shared treatments, requirements and verification still needed.

## Visual Specimens
SVG links or explicitly pending specimen requests.

## Missing Requirements And Provisional Defaults
ID | Missing decision | Affects | Rendering default/source | Owner | Impact

## Handoff And Revision Notes
Downstream references, affected artifacts and concise changes.

## Open Questions
Prioritized owner questions, referring to missing-requirement IDs.
```

Keep consequential product and UX questions at the end. Do not add spacing, typography, color, or other usable design defaults merely because they can be changed. Avoid duplicating the same missing decision in prose and tables; use IDs and references. The PRD's upfront Basic Design Language section summarizes and links to this document, while current defaults are also reflected in the human-owned product description.

For this first Markdown-focused increment, its value tables can be the maintained authority until structured tokens are introduced. If authoritative token files already exist, reference those files and keep Markdown values synchronized as a human-readable view; do not establish a competing catalog.

## First-Pass Acceptance Checks

- A partial brief produces a concrete, readable design with current editable defaults separated from missing product or UX behavior.
- An existing document can be refined in a bounded area without losing accepted decisions or changing unrelated values.
- Values have usable units/roles and consistent references; defaults remain traceable.
- The document uses the existing component vocabulary and preserves relevant owner/UX requirements.
- SVGs are either linked as produced artifacts or explicitly recorded as pending, with no false rendering or verification claims.
- Open Questions appear last and focus on consequential unresolved decisions.
- The output is saved to the requested documentation location, linked from the PRD when available, and its current defaults are reflected in the product description.

## Implementation Questions To Resolve

Determine the invocation and persistence owner (parent/skill versus UI role), minimum structured data emitted alongside Markdown, the first renderer-backed specimen scope, and how accepted/proposed replacements are represented without making the document cumbersome. The current read-only UI role can propose content; persistent writes and rendering must be assigned explicitly when implementing the workflow.

## Single-selection select slice

Schema 0.13 extends the shared Input Guidance And Feedback pattern to a bounded MUI-style select. The component reference shows closed, open, focused, disabled and error states at two widths; selected and keyboard-active options are distinct, and disabled options remain visible. Runtime menu placement, viewport fitting, scrolling, labels/descriptions and keyboard behavior are explicit handoff requirements. Search and multi-selection remain deferred. Missing metrics still render with disclosed defaults and prevent acceptance of dependent choices.

## Button variants and unsupported components

Schema 0.14 adds outlined, text and icon-only button specimens alongside contained commands. They share command typography, measured text widths, height, focus treatment and theme roles; icon targets use a circular shared-height frame and bundled icon geometry. Naming and tooltip intent are explicit. State shades use derivations rather than extra identity palette members.

Unsupported component requests can be represented by dimensioned, labeled SVG placeholders drawn from the UI specification. Their missing renderer requirement remains unspecified in source and review output. The first pass places them in components.md; full comp assembly and replacement by a future real component template remain separate work. See the [contract](../../skills/refine-design/references/design-language-extras.md).

## No-prerequisite entry requirement

Owner clarification: the skill has no product-planning prerequisites. It must start with a rough description or no description, using disclosed defaults and unresolved requirements. Missing specialist availability permits an honest parent assessment; no prior UX inventory, branding, framework choice or component list is required. Renderer-required fields are internal concerns, not user homework. The current supported sparse path builds schema 0.4 foundations using design-language-start.mjs and renders colors/typography without unrelated product components. The full schema 0.14 catalog remains available when relevant. Optional component composition and a shared richer document format remain improvements; their absence does not prevent a useful first output.

## Accepted focused review-page format

The owner accepted an iterative first pass with design-language.md as a short front-page index. Separate colors, typography, layout, icons and components pages appear only when useful; decisions.md owns detailed defaults, provenance and question history. Lead with visuals and place concise metrics/status alongside them. Avoid duplicate palette/theme presentations and technical audit detail in the main review flow. Missing pages or decisions are not prerequisites. The renderer persists this presentation choice independently of design decisions and protects existing notes during migration.
