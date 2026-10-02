# Alexa product research brief plan

Create a durable, owner-readable research brief driven by the accepted
[research scope](C:/dev/alexa/product/Alexa/research/research-scope.md). Its purpose
is to inform cohesive UX and wireframes from the current product description.
The scope supplies the areas, questions, priorities, relationships and evidence
reuse candidates; this plan supplies execution, evidence and publication rules.
Build a reusable, independently callable `product-researcher` agent and integrate
its durable research handoff into refine-design. Use that agent to complete the
accepted Alexa research agenda without repeating the completed scope discovery.
Adopting recommendations, updating the product description and regenerating
designs are later work.

Status: Stage 1 accepted by the owner on 2026-10-02. The reusable role,
registration, integration, contract-based neutrality/reuse trial and research for
all eight accepted areas are implemented. Publication and execution evidence are
recorded in [the remainder execution report](alexa-product-research-execution.md).
The current session rejects the newly added named role as `unknown agent_type`;
named-role activation and its corresponding configured-model behavioral check
remain pending. Default in-session contract trials are not that check.

After reloading the client, resume only the pending named-role dispatch and
unrelated-product reuse/handoff verification using the preserved generic fixture.
Do not repeat accepted Alexa scope discovery, the completed source research or
publication solely to change the role that ran it. No separate model process,
backend, proxy or observer is authorized by this plan.

Inspect the agent-derived [research-area list](C:/dev/alexa/product/Alexa/research/research-scope.md).
Scope-discovery decisions, coverage and timing limits are recorded in
[the Stage 1 execution note](alexa-research-scope-execution-20261002.md).

## Fresh-executor start and resume instructions

Start in `C:/dev/polylith-skills`, load the applicable repository instructions,
and treat Stage 1 and owner acceptance as completed. No conversation history is
required. Read the accepted scope and reuse these preserved inputs:

- Generic instruction seed: `.codex-tmp/alexa-research-scope-20261002/research-scope-instructions.md`.
- Immutable description snapshot: `.codex-tmp/alexa-research-scope-20261002/product-description-input.md`.
- Prior research inventory: `.codex-tmp/alexa-research-scope-20261002/reusable-evidence-inventory.json`.
- Fuller prior evidence: `.codex-tmp/alexa-research-scope-20261002/reusable-evidence.json`.
- Shared evidence guidance: [research-guidance.md](../implementation-agents/research-guidance.md).
- Scoped delivery/input conventions: [local MCP workflow](../../documentation/workflows/mcp.md)
  and the current UX/wireframe/UI role definitions in `agents/`.

Verify the snapshot against the recorded hash and check the live description for
changes. If temporary inputs are unavailable, recover the source from the stated
authoritative path and research from current product-owned artifacts, recording
what could not be recovered; do not pretend the missing snapshot was read. The
accepted scope still governs unchanged requirements. Generic instructions may
be reconstructed from this plan and shared guidance without repeating Alexa
scope discovery.

Proceed through 1A → 1B → 1C → 2 → 3 → 4 → 5. On resumption, inspect saved
receipts and continue the first incomplete milestone. Resolve ordinary choices
with best judgment and record decisions; open owner-only product questions may
remain explicit dependencies. Installation authorization, client activation and
destination access are environment boundaries, not questions about research
content. Their handling is specified below; this plan does not promise that a
client reload can be performed by an agent.

## Reusable research agent boundary

Alexa is the requested testbed. Its requirements, workspace list, source conflicts,
example controls and candidate reference products are assignment data, not shared
agent instructions or defaults. The research brief should be specific to Alexa;
the method and agent contract must remain useful for an unrelated product.

The reusable assignment accepts a product description or resolved facts, intended
users and tasks, owner constraints, existing designs, requested scope and prior
research. It derives the research questions, relevant workspace relationships and
comparables from those inputs. It returns observations, sources, differences,
applicability, recommendations, alternatives and open questions in a durable
brief. It must not require a timeline, media library, four tracks, Electron, MUI,
zoom menu, or particular reference product when the supplied product does not.
Shared guidance may require evidence for complex task contexts and coherent
workspace organization, but cannot prescribe Alexa's arrangement or vocabulary.

Keep the generic assignment instructions separate from this product-specific
scope. Do not copy Alexa's area list or proposed solutions into a new
managed agent, shared schema, renderer, or universal acceptance checklist.
Useful anonymized Alexa fixtures may test the method, but anonymization alone
does not demonstrate cross-domain applicability.

