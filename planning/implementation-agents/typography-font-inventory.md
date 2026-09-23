# Initial Typography Font Inventory

Owner-supplied repositories, inspected 2026-09-17, provide the initial Google Fonts candidate set for design-language Slice 3. These are references for exploration, not accepted Alexa font choices or a mandatory library.

| Family | Repository / observed use | Declared weights and styles | Loading |
| --- | --- | --- | --- |
| Roboto | poly-gc-react general UI; modmod general UI | 100, 300, 400, 500, 700, 900; normal and italic | Local WOFF2/WOFF declarations, filenames identify v30 |
| Merienda | poly-gc-react Mahjong UI via --mj-ui-font-family | 400, 700 | Google Fonts CSS import |
| Comic Neue | music-notebook notebook text via --mn-font-notebook | 400, 700; normal and italic | @fontsource/comic-neue imports |
| Gluten | poly-gc-react 3D asset font definition | 800 normal | Google-hosted TTF referenced by CSS |

Weights above describe these repositories, not the families' full available ranges. The Gluten declaration belongs to the asset pipeline; it is not evidence of general application UI use. Music-notebook also declares Roboto in its application font stack; this inventory did not establish a corresponding Roboto asset load there. System fallback fonts and music-symbol fallback stacks are not counted as loaded Google Fonts.

## Use In The Typography Slice

Use this small candidate set to explore body, heading and distinctive product typography. Preserve separate application and feature/component typography roles where needed, as illustrated by the notebook and Mahjong styles. The owner has not chosen an Alexa family or pairing.

Record exact asset identity, weight and style when producing specimens. Repository loading methods are evidence, not a selected renderer strategy. SVG rendering must demonstrate the intended font in the review viewer or explicitly report substitution; neither a family name nor a CSS import proves fidelity. Keep readable typography values in Markdown if specimen text is outlined.

No fonts copied, renderer changes made or visual suitability assessment completed by this inventory. Font asset packaging and the SVG fidelity strategy remain Slice 3 decisions.

## Initial Serif Candidate

Owner decision: use **Merriweather** as the initial serif for Slice 3 typography exploration. The owner accepted it as good enough to start with; other serif families can be considered later. This selects a specimen candidate, not Alexa's application font.

Google's [family description](https://github.com/google/fonts/blob/main/ofl/merriweather/DESCRIPTION.en_us.html) describes it as designed for screen reading, with sturdy serifs and open forms. [Google Fonts specimen](https://fonts.google.com/specimen/Merriweather).

Popularity qualification: the current Google Fonts popularity ordering could not be verified in this research pass. Do not label Merriweather the single most-used serif as an established fact. It is a practical initial candidate; an exact popularity ranking remains unverified. Inspect actual font assets and available styles before implementing specimens.