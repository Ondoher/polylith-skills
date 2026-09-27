# Single-pass UX/UI: autonomous execution plan

Started 2026-09-27 00:40:02 UTC. The owner authorizes self-directed work, reasonable
alternative approaches when evidence exposes a problem, reuse of generated data,
performance tracking, and checkpoint-adviser recommendations with preapproved
commit messages. This implements the [working method](single-pass-ux-ui.md).

## Outcome and boundaries

Deliver an executable route from the existing trusted facts handoff through
incrementally persisted UX and UI design to usable comps and documentation inputs.
Use one primary authoring pass per role, an optional bounded repair pass, and
mechanical assembly. Keep transferred data small and reuse shared definitions.
Allow overlap where immutable inputs and independent review make it valid.

Assume parsing and the facts-to-UX handoff work. Do not rebuild them. Preserve
source authority, stable references, locks, honest partial coverage, and exact
review freshness. Publication hierarchy and page breaks remain with the
document-structure agent. Later technical preparation receives sufficient saved
behavioral information and adds its own repository evidence and technical decisions.

Work in this repository and isolated local test directories. Reuse saved Alexa
outputs read-only when useful; do not modify the live or archived Alexa product,
run another full paid refinement, push, or install user-level changes as part of
this plan. Repository source changes may affect the installed linked skills;
keep existing paths usable until a replacement is verified.

## Execution sequence

| Slice                                 | Concrete work                                                                                                                                                                                                                                                | Evidence required before moving on                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. Preserve the starting point        | Save this plan, the existing research/method documents, and a timing record. Ask the checkpoint adviser whether they form a coherent checkpoint; commit under standing authorization when recommended.                                                       | Complete repository scope inspected; checkpoint hash and starting status recorded.                                                                                 |
| B. Prove the smallest representation  | Inventory the actual UX/UI/review/publication/technical consumers. Reuse one saved multi-step flow with a shared dialog, alternatives, and representative scenes. Define the smallest authoring records and exercise conversion into usable consumer output. | Required meaning and bindings retained; before/after byte counts; explicit decision about direct consumer migration versus derived compatibility output.           |
| C. Implement persistence and assembly | Add bounded file/record delivery, stable IDs, shared definitions, indexed references, targeted patches, recoverable partial results, and compact manifests using existing helpers where possible.                                                            | Positive replay plus interrupted record, invalid reference, stale patch, conflicting identity, and unchanged-unit preservation cases.                              |
| D. Integrate agents and consumers     | Update the UX/UI instructions and owning skill references to use the executable path. Integrate comp generation and detached documentation inputs; retain technical meaning and exact provenance.                                                            | Saved-data end-to-end smoke generates real comps and usable product/technical context inputs without manual re-authoring.                                          |
| E. Enable safe overlap                | Reuse current independent foundation work; add immutable batch delivery and scoped eligibility only where the verified binding model supports them.                                                                                                          | Appending unrelated work preserves released scope; changing a consumed rule invalidates dependent work; dependent or blocked records are not released as accepted. |
| F. Verify and hand off                | Run focused tests during development, required package tests after integration, formatting, and inexpensive replay measurements. Address failures, request final checkpoint advice, and write the execution summary.                                         | Coherent saved changes, actual command results, metrics with limits, explicit remaining gaps, commit history, and final worktree status.                           |

Each slice should leave a useful intermediate result. A checkpoint is a semantic
save point, not a claim that the whole method is complete. Do not stop after the
first helper while representing the production path as delivered.

## Decisions without waiting for the owner

- Choose the smallest maintainable implementation that preserves required meaning.
  Prefer one authored representation with deterministic consumer projections over
  multiple manually maintained models. A legacy representation may remain a
  derived compatibility output if broad migration is demonstrably more costly;
  record why, what it preserves, and any continuing expansion cost.
- Keep identities independent of document hierarchy. Reuse existing IDs and
  generated data rather than deriving replacements from labels or positions.
- Use explicit staging files for large handoffs. Existing read-only agents can
  use a supported parent-owned exact record writer when scoped direct writing is
  unavailable. Do not weaken unrelated role boundaries merely to enable transport.
- Treat unclear source meaning as an issue on the affected unit. Preserve useful
  independent output and actionable remediation; never invent a passing review.
