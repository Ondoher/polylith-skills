# Product-owned UX and UI research

Use the existing product root from [product location](product-location.md).
All reusable UX/UI research belongs under its `research/` directory, including
research gathered by planners, designers, wireframe authors and reviewers, not
only named researchers. Temporary assignment directories are delivery staging;
they must not be the only surviving copy of useful findings or evidence.

Keep durable application-specific inputs, research, deliveries, captures and run
records in the owning application's repository. Temporary experiments may stage
application data in a skills checkout's designated temporary directory; preserve
useful findings and evidence in the application before retiring the experiment.
Do not promote application data into tracked skills files or treat temporary
staging as the durable research library. If product-root access is unavailable,
retain the staged delivery and report the pending save.

## Catalogue coverage by question

Maintain `research/index.md` as a small entry point to existing briefs, evidence
bundles and structured pattern records. Use ordinary Markdown; this adds no
artifact schema, research transport or second requirements model. Keep stable
question IDs and section locators so assignments can retrieve only relevant
material. A brief may answer several questions; a question may draw on several
briefs. Discover uncatalogued existing research before declaring a gap.

For each consequential question, record:

- The concrete question, UX/UI discipline, affected task/surface/component/state,
  intended users, platform and relevant complexity constraints. State the covered
  scope and exclusions; a desktop example does not answer every platform or state.
- The answer or current finding and whether coverage is answered, partial, open,
  blocked or superseded. An agenda is planned coverage, not completed research.
  Distinguish research gaps from owner decisions and technical dependencies.
- Paths and section/record IDs for findings, primary sources, saved images/assets
  and verification receipts. Record source context and immutable inputs/hashes
  where available, research/access dates and material versions.
- Verification by material claim: available, inspected, parent source-checked or
  unverified, including the receipt and inspection limits. A downloaded image or
  icon is not visually inspected evidence. Preserve comparable fit, transfer
  boundaries, uncertainty and conflicts separately from source verification.
- Reopening triggers: changed requirements, audience/platform/scale, unsupported
  states, material version changes, conflicting evidence or an unresolved claim.
  Keep product decisions and advisory recommendations distinct.

Do not mark a whole topic complete because a brief exists or its sources were
checked. Link canonical `patternResearch` records from the catalogue rather than
duplicating them. Those records keep their existing schema and verification gate;
standalone supporting briefs and evidence remain in `research/`.

## Assess coverage on every invocation

Before assigning UX/UI research or selecting a direction at the pattern-research
gate, compare the current task and source-bound requirements with the catalogue.
Read matching findings and receipts, not just titles. Save a compact assessment
in existing run evidence: question IDs, current context, applicable locators,
reuse decision and remaining gaps. For each material question choose:

- **Reuse:** the question and constraints are covered, material claims remain
  valid, and the reference fit and verification suffice for this use.
- **Recheck:** the answer exists but a material claim, verification or applicability
  needs checking. Check that portion without repeating discovery.
- **Extend/new research:** a changed or missing task, state, platform, complexity
  or conflicting pattern needs evidence. Assign only that gap with relevant prior
  findings, exclusions and question IDs.
- **Owner/technical dependency:** evidence cannot decide the product policy or
  feasibility. Keep it open and route it to its owner; do not research it forever.

Changed source bytes require assessing affected meaning, not discarding every
finding. Identical bytes do not prove coverage of a new question. There is no
blanket age cutoff: assess freshness against the claim and material versions.
Unverified, stale or partial findings stay visible as leads and limits; they
cannot suppress necessary research or satisfy a source-check gate. A bounded
unsuccessful search is evidence of its search limits, not universal absence.
Explicit clean `reset-design` requests retain their fresh-input rules and do not
reuse earlier derived research.

Pass selected question IDs, findings, evidence/receipt paths or handles, and gaps
to each downstream UX, wireframe, UI and component assignment. Research ownership
does not partition reuse: a UI question may already be answered by UX evidence.
Consumers report newly discovered gaps to the parent for bounded follow-up.

## Preserve before ending an assignment

The parent saves all useful scoped deliveries, including partial findings,
negative searches, unresolved questions and pending verification, before releasing
the specialist or ending the invocation. Preserve concise findings, citations,
queries, dates/versions, source context and material interface evidence; omit
private reasoning and full transcripts. Record verification honestly, then update
the catalogue when claims are checked or scope changes. Saving is not acceptance.

Keep evidence and necessary frozen inputs together with usable relative links.
Preserve immutable historical receipts and exact input bytes; when relocating,
record original/durable paths and hashes without rewriting receipts to imply a
new check. Reuse an identical bundle rather than copying it for each stage/run.
Retain distinct source contexts and interpretations even when an asset is shared.
If product-root access is pending, retain the staged delivery and report the
pending save; do not claim durable preservation. No later invocation should need
a temporary directory or a surviving agent thread to use the research.
