# UX input size and reasoning: first matched result

Completed 2026-09-29. The focused input produced a correct decision using **33.8%
fewer reported reasoning tokens** and **25.2% less time after input delivery** in
this single matched pair. This supports further investigation of selecting less
surrounding context; it does not establish a repeatable saving or scaling rule.

The [plan](ux-input-reasoning-test-plan.md) is complete through both first saved
answers and analysis. There was no additional pair, answer repair, UX review, UI
work or full refinement run. Both isolated runs preserved all 611 protected live
Alexa files. [Detailed metrics](ux-input-reasoning-metrics.json) retain the frozen
rubric, input hashes, usage counters, timing boundaries and evidence hashes.

## Matched question and input

Both authors decided what Update Named Clip changes when one associated occurrence
has changed temporal boundaries and local settings, while other videos contain
copies. Both had to reconcile current requirements with conflicting prior UX and
specify eligibility, confirmation, preservation, recovery and success feedback.

The focused packet contains complete current update/persistence requirements and
their source claims, the prior update actions/dialog/question, and the superseded
collision gap. The broad packet contains those exact records first, in the same
format and order, followed by adjacent editor, selection and Save Clip context.
The focused packet is a mechanically verified exact subset. These are bounded
packets, not the whole product.

Each fresh author used the unchanged UX role, `gpt-6-astra`, configured `ultra`
effort and observed wire setting `xhigh`. Role and operation-contract hashes match.
Each received one complete native MCP input result and saved one short structured
answer. Exact delivered hashes match the frozen input files; no pagination,
truncation, extra product read, failed call or repair occurred. The authors could
access only their input handle and `result.store`; the scoring rubric remained
private to the parent.

## Primary result

Measurement starts at the actual client-visible input tool result and ends at the
client receipt confirming the saved answer. Each window contains exactly one model
response and one answer-store call. Usage is counted by unique response identity,
including the answer-producing response; neither counter straddles this window.

| Measure                                | Broad context | Focused context |        Difference |
| -------------------------------------- | ------------: | --------------: | ----------------: |
| Product input bytes                    |        26,392 |          13,013 |       50.7% fewer |
| Product input records                  |            24 |              10 |          14 fewer |
| Product input reads                    |             1 |               1 |           Matched |
| Reported reasoning-output tokens       |         1,284 |             850 |   **33.8% fewer** |
| Input receipt to saved-answer receipt  |      60.084 s |        44.953 s | **25.2% shorter** |
| All output tokens, including reasoning |         1,901 |           1,421 |         480 fewer |
| Output tokens excluding reasoning      |           617 |             571 |          46 fewer |
| Answer prose words                     |           301 |             293 |           8 fewer |
| Saved answer bytes                     |         2,624 |           2,504 |         120 fewer |
| Correctness criteria met               |           8/8 |             8/8 |           Matched |

The focused answer was only slightly shorter. Both correctly preserve the library
clip identity, update only Start/End, leave all existing occurrences unchanged,
explain future-only effects, and remove obsolete propagation/collision behavior.
Both preserve cancellation/failure context and identify successful updates without
leaving the editor. Neither reported an essential missing dependency.

The broad answer additionally elaborated commit-time control freezing, stopped
editor recovery and preserving Save Clip behavior from its extra context. That is
an observed difference in scope of detail, not proof of what caused the token
difference. Quality was checked by the parent against the frozen rubric; this was
not an independent usability or full UX review.

## Timing and usage detail

| Observed interval within the decision window |    Broad |  Focused |
| -------------------------------------------- | -------: | -------: |
| Reasoning-item output streams                | 38.604 s | 25.689 s |
| Command/output streams                       | 18.387 s | 16.927 s |
| Tool execution/result interval               |  0.091 s |  0.201 s |
| Unattributed gaps                            |  3.002 s |  2.137 s |

