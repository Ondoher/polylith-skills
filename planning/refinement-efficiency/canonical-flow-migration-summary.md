# Native flow model: execution summary

Implemented 2026-09-26 local time (2026-09-27 UTC), following the
[autonomous plan](canonical-flow-migration.md). Implementation checkpoint:
`9adbae2` — **Migrate UX/UI consumers to native flow records**. The checkpoint
adviser recommended the unit and its exact message under the owner's preapproval.

**The canonical model is now replaced, not merely adapted for authoring.** UX,
UI composition and component design use schema 0.4. Ordinary consumers reject
the old versions. Local verification passed; live agent authoring speed remains
unmeasured. The live Alexa product and its archive were not changed.

## What changed

UX persists local `flows` owned by an identified surface or component. Each flow
has one ordered primary `steps` array and local `alternates` for errors, cancellation,
correction or retry. An alternate identifies the primary step where it applies and
an optional primary step to resume. Supporting and reusable dialogs use stable
element references. Components own short behavior statements.

The canonical contract no longer needs flow-node/edge catalogs, entry-node pointers,
cross-use-case relations, a separate recovery catalog, or a second canonical-step
list. Material pruning rationale is recorded during authoring on the flow. Actions,
semantic frames, states, feedback and source evidence remain because they describe
behavior the UI and later implementation need.

UI persists reusable `parts` and scenes referencing a part plus bounded node changes.
The renderer resolves a scene tree in memory. Validation, review scope, component
replacement, rendering, impact analysis, product traceability and PRD publication
consume the native model. Assembly no longer reconstructs legacy output.

Document inventory exposes flows, steps, alternates and component behaviors by stable
IDs. Child content is not copied into each parent inventory row. The document-structure
agent still decides the reader's hierarchy and page breaks; generated outline numbers
remain separate from data identity. Existing product and technical-context checks pass.
This supplies inputs to later technical design without pretending UX has chosen an
implementation architecture.

Agent definitions, role guidance, skill workflows, executable contracts and fixtures
now agree on that model. The existing single-pass method and atomic per-record file
handoffs remain: one forward UX pass, one forward UI pass, optional bounded repairs,
reuse of already completed units, and mechanical assembly. UI foundations may overlap
UX; scene authoring retains the exact independent UX-review prerequisite.

## Reuse and migration evidence

The explicit `single-pass-design.mjs migrate` command preserves original bytes,
identity mappings, an unreviewed candidate and actionable repair notices in an owned
output directory. Repeating it reuses matching evidence; changed input cannot silently
replace that evidence. Normal rendering and publication never invoke migration.

The saved Alexa replay reused copied source artifacts and retained all generated
records and outputs in ignored local scratch storage. It produced 9 native flows,
27 primary steps, 57 local alternates and 11 scenes. The previous representation had
86 flow nodes and 216 edges. These counts describe representation, not product scope
or independently verified semantic equivalence.

Conversion reported **25 UX repair notices**: 5 nested branches, 2 cycles/shared tails,
12 recovery mappings and 6 cross-task relations. Their original meaning remains
available in preserved input. The UX candidate correctly reports incomplete structural
assembly while retaining usable records. UI conversion reported no additional mapping
issues and rendered 30 output files for local inspection, including assets and reports.
Neither candidate has new independent semantic approval; old review receipts remain
bound to their original inputs.

Generated Markdown and HTML also display the repair reason and remedy while retaining
usable design content. The final handoff adds a direct regression check for that output.

This was an isolated import/replay, not an in-place live product upgrade. Existing
product persistence ownership and lock checks remain in force. A later product upgrade
must resolve the affected local records, obtain current review, and handle old owned
artifact targets explicitly rather than bypassing those checks.

## Observed performance

These are single local observations from saved data, not a controlled benchmark.
Complete values and test-run history are in
[the metrics file](canonical-flow-migration-metrics.json).

| Operation                                  | Observed time |
| ------------------------------------------ | ------------: |
| Import saved UX                            |       31.1 ms |
| Import saved UI                            |       35.0 ms |
| Split UX into 14 reusable records          |        8.0 ms |
| Persist those UX records                   |       46.7 ms |
| UX assembly, validation and repair output  |       78.8 ms |
| Reuse the same generated UX output         |       31.9 ms |
| UI assembly, validation and preview output |    1,196.7 ms |
| Reuse the same generated UI output         |      156.2 ms |

Canonical serialized UX decreased from **353,586 to 318,632 bytes: 9.9% smaller**,
including repair notices. UI increased from **89,295 to 90,058 bytes: 0.85% larger**.
Its 11 saved trees were distinct, so exact import deduplication yielded 11 parts.
Parts enable deliberate reuse during future authoring; they do not guarantee smaller
storage when importing unrelated trees. The principal gain is simpler authoring and
direct consumer interpretation, not a claimed dramatic compression ratio.

About 46.5 minutes elapsed from task start to metrics capture, including implementation
and debugging. That is engineering execution time, not a product-refinement duration.
No fresh UX/UI agent trial or paid baseline was run. Tokens and credits were unavailable;
no cost savings or live authoring speedup are claimed.

## Bottlenecks and follow-up

| Observation                                                                                               | Response or next useful change                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The prior compact authoring layer still expanded into the complicated schema.                             | Replaced the canonical model and consumers together; another adapter was insufficient.                                                                                                         |
| Graph assumptions were spread across fixtures, review scope, wireframes, publication and impact analysis. | Migrated these together and tested detached publication plus local supporting-dialog flows.                                                                                                    |
| Some saved graph relationships cannot be flattened without choosing new meaning.                          | Preserve originals and flag affected records; repair those records during the next ordinary refinement instead of regenerating the product.                                                    |
| UI validation was the largest measured deterministic substage: 753 ms, versus 318 ms for rendering.       | Shared design-language validation and validation repeated by rendering are candidates for reuse through an exact, bounded validation receipt. Do not skip validation or use a path-only cache. |
| Distinct imported scene trees do not automatically produce reusable variations.                           | Let the UI author choose shared parts once; do not infer visual equivalence with an expensive similarity pass.                                                                                 |
| Full package verification took 122.7 seconds across its test-runner sections.                             | Used focused failures first, then completed the package gate. Avoid repeated full checks without new behavioral changes.                                                                       |

The next useful live measurement is the next ordinary product refinement using this
native contract. Reuse its saved inputs and repair candidates, record stage durations
and calls, and inspect quality. A fresh benchmark run is unnecessary solely to produce
a speedup number. Publication-format refinement remains deferred.

## Verification

- Root `npm test`: **512 passed, 0 failed**, including eight new native-model/import tests.
- `generate-prd` composable suite: **14 passed, 0 failed**.
- After the small final repair-notice addition, the affected publication/import suites:
  **19 passed, 0 failed**. The package result above precedes that addition.
- Coverage includes local alternatives, shared elements, inherited status, stable
  references, stale reviews, source ownership, partial repair output, resumable records,
  canonical UI parts, component replacement, detached PRD contexts and technical context.
- Changed supported files formatted; `git diff --check` and both affected skill
  validators passed. No standards-review or fresh qualitative UX approval is claimed.
