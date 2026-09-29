# Current UX performance-test scope

Owner direction, 2026-09-29: test only the first UX round for now.

Later owner direction defers the multi-read skill and forced-parallelism
investigation. Preserve their evidence and the larger return window; inconsistent
batching must not block other performance work. The next proposed direction is
[incremental UX contributions](../incremental-ux-contributions-plan.md), which
first tests deterministic construction and reuse using saved data. Reduced
model reasoning/representation work is the goal; smaller payloads are secondary
and do not justify added reasoning or bookkeeping.

Measure preparation/instruction loading, input collection, initial UX reasoning,
and generation/delivery of the first complete UX proposal. Stop when that first
authoring output is saved and available. Keep the output, exact input identities,
and granular timing/usage evidence so work can be resumed or compared later.

Do not dispatch a UX reviewer or continue into review-driven repair, subsequent
authoring rounds, downstream assembly/persistence, UI, comps or publication as
part of these tests. Record defects in the first output without launching a
correction round. Recover collection or delivery failures only as needed to
obtain that first output, retaining completed work and recording recovery costs
separately.

Reuse saved inputs and preserve live-product isolation. Compare equivalent
first-pass boundaries across tests; the complete historical run is not a
first-pass timing baseline without separating its later stages.

The `ux-full-replay` assignments and reports preserve the earlier full-run
experiment, including its review and repair stages. They are historical scope,
not the default for the next test. Any reused launcher/assignment must apply the
first-pass stopping point above before it is run. Broader testing requires a
subsequent owner instruction.
