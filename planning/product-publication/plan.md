# Product publication correction plan

Status, 2026-09-26: research and a proposed document design are available for
review. Production skill contracts and renderers have not yet been changed to
implement this proposal. The first Alexa publication remains a failed trial.
The owner has accepted decimal section numbering for the interaction guide
and requires resilient continuation through failures. Their contracts are
recorded below, in the document design, and in [resilience](resilience.md).

Priority update: [refinement efficiency](../../.codex-tmp/refinement-efficiency/plan.md) takes
precedence over further document-format tweaking. Preserve these samples and
accepted requirements as the baseline while that work proceeds. This plan's
publication implementation and remaining format decisions are still pending.

Start with the [HTML design sample](design-preview/prd.html),
[document design](document-design.md), and [research findings](research.md).
The [first-pass plan](first-pass-plan.md) preserves the earlier milestones and
their rationale. The accepted [source inventory](m3-joint-inventory.md) and
[schema proposal](m3-schema-proposal.md) remain source-contract background.

## Owner direction and proposed decisions

Confirmed by the owner in this discussion:

- Produce a recognizable PRD containing requirements and a separate interaction
  document containing detailed flows, use cases, and comps.
- Preserve the `document-structure` agent's information-hierarchy and page-break
  process for application structure, flows, and use cases.
- For now, keep each use case local to one specifically identified interaction
  object, such as a form. Describe ways of using that object, including multiple
  steps, alternatives, and subsequent dialogs or similar supporting interactions.
  Those interactions can stay in the same case; broader journeys between
  independent tasks link their local cases as a flow.
- Use decimal section numbers (`1`, `1.1`, `1.1.1`) derived from that hierarchy
  in the interaction guide. Keep numbering continuous across HTML page breaks,
  match headings/navigation/cross-references, and retain independent stable
  use-case IDs and link targets. Number action steps separately within each flow.
- Start every document's top-level sequence and each parent's child sequence
  at `1`, with no skipped sibling numbers. Number the current published outline
  consecutively; removal, exclusion, or reorganization closes any old gaps.
- Keep internal data identities and references independent of the information
  hierarchy. External numbering can change through design refinement and PRD
  generation without renaming source records or changing their semantic links.
- Never abort the entire process because some data or work is unusable. Mark
  affected data as needing repair, continue with usable material, and move up
  the hierarchy when there is no usable path down or across. Show gaps/errors
  and practical user repair steps in the resulting documents.
- Provide a concrete design and a way to tweak it while preserving consistency
  across runs and agents.
- Consider publishing design language as its own document.

Proposed for review: the specific PRD section sequence, page patterns and visual
theme in the design sample; a separate Design language reference; and a persisted
reader manuscript between the agent's hierarchy/page plan and rendering.
These details are proposals, not inferred owner acceptance.

The prior permission for an agent to choose any number or combination of product
documents is superseded by the two required roles. Its authority to construct
the interaction hierarchy and choose page breaks is retained. Technical
publication stays with `generate-technical`. Publication paths remain under
`documents/<product>/`; support artifacts remain under `product/<product>/`.

## What must change

The current publisher renders outline groups as source-record blocks and appends
comps. Coverage and exact bindings passed mechanical checks, but the output did
not meet the visual or editorial requirements. The editor remained a partial
wireframe. Both failures need correction, with separate exit evidence.

Retain source identities, current-context validation, hierarchy, weight
assessment, coverage, safe output ownership, and deterministic rendering. Add
readable composition and stable publication patterns. The agent's organization
is an input to composition; the inventory itself is not the reader document.
Replace all-or-nothing readiness with scoped validity and recovery: the current
missing-UI-handoff gate, for example, must not prevent usable requirements and
flow text from being published. Validation failures remain visible and tracked.

## A. Revise the design samples and establish the format

This package supplies a researched content model, linked PRD sample, application
overview, detailed use-case page, and proposed design-language reference. All
sample product content and visuals are synthetic. The written design specifies
page patterns, comp placement, navigation, gaps, and revision behavior.

Review these authored prototypes for document organization, content, navigation,
comp placement, and repeatability. Their placeholder component differences are
not acceptance criteria for this stage. Component fidelity is assessed later
using actual UI-agent output and shared rendering templates.

Use concrete feedback to revise the sample. Classify each change as publication
styling, a page pattern, or interaction organization. Organization changes still
go through the structure agent when applying the format to actual product data.

**Exit:** a concrete format is available to refine and select for implementation.
The required PRD/interaction split is already directed; the optional third
document and precise sample design remain choices. No Alexa regeneration is
needed to evaluate this format proposal.

## B. Define the composition and revision contract

| Artifact                                  | Responsibility                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Context and source index                  | Product/UX/UI meaning, references, relations, current visuals, and explicit gaps                                              |
| Outline, weights, and page-break plan     | Structure agent's hierarchy, reading order, placements, and justified boundaries                                              |
| Versioned publication profile             | Required document roles, chosen design-language placement, PRD section order, allowed page/content patterns                   |
| Reader manuscript                         | Saved prose, requirement presentation, flow explanations, captions, and exact sources on the planned pages                    |
| Product publication baseline              | Selected revisions, stable IDs/paths, artifact hashes, profile/theme versions, source bindings                                |
| Repair ledger and effective placement map | Needs-repair markers keyed by stable ID/revision, failed dependencies, fallback locations, user actions and resolution checks |
| Change report                             | Added/changed/retired facts, affected pages/figures, text and navigation diffs, unresolved coverage and repairs               |

