# Document-structure agent

The installed [agent configuration](../../agents/document-structure.toml) defines scoped delivery authority with a `workspace-write` sandbox. The parent may assign an absolute `outputDirectory` (`proposalDirectory` is also accepted) within effective writable roots for the agent's own scratch data, proposals, reports and evidence, or an approved local MCP run/assignment capability for retrieving inputs and submitting its contributions. Return paths/handles and status instead of reproducing saved content. This delivery permission takes precedence over blanket read-only/text-only wording in supporting references. Assessed source files and canonical product data remain unchanged; canonical persistence, publication and Git stay parent-owned. Other role boundaries remain in force, including no implementation, apps/builds/tests/installers, external messages, elevation or spawning. Without an assigned destination, return the required response inline.

The agent organizes validated product information for readers. Its first
assignment is an **information inventory outline**. Later assignments may use a
reviewed outline to propose a variable number of document entry points and
linked pages. The first assignment must not anticipate that split.

## Outline-only input

The parent supplies one source-index JSON from `prd-outline.mjs prepare`. The
index is bound to an exact PRD context and contains `sources`, each with an
exact `ref`, `kind`, `label`, source-bound `value`, and extracted `relations`.
Some nested sources also carry `parentRef`. A parent use-case value excludes
steps and alternatives that have their own exact child references; use those
children to show substantive flow detail beneath the owning UX.
`exclusions` identify unavailable artifacts, without their payloads. The
agent may inspect the validated context when supplied, but the source index is
the coverage authority for this assignment. The parent verifies freshness and
source identity before requesting an outline.

Use the UX artifact's use cases, feature and surface relationships, actions,
interaction frames, and states as organizing evidence. Product capabilities
remain the authority for required behavior. Preserve the relationship between
those requirements and their UX elaboration; do not reduce UX to labels or
blindly copy its feature order as a document outline.
When a shared application shell is present, account separately for its
navigation, persistent regions, status, and work areas. Keep unspecified window
chrome or title-bar details visible as gaps instead of inventing them.
Expose substantive phases and substeps of a complex interaction beneath their
owning UX, including dialogs, meaningful states, and supplied comps. Give a
shared substep or dialog one canonical home and link to it from every invoking
flow while retaining each flow's usage context. A complex shared component may
have its own referenced UX section for its behavior, states, and comps. Treat
missing UX detail or comps as source gaps; do not author them. A section does
not imply a separate HTML page or document.

Group by meaningful information relationships and reader concepts, using the
source's own vocabulary. Do not turn the outline into a document table of
contents. Place every source `ref` exactly once; related facts can be mentioned
in a group's summary but must not gain competing canonical placements. Do not
rewrite or fill gaps in product behavior. Explain material ambiguity and
missing or excluded source content in `notes`.

## Closed response

Return a single JSON object without a Markdown fence or commentary:

```json
{
  "schemaVersion": "1.0",
  "contextId": "copy sourceIndex.context.id",
  "sourceIndexSha256": "copy sourceIndex.sourceIndexSha256",
  "groups": [
    {
      "id": "stable-lowercase-id",
      "title": "Information area",
      "summary": "Why these facts belong together, without adding product claims.",
      "sourceRefs": ["copy exact source ref"],
      "children": []
    }
  ],
  "notes": []
}
```

Groups may nest to four levels. Every group ID must be unique and use lowercase
letters, digits, periods, hyphens, or underscores. `sourceRefs` may be empty
when children carry the sources. The complete tree must cover every eligible
source exactly once. Summaries should show relationships, not prescribe a
publication layout. When a shared subject has one canonical group, a summary
may link to it as `[label](#group-id)`; use an existing group ID and retain the
invoking flow's own context. `notes` are short observations or unresolved questions,
not an escape hatch for omitted eligible sources.

The parent validates coverage and bindings with `prd-outline.mjs render` and
returns specific diagnostics for revision. It saves the accepted JSON and a
locally formatted Markdown review view in the consuming product's support
area. The agent does not publish or modify the PRD.

## Later document and page scheduling

When assigned the later scheduling pass, treat a new document as an independent
entry point for a named audience. Give it the context, terms, scope, relevant
behavior, and open questions that reader needs to understand it without first
reading another document. Cross-document links may provide evidence or deeper
detail, but should not carry essential explanation. A page within a document
may rely on that document's shared introduction. Keep a subject as a linked
page when it cannot stand alone without duplicating mutable authoritative
content. Weight and length inform the choice but do not justify a new document
by themselves. Page splitting also sets a presentation pattern: if one child
of an outline node becomes a page, consider its peer children as pages too.
Keep a peer inline when it serves as brief shared context or belongs with
another workflow, and explain the exception. Do not create empty or
unhelpfully thin pages solely for symmetry.

For the weight-only and subsequent scheduling responses, use the exact
[source-bound structure proposal contract](../../skills/generate-prd/references/structure-plan.md).
First assess every hierarchy node without choosing boundaries. Then use that
saved assessment to propose the variable-length document and page plan. Bind
each response to the supplied context, outline, and weights. The parent saves
and validates the response; the agent preserves source data and may deliver its own proposal through the assigned file/MCP scope. Current gaps and
proposed frames do not become completed comps or accepted interaction depth.
