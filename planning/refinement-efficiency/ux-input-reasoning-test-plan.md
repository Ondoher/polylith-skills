# Next test: input size and UX reasoning effort

Status: **complete**, 2026-09-29. Both first saved bounded UX decisions and analysis
are recorded in the [execution report](ux-input-reasoning-execution.md). One matched
pair was run; no review, repair or further pair followed.

## Question

**Does supplying less surrounding data reduce the reasoning required to make the
same UX decision correctly?**

The primary measure is reported reasoning-token usage for that decision. Elapsed
time is a supporting measure. The task and its required meaning must remain the
same; a shorter or incomplete answer is not a saving.

The [previous staged-input pilot](staged-ux-input-execution.md) delayed three
existing packets while producing full contributions. It found essentially equal
total runtime, but mixed input use with output construction and later work. It
does not settle this narrower question.

## Matched conditions

| Condition          | Input                                                                            | Required work                                             |
| ------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| A: broad context   | All evidence required for the decision, plus additional coherent product context | Resolve the fixed UX decision and return the short answer |
| B: focused context | The same required evidence, with surrounding material omitted                    | The identical decision and answer contract                |

Use exact source records or source-addressed projections, with the same values,
field names, formatting and ordering for common material. B must be a verified
subset of A. Do not summarize only B, supply a prior answer, add a decision hint,
or simplify B's task. Keep any conflicting evidence relevant to the decision in
both conditions.

This deliberately tests selecting less context for one decision. It does not
test delivering the full product a page at a time, parallel authors, compression,
another model, or a complete refinement cycle.

## Fixed decision and answer

Reuse the original saved Alexa facts and UX baseline. Choose a bounded decision
requiring interpretation of current requirements alongside prior UX, rather than
a trivial fact lookup. A suitable candidate is:

> An occurrence associated with a named library clip has changed temporal
> boundaries and other local settings. Other videos already contain copies.
> What should confirming Update Named Clip change, and what must its confirmation
> communicate about the affected data?

Freeze the precise scenario, supplied records and correctness rubric before
either paid run. Include the relevant persistence rules and existing interaction
evidence in both inputs. Distinguish relevant baseline conflicts from unrelated
material. If additional evidence is essential to answer, it belongs in both.

Require the same small structured answer, for example:

- Eligibility and the proposed operation.
- Fields/data affected and preserved.
- Necessary confirmation content.
- Unresolved dependency, if any, and supporting source IDs.

Fix the same concise field/length limits for both conditions. Require enough
meaning to judge the answer, without a long rationale or full action/frame/flow
artifact. Do not request a transcript of internal reasoning. Record actual answer
size, since identical output obligations do not guarantee identical generated text.

## Control delivery and context

1. Use a fresh UX author thread per condition with the same role, model,
   configured effort and effective wire setting. Reuse existing isolation,
   authentication, MCP service and runtime observer tooling.
2. Supply generic instructions before the measured decision window, identically
   in both conditions. Neither author sees the other answer or historical finished
   solutions. Do not carry over either completed pilot thread.
3. Give each author exactly **one input read**. Each response must contain its
   entire assigned input without truncation. Choose a meaningful case and broad
   context that fit the existing return window; do not introduce pagination,
   larger limits or an alternate delivery route in just one condition. Report
   the actual size contrast and never label a bounded broad packet the full product.
4. Use the same compact delivery obligation: one saved answer through the existing
   result mechanism, followed by a minimal acknowledgement. No contribution
   assembly, global reference rewrite, product mutation, review, UI or publication.
5. Run A then B sequentially for the initial pair. Retain cache counters and note
   order/provider variation. More pairs are a later decision, not an automatic loop.

If an author needs additional product data, preserve the request and flag the
focused input as potentially insufficient. Do not silently grant extra reads and
call it a matched result. If the same delivery constraints cannot be satisfied,
resolve that in local preparation before paying for either author.

## Measurements

Use the **client-visible completed input tool result** as the start boundary and
the saved decision result as the end. Capture all model activity between them.
Do not start at a model-authored `inputs-ready` marker: the author may already
have reasoned about the data before emitting that marker.

Save for each condition:

- Exact input identities, bytes, record count and received-content hash; input
  tokens attributable to that response when available. Otherwise label counts as
  whole-request context or byte measurements, not isolated payload tokens.
- Actual unique response usage: reasoning-output tokens, total output tokens,
  input tokens and cached input tokens. Never sum cumulative resumed-session totals.
- Input-receipt-to-decision elapsed time, command/output stream intervals, tool
  time and unattributed gaps. Report setup and acknowledgement separately.
- Answer size, correctness/coverage against the frozen rubric, additional data
  requests, retries and any protocol deviations.

Count every model response in the decision window, including output construction;
the compact fixed answer limits that contribution without pretending it disappears.
Use actual response boundaries and disclose any crossing the timing boundary.
Reasoning tokens are a proxy for model effort, not direct access to why a model
reasoned or a measurement of pure comprehension time. Do not use self-reported
thinking durations as performance evidence.

## Execution sequence and early read

1. **Local preparation:** select the decision, freeze its rubric and both inputs,
   verify B's exact inclusion in A and required evidence in both, then check one-read
   delivery and telemetry without a UX author. Reuse saved data throughout.
2. **One matched pair:** obtain both real decisions using the protocol above. No
   full UX pass or review/rework is included. Preserve each first answer.
3. **Report immediately:** show input size, reasoning tokens, output tokens,
   elapsed time and correctness side by side. Inspect the saved short answers
   directly rather than commissioning broad reviewers.

Fewer reasoning tokens with the same correct decision would be the first direct
signal in favor of the hypothesis. Lower elapsed time alone would not establish
less reasoning. Lower token usage with missing meaning or extra data requests
would not establish success. Similar/higher reasoning usage gives no positive
signal for this case. A single pair supplies an initial indication, not a reliable
scaling law or causal proof immune to model variation.

After that report, decide whether a repeat or another decision is worth the cost.
Do not proceed automatically to larger data sets, full refinement, or production
changes. Current authorization ends at documenting this next test.
