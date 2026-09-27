# Refinement performance findings and proposed fixes

The single-pass implementation and saved-data measurements are recorded in
[the execution metrics](single-pass-execution-metrics.json) and
[execution plan](single-pass-execution-plan.md). They address authoring, transport,
reuse and mechanical assembly; no live UX/UI speedup is claimed. New findings
SP-01 through SP-05 distinguish measured costs from the historical observations below.

Recorded 2026-09-26 after the first authorized fresh Alexa refinement. This is
the follow-up register for the [efficiency plan](plan.md). It records problems
encountered, including coordination mistakes, and proposed remedies. These
remedies have not been implemented by this documentation change.

The current response to PF-01/PF-02 is the [single-pass UX/UI production method](single-pass-ux-ui.md).
The owner now says to assume parsing and the facts-to-UX handoff are satisfactory.
The next scope is design authoring, bounded reconciliation, assembly, and compact
handoffs; upstream packet redesign is not a prerequisite for that work.

## Evidence and measurement limits

Run: `run-20260926-214023-cold-start`, in the sibling Alexa checkout under
`C:/dev/alexa/product/Alexa/runs/`. The archived `Alexa.sav` design was not read
or reused. The current authored description supplied product authority.

The measured interval was **21:40:23–23:22:10.724 UTC: 101.80 minutes**. Initial
instruction/source inspection preceded the captured start and is excluded;
final reporting after the snapshot is also excluded. This is one live run with
recovery, not a controlled comparison with yesterday's run.

| Work                               | Observed duration                             | Interpretation                                                              |
| ---------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| Initial product interpretation     | 5.35 minutes                                  | Parent stage; 59 semantic records, 45 source claims                         |
| Visual foundations                 | 8.67 minutes specialist; 18.14 minutes stage  | Overlapped UX; stage includes parent work                                   |
| Initial UX attempt                 | 26.46 minutes specialist; 28.30 minutes stage | Interrupted with selected decisions but no serialized candidate             |
| UX recovery and assembly           | 16.95 minutes stage                           | Includes a 14.02-minute recovery consultation; not pure code execution      |
| First independent UX review        | 6.82 minutes                                  | Found material semantic omissions                                           |
| Semantic correction                | 2.28 and 2.84 minutes specialist              | Two follow-ups within one correction round; parent reconciliation adds time |
| Corrected whole-artifact review    | 6.82 minutes                                  | Passed UX revision 2                                                        |
| Trace-only review                  | 3.31 minutes                                  | Required after three mechanical trace repairs; passed revision 3            |
| UI composition                     | 27.32 minutes                                 | Includes about 4.95 minutes of explicit review hold                         |
| Final UI/manifest/context assembly | 1.324 seconds                                 | Deterministic packaging, excluding specialist work                          |
| Final PRD publication              | Not run                                       | No measurement of `generate-prd`, document structure, or page planning      |

**Intervals overlap; do not add this table.** Specialist wall time includes
waiting and response delivery, not just reasoning. The UI agent's self-reported
packaging assessment timestamp preceded final receipt by 14.93 minutes. That
does not establish how much of the interval was reasoning, JSON generation, or
delivery. Nine specialist consultation turns ran across five agent instances.

The output contains reviewed UX for four workspaces, nine use cases, 68 actions,
and 24 interaction frames, plus 11 UI scenes. Three scenes are explicitly partial;
the remaining eight represent selected frames, not all runtime variations.
Fourteen UI requirements remain unspecified or deferred. Specialized player,
timeline, and playlist detail is unfinished. The final context is valid for
publication of this partial design; it is not evidence of complete product design.

The following links depend on the local sibling Alexa checkout. The findings
and numbers above remain readable without it:

