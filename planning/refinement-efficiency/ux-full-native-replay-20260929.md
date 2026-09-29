# Full UX replay with the native parallel configuration

Status: complete. UX revision 6 passed structural validation and a fresh,
exact-bound independent review after repairs. Four units changed and twelve
were reused unchanged. All 611 protected live files remained byte-identical.
No UI, comps, publication or live-product promotion ran.

Requested at 2026-09-29 15:02:08 UTC; first client dispatch was 15:07:27.803 UTC
and final client completion was 17:16:27.610 UTC. Dispatch-to-completion took
**2h08m59.807s**, including the deliberate interruption/resume. Initial supervisor
setup adds 5m19.803s, for **2h14m19.610s** from request to client completion.
Supervisor analysis, this report and checkpoint time are additional. This is a
completed experiment, not a demonstrated performance improvement.

## Inputs and isolation

The working copy is `.codex-tmp/ux-full-native-20260929/full-01/workspace`.
It contains the byte-verified original snapshot 16/model 7/UX4 baseline, copied
from the retained baseline rather than today's completed UX. The original UX5/6
answer and prior comparison plan were not supplied. Current model/source binding
was mechanically revalidated before dispatch; no semantic product parsing reran.

The two inputs total 514,426 saved bytes. The host mechanically followed the
existing `workflow_read` continuations, verified complete byte coverage, and
provided the 19 known independent page requests. This permits collection waves
of at most eight native calls without guessing future UTF-8/escaped-text offsets.
The service's configured page ceiling is 28,000 bytes; client output limits are
unchanged. Full input coverage is retained rather than reduced by semantic selection.

All derived product writes stay in this disposable copy. The live Alexa product,
description and topic README are hashed before and after. Repeating the experiment
uses the same retained baseline; rollback of live Alexa is unnecessary.

## Timing boundaries

- Supervisor instruction/tooling setup before dispatch: about 319.8 seconds.
- Measured baseline-copy, facts validation and page-plan script work: 2.229 seconds
  within that setup, including 0.868 seconds copying 421 baseline files.
- Parent and specialist windows overlap and are reported separately.
- Phase markers distinguish guidance loading, input collection, comparison,
  output generation/delivery, persistence, independent review and repair.
- Server timing excludes model generation, scheduling and client processing.
- A missing reasoning stream is not evidence of zero reasoning. Coalesced native
  call timestamps cannot measure individual command-generation duration.

The raw scoped evidence is under `.codex-tmp/ux-full-native-20260929/full-01/`:
control, input receipts and read plan, server observations, runtime extracts and
sanitized wire metadata. Raw product/tool payloads remain in ignored scratch.
The existing runtime collector and `experiments/ux-full-replay/analyze.py` produce
the numerical summary and exact-page verification without making model calls.

[Combined metrics](ux-full-native-replay-20260929-metrics.json) preserve both
segments, phase markers, response grouping, exact-page verification, actor
activity, command sizes, errors and usage. `experiments/ux-full-replay/summarize.py`
combines the frozen segment analyses and verifies the final saved UX/review
identity. Raw product payloads and credentials remain in ignored scratch.

The following intervals are sequential and non-overlapping; they include
orchestration and waiting within the named activity, not pure computation:

| Interval                                                           |    Elapsed |
| ------------------------------------------------------------------ | ---------: |
| Initial supervisor setup, before dispatch                          |  5m19.803s |
| Parent/author preparation and instruction loading                  |  8m01.486s |
| Initial author input collection                                    |  2m11.826s |
| Comparison handoff                                                 |    50.528s |
| Initial comparison and preliminary decisions                       |  1m28.224s |
| Initial generation, further reads and self-correction              | 33m35.133s |
| Structural repairs, persistence and first-review preparation       | 19m41.986s |
| First review, including preparation, collection and delivery       | 16m02.560s |
| Review inspection and repair dispatch before interruption          |  2m37.365s |
| Intentional interruption and resume setup                          |  2m23.064s |
| Resume coordination and original author recovery                   |  3m16.338s |
| Research and repair decisions                                      |  4m41.984s |
| Mechanical repair generation and delivery                          |  7m58.864s |
| Linkage correction, validation, persistence and review preparation |  5m56.921s |
| Second review, including preparation, collection and delivery      | 15m21.008s |
| Final receipt validation, preservation checks and reporting        |  4m52.520s |

Across both segments, 295 observed MCP service calls total 2.613 seconds of
internal service work. This excludes client round trips and model work. Runtime
records report 52,314,426 input tokens, including 49,930,496 cached input tokens,
and 288,525 output tokens, including 68,312 reasoning-output tokens across the
active threads. These are repeated-context usage counters, not unique document
size or a billing calculation. The overlapping actor windows cannot be added to
derive elapsed time.

## Comparison limits

