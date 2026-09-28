# Exact repetition in saved UX and UI

Recorded 2026-09-27 following the owner's question about how much repeated content
remains. This read-only analysis uses the same Alexa artifacts, verified by source
hash, as the [reduced-data evaluation](reduced-data-passing-evaluation.md). No new
agent call, product mutation or production contract change was needed.

**UX contains substantial repeated text. UI has little repeated long text; its
remaining repetition is more structural.** Existing action references do not
eliminate copies of descriptions, rationales and frame content around those links.

The subsequent [authoring trial](shared-text-authoring-trial.md) found that a
small agent-authored dictionary saved 11.7% in bytes but only 3.4% in non-reasoning
writing tokens. Additional reasoning offset that token saving; delivery was only
2.9% faster in one pair. Exact reconstruction passed, but this does not justify
general dictionary rollout. The size measurements below remain valid.

## Observations

| Observation                                                         |                     Measured result |
| ------------------------------------------------------------------- | ----------------------------------: |
| Actions with identical purpose, outcome and interaction description |                        **50 of 79** |
| Extra text bytes in those three action fields beyond one copy       |                              13,644 |
| Copies of one ordinary-pattern rationale across actions and frames  |                              **74** |
| Copies of one cancellation explanation                              |                              **51** |
| Copies of the same global export-status text in frames              |                              **11** |
| Distinct long UX texts that occur more than once                    |                                 172 |
| Extra occurrences of those texts beyond their first copies          |                             **671** |
| Extra serialized long-text bytes in UX                              | **78,461**, or 20.1% of minified UX |

These observations overlap. For example, identical action descriptions and
pattern rationales are already included in the 78,461-byte total; do not add them.
The text counter excludes keys, short labels and identifier-only strings. It counts
only exact complete string values containing whitespace and at least 40 Unicode
code points. It does not normalize wording or whitespace, detect paraphrases or
count repeated substrings within otherwise different strings.

The repeated pattern rationale also appears as one identical 146-byte
`patternBasis` object 74 times. One identical 133-byte cancellation object occurs
51 times. These object measurements include their text and also overlap the table.

Four frame regions list the same ordered project actions: New, Open, Save, Save
As and Workspace. Four project-guard regions list Save, Discard and Cancel.
These are candidates for shared definitions, not proof of interchangeable regions:
frame-specific state, transitions, labels, content, identities and focus may differ.

## Lossless shared-text size probe

An offline probe stores each repeated long text once in a document-local table,
replaces its occurrences with tagged numeric references, and expands the result.
It counts both the table and reference overhead. Both documents reconstruct exactly.

| Artifact | Minified original | With text table |            Net reduction |
| -------- | ----------------: | --------------: | -----------------------: |
| UX       |     389,418 bytes |   321,510 bytes | **67,908 bytes / 17.4%** |
| UI       |     118,671 bytes |   118,625 bytes |     **46 bytes / 0.04%** |

These are byte measurements, not model-token or latency results. The probe uses a
whole-document table; independent delivery-unit tables may save less. A production
author would also need a compact, unambiguous way to select references. The saved
artifacts alone do not establish which repeated copies were emitted by a model
versus added by existing scripts.

Exact textual equality does not mean separate fields should permanently share
semantic ownership. A delivery dictionary can expand to separate ordinary strings
without tying future edits together. Reusable behavior or shared region definitions
require an explicit design contract and exceptions. Do not replace specific UX
reasoning with generic boilerplate merely because boilerplate compresses well.

## UI distinction

Only two long UI text values repeat, each twice. A long-text dictionary is therefore
not worthwhile for this saved UI. There are repeated exact layout objects: one
139-byte layout occurs six times, an 81-byte layout eight times, and a 65-byte layout
nine times. These point toward reusable layout defaults and compact node definitions,
subject to preserving all bindings and distinct choices.

The current format supports part reuse, but actual reuse across these saved scenes
is limited: **15 parts serve 16 scenes; only one part serves two scenes**, and one
scene has nonempty changes. Most parts are used once. This qualifies earlier
statements about reuse: the mechanism exists, but this product does not yet show
extensive sharing between scenes. Determining whether more parts or subregions
can be shared requires comparing their behavior and structure, not just their names.

## Consequence for the proposed work

Prioritize explicit reuse of repeated UX descriptions and supporting metadata
alongside compact record fields. Retain unique behavioral differences. Evaluate
UI structure separately; copying the UX shared-text strategy to UI would produce
negligible savings in this sample.

The 17.4% text-table saving, the earlier 10.2% generic UX packing saving, and the
flow trial's 40% delivery-time improvement are different, overlapping measurements.
They must not be added. Combined encoding needs its own lossless size measurement;
actual authoring gains require token, timing and correction evidence.

## Evidence

[Metrics](repetition-evaluation-metrics.json) retain source hashes, counts, field
paths, repeated-value hashes and dictionary reconstruction results, without copying
product prose into the report. The local analyzer is
`.codex-tmp/repetition-evaluation-20260927/analyze.mjs`. Checks confirm unchanged
source hashes relative to the preceding evaluation and exact JSON round trips.
