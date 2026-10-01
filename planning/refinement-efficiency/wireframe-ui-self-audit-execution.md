# Wireframe/UI self-audit pilot execution

Status: in progress. [Plan](wireframe-ui-self-audit-pilot-plan.md).

## Progress

| Milestone                        | Status                               | Saved evidence                                                                        |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| 0. Freeze comparison             | Complete                             | Corrected-scope baseline; saved `wireframe-ui-scope-correction-20261001/fixture.json` |
| 1. Build pilot protocol          | Locally verified; live trial pending | Pilot-only store, coordinator barrier, diagnostic receipt, 23 passing pilot tests     |
| 2. Paired first-draft diagnostic | Pending                              |                                                                                       |
| 3. Matched wireframe comparison  | Pending decision                     |                                                                                       |
| 4. UI trial                      | Pending decision                     |                                                                                       |
| 5. Decide                        | Pending                              |                                                                                       |

## Questions and decisions

| Question                                                                             | Decision and reason                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where should the experimental checklist live?                                        | Keep it in a pilot-only extension of the existing store. The ordinary store and MCP contract remain unchanged until the experiment earns rollout.                                                                                                                                                                                       |
| How can the reviewer inspect an unsubmitted draft without accidentally accepting it? | Use a separate immutable diagnostic snapshot and receipt. The ordinary review operation requires submission and writes an acceptance-eligible receipt.                                                                                                                                                                                  |
| Which saved input should prepare this run?                                           | Use the corrected-scope `fixture.json`. The first preparation attempt supplied its derived `scope.json` as `--scope-input`, but that option expects a different wrapper with a context binding; the fixture contains the verified context, design and scope together. No model call or product mutation occurred in the failed attempt. |
| How much evidence should code validate?                                              | Validate known source references, exact revisions, existing scene IDs and supplied node IDs. The author and independent reviewer still judge whether the rendered scene expresses the source behavior.                                                                                                                                  |

## Measurements and verification

The pilot's 23 existing and new tests pass. An isolated timeline attempt was
prepared from the saved corrected-scope fixture; its protected input hash check
passed. No model calls have occurred in this attempt yet. Record observed values
only; distinguish agent-work sums from overlapping elapsed time and experimental
diagnostic overhead from the production path.
