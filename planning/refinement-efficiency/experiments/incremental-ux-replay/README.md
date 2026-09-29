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
Before any model launch, the observer verifies a credential-free TLS handshake
to its fixed upstream using Node's configured roots plus operating-system trust.
Certificate and hostname verification stay enabled. This accommodates the
machine's trusted certificate chain without disabling TLS checks; failure stops
before the model starts. The preflight sends no HTTP/model request.
Attempts must have unique names; prior artifacts are never replaced. A failed
sandbox child-process start can be resumed after normal execution approval;
its copied baseline is reused. Model-started attempts are not restartable through
this preparation-only resume path. Preserve their output for focused continuation.

## Evidence and interpretation

### Larger bounded-decision suite

The [larger suite plan](../../ux-input-reasoning-suite-plan.md) adds Save Clip and
grouped-trim cases, then runs two fresh matched pairs per case in reversed order.
`prepare-decision-suite.py` reuses the original frozen input hashes and validates
all exact source projections before writing. It never starts an author.

```powershell
python -B -X utf8 planning/refinement-efficiency/experiments/incremental-ux-replay/prepare-decision-suite.py .codex-tmp/ux-decision-suite/inputs-unique
node planning/refinement-efficiency/experiments/incremental-ux-replay/run.mjs --attempt=suite-save-range-r1-broad-unique --decision=.codex-tmp/ux-decision-suite/inputs-unique/save-range --condition=broad --execute
python -B -X utf8 planning/refinement-efficiency/experiments/incremental-ux-replay/analyze-decision.py .codex-tmp/incremental-ux-replay/suite-save-range-r1-broad-unique --output=.codex-tmp/ux-decision-suite/save-range-r1-broad-metrics.json
```

This illustrates one scheduled author. Follow `suite.json` for the complete order;
keep authors sequential and stop at each first answer. Omit `--execute` for local
MCP grant/read/store checks. The first four author runs cover both new decisions;
report those before completing the 12-run schedule. Correctness is judged against
the frozen parent-only rubric, with no answer repair or separate model review.

### Bounded input-reasoning test

The [input-reasoning plan](../../ux-input-reasoning-test-plan.md) compares the same
short UX decision with broad versus focused context. It uses two fresh authors,
one complete input read each, and one saved answer each. No contribution assembly
or review follows the answers. The focused input is an exact subset of the broad
input; both contain the relevant current requirements and conflicting prior UX.

```powershell
python -B planning/refinement-efficiency/experiments/incremental-ux-replay/prepare-decision.py .codex-tmp/ux-decision-test/inputs-unique
node planning/refinement-efficiency/experiments/incremental-ux-replay/run.mjs --attempt=decision-broad-unique --decision=.codex-tmp/ux-decision-test/inputs-unique --condition=broad --execute
node planning/refinement-efficiency/experiments/incremental-ux-replay/run.mjs --attempt=decision-focused-unique --decision=.codex-tmp/ux-decision-test/inputs-unique --condition=focused --execute
python -B planning/refinement-efficiency/experiments/incremental-ux-replay/analyze-decision.py .codex-tmp/incremental-ux-replay/decision-broad-unique --output=.codex-tmp/ux-decision-test/broad-metrics.json
python -B planning/refinement-efficiency/experiments/incremental-ux-replay/analyze-decision.py .codex-tmp/incremental-ux-replay/decision-focused-unique --output=.codex-tmp/ux-decision-test/focused-metrics.json
```

Omit `--execute` for an isolated, real MCP grant/read/store check without model
calls. The rubric is frozen in the private manifest before execution and is never
included in an author's prompt. Both authors receive the unchanged UX role and
identical bounded-assessment instructions. Only the parent's capability can access
the complete baseline; authors receive one input handle and `result.store`.

The analyzer verifies exact client-visible input bytes and starts measurement at
that tool result, ending at receipt of the saved answer. It associates unique
usage counters with model responses created inside the decision window, including
the response that submits the answer. Startup and acknowledgement remain separate.
Inspect answers against the frozen rubric before interpreting performance. One
pair is an early signal; it cannot establish a repeatable or general input-size effect.

### Matched staged-input pilot

The [staged-input plan](../../staged-ux-input-plan.md) reuses this harness with
three source-projected tasks. Prepare immutable packets once, then run the two
conditions sequentially using distinct attempt names:

```powershell
python -B planning/refinement-efficiency/experiments/incremental-ux-replay/prepare-pilot.py .codex-tmp/staged-ux-pilot/packets-unique
node planning/refinement-efficiency/experiments/incremental-ux-replay/run.mjs --attempt=all-unique --pilot=.codex-tmp/staged-ux-pilot/packets-unique --condition=all --execute
node planning/refinement-efficiency/experiments/incremental-ux-replay/run.mjs --attempt=staged-unique --pilot=.codex-tmp/staged-ux-pilot/packets-unique --condition=staged --execute
python -B planning/refinement-efficiency/experiments/incremental-ux-replay/analyze-pilot.py .codex-tmp/incremental-ux-replay/all-unique .codex-tmp/incremental-ux-replay/staged-unique --output=.codex-tmp/staged-ux-pilot/comparison-unique.json
```

Omit `--execute` to check real MCP grants, packet reads and eventual coverage
without an author. Pilot runs do not accept the preparation-only `--resume`
option. The driver uses the supported `codex exec resume <thread-id>` command
internally between tasks, retaining the same author context and contribution
store. Both conditions use identical continuation boundaries; staged input
withholds future packet handles until needed. It does not erase earlier context.

The pilot author receives five assigned units, compact identities, shared rules
and the three task packets. The entire baseline remains in the isolated store
for deterministic final materialization. `units.finish` runs once after task 3;
its first receipt is the measurement boundary. Original and revised proposals
are retained without a review or repair round. This is a partial-product
experiment, not a full refinement or product acceptance.

### Original full-scope experiment

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
thought or isolated provider computation. The analyzer separately reconstructs
client-visible input pages and verifies their exact hashes; this establishes
received content, not semantic comprehension.
Actual usage counters remain separate from credits or price estimates.

Public reports keep per-request scalar wire summaries and one deduplicated tool
catalog/exposure inventory. Tool totals count calls started by first finish;
completed-call totals can be lower when the final client result crosses that
server boundary. First durable contribution time is reported from both author
start and the original request. Auto-review request intervals and their overlap
with contribution/finish tools are diagnostic observations, without attributing
all nonservice delay to approvals. Prior failed harness attempts, current setup
and TLS preflight remain separate overhead evidence.

The analyzer depends on the retained runtime extractor at
`.codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py` and its original
session database. It does not regenerate saved data. `--reuse-runtime` analyzes
an existing extraction. `--output=<new-path>` preserves earlier reports. Private
prompts, capabilities, raw model logs and artifact payloads stay in ignored
attempt folders. Commit only source and deliberately selected metadata reports.

## Current local decisions

- Reuse production `units.*` operations and native launch infrastructure.
- Keep one owner per unit. The default full-scope assignment grants all existing
  units so it does not disclose the historical affected-unit selection; the
  staged-input pilot grants its five explicitly scoped units.
- Use the same model and effort for comparison; record the direct-author launch
  difference explicitly.
- Treat mechanical packing as code-owned. Compare meaning and canonical order,
  while separately reporting original packing defects and resulting byte changes.
- Keep the empty-store correctness check separate from live update performance.
- Retain failed local attempts. No paid call has been made by preparation or
  offline construction.
