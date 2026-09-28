# Packet assembly experiment and finer performance evidence

Follow-up: the [matched authoring comparison](authoring-format-comparison.md)
gave two authors the same prose facts. Compact tabular output plus scripted
expansion reduced writing-response tokens by 46% and file-ready time by 40% in
that trial, preserving the exact flow. That addresses the missing direct-author
comparison below; it does not establish a benefit from an assembly agent.

Subsequent [runtime diagnosis](performance-diagnosis.md) recovered the missing
breakdown and token usage: 95.19 of the original 109.68 seconds fell within output
streams and 9.18 within reasoning-item streams. The original measurements below
are retained as recorded; their "unavailable" entries describe what was known
at experiment completion. They are supplemented, not replaced, by that evidence.

Executed 2026-09-27 following the owner's request to test the assembly idea before
investing further. **Mechanical assembly works; a performance improvement has not
been demonstrated.** The result does not justify adding an assembly agent now.
Continue direct file delivery and existing scripted assembly while measuring the
authoring and coordination boundaries more precisely.

## What ran

One writing worker re-encoded an existing saved UX flow: four primary steps, five
alternates, eight steps in total and four recorded decisions. It delivered 18
small packets in two files. The first file named steps that had not arrived yet;
the second supplied steps and decisions. A scratch script resolved references and
reconstructed the canonical flow without choosing behavior. The remaining UX
document and referenced definitions were reused from saved output.

The reconstructed flow matched the saved flow exactly, and the reconstructed
whole UX passed its existing validator. The existing Markdown renderer also ran.
No repairs were needed in the authoring trial. The author returned paths and
timing rather than making the parent reproduce its JSON.

This was a **representation replay**, not new UX design. The writing worker was
explicitly identified as an experimental packet author because the already-loaded
UX role still prohibited writes; disk role corrections do not change a running
role's instructions. No UI agent, fresh independent UX approval, live product
mutation or publication ran. This was one producer making two deliveries; it did
not measure multiple designers contributing concurrently or an assembly agent.

## Measured results

| Observation                                    |                            Measurement | Interpretation                                                                      |
| ---------------------------------------------- | -------------------------------------: | ----------------------------------------------------------------------------------- |
| Author's first recorded activity to completion |                              109.677 s | Includes encoding, tool work and other unseparated activity; not isolated inference |
| First useful delivery                          |                               36.763 s | Measured from the author's recorded start, not parent dispatch                      |
| First/second delivery assembly                 |                       3.420 / 3.615 ms | Local in-process bookkeeping only                                                   |
| Final assembly, validation and rendering       |                              69.512 ms | Whole final helper operation, excluding process startup/imports                     |
| Validation inside final operation              |                              32.438 ms | Subset of the 69.512 ms; do not add again                                           |
| Rendering inside final operation               |                              19.423 ms | Subset of the 69.512 ms                                                             |
| Compact packet data                            |                            6,158 bytes | Compared with 5,540 bytes for the same canonical flow                               |
| Packet size change                             |                      **11.16% larger** | Excludes another 194 bytes of inherited default/configuration data                  |
| Parent prototype preparation                   |                              177.100 s | Experiment setup, separate from product processing or author duration               |
| Deterministic recovery replay                  | 14 process invocations; 1.291 s summed | No additional model authoring                                                       |
| Reasoning time, tokens, credits                |                            Unavailable | No inferred values or speedup claim                                                 |

There was no timed direct-authoring control, so this is not an A/B comparison.
The packet format preserved meaning but did not reduce bytes. It might reduce
some author schema burden, but this trial did not measure that benefit. Exact
equality against a known result is useful here; it cannot replace semantic review
of genuinely new design.

The recovery replay confirmed pending forward references, resumption from saved
partial work, reordered and duplicate delivery, rejection of conflicting
definitions, and detection of a deliberately mistranscribed step. Restoring only
the affected scratch file recovered the exact result. The prototype's completion
flag was corrected before these replays so failed validation could not report
completion. This narrow helper is not a production revision or readiness protocol.

## Measurements on the existing assembly path

The same saved whole UX was imported into the existing record store in isolated
scratch storage, yielding 16 records. No content was regenerated. First assembly
validated successfully in **90.227 ms**:

| Local operation     | Milliseconds |
| ------------------- | -----------: |
| Read records        |       26.404 |
| Compute identity    |        0.533 |
| Check cache         |        0.081 |
| Assemble            |       16.346 |
| Validate            |       32.927 |
| Serialize candidate |        2.593 |
| Persist outputs     |        9.014 |

Small remaining work is not attributed to a named substep. The final report write
is outside its own reported duration. A second invocation reused validated output
in **28.744 ms**, including 22.256 ms reading, 0.599 ms identity work and 5.255 ms
cache verification. It did not rerun assembly or validation. The encompassing
process, including startup, imports, record delivery and both assembly calls,
took **348.724 ms**. That is an inclusive measurement, not additional time to add
to the operations inside it. Startup and module imports were not individually
isolated in this replay.

These measurements reinforce that the existing deterministic assembly operation
is fast. They do not account for the preceding time spent generating its inputs,
handling tool calls, interpreting results or coordinating agents.

## Changes made for the next ordinary run

- Added a small trace helper for subprocess timing and caller-supplied agent,
  tool, handoff and waiting observations. Records are separate immutable files
  so parallel participants do not contend on a shared append file.
- Added read, identity, cache, serialization and persistence timings to existing
  assembly reports, alongside assembly, validation and rendering.
- Corrected reused assembly reports to show only the current invocation's work,
  rather than returning old assembly/validation durations as fresh measurements.
- Added reports that keep overlapping work from inflating covered wall time,
  retain failures and incomplete observations, and leave absent usage unknown.
- Documented collection in [the performance measurement reference](../../skills/refine-design/references/performance-measurement.md)
  and linked it from the skill and single-pass workflow.

The trace helper cannot observe hidden provider inference or agent tool internals
automatically. The parent must record dispatch, receipt and delivery boundaries;
command wrapping captures subprocess work automatically. Missing observations
remain visible rather than turning into guessed reasoning or idle time.

Validation: all **146 tests** in the refine-design fast gate passed, including
seven new trace tests and the cache-timing regression check. No additional paid
agent comparison or full product refinement was performed.

## Next useful evidence

During the next requested refinement, measure input preparation, author dispatch,
first delivery, subsequent deliveries, parent consumption, review, UI and final
assembly as separate observations. Record generated versus reused bytes and
correction attempts. Retain exact outputs for replay. That should identify where
to run a small focused comparison without paying for another full baseline.

Do not yet introduce a new packet schema, assembly role or general contribution
coordinator. A later concurrency test is worthwhile only if measurements show
independent contributions waiting unnecessarily. This trial leaves that possible
benefit open; it does not establish its size.

Numerical evidence and local evidence hashes are retained in
[packet-assembly-metrics.json](packet-assembly-metrics.json). Raw product-specific
packets and prototype/replay helpers remain in ignored local scratch storage at
`.codex-tmp/packet-assembly-20260927/`; their payloads are not reusable fixtures.