- [Run report](../../../alexa/product/Alexa/runs/run-20260926-214023-cold-start/run-report.md)
- [Run status and observations](../../../alexa/product/Alexa/runs/run-20260926-214023-cold-start/run.json)
- [Specialist dispatch and receipt events](../../../alexa/product/Alexa/runs/run-20260926-214023-cold-start/specialist-events-final.json)
- [UX review findings](../../../alexa/product/Alexa/runs/run-20260926-214023-cold-start/ux-review-initial-verbatim.json)
- [Current UX verification](../../../alexa/product/Alexa/runs/run-20260926-214023-cold-start/ux-verification-current.json)
- [UI verification and rendering findings](../../../alexa/product/Alexa/runs/run-20260926-214023-cold-start/ui-verification.json)
- [Design-language verification](../../../alexa/product/Alexa/runs/run-20260926-214023-cold-start/design-language-verification.json)
- [Assembly timing](../../../alexa/product/Alexa/runs/run-20260926-214023-cold-start/assembly-timing.json)
- [Partial parent usage telemetry](../../../alexa/product/Alexa/runs/run-20260926-214023-cold-start/parent-usage-final-snapshot.json)

## Problems, fixes, and inexpensive verification

### PF-01: UX decisions expanded manually into a large canonical document

**Observed.** The planner reported completing semantic decisions but spending
the initial attempt expanding actions, states, frames, and graph records. No
persistable candidate arrived before interruption. Recovery required compact
semantic chunks and task-specific parent assembly. UX revision 3 is 480,856
bytes. The time is measured; the explanation is the planner's report, not a
token-level profiler result.

**Proposal under discussion.** Center UX on an identified major user interface element
and its list of **flows**. Each flow consists of linear steps describing user
actions and visible application responses. Steps call out intermediate elements
such as dialogs and link to reusable elements such as a content-selection dialog.
Error handling is expressed as alternate flows. The owner requested an industry
practice check before settling this conceptual model. See the [research findings](ux-flow-model-research.md).
The runtime schema and consumers have not been changed.

The subsequent [working synthesis](ux-documentation-synthesis.md) records the
reference-document exploration and the owner's clarification: element/flow
relationships describe the product, while the document-structure agent receives
publication-neutral information and chooses its reading hierarchy and pages.
The collection/storage/presentation breakdown remains to be designed.

The unit of UX design is:

- A major interface element, with its purpose and relevant displayed information.
- Its flows, each named for the task being performed, with any necessary starting
  condition and a linear sequence of steps.
- Step references to supporting or reusable interface elements, stating what
  returns to the calling flow and where it continues when that matters.
- Alternate flows for errors, cancellation, and other meaningful variations,
  stating when they apply and how they finish or resume the primary flow.

Define reusable elements once and refer to them from their callers. Shared rules
also have one definition. Keep references stable as the information hierarchy
changes; reader-facing outline and step numbers remain presentation details.
Use **flow** as the working name for these local use cases.

For example, the Video Editor owns an **Add content** flow:

1. The user chooses Add Content.
2. The reusable Content Selection dialog opens.
3. The user selects content and confirms; the dialog returns the selection.
4. The editor inserts it at the current insertion position and displays the result.

Its **Cancel selection** alternate flow closes the dialog and leaves the editor
unchanged. Its **Selected content is unavailable** alternate flow explains the
problem in the dialog and lets the user select another item or cancel. These are
illustrative descriptions of the model, not new Alexa product requirements.

**Proposed fix.** Evaluate a simpler canonical UX model around those elements,
flows, steps, and references. This is the current alternative to preserving the
entire graph contract behind a smaller authoring syntax. Avoid a second graph or
separate error-state model to restate the flows. Retain a derived representation
only where a concrete consumer need justifies it, and generate its bookkeeping
in code. Behavioral decisions remain with the UX planner. Inventory and update
the affected validation, independent review, UI handoff, and publication consumers
as one coherent change; current schemas remain authoritative until that work lands.
The document-structure agent still organizes the information hierarchy and page breaks.

**Cheap check.** Express one saved major element and several of its flows in the
simpler model, including a shared dialog, cancellation, and a failure/retry
alternate. Check that users can follow every sequence, references resolve,
return/continuation behavior is explicit, and required product meaning survives.
Verify the intended consumers can use it without re-authoring a graph. Use saved
evidence and local fixtures; no full paid refinement is needed to test this model.

