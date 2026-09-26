# Resilient product-document generation

Owner requirement, 2026-09-26: a problem must not halt the whole process. Mark
affected data as needing repair, continue with usable information, and move up
the hierarchy when processing cannot continue down or across. Documents may
show the error and explain what the user can do to repair it.

This is an accepted requirement and a proposed implementation contract. It is
not yet implemented by the production publisher or the sample numbering helper.
It extends the [document design](document-design.md) and [plan](plan.md).

## Completion with repairs

Apply continuation at every stage: source loading, validation, agent work,
hierarchy planning, composition, rendering, and delivery. A failure isolates
the smallest affected unit and its dependent work; independent work continues.
The run finishes with usable documents and a repair report. It must not wait
indefinitely for a repair, retry forever, or require an immediate user answer.

Validation still determines which content can be trusted. An invalid field,
missing reference, or stale scene is not silently treated as accepted/current
information. Use independently valid material, show missing material locally,
and distinguish a processing failure from a product decision left unspecified.
An incomplete UI handoff must not suppress available requirements and flows.

Return one of three explicit outcomes, separate from product/design approval:

- **Complete:** all intended material was processed with no unresolved repairs.
- **Completed with repairs:** usable documents were produced, with visible gaps
  and recorded repair needs.
- **Repair report only:** insufficient trustworthy material remained for a
  product account; produce the document scaffold and available diagnostics.

An unsafe or unauthorized write is skipped while other work continues. Preserve
existing output and produce a separate preview/report in an authorized location.
If no output location can be written, return available content and repair steps
in the response and report that delivery failed. Never claim unwritten files.
Persist progress so an interrupted host/session can resume; continuation cannot
execute while the host itself is unavailable.

## Mark data without changing its meaning

Keep a repair ledger under the product support directory. Its overlay marks
the affected source or derived record `needs-repair`, keyed by stable identity
and exact revision. Do not overwrite product decisions, approval status, source
identities, or hashes to make a failed check pass. If a file cannot be decoded,
record an artifact-level issue; do not invent identities for unreadable records.

Each repair entry records:

- Stable issue identity; affected source/section IDs, revision, and location.
- Failed stage, observed cause, and diagnostic evidence when available.
- Which parts remain usable, which were omitted, and affected dependencies.
- The chosen fallback, including any provisional ancestor/page placement.
- A plain-language explanation, concrete user repair steps, and the check that
  must pass to resolve the issue.
- Links to affected output and issue state: open, retrying, or resolved.

Only independently decodable and validated records/fields can be salvaged.
Do not guess broken JSON boundaries or assume a field is safe when its meaning
depends on a failed relation. Reuse prior content only when its exact bindings
still validate. If historical material is useful, label it historical and keep
it distinct from current requirements and flows.

Deduplicate repeated faults into one issue with multiple affected locations.
Related dependent gaps link to the root issue instead of overwhelming the user
with the same error. Save the ledger, effective placement map, and recovery
choices with the publication revision so another agent can resume consistently.

## Traverse usable information

The structure agent's saved hierarchy and page breaks remain the authority for
ordinary organization. Recovery is an explicit temporary overlay, not permission
for the renderer or another agent to redesign the guide.

1. At a node, process its trustworthy content and place a repair notice beside
   unusable content, or at the nearest usable ancestor if no local page exists.
2. Visit usable children whose identity and ownership can be established. A
   damaged parent description must not conceal valid independent descendants.
3. When a node or edge cannot be followed, record the failure and attempt the
   next unvisited sibling. A failed relation does not poison its whole branch.
4. If neither descent nor lateral movement offers work, ascend to the nearest
   ancestor with unvisited work. Repeat until reaching the document root.
5. Continue with the next document. Account for independently usable orphaned
   material in a clearly labeled provisional recovered-content section if its
   intended placement cannot be established.

Track visited identities and the active ancestor path to detect cycles and
ensure finite traversal. Bound retries for transient failures; after the retry
budget, record the issue and proceed. Cross-references do not recursively reopen
already processed sections. Duplicate IDs or conflicting ownership are recorded
as ambiguity rather than silently choosing an authority. Diagnostic occurrence
keys may distinguish conflicting records without becoming new canonical IDs.

