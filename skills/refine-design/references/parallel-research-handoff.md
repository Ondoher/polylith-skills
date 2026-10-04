# One research handoff before parallel design

The parser establishes accepted product facts and an independent outcome
checklist. One product/UX researcher then assesses interaction questions; one UI
researcher consumes that handoff and assesses remaining presentation questions.
The parent proposes and validates the operational plan after these deliveries
are saved. Author workers start only after the plan is persisted.
Use this handoff for explicit [bounded parallel design](parallel-design.md);
the serial authoring route remains supported and is the normal default pending
readiness evidence. All research findings and durable execution data belong to
the consuming app.

## Assess and assign questions

Load the product-owned `research/index.md`, discover relevant uncatalogued saved
work, and compare actual scope and verification against this invocation. Preserve
question IDs across invocations. Record reuse, recheck, extension/new research or
owner/technical dependency with the relevant findings and receipt locators.

Question IDs and matching URLs alone do not prove equal coverage. The parent
reconciles semantic overlap and groups equivalent questions before dispatch.
Give each outstanding question one owner. Operational research work owns references
such as `research:question:record-picker`; the Markdown catalogue remains the
research authority and no second research-content schema is introduced.

Track initial question assignments with catalogue IDs and saved assignment/result
locators. Research work represented in a persisted operational plan uses ordinary
claims and attempt records. At the initial handoff, finish product/UX research
before dispatching UI research. UI receives
the saved UX findings and remaining gaps, and may reuse UX evidence. Give downstream
authors only the relevant question IDs, findings, source-check receipts and gaps.

Late questions return to the parent. Check both answered questions and live
assignments, then reuse an existing answer, extend its assigned scope after a
validated plan revision, or enqueue one bounded follow-up. Do not launch another
researcher because a different worker encountered the same question.

Save useful partial/negative findings and pending verification before releasing
the researcher. End the bounded assignment after the saved handoff; retain durable
references instead of an idle researcher thread. A later material gap gets a new
bounded assignment through the parent queue. A saved file is not completed coverage; an unverified material
claim cannot close a design gate. Unknown product policy goes to its owner, and
unknown technical feasibility goes to the relevant technical assessment.

## Bounded planner assignment

Supply the parent planner with exact parsed facts, the independent outcome
checklist, relevant saved research, existing design unit identities, locks and
unresolved owner/technical dependencies. It proposes:

- One item or a justified gap for every requested outcome.
- One owner for shared context, shared components and common visual foundations.
- Independent local work that references shared outputs instead of copying them.
- Actual prerequisites, future producer/output references and exact review gates.
- Blocked work and the smallest question needed to unblock it.

Validate through `DesignPlan`, inspect the resulting ready set, and save the plan
through `DesignCoordinator` before the first author claim. The coordinator computes
readiness; model prose, a saved ready flag or a transport receipt cannot authorize
dispatch. Initially use assembled whole-UX acceptance before parallel UI.

## Evaluate planning quality

Assess source coverage, coherent boundaries, unique shared ownership, useful
parallel work, dependency/review preservation and honest uncertainty separately.
Use independent workflows, a shared component, conflicting evidence, sparse
inputs and an unresolved owner decision. Different valid decompositions may pass;
do not compare wording or item order against a golden model response.

Record supplied inputs, proposed/saved plan, deterministic findings, independent
coverage assessment, research reuse/extension decisions, remaining limits and
repair effort. A second invocation must recover these records without the
previous conversation. Preserve source-bound decisions and actual checks; do not
silently mark the research/planner handoff complete while material gaps remain.
