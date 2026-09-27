# Single-pass UX/UI execution summary

> Historical report for the authoring/transport change through `74f7f77`. That implementation still projected compact records into the old canonical graph. The owner rejected that limitation; [the native schema migration](canonical-flow-migration-summary.md) now supersedes those compatibility-output statements.

Implemented 2026-09-26 local time (2026-09-27 UTC). The
[execution plan](single-pass-execution-plan.md) was carried through repository
implementation, saved-data replay, consumer integration and verification.
**Locally verified; live design-agent performance remains unmeasured.**

## What is executable

The [authoring contract](../../skills/refine-design/references/single-pass-design.md)
now directs initial/substantial refinement through one forward UX authoring pass
and one forward UI pass, each with at most one optional issue-directed repair scan.
Both agent definitions, their role documents, the skill entrypoint and the owning
UX/UI workflows point to that route. Parsing and the trusted fact handoff were
left outside this change.

- UX authors identified interaction elements and local flows with ordered steps,
  alternatives, supporting interactions and reusable component call-outs. Ordinary
  sequential relationships are assembled mechanically. Pruning happens during
  authoring; the agent does not write the same design again as an expanded graph.
- UI authors common context, independent reusable parts and scene metadata with
  bounded changes addressed by stable node IDs. Clean and annotated previews use
  the same expanded tree. Changes cannot silently replace node identity or topology.
- A parent-owned writer saves complete units immediately. Unchanged units produced
  earlier in the **same run** are reused; a repair must name the prior digest.
  Interrupted, malformed, missing, conflicting and stale units yield repair notices.
  Good siblings survive. Even corrupt bytes have an exact identity for safe repair.
- File manifests transfer selected paths and identities, following explicit
  dependencies once. Agents can resume from saved progress without replaying the
  whole accumulated response. Read-only agents remain read-only; the parent writes.
- The indexed assembler produces the current UX/UI consumer schemas. It preserves
  catalog values, IDs, evidence, locks, relationships and canonical material identity.
  Existing validators, rendering, publication packaging and technical preparation
  retain their authority. It does not invent review approval or architecture.
- Identical assemblies reuse byte-verified generated output. A changed assembly
  receives its own output directory, preserving previous candidates and previews.
  Output includes actionable repair notices and measurements. UI previews include
  the design-language stylesheet and bundled font resources.

The new helper is
[`single-pass-design.mjs`](../../skills/refine-design/scripts/single-pass-design.mjs).
Its commands are `init`, `import`, `deliver`, `handoff` and `assemble`; `--help` lists
arguments. For example, from the refine-design skill directory:

```text
node scripts/single-pass-design.mjs import --stage ux --input <saved-ux.json> --store <staging>/ux
node scripts/single-pass-design.mjs assemble --store <staging>/ux --output-dir <staging>/ux-output
```

For fresh authoring, initialize with exact input bindings, persist each bounded
record batch with `deliver`, and use `--repairs` for targeted replacements. Candidate
reports distinguish structural validity from independent semantic review. Normal
product persistence/review/publication follows the existing contracts.

## Choices made during execution

The implementation uses one atomic JSON file per record instead of an append-only
JSONL stream. This makes interrupted delivery and individual replacement simpler.
No new dependencies or managed packages were added.

Compact authoring projects into the existing expanded schema rather than replacing
every downstream validator, review subject, renderer and publication consumer at
once. There is one authored representation; expansion is mechanical. Saved irregular
relations are imported faithfully instead of being reinterpreted to force a simpler
shape. Import itself is deliberately conservative and offers modest byte savings.

Internal identity remains independent of document hierarchy. The document-structure
agent still owns inventory, organization and page breaks. Publication formatting and
consecutive external numbering were not redesigned in this execution.

Foundation work can overlap UX. Per-batch **reviewed composition** remains deferred
because existing UX review binds the whole artifact. Appending UX changes its review
subject; a small transport manifest does not solve that. Composition still waits
for exact review, then uses bounded files and reusable parts in one forward pass.
Imported canonical identity does not imply identical serialized bytes: retain the
original persisted UX bytes and matching review when unchanged, or review the new
exact subject before composition.

## Measured results

All detailed observations, stage times and limits are in
[single-pass-execution-metrics.json](single-pass-execution-metrics.json).
Implementation and verification took roughly 50 minutes; this includes research
into local consumers, coding, checkpoints, test execution and documentation. It is
not a product-refinement benchmark.

The saved Alexa data was read and reused in isolated, ignored workspace storage.
The live product and `Alexa.sav` were not modified. No fresh UX/UI design-agent trial,
paid baseline, new research pass, installation or push was performed.