Before declaring the reusable agent complete, perform one small scope check
with an unrelated synthetic product, such as appointment scheduling. Reuse the
same generic instructions and replace only product inputs. Check that the agent
derives appropriate tasks, questions and reference categories without importing
video-editor concepts. This is a bounded check of adaptable behavior, not a second
full research project. Record the result before completing the reusable-agent
milestone below. Use fresh product inputs rather than a renamed Alexa fixture.

## Reusable agent deliverables and ownership

Create these managed sources together:

- `agents/product-researcher.toml`: dedicated role identity, explicit model and
  effort configuration, scoped delivery permissions and concise operating rules.
- `planning/implementation-agents/product-researcher.md`: product-neutral
  assignment contract, research method, evidence rules and standalone usage.
- `governance.json`: add the agent to the closed catalog in the same change.
- Refine-design skill/reference guidance and relevant UX/wireframe/UI role
  instructions: invoke research when needed and consume its saved output.
- Focused generic fixtures and checks for registration, standalone research,
  durable-output reuse and the downstream handoff.

The role must be usable for a bounded product research request without invoking
the complete refine-design workflow. Its expertise is product/task research,
workspace coherence, interaction precedents and applicability. Keep the existing
technical white-paper researcher separate; do not broaden its contract to cover
this work.

The parent supplies the description or source-bound facts, owner feedback,
accepted scope when one exists, prior research and assigned paths/handles. When
scope is absent, the agent derives it first. When scope is supplied and current,
the agent reuses it. Its outputs are a scope when needed, progressive findings,
an advisory brief and evidence references with source identity, verification
state, applicability and open questions. Ordinary Markdown and existing local
MCP/file delivery contracts are sufficient; avoid a new graph, duplicate full
product model or bespoke transport just for research.

The researcher may browse and write its own contributions/evidence inside an
assigned writable directory or approved local MCP scope. It returns compact
paths/handles and status, not a reproduced brief. Canonical persistence,
publication, accepting product decisions, Git changes and workflow orchestration
remain parent-owned. UX determines behavior and wireframes; UI determines visual
treatment. Research recommendations inform those decisions without independently
accepting them or replacing the existing design reviews.

## Inputs and authority

Use `C:/dev/alexa/agents/topics/alexa/product-description.md` as the authoritative
description. The planning read on 2026-10-02 covered all 31,919 bytes; its SHA-256
was `5502890f811ef8c74ffc3b03e5e3b6461fdcc05402fe6c5f1a02df100f7f9ffe`.
Recheck the live source at execution rather than assuming those bytes remain
current. Save its identity and an immutable input copy using existing run storage.

Include the owner's current feedback: the composition UI lacks cohesion;
command presentation needs research; viewer zoom may be better grouped under a
menu or toolbar control; wireframe components with insufficient detail may use
visual placeholders; explanatory commentary belongs outside depicted UI; and
research must remain available for future updates.

The accepted scope is the operational research agenda. Use its source locators,
questions, priority reasons, existing-evidence inventory and proposed sequence
to select work. Owner feedback is already reflected there; a suggested treatment
such as a zoom menu is a hypothesis to investigate, not a required conclusion.
The description remains authoritative for product behavior. Neither the scope
nor this plan may silently replace its requirements with a reference product's
behavior or an agent's recommendation.

Read amendments in source order. The trailing amendment overrides earlier prose
where it says that clip insertion copies content and subsequent library clip
updates do not propagate into videos. It also introduces grouped-assembly
trimming and ungrouping behavior. Reuse the scope's completed conflict resolution
and source snapshot rather than repeating discovery. Do not treat the superseded
live-reference behavior or its old open
questions as current requirements. Preserve ambiguity where the amendment does
not fully settle an issue.

Existing UX, wireframes and comps are examples of current design choices and
potential weaknesses, not authority over the human description. Reuse applicable
saved research, source verification and images. Record conflicts rather than
using outdated artifacts to reinterpret owner intent.

Respect the requirements, exclusions and editable defaults distinguished in the
description and accepted scope. Broader capabilities of reference products are
evidence, not new product requirements. Technical validation and architecture
are supporting dependencies outside this UX brief; identify visible consequences
and evidence gaps without commissioning that engineering work.

If the live description changes, record the change and reassess only affected
scope entries. Research may reveal a missing or redundant area: record the
source/evidence rationale and propose a scope adjustment for owner inspection
before expanding the assignment materially. Do not revive this plan's former
provisional area list or let it act as a second research agenda.

