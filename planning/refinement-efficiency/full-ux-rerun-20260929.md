# Full UX rerun with progressive delivery

Status: complete. UX revision 6 passed structural validation and a fresh exact
independent review after one review-directed repair round. Ten of sixteen units
changed; six were reused unchanged. All 611 protected live Alexa files remained
byte-identical. The model-request observer was disabled throughout this run.

[Detailed metrics](full-ux-rerun-20260929-metrics.json) preserve phase boundaries,
per-command stream/gap/tool timings, bytes, usage, page verification, service
operations, compaction observations, duplicate delivery and artifact identities.

## Result and boundaries

The active Codex run took **1h26m49.212s**, from 2026-09-30T02:24:53.247Z to
03:51:42.452Z. Mechanical reopening of the prepared inputs took **242.526 ms**;
no baseline files were recopied. Earlier permission discussion, edits to bypass
the observer, and this supervisor analysis/checkpoint are outside that active
window. This is an isolated saved-baseline update, not a cold-start refinement.

The earlier full replay took **2h08m59.807s** from client dispatch to completion.
This run was **42m10.595s shorter (32.7%)**. Both include authoring, review and
repair, but their generated decisions, findings, coordination, observation setup
and interruption histories differ. This is an observed comparison, not a
controlled estimate of the optimization's effect.

The separate 13m55s incremental experiment stopped at its first unreviewed
proposal. It is not the comparison boundary for this complete run.

The normal Codex connection handled model traffic. Runtime logs and the local
MCP service retained instrumentation. The relay, its TLS preflight and endpoint
override now require `--observe-model-requests` in the full-stage runner. The
observer code remains available for later diagnostics. No wire metadata file was
created; wire-only counters are null rather than reported as zero.

## Sequential elapsed time

These intervals partition the active run. Their labels include generation,
reasoning-related activity, calls and waiting; none is pure reasoning time.

| Interval                                            |          Elapsed |
| --------------------------------------------------- | ---------------: |
| Parent preparation and author dispatch              |        9m00.784s |
| Author instructions and contract discovery          |        5m52.836s |
| Author input collection                             |        2m41.689s |
| Transition to comparison                            |          29.075s |
| Initial comparison and preliminary decisions        |          26.532s |
| Further decisions and initial contribution delivery |       14m04.041s |
| Structural repairs and consistency correction       |        3m15.292s |
| Assembly, persistence and first-review dispatch     |        3m16.834s |
| Review 1 dispatch and guidance                      |        5m52.128s |
| Review 1 collection and transition                  |        2m44.933s |
| Review 1 assessment and delivery                    |        5m03.156s |
| Review inspection and repair dispatch               |        1m35.709s |
| Repair input collection                             |        3m28.041s |
| Repair authoring and delivery                       |        4m06.277s |
| Revised persistence and second-review dispatch      |        3m13.086s |
| Review 2 dispatch and guidance                      |        4m32.508s |
| Review 2 collection and transition                  |        3m06.817s |
| Review 2 assessment and delivery                    |        6m36.011s |
| Final validation, context compaction and reporting  |        7m23.456s |
| **Active run**                                      | **1h26m49.212s** |

The author was reused for repairs. Its lifetime spans idle review time; use the
saved active-turn intervals rather than treating its entire lifetime as work.
Parent and specialist windows overlap and must not be added to wall time.

## Generated delivery and local execution

| Delivery work                                                     | Calls | Command bytes | Command-generation streams | Client tool intervals |
| ----------------------------------------------------------------- | ----: | ------------: | -------------------------: | --------------------: |
| Initial design contributions                                      |     4 |        55,912 |                  5m49.101s |               16.264s |
| Structural and consistency corrections                            |     4 |         4,899 |                    34.284s |               14.595s |
| Review-directed repair                                            |     2 |        30,868 |                  3m05.898s |                6.507s |
| First review contributions and assembly                           |     3 |        14,220 |                  1m27.730s |               12.622s |
| Second review contributions and assembly, including one duplicate |     5 |        18,913 |                  2m34.404s |               18.640s |