### PF-02: UI repeats scene structure and serializes a large response

**Observed.** Eleven scenes required a 191,302-byte persisted proposal and a
27.32-minute consultation, including the review hold. Headers, workspace
navigation, command groups, and unchanged scene regions recur throughout the
JSON. The proposal passed validation on its first attempt. Its precise
reasoning-versus-serialization split is unknown.

**Fix.** Let the UI designer author shared scene fragments and explicit state
overrides, then expand them in code into the current UI contract. Geometry,
hierarchy, representative content, focus choices, and visual decisions remain
the UI designer's responsibility. Validate the interaction references required
by the selected UX contract, including declared omissions; shared fragments must
not erase differences between flows or their steps. Reconcile existing frame
bindings with the simpler PF-01 model during its consumer migration.

**Cheap check.** Use the saved UI response to verify expansion, scene identity,
bindings, and byte-stable rendering. Compare a few representative screenshots.
Measure authoring benefit during the next ordinary UI task, not a duplicate trial.

### PF-03: Structured handoffs remain much larger than the description

**Observed.** The original description was 25,710 bytes; the initial planner
packet was 134,400 bytes and the frozen packet 140,363 bytes. The current helper
intentionally carries complete structured authority and indexes. Large UX
artifacts also travel into review and UI. These sizes do not measure tokens,
credit use, or how much information an agent actually reread.

**Fix.** Separate immutable global authority from compact task views. Supply
cross-cutting rules, relevant records, dependency closure, unresolved scope, and
exact source references without repeating derivable indexes in every handoff.
Keep the full verified authority retrievable. For corrections, send the delta
and affected context rather than another full authoring assignment.

**Cheap check.** Extend existing planner-input fixtures with a late global rule,
an unclassified claim, a lock, and a cross-workspace dependency. Verify none is
lost, and report actual packet bytes. See [refinement-input.mjs](../../skills/refine-design/scripts/refinement-input.mjs).

### PF-04: Long consultations produce no durable intermediate result

**Observed.** The initial UX attempt had no saved candidate after roughly
26 minutes. UI also had a long interval between its progress message and final
JSON. Parent requests for updates did not create a persistable intermediate
artifact. Interrupting risks losing an unfinished response.

**Fix.** Request bounded authoring units with an early first deliverable, such
as one major interface element with its flows and referenced dialogs, or one
shared shell and scene. Persist those units with explicit unresolved
references; promote them only after canonical validation. Define recovery at
safe response boundaries. An elapsed-time threshold should trigger scope
assessment, not an endless interrupt/restart loop or fabricated completion.

**Cheap check.** Simulate a missing or invalid unit. Keep completed independent
units, mark repairs, continue siblings, and return to the parent scope when a
dependent branch cannot proceed. Resume without repeating accepted units.

### PF-05: Manual transcription and task-specific parent assembly add work

**Observed.** The parent manually reconstructed specialist output and wrote
several one-off assembly/correction scripts. The first saved review copy omitted
one evidence reference; later verbatim capture recovered it. Findings and verdict
were unchanged, but the transcription was still defective. Direct JSON capture
was adopted late and avoided retyping the final UI proposal.

**Fix.** Provide a supported exact response-to-artifact handoff, with a digest
and validation before acceptance. Move proven mechanical transformations into
small reusable adapters instead of regenerating scripts per product. Support
targeted patches to saved candidates. The current task-local session-log capture
is a recovery technique, not a portable production interface; do not depend on
encrypted session internals or collect unrelated content.

**Cheap check.** Replay exact saved responses, truncated JSON, duplicate units,
and a missing reference. Verify rejection preserves the last valid artifact.

### PF-06: Publication checks ran after independent UX review

**Observed.** UX validation and qualitative review passed three realization
links that publication preflight rejected. Correcting only those links and the
revision invalidated the exact review binding, requiring a further 3.31-minute
review and holding UI for about five minutes. Another package request incorrectly
used a visual-rule ID as a product gap. Neither failure required another design.

