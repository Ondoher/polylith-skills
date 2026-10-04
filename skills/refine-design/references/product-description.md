# Product Description And PRD

The product description and product requirements document serve different
purposes in the design workflow.

The description is interpreted once per accepted update into the canonical
schema 2.0 product model described in [product-model.md](product-model.md).
Specialists and downstream skills consume validated structured artifacts or a
consumer context derived from that model. They do not independently parse this
Markdown. `generate-prd` owns PRD publication from the persisted PRD context;
`refine-design` does not construct the publication directly.

## Product description

The product description is the human-owned source of product intent. It is both
an input and an output of repeated design work. A person can add requirements,
correct terminology, answer questions, or rewrite a section directly; the next
design pass reads those edits as current product input.

Keep an existing description in its supplied location and reuse a clearly
equivalent document rather than introducing a competitor. Product-design data
belongs in `<repository-root>/product/<name>/`, independent of the description's
location. When creating a new description, prefer `product-description.md` under
that named product root after establishing the name. Read the
[product location contract](product-location.md) before persistence.

The description should clearly name the product in ordinary prose or a title;
no fixed heading or schema is required. If its name is absent or ambiguous,
`refine-design` must ask the owner before choosing a data folder, unless the
current user instruction already supplies the answer. Record the clarified
name in natural language when editing the document is authorized. Do not infer
it from the repository, source filename, or an example product.

Use only Markdown that is comfortable to write as plain text: paragraphs,
headings, bullets, numbered lists, emphasis, and links where useful. Avoid
tables, generated regions, embedded HTML, inline SVG, front matter, structured
IDs, required labels, or a fixed template. Headings and list shapes are for the
reader and may provide useful context for interpreting the author's meaning.
They are not a required schema: downstream work cannot assume that a particular
heading, order, or grouping will exist on the next input, and absence alone does
not imply that a capability is excluded.

## Unstructured input and complete interpretation

Treat every human input as if it were the first input to the skill. It may be a
complete description, a sentence, disconnected notes, or a direction such as
“tighten the whitespace and reduce the vertical size of the controls.” Do not
require the author to identify a section, target an ID, preserve a heading, use
design vocabulary, or phrase the input as a patch.

Use whatever structure the author supplies as semantic evidence. A note under a
“Playback” heading probably concerns playback; nesting and sequence can express
scope or relationship. Interpret those cues normally, while remaining able to
reach the same understanding when the next input has no such structure or uses
a different organization.

At the start of every invocation, check the durable source and latest human
input against the current product model. For changed source, reconstruct product
understanding from the complete description once; unchanged exact source can
reuse its verified model. Specialists consume that structured authority. Use
the PRD and supporting evidence where relevant, but do not rely on remembered
conversation structure, earlier prompt positions, or an incremental parser.
Treat a clear latest human statement as a correction or addition to the durable
description. If its relationship to existing content is genuinely ambiguous,
record the ambiguity or ask only when it blocks useful synthesis.

Keep the description coherent and readable after an update. Consolidate selected
product/UX decisions into one writeback before independent review; preserve
existing prose when its meaning remains current. Reorder, combine, split or
rename sections when that improves comprehension or the owner asks, not as a
mandatory pass between specialists. Preserve human meaning, constraints,
terminology and unresolved questions. See [the stage boundaries](refinement-cycle.md).

The synthesized description is a required refinement deliverable. It must read as
the current product, incorporating all owner updates and selected product/UX/UI
decisions that affect product intent. Fold amendment blocks into the relevant
sections and replace superseded statements; retain their history in existing
source snapshots or run evidence rather than leaving conflicting versions in the
current description. Preserve every still-current requirement, constraint,
term, link and lock. Synthesis is consolidation of meaning, not a summary that
discards details, and it requires no rigid template for future owner input.

Clearly highlight a dedicated open-question section. For each remaining question,
state what is unresolved and, when one exists, the selected working assumption or
temporary policy. Remove answered or obsolete questions from the current list and
incorporate their answers into the product prose. Never present an assumption as
an owner-confirmed fact. Detailed component limitations remain in accompanying
interface documentation; reflect them in the description when they materially
affect product understanding. A generated artifact or run-report summary does not
substitute for updating the authoritative description.

Complete this writeback before review inputs are frozen. If a later UX or UI
decision changes product intent, reconcile it through the same coordinated
writeback and refresh affected model, UX, review and UI bindings. At completion,
verify the live description against selected decisions and remaining questions;
do not make a late unbound editorial rewrite after dependent artifacts pass.

A directional visual change can become concrete editable defaults. For example,
“tighten the whitespace and reduce the vertical size of the controls” can lead
the design pass to revise spacing roles and control-height defaults, update the
organized description, and refresh affected PRD specimens. It does not need to
be converted into a formal question first. Do not treat this example as a
default instruction for any particular product.

Organize the content around the product's actual capabilities and UX flow. A
useful description often covers purpose, users, important concepts, workflows,
visible behavior, limits, and unresolved questions, but none of those is a
mandatory section. Reorganize when it improves comprehension. Preserve the
owner's terms and intent, and keep uneven levels of detail when that reflects the
current design.

