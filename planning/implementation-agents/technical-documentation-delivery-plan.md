# Technical documentation: incremental delivery plan

Status: milestones 1–4 have an executable first pass; broader verification and
authored focused white papers remain. The
[working contract](technical-documentation-contract.md) defines its audience,
content, roles, and publication location. The `refine-design` technical-preparation mode and `technical` context consumer
now have a milestone-3 first pass; Markdown publication has a milestone-4 first pass. Product-specific trials and their
evidence belong in the owning product repository.

The first usable outcome is a general implementation-facing guide. Authored focused
white papers follow only after that path works. Each milestone has a result that
can be reviewed without starting implementation planning or coding.

## Working project

Use an authorized consuming repository for a live trial. Keep its human inputs, draft, generated support data, assessments and evaluation evidence there. Reinspect source and snapshot bindings before each reuse; do not turn a trial readiness note into a fixed baseline or its architecture into a shared default.

Application-specific drafts and assessments are maintained in their owning repository for owner review.

## Working rule for the first pass

The purpose of this rule is to reduce credit use while learning whether the
workflow produces a useful guide. Keep dedicated reviewers to a minimum while
completing milestones 1Ã¢â‚¬â€œ4. Have the parent and owner inspect each milestone's
result, but group independent reviewer assessments around larger, coherent
collections of work instead of calling them for every small change. Reuse
current specialist findings when their inputs have not changed; ask a new
bounded question only when the next decision needs it. If tests are added
during these milestones, test the positive path only. Record deferred failure,
invalid-input, staleness, and interruption cases without expanding the early
test suite to cover them.

After the general guide works end to end, run a broader batch of tests and
reviews across the preparation, context, and publication path. Use its findings
to correct the first pass before treating it as ready for routine use. Required
repository review gates still apply at their normal boundaries. Focused issue
documents remain the subsequent milestone.

## 1. Prove the document shape with one bounded draft

Choose one product with an accepted product model and verified snapshot, plus a
repository whose current source can be inspected. In that product repository,
prepare a _provisional_ linked-Markdown draft covering the overview, system
boundaries, one or two critical flows, decisions/gaps, and handoff. Ask the
system architect one bounded assessment question; involve the Polylith architect
only if mapping those boundaries to application structure changes the guide.
The parent records which advice was accepted, conditional, or declined. This is
an exploratory draft, not output from the future deterministic publisher.

**Done when:** a developer can identify the owner and failure behavior of each
selected flow, distinguish observed code from target decisions, and name the
remaining decisions before implementation. Review the draft for missing or
redundant pages and use the findings to tighten the working contract. If the
product model or snapshot is missing, establish it through refinement before
the trial; the draft must not reinterpret the raw description as a substitute.

## 2. Define the minimum durable technical context

Specify the technical decision/artifact shape and a `technical` context view over
the verified product snapshot. Include stable decision IDs and status, source
record links, owning scope, relevant UX constraints, repository evidence and
baseline, specialist evidence, unresolved gaps, and explicit exclusions. Define
how a dirty working tree is identified without requiring a commit. Keep accepted
target decisions distinct from observed source facts and unselected proposals.
Record which decisions can be resolved by the parent within the owner's stated
scope and which product-visible or cross-boundary tradeoffs require owner input.

**Done when:** a small product-neutral fixture can express the draft's selected
flows and decisions, and the context contract specifies validation, dependency
closure, stale/locked handling, versioning, source bindings, and exclusions.
Record invalid-binding and cross-consumer-leakage cases for the broader test
batch. Schema design should follow the actual draft's needs, not anticipate
every possible subsystem.

Milestone-2 contract and a product-neutral design fixture are now defined in
[the technical-context contract](technical-context-contract.md) and
[the synthetic fixture](fixtures/technical-context-minimum.json). They preserve
fact/decision/proposal/gap distinctions, exact evidence and dirty-baseline
bindings, audience isolation, and dependency/lock rules. The fixture passed
positive JSON, record-shape, reference-closure and dependency checks. These are
design checks, not executable resolver validation. The context boundary is ready
for owner inspection; preparation, production schemas/validation, real immutable
bindings, and resolver support are implemented in the milestone-3 first pass below. Broader failure cases remain
listed in the contract for the milestone-4 batch. No product description changes
are required by this milestone.

## 3. Build the preparation workflow and context resolver

Add a separately callable preparation skill or skill mode that loads accepted
inputs, inspects the repository, requests the bounded system-architect
assessment, optionally requests Polylith and narrower specialist assessments,
and persists only reconciled technical decisions and evidence under
`product/<product>/`. Extend the context resolver to produce a frozen,
validated `technical` context from those records. The assessment roles remain
read-only; the parent owns decision reconciliation and persistence.

**Done when:** one representative positive path prepares and resolves a frozen
technical context with stable decision identities, source bindings, and scoped
records. The contract defines how relevant changes mark claims stale and how
missing decisions leave unrelated scope usable; exercise failure cases in the
broader test batch. Any early tests use synthetic or sanitized data. No Markdown
publication is required for this gate.

