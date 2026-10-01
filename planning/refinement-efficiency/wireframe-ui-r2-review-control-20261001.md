# Reviewer-led continuation from the first complete timeline wireframe

Status: complete. The reviewer-led branch reached an independent **pass with
zero findings** at revision 5. It used the same frozen revision 2 draft as the
[self-audit trial](wireframe-ui-self-audit-execution.md), with no checklist or
full-list author audit. [Machine-readable measurements](wireframe-ui-r2-review-control-20261001-metrics.json).

## What was held constant

The control's revision 2 artifact and screenshot were replayed from the saved
first draft and verified **byte-identical** to the self-audit branch: artifact
file SHA-256 `4bb2df24e639a3a7268a1b377c5a820a0dcf699d8602ebf0f8b3b29855965a25`;
capture SHA-256 `6345e3c79dc43c870845b58a3e92a882cc3703f37208e4fc88ee94e3b8d36c8f`.
The source packet file hash was
`1b718b78959edcb04d4c34c986cb3b996745cbbad40402b2ab2f33b845edd677`
in both attempts. Both used the same renderer and source acceptance packet,
wireframe author model/effort (`gpt-6-sol`, medium), and reviewer model/effort
(`gpt-6-astra`, ultra). The control's store had `selfAudit: false`; it produced
no checklist or audit receipt. An author did only the visual inspection needed
to submit each rendered revision. The reviewer remained external to the author.

The agents were **fresh instances**, not copies of the treatment agents at the
frozen barrier. Reviewers were instructed to judge the changed timeline
interface, including its recovery and focus context, without treating unchanged
surrounding workspace commands as missing requirements. The control reviewer
did not inspect the treatment, checklist, earlier diagnostic or later treatment
revisions. The control author loaded the source/renderer contract while first
review ran, then received only the exact control draft and reviewer findings.

## Results in execution order

Reviewer-led control, starting when the byte-identical revision 2 was submitted:

1. Review revision 2: **6m03.526s**, revise with **8 blocking findings**.
2. Repair and submit revision 4: **4m35.061s**. This includes a targeted visual
   correction to the intermediate revision 3; no full self-audit ran.
3. Review revision 4: **3m38.967s**, revise with **4 blocking findings**. Three
   were inconsistencies introduced by the first repair; the other was trim
   guidance that incorrectly ruled out inward trimming.
4. Repair and submit revision 5: **1m32.686s**.
5. Review revision 5: **2m16.788s**, **pass with zero findings**.

Self-audit treatment, starting when the same revision 2 was frozen:

1. Full-list audits and author repairs through submitted revision 4:
   **9m36.695s**. The 20-item audit went from 10 needing repair at revision 2,
   to 5 at revision 3, to zero at revision 4.
2. Review revision 4: **7m22.907s**, revise with **2 blocking and 1
   nonblocking finding**.
3. Repair and submit revision 5: **3m01.329s**, including another clean audit.
4. Review revision 5: **2m49.980s**, revise with **1 blocking and 1
   nonblocking finding**. The blocker was introduced by the repair.
5. Repair and submit revision 6: **1m54.181s**, including a fifth full-list
   audit.
6. Review revision 6: **1m47.152s**, **pass with zero findings**.

| From the shared revision 2 starting point | Reviewer-led control | Self-audit treatment |
| ----------------------------------------- | -------------------: | -------------------: |
| Elapsed to zero-finding independent pass  |       **18m07.028s** |       **26m32.244s** |
| Independent review windows, total         |           11m59.281s |           12m00.039s |
| Author and coordination windows, total    |            6m07.747s |           14m32.205s |
| Ordinary review rounds                    |                    3 |                    3 |
| Full-list author audits                   |                    0 |                    5 |

The control was **8m25.216s faster**, about **31.7%** of the treatment's
post-draft elapsed time. The measured review windows were almost equal; nearly
all of the difference appears in author and coordination windows. Those windows
include generating contributions, waiting between actions, visual inspection,
capture and data-store calls. They do **not** isolate reasoning time. Local
capture operations were seconds, so they do not explain the several-minute
difference by themselves.

The author self-audit did improve the state of the artifact _before its first
ordinary review_: that review reported two blocking findings, compared with
eight on the unchanged draft in the reviewer-led control. Yet both branches
needed three ordinary reviews for acceptance. The control's first review
identified issues that the self-audit branch had to find internally, while
both branches made repair regressions that a subsequent external review caught.

## Interpretation and limits

This is one paired-draft comparison, not a measured failure rate or a general
speedup. Author and reviewer instances varied, and their judgment is
nondeterministic. The separate diagnostic reviewer on the original revision 2
reported seven blocking and two nonblocking findings, including one broad
scope-overreach finding; the scope-correct control reviewer reported eight
blocking findings. That variation is itself a reason to compare outcomes and
source obligations, not just raw counts.

The treatment's parallel diagnostic review was experiment overhead. It was not
part of the intended production self-audit path, but its effect on shared model
resources cannot be isolated. The control author's source preparation overlapped
the first review; the treatment author was already active at the frozen-draft
boundary. Checklist extraction and draft construction before revision 2, and
control replay/setup before its revision 2 submission, are excluded from these
windows. Excluding checklist extraction understates the treatment's full
end-to-end cost. No in-session token usage or pure model reasoning time was
available. Final independent passes establish static wireframe acceptance for
the changed timeline behavior; they do not verify runtime behavior or approve
the upstream UX.

For this case, the reviewer-led loop reached the same review-round count and
zero-finding outcome sooner. That reinforces the decision not to roll out the
current self-audit protocol. It does not imply that reviewers always outperform
author checks: a narrower automated preflight for linked time values,
selection-enabled states and explicit cancellation paths could be tested
separately. The two isolated attempts and all revision artifacts remain under
`.codex-tmp/`; no live product data was changed, and no separate model client,
proxy or redirect was used.
