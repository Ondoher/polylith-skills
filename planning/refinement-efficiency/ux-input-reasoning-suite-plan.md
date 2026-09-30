# Larger UX input-reasoning test

Status: **complete**, authorized and executed 2026-09-29. See the
[results and decisions](ux-input-reasoning-suite-execution.md) and
[complete measurements](ux-input-reasoning-suite-metrics.json). All 12 authors
finished; focused input improved four of six pairs, with only Update Clip
improving in both repeats. The sections below retain the frozen protocol.

This expands the
[first matched test](ux-input-reasoning-execution.md)
to three decisions and two fresh matched pairs per decision: **12 author runs**.
An early report follows the first four runs, which cover the two new decisions.

## What this tests

Does selecting less surrounding product data reduce reasoning effort while
preserving the UX decision's required meaning, across different decisions and
repeated runs?

The first pair found 33.8% fewer reasoning tokens and 25.2% less time with focused
input. One pair could reflect sampling, order or task-specific effects. This suite
adds task variety, a more demanding scenario, and reversed-order repeats. It grows
the sample and decision complexity while preserving the existing 28,000-byte
return window and one input read per author. It does not estimate a scaling law
for arbitrarily large packets or a complete product.

## Frozen cases

| Case          | Work required                                                                                                                                                              |           Broad input |         Focused input | Reduction |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------: | --------------------: | --------: |
| `update-clip` | Resolve current Update Named Clip requirements against old propagation/collision UX. Replication anchor using the original frozen question and packet bytes.               | 26,392 B / 24 records | 13,013 B / 10 records |     50.7% |
| `save-range`  | Save an inclusive composed range while the active track is empty but other tracks contribute media. Decide scope, dialog behavior, commit availability and recovery.       | 27,726 B / 24 records | 18,539 B / 19 records |     33.1% |
| `trim-group`  | Work through three independent Start/End trim attempts on a grouped occurrence; determine exact collision-chain results, retained content, preview, cancellation and undo. | 26,705 B / 24 records | 15,997 B / 14 records |     40.1% |

All source data comes from the same saved Alexa facts and prior UX as the first
test. The new scenarios are fixed test examples governed by those real product
requirements; they are not new owner requirements or changes to Alexa.

Each focused packet is an exact prefix/subset of its broad packet, with identical
record contents, source pointers, formatting and order. Relevant global constraints
and conflicting evidence belong in both. Broad packets add adjacent operation
context. Complete required records remain even when they reduce the size contrast;
there is no arbitrary byte target that permits dropping needed meaning.

The reusable builder validates frozen source hashes before constructing data and
checks all cases against the read limit before writing the suite. The original
case's inputs and manifest are copied byte-for-byte. Finished historical answers
are never included. A shared prompt sentence now describes a bounded editor
interaction rather than assuming every case is a confirmation dialog, and clarifies
that the confirmation field can describe a direct-interaction preview; both
conditions use that same wording. Historical results remain a separate reference,
not one of the new suite's repetitions.

## Correctness before speed

Freeze each rubric before its first author run. Each has eight essential criteria,
recorded alongside the exact question in its private case manifest and in the
builder source. These rubrics are scoring material for the parent, not agent input.

For `update-clip`, retain the original eight criteria: temporal-only eligibility
and publication, stable identity, unchanged existing occurrences, future-only
confirmation, retirement of propagation/collision behavior, safe recovery and
success feedback, and valid source support.

For `save-range`, the fixed range is frames 100–199 inclusive. The active track has
a gap, but other tracks contribute video/audio. The correct design permits saving
that 100-frame composition across all tracks, preserves its timing/gaps/framing/
stacking/audio, identifies the name/range and keeps internal playback construction
out of the user's decision. It stops playback without changing selection, preserves
the active timeline, applies commit freeze, retains entered context on failure,
reports the created clip, and distinguishes its stable identity from later copied
occurrences. An empty active track is not an empty composition. Naming-policy
questions are avoided by supplying a valid name.

For `trim-group`, every attempt starts from the same baseline on one track:
previous clip ends at 94; selected group is 100–149; later clips are 160–179,
185–194 and 220–229. Enough source content is available for the attempted
extensions. Inclusive frame semantics apply:

- Start requested at 90 cannot apply. The earliest permitted Start is 95; End
  remains 149. The UI must communicate the limit and preserve the preceding clip.
- Extending End to 175 yields 100–175, 176–195, 196–205 and unchanged 220–229.
- Shortening End to 139 leaves following clips at their original intervals and
  leaves a gap; it does not pull later clips backward.
- Group trimming retains/restores hidden parts, exposes precise controls and
  previews affected clips. The successful change is one undoable draft edit.
  Invalid input/Escape preserves the original draft and selection. Source media,
  saved library definitions and unrelated tracks/settings remain unchanged.

Source/time-zero/minimum-duration limits and commit-time edit availability must
also be respected. This case requires applying rules to a concrete scenario, rather
than only restating a supplied requirement.

## Run order and early evidence