Command bytes include tool arguments and envelopes. The earlier full run spent
25m01.550s generating five whole-record delivery commands. The four initial
contributions here took 5m49.101s; different decisions and output prevent an
exact like-for-like causal comparison. Useful reasoning can continue during
command generation. These stream durations are subsets of the timeline above.

All **228 MCP service calls totaled 2.231 seconds of internal service work**.
That total includes supervisor setup calls. It excludes model generation,
client processing, approval handling and network scheduling. The passing review
validation took **39.815 ms**. There were no service-level failed operations;
three materialization results did report authored-data issues before correction.
Successful transport is not proof of valid authored content.

All supplied author input pages were byte-exact. Every extracted returned page
from all actors also matched its saved handle; no missing or mismatched page was
found. Runtime order shows a maximum of five outstanding native reads in the
parent, but only one for the author and each reviewer. Parallel collection
therefore remained inconsistent despite the guidance. This runtime observation
does not reveal the outgoing backend flag or exact model-response grouping.

## Performance findings and candidates for later work

1. **Instruction and coordination cost remains large.** There were 118 bounded
   instruction reads: parent 39, author 29, first reviewer 29, second reviewer 21.
   Parent setup alone occupied nine minutes. Candidate: provide narrowly scoped
   prepared guidance and mechanical store/assignment setup; avoid rediscovering
   contracts or regenerating continuation commands. Prewarming remains deferred.
2. **Two context compactions interrupted progress.** The author's previous tool
   result was at 02:46:41.794Z; compaction was recorded at 02:50:12.289Z, a
   210.495-second interval. The parent's corresponding interval was
   03:44:33.244Z to 03:48:06.209Z, or 212.965 seconds. These nonoverlapping gaps
   total 7m03.460s. They bracket compaction activity; the logs do not isolate its
   computation from scheduling. Candidate: reduce repeated instructions and
   coordination context, and make saved receipts sufficient for continuation.
3. **Specialist reads still serialize.** Larger windows reduced page count, but
   each specialist's reads remained sequential. The repair spent 3m28s collecting
   affected records. Candidate: prepare independent read groups once and use
   supported parallel execution; keep the abandoned multi-read skill and staged
   input experiment deferred.
4. **One semantic defect required broad authoring.** The save/playback finding
   required 51 changes across two batches, with 3m05.898s of command generation.
   Candidate: investigate whether shared save/transport rules could be recorded
   once and mechanically reflected in dependent records, without losing explicit
   interaction behavior or asking agents to decode a more difficult format.
5. **Generation mistakes caused avoidable repair.** Accidental action identities,
   incorrect parent guidance about typed references, and reciprocal research
   links caused three structural cycles. Candidate: supply typed identifiers and
   update deterministic reciprocal bookkeeping mechanically. Keep semantic
   judgments with the specialists.
6. **A review fragment was regenerated.** Reviewer 2 submitted the same
   3,950-byte research input twice and received the same immutable handle. The
   second command stream took 28.540s. Its cause is not established; do not
   attribute the entire surrounding gap to duplication. Candidate: make already
   accepted part handles explicit and check them before resubmission.
7. **Post-review completion has measurable cost.** The last 7m23s include the
   parent's compaction, exact validation, preservation checks and report writing.
   Candidate: mechanically verify receipts/hashes and assemble completion records
   from saved evidence. The local service itself is not the dominant target.

The first comparison marker is not the end of reasoning. Likewise, compaction
intervals and pre-command gaps cannot distinguish private reasoning, prompt
processing, scheduling and transport. The retained observer can help with future
backend/approval questions, but was not needed to find the issues above.

## Decisions, questions and recovery

