# Incremental UX first-pass replay

This experiment implements the isolated measurements in the
[incremental contribution plan](../../incremental-ux-contributions-plan.md).
It reuses the retained Alexa snapshot16/model7/UX4 baseline and production
workflow operations. Saved historical answers are inputs to the offline
construction check only; the live author receives baseline facts, prior UX and
compact current identities. Original answers and change plans are absent from
its prompt and capability grants.

The live boundary ends at the first assigned `units.finish` receipt. That
operation materializes the proposal. The author has no downstream assembly,
promotion, reviewer or publication operations. Its final acknowledgement may
arrive later; the analyzer reports that time separately. Defects remain evidence.

## Commands

Run deterministic construction without a model:

```powershell
node planning/refinement-efficiency/experiments/incremental-ux-replay/offline.mjs --attempt=construction-unique
```

Prepare the isolated live assignment without a model:

```powershell
node planning/refinement-efficiency/experiments/incremental-ux-replay/run.mjs --attempt=prepare-unique
```

After the parent approves the paid execution gate, reuse a successful prepared
attempt. The current role instructions, contribution guidance and operation
catalog are read and hashed again. Saved facts, imported units, identity handles
and the verified read plan are reused; no product preparation or import repeats.

```powershell
node planning/refinement-efficiency/experiments/incremental-ux-replay/run.mjs --attempt=first-unique --resume=prepare-unique --execute
python -B planning/refinement-efficiency/experiments/incremental-ux-replay/analyze.py .codex-tmp/incremental-ux-replay/first-unique
```

Only `--execute` launches a paid model. It uses `gpt-6-astra` with the native
UX role's `ultra` effort, matching the prior author. This launch uses one direct
author with the current role's developer instructions. The historical full
replay included a coordinating parent model, so compare author time separately
from end-to-end time. This is an explicit coordination difference, not a paired
unchanged-protocol test. There is no model sweep.

An installed Codex binary can be supplied with `--binary=<absolute-path>`.
Attempts must have unique names; prior artifacts are never replaced. A failed
sandbox child-process start can be resumed after normal execution approval;
its copied baseline is reused. Model-started attempts are not restartable through
this preparation-only resume path. Preserve their output for focused continuation.

## Evidence and interpretation

`sources.json` identifies the retained offline inputs by path and content hash.
It supplies no old output to the live launcher. `offline.mjs` mechanically
converts retained values into the production schema's named record operations,
then measures batches of 5, 10 and 20, exact retries, restart, finish and a
one-field correction. It compares decoded records and canonical values/order.
Packed bytes may differ because code owns default packing.

The captured first element has invalid `alternateInputs` packing defaults; the
offline report keeps that rejection separate from exact semantic reconstruction.
The original flow's `outcomecome` field is an expected rejection. The corrected
four-unit output retains its original flow-decision defect at finish. None of
these fixtures is silently labeled valid UX. Retained UX4 also contains a legacy
trace-gap owner outside the current schema, so the separate empty-store check
uses the maintained public UX fixture and requires exact, structurally valid
canonical output.

Preparation, catalog/role hashes, input identities, live-product hashes, service
observations and first finish receipts are saved under `.codex-tmp`. The existing
native launcher and wire observer capture actual direct/deferred tool exposure
and grouping. The existing retained runtime extractor provides observed output,
reasoning-item and tool intervals plus usage. The new analyzer separately counts
`tool_search_call`, which the historical extractor omitted. It reports generated
argument bytes, batch sizes, receipt rereads despite inline delivery, service
costs, first durable contribution, restart evidence and completeness.

End-to-end wall time starts at the original requested timestamp and includes
preparation. A prepare/execute hold is reported explicitly; it is not model
reasoning. Stream intervals and activity markers also do not measure private
thought or isolated provider computation. Server read coverage alone does not
prove client-visible completeness; inspect retained client outputs for truncation.
Actual usage counters remain separate from credits or price estimates.

The analyzer depends on the retained runtime extractor at
`.codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py` and its original
session database. It does not regenerate saved data. `--reuse-runtime` analyzes
an existing extraction. `--output=<new-path>` preserves earlier reports. Private
prompts, capabilities, raw model logs and artifact payloads stay in ignored
attempt folders. Commit only source and deliberately selected metadata reports.

## Current local decisions

- Reuse production `units.*` operations and native launch infrastructure.
- Keep one owner per unit; the current live assignment grants all existing units
  so it does not disclose the historical affected-unit selection.
- Use the same model and effort for comparison; record the direct-author launch
  difference explicitly.
- Treat mechanical packing as code-owned. Compare meaning and canonical order,
  while separately reporting original packing defects and resulting byte changes.
- Keep the empty-store correctness check separate from live update performance.
- Retain failed local attempts. No paid call has been made by preparation or
  offline construction.
