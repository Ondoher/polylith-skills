# Wireframe/UI self-audit pilot execution

Status: in-session timeline trial complete; stopped at the plan's early quality
gate. [Plan](wireframe-ui-self-audit-pilot-plan.md). The separate scripted
model-execution path was not used. [Machine-readable metrics](wireframe-ui-self-audit-pilot-20261001-metrics.json).

## Progress

| Milestone                        | Status                | Saved evidence                                                                        |
| -------------------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| 0. Freeze comparison             | Complete              | Corrected-scope baseline; saved `wireframe-ui-scope-correction-20261001/fixture.json` |
| 1. Build pilot protocol          | Locally verified      | Pilot-only store, coordinator barrier, diagnostic receipt, 23 passing pilot tests     |
| 2. Paired first-draft diagnostic | Complete              | Frozen r2, independent diagnostic, five full-list author audits, accepted r6          |
| 3. Matched wireframe comparison  | Stopped at early gate | Two clean author audits preceded ordinary review rejections                           |
| 4. UI trial                      | Stopped at early gate | Did not spend on UI after the wireframe reliability result                            |
| 5. Decide                        | Complete              | Do not roll out this checklist protocol; keep the external review and pilot evidence  |

## Questions and decisions

| Question                                                                             | Decision and reason                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where should the experimental checklist live?                                        | Keep it in a pilot-only extension of the existing store. The ordinary store and MCP contract remain unchanged until the experiment earns rollout.                                                                                                                                                                                       |
| How can the reviewer inspect an unsubmitted draft without accidentally accepting it? | Use a separate immutable diagnostic snapshot and receipt. The ordinary review operation requires submission and writes an acceptance-eligible receipt.                                                                                                                                                                                  |
| Which saved input should prepare this run?                                           | Use the corrected-scope `fixture.json`. The first preparation attempt supplied its derived `scope.json` as `--scope-input`, but that option expects a different wrapper with a context binding; the fixture contains the verified context, design and scope together. No model call or product mutation occurred in the failed attempt. |
| How much evidence should code validate?                                              | Validate known source references, exact revisions, existing scene IDs and supplied node IDs. The author and independent reviewer still judge whether the rendered scene expresses the source behavior.                                                                                                                                  |
| How should an interrupted frozen draft resume?                                       | Reuse its frozen artifact and diagnostic receipt, if saved; do not repeat first-draft generation. This was added before the live attempt; the pilot suite still passes.                                                                                                                                                                 |
| What happened when the scripted model client could not spawn?                        | The restricted workspace returned `spawn EPERM` before the first model call. Preserve the prepared inputs, retire that execution path, and use the ordinary in-session agent workflow. No source or product file changed.                                                                                                               |
| Could the separate model launch be rerouted?                                         | No. The separate launch was rejected by automatic approval review. No proxy, redirect, alternative client or direct backend call was used. The current conversation's collaboration agents use the ordinary in-session path, which does not launch that client.                                                                         |
| How can the pilot continue without a separate model client?                          | Use the current conversation's persistent author and fresh reviewer agents. A disposable local bridge imports their scoped JSON into the existing `PilotStore`; it makes no model calls. This changes orchestration overhead, so compare only like-for-like phases and keep timing limits explicit.                                     |
| What should happen when the first browser capture is blocked by sandboxing?          | Preserve the valid rendered draft, then run only the local headless browser capture with the necessary filesystem/process permission. The new capture is bound to the same revision, so no design work is regenerated.                                                                                                                  |
| Should the trial proceed to a matched control and UI authoring?                      | No. The first ordinary review rejected a clean 20-item audit with two blockers; the next clean audit was also rejected after its repair introduced a disabled-control regression. The early gate was intended to avoid further expensive work when this protocol failed to prevent review rework.                                       |
| Is the diagnostic review's broad missing-action finding a timeline blocker?          | No as written. It included unchanged workspace actions outside the selected timeline change. Its narrower insertion-destination concern overlaps the valid copied-insertion finding. Keep the original diagnostic receipt and distinguish scope overreach from confirmed changed-interface defects.                                     |

## Measurements and verification

The pilot's 23 existing and new tests pass. Formatting and Git whitespace checks
pass. An isolated timeline attempt was prepared from the saved corrected-scope
fixture; SHA-256 of its source fixture is
`4ef83f66a0fa081ec787a675b701b08e7a231c7cbc9f87bd85c279c610e508a2`.
The failed launch recorded 90.911 ms of runner activity, zero completed model
turns, zero contributions and zero reviews. The protected input hash check passed;
the attempt is `review-incomplete` solely because the client process could not
start. This time is startup failure overhead, **not** wireframe performance.

The saved attempt is `.codex-tmp/wireframe-ui-self-audit-20261001/`. Its
`state.private.json`, `events.jsonl`, packet and prepared inputs remain available.
The `--execute` script must not be used as the default continuation. The
in-session trial below reused these inputs through collaboration agents and a
disposable local data bridge; the bridge makes no model calls.

## In-session timeline trial, ongoing

The fresh author saved 20 source-linked requirements covering all 11 seeded
source references. The first materialized draft was revision 1; ordinary visual
inspection found the staged Add panel clipped, and a targeted viewport change
produced revision 2. Revision 2 was frozen at **16:26:58.589 UTC** with its exact
artifact binding and screenshot hash. The independent diagnostic reviewed only
that frozen draft and returned **revise: seven blocking and two nonblocking
findings**. Its findings remained sealed from the author.

