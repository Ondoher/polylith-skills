# Astra/ultra author self-review trial

Status: the fresh timeline wireframe **passed independent review at revision 7**, after a missed blocker was recovered by cross-checking the first-draft diagnostic against the later blinded pass. [Machine-readable timings](wireframe-ui-astra-self-review-20261001-metrics.json).

The author and both reviewers used `gpt-6-astra` at `ultra` effort. The author began with the saved source packet and an empty draft, extracted its own checklist, built the initial wireframe, and then performed full self-review. This was a new attempt, not a replay of the Sol author's revision 2. The source packet file hash matches the previous trial (`1b718b78959edcb04d4c34c986cb3b996745cbbad40402b2ab2f33b845edd677`). The live product and canonical workflow were untouched. No separate model client, endpoint call or model proxy was used.

## Outcome and the missed review issue

The frozen first complete draft was revision 3: 9 scenes, 3 inspected pages and 25 source-linked checklist items. A parallel independent diagnostic found **2 blocking and 1 nonblocking** issues. The same author, blind to that diagnostic, marked **7 items needing repair** on its own first full audit. Both checks identified an absent concrete invalid-trim state and ambiguous dual focus. The diagnostic alone identified a separate blocker: while a trim candidate was pending, Save Video and other competing commands remained enabled without showing whether they applied, canceled or bypassed the candidate.

The author repaired its seven findings, audited every item on each revision, and submitted revision 5 with **25 verified, 0 unresolved**. A fresh blinded reviewer initially passed it with zero findings. A post-verdict comparison showed the diagnostic's pending-trim blocker still present in revision 5. The reviewer rechecked that exact issue, acknowledged its initial pass was wrong, and classified it as blocking. The original pass is archived unchanged in the private attempt; the current revision 5 review receipt was corrected to `revise` so it cannot release UI.

The author then added one source-linked checklist item for the missed command boundary. Revision 6 disabled competing controls while trim was pending, but the full re-audit caught a stale keyboard hint that still implied a selection-command bypass. Revision 7 corrected that hint, passed all **26** checklist items, and passed focused independent re-review with zero findings. The accepted revision has 13 scenes and 4 inspected capture pages. Its exact artifact binding is `53a933582f3da63e3e1ec74afb1e12da480b95ae71dc3ad36380ea9c68d197be`.

## Timing in execution order

| Sequential critical-path phase                                      |                                        Elapsed |
| ------------------------------------------------------------------- | ---------------------------------------------: |
| Extract and save initial checklist                                  |                                          3m24s |
| Build initial wireframe                                             |                                          4m48s |
| First capture, inspection and visible render corrections            |                                          2m17s |
| **Checklist start to frozen first draft**                           |                                     **10m31s** |
| Self-review, two internal repairs and submission of revision 5      |                  10m50s from self-review start |
| Revision 5 submission to original blinded review receipt            |   5m11s, including reviewer assignment/startup |
| Post-verdict comparison and corrected `revise` receipt              | 2m56s after original pass; experiment overhead |
| Reviewer-directed repairs, full re-audits and revision 7 submission |                        8m26s from repair start |
| Revision 7 submission to final pass receipt                         |   2m30s, including reviewer assignment/startup |
| **Checklist start to final accepted review**                        |                                     **42m45s** |

The first-draft diagnostic took **8m16s of reviewer activity** but ran concurrently with the author self-review and repairs; it must not be added to the elapsed column. The ordinary revision 5 reviewer was active for **3m42s** and the focused revision 7 re-review for **1m48s**. The six explicit local captures consumed **43.925s** of tool time in total. Seven contribution calls carried **578,369 input bytes**; local store operations were small beside model work. The revision 7 full audit included context compaction and repeated image inspection after truncation, so its duration is not a clean estimate of ordinary audit cost. These are wall-clock intervals, not pure reasoning or token measurements.

The earlier Sol/medium self-audit attempt needed two ordinary review rejections before its third review passed; this Astra/ultra attempt required one corrected rejection and a second ordinary review. The first Astra draft also had fewer diagnostic findings, but it was a different nondeterministically generated draft and checklist. From checklist start to accepted review this run took **42m45s**; the earlier report measured **28m10s from first saved requirements**, excluding its checklist extraction. Those start points and artifacts differ, and the post-verdict adjudication here added experiment time. This single trial therefore does **not** establish a model-driven speedup or a reliable lower failure rate. It does show that matching the author's reasoning setting to the reviewer's did not eliminate the need for independent review: one consequential interaction boundary survived the internal audit and an initial external pass.

The private [attempt folder](../../.codex-tmp/wireframe-ui-astra-self-review-20261001) retains the frozen first draft, all revisions, captures, checklist audits, original blinded pass, posthoc adjudication, corrected rejection and final accepted receipt. The store reports exact revision 7 accepted. Static acceptance does not approve the upstream UX or verify runtime interaction behavior.