**Fix.** Run every applicable deterministic product/UX/publication check before
requesting UX review. Share relation-kind checks across ingress and packaging,
and validate scope/status/gap requests before committing. Freeze the candidate
only after those checks pass. Later UI checks still belong after UI authoring;
do not require nonexistent downstream work to preflight UX.

**Cheap check.** Replay the three invalid trace mappings and the invalid gap
reference as negative fixtures. Require actionable failures before the review
dispatch point. Retain exact review invalidation when any reviewed bytes change.

### PF-07: Semantic omissions caused a substantive correction round

**Observed.** Independent review found missing clip-update impact content,
missing exact replacement destination, combined draft/project decision stages,
insufficient shared-definition research, and unresolved cross-workspace
New/Open availability during export. These were real quality defects, not
obsolete expectations. Correction needed two targeted planner follow-ups and a
second whole-artifact review. Three reviews together cost about 17 minutes.

**Fix.** Include a concise decision check within the initial authoring pass:
what the user sees, what changes, what remains unchanged, available choices,
continuation, cancellation, and failure. Reconcile cross-cutting operations
before freezing. Identify unfamiliar patterns and research their bounded
questions during authoring. Reuse source-checked research with its limits.
Do not replace independent review with a schema check or add another broad agent
pass merely to perform this check.

**Cheap check.** Preserve these omissions as negative examples. Validate
presence and references mechanically; leave adequacy of meaning to review.
Corrections should state changed records and unchanged scope explicitly.

### PF-08: Formatting and selected decisions churn exact source bindings

**Observed.** Formatting required a source freeze and revised bindings. Later,
one selected export policy required another complete model proposal and revised
UX/review inputs. All 59 IDs were preserved; only the export lifecycle record
changed materially. Formatting itself took about 0.82 seconds; coordination and
dependent revalidation were the concern. The current contract deliberately
requires a complete bound proposal when source bytes change.

**Fix.** Settle source formatting predictably, consolidate selected decisions,
and perform the final writeback/freeze before preflight and review. Add a
verified decision-patch-to-source-and-claim mapping only if it can prove unchanged
meaning elsewhere. Until then, keep the complete-proposal fallback; replacing
hash fields on stale records is not a performance fix.

**Cheap check.** Replay a formatting-only edit and one localized policy change.
Verify source accounting, preserved IDs/material hashes, correct invalidation,
and one final writeback. The live source-change audit supplies a useful example.

### PF-09: Shared transient interactions do not fit the current contract cleanly

**Observed.** Multiple invocation triggers, captured return targets, and
conditional export destinations were difficult to express. The UX author
reported this as part of the initial stall. Explicit partial trace gaps remain
even after the independent pass; they must not imply an accepted disabling policy.

**Proposed fix.** With PF-01's candidate element-owned flows, a step references the reusable
dialog, describes its relevant input and returned result, and specifies where
the caller continues. Error and cancellation paths are alternate flows. Each
caller retains its own context while sharing the dialog definition. This
offers an alternative to extending the old graph to express those calls and returns.

**Cheap check.** Use two element-owned flows that invoke the same dialog and
resume at their own next steps. Include deferred discard and successful,
canceled, and failed continuation. Verify that reuse does not merge callers or
lose retained work. Evaluate this with the bounded PF-01 model change.

### PF-10: Conflicting version guidance adds contract-discovery work

**Observed.** The UI role's planning guide still described schema 0.2 while the
current skill and validator required 0.3. The parent explicitly corrected the
assignment. This was resolved in the run, but the stale guide remains a reusable
source of confusion. No isolated duration was measured.

**Fix.** Remove contradictory active guidance and point assignments to one
current contract/version source. Mark historical examples clearly. Generate
mechanical version summaries where useful, without generating product decisions.

**Cheap check.** Add a bounded consistency check for active skill, agent, guide,
fixture, and validator versions. Avoid scanning historical prose as if every old
version mention were an error. Affected guide: [ui-designer.md](../implementation-agents/ui-designer.md).

### PF-11: Renderer capabilities diverge from accepted design choices