## Deliverables the owner can inspect

Save the maintained brief at:

- `C:/dev/alexa/product/Alexa/research/product-research-brief.md`
- `C:/dev/alexa/product/Alexa/research/index.html`, rendered from the same brief
  with navigation, source links, readable comparison tables and interface images.
- `C:/dev/alexa/product/Alexa/research/references/` for appropriate local evidence
  images and their attribution. Use links when copying an image is unsuitable.

Use `.codex-tmp/alexa-product-research-20261002/` as the new execution directory
for progress, timings, receipts, fixtures, staged findings and a resumable
milestone-status record. Preserve the Stage 1 directory as completed input.
Maintain the owner-readable execution report and metrics at
`planning/refinement-efficiency/alexa-product-research-execution.md` and
`planning/refinement-efficiency/alexa-product-research-metrics.json`.
Link the
brief from the product's inspection landing page when its ownership and supported
publication path permit it. Always provide the owner direct links to both the
brief and its HTML view; the landing-page link is not a prerequisite for access.

The brief should open with the recommended overall direction and its reasons.
Organize the rest around the accepted scope and the relationships revealed by
research, including product/task context, alternatives, open questions and
sources. A reader should see what was observed,
what is recommended for Alexa, why, and what remains uncertain. Keep operational
logs and performance details out of the main research narrative.

Actual reference-product images must be identified by product, relevant version
when known, source and access date. Proposed Alexa arrangements must be clearly
identified as proposals. Neither a generated illustration nor a documentation
description proves that an interface was visually inspected. Use limited relevant
excerpts, paraphrases and images with attribution rather than reproducing manuals.

## Stage 1 Derive and obtain acceptance of the research scope — complete

The in-session agent read the complete description, resolved clear amendments,
derived the areas independently and then inspected reusable evidence. The parent
checked source coverage and refined the boundary between UX research and
technical dependencies. The owner accepted the saved
[research scope](C:/dev/alexa/product/Alexa/research/research-scope.md).

Reuse that result and the preserved input snapshot. Do not repeat scope discovery
or reconstruct the former provisional coverage table. Its rationale, questions,
priorities, shared concerns, exclusions and open owner decisions drive the next
stages. The scope remains a compact research agenda, not another requirements
specification.

**Milestone achieved:** accepted, source-bound scope with a completed coverage
check. Discovery decisions and timing limits are in
[the Stage 1 execution note](alexa-research-scope-execution-20261002.md).

## Stage 1A Define, register and activate the reusable research agent

Extract the tested generic scope-discovery instructions and their refinements
into the product-neutral role contract. Extend that contract to source selection,
inspection, evidence reuse, advisory synthesis and progressive delivery. Do not
copy the accepted Alexa area list, questions, technologies or candidate solutions
into the role's defaults. Follow the linked shared research guidance rather than
duplicating its general evidence rules.

Create the agent definition and catalog entry together. Record the chosen model
and effort so later performance comparisons identify the configuration actually
used; do not silently override it during assignments. Reuse existing scoped
file/MCP permission and input-collection conventions. Add concise standalone
invocation documentation describing inputs, outputs and authority limits.

Run the existing installer/catalog checks applicable to the new role and inspect
the managed installation dry-run through `install-polylith-skills`. Follow that
skill's authorization requirements for user-level mutations. Verify that the role
is installed and available for an actual named in-session dispatch through the
supported activation path. If a client reload is required, record that activation
boundary and preserve completed work; do not substitute a separate model client
or label a generic-agent run as the new role.

Installation may require authorization for the exact reviewed dry-run plan under
the [installer skill](../../.agents/skills/install-polylith-skills/SKILL.md);
activation may require an owner/client reload. Record the precise outstanding
action, installation receipt and resume point. Continue independent contract,
integration and fixture work where possible, but do not count 1A/1B as complete
without the required actual activation/dispatch. After activation, recheck 1A
and resume at 1B; reuse completed implementation and inputs. These boundaries do
not authorize a separate model client or a proxy as a workaround.

**Milestone:** managed definition, contract and catalog agree; installation checks
pass; the dedicated role is available independently of refine-design. No product
research or requirement changes are implied by registration alone.

## Stage 1B Test independent operation and product neutrality

Use the named role on one small unrelated synthetic product with meaningful
tasks, constraints and an amendment. Start without a prescribed area list. Check
that it derives useful research questions and coherent task relationships from
those inputs, preserving the amendment and distinguishing open decisions.

