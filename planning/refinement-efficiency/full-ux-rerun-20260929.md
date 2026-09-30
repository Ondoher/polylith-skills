# Full UX rerun with progressive delivery

Status: local preparation verified; live launch awaits the explicit payload/destination
approval requested by automatic approval review. No model replay has started.

## Scope and starting point

Rerun Alexa UX from the retained snapshot16/model7/UX4 baseline through initial
authoring, structural repair, independent review, review-directed corrections and
a fresh exact passing review. Preserve the live Alexa source and product files;
all writes stay in a disposable copied workspace. UI composition and publication
are outside this request. The first observed setup timestamp is
2026-09-30T01:20:14Z; authorization holds are recorded separately from processing.

Reuse the maintained full-stage harness and current roles. The harness now uses
the maintained observer, normal TLS preflight and an explicit `--execute` switch.
Without that switch it prepares and checks inputs locally without a model call.
Prepared attempts and completed client segments can be resumed with `--resume`.
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
4. **Why is explicit approval pending?** The first launch was rejected for an
   unidentified trusted destination. Read-only inspection proved that the observer
   uses the fixed OpenAI endpoint `https://chatgpt.com/backend-api/codex/responses`,
   keeps certificate/hostname checks enabled, and saves only diagnostic metadata.
   A retry with that evidence was still rejected because approval review requires
   an explicit user statement naming both the Alexa payload and the destination.
   An approval question is pending. No alternate launch or data transmission was
   attempted after that rejection.

## Results

The local prepare and resume checks passed. No UX performance improvement or
completed review is claimed at this point.

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

After explicit payload/destination approval, resume the preparation with a new
attempt name rather than copying or interpreting the source again:

```text
node planning/refinement-efficiency/experiments/ux-full-replay/run.mjs --attempt=progressive-full-live-20260929 --resume=progressive-full-prepared-20260929 --requested-at=2026-09-30T01:20:14Z --execute
```

The remaining work is the authorized model launch, full UX completion, exact
terminal validation and detailed analysis of the captured runtime. Record the
approval hold separately; it is not agent reasoning or UX tool execution.
