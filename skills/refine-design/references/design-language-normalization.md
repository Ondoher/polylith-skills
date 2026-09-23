# Repeatable Design-Language Interpretation

Two independent agents given the same durable inputs, installed skill version, framework evidence, and saved design source should produce the same material design decisions. Material results include IDs, values, statuses, affected scopes, unresolved requirements, and renderer inputs. Do not rely on an agent's taste when a shared resolution exists.

Use this precedence:

1. An exact current owner value or accepted decision.
2. An explicit normalized value already present in the product description or saved design source.
3. A matching named preset in `design-language-normalization.json`.
4. A verified target-framework default already supported by the design-language workflow.
5. For an unknown qualitative color term, perform the bounded research procedure below and persist the selected exact value and sources.
6. Preserve any other uncovered requirement as unresolved and use the existing disclosed rendering fallback.

Later evidence wins only when it has equal or stronger authority. A vague later phrase does not silently replace an exact owner value. When a phrase clearly selects a named preset, copy that preset's values, labels, purposes, rationales, and scope. A field ending in `Template` permits only the named placeholder substitutions it contains, such as replacing `{appName}` with the durable product name. Do not create a nearby alternative. When no single preset clearly applies, keep the ambiguity explicit or ask only if it blocks useful progress.

Qualifiers use the existing design's scale. `slightly` and `a little` mean one smallest documented adjustment for that property. A preset may define the adjustment directly when splitting a spacing unit across two sides would otherwise be ambiguous. `tighter` or `looser` moves one existing token step, bounded by the current scale. These rules do not override exact dimensions.

For a vague or named color with no exact owner value, saved normalization, preset, or normative CSS value, bounded online research is allowed. Prefer stable standards or original design-system sources when they define the term; otherwise compare more than one established reference when practical. Color naming is cultural and sources may disagree substantially, so do not imply universal consensus, average unrelated values, or conceal the disagreement. Select one defensible value as the current editable default, state which source/convention it follows, retain materially different candidates when they help review, and keep the owner's ability to replace it with an exact value explicit.

Before rendering, persist the selected hex value, role, research source, and any material ambiguity in the product description or durable design evidence. Later agents reuse that exact saved interpretation rather than repeating the search. If the interpretation is broadly reusable, it may later be promoted to the versioned preset registry through the normal skill-maintenance path. A preset may separate a familiar light color from an interaction-safe primary treatment. A researched or preset value remains a design default, not evidence that the owner accepted every mapped role. A later explicit user value always wins.

After normalization, rewrite the human-owned product description with the explicit values and scope so later agents do not need to reinterpret the original phrase. Preserve the original meaning, but remove superseded loose notes. Record preset IDs or researched color sources in the refinement evidence. The generated proposal still uses normal source provenance: `ui-designer` for an actual named-role response and `parent-assessment` otherwise.

Exact explanatory prose can vary outside preset-owned fields, but it must not change meaning. Deterministic rendering guarantees byte stability only after the structured proposal is fixed. If byte-identical first-pass proposals become necessary, add a mechanical intent-to-proposal compiler rather than trying to enforce identical free-form model wording.