Continue the same small assignment through one bounded research question, source
inspection and saved advisory output. Check that observations, applicability,
recommendations and uncertainty remain distinguishable and that the role returns
a reusable path/handle without reproducing its payload or accepting decisions.
Then assign a continuation using that saved scope and evidence; verify reuse
rather than a restart. Use happy-path checks first and avoid broad review cycles
for each instruction edit. Assess semantic coverage, not exact prose or counts.

**Milestone:** a fresh named-agent run demonstrates standalone scope discovery,
bounded research, scoped delivery and reuse without importing Alexa concepts.
Record actual timings, configuration and any tuning decisions. This is a small
behavioral check, not a second full research project.

## Stage 1C Integrate the durable research handoff into refine-design

Update refine-design's entry and refinement-cycle guidance to locate saved
product research, check its source identity and scope applicability, and assign
`product-researcher` where an initial brief is missing or material research gaps
exist. Preserve requested owner-inspection boundaries. Unchanged, applicable
research is reused; source changes trigger only affected questions. Do not make
a fresh full research run mandatory for every small update.

Pass the source-bound brief and relevant section/evidence references to UX before
interaction planning, and keep them available to wireframe and UI agents for
their decisions. Update the relevant role contracts to consume the same durable
reference, report conflicting requirements or evidence gaps, and research only
questions that the saved brief does not adequately cover. Avoid rediscovering
the same precedents independently at each stage. Do not treat recommendations as
owner requirements or acceptance of a new design.

Exercise the normal skill handoff with the generic fixture: the named researcher
delivers a saved brief, the parent promotes it, and a bounded UX consumer receives
its relevant references. On an unchanged continuation, demonstrate that the
brief is reused without a fresh research pass. Use existing publication and local
MCP/file mechanisms; add a helper only if an actual integration gap requires it.
Document standalone and integrated use in the workflow guidance.

**Milestone:** refine-design can invoke the named role when needed, persist its
output and supply it to UX; downstream wireframe/UI instructions share that
reference. Positive handoff/reuse checks pass. This verifies integration without
regenerating Alexa's UX, wireframes or comps.

## Stage 2 Research the first scope-selected cluster and publish early findings

Use the accepted scope's priorities and proposed sequence to select a coherent
first cluster of questions. Record which scope entries it serves and why they
belong together. The current scope prioritizes composition cohesion and connected
editing behaviors; that priority comes from the accepted output, not an
independent instruction to follow this plan's former topic list.

Assign this work to the registered `product-researcher` using the existing accepted
Alexa scope, source snapshot and evidence inventory. Do not rerun Stage 1 simply
because its scope was produced before the dedicated role existed.

For that cluster:

- Audit the listed reusable evidence first. Retain applicable findings and source
  verification; check only material gaps, changed claims or uncertain applicability.
- Let the research agent select comparable products and sources by task fit and
  explanatory value. Do not prescribe brands, controls, arrangements or a minimum
  number of products when the question does not need them.
- Inspect official documentation and actual interface evidence for material
  claims. Before claiming a shared industry convention, establish it in at least
  two independent primary product sources; a directly applicable platform or
  normative rule can stand alone. A single precedent may illustrate an option
  but does not establish a general convention.
- Derive representative task walkthroughs from the scope's source locators and
  questions. Examine whole-task relationships, consequences and recovery, rather
  than treating each widget as a separate research project.
- Distinguish observed patterns, inferred applicability, recommendations,
  alternatives and unanswered owner decisions. Where a conclusion depends on an
  unresolved behavior, defer that conclusion while continuing settled questions.

Save findings progressively into the maintained brief. Record each scope question
as answered with evidence, answered by reuse, dependent on an owner decision,
dependent on technical evidence, or unresolved with an explicit evidence gap.
Avoid speculative recommendation content merely to fill every heading.

**Milestone:** the first substantial, scope-linked brief section and relevant
interface examples are readable at the final research paths. The owner can inspect
an early result before remaining research is complete. Research progress and
uncertainty belong in accompanying text, not inside illustrative product UI.

## Stage 3 Complete the remaining accepted scope

Select the next work from the same scope and its recorded question status. Reuse
completed findings wherever they answer related questions. Source collection for
independent questions may overlap; one research owner maintains interpretation,
shared references and the coherent brief.

For each remaining area, capture task context, relevant observations, sources,
applicability limits, recommendations where justified, alternatives and open
questions. Include successful journeys and consequential recovery/confirmation
flows identified by the scope. This is design research, not implementation or a
new software-test project.

