# Wireframe/UI self-audit pilot execution

Status: protocol implemented and locally verified; live trial blocked before its
first model call by automatic approval review. [Plan](wireframe-ui-self-audit-pilot-plan.md).

## Progress

| Milestone                        | Status                          | Saved evidence                                                                        |
| -------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| 0. Freeze comparison             | Complete                        | Corrected-scope baseline; saved `wireframe-ui-scope-correction-20261001/fixture.json` |
| 1. Build pilot protocol          | Locally verified                | Pilot-only store, coordinator barrier, diagnostic receipt, 23 passing pilot tests     |
| 2. Paired first-draft diagnostic | Blocked before first model call | Prepared isolated timeline attempt; no author draft or diagnostic review              |
| 3. Matched wireframe comparison  | Not started                     | Requires milestone 2 signal                                                           |
| 4. UI trial                      | Not started                     | Requires wireframe evidence                                                           |
| 5. Decide                        | Defer adoption                  | No quality or performance effect can be inferred from local tests                     |

## Questions and decisions

| Question                                                                             | Decision and reason                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where should the experimental checklist live?                                        | Keep it in a pilot-only extension of the existing store. The ordinary store and MCP contract remain unchanged until the experiment earns rollout.                                                                                                                                                                                       |
| How can the reviewer inspect an unsubmitted draft without accidentally accepting it? | Use a separate immutable diagnostic snapshot and receipt. The ordinary review operation requires submission and writes an acceptance-eligible receipt.                                                                                                                                                                                  |
| Which saved input should prepare this run?                                           | Use the corrected-scope `fixture.json`. The first preparation attempt supplied its derived `scope.json` as `--scope-input`, but that option expects a different wrapper with a context binding; the fixture contains the verified context, design and scope together. No model call or product mutation occurred in the failed attempt. |
| How much evidence should code validate?                                              | Validate known source references, exact revisions, existing scene IDs and supplied node IDs. The author and independent reviewer still judge whether the rendered scene expresses the source behavior.                                                                                                                                  |
| How should an interrupted frozen draft resume?                                       | Reuse its frozen artifact and diagnostic receipt, if saved; do not repeat first-draft generation. This was added before the live attempt; the pilot suite still passes.                                                                                                                                                                 |
| What happened when the native client could not spawn?                                | The restricted workspace returned `spawn EPERM` before the first model call. Retain the prepared attempt and retry the same command under normal client permissions; no source or product file changed.                                                                                                                                 |
| Could the denied model launch be rerouted?                                           | No. Automatic approval review rejected the escalated launch because it would send saved Alexa/product and UX artifacts to the external authenticated Codex service without payload-specific confirmation. The rejection explicitly forbade an indirect workaround, so no proxy, alternative client, or agent route was used.            |

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
Once the approval condition is resolved, the same `--execute` command with
`--attempt=wireframe-ui-self-audit-20261001 --elements=timeline
--through=wireframe --self-audit=wireframe --review-attempts=4` resumes from
those inputs. Do not interpret or compare quality until it produces a frozen
first draft, the author's self-audit, the separate diagnostic review and the
ordinary final review.

Checkpoint adviser recommended the preapproved message **Add wireframe self-audit
pilot protocol**; the locally verified implementation was committed as `2abf273`.
No push or live product mutation occurred.