These are client-observed intervals. Reasoning-item streams are not a measurement
of pure comprehension, and unobserved provider processing is not separately
identified. The server's combined execution time for all four assigned operations
(catalog, setup marker, input read and answer save) was 6.44 ms broad and 6.61 ms
focused. Tool processing remains a small part of these runs.

| Separate overhead / total                  |     Broad |   Focused |
| ------------------------------------------ | --------: | --------: |
| Local harness preparation                  |   3.702 s |   2.752 s |
| Author startup through input receipt       |  94.182 s |  91.832 s |
| Acknowledgement after saved-answer receipt |   4.540 s |   3.524 s |
| Entire author window                       | 158.806 s | 140.309 s |

The author total includes startup, the decision window and acknowledgement; do not
add it to those components. Harness preparation is separate. These figures do not
measure this entire development session or a full refine-design request.

| Usage for the single decision response |  Broad | Focused |
| -------------------------------------- | -----: | ------: |
| Whole-request input tokens             | 45,319 |  41,483 |
| Cached input tokens (subset of input)  | 38,912 |  38,144 |
| Uncached input tokens                  |  6,407 |   3,339 |

Halving the product packet reduced whole-request input tokens by only 8.5%, because
generic instructions and earlier tool context remain. These are actual runtime
counters, not isolated packet token counts or credit estimates. Whole-author usage
is also saved in the metrics, separately from the primary decision response.

## Questions and decisions during execution

| Question                                                          | Decision and reason                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which task gives a real but bounded decision?                     | Use current Update Named Clip requirements against conflicting prior UX. This tests reconciliation and confirmation design without full proposal construction.                                                                |
| How much broad context fits the existing return window?           | An initial local candidate was 30,384 bytes. Remove adjacent four-track and precision-selection records before freezing, producing 26,392 bytes. Keep the 28,000-byte limit unchanged. No author saw the discarded candidate. |
| Can the focused input omit relevant conflicts?                    | No. Keep old propagation/collision behavior, current persistence/update requirements, claims and superseded gap in both. Only adjacent context differs.                                                                       |
| Should a new agent, transport or production schema be introduced? | No. Extend the existing isolated replay harness with a bounded-assessment mode and reuse native MCP, guards and observers.                                                                                                    |
| How should preparation be separated from input use?               | Load generic instructions before the input read, then start at the actual input-result timestamp. Do not use a later model-authored readiness marker.                                                                         |
| Should the full UX role be changed?                               | No. Its existing bounded-assessment mode accepts narrow questions. Both conditions receive the unchanged role and the same short output contract.                                                                             |
| What if the answer needs more context?                            | Preserve an unresolved entry in the first answer; do not add a hidden retrieval or repair. Neither author needed one.                                                                                                         |
| Should promising results trigger another paid pair?               | No. Stop at the authorized pair and report it. Order, caching, provider and sampling variation remain unresolved.                                                                                                             |

## Verification and retained evidence

Local checks passed for exact source projections and subset inclusion, both real
MCP assignment/read/store paths, the original preparation-only harness path,
JavaScript/Python syntax, formatting and client-visible byte reconstruction.
Both actual runs delivered one valid first answer within the same length/schema
contract, with valid supplied references. Product guards passed before and after.
Checks target successful execution; no broad negative-test or reviewer sweep was
added. The checkpoint adviser assesses the completed evidence unit under the
owner's preapproved commit-message policy.

- Frozen inputs/rubric: `.codex-tmp/ux-decision-test/inputs-02/`.
- Broad run: `.codex-tmp/incremental-ux-replay/decision-broad-live-01/`.
- Focused run: `.codex-tmp/incremental-ux-replay/decision-focused-live-01/`.
- Reproduction commands: [experiment README](experiments/incremental-ux-replay/README.md).
- Public evidence: [metrics](ux-input-reasoning-metrics.json).

Raw source data, answers, prompts, capabilities and logs remain in ignored scratch.
No production context-selection rule has been enabled by this experiment. One pair
on a decision with explicit requirements cannot establish gains for open-ended
design, larger products, or repeated updates. A later replication could test that
without changing the present result.