The same author audited all 20 items against revision 2: **10 verified, 10
needing repair**. After a targeted repair, revision 3 had **15 verified, five
needing repair**. A second targeted repair produced revision 4; its full-list
audit was **20 verified, zero needing repair** at **16:36:20.374 UTC**. The store
accepted an inspected submission of that exact revision at **16:36:35.284 UTC**.
A fresh ordinary reviewer evaluated revision 4 without access to either the
checklist or the diagnostic findings and returned **revise: two blocking and one
nonblocking finding** at **16:43:58.191 UTC**. The blockers were a 39s scrub
playhead against a 22s player caption and missing Add/trim cancellation routes.
The menu also showed ambiguous simultaneous focus cues. These survived a clean
author audit and required reviewer-directed repair. The same author added
cancellation paths, reconciled playhead and player values, and removed focus
ambiguity in the open menu. The full 20-item revision 5 author audit was again
clean and the exact revision was submitted at **16:46:59.520 UTC**. Ordinary
re-review still returned **revise: one blocking and one nonblocking finding**.
The new canceled-Add state retained a disabled Selection actions control after
the staged panel closed, even though the selected clip remained usable. The
remaining low finding was simultaneous focus cues in other scenes. This is a
regression introduced by the repair and missed by the author's second full
audit. A targeted revision 6 restored the canceled Add control and made focus
singular in the remaining scenes. Its third clean author audit preceded an
ordinary **pass with zero findings** at **16:53:30.833 UTC**. The accepted
artifact binding is `0f8b6f2b82d7a6605b1e12d973174dd919d4c0f023a7e1fbb5baa11292815a3a`.

The six local capture operations took **31.885s total** across 16 screenshot
pages; model/agent interpretation is not included. Store requirement,
contribution, freeze, audit, diagnostic-receipt and submission operations each
took under 0.1s in the local event log. The interval from first saved
requirements at **16:25:21.215 UTC** to submitted revision at **16:36:35.278
UTC** was **11m14.063s**, containing author work, inspection, local captures,
coordination and a diagnostic review that overlapped the author's repairs. It
does not measure pure reasoning, the entire request-to-completion time, or a
like-for-like baseline. In-session token usage is unavailable.

The first ordinary review verdict arrived **7m22.907s** after revision 4
submission. Targeted repair through revision 5 submission took **3m01.329s**;
its re-review took **2m49.980s**. The next repair through revision 6 submission
took **1m54.181s**; final review took **1m47.152s**. Capture and full-list audits
are inside the repair windows. These are elapsed boundaries, not isolated agent
thinking times, and independent review startup is included in review windows.
From the first saved requirement list to accepted revision 6 was **28m09.618s**;
preparation before that saved list is excluded. The diagnostic review overlapped
author work and is experiment overhead, so these windows must not be added to
it. No matched control ran; historical agent-work numbers are not comparable to
this elapsed window.

## Paired diagnostic and author audit

The paired checks saw the same frozen revision 2. Comparison is by observable
defect, not by checklist or reviewer ID:

| Diagnostic finding                                  | Author audit on r2                                                                                     | Adjudication                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `d01` broad missing workspace actions               | No equivalent item                                                                                     | Mostly outside the selected timeline change; its insertion-destination concern is covered under `d03`. |
| `d02` Ungroup outside Selection actions             | Found under `r-ungroup`                                                                                | Shared finding.                                                                                        |
| `d03` staged and inserted copies look identical     | `r-insert` and `r-copy` marked verified                                                                | Reviewer-only miss on a changed timeline result.                                                       |
| `d04` Add failure and cancellation                  | Failed Add state missing under `r-add-fail`; cancellation not checked                                  | Partial overlap; cancellation survived through r4.                                                     |
| `d05` untraceable pushed neighbor and trim recovery | Neighbor and invalid result found under `r-trim`, `r-trim-fail` and `r-time`; cancellation not checked | Partial overlap; cancellation survived through r4.                                                     |
| `d06` 39s playhead versus 22s player                | `r-time` needed repair for a different mismatch                                                        | Reviewer-only miss that survived through r4.                                                           |
| `d07` Save leaves trim handles active               | Found under `r-state-freeze` and `r-save-freeze`                                                       | Shared finding.                                                                                        |
| `d08` simultaneous focus cues                       | `r-focus` marked verified                                                                              | Reviewer-only low-severity miss.                                                                       |
| `d09` frame order and placeholder shape             | Frame order found under `r-frame`; shape not checked                                                   | Partial overlap; placeholder shape was not a blocking changed-timeline requirement.                    |

The author also identified the absent **committed** trim result, which the
diagnostic did not separately articulate. The diagnostic's `d01` is retained in
the saved receipt rather than silently discarded; its scope overreach means its
seven blocking findings cannot all be treated as seven confirmed timeline
defects. Both checks had useful unique observations. The decisive observation
for this pilot is that two confirmed blockers still reached ordinary first
review after the author had declared all 20 items verified, and one new blocker
reached ordinary re-review after the next clean audit.

## Decision and limits

Do **not** promote the pilot checklist or audit gate into the normal wireframe
or UI workflow. Keep the independent wireframe reviewer. This trial did not
meet the intended near-clean first-review behavior; a fresh matched control and
UI run would spend substantial time without a positive early quality signal.
The pilot remains isolated for inspection. A future narrower hypothesis would
need to extract cancellation/recovery as explicit obligations, check linked
values such as playhead versus player caption, and verify post-repair enabled
states on every resulting scene. That is a separate test, not a claimed fix.
The historical timeline had three rejected reviews, while this trial had two;
the two runs were not matched, so this is **not** evidence of a speedup or a
reliable reduction in review failures. Agent token usage, pure reasoning time,
and cumulative in-session agent work were unavailable. No live product data was
mutated; source fixture hash remained unchanged. No model proxy or separate
model client was used.

Checkpoint adviser recommended the preapproved message **Add wireframe self-audit
pilot protocol**; the locally verified implementation was committed as `2abf273`.
No push or live product mutation occurred.
