# Direct JSON versus compact authoring and scripted assembly

Executed 2026-09-27 after the owner authorized testing deterministic format
expansion. **Compact authoring delivered the same flow about 40% sooner in this
trial and used 46% fewer tokens in the writing response.** The script expanded
the compact data in 1.52 ms. This supports reducing the structure agents emit;
it does not establish full-product refinement speed or justify an assembly agent.

Follow-up: the [reduced-data evaluation](reduced-data-passing-evaluation.md) examines
all saved UX/UI record types. Generic lossless packing saved 10.2% / 7.3% in bytes,
without another model run. Those results identify where tailored contracts are
needed; they are not additional authoring-time measurements.

## What was compared

Two fresh writing workers received the same 6,586-byte prose description of one
saved Alexa flow: four primary steps, five alternates, eight steps total and four
decisions. Behavior, wording, references and ordering were fixed. Neither author
received the existing canonical JSON, the converter, or the other author's work.
The parent retained the saved flow as an exact comparison oracle.

- **Direct:** write a native canonical JSON flow, including repeated metadata,
  field names, actor and nested structure. Whitespace was the author's choice,
  with instructions to minimize unnecessary output.
- **Compact:** write tab-separated rows in five named sections, with one header
  per section. A script expands rows into the same JSON, adds the supplied shared
  defaults and actor, and groups steps under their identified alternates.

Both used the worker role, no conversation-history fork, and inherited
**gpt-6-astra / xhigh**, confirmed from their runtime records. Both ran concurrently
under the same delivery instructions: one read of facts and contract, one
PowerShell file-write call, then a short receipt. Using matched workers isolated
representation authoring from the UX/UI roles' different instructions. This was
not a fresh UX or UI design evaluation.

The compact protocol uses actual tabs between fields, newlines between records,
semicolons between reference IDs and explicit escapes for tabs/newlines inside
text. The direct contract was 1,873 bytes; the compact contract was 2,621 bytes.
The comparison therefore includes format instructions, default omission and
structure expansion, not just changing a separator.

## Results

| Observation                                   | Direct JSON | Compact rows + script |
| --------------------------------------------- | ----------: | --------------------: |
| Agent start to successful file-write result   |    67.833 s |          **40.759 s** |
| Full agent turn, including receipt            |    70.210 s |          **44.921 s** |
| Writing-response output tokens                |       1,895 |             **1,016** |
| Writing tool-call output stream               |    56.634 s |          **30.264 s** |
| Writing tokens per output-stream second       |       33.46 |                 33.57 |
| Whole-turn output tokens, excluding reasoning |       2,065 |                 1,136 |
| Whole-turn recorded reasoning tokens          |          32 |                     0 |
| Authored file bytes                           |       6,765 |                 4,297 |
| Writing tool-call argument bytes              |       7,619 |                 4,650 |
| Writing tool execution                        |      399 ms |                391 ms |
| JSON parsing / compact expansion              |    0.080 ms |              1.522 ms |
| Existing whole-UX validation                  |   33.361 ms |             32.823 ms |
| Author corrections                            |           0 |                     0 |

Both outputs passed exact deep equality against the saved flow and the existing
whole-UX validator after insertion into the reused baseline. Their canonical
hashes match. The checks cover the complete supplied prose, reference values,
alternate branches, decisions, field presence and array order. No meaning was
silently repaired, and no fresh independent design approval is claimed.

The compact file is 36.5% smaller than the authored JSON, but some of that is JSON
whitespace. Against the same JSON minified to 5,540 bytes, it is **22.4% smaller**.
Token savings are larger: the writing response used **46.4% fewer tokens**,
including the generated command wrapper. Both writing responses reported zero
reasoning tokens and nearly identical output-stream throughput. That provides
stronger evidence for reduced output volume than comparing file bytes alone.

## What the timing does and does not show

The complete direct turn contained 61.675 s of output streams, 1.062 s of
reasoning-item streams, 0.808 s of tool intervals and 6.665 s unattributed. Compact
contained 33.622 s of output streams, no recorded reasoning-item interval,
0.777 s of tool intervals and 10.522 s unattributed. Zero recorded reasoning does
not mean no computation or interpretation occurred.

