# Progressive author–reviewer wireframe trial

The trial **completed and accepted timeline wireframe revision 7**. The reviewer sent findings directly to the live author as each was confirmed, rather than waiting for a complete review. All seven first-draft findings were sent and the author marked work started on each **before** the first diagnostic closed. The author submitted a self-audited revision 6, the ordinary review found one new blocker, and revision 7 passed independent review with zero findings. [Machine-readable event timings](wireframe-ui-progressive-review-20261001-metrics.json).

This was an isolated wireframe experiment. It used the same saved source packet and fixture as the preceding Astra trial (SHA-256 `1b718b78959edcb04d4c34c986cb3b996745cbbad40402b2ab2f33b845edd677` and `4ef83f66a0fa081ec787a675b701b08e7a231c7cbc9f87bd85c279c610e508a2`, respectively). The fresh author and reviewer both used `gpt-6-astra` at `ultra` effort. The live Alexa product and canonical workflow were untouched. No separate model client, local model proxy, or direct backend call was used. The ignored [attempt folder](../../.codex-tmp/wireframe-ui-progressive-review-20261001) preserves drafts, screenshots, audits, streamed findings, event log, and exact review receipts.

## What happened

The author independently extracted **32** source-linked checks and froze its first complete draft, revision 4, with eight scenes. Its full audit found **17** needs-repair items. Meanwhile the reviewer inspected that immutable revision and sent **seven blocking findings** individually. Most overlapped the author's checks, but the staged-trim finding explicitly covered competing commands that the author's initial trim/Undo check did not fully cover. The author received and acted on that finding before the diagnostic was complete, avoiding the specific missed-command-boundary problem seen in the prior sealed-feedback trial.

Revision 5 expanded to 37 checks and still had eight internal corrections. Revision 6 passed all 37 author checks and addressed all seven streamed findings. The ordinary reviewer confirmed those seven resolutions but found a new numeric inconsistency: two composed-content strips extended beyond their stated video durations. The finding was sent immediately. The author changed only those two strip endpoints, captured and inspected the affected scenes, added a source-linked check, and submitted revision 7 with **38 verified checks, zero unresolved**. The same reviewer confirmed the exact revision 7 fix and passed it. The store reports revision 7 accepted; upstream UX and runtime behavior were outside this check.

## Timing, in execution order

| Sequential critical-path interval                         |    Elapsed |
| --------------------------------------------------------- | ---------: |
| Checklist start → frozen first draft                      |      8m18s |
| Frozen draft → first self-audited submission (revision 6) |     15m31s |
| Revision 6 submission → ordinary `revise` receipt         |      3m53s |
| `Revise` receipt → revision 7 submission                  |      2m24s |
| Revision 7 submission → independent pass                  |      1m29s |
| **Checklist start → accepted pass**                       | **31m35s** |

Within the 15m31s draft-to-submission interval, the initial reviewer was active for **10m03s** in parallel with author audit and repairs; it must not be added to the table. Its first finding was sent at 18:52:13 UTC, **7m47s before** the diagnostic saved at 19:00:00. The author marked action on that finding at 18:55:02, **4m59s before** diagnostic completion. All seven first-draft findings were sent and action-marked before completion. The record-to-send intervals were 17–26 seconds; send-to-author-action markers ranged from about 2 seconds to 2m48s, depending on when the author reached a message boundary. These intervals include model/tool-call generation and author activity; they are not pure message-transport latency.

The prior sealed-feedback Astra trial took **42m45s** from checklist start to accepted pass, versus **31m35s** here, an observed **11m10s shorter** wall-clock interval. That is **not an isolated speedup estimate**. These were fresh nondeterministic drafts: this first draft had 32 checks and seven reviewer blockers, while the prior one had 25 checks and two blockers plus one lower-severity finding. The prior run also spent 2m56s on post-verdict adjudication. Its first draft took 10m31s versus 8m18s here. The current reviewer used a parallel numeric-check helper; the first diagnostic and the ordinary reviews also differed in scope and duration. One pair of runs cannot attribute the full elapsed difference to streaming.

## Interpretation and follow-up

Direct progressive communication **worked**: the reviewer continued checking while the author repaired, with immutable revision binding and a saved finding ledger. It did not make review failures vanish: one new defect escaped the author's clean revision-6 audit and required a repair loop. The strongest supported benefit is that the author could address a reviewer-only command-boundary issue before the first review finished; the time saved by that specific overlap cannot be separated from this run's different authoring work.

The reviewer saw a shared checklist file after the author had written audit notes to it. It ignored those notes and reviewed the frozen draft and source independently, but strict reviewer blinding was lost. A repeat comparison should freeze the checklist with the draft. The trial also lacked pure reasoning-token measurements; all durations are wall-clock intervals including model generation, tool work, scheduling, and inspection. The experiment did not proceed to UI comps or a full refine-design run.