Follow the scope's cross-area connections, including layout resilience to longer
translated app-defined text where relevant. Preserve its exclusions. Research
can inform owner-only choices and identify visible technical dependencies without
silently adopting a policy or changing technology direction.

**Milestone:** every accepted scope area and question is accounted for with
findings, justified evidence reuse, a dependency or an explicit evidence gap.
No completed work has been repeated simply because another area references it.

## Stage 4 Synthesize the full brief and verify evidence

Bring the findings together around the cross-area relationships identified in
the accepted scope and supported by the research. Explain a coherent overall
interaction direction and its tradeoffs without prescribing the arrangement
in advance. Resolve conflicting recommendations using product requirements,
task fit and evidence; retain disagreements that the evidence does not settle.

Include a compact coverage table mapping accepted scope areas and questions to
brief sections, sources and unresolved dependencies. Check those locators against
the description to catch omissions without generating a competing taxonomy.
Separate observations, inferred implications, proposed Alexa directions
and unresolved questions where they occur. For recommendations that conflict with
current owner intent, identify the proposed change explicitly; do not write it
back to the description during this research assignment.

Use one bounded final quality/evidence check of the complete brief, concentrating
on source coverage, material claims, applicability and contradictions. An
independent UX consultation may be used for this check, but it does not approve
new UX artifacts or commission repeated design/review cycles. Inspect new or
changed sources once and reuse saved verified evidence. Correct specific issues
without rerunning completed research.

Include the reusable-agent boundary in this check: inspect shared instructions
for product-specific defaults and retain evidence from the small unrelated scope
check before claiming general applicability. Alexa-specific recommendations
remain in its brief and test inputs, including recommendations that perform well
in this trial.

**Milestone:** a complete, sourced research brief with a coherent recommendation,
clear alternatives, open questions and explicit evidence limits.

## Stage 5 Publish and hand over for owner review

Render the final HTML from the maintained brief. Open the result through the
available preview tools and check navigation, legibility, tables, working source
links and loaded images. Correct presentation problems locally. Verify that
Markdown and HTML convey the same recommendations and questions.

The product destination lies outside the repository writable root. Use the
current tool's authorized destination-write path for publication. If that access
is unavailable, retain both completed outputs in the execution directory and
record publication as pending. Workspace staging is progress, not satisfaction
of the product-owned publication completion condition.

Finish with direct links, a short account of the most consequential findings,
and the research execution report. Deliver the brief for owner inspection before
adopting its recommendations in UX, wireframes or comps. Subsequent refinements
retrieve this durable reference and revisit only affected findings.

**Completion:** the owner has accessible Markdown and browser-readable HTML; all
accepted scope areas and questions are accounted for; material recommendations
have supporting
evidence or clearly stated limits; open questions and superseded assumptions are
visible. The reusable agent is defined, registered, activated and tested on an
unrelated product; refine-design's durable research handoff and reuse behavior
are implemented and verified. Report these implementation results separately
from the Alexa research findings. New Alexa UX/UI is not a deliverable of this
plan and must not be claimed as built.

## Execution and performance rules

Use the current Codex conversation and available agents/tools for model work.
Do not launch a separate model client, call the Codex backend, or use a localhost
model proxy/observer. The local MCP data service remains an allowed delivery path.
One research owner maintains the brief and synthesis; independent bounded source
collection may overlap where useful, with compact contributions and shared
references. The dedicated agent and workflow integration are required
deliverables; a new canonical schema, transport or general orchestration layer
is not required. Reuse the Stage 1 outputs throughout implementation and research.

Save useful findings progressively. Use assigned temporary output for specialist
delivery and parent-owned writes for the durable brief. Perform destination writes
through authorized tools with the actual filesystem permissions; if the product
destination is temporarily unavailable, retain completed outputs in the workspace
and report their locations rather than losing or regenerating them.

Record stage start/end times, source discovery and inspection intervals, research
deliveries, synthesis, verification/corrections, and HTML publication/inspection.
Record agent-definition/registration work, activation, the unrelated-product
trial and the integration/reuse checks separately from Alexa research time.
Record reused evidence and new-source counts. Distinguish overlapping windows;
report only available token/credit metrics and do not equate broad elapsed time
with reasoning. Keep a concise list of questions encountered, decisions made and
remaining limitations. Use early milestone results to identify missing coverage
or unnecessary research before spending effort on the remainder.