**Observed.** The composition renderer uses labels above inputs/selects rather
than MUI outlined notches. The foundation focus SVG retains a neutral inner
border/label and adds a brand outer ring instead of the selected focused pair.
The foundation verifier also reported `toggle-buttons` and
`embedded-field-states` gaps. A timeline placeholder's explanatory text overflowed
its reserved height. Fifty-one SVG specimens and HTML inspection were produced;
the time attributable to each defect was not isolated.

**Fix.** Expose supported rendering capabilities before scene authoring. Repair
the shared renderer against the accepted design contract, with representative
state fixtures, rather than redesigning the product to accommodate it. Keep
placeholder detail in annotations or another supported review area when it
cannot fit the reserved component. Distinguish structural render success,
visual inspection, and finished design status. Reuse unchanged specimens on
later runs; retain required first-run baseline coverage.

**Cheap check.** Render rest/focus/error/disabled fields and selects, supported
ordinary controls, and one long placeholder case. Inspect targeted screenshots;
byte-stable replay alone does not establish visual correctness. These are
quality/repair costs, not evidence that rendering computation is slow.

### PF-12: Verification and preview scope required manual correction

**Observed.** Recursive Markdown checking reached immutable source copies whose
authored relative links were not relative to the verification directory. A
temporary copy of owned design-language files was used to verify the intended
scope. Standalone scene navigation also assumed a product index and component
collection that had not been published; explicit inspection landing pages were
needed. Intermediate pages/status records required manual revision updates.

**Fix.** Verify an explicit generated-file manifest and resolve source links
against their authoritative source root. Give standalone inspection its own
navigation contract; unavailable destinations should explain their status.
Derive the current revision/review label and latest stage status from saved
bindings while retaining historical attempts separately.

**Cheap check.** Include immutable source snapshots, an authored relative paper
link, a deferred component collection, and a revised UX artifact. Check intended
local targets and current labels without scanning unrelated product files.

### PF-13: Coordinator work and repeated inspection also consume time and tokens

**Observed.** The parent repeatedly inspected contracts, created scripts,
reconciled responses, diagnosed failures, maintained receipts, checked status,
and inspected renders. Foundation specialist time was 8.67 minutes versus
18.14 minutes for its stage, but overlap prevents treating that difference as
exclusive overhead. UX recovery also mixed reasoning and parent assembly.
The parent telemetry snapshot contains 197 response IDs. There is no reliable
isolated total for coordination, tool latency, or manual debugging.

**Fix.** Use a small reusable stage driver for established deterministic steps,
compact tool summaries, saved artifact handles, and event-based result collection.
Batch independent reads, retain useful results, and avoid repeated whole-file
dumps. Resolve predictable checks before dispatch. Preserve user progress
updates, authorization boundaries, serial snapshot writes, and targeted
inspection; do not remove them solely to make the timing look better.

**Cheap check.** Replay a saved run locally and count helper calls, source
interpretations, generated bookkeeping bytes, and repeat reads. Distinguish
deterministic execution from specialist waiting. A general agent framework is
not required.

### PF-14: Small invocation mistakes cause avoidable recovery work

**Observed.** The initial run ID was invalid; the first publication request
misclassified a gap; one in-memory UI replay called the helper with the wrong
argument shape. Each was corrected without changing accepted design intent.
Other command/path handling was task-specific. Their aggregate duration was
not measured, and no approval rejection blocked the run.

**Fix.** Use validated run-ID creation, typed/documented helper entry points,
and small request builders for proven mechanical fields. Validate commands and
request envelopes before expensive dispatch. Keep caller-owned acceptance and
scope choices explicit. Batch safe independent operations while respecting
workspace permissions; do not weaken authorization controls.

**Cheap check.** CLI/API smoke fixtures should cover invalid IDs, gap kinds,
missing inputs, Windows paths, and the documented helper signatures. Avoid a
fresh design consultation for an invocation error.

### PF-15: Performance receipts and usage evidence are incomplete