| Question or problem                                                      | Decision and result                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| How should the requested observer bypass work?                           | Make it opt-in for this runner; use normal Codex connectivity and retain runtime/MCP measurements. Keep the relay for later.                                                                                                         |
| Which data should be reused?                                             | Resume the prepared snapshot16/model7/UX4 workspace and immutable handles, then reuse every accepted contribution throughout repair. No live product promotion.                                                                      |
| How should a failed sandbox process start be handled?                    | Preserve its evidence, use a new attempt name with normal execution approval, and reuse preparation. The first EPERM occurred before a model start.                                                                                  |
| Should missing wire measurements be zero?                                | No. Mark them unavailable. Add per-command runtime details and distinguish resuming preparation from resuming an agent when checking input coverage.                                                                                 |
| What about an oversized instruction read?                                | Detect truncation and recover through the bounded reader; keep the recovery in the run history.                                                                                                                                      |
| How should accidental identities and bad reference guidance be repaired? | Retain saved work, restore intended identities, use validator-confirmed typed product/UX references and correct reciprocal research links. Same author throughout.                                                                   |
| What happens to named clip copies and library updates?                   | Copies are independent and video-owned; library updates affect future additions. Existing copies do not receive propagation.                                                                                                         |
| How should grouped trim and Ungroup behave?                              | Preserve group editing and trim restoration. Expose included parts; omit wholly excluded parts. Keep ambiguous composition unchanged with an explicit unavailable reason.                                                            |
| Can source research settle Alexa-specific track mapping?                 | No. Reuse and verify genuine primary evidence for interaction patterns, and retain product-specific limitations.                                                                                                                     |
| How should saving affect playback?                                       | Immediately before commit, stop preview at its current frame or pause playback at its current item/position. Success and failure retain position until explicit Play. Chooser cancellation before commit leaves transport unchanged. |
| Is a revise receipt a failure to retain?                                 | No. Preserve it, make focused corrections, persist revision 6, and obtain a fresh independent whole-product review.                                                                                                                  |
| Should the post-review quiet interval trigger a restart?                 | Inspect before intervening. The client resumed after context compaction; no restart or regenerated work was needed.                                                                                                                  |
| Are further model runs or broad engineering reviews needed?              | No. The requested full UX lifecycle passed. Verify saved evidence locally and checkpoint the report.                                                                                                                                 |

Six product questions remain explicit: cross-source playback; application close
during export; media repair; source ownership/moves; occupied-track settings
conflicts; and composition-preserving Ungroup. These are documented product
limitations, not unfinished steps of this replay. Passing qualitative review does
not establish usability, accessibility conformance or implementation feasibility.

## Evidence, usage and verification

The working copy is
`.codex-tmp/ux-full-native-20260929/progressive-full-prepared-20260929/workspace/`.
Its `product/Alexa/runs/ux-full-native-replay/completion.json` and `run-report.md`
contain decisions, questions, repairs and final artifact paths. Raw runtime and
service evidence is under
`.codex-tmp/ux-full-native-20260929/progressive-full-unobserved-live-20260929/`.
The original snapshot remains available for another isolated rerun.

Verified the final UX SHA-256 against the passing receipt, the exact source hash,
`ux-review.validate` result, complete returned-page bytes, terminal exit code,
and all 611 protected live-file hashes again after completion. Node/Python syntax,
formatting and diff checks cover the small harness/analysis changes. No additional
paid model trial or broad review was needed; fault/stress testing was not expanded.

Recorded response usage totals are **45,918,015 input tokens**, including
**44,173,056 cached input tokens**, and **166,233 output tokens**, including
**43,961 reasoning-output tokens**. These sum repeated context across actors and
include recorded compaction responses; they are not unique document sizes or a
billing calculation. The parent's final-turn counter has a different scope and
is retained separately in control metadata. Auxiliary automatic review traffic
was not measured without the observer.

Checkpoint `6d152b8` makes request observation optional. The adviser recommended
**Record progressive full UX rerun** for the completion evidence under the owner's
standing preapproval; its exact identity is recorded in Git. Nothing is pushed.
No UX-stage replay work remains; UI, comps, publication and live promotion were
outside this run.