These are client-observed intervals, not isolated provider compute, reading or
network-transfer times. File readiness is measured at the successful write-tool
result, before the final receipt. Parent scheduling and the later validation
invocations are excluded. Conversion and validation measurements exclude helper
startup, imports and prototype preparation. The two agents started about eleven
seconds apart; each duration uses its own start, not a shared stopwatch.

Input/cache usage differed: direct recorded 59,386 input tokens, of which 44,288
were cached; compact recorded 59,405, of which 53,376 were cached. Those totals
sum three responses each, rather than measuring unique input size. The writing
responses had 19,832 / 20,280 input tokens respectively, with the same 17,536
cached tokens each. No dollar or credit estimate is inferred.

This is one concurrent pair, not a statistical benchmark. Cache state, provider
queueing and throughput were not controlled. It establishes a useful result for
this fixed flow, not a guaranteed 40% improvement for new design or a large
product. It also does not test multiple producers, incremental delivery, UI comp
generation, independent review or a separate assembly agent.

## Scaling and cumulative improvements

Owner follow-up: preserve this gain as one contribution toward the overall
performance target. A 40% reduction is useful even though it cannot by itself
bring an hours-long refinement under a minute.

For similarly structured data, the working expectation is approximately linear
growth in authored tokens and generation time, assuming comparable throughput.
This trial measured only one size; it did not establish a scaling curve. As fixed
overhead becomes less significant, delivery-time savings could approach the
roughly 46% writing-token reduction. More data alone does not imply 80-90% savings.

Apply any improvement only to the work it affects. For illustration, if comparable
authoring accounted for half of a two-hour run, cutting that portion by 46% would
leave about 92 minutes. This is arithmetic, not a forecast for Alexa. Retain stage
durations and overlapping intervals so later optimizations can be evaluated
together without adding percentages or counting the same saved work twice.

Larger gains require reducing the amount of meaningful content agents must
repeatedly author, as well as its encoding overhead. Candidate follow-ups are:

- Author shared interaction patterns once and reference them with explicit
  differences; preserve genuinely unique behavior.
- Let scripts derive repetitive stored structures and document presentations from
  the authored decisions, without inventing missing meaning.
- Render comps from reusable components and compact specifications.
- For iterative refinement, regenerate only affected units and their dependents.

These are opportunities, not measured savings or adopted production contracts.
Pattern reuse could improve the ratio for products with substantial repetition;
unique new content still requires authoring. Preserve and combine verified gains
while measuring their contribution to the complete workflow.

## Practical recommendation

Proceed toward a narrow compact authoring contract with deterministic expansion:
agents supply meaningful text, identifiers and relationships once; scripts supply
repeated structure and explicit shared defaults. Keep canonical JSON for storage
and downstream consumers. Pass file paths between stages so another agent does
not reproduce the payload. This trial gives no reason to add a model call for
mechanical assembly.

Treat the scratch tabular format as a demonstrated direction, not a complete new
schema. Before production adoption, cover varying actors/defaults, optional and
empty values, reference-list escaping and supported UX/UI record kinds. Validate
each completed unit and request correction only for the affected data. A
deterministic converter must report missing or conflicting meaning rather than
invent behavior. Production assembly should index records once instead of
rescanning steps for every alternate, as this small prototype currently does.

The next useful evidence can come from the next ordinary refinement: retain
writing-response tokens, time to each completed unit, expansion/validation time
and correction counts. A second paid replay is not necessary to establish that
this specific representation reduced output. Full refinement still includes
design, review, UI and coordination costs measured in the
[earlier diagnosis](performance-diagnosis.md).

## Evidence and verification

[Metrics](authoring-format-comparison-metrics.json) preserve per-response usage,
matched model settings, stream and tool boundaries, canonical hashes and hashes
of local inputs, outputs and helpers. They contain no raw prompt, tool argument,
reasoning text or product payload. Raw evidence and the fixture-scoped prototype
remain under `.codex-tmp/format-comparison-20260927/` for local replay.

Before dispatch, the converter passed exact round-trip checks, malformed-header,
unknown-section and unknown-branch rejection, and text escaping checks. An
escaped-backslash bug was corrected during that preflight. Both subsequent
authoring attempts succeeded without repair. Timing extraction checked completed
turns, matched items, nonnegative intervals, consistent token subsets and identical
canonical hashes. No production code or live Alexa data changed; no full package
test rerun was needed for this experiment.
