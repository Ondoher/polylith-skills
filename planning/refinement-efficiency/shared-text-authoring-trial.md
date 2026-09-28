# Shared-text authoring trial

Executed 2026-09-27 after the owner requested a quick experiment around the
[observed repetition](repetition-evaluation.md). **This small trial did not
demonstrate a practically useful speedup from an authored text dictionary.**
The file became 11.7% smaller, but delivery was only 2.9% faster and total recorded
output tokens increased slightly. Both outputs were correct on the first attempt.

The subsequent [40-action trial](shared-text-large-trial.md) showed a stronger
result: 19% fewer non-reasoning writing tokens and about 15% shorter post-input
authoring time. Input-read failures and different tool-string escaping limit
attribution, but the larger result keeps selective reuse under consideration.
The small-sample observations below remain as originally measured.

## Comparison

Two fresh workers received identical fixed facts for four existing Alexa actions.
The sample uses evenly spaced catalog positions 0, 26, 52 and 78: navigation,
object reordering, play/pause and clip muting. Two have identical purpose, outcome
and interaction-description text; two preserve different wording. This avoids
selecting only the longest or most repetitive actions, but is not a random or
statistically representative sample.

Both authors used compact JSON, the same PowerShell file-write method, one input
read, one output write and a path-only receipt. Both ran with inherited
**gpt-6-astra / xhigh**, confirmed from runtime records, without history forks or
model overrides. They ran concurrently, with their own task-start timestamps.

- Direct author: emit the action objects with literal strings at every use.
- Shared-text author: identify exact repeated text values of at least 40 characters
  containing whitespace, choose short dictionary keys, emit each text once, and
  substitute objects such as `{"$text":"t1"}`. Keep distinct or short values literal.

The shared author created four entries. It had to identify the repetition and
maintain the references; the parent did not supply a prebuilt dictionary. This
comparison changes text reuse only, rather than combining it with the earlier
tabular format and metadata-default changes. It measures representation authoring
from fixed facts, not new UX design or a complete product refinement.

## Results

| Measurement                                  | Literal compact JSON | Shared text + expansion |
| -------------------------------------------- | -------------------: | ----------------------: |
| Time to successful file-write result         |             48.876 s |                47.439 s |
| Full agent turn, including receipt           |             51.063 s |                49.338 s |
| Writing-response non-reasoning output tokens |                1,334 |                   1,289 |
| Writing-response reasoning tokens            |                    0 |                      58 |
| Writing-response total output tokens         |                1,334 |                   1,347 |
| Whole-turn total output tokens               |                1,453 |                   1,475 |
| Writing tool-call output stream              |             41.243 s |                38.293 s |
| Author file bytes                            |                6,071 |                   5,359 |
| Parse / expand time                          |             0.088 ms |                1.194 ms |
| Existing whole-UX validation                 |            37.171 ms |               41.152 ms |
| Complete validation command wall time        |              0.495 s |                 0.508 s |
| Author repairs                               |                    0 |                       0 |

Expansion exactly reproduced all four canonical actions. Substituting each result
into the saved full UX passed the existing validator; canonical hashes match.
The validation command includes startup and the complete helper. Its parsing and
validation substeps are included within that command and must not be added again.
Parent scheduling between author receipt and validation is excluded from author
durations. Prototype preparation is not a per-refinement cost in this measurement.

The direct file includes 6,066 bytes of compact JSON plus encoding/line-ending
overhead; the shared representation includes 5,354 plus the same overhead. The
**11.7% byte saving produced only a 3.4% reduction in non-reasoning writing tokens**.
The shared response's additional 58 reasoning tokens exceed its 45-token reduction
in non-reasoning output. Total writing-response output rose by 1.0%; whole-turn
output rose by 1.5%. These are recorded token categories, not a measurement of
pure design reasoning or billed credit cost.

## Interpretation

The script is fast and the references preserve meaning. The limiting result is
the authoring cost: dictionary entries and reference objects consume output
tokens, while choosing and maintaining the mapping can add reasoning. Bytes
alone were too optimistic a predictor for this representation. The trial does
not isolate every causal contribution, but the measured output reduction is small.

A 1.44-second file-delivery difference in one pair is too small to establish a
reliable latency improvement. Runtime variation and input caching were not
controlled. Direct used 58,464 input tokens, including 52,736 cached; shared used
58,905, including 44,288 cached, summed across three responses each. The writing
responses had 19,683 / 19,897 input tokens and the same 17,536 cached input tokens.
Client-observed stream intervals do not isolate provider compute or transfer time.

This does not contradict the earlier [flow-format result](authoring-format-comparison.md):
that format removed repeated keys and explicit defaults as well as syntax. It
achieved a much larger token reduction. Nor does the whole-UX dictionary's earlier
17.4% byte saving imply that every small delivery batch will obtain that reduction.

**Do not roll out a general agent-authored text dictionary on this evidence.**
Keep the stronger compact-structure result. If text reuse receives another test,
a more focused candidate is referring to already available shared definitions or
explicit presets, avoiding reconstruction of a dictionary in every small batch.
Any such follow-up must preserve exceptions and demonstrate token or timing gains;
no further paid trial or production change is part of this experiment.

## Evidence and checks

[Metrics](shared-text-authoring-trial-metrics.json) preserve source/input/output
hashes, matched model settings, per-response usage, stream/tool intervals and
validation receipts. They contain no raw prompt, product payload or reasoning text.
Scratch inputs, outputs and scripts remain at
`.codex-tmp/shared-text-trial-20260927/`.

Preflight verified exact expansion, escaped text, and rejection of missing
references, malformed reference objects and non-string definitions. Both actual
deliveries then passed exact equality and whole-UX validation without correction.
Telemetry checks confirm completed turns, matching items, consistent token subsets
and matching canonical hashes. No live Alexa data or production code was changed.