- Keep one UX and one UI author. Do not spawn per-record designers or initiate
  fresh paid design trials to test mechanical assembly. Existing independent
  review is still required for real design acceptance; fixture evidence is labeled.
- Prefer actual overlap of useful work over extra coordination. If reviewed
  per-batch release cannot be made trustworthy within the binding model, preserve
  foundation overlap and finish serial composition; record the exact remaining
  limitation rather than bypassing review or leaving the entire route unusable.
- Use bounded targeted repairs after failures. Diagnose a repeated failure before
  another attempt; choose an alternative after a demonstrated incompatibility,
  unacceptable data expansion, or verification failure, not from speculation.
- Preserve current working behavior until its replacement passes relevant tests.
  Update installation catalogs only if package ownership actually changes.

## Performance evidence and reuse

Maintain [single-pass-execution-metrics.json](single-pass-execution-metrics.json)
throughout work. Record timestamps and measured duration for substantive stages,
commands, tests, replay, rendering, adviser consultations, and discovered waits.
Also record input/output bytes, unit counts, repetition, and available usage.
Unavailable token/credit usage is `null`; do not estimate billing from bytes.

For a bottleneck, record the observed symptom, supporting measurement, likely
cause distinguished from observation, action taken, and result. Use a new
measurement after a material change rather than repeatedly timing unchanged work.
Intervals may overlap; total elapsed time is not their sum. Implementation/test
timings do not prove a live design-agent speedup.

Reuse fixtures, saved product artifacts, rendered assets, accepted decisions,
source-checked research, and current test results where their inputs are unchanged.
This explicitly includes data produced during this execution, not just artifacts
that existed at its start. Persist completed records, shared definitions, partial
assemblies, converted fixtures, rendered scenes, and useful diagnostics at their
first usable boundary. Resume from those results after interruptions or a change
of implementation approach; do not start the product or fixture conversion over.

Bind reusable outputs to their actual inputs, relevant shared definitions, and
the producing contract/tool version. Reuse unaffected units when another unit
changes; regenerate the changed unit and its actual dependents. A failed or
partial unit stays available as repair material with its honest status. Reuse
does not promote it to accepted design or transfer a stale review to new bytes.
Record avoided regeneration when directly observable, without inventing a time
or credit saving. Keep saved intermediates accessible to later slices and agents.

Keep large generated outputs in ignored or temporary test storage; commit only
small intentional fixtures and metrics. Avoid broad file dumps and duplicated
research. Focused checks come first; run broad checks once the integrated changes
justify them and repeat only for changed scope or unresolved failures.

## Checkpoint workflow

Activate the `review-standards` checkpoint-adviser mode independently of standards
review gates. Use a fresh adviser with the current semantic-only instructions;
reuse that adviser for later coherent slices. The adviser judges whether the
complete current state forms a reasonable unit of functionality.

For a recommendation, inspect all changes and untracked files, display the exact
suggested message and scope, then use `check-point` under the owner's standing
preauthorization. No repeated message approval is required. Preserve snapshot,
size/sensitive-file, staged-diff, and post-commit verification. Do not push.
An unexpected material file concern is resolved separately rather than hidden
by the preauthorization. Failure of standards-review startup is not an adviser
prerequisite and must not stop independent implementation work.

## Final summary

Write `planning/refinement-efficiency/single-pass-execution-summary.md` with:

- What became executable and how to use it.
- The selected representation and any departures from the working method.
- Reused data and checks actually run, including failures and their resolution.
- Useful timings, byte counts, observed bottlenecks, and measurement limits.
- Parallelism supported, review/coverage boundaries, and remaining work.
- Checkpoint hashes, final repository state, and no implied live performance claim.

Update progress below at meaningful boundaries, not after every command.

| Slice | State       | Evidence / next action                                                                                                                           |
| ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A     | Complete    | Checkpoint `6a99725` preserves the full planning baseline and owner references; initial adviser recommended it.                                  |
| B/C   | In progress | Saved synthetic UX/UI captured once in ignored staging. Incremental record store passes five recovery/reuse tests. Authoring projection is next. |
| D–F   | Pending     | Integrate the authoring route and owning instructions before claiming the method delivered.                                                      |