Define compose, revise, and render responsibilities explicitly. Reuse the
`document-structure` agent for hierarchy and page breaks. A bounded composition
assignment may extend that agent's contract as a separate mode; a new agent is
not required. Composition follows the saved organization and cannot redesign UX.
Unusable placements follow the explicit recovery overlay in the resilience
contract, without replacing the accepted hierarchy or source identities.
Model use-case ownership as a stable reference to one identified interaction
object, separate from editorial nesting. Record participating dialogs/surfaces
without treating each as another owning object or automatically splitting the
case. Preserve its responsibility, states, and entry/exit boundaries.
The structure agent organizes object descriptions
and their local cases; broader flow descriptions link those cases. Missing or
conflicting ownership produces a repair marker while usable content continues.

Derive a section-number map from the saved ordered interaction hierarchy before
applying page breaks. Render headings, navigation, and section references from
that same map. References bind stable section IDs, not literal number strings.
Assign consecutive numbers from `1` within every sibling sequence, including
the document's roots. Do not carry old display-number gaps into a new revision.
Page-break-only changes preserve section numbers; hierarchy revisions recompute
the affected display numbers while preserving identities and link targets.

Separate source identity and semantic relationships from editorial hierarchy,
order, page placement, and numbering. Maintain a placement map that resolves a
stable source/section identity to the current page, anchor, and display label.
References must not embed outline numbers, ancestor paths, or page locations
as data identity. For example, moving `UC-01` from section `2.1` to `4.3` changes
its presentation mapping, not requirement/use-case/state references to `UC-01`.
Resolve generated links through the updated map even when the page URL changes.
Exact source revision/digest bindings remain required for content freshness.

Use typed content patterns rather than arbitrary agent-written HTML/CSS. Permit
source-backed narrative synthesis without forcing one block per source. A
coverage ledger records canonical homes, contextual uses, explicit exclusions,
and repair placeholders for material that could not be processed. A placeholder
accounts for the source without claiming complete semantic/visual coverage.
Reference validity is machine-checkable; arbitrary paraphrase fidelity still
needs editorial review. Preserve source conditions, alternatives, and status.

Define impact rules: changed facts invalidate affected blocks and dependent
summaries; new eligible facts need placement; retired facts cannot remain as
stale prose; changed scenes/tokens invalidate affected figures. Revalidate exact
bindings rather than updating digests to preserve an obsolete artifact.

**Exit:** a requirement, branched use case, and visual reference can be expressed
as saved manuscript data with explicit missing material. A bounded revision
preserves unrelated content and identities.

## C. Implement vertical slices of the reader

Implement a PRD overview and requirements section first. Then add an application
area and a complete use-case page with main sequence, branch, end state, and
inline visuals. Implement the chosen design-language placement by reusing its
current validated source and renderers. Sample product values never become
reusable defaults or a second visual authority.

Keep presentation separate from the source inventory. Reuse receipt, link, asset,
and replacement machinery. Preserve technical and unrelated output. Isolate
the document theme from product-comp styling.

For visuals, distinguish availability, fidelity, status, and coverage. Render
partial wireframes honestly. Missing UI design is resolved upstream through
`refine-design`; publishing cannot fill it with invented comps.
Continue publishing available requirements, flows, and other visuals while
reporting those missing pieces and their upstream repair actions.

Implement the [resilience contract](resilience.md) throughout the slices:
isolate failures, persist needs-repair markers, traverse siblings/children and
ascend when needed, bound retries, detect cycles, and render local notices plus
a linked repair summary. Use the nearest usable ancestor or a provisional
recovery section when planned placement fails. Generate consecutive numbers
and working links from the effective displayed hierarchy. Preserve the saved
plan and internal IDs. A failed output replacement preserves existing files
while the run completes a separate authorized preview/report.

**Exit:** generated pages match the selected reading patterns, preserve meaning
and the agent's page plan, and use prose/requirements/flows as their main body.
Identical saved inputs render byte-stably.
Injected failures still produce usable output or a repair report with concrete
next actions, without requiring a user response before processing other work.

## D. Make revisions predictable

Save the selected profile, theme, hierarchy, page plan, and manuscript under the
product support directory. Every subsequent run loads that baseline first.
Rendering invokes no agent. Exercise these changes with concrete diffs:

1. Adjust typography or spacing without rewriting prose.
2. Revise one explanation or caption without regenerating unrelated blocks.
3. Revise hierarchy/page breaks through the structure agent, retaining identities
   and showing the old/new navigation. A page-break-only change leaves decimal
   section numbers unchanged; a hierarchy revision updates affected numbering
   consistently in headings, navigation, and references.
4. Update a product rule and its dependent UX/UI sources; identify all affected,
   newly eligible, and retired content.