The previous compact comparison replay ended at a change plan. It is only a
comparison for preparation/decision-delivery phases, not for this full scope.
The original full Alexa refinement is the reference for author/review/repair
windows; its UI, rendering and publication-context work must be excluded.
This run measures the integrated native configuration and collection protocol,
including mechanically precomputed page boundaries. It does not isolate the
parallel flag's effect from the accompanying collection changes.

## Collection observation

The full author assignment did **not** reproduce the small collection test's
batching. The UX agent issued the 19 initial reads serially, one per model
response, even though its client requests enabled `parallel_tool_calls` and
the assignment supplied known independent requests. All returned pages verified
byte-for-byte against the stored inputs. The instruction-ready to inputs-ready
marker interval was 131.826 seconds (15:15:29.289–15:17:41.115 UTC).

The full run continued using those already collected inputs. This is evidence
that the successful narrow prompt is not yet a reliable guarantee in the full
specialist workflow. It would be incorrect to attribute this run's eventual
end-to-end result to successful parallel collection.

The harness combined guidance loading and three collection waves in one
assignment. The successful prior control used the maintained short, single-wave
assignment. This replay therefore exposes an integration difference; it does not
disprove that prior control. Later author reads batched up to five per response.
The observed selected-model requests enabled parallel calls.

## Authoring observations

The initial author pass delivered four changed units and reused twelve. Its
comparison-start to decisions-ready interval was 88.224 seconds. Decisions-ready
to delivered was 2,015.133 seconds (33m35s), including additional input reads,
record generation, self-checking and a field-name correction. These labels do
not imply that all reasoning ended at the decisions-ready marker.

The five large write commands below were single-call responses, so their
individual output-item intervals are observable. They measure emitted command
streams, not pure model computation or network transfer.

| Unit / attempt                    | Command argument bytes | Output-item interval | Tool execution |
| --------------------------------- | ---------------------: | -------------------: | -------------: |
| Document context                  |                 49,052 |            303.794 s |          30 ms |
| Update Named Clip flow            |                  5,418 |             31.360 s |         131 ms |
| Video workspace                   |                124,082 |            734.342 s |         600 ms |
| Edit-video flow, initial          |                 36,057 |            216.072 s |          35 ms |
| Edit-video flow, field correction |                 36,053 |            215.982 s |          39 ms |

The corrected initial four-unit candidate contains 214,133 bytes of unit JSON.
Of those, 165,309 bytes (about 77.2%) are unchanged JSON value subtrees at the
same paths as the imported baseline. This conservative count excludes property
names and punctuation around changed containers, and does not match moved array
entries. Python normalization was verified byte-for-byte against the actual
stored JSON before using the measurement. This is evidence of repeated output,
not a prediction that a patch protocol would save exactly 77.2% of elapsed time.

Across the first segment, the author's recorded active turns total 3,608.581
seconds (60m09s). Approximately 2,818.805 seconds are output-item streams,
226.280 seconds reasoning-item streams, 48.476 seconds tool intervals and
515.043 seconds unattributed active time. Small event-boundary discrepancies
prevent these from being a perfectly additive CPU accounting. Another
1,301.846 seconds lie outside the author's recorded active turns, mostly while
the parent and reviewer worked; they are not author reasoning. The parent and
reviewer overlap these windows. The service's 204 observed first-segment calls
sum to 1.809 seconds of internal service work, excluding client overhead,
transport and model generation.

Assembly then rejected unsupported fields in the video unit's catalog defaults.
Those defaults had to be expanded into individual action and feedback records.
The original author repaired that unit while sibling units remained saved. This
structural repair is outside the initial author-pass measurements above.

## Saved-work continuation

The packing repair took 860.283 seconds. A second correction to a pruning
annotation took 62.761 seconds. The complete candidate then passed structural
validation and persisted as UX5; repeat persistence produced identical bytes.
The description, model, current pointer and baseline snapshot remained unchanged.

The first fresh reviewer returned `revise`: the grouped trimming/Ungroup behavior
needed focused research, and outward grouped trimming had no defined result for
simultaneous boundary contributors with unequal source limits. That receipt and
all authored units are retained. The pass-only review validator's rejection of a
revise verdict is a gate result, not evidence of a malformed receipt.

At 16:31:56.911 UTC the supervisor intentionally stopped the isolated client,
after 84m29s of client elapsed time, to avoid another large inline JSON rewrite.
The first segment's final protection check passed for all 611 protected live
files. Its `exitCode: 1` records this intentional termination. Source evidence is
preserved under `full-01`; the original executed harness source is retained there
as `run-source.mjs`.

