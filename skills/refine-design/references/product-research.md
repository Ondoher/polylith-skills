# Durable product research handoff

Use this reference before interaction planning when product/task research can
materially inform the requested design, and when resuming from saved research.
The independently callable `product-researcher` uses the
[product-neutral role contract](../../../planning/implementation-agents/product-researcher.md)
and [shared evidence guidance](../../../planning/implementation-agents/research-guidance.md).
It derives questions from product inputs; no workspace, technology, reference
product or arrangement is a reusable default.

## Locate and assess reusable research

Resolve the product root through [product location](product-location.md). Look
for existing product-owned scope, briefs and referenced evidence before assigning
research. A useful default for new records is `research/research-scope.md` and
`research/product-research-brief.md` under that root; retain existing workspace
briefs and stable references rather than requiring relocation or duplication.
These are ordinary maintained documents, not another product model or schema.

The parent checks the research's product/source identity, source revision or
content hash and immutable input reference where available, covered questions,
owner constraints, and material evidence verification state. Compare the current
source and requested scope with that context. An identical source and relevant
scope support reuse after checking reference complexity fit; source verification
alone does not establish suitability as a design precedent. Reassess material
comparables against the current intended users, task breadth, working scale,
simultaneous concepts, modes and required capabilities. Distinguish overall
interface precedents from bounded pattern examples and unsuitable references.
An overly complex product must not dictate whole-interface organization even
when its documentation is authoritative and unchanged. Changed source bytes call for an applicability assessment,
not automatic rejection of every finding. Retain findings for unchanged meaning
and reopen only questions affected by changed requirements, stale material
claims, conflicting evidence or unresolved applicability. Record missing identity
or coverage honestly and recover it from authoritative inputs where possible.

The current human description and resolved owner amendments govern requirements.
A saved scope is a research agenda; existing designs and research recommendations
cannot override that authority. Preserve conflicts and source uncertainty instead
of reviving a superseded assumption. Ordinary familiar interactions and explicit
owner decisions do not need a ceremonial research pass.

## Assign and preserve research

When an initial brief is needed or a material question is uncovered, give the
named researcher the current description or source-bound facts, intended users
and tasks, owner constraints/feedback, current designs where useful, accepted
scope when available, prior findings and evidence, and the bounded questions to
answer. Supply exact input paths/handles and source identity. Ask it to reuse a
current supplied scope; derive one only when absent or materially incomplete.
Do not repeat completed discovery to change the role that performs research.
Require a compact target complexity profile and a reference-fit comparison in
the brief. Prefer similar-complexity interfaces for whole-workspace research;
permit a substantially more complex product only as explicitly bounded pattern
evidence. Preserve unknowns, excluded complexity and bounded search limitations.

Assign an absolute `outputDirectory` inside an effective writable root or an
approved local MCP assignment capability using the existing protocol. The
researcher may browse and save its own progressive findings and evidence within
that scope, returning compact paths/handles and status. It does not write the
human description, accept product/design choices, promote canonical data, publish
or orchestrate later stages. Without the named role, use the skill's honest
parent-assessment fallback and record the availability limit.

The parent reads delivered findings, checks material sources under the shared
evidence rules, and promotes useful output to the product-owned scope/brief.
Keep observations, inferred applicability, recommendations, alternatives and open
questions distinguishable. Preserve source links, access dates, relevant versions,
linked interface evidence and whether an interface was actually inspected.
Retain each material comparable's complexity match/mismatch, use classification,
transfer boundary and selection/rejection rationale with the relevant findings,
so downstream authors do not elevate a bounded example into an overall design.
Record answered-by-reuse questions and remaining owner/technical dependencies
alongside new findings. Do not copy transcripts or create a duplicate requirements
catalog. Retain completed deliveries if canonical destination access is pending;
report that state without claiming durable publication.

Save a compact run record of checked inputs, reused sections, affected questions,
delivered paths/handles and unresolved needs using existing run evidence. A later
invocation starts with these durable records, not the live researcher thread.
If the owner requested inspection before adopting advice, publish the authorized
brief/inspection view and stop dependent adoption at that boundary. A research-only
request ends with the brief and evidence; it does not start the design workflow.

## Supply the same evidence to design consumers

For an owner-readable inspection copy, the parent can render the saved brief with
`node skills/refine-design/scripts/product-research-html.mjs --input <brief.md> --output <index.html>`.
Keep attributed interface images beside the published brief and use relative
links. The renderer supports headings, paragraphs, flat lists, tables and inline
links/images; it rejects unsupported block syntax before writing. Markdown stays
the authored source, and the HTML is its inspection view. Publication does not
accept recommendations or start UX/UI authoring.

Before UX interaction planning, supply the saved brief path or input handle,
its source context, and the relevant section/question/evidence locators. Give
wireframe and UI authors those same references with their accepted source inputs;
they retrieve needed sections rather than receiving copies of the whole brief.
Include the relevant references for independent review when they support material
claims. Reuse findings across stages instead of independently researching the
same precedents. Consumers report conflicting requirements and evidence gaps;
new research stays bounded to questions the brief does not adequately answer.
Pass the reference-fit classifications and transfer limits with those locators.
Design consumers must respect a reference's bounded scope; a saved screenshot or
source check is not permission to import the reference product's complexity.

The brief informs UX selections, spatial wireframe decisions and visual treatment
within their existing ownership. Research advice is not accepted working design.
Only the owning design stage can select an adaptation, subject to current owner
constraints, source checking, locks and independent review. A later change to
behavior returns through UX; a spatial change returns through wireframe review.

For a researched or novel UX pattern, retain the existing `patternResearch`
contract. Extract the relevant question, actual search method/queries, primary
source observations, candidates, applicability, tradeoffs, outcome and evidence
limits into its existing fields; keep original evidence URLs and source IDs.
Link the durable brief section through existing supporting-document mechanisms
when its path fits their contract. Do not put the entire brief in every pattern
record or add a research transport/schema. The parent may reuse a recorded
source-check for unchanged claims and sources after checking its applicability;
the researcher or consumer cannot self-certify it. Missing verification keeps
research and dependent records proposed until the existing parent source-check
gate passes. A brief reference alone never satisfies that gate.