| Pair | Case        | Repeat | First author | Second author | Report point                       |
| ---: | ----------- | -----: | ------------ | ------------- | ---------------------------------- |
|    1 | Save range  |      1 | Broad        | Focused       | Record individual pair immediately |
|    2 | Trim group  |      1 | Focused      | Broad         | **Early report: four author runs** |
|    3 | Update clip |      1 | Broad        | Focused       | All three cases covered once       |
|    4 | Save range  |      2 | Focused      | Broad         | Reversed-order repeat              |
|    5 | Trim group  |      2 | Broad        | Focused       | Reversed-order repeat              |
|    6 | Update clip |      2 | Focused      | Broad         | Final comparison                   |

Every entry is a fresh UX author with the same role, model, configured effort and
observed wire setting. Run authors sequentially to avoid concurrent provider/load
effects on timing. Reuse packets, prepared tooling and measurements, not author
context or completed answers. Reversing order balances which condition runs first
within each case; it cannot eliminate all cache/provider variation.

After pair 2, publish per-case reasoning, timing, answer size and quality. If the
protocol is sound, finish the prescribed repeats regardless of whether the early
speed result is positive. This prevents retaining only favorable observations.
An explicit user instruction to stop still takes precedence.

If a packet lacks essential evidence, or delivery/counter capture fails, preserve
the run and pause affected comparisons for diagnosis. Do not count an incomplete
answer as a saving, silently add product reads, or revise a rubric after seeing an
answer. Any necessary revised case gets a new frozen version; retain the original
failure and identify additional runs separately. Do not exceed the 12-run schedule
automatically. Independent valid cases can still be analyzed.

## Fixed author/output contract

- One complete, hash-verified native MCP product read per author. Generic role
  instructions and storage contract load beforehand.
- Same question and output fields within each pair: eligibility, operation,
  preserved data, confirmation/interaction presentation, recovery, baseline
  changes, unresolved dependencies and source references. For trimming,
  presentation describes direct manipulation/preview, not a forced dialog.
- At most 70 words per prose field and 350 prose words total in both conditions.
  One first saved answer, followed by a minimal acknowledgement.
- The parent's rubric is withheld. No prior answer, full contribution assembly,
  agent quality-review/rework round, UI work or live product mutation is included.
- Missing essential context is an explicit unresolved entry. No hidden extra
  retrieval is permitted to restore comparability after the fact.

## Measurements and interpretation

Reuse `analyze-decision.py`. Start at the actual client-visible input-result
timestamp and end at receipt of the saved-answer result. Capture every unique
model response in that window, including answer generation. Primary measure:
reported reasoning-output tokens. Supporting measures:

- Wall time, reasoning-item/output streams, tool intervals and unattributed gaps.
- Exact input bytes, record counts, read count and delivered hashes.
- Whole-request input/cache counters; do not label these isolated packet tokens.
- Output tokens, answer bytes/words, rubric coverage and unresolved dependencies.
- Startup, acknowledgement, preparation, failures and protocol deviations,
  separately from the decision window.

Report all six pairs, then the two paired ratios for each case. Report how many
cases improve in both repetitions, vary between repetitions or regress. Give the
median paired reasoning/time change and raw per-case values; also show total
reasoning tokens consumed by the full suite so testing cost remains visible.
Keep quality failures in the report and exclude them only from explicitly labeled
quality-matched speed summaries, with the reason shown.

Do not pool the historical positive pair into the new results or infer causality
from elapsed time alone. Two repetitions per case remain a small sample. Different
case complexities and input contrasts cannot establish a linear relationship
between bytes and reasoning. Extra output detail and cache variation remain
possible explanations, to be reported alongside observed reductions.

## Preparation completed

The frozen suite is at `.codex-tmp/ux-decision-suite/inputs-01/`; `suite.json`
records the schedule and case hashes. All four new broad/focused packet paths
passed real isolated MCP assignment, single-read hash verification and result-store
checks. The original case reuses already verified immutable packets. All live-data
guards passed; no model author was launched during this construction.

See [preparation evidence](ux-input-reasoning-suite-preparation.json) and the
[reproduction instructions](experiments/incremental-ux-replay/README.md).
Raw product packets, capabilities and future answers stay in ignored scratch.

## Execution steps

1. Verify suite/case/source hashes, the unchanged shared role/prompt and the
   existing native CLI/observer setup. Allocate unique attempt paths using case,
   repeat and condition; keep each case's manifest fixed.
2. Execute pairs 1 and 2 with the existing `run.mjs --decision=... --execute`
   route. Analyze each immediately, inspect first answers against frozen rubrics,
   and save the early report after four authors.
3. Continue pairs 3–6 under the valid protocol, saving results incrementally.
   Reuse completed runs if interrupted; do not restart successful authors.
4. Write the final report with all per-pair metrics, quality results, unexpected
   questions/decisions and limitations. No new paid comparison follows this suite
   automatically. Use the checkpoint adviser for the completed evidence unit
   under the owner's preapproved commit-message policy.

The prior author runs lasted approximately 2–3 minutes each including startup;
12 comparable runs would be roughly half an hour of author wall time before
analysis. The new scenarios may take longer. This is a planning reference, not a
time guarantee or permission to widen the run count. The early four-run report
provides useful evidence before completing that investment.
