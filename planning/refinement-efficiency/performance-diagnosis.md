# Performance diagnosis from existing runtime records

Recorded 2026-09-27 after the owner authorized investigation of the packet
experiment's 110-second author window. No new agent, paid comparison, product
refinement or product mutation was needed. Read-only extraction also recovered
timing evidence for the earlier multitrack UX and UI agents.

**The packet trial was dominated by emitting output text. File I/O and assembly
were small.** The earlier real design run also spent substantial time in output
streams, but UI reasoning was material and UX had a long uncompleted output item
followed by an interruption. These are separate performance problems.

## The original 110-second window

Clipping the recovered item/tool boundaries to the exact timestamps in the
author's original timing file produces this breakdown:

| Observed activity                                    |     Seconds | Share of the original window |
| ---------------------------------------------------- | ----------: | ---------------------------: |
| Output-item streams containing file-writing commands |      95.187 |                        86.8% |
| Reasoning-item streams                               |       9.181 |                         8.4% |
| Tool-call invocation through returned result         |       2.495 |                         2.3% |
| Remaining time outside those intervals               |       2.813 |                         2.6% |
| **Original measured window**                         | **109.677** |     **100% before rounding** |

The expensive activity was waiting for the model to emit the commands containing
the JSON and bookkeeping. The subsequent execution of those commands was fast.
Writing through a file does not remove the model's cost of generating text that
goes into the file; it removes the need for another agent to reproduce that text.

These are **client-observed stream intervals**, not measurements of provider
compute time. Network pacing or service stalls can occur within them. A
reasoning-item interval is not specifically product-design judgment: it can
include thinking about representation, instructions or bookkeeping. No hidden
reasoning content was inspected or included in the report.

## The complete agent turn

The original 110-second clock began during the first tool execution and ended
before the final agent receipt. The whole turn was longer:

| Observation                                   |               Value |
| --------------------------------------------- | ------------------: |
| Runtime-reported complete turn duration       |           126.858 s |
| Event-record start-to-completion window       |           126.660 s |
| Completed output-item intervals               |           102.291 s |
| Completed reasoning-item intervals            |            11.767 s |
| Tool-call intervals                           |             2.993 s |
| Remaining time within the event-record window |             9.609 s |
| Runtime-reported time to first token          |             5.599 s |
| Model / effort recorded by the runtime        | gpt-6-astra / xhigh |
| Recorded model responses / tool invocations   |               4 / 3 |

Runtime duration and event-record duration use different observed boundaries;
their 198 ms difference is retained rather than silently forced into a category.
The original author was a generic worker, not the UX role configured at ultra.

The response-level detail is particularly useful:

| Response purpose                           | Output stream | Reasoning stream | Non-reasoning output tokens | Reasoning tokens |
| ------------------------------------------ | ------------: | ---------------: | --------------------------: | ---------------: |
| Command to read the saved flow             |       3.844 s |              0 s |                         135 |                0 |
| Write the first packet batch               |      26.380 s |          8.079 s |                         888 |              260 |
| Write the second batch and timing scaffold |      68.808 s |          1.102 s |                       2,304 |               30 |
| Final short receipt                        |       3.259 s |          2.586 s |                         112 |               93 |

Non-reasoning output arrived at approximately **33–35 tokens per observed output
second** in these four responses. That is a local observation, not a model speed
guarantee. At that observed pace, another 1,000 emitted tokens would occupy about
30 seconds. The longest response's 30 reasoning tokens cannot explain most of
its elapsed output interval.

There were 3,822 output tokens, **including** 383 reasoning tokens. The four
responses report 84,881 input tokens, **including** 59,904 cached input tokens.
These are summed per-request inputs, not unique source tokens. Usage is now known
for this completed trial; billed credits remain unknown. No cumulative snapshots
were added to their component request totals.

The timing experiment itself added output: the second command included code to
construct the timing report, alongside the packet data. The result therefore
includes instrumentation authoring overhead. Future timing should come from
existing runtime records and small fixed helpers, rather than asking the model
to compose repeated timing boilerplate.

## Evidence from the earlier multitrack design run

The same extraction was applied to the saved UX/UI agent sessions from the
75.9-minute run. Both used gpt-6-astra at ultra. Completed stream intervals are
reported separately from missing completions and between-turn gaps.

| Agent           | Sum of observed active turn windows | Completed output streams | Reasoning streams | Tool intervals | Other or uncompleted time inside turns |
| --------------- | ----------------------------------: | -----------------------: | ----------------: | -------------: | -------------------------------------: |
| UX, three turns |                           35.00 min |                13.49 min |          6.30 min |        14.60 s |                              14.97 min |
| UI, four turns  |                           17.78 min |                 9.45 min |          6.91 min |        15.55 s |                               1.16 min |

These agent windows can overlap each other and parent work. Do not add the rows
to reconstruct the complete product-run wall time. This investigation did not
attribute every parent action or the independent UX review.

### A long uncompleted UX output

