# Brand Palettes And UI Color Usage

Status: primary-source research and proposed design-language evolution, 2026-09-17. The owner identified branding as a palette from which more specific treatments can be developed. This note proposes how to represent that; it does not select Alexa colors or implement a new schema.

## Accepted Minimal Identity Direction

Owner decision, 2026-09-17: use modmod as the initial model. An app may have no custom identity palette; when useful, start with one color and add up to two more only for distinct, app-specific purposes. Do not manufacture semantic roles to fill slots. Each color has an explicit meaning/use and can map into an appropriate MUI theme role or a direct identity accent. Derived states, neutrals and ordinary MUI defaults do not count as independent brand colors. This compact scope supersedes any implication in earlier research that every app needs full brand families/tones.

The initial demonstration uses modmod's magenta mapped to primary actions, while preserving ordinary MUI colors. It is a reference model, not acceptance of magenta as Alexa branding. Schema 0.9 separates identity from supporting color tables. Existing broad research remains optional background, not required palette scope.

## Findings From Primary Sources

| Category | Finding | Source |
| --- | --- | --- |
| Brand identity | IBM uses a core blue family, supporting families and neutrals, with guidance on combinations and emphasis. Its palette includes light-to-dark steps. The exact number of families, tones and permitted combinations is IBM-specific. | [IBM Design Language: Color](https://www.ibm.com/design/language/color/) |
| Roles and themes | Carbon separates available colors from role-based tokens. Theme values change, while the role's meaning stays stable. | [Carbon color overview](https://carbondesignsystem.com/elements/color/overview/) |
| Derivation | Google's documented dynamic-color process builds tonal families from source colors, then maps them into schemes. It illustrates reproducible generation; it does not establish a requirement for our app to use dynamic color or Google's complete palette size. | [Android dynamic colors](https://developer.android.com/develop/ui/views/theming/dynamic-colors) |
| Semantic use | Atlassian distinguishes role, emphasis and interaction state in its tokens. Brand, neutral and feedback meanings are distinct; an arbitrary accent should not replace a meaningful status role. | [Atlassian color foundations](https://atlassian.design/foundations/color/) |
| MUI integration | MUI's primary/secondary palette entries support main, light, dark and contrastText values; it also defines feedback roles, custom colors and scheme-specific values. These are useful implementation destinations, not a complete brand specification. | [MUI palette](https://mui.com/material-ui/customization/palette/) |
| CSS integration | MUI exposes theme values as CSS custom properties. Our eventual mappings should consume those shared values under the existing CSS-owned styling rules. | [MUI CSS theme variables](https://mui.com/material-ui/customization/css-theme-variables/usage/) |
| Pairing and contrast | Contrast is assessed between foreground and background, not by approving an isolated swatch. Ordinary text generally needs 4.5:1; large text has a 3:1 criterion. The logo exception does not exempt general branded UI text. | [W3C contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) |

These sources support a palette -> role mapping -> usage structure. The following compact model is our synthesis, not a universal standard or a requirement to copy a particular design system.

## Proposed Brand-Palette Contents

Start with a deliberately small set:

- A core identity color family, including the exact brand anchor if one is supplied.
- Supporting families only where the product needs them, each with an intended purpose.
- A neutral family for text, surfaces and boundaries, which may be neutral or subtly brand-tinted.
- Named lighter/darker steps sufficient for the uses being designed. Do not require ten or thirteen steps up front.
- Usage guidance: where brand emphasis belongs, where quieter treatments are needed, allowed combinations and relevant exceptions.
- Explicit foreground/background pairings for applied treatments, with contrast checks and their status.

Keep feedback meanings such as success, warning and error separate from brand identity decisions. They can be coordinated visually without becoming arbitrary brand accents. A fixed logo color can coexist with adjusted UI values when legibility requires it.

Do not impose a universal number of colors, a fixed percentage rule or a claim that a particular hue always communicates the same emotion. Those choices need product context and owner direction.

## From Palette To Specific Usage

Use three layers of references:

| Layer | Example names (illustrative) | Responsibility |
| --- | --- | --- |
| Palette family and steps | brand.core.soft, brand.core.base, brand.core.strong, neutral.canvas | Available color values and their provenance |
| Applied role mappings | action.primary.background, identity.header.background, selection.background, text.on-brand | Intended use and foreground/background pairing in a selected scheme |
| Component or surface treatment | primary action default/hover, outlined action, selected navigation, branded header | How shared roles are combined in a particular context |

For example, the same core family might provide a strong primary-action background, a pale selected-region background and a border treatment. Those uses reference different members of the family and have independently checked foreground pairings. A header can have its own identity role when it does not fit an ordinary action/surface role. This preserves the owner's earlier requirement for app-identity colors.

An accepted palette does not automatically approve every use, variant or contrast pairing. Conversely, adding a derived use should not silently change the underlying brand anchor.

## Clarify What Variant Means

1. **Palette variant:** an alternative coordinated expression of the identity, such as restrained versus vivid. It can adjust supporting families or tonal choices while retaining explicit brand constraints.
2. **Color scheme:** a mapping for light/dark or another supported presentation context, maintaining stable role meanings.
3. **Component variant/state:** filled/outlined/subtle treatments and hover/pressed/selected states that consume the role mappings.

These are separate dimensions. Supporting one does not require implementing all of them. The first extension can use one brand palette and one scheme with a few usage mappings; additional variants can follow actual product needs.

## Application Themes

The same reusable-definition approach applies to application themes. A theme is a named, versioned combination of design-language choices: color-role mappings, typography, spacing/density, surface/border/elevation treatment and applicable component defaults. A brand palette is one input, not the whole theme.

MUI's theme configuration includes palette, typography, spacing and component customization, supporting this broader scope. See [MUI theming](https://mui.com/material-ui/customization/theming/). Our model should preserve CSS-owned styling and shared theme variables rather than scatter theme choices across component code.

Proposed structure: shared brand palettes and visual foundations -> named application theme -> explicit scheme/variant overrides -> component uses. For example, an app might use the same identity palette with light/dark color mappings and comfortable/compact density options. These examples do not require us to implement every combination or tie dark mode to a particular density.

A theme references stable shared definitions and records its supported options, explicit overrides and unresolved requirements. Different themes may share a palette or typography family while differing in their application. Variant resolution should have an explicit base and override order; missing values can use documented provisional fallbacks without becoming accepted choices.

Review each theme as a coherent selection in the design-language document. Shared definitions appear once; show the theme's mappings, differences and relevant specimens together. Render requests identify the exact theme and relevant scheme/variant so repeated rendering is reproducible.

This adds a design direction, not an implemented theme engine. Define supported combinations, inheritance and acceptance behavior through bounded later slices. Keep palette variants, color schemes, density options and component states distinct rather than treating every variation as a new independent theme.

## Derived Colors Are Not Missing Colors

Owner direction: a color that can be determined from another value through an established derivation does not require a separately specified literal color. For example, a disabled treatment may follow the selected theme or component convention.

Distinguish three cases in future contracts:
- An explicit color value.
- A derived value with a base reference and a known rule.
- An unspecified value for which neither a literal nor a sufficient derivation has been established.

A derivation can come from an applicable shared theme/component rule rather than being restated for each use. Record or reference that rule so the result remains reproducible. The UI agent should not invent a transformation simply to eliminate an open question. A missing base, rule or required context remains an unresolved dependency.

In the design-language document, show the derivation and its resolved swatch where possible, instead of requiring another independent color decision. Recompute dependent output when the base changes. Accepted derived uses retain the same protection against unapproved effective-value changes as accepted direct mappings.

Disabled appearance is an example of a potentially derived treatment, not a universal rule to lighten a color. If a rule uses opacity or compositing, preserve the relevant background and other required context. A generated color is not automatically proof of adequate contrast.

This is guidance for a later extension. Current schema 0.3 supports direct palette references; it does not yet execute color formulas. Do not encode derived values as unresolved fallback colors merely because they lack independent hex values.

## Generating And Reviewing Derivatives

The UI agent can propose families, values and mappings based on owner direction. A deterministic generator may help construct ramps; if used, retain its seed inputs, method/version and any deliberate overrides. Save the resolved values so a rerender does not produce a new palette creatively.

The renderer should draw those supplied values and relationships. It should not independently invent a variant, change a fixed brand color or mark derived values accepted. Missing family members or mappings may use explicit provisional defaults while remaining unspecified.

Review the palette as coordinated families, followed by compact examples of foreground/background pairs and intended uses. Contrast validation belongs to the applied pairs. Mathematical lightening/darkening or a framework-generated contrasting text value is not, by itself, proof that every UI use is suitable.

## Subsequent Implementation

The bounded family-plus-role-mapping increment is now implemented as [Slice 2b](design-language-slice-two-b-review.md): one named palette, one named color theme, direct references, explicit fallbacks and dependency-aware acceptance. Broader variants and generation remain open. The research and initial proposal below explain the motivation; the implementation evidence records current scope.

## Implications For Our Skill

The existing Slice 2 renderer can display multiple entries categorized as branding. It currently stores a flat list: it cannot represent palette membership, derivation, aliases or alternative mappings. The single missing brand-accent fixture was a test case, not a claim that a brand has one color.

Proposed next increment, before treating branding as complete:

- Add a named brand palette with stable family/member IDs and proposal/acceptance status.
- Add role references to palette members rather than copying hex values into every use.
- Render compact grouped swatches in the same design-language Markdown, followed by a small role/pairing table.
- Keep defaults and unresolved decisions explicit at the member or mapping level.
- Test that updating a proposed member updates dependent uses, accepted choices are protected, and missing/invalid/cyclic references produce diagnostics.
- Map ordinary UI roles onto MUI theme roles/CSS variables where appropriate, retaining separately named identity roles for product-specific branding.

The current flat branding-versus-semantic category is insufficient for these relationships: a brand palette member can supply a semantic UI role. Treat palette origin and applied meaning as separate concepts in the next schema.

No runtime code or existing fixture has been changed by this research. Palette-generation algorithm, tone count, variant scope and approval granularity remain design choices. A bounded family-plus-role-mapping slice is preferable to committing to a full automatic theme engine now.