| Measurement                                               |            UX |           UI |
| --------------------------------------------------------- | ------------: | -----------: |
| Saved source, compact JSON                                | 353,586 bytes | 89,295 bytes |
| Imported authoring records, compact JSON                  | 339,832 bytes | 91,646 bytes |
| Record count                                              |            14 |           23 |
| Largest imported record                                   |  95,628 bytes | 22,233 bytes |
| Final assembly/validation, including UI preview resources |       72.3 ms |     571.8 ms |
| Reuse of those generated outputs                          |       24.4 ms |      91.2 ms |
| Example bounded handoff manifest                          |     540 bytes |    513 bytes |
| Actual files read for that selected handoff               |  43,714 bytes |  7,188 bytes |

The final replay reused **all 37 records created earlier during this execution**.
UI output contains 11 scene pairs, plus index, styles, fonts, candidate and reports.
The generated [local comp index](../../.codex-tmp/single-pass/alexa-ui-output/90466a318e1ac09749295de39fbee8c441d092cf38036fdfe0cda79639a1a43a/comps/index.html)
is saved in ignored staging for reuse; it is a mechanical preview, not a new visual
review or a published product-document collection. Existing partial scenes retain
their partial labels. Publication navigation in these isolated pages is contextual
and does not imply the rest of the publication was generated here.

These byte counts use compact JSON, so they differ from earlier pretty-printed
artifact sizes. Imported UX shrank about 3.9%; UI grew about 2.6% from envelopes.
The observed benefit is bounded transport, durable progress and avoided re-authoring;
no token, credit or live specialist-time saving is inferred from those numbers.
Usage data was unavailable and is recorded as null.

## Verification and resolved problems

- The root `npm test` suite passed **504 tests** in **133.5 seconds**, covering tooling,
  refinement, rendering, publication and technical contexts.
- The integrated focused run passed **18 tests**, including real clean/annotated HTML,
  CLI import/replay, exact saved-data projection and detached PRD-context generation.
- A subsequent standalone-preview fix added the missing design-language stylesheet
  and font assets. The final focused lane covers that fix and recovery/reuse behavior.
- The skill validator passed. Repository formatting is checked; the two imported
  `ref/` documents needed formatting-only normalization to pass the existing gate.
- An initial flow test was correctly rejected for having only a retry loop and no
  successful termination. The fixture gained its explicit successful outcome; the
  validator was not weakened. A sandbox-denied child process ran with authorized
  escalation. Neither failure remained hidden behind an adjusted expectation.

The new tests also cover missing dependencies, duplicate identities, unexpected or
duplicated context, node changes, stale UX bindings, malformed records, interrupted
delivery, bounded dependency traversal and preservation of previous output.
Existing technical-context tests exercise the later repository/evidence stage;
this work does not claim that UX/UI alone supplies technical architecture decisions.

## Bottlenecks and next measurement

1. Expanded consumer schemas and whole-artifact review remain the main structural
   constraints. The projection avoids a broad migration; scoped review would be a
   separate change if live timing later justifies pipelined composition.
2. Imported context can still be large: the largest UX unit is about 93 KiB. Shared
   context should be read once and later handoffs should reference paths. Imported
   old data is not evidence that freshly authored flows will be equally small.
3. In the final UI replay, assembly took 7.4 ms, validation 259.7 ms and rendering/
   resources 216.1 ms. Existing validation dominates assembly but remains subsecond.
   Avoid spending a large implementation budget optimizing that before measuring
   real specialist time. Changed complete bundles still require validation/rendering;
   unchanged authoring units are reused. External asset roots disable cache reuse
   until their bytes can participate in the cache identity.
4. The next ordinary refinement should record UX/UI authoring duration, deliveries,
   repair calls, handoff bytes, unchanged-unit reuse, review duration, comp coverage
   and available usage. It should reuse this run's helpers and saved data, not fund
   a separate repeated full baseline. This implementation has no live speedup claim.

## Checkpoints

The checkpoint adviser recommended the planning baseline and record-store slices;
the owner's standing approval supplied commit-message authority:

- `6a99725` — `docs: establish single-pass UX/UI execution baseline`
- `56b5edb` — `feat(refine-design): add resumable single-pass design records`

The final integration checkpoint contains this summary, the completed execution
plan, implementation, instructions and verification evidence. Its hash is the
containing commit and is reported in the handoff. Final tracked worktree status is
verified after that commit. Generated replay files remain ignored and available
locally for reuse; no live product artifacts are included in the checkpoint.