**Observed.** Startup time was not captured. Some stage receipts combine agent,
parent, and waiting time; consultation counts in early stage records did not
fully reflect recovery turns, so final event counting was needed. Some historical
inputs were later overwritten, making those receipts unsuitable for reuse.
Some request hashes identify a stored dispatch payload that may be encrypted,
rather than a canonical plaintext request. Partial parent-only telemetry was
recovered late; specialist usage and billed credits remain unknown.

The final provider snapshot reports 26,486,009 input tokens, including
24,902,912 cached input tokens, and 139,078 output tokens, including 41,461
reasoning tokens. These are repeated provider-reported inputs, not unique source
tokens. Subsets must not be added again. Boundary-crossing responses and missing
specialist/final-report usage prevent treating this as a complete billed total.

**Fix.** Start measurement before instruction discovery. Record dispatch,
hold/resume, final receipt, persistence, validation, and rendering events
automatically. Hash the canonical request/scope at dispatch without persisting
raw prompts; capture immutable input identities before work and output identities
after validation. Derive call counts and current status from attempts/events.
Record sourced usage by agent/stage when available, with aggregate/subset scope
explicit and unknown values left unknown. Avoid session-log archaeology as a
normal workflow step.

**Cheap check.** Use simulated overlap, a hold, retries, overwritten live inputs,
missing usage, and duplicate provider events. Verify elapsed intervals, counts,
deduplication, and invalidation. See [refinement-run.mjs](../../skills/refine-design/scripts/refinement-run.mjs).

## Unmeasured concerns and historical blockers

- **`generate-prd` may explain additional historical time.** It did not run in
  this measurement. Time document-structure inventory, hierarchy/page planning,
  content assembly, rendering, and repairs separately during the next requested
  publication. Preserve the document-structure agent's organization authority.
  Do not infer a publication bottleneck from refinement timings.
- **Complete component design and runtime coverage cost more than this output.**
  Player/timeline/list details, other guard invocations, saving frames, and many
  runtime variations remain declared gaps. Compare future runs at matching
  scope and quality; silently deferring more work is not an optimization.
- **Historical fixture and checkpoint-startup problems caused earlier workflow
  friction.** The plan records their later repair and adviser simplification.
  They did not block this measured run. Do not fold their historical time into
  these results or revive them as checkpoint prerequisites.
- **Model/provider effects were not isolated.** No paid model comparison or
  baseline was run, and no measured latency or credit reduction is claimed.

## Recommended order and completion evidence

| Priority                  | Work                                                                                  | Evidence required before considering it addressed                                                            |
| ------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| First                     | PF-06, PF-10, PF-14: early complete preflight, current guidance, reliable invocations | Saved negative cases fail before review; current positive replay passes                                      |
| First                     | PF-01, PF-02, PF-05: simpler element-owned flows, compact UI authoring, exact handoff | Product meaning and stable references preserved; affected consumers updated together; usable output verified |
| Next                      | PF-04, PF-13, PF-15: durable partial delivery and automatic run evidence              | Interrupted/repaired replay resumes smallest affected scope; timing/counts/provenance remain correct         |
| Next                      | PF-03: smaller dependency-aware task views                                            | Late global rules, gaps, locks, and unclassified content retained; actual input sizes reported               |
| Next                      | PF-07, PF-08: decision completeness and source freeze                                 | Known omissions caught; one coordinated writeback; valid exact review and source accounting                  |
| With PF-01                | PF-09: supporting and reusable dialog references                                      | Two callers retain their own continuation; cancellation and errors work as alternate flows                   |
| Targeted repair           | PF-11, PF-12: renderer fidelity and inspection scope                                  | Focused state/overflow screenshots and local-link checks pass without altering product authority             |
| Next ordinary publication | Separate `generate-prd` measurement                                                   | Stage timing plus comparable scope/quality, without a duplicate paid baseline                                |

Use saved responses and small synthetic fixtures first. Do not rerun the full
101.80-minute product refinement merely to test deterministic adapters or
instrumentation. After local checks pass, collect authoring time, calls, available
usage, corrections, and quality during ordinary authorized work. Preserve the
independent UX review and exact bindings. Missing or invalid units must remain
visible repair needs while independent valid work continues.