5. Resume with another agent using the saved baseline and edit scope; preserve
   document roles, presentation contract, unaffected text, and paths.
6. Repair one failed source or operation; revalidate its dependencies, close
   the issue only after its check passes, and restore valid planned placement.
   Update numbering/references together while preserving unrelated content.

Record explicit profile/theme upgrades instead of selecting a floating latest
version. Bind receipts to sources, hierarchy, plan, manuscript, profile, theme,
renderer, and assets. Wall-clock values enter output only as persisted inputs.
Persist the repair ledger and recovery choices as inputs too. Retry/repair work
creates a new revision; render-only replay does not make fresh recovery choices.

**Exit:** another agent continues the chosen design without needing the owner to
restate it. Same-input rendering is deterministic; independent first-time prose
is not falsely promised to be identical.

## E. Validate synthetic examples and the real publication

Add focused tests with each implementation slice. Group the broader review after
the reader is assembled, avoiding repeated agent reviews for minor revisions.
Comprehensive unrelated failure-case generation remains separate follow-up work.
The scoped failure/recovery cases below are required by the owner's resilience
requirement and must accompany these implementation slices.

| Check                     | Evidence                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Recognizable PRD          | Purpose, scope, requirements, criteria, and decisions are understandable without source JSON                                                                                                                                               |
| Hierarchy preserved       | Application areas, flows, and use cases follow the agent's hierarchy and page boundaries                                                                                                                                                   |
| Decimal numbering         | Roots and each parent's children start at 1 with no gaps; headings/navigation/references agree across pages; re-pagination preserves numbering, and reorganization/removal recomputes consecutive labels while preserving stable IDs/links |
| Independent data identity | Moving a referenced use case to another parent/page changes its outline label and publication mapping while preserving its ID and semantic references; generated links resolve its new location                                            |
| Complete interaction      | Main path, meaningful branch, failure/recovery, and outcome are readable with their comps                                                                                                                                                  |
| Local use-case scope      | Each case names one stable owning object; supporting dialogs can remain within it with explicit return/exit behavior; broader journeys link independent local cases; reorganization preserves ownership                                    |
| Honest visuals            | Wireframes, proposed/accepted comps, missing scenes, and partial coverage are distinguishable                                                                                                                                              |
| Component fidelity        | Ordinary controls reuse the shared templates, including MUI outlined labels; focus/state colors resolve from the current product's theme without unrelated branding                                                                        |
| Semantic coverage         | Eligible sources are accounted for; conditions, alternatives, and status survive composition                                                                                                                                               |
| Resilient continuation    | Invalid record, missing UI handoff/comp, stale reference, cycle, orphan subtree, agent timeout, render failure, and delivery failure leave independent work usable and finish with repair status/instructions                              |
| Hierarchy recovery        | Failed down/across paths ascend to remaining work; valid descendants survive a broken parent; fallback placements retain stable IDs and produce consecutive numbers/valid links                                                            |
| Repair cycle              | Corrected input resolves its issue only after validation; intended placement returns and unrelated content is unchanged; no usable content produces an honest scaffold/report                                                              |
| Stable revision           | Replay, bounded changes, new-session continuation, and version upgrades preserve their stated invariants                                                                                                                                   |
| Safe publication          | Links/assets/receipts validate; only owned product output is replaced                                                                                                                                                                      |
| Readability               | Desktop/narrow screenshots, keyboard navigation, and print checks cover the selected patterns                                                                                                                                              |

Use sparse and developed unrelated synthetic products. Then trial Alexa with
current inputs in its authorized consuming-repository scope. Complete its
missing UI evidence upstream before claiming finished comps. Keep its product
facts, outputs, and comparison evidence in that repository.

**Exit:** a readable PRD and coherent interaction guide with honest visuals can
be reproduced and revised without losing their chosen design. Coverage checks
alone cannot establish completion.

## Implementation change map

These are future change locations, not completed changes in this design pass:

- `skills/generate-prd/SKILL.md` and `references/`: required document roles,
  retained hierarchy/page-break stages, composition/revision modes, profile,
  continuation and repair behavior instead of global validation stops.
- `agents/document-structure.toml` and its planning role contract: preserve
  information architecture ownership; define composition if assigned here.
- `prd-outline.mjs` and `prd-structure.mjs`: retain inventory/hierarchy/weights;
  validate document roles, stable identities, and revision changes; add finite
  recovery traversal and an effective placement map separate from the plan.
- `prd-readiness.mjs` and context loading: report scoped usability and repair
  needs; missing/invalid UI inputs must not block all product documentation.
- New manuscript/profile validators and presentation templates in `generate-prd`:
  validate the saved reader view and render named patterns.
- `product-collection.mjs`: replace its generic record body with manuscript
  rendering while retaining safe publication and exact receipts; isolate block,
  page, and delivery failures and finish with a preview/report when needed.
- Existing design-language/UI renderers: reuse current resources and accurately
  report visual fidelity and gaps.
- Skill guides and tests: update alongside corresponding implemented behavior.

No new managed package is necessary. Installation, consuming-product mutation,
and committing are outside this design pass.
