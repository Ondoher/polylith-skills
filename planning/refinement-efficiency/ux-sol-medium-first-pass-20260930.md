# Sol medium: first UX pass

Status: complete. Sol/medium reached the first materialized proposal in
**20m15.839s**, versus **23m34.183s** for Astra/ultra: **3m18.344s faster (14.0%)**.
The first candidate was structurally ready with no diagnostics. Five units changed
and eleven were reused. There was exactly one `units.finish`, no repair round,
assembly, canonical persistence, UX reviewer, UI work or publication.

[Detailed metrics](ux-sol-medium-first-pass-20260930-metrics.json) retain the
first-pass comparison, phase markers, per-command timings, usage, service calls,
input verification, role configuration and evidence hashes.

## Conditions

- UX planner: `gpt-6-sol`, `medium`; repository and installed role agree.
- UX reviewer remains `gpt-6-astra`, `ultra` and is not dispatched.
- Runtime confirms coordinator `gpt-6-astra`/`xhigh` and author
  `gpt-6-sol`/`medium`. Coordinator settings match the preceding run.
- Same saved snapshot16/model7/UX4 baseline, freshly copied into an isolated
  workspace; 421 copied files and 514,426 input bytes across 19 verified pages.
- Progressive contributions, the existing 28,000-byte page window and parallel
  read guidance remain in place. Both models receive the same native tool
  transport settings through a per-launch catalog.
- Normal Codex model connection. The local model-request redirect/observer is
  disabled; the localhost MCP data service supplies records and records timings.
- All 611 protected live Alexa files and all 421 copied baseline files remained
  byte-identical. No previous completed answer was given to the author.

## Comparison boundary

Both author intervals run from specialist creation through the first
`units.finish` tool result. The comparison uses that same boundary in
[the preceding Astra run](full-ux-rerun-20260929.md), excluding its structural
repairs and subsequent review lifecycle.

| Interval or measurement                                |    Astra/ultra |     Sol/medium |
| ------------------------------------------------------ | -------------: | -------------: |
| Coordinator setup before author creation               |      9m00.784s |      9m03.609s |
| Author instructions and contract discovery             |      5m52.836s |      7m28.128s |
| Author input collection                                |      2m41.689s |      2m47.306s |
| After inputs ready through first materialization       |     14m59.658s |     10m00.405s |
| **Author creation through first materialization**      | **23m34.183s** | **20m15.839s** |
| Client launch through first materialization            |     32m34.967s |     29m19.448s |
| Contribution-command generation, a subset of authoring |      5m49.101s |      5m52.917s |
| Contribution calls / generated command bytes           |     4 / 55,912 |     5 / 34,623 |
| Maximum outstanding native reads                       |              1 |              4 |
| Author instruction-reader calls before first finish    |             29 |             23 |

The instruction, input and after-input rows partition the author interval.
Contribution-command generation is included in that interval, not added to it.
These measurements include generation, tool handling and waiting; none is pure
semantic reasoning time.

The complete new client session lasted **34m02.716s**, including **4m43.267s**
after the first proposal result for author handoff, coordinator reporting and
preservation checks. Mechanical baseline preparation took **2.276s** before
client launch. Supervisor setup edits, the initial approval rejection, analysis
and checkpoint work are outside that client interval. The previous 1h26m49s
full review/repair run is not a comparable endpoint.

## What improved, and what did not

After-input work was **33.3% shorter**, but instruction loading was **1m35s
longer**. Contribution commands contained **38.1% fewer bytes** yet took **1.1%
longer** to generate. This sample does not show a command-generation speed gain
from selecting Sol/medium.

The preceding Astra author also encountered a **210.495-second interval
bracketing context compaction** before its first result. Sol had no recorded
compaction in its first pass. That interval is slightly larger than the total
198.344-second saving. It includes unclassified time, so subtracting it would
not produce a controlled model comparison; it does show why attributing the
whole saving to lower reasoning effort would be unwarranted.