Milestone 3 now has an executable first pass in
[technical preparation](../../skills/refine-design/references/technical-preparation.md):
a callable skill mode, dirty-baseline inspection, evidence and payload validation,
immutable artifact preparation, and the `technical` context resolver. The synthetic
positive path verifies real source/model/snapshot bindings, scoped records,
deterministic replay, PRD isolation and detached validation. Broader failure,
staleness, authority and interruption testing remains the milestone-4 batch;
this is not routine-use qualification. No product description was changed.

Verification: `npm --prefix skills/refine-design test` passed 104 tests;
the then-current generate-prd suite passed 34 tests. That obsolete-schema test
file was retired during the later product-publication work. The technical
positive path also exercises the resolver CLI.
Skill metadata validation and repository whitespace checks passed. Reusable tests
use a temporary synthetic repository, not the working product's design data.
The next implementation boundary was milestone 4, the Markdown publisher.

## 4. Publish the general guide

Add a deterministic publisher that consumes only the validated technical
context and writes linked Markdown under `documents/<product>/technical/`.
It must not read the human description, call agents, or choose architecture.
Start with the smallest set of pages that carries the accepted content; omit
empty pages. Record generated-file ownership so repeated publication updates
owned files without overwriting human-authored files.

**First pass done when:** a representative validated context produces a useful
guide; internal links and Mermaid blocks validate; source facts, accepted
decisions, conditional proposals, and gaps are visibly distinct; and a reader
can move from a requirement to its boundary, critical flow, decision, and
implementation handoff. The parent and owner inspect the first end-to-end run
in its product repository. Then use the broader batch to check repeatability,
interrupted or invalid publication, generated-file ownership, and other
failure cases before routine use.

The first pass uses [generate-technical](../../skills/generate-technical/SKILL.md) to publish from a frozen technical context. Shared hardening covers stale inputs, invalid decision/assessment evidence, invalid detached contexts, authored or edited output, failed publication swaps, verified backup recovery and linked output ancestors. These checks establish publisher behavior, not implementation readiness of a consuming application.

Technical guides should explain proposed features, shared capabilities and important conceptual models through bounded system and Polylith assessments and parent reconciliation. Label observed code and candidate placement separately. Use the existing architectural narrative rather than adding mandatory record kinds to fit one project. Keep sparse source evidence sparse and conditional; missing detail is a gap, not permission to invent a feature tree.

## 5. Link authored focused white papers after the general path is proven

The focused-paper route binds current authored bytes, advisory research status and a semantic revision ledger. Technical publication can link a dedicated paper-backed page and retain unresolved questions in the common handoff. Application trial evidence belongs in the owning project.

The [white-paper next action plan](technical-white-paper-workflow.md#next-action-plan)
sets four reviewable results: research agent, linked-source binding, paper
refinement, and technical-output integration. Follow that sequence before
treating a publication link as the whole feature.

Author a separate paper at its supplied repository location. Generated
`documents/<product>/<doc-name>/` folders remain output only. The general technical index keeps a
summary and link once the paper exists; the paper owns its detailed reasoning
and contracts. Reuse the same technical decisions and source bindings rather
than creating an independent authority. Preserve the paper's assessment and
research support under `product/<product>/`. Select one consequential issue for
a product-repository trial; a central player architecture is a possible trial
topic, not a required template or a default in the shared skill. The paper's
outline is chosen for the issue, not generated from a fixed skill schema.

Provide a small explicit publication link mechanism for the generated technical
index that identifies published papers and preserves generated-file ownership.
Do not place an authored paper inside a receipt-owned guide directory, and do
not link an unwritten proposed paper as though it were available.

Use the installed `attach-detail` skill to write a labeled link in the product
description, then define a product-model reference binding that does not import
paper assertions into product requirements.
Parse the linked paper from its current source, consult a bounded high-reasoning
technical research role, and let the parent revise it with a before/after
semantic coverage check. The revision may reorganize and expand the paper, but
must retain every available fact, decision, alternative, question, and evidence
item or explicitly record its resolution or supersession. Trial this loop on one
issue before adding the general-guide link and change-impact checks.

**Done when:** an authored paper adds useful depth without duplicating the
general guide, its description reference and both publication directions resolve,
research additions remain sourced and status-labeled, a substantive revision
preserves all prior information semantically, and changing a shared decision
identifies every affected page or paper. Unaffected documents remain stable.
Only then consider more elaborate issue-document navigation or formats.

## Review points and scope control

Inspect the draft after milestone 1 and the context boundary after milestone 2
with the parent and owner. Defer independent reviewer passes and the larger
test set until after the milestone-4 first pass, then assess the collected work
as a whole. These design and quality assessments are not standards-compliance
verdicts. Carry forward explicit unresolved questions rather than treating
completion of a schema or a rendered page as approval of its architecture.

Implementation-planning packages, coding assignments, exhaustive API catalogs,
and automatic white-paper generation are outside these milestones. The technical
guide must be useful to a future planning consumer, but that consumer remains
deferred. The [pipeline plan](product-model-pipeline-plan.md) retains the
separate requirements for later implementation planning and coding.
