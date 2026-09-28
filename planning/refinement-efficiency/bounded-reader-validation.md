# Proactive bounded reader: implementation and validation

Implemented after the owner requested prevention of oversized reads while keeping
the existing tool-output restrictions. Alexa refinement remains paused; no Alexa
inputs or artifacts were changed and baseline capture is still pending.

## Delivered behavior

`skills/refine-design/scripts/bounded-read.mjs` reads an ordered batch of UTF-8
files and returns at most 4096 bytes by default, including every source label,
byte range, hash and continuation token. It accepts explicit budgets of 512–8192
bytes without changing any host limit. A page can contain several small files or
part of a large one. The caller forwards only raw output, one page per tool result.

An opaque cursor identifies the next unread position. Every continuation verifies
the complete ordered source identities before returning text, preventing accidental
version mixing. UTF-8 code points remain intact; BOMs, line endings, empty files and
long unbroken JSON lines retain exact coverage. Invalid input fails before stdout.
The CLI also bounds error output. The reader writes no files and adds no dependency.

Repository instructions and the beginning of the refinement skill now direct large
reads through the helper. The performance reference documents invocation and its
limits. Six behavioral tests are part of the fast and performance test commands.

## Evidence

A local pagination check used the current skill entrypoint, diagnostic rules and
repository instructions: **68,344 source bytes**, **19 pages**, **4096 bytes maximum
per page**, and byte-exact reconstruction of every source. The complete local
pagination/verification loop took **40.9896 ms**. This excludes agent reading,
tool roundtrips and process startup; it is not an end-to-end refinement speedup.
[Per-page measurements and source hashes](bounded-reader-validation-metrics.json)
retain exact durations, output sizes and delivered ranges.

The package fast gate passed **152/152 tests** in **32,320.1848 ms** as reported by
Node. The six focused reader tests cover aggregate budgets and exact reconstruction,
continuation and replay, source changes, malformed inputs, UTF-8 and CLI behavior.
The initial test fixture had a corrected syntax error; subsequent child-process
checks encountered sandbox `EPERM`, then passed when run with subprocess access.
[Verification measurements](bounded-reader-test-metrics.json) preserve the failure
history, collected tool timings and all final per-test durations. Nested tool and
test durations are not additive.

## Practical limits

- The cap applies to the helper's raw output. A caller can still cause truncation
  by wrapping it, appending unrelated text, batching multiple pages, or selecting a
  smaller host allowance. It cannot intercept arbitrary Codex tool calls.
- The byte budget is conservative and deterministic; it is not an exact model
  token count. The caller still checks host truncation notices and range coverage.
- Complete source hashes are recomputed per page. This costs additional local I/O,
  especially for large batches. The small measured cost here does not establish
  scalability for arbitrary file sizes.
- Pagination adds tool roundtrips when a model consumes the pages. The local
  41 ms measurement excludes that cost; future attended measurements must retain
  it. The helper prevents avoidable oversized responses rather than reducing the
  amount of required instruction text.

Resume the attended run with bounded instruction reads, then capture and verify the
restorable baseline before product mutation. Preserve the original truncation
incident and its measurements instead of replacing them with this successful check.