Sol reached four simultaneous native reads and retrieved the same 19 pages
exactly once, with byte-exact coverage. Collection still took about six seconds
longer. Model generation and surrounding client activity can outweigh local
read concurrency.

All **78 local MCP service calls totaled 1.172 seconds** of internal execution,
including supervisor setup. Those times exclude model generation and client
handling. The first pass saved five contribution batches and called finish once;
logs contain no assembly, canonical persistence or review operations.

For author responses completed by the first-finish cutoff, recorded output tokens
fell from **35,786 to 21,096**, and reasoning-output tokens from **4,023 to
2,763**. These counters exclude usage finalized after the cutoff, are not a
reasoning-time measure, and do not establish a monetary saving. Detailed metrics
retain input/cache counts, which count repeated context across responses.

One run changes both model and effort; it cannot isolate their individual effects
or establish quality equivalence. Generated decisions and output volumes differ.
Structural readiness is narrower than UX correctness; qualitative review was
intentionally excluded. This is a modest observed speed improvement, not evidence
of a general 14% model advantage.

## Decisions and progress

- The owner's successive clarifications narrowed the test to initial delivery
  only. The first-round assignment explicitly prohibits repair and review.
- Changing the repository planner file also updated its installed link; no
  installation or editor restart was needed for this fresh CLI run.
- The catalog launcher previously configured only the coordinator's model. The
  runner now prepares the configured specialist models too, preserving native
  tool exposure when a specialist uses a different model.
- Automatic approval initially rejected the launch as an external data transfer.
  Inspection confirmed the normal Codex route with no custom observer or endpoint
  override. After the owner reiterated that policy, the same bounded launch was
  approved. No alternate execution route bypassed the rejection.
- The default connection policy is now recorded in repository `AGENTS.md`.
- Supporting planner prose still mandated Astra/ultra. The explicit owner
  selection governed this test, as confirmed in runtime. Afterward, that prose
  was corrected to use the installed model/effort unless the owner overrides it.
- The coordinator initially truncated a direct instruction read, then recovered
  using the bounded reader. The recovery remains included in setup timing.
- A local catalog comparison encountered an automatic cache-refresh timestamp
  change. Verification excluded only that timestamp and confirmed that model
  entries differed only in the intended native transport flags.
- The first result was structurally ready, so no diagnostics needed action.
  The user prohibited further processing; no independent quality claim is made.

## Verification and retained result

The three existing native-workflow tests passed. Node syntax, formatting and
diff checks cover the small runner changes. Verified the installed role matches
the source, the effective author model/effort, first-pass-only operation counts,
all returned input pages, the finish receipt, terminal exit status, all protected
live hashes and every original copied baseline file. No additional paid trial,
negative-test expansion or UX review was performed.

Changed authoring units are `context:document`, `element:video-workspace`,
`flow:edit-video`, `flow:save-clip` and `flow:update-clip`. Decisions cover
independent inserted clip copies, grouped assemblies, trimming with restoration,
contextual Ungroup and library updates applying to future additions. Product
questions about expansion settings, media repair, source ownership, export on
close and cross-source playback remain explicit in the saved proposal.

Private evidence is retained under
`.codex-tmp/ux-full-native-20260929/sol-medium-first-pass-20260930/`.
The active run lasted from 2026-09-30T13:21:46.604Z to 13:55:49.311Z.
The workspace's `product/Alexa/runs/ux-full-native-replay/completion.json`,
`run-report.md` and `RUN-STATE.json` preserve the result and saved handles.
`compare-first-pass.py` in the private evidence directory reproduces the public
comparison from retained runtime metrics. The baseline remains available for
another authorized experiment. No work remains within this first-pass test.

The checkpoint adviser recommended this unit with the preapproved local commit
message `Set UX planner default to Sol medium`. This report and its metrics are
included in that checkpoint; nothing is pushed or published.