A UX message item started at **16:21:22.137 UTC**. It has no recorded item
completion before the turn was interrupted at **16:35:10.634 UTC**: a span of
**828.496 seconds, or 13.81 minutes**. This accounts for most of the UX row's
uncompleted time.

The records establish an open output item followed by interruption. They do not
establish continuous token generation throughout that interval, how much partial
text was produced, whether the service stalled, or how much could have been
recovered. Do not call all 13.81 minutes useful generation, billable usage or lost
work. Its interrupted response may lack final usage. A subsequent UX turn took
11.48 minutes, including 9.41 minutes in completed output streams.

This is a concrete reason to deliver bounded complete units as work proceeds.
Avoid accumulating one large final JSON response whose completion is needed
before the parent can consume it. The freshly reloaded UX/UI roles have now
demonstrated that assigned temporary proposal writes work.

### Between-turn gaps are not automatically wasted time

UI had 43.78 minutes between its active turns. The largest gap was from foundation
completion at 16:22:42.986 to resumed composition at 17:04:42.079: **41.98 minutes**.
The workflow required current UX and independent review before composition.
This gap is not evidence that message transport took 42 minutes or that starting
more UI agents would remove the dependency. UX had 4.39 minutes between turns.

### Real UI design still has a meaningful reasoning cost

The main UI composition turn lasted 695.726 seconds. It contained 366.208 seconds
in output streams and 284.551 seconds in reasoning-item streams. Reducing emitted
data targets a large portion, but the small packet replay's 8.4% reasoning share
does not describe this real design work.

The saved UX responses report 35,240 output tokens including 8,037 reasoning
tokens; UI reports 32,188 including 12,994 reasoning tokens. UX has an interrupted
response without completion evidence, so these must not be treated as a complete
billed account of every attempted output. Full per-response input/cache counts
are retained in the metrics file rather than interpreted as unique context size.

## Priorities supported by this evidence

1. **Reduce the text agents must emit.** Keep saved meaning by reference; let
   deterministic helpers add repeated schema structure, shared defaults and
   bookkeeping. For new meaning, preserve the smallest useful behavioral packet.
   The tested packet format was 11.16% larger than its canonical flow, so that
   particular format has not earned adoption. A separate assembly agent helps
   only if it reduces author output enough to offset its own generation and
   coordination.
2. **Use durable unit delivery to limit interruption exposure.** Write completed
   native flows/elements/parts to their assigned files and return paths. Resume
   from those files. Use a meaningful unit or small batch, not a notification and
   model turn for every field. Temporary-file permission alone does not reduce
   generated bytes; it enables this delivery and reuse pattern.
3. **Keep performance bookkeeping out of authored payloads.** Prefer runtime
   timestamps and response usage, plus automatic script timings. The trial's
   manual timing scaffold itself consumed output.
4. **Treat reasoning-effort tuning as a separate UI experiment.** The real UI
   trace justifies a bounded later comparison using the same task, model, output
   contract and acceptance checks. It is not the first remedy for the packet
   trial, whose longest response had very little recorded reasoning.
5. **Avoid spending the next iteration optimizing disk writes or introducing a
   coordinator.** Current measured script and tool durations do not justify that
   priority. Preserve scope and review quality while targeting generation volume.

No new paid comparison was necessary to choose the first optimization target.
The next controlled comparison should vary only how much repeated representation
the author must emit, with identical behavioral coverage and saved output checks.
It should not combine a new model, lower effort, a different agent role and a new
output schema into one result. No model settings or production authoring contracts
were changed by this diagnosis.

OpenAI's [latency guidance](https://developers.openai.com/api/docs/guides/latency-optimization#generate-fewer-tokens)
also identifies output-token generation as an important latency source. That is
supporting guidance; the prioritization here comes from the local measurements.
The [documented telemetry](https://learn.chatgpt.com/docs/config-file/config-advanced#turn-and-tool-activity)
includes turn/tool durations and token categories, but does not equate a
reasoning-token count with product-design reasoning time.

## Evidence, extraction and checks

[performance-diagnosis-metrics.json](performance-diagnosis-metrics.json) preserves
response IDs and deduplicated usage, turn boundaries, item start/completion
metadata, tool boundaries, source session hashes and the unmatched UX item. It
contains no raw prompts, tool arguments, reasoning content or product payloads.

The extractor used read-only SQLite access with a thread-indexed query into the
local runtime log, and parsed only the three named session files. Item-start
records were joined to item completion by ID; tool calls to results by call ID;
usage was deduplicated by response ID. Overlapping intervals were unioned before
computing coverage. Missing completion stayed missing, rather than being assigned
an invented end time. Runtime-internal record shapes are diagnostic evidence, not
a new supported production dependency.

The local extraction ran in approximately 0.11 seconds. The disposable extractor
is retained at `.codex-tmp/performance-diagnosis-20260927/analyze.py`. Checks verified
nonnegative matched intervals, no conflicting response usage, coverage within
turn windows, token subsets no larger than their totals, and agreement with the
original author window. No production code changed, so the full package test
suite was not rerun for this diagnostic documentation.
