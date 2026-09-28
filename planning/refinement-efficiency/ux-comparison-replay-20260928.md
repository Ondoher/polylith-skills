# Isolated UX comparison replay — 2026-09-28

A prepared UX agent produced a useful compact change plan in **2m43s**. It marked its decisions ready after **1m27s of the explicitly opened comparison phase**, then took **1m05s to write and submit 7,670 bytes**. Preparation was measured separately at **6m51s**. This narrows the timing uncertainty; it does not establish the cost of equivalent full UX authoring or pure reasoning.

This follows the [full Alexa refinement](alexa-mcp-refinement-20260928.md). The experiment stops at a change plan: no UX persistence, review cycle, UI work or product publication. All 612 protected live files still match their starting hashes; no extra files appeared under the live product directory.

## What ran

1. Copy the original model-7 facts packet and prior UX revision 4 into an isolated local directory. Verify exact hashes; compact JSON whitespace losslessly for reading. Withhold the original completed answer and subsequent product state.
2. Start a fresh `ux-planner` agent with no inherited conversation, using its configured `gpt-6-astra` model and `ultra` effort. Load role guidance and both inputs using a prepared bounded reader. Stop at READY.
3. Send a separate comparison instruction. Mark comparison start, then mark decisions ready before generating the plan. Request only affected references, meaningful decisions and unresolved questions, targeting 800 words with a 16KB cap.
4. Write the plan once into an assigned scratch directory. A prepared helper checks its minimal shape and submits it with a hash, byte count and delivery timestamp.
5. Inspect the plan against source facts and reference inventories, extract runtime metadata, and verify live data remains untouched.

The comparison required four tool calls: start marker, decisions-ready marker, file write, submission. There were no additional product reads during that turn and no retries or repairs. The plan contains seven change groups and four questions, with 701 whitespace-delimited words across its JSON representation.

## Measured phases

| Phase                             |      Elapsed | Boundary                                                      |
| --------------------------------- | -----------: | ------------------------------------------------------------- |
| Preparation: instructions         |      63.733s | Preparation task start → instructions-ready                   |
| Preparation: load inputs          |     318.223s | Instructions-ready → inputs-ready                             |
| Preparation: READY response       |      28.881s | Inputs-ready → first task completion                          |
| **Preparation total**             | **410.837s** | First agent turn                                              |
| Parent hold between turns         |     180.398s | READY completion → next task start; excluded from active work |
| Receive assignment and mark start |      11.054s | Comparison task start → comparison-start                      |
| Compare and formulate decisions   |      86.759s | Comparison-start → decision-ready                             |
| Write and submit plan             |      64.931s | Decision-ready → plan-delivered                               |
| **Comparison through delivery**   | **162.744s** | Second task start → plan-delivered                            |
| Final acknowledgement             |       5.437s | Delivery → second task completion                             |

Preparation plus comparison through delivery totals **9m33.581s**, excluding the parent hold, experiment setup, diagnostics and report/checkpoint work. The parent recorded its follow-up intent before an intervening context compaction; that intent timestamp is not the dispatch boundary. The agent task-start event is used above. No claim is made that the three-minute hold was communication latency.

The reader delivered 67 pages containing 514,430 bytes of compact input, or 542,587 bytes including page framing. Its measured local read work totaled **556.13ms**. This excludes process startup, tool round trips and model processing. Preparation used 80 outer tool calls in total, including instructions and markers; a paginated tool loop can dominate elapsed time even when local file access is fast.

## Client-observed runtime breakdown

| Window                             | Output-item streams | Reasoning-item streams | Tool intervals | Unattributed |    Total |
| ---------------------------------- | ------------------: | ---------------------: | -------------: | -----------: | -------: |
| Preparation                        |            177.704s |                18.058s |        47.255s |     167.820s | 410.837s |
| Comparison before decisions-ready  |              3.384s |                77.275s |         0.590s |       5.510s |  86.759s |
| Decisions-ready through delivery   |             49.326s |                 7.676s |         0.890s |       7.039s |  64.931s |
| Entire comparison through delivery |             55.351s |                84.951s |         2.027s |      20.415s | 162.744s |

The last row contains the two comparison subwindows plus assignment handling; do not add them. Tools crossing a marker are clipped to that window. The actual file-write tool call took **0.295s**; submission took **0.590s** through its returned result. These are client-observed tool intervals, not isolated disk or network latency. The 49.326s output-stream measurement includes writing the command containing the plan and other tool-call text; it is not 49 seconds spent transferring an already completed file.

There were 162.454s of observed tool-result-to-next-item gaps during preparation. Those gaps are included in the runtime accounting, not extra time. Prompt processing, scheduling and transport cannot be individually measured from these logs.

| Completed-response usage                 | Input tokens | Cached input subset | Output tokens | Reasoning output subset |
| ---------------------------------------- | -----------: | ------------------: | ------------: | ----------------------: |
| Preparation turn                         |    8,102,658 |           7,749,888 |         6,265 |                     542 |
| Comparison through final acknowledgement |      898,323 |             892,032 |         4,725 |                   2,816 |

Input counts accumulate repeated context across responses; they are not unique source size. Cached input is part of input, and reasoning output is part of output. These are reported usage counters, not a measured monetary cost. Narrow-window counters and individual call/gap measurements are retained in the metrics file.

## Bounded quality check

The plan covers independent video-owned clip copies, grouped editing and reversible trim, explicit Ungroup, future-additions-only library updates, and removal of obsolete follower/collision behavior. It preserves stable existing identities and unaffected behavior. It identifies overlapping-part placement and crop/audio preservation as unresolved instead of promising unsupported behavior. It also flags composed-edge trim bounds and research needs.

All existing UX and product source references resolve. Four `new:` references are explicit proposed additions, not broken existing links. Source requirements were checked directly, including grouped assembly editing, persistence, trim and library updates. This is a usable comparison plan, **not a complete replacement UX artifact or an independent acceptance review**. Detailed operation contracts, exhaustive impact coverage, research and downstream materialization remain outside this experiment.

## Interpretation and limits

- The gated comparison and output together still exceed the one-minute target before any full artifact construction or review. Preparation also remains expensive with full input loading.
- This does not prove how much of the original 15m50s was bookkeeping. That run included full authoring and used different input selection and delivery. Subtracting these timings would not yield a valid savings estimate.
- Loading inputs can already involve implicit comparison. The 86.759s window is the explicitly requested comparison phase, not a measure of all thinking required to reach the decisions. Conversely, reasoning continued after the decisions-ready marker.
- Stream classifications reveal where the client observed activity; they do not expose provider compute time or separate semantic reasoning from planning an output representation.
- The next candidates are smaller relevant input selections, fewer serial read round trips, and mechanical application of compact decisions to existing records. None was implemented here, and their benefit still needs measurement with a comparable task.

## Saved evidence

- [Metrics](ux-comparison-replay-20260928-metrics.json): phase boundaries, per-call timings and sizes, page coverage, usage, hashes and live-data checks.
- [Delivered plan](ux-comparison-replay-20260928-plan.json), with repository formatting only; original bytes remain in scratch.
- Local isolated inputs, helper, full metadata extracts and collection script: `.codex-tmp/ux-comparison-replay-20260928-160822/` (ignored scratch). The metrics identify these paths and hashes. No raw model reasoning or tool argument text is included in the committed runtime evidence.
