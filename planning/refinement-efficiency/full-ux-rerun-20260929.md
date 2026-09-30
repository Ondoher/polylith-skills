# Full UX rerun with progressive delivery

Status: full UX replay running since 2026-09-30T02:24:53.247Z through normal
Codex connectivity, with the model-request observer disabled as requested.
Runtime logs and local MCP instrumentation remain enabled.

## Scope and starting point

Rerun Alexa UX from the retained snapshot16/model7/UX4 baseline through initial
authoring, structural repair, independent review, review-directed corrections and
a fresh exact passing review. Preserve the live Alexa source and product files;
all writes stay in a disposable copied workspace. UI composition and publication
are outside this request. The first observed setup timestamp is
2026-09-30T01:20:14Z; authorization holds are recorded separately from processing.

Reuse the maintained full-stage harness and current roles. The harness now uses
the maintained local MCP instrumentation and an explicit `--execute` switch.
Without that switch it prepares and checks inputs locally without a model call.
Prepared attempts and completed client segments can be resumed with `--resume`.
The separate model-request relay remains available behind the optional
`--observe-model-requests` flag; its TLS preflight and endpoint override are
only used when that flag is supplied. This replay omits it.
Assignments use progressive authoring and review delivery throughout; the prior
complete-unit and temporary repair-script instructions no longer apply.

## Measurements to retain

- Request/setup/approval-hold boundaries, active client windows and final gate.
- Parent coordination, each author turn and each fresh reviewer separately.
- Instruction loading, complete input collection, preliminary decisions,
  contribution generation/delivery, structural repair, persistence, review
  preparation, review generation and review-directed rework.
- Per-call pre-command gap, observed output stream, client tool interval,
  internal service/queue time, bytes, returned pages, retries and response grouping.
- Reported input/cached input/output/reasoning tokens where available.
- Saved contributions, fragment/receipt hashes, changed/reused units, review
  findings, correction rounds and exact final validation.

Retain raw private evidence in the ignored attempt directory and publish only
metadata and useful findings. Actor windows overlap; service time is nested in
tool intervals. Output streams and unattributed gaps are not pure reasoning.
Compare initial author time with the prior incremental first round; compare full
stage time with the earlier full replay, explicitly retaining protocol differences.

## Questions and decisions

1. **Which starting point?** Reuse the saved original baseline, not the latest
   completed answer. This makes the work comparable and leaves live data unchanged.
2. **Which runner?** Reuse the full-stage coordinator and telemetry rather than
   building a second review/rework orchestrator. Report its coordination time
   separately from specialist time.
3. **Does a launch rejection count as UX performance?** No. Record it as an
   authorization hold before process launch.
4. **Why was the earlier launch held?** The first launch was rejected for an
   unidentified trusted destination. Read-only inspection proved that the observer
   uses the fixed OpenAI endpoint `https://chatgpt.com/backend-api/codex/responses`,
   keeps certificate/hostname checks enabled, and saves only diagnostic metadata.
   A retry with that evidence was still rejected because approval review requires
   an explicit user statement naming both the Alexa payload and the destination.
   The user subsequently directed bypassing this diagnostic relay while keeping
   it available for later use. The current run follows that instruction through
   ordinary Codex connectivity; it does not retry the rejected relay route.
5. **Which metrics remain available?** Runtime phase, command, usage and tool
   intervals plus local MCP measurements. Missing wire-only fields are null,
   not zero; actual outgoing flags and auxiliary approval requests are unobserved.
6. **Why did the first unobserved launch fail?** The sandbox rejected spawning
   the local service with EPERM before any model start. A fresh attempt with
   ordinary execution approval started successfully; prepared data was reused.

## Results

The local prepare and resume checks passed. No UX performance improvement or
completed review is claimed until the current run reaches its terminal gate.

| Local measurement      |      Initial preparation |         Reopen saved preparation |
| ---------------------- | -----------------------: | -------------------------------: |
| Measured preparation   |             1,854.697 ms |                       195.215 ms |
| Baseline copy          |   581.663 ms / 421 files |          Reused, no copied files |
| Verified input content | 514,426 bytes / 19 pages | Same saved handles and read plan |
| Protected live files   |            611 unchanged |                    611 unchanged |
| Model calls            |                        0 |                                0 |

[Preparation metrics](full-ux-rerun-20260929-preparation-metrics.json) retain the
service-call observations. The Node syntax check also passed. Prepared state is
in `.codex-tmp/ux-full-native-20260929/progressive-full-prepared-20260929/`;
its local resume check is in the sibling `progressive-full-resume-check-20260929/`.
Both owned service processes shut down cleanly. No credential or product payload
is copied into the public metrics.

Current running command (the observer is off by default):

```text
node planning/refinement-efficiency/experiments/ux-full-replay/run.mjs --attempt=progressive-full-unobserved-live-20260929 --resume=progressive-full-prepared-20260929 --execute
```

The current attempt reused preparation in 242.526 ms, without copying baseline
files. Its command-start timestamp is 2026-09-30T02:24:52.817Z. Earlier permission
discussion and sandbox recovery are outside this active replay window. Remaining
work is full UX completion, exact terminal validation and detailed runtime analysis.
