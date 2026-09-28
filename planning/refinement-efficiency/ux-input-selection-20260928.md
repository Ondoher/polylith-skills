# UX input selection compared with the complete replay

The first conservative selector cuts the **actual saved update from 514,426 bytes / 74 reads to 492,371 bytes / 71 reads: 4.3% fewer bytes and three fewer reads**. It preserves all 55 distinct source/design references mentioned by the previous full-read answer in detailed records. This is useful coverage evidence, not proof that a fresh agent would make equivalent decisions.

This is a deterministic comparison through the production HTTP MCP server. There were **zero model calls**, no fresh UX reasoning or review, and no writes to the Alexa project. Input hashes match the saved MCP replay values. Both complete and selected inputs were actually paged through the unchanged 7,000-byte reader and reconstructed exactly. These are measured read counts, not just division by page size.

## Results

| Input scope                                        | Returned content bytes | Read calls | Reduction against complete input |
| -------------------------------------------------- | ---------------------: | ---------: | -------------------------------: |
| Complete saved facts and prior UX                  |                514,426 |         74 |                         Baseline |
| Actual update, selected conservatively             |                492,371 |         71 |           4.3% bytes; 4.1% reads |
| Export-only assignment, illustrative narrower task |                408,791 |         59 |         20.5% bytes; 20.3% reads |

Selection also requires one `workflow_execute` call if the parent has not already prepared the package. On that basis, the actual update uses **72 calls versus 74** for preparing/reading already stored inputs. Input storage, role instructions and final result delivery are outside those counts. A smaller read count is not a measured end-to-end speedup.

The actual-update operation took **1,094ms** on the server and **1,107ms** including the local HTTP round trip. The subsequent export-only operation took **208ms / 221ms**. The first call includes worker/module initialization; these different scopes and cache states are not a controlled timing comparison. The selector currently invokes existing validation/index builders repeatedly; those costs were not profiled separately. The packet-size result does not justify prioritizing that local cost yet.

The export-only example is explicitly **not an equivalent task** to the actual update. It demonstrates the selection behavior on a narrower assignment using the same saved data.

## What was implemented

The new read-only `ux.select-input` domain operation accepts saved `facts` and `ux` through `inputHandles`. Its default scope comes from the product change ledger, not the completed answer. Explicit `changedRefs` and `flowIds` support assigned work and later expansion.

The first policy, `complete-interactions/1`:

- Starts from changed product/UX records and existing requirement-to-UX relationships.
- Broadens new/unmapped requirements through existing capability relationships. Unmapped changes with no usable relationships retain full UX and product records and report the uncertainty.
- Retains complete flows belonging to affected interaction elements, including their existing alternate flows.
- Includes referenced actions, frames, states, feedback, shared elements and research records. Reading a shared action does not automatically select every consumer flow; changing it does.
- Retains referenced recovery alternates from supporting flows without importing those entire flows. These are returned verbatim with their owning flow reference.
- Keeps all product rules, gaps and users, and all UX questions, trace gaps and repair notices. Selected product records retain their source claims and provenance.
- Supplies an overview of omitted records using existing authored names, purposes and references, without generated summaries.
- Preserves selected record bodies exactly. This experiment isolates selection; it does not shorten their prose, compress repeated text, or strip per-record fields.
- Returns an independently readable receipt with inclusion reasons, seed-to-flow reach, counts and omitted-detail references.

The result is explicitly **noncanonical**. It is a reading package, not a valid replacement UX artifact or review subject. Full source handles remain available for expansion. Missing source bindings or an unrelated prior product revision broaden the result rather than trusting an incomplete change ledger. Current schemas are required; no compatibility converter was introduced.

The operation is available for controlled use but has **not been enabled automatically in refine-design or agent instructions**.

## Why the reduction is small

The actual update retains **10 of 11 flows, 27 of 29 frames, 76 of 79 actions and 99 of 105 feedback records**. Its changes touch library content, video editing and playback. The new assembly requirement and persistence invariant have no direct prior UX realization, so the selector includes the relevant existing capability's interactions and records that broadening.

There is also a more specific limitation in the current selection granularity: `buildUseCaseHandoff` includes an entire interaction frame whenever its `taskRefs` names the flow. A global export or save control places those tasks in frames across workspaces. Reading each complete frame then requires the definitions of its other controls and their behavior dependencies.

That is why even the export-only package retains **20 frames, 74 actions, all four surfaces and all nine components**, despite retaining only one complete primary flow. These associations do **not** prove that every detail is needed for an export decision; they explain why this conservative rule retrieves them.

The current output therefore points toward a more specific next experiment: select the relevant regions/controls of supporting frames, while preserving full affected interaction elements and shared behavior contracts. Keep the rest discoverable through overview/handles. That requires an explicit partial-frame reading contract and a coverage check; it was not silently introduced to improve this result.

## Validation and limits

- Exact input hashes, contiguous page reconstruction, unchanged selected UX record bodies, exact retained alternates, global rules and global gaps are checked by the comparison script.
- A real HTTP integration test covers a local assignment sharing an action with another interaction; read dependencies stay local, a change to the shared action includes both, and unknown scope or unrelated baseline broadens visibly.
- All 11 MCP integration tests passed in 7.51 seconds. The first sandboxed suite encountered subprocess restrictions in existing Git/Prettier fixtures; the authorized host rerun passed. A new test fixture's invalid negative revision was corrected before that rerun.
- The saved full-read answer was consulted **after** packet construction. All 55 referenced existing IDs appear in detailed source/design bodies; none appears only in the overview or is missing. Storage indexes/change ledgers are excluded from that coverage count.
- Questions, reasoning equivalence, review sufficiency, token counts and elapsed agent performance were not evaluated. No previous answer was used to choose what to keep.
- A first implementation pulled an entire supporting flow for each referenced recovery alternate. That reproduced most of the complete input even for narrow work. It was corrected to deliver the referenced alternate itself with its owner reference. An initial missing-link fallback was also refined to use existing capability relationships before broadening globally.

## Evidence and reproduction

[Metrics](ux-input-selection-20260928-metrics.json) preserve full and selected bytes, actual read counts, timings, inclusion reasons, seed reach, omitted references, source hashes and the reference coverage probe.

Run `node planning/refinement-efficiency/experiments/ux-input-selection/run.mjs` against the saved replay inputs. An optional first argument selects their directory. Source content must match the saved replay hashes. Full selected packets remain in `.codex-tmp/ux-selection-comparison-20260928/`; only metadata and this report are committed. All helper processes are closed by the script.
