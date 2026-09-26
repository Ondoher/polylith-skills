# Source-bound information outline

Use this mode after a current UI composition pass has produced a persisted PRD
context with its source-bound UX, UI scenes, design language, and publication
manifest. It does not replace a current PRD, choose document entry points, or
choose HTML pages. The same `document-structure` agent may make those choices
in a later, separately reviewed pass. Historical outline trials made before
the UI pass are development evidence, not publication inputs.

1. For a repository-backed context, resolve the current product snapshot and
   description source against the context's `sourceSnapshot` and `provenance`
   bindings. If they changed, ask the producing refinement workflow for a
   fresh validated context. A detached context can still be outlined from its
   immutable binding, without claiming a live-source check. Follow the
   consuming repository's instructions and formatting rules.
2. Run `node scripts/prd-outline.mjs prepare --context <context.json> --output
<source-index.json>`. This validates the context and decodes its eligible
   product and artifact information into exact, source-referenced units. UX
   use-case steps and alternatives have child references and `parentRef`; the
   parent value omits those separately indexed fields. Keep the index beside
   the resulting outline in the product support area.
3. Invoke a fresh read-only `document-structure` agent with the prepared index
   and an explicit **outline-only** assignment. Its role contract is
   [document-structure.md](../../../planning/implementation-agents/document-structure.md).
   Require its single closed JSON response. The agent owns grouping; the skill
   and producer must not prearrange the outline or infer document boundaries.
4. Save the response as `outline.json`, then run
   `node scripts/prd-outline.mjs render --context <context.json> --outline
<outline.json> --output <outline.md>`. This recomputes the index from the
   exact context and checks the binding, source coverage, duplicate placements,
   and response shape before writing a Markdown review view. Return specific
   diagnostics to the agent for correction rather than inventing placements.
5. Format edited Markdown with the consuming repository's local formatter.
   Present the outline, visible source gaps, and coverage count for owner
   feedback. Keep the JSON response and index so later revisions can be
   checked against the same exact inputs.

If the validated context omits accepted source information needed for this
inventory, make a product-neutral output-contract change in `refine-design`,
check it with unrelated synthetic input, and obtain a new context. Do not
encode the consuming product's areas or example facts as shared defaults.
