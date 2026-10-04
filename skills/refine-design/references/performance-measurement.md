# Refinement performance evidence

Use during ordinary refinement and bounded performance experiments. Reuse saved
outputs; do not commission another full design run just to populate a chart.
Keep trace files beside the run, outside product authority and authoring stores.
For a real application, durable inputs, trace, captures and outputs belong in its
owning repository. Temporary experiments may hold application data in the skills
checkout's designated temporary directory. Preserve useful project evidence in
the application before retiring the experiment; keep tracked skills files limited
to product-neutral tooling, general findings and unrelated synthetic fixtures.

## What to capture

Start the run clock before instruction discovery. Record the observed boundaries
of parent preparation, agent dispatch/receipt, explicit holds and resumes,
deliveries, validation, persistence, rendering and publication when requested.
Use separate observations for retries and repairs; retain earlier attempts.

For each author, distinguish dispatch-to-receipt from first useful delivery and
later batches. Capture task purpose as `design`, `representation`, `execution`,
or `unknown`. Purpose describes the assignment, not hidden model activity.
An agent window includes reading, reasoning, generation, tools and waiting unless
the runtime exposes narrower measurements. Never subtract tool time and label the
remainder reasoning. Record startup and provider queue time only when observable.

Record actual input/output bytes, reused units, calls and repairs where known.
File delivery avoids parent reproduction but does not prove reduced authoring
time. A delivery and consumer read can have separate timestamps; report the gap
without guessing which participant caused it. Mixed work remains mixed.

## Helpers

### Input delivery within existing limits

Measure instruction discovery as preparation, including any truncated read and
recovery. Keep existing tool-output caps. For parallel reads, budget the sum of
the returned text plus labels/metadata against the outer wrapper's allowance,
with headroom; split the batch when it will not fit. Larger per-command allowances
do not increase the wrapper's allowance. Forward raw command text rather than
JSON-encoding an entire tool result containing long text.

For required long instructions, inspect file size and load bounded contiguous
sections. Track source identity and delivered ranges so every required section is
covered without rereading completed sections. Line counts alone do not bound the
size of a long JSON line. Check truncation notices at both command and wrapper
levels; an ending marker alone is insufficient because middle truncation can
preserve the beginning and end. Retrieve only missing ranges in smaller chunks,
following any owner-directed diagnostic pause before retrying.

For large structured artifacts, let scripts read and validate the complete files.
Return the selected records needed for reasoning or compact validation results,
counts, paths and hashes. Do not summarize away required instructions or design
details needed for the assigned decision. Input-size estimates guide batching;
they are not proof of complete delivery.

### Bounded batch reader

Use the reader for large instructions or a batch whose combined output might
exceed tool limits:

```text
node scripts/bounded-read.mjs <first-file> <second-file>
node scripts/bounded-read.mjs --cursor <NEXT-token> <first-file> <second-file>
```

The default response budget is **4096 UTF-8 bytes**, including all source labels,
byte ranges, hashes, framing and continuation. `--max-bytes` accepts 512–8192;
select a smaller value if the host's existing cap requires it. This is a measured
byte bound, not a tokenizer-based token count or permission to increase host caps.
Forward only raw stdout into one tool response, leaving room for host metadata.
Do not combine several pages or other large outputs in that response. Both the
command and outer wrapper still need enough of their existing allowance for the
single page. The helper cannot intercept unrelated calls or later caller wrapping.

Each `FILE` header identifies a source by resolved path and SHA-256 and states
its inclusive/exclusive byte range and total bytes. Text after the header is the
exact source fragment; framing adds a separating newline. Continue with the same
ordered file paths and unmodified `NEXT` token until `DONE`. A token repeats the
same page when retried against unchanged sources. Track range coverage, because
the helper cannot prove that the model received or read a rendered response.

Every continuation rehashes and validates UTF-8 for all sources, including files
already delivered. Changed contents or file order invalidate the cursor rather
than mix versions. The implementation streams hashing with bounded per-file
windows and never modifies sources or writes a cache. Rehashing is deliberate
local I/O overhead; measure it before adding a more complex cache. Invalid UTF-8,
bad positions or insufficient room for metadata plus a code point fail before
any stdout is emitted; CLI errors are bounded to 512 bytes. Empty sources still
receive a coverage entry. Multibyte characters are never split across fragments.

The programmatic `readBoundedBatch(files, options)` result includes exact fragments,
coverage and the next cursor for verification; forward only its `text` field to
the model. Use `node --test --test-isolation=none scripts/bounded-read.test.mjs`
for bounded-output, reconstruction, continuation, source-change and CLI checks.

### Timing helpers

Wrap an existing command without changing its arguments or normal stdout:

```text
node scripts/performance-trace.mjs run --directory <run>/trace --stage ux --operation assemble -- node scripts/single-pass-design.mjs assemble --store <store> --output-dir <output>
```

This records subprocess lifetime, including startup and imports. It does not
capture the enclosing Codex tool roundtrip; record that separately at the caller
when available. The wrapper preserves child exit status; failure to save telemetry
prints a warning and does not fail successful product work. It uses no shell.

`DesignRun.assemble` also reports `readMs`, `identityMs`, `cacheCheckMs`,
`assemblyMs`, `validationMs`, `serializationMs`, `persistMs` and optional
`renderMs`. These measure local work inside the process. `persistMs` covers output
files; the final report write is outside its own timing. Reused output reports
only this invocation's read, identity and cache-check work, never stale assembly
durations from the earlier run. Preserve each returned report beside its attempt.

For agent and tool observations, call `savePerformanceSpan(directory, span)` from
`scripts/performance-trace.mjs`, or supply a JSON file to:

```text
node scripts/performance-trace.mjs record --directory <run>/trace --input <span.json>
node scripts/performance-trace.mjs report --directory <run>/trace --start <UTC> --end <UTC>
```

The `PerformanceSpan` contract is in `scripts/types.d.ts`. A minimal observation:

```json
{
  "id": "ux-author-first-delivery",
  "actor": "ux-author",
  "stage": "ux",
  "operation": "author-first-delivery",
  "kind": "agent-window",
  "purpose": "unknown",
  "startedAt": "2026-01-01T00:00:00.000Z",
  "finishedAt": "2026-01-01T00:00:05.000Z",
  "outcome": "complete",
  "measurements": {"output-bytes": 2000},
  "usage": null
}
```

Save incomplete work with `finishedAt: null` and `outcome: "incomplete"` when a
completion timestamp is unavailable. Each observation is immutable; completion
evidence or a retry uses another ID. Parallel actors write separate files. Use
shared UTC timestamps for cross-actor intervals and monotonic local measurements
for process work. Do not save raw prompts or product payloads in telemetry.

## Interpreting the report

The report shows wall time, the union of completed observed intervals, uncovered
time, incomplete IDs, and nonadditive breakdowns by actor, purpose and boundary.
Uncovered time means missing evidence, not necessarily idle time. Overlapping
agent/tool/process/helper intervals are not added to produce total elapsed time.
Without explicit run bounds, the window spans only available observations and
cannot establish startup or trailing cost.

Usage remains attached to its observation with a provider/runtime source, or
`null`. Reasoning tokens are a subset of output; cached inputs are a subset of
input. Do not attach session aggregates to individual operations or sum overlapping
usage reports. These helpers do not expose hidden inference timing, estimate
billed credits, or replace existing artifact validators and review receipts.