Preserve trustworthy placements. If a page or parent cannot be used, place its
usable material at the nearest usable ancestor, then the document's provisional
recovery section as necessary. Record the original and fallback locations.
The accepted hierarchy is retained; the effective publication map describes
the temporary result and is repaired through the structure agent when needed.

Generate decimal numbers from that effective displayed hierarchy. Roots and
every child sequence start at 1 and have no gaps. A repair placeholder can
occupy a numbered section; omitted sections leave no reserved number. All
headings, navigation, and references use the same map. Resolve references to
usable content or its repair notice instead of leaving dead links. Internal
source identities remain unchanged when recovery changes displayed numbering.

## Fallbacks and user repair

| Failure | Continue with | Explain how to repair |
| --- | --- | --- |
| Missing or invalid record | Valid independent records/fields; local placeholder for the unavailable material | Identify the source and failed condition; restore or correct it, then rebuild the affected context |
| Missing UI handoff or all scenes | PRD and available interaction text, with explicit visual-coverage gaps | Complete/repair the upstream UI handoff and refresh the context |
| Missing or unreadable comp | Flow text, remaining comps, and an inline missing-figure notice | Restore the referenced resource or regenerate its scene, then refresh bindings |
| Stale source binding | Valid current independent material; mark the dependent passage unavailable | Refresh the upstream context and revise affected manuscript blocks; do not merely replace a digest |
| Broken hierarchy, missing parent, or cycle | Usable children/siblings, ancestor fallback, and provisional recovered material | Repair the identified edge or ask the structure agent to revise the affected hierarchy/page plan |
| Agent failure or incomplete response | Valid response portions, still-valid baseline content, or a labeled minimal scaffold | Retry the bounded failed assignment after addressing its reported input/tool problem |
| A block or page cannot render | Safe escaped text and a notice; a minimal HTML/text page if its template fails | Correct the identified manuscript/template issue and render the affected page again |
| Destination or receipt conflict | Preserve existing files; finish an independent preview/report and other safe work | Resolve the destination ownership/conflict or select an authorized output location, then retry delivery |

Do not promise recovery of facts that cannot be established. The fallback can
be an explicit gap, not an invented requirement, flow, comp, or design choice.
Repairs that require upstream changes name the relevant artifact/workflow; a
generic "try again" is insufficient for a repeatable data error.

## Reader presentation and repair cycle

Show a short notice at the affected section or figure: what could not be used,
what the reader can still rely on, and how to repair it. Add a linked repair
summary at document/collection level. Preserve notices in print. Keep raw
exceptions and technical source details in a secondary disclosure or support
ledger; the primary document remains readable. Use text as well as styling to
identify a repair need. The [sample use case](design-preview/record-harvest.html#repair-missing-comp)
contains an explicitly illustrative notice, not a real diagnosed source fault.

On a repair run, revalidate the affected unit and its dependencies. Recompose
only affected content, restore intended placements when valid, and regenerate
the shared numbering/link map. Close an issue only when its resolution check
passes; preserve its history and unaffected manuscript. Unresolved repairs do
not require the owner to restate the document format to a new agent.

Rendering from the same saved inputs and recovery decisions remains
deterministic. Retrying unavailable work or changing sources creates a new
publication revision rather than silently changing a render-only replay.

## Required implementation evidence

Exercise a malformed record, missing UI handoff/comp, stale reference, cycle,
orphan subtree, agent failure/timeout, renderer failure, and delivery failure.
For each, show usable later siblings and ancestors still processed, explicit
repair status/instructions, finite completion, trustworthy facts, valid fallback
links, and consecutive section numbering. Include a case where the only usable
work lies above a failed branch and one where no product content is usable.

Then repair an input and show the issue resolves, intended placement returns,
references/numbers update together, and unrelated content stays unchanged.
These cases are core acceptance evidence for this requirement, not an optional
future exhaustive failure suite.