State missing information and questions in plain language near the affected
capability or in a readable questions section. Do not use omission as evidence
that a behavior is excluded. Every concrete choice selected by a consulted
agent is an accepted working decision within that agent's assigned authority
when incorporated; no separate human acceptance step is required. Unselected
alternatives, research observations, and unresolved gaps remain non-decisions.
Technical recommendations are accepted in their technical records, but do not
become product intent merely because a technical agent selected them.

The description may ask for UX advice where a complex interaction has not yet
been designed. Preserve that request as current product-planning work rather
than forcing the author to specify the answer. A refinement pass may ask the UX
planner to investigate established approaches and may use bounded online
research when it will materially improve the options. Prefer primary research,
original-author guidance, platform documentation, and standards. Record the
result in the PRD with applicability, tradeoffs, evidence limits, and remaining
owner choices. The UX planner's selected direction becomes the accepted working
interaction and returns to the product description in ordinary language. Keep
the interaction open only when the planner cannot responsibly select a usable
direction, a dependency blocks the choice, or the author explicitly defers it.

Design defaults are ordinary current design choices, not unanswered questions.
Record values such as spacing, typography, component sizing, and an initial
theme directly in the product description when they become part of the working
design. They may be changed by a later human edit or design pass without a
separate acceptance ceremony. Reserve open questions for missing product or UX
behavior, consequential alternatives, and choices for which no usable current
direction exists. A default must still be identified honestly as a mutable
design choice rather than an external standard or researched fact.

Human edits take precedence over derived material. When an edit conflicts with
a current agent-selected choice, identify the affected PRD or technical record
and regenerate or reassess it. The author changes a derived choice by editing
the product description; they do not need to edit generated statuses or reports.
Incorporate accepted agent choices that affect product intent into the product
description in natural language rather than leaving the only answer in a report,
comp, chat transcript, or status table. Preserve meaningful rationale only where
it helps a future reader understand the product.

A human may explicitly lock a design scope in ordinary language. A lock freezes
that selected design, including a whole comp's exact source bindings, until a
later human instruction specifically names the locked scope and requests a
change or unlock. General cleanup, refinement, regeneration, dependency updates,
or unrelated product-description edits do not authorize a locked change. Keep
the lock statement in the organized description when it expresses product
intent, preserve the corresponding `locked` state in the owning structured
artifact, and report conflicts rather than reconciling them silently. Agents do
not create locks from confidence, completeness, or apparent owner satisfaction.

## Product requirements document

The PRD is `generate-prd`'s generated, human-reviewable static HTML result. It expands the
product description through UX and UI planning. It may use multiple linked
pages, tables, structured records, inline surface and component comps, local vector assets, and provenance because
a human reviews it but is not expected to author all of it by hand. Content
presented as the selected design is accepted working design by inclusion and
does not need an accepted status pill. Clearly label unselected alternatives,
missing requirements, and unresolved questions where they remain relevant.

The PRD can contain feature groupings, flows, surfaces, design language,
components, acceptance details, alternatives, and product or UX questions. The
document-structure agent inventories validated meaning and selects the reader
hierarchy and page breaks during `generate-prd`. Refinement does not prepare a
competing publication outline. A
selected agent direction is an accepted working decision; `proposed` is reserved
for an unselected candidate retained for comparison, and `unresolved` for a gap
without a usable choice. `locked` identifies an explicitly frozen design and is
shown because it changes later refinement authority. The PRD remains derived material, so a polished section
or rendering does not override the product description. Technical and
architecture questions do not belong in the PRD; schemas, APIs, persistence,
data representation, technology feasibility, and other implementation concerns
are inputs to a later engineering design review. Where those concerns affect
the product, the PRD states the observable requirement without prescribing or
questioning the implementation mechanism.

The PRD may retain structured provenance for working defaults so they can be
reproduced, but it should present them as editable values rather than unresolved
requirements. Changing a design default updates affected specimens and comps;
it does not require closing an open question unless the choice also controls
product behavior.

The published collection lives under `documents/<name>/<selected-document>/`.
Bounded refinement inspection pages and intermediate contexts are design
evidence; final publication belongs to `generate-prd` and its structure plan.

## Refinement cycle

Interpret the complete changed description as natural language, incorporating
the latest human input. Refine affected capabilities and flows from the validated
structured model. Consolidate selected product decisions into one description
writeback before independent UX review; format and bind the final bytes, updating
the model and affected UX when needed. Unchanged exact source reuses its model.
Preserve unaffected meaning and avoid repeated editorial passes. Follow
[the stage contracts](refinement-cycle.md), then resolve a PRD context from the
committed snapshot for `generate-prd` without reinterpreting prose in publication.

For code generation, treat the product description as the root product input
and current accepted generated design artifacts as its elaboration. A conflicting
human-authored product-description statement overrides a derived choice and
requires regeneration or reassessment before implementation continues. Ensure
accepted agent choices that affect product intent have been folded back into the
description in ordinary language. Report unresolved product questions that block
the requested code instead of extracting hidden semantics from Markdown
structure. Repository instructions, engineering standards, and accepted
architecture remain separate technical authorities.