The first assignment required inline MCP product delivery and prohibited
product file/shell fallback for this measurement. That was an experiment
constraint, not a lack of temporary-file permission or an intrinsic MCP limit.
The continuation restores scoped temporary-file reuse for mechanical repairs:
small scripts transform the saved proposals, then MCP imports their files and
performs unit acceptance, canonical persistence and review validation normally.
No production data schema or backward-compatibility adapter was introduced.

The maintained harness now supports resuming a stopped attempt and accepting an
explicit request-start timestamp. `full-02` resumed the same conversation and
workspace at 16:34:19.975 UTC, with fresh service capabilities and no baseline
recopy or semantic restart. The original author was recovered. The 143.064-second
interruption/setup gap is recorded separately. This continuation is not a paired
comparison with the earlier repairs: its research, decisions and output scope
are different, and it reuses a warm author.

The resumed author supplied four primary research sources. The accepted local
policy restores retained hidden content first, then extends simultaneous boundary
contributors together up to the shortest available source extent. An invalid
complete request leaves the draft unchanged. This is an Alexa-specific design
decision, not a claim that the cited products use that exact policy. Incompatible
Ungroup placement remains an explicit open question.

The file-backed repair changed three saved units through 24 targeted edits with
preservation assertions. Research/decision work ran from 16:37:36.313 to
16:42:18.297 UTC (281.984 seconds); decisions-ready to delivery took 478.864
seconds. That second interval still includes generating the mechanical repair
script: its largest command contained 29,606 argument bytes and had a
207.029-second output-item interval. Importing an existing file does not remove
the cost of authoring the transformation.

The first assembly then detected stale reverse research references. A focused
linkage correction took another 120.670 seconds, preserving the earlier research
sources and observations. The complete 16-unit result persisted as UX6. All
twelve unchanged units still matched the original imported digests.

The fresh second reviewer inspected the whole artifact and returned `pass`, with
no findings. Its receipt is bound to the saved UX6 bytes, not the compact MCP
transport hash. The six existing product questions remain visible; this semantic
review does not constitute user testing, UI verification or implementation proof.

The final artifact and both review histories remain under the disposable
workspace. Its `product/Alexa/runs/ux-full-native-replay/completion.json` records
the exact hashes, validation handles, decisions and outstanding questions.
The adjacent `run-report.md` records product-level outcomes. The live Alexa
project needs no rollback because it was never updated by this replay.

## Decisions and errors retained

- Preserve every completed unit, proposal, failed candidate and review receipt.
  Resume the original author after the deliberate interruption; do not restart
  design reasoning or supply the previous completed run's answer.
- Keep the configured model, normal tool output limits and exact source binding.
  Use native MCP operations for acceptance, assembly, persistence and validation.
  Allow temporary-file transformation/import for the expensive repair.
- Two initial structural repairs addressed unsupported catalog defaults and an
  incorrect pruning annotation. The first semantic review required grouped-edit
  research and a determinate extension outcome. A final structural follow-up
  corrected reverse research references. No checks were weakened.
- Three attempted reads used absent JSON pointers across the two segments. Each
  recovered; exact returned-page verification found no mismatches. These failed
  reads are separate from the complete initial input coverage.
- Automatic approval review initially rejected a read-only unit identity manifest
  as a downstream handoff. Inspecting its actual read-only contract and clarifying
  its preservation-check purpose resolved the rejection without expanding scope.
- The first attempt to message the separate CLI through the outer collaboration
  registry failed because the agent belonged to another process. No steering was
  delivered. The verified owned client was stopped and resumed through its CLI.

## What this makes worth optimizing

1. Deliver meaningful deltas and let maintained deterministic tooling assemble
   existing records. Re-generating complete units, especially to fix a field or
   reference, dominated several observed spans. This run reused saved files for
   the later repair; it did not add a production patch operation.
2. Validate unit packing before accepting a large generated replacement, and
   maintain derived reverse references mechanically. Those two failure classes
   caused avoidable rework here.
3. Integrate the successful short collection-wave assignment as a separate step.
   The long combined author assignment permitted batching but did not induce it
   for initial collection. Verify response grouping, not merely the outgoing flag.
4. Keep research and independent review costs explicit. They found a real missing
   behavior in this run, so removing them would change output quality. Reusing
   exact reviewed scopes is a separate future experiment.

## Verification

The complete 16-unit assembly validated without issues; the final independent
review receipt validated with `valid: true`; the saved UX hash matches that
receipt. Source/model/current/snapshot bytes and twelve reused unit digests were
preserved. Both segment protection checks passed for all 611 live files. All
successful saved read pages verified exactly, and all nineteen initial author
pages were received once. The isolated client exited with code 0 after completion.

The experiment launcher passed `node --check`; both Python analysis tools parsed
and ran against the retained evidence. Repository formatting and Git whitespace
checks passed. No production runtime, schema or agent instructions changed in
this checkpoint, and no additional broad or paid replay was run for verification.
