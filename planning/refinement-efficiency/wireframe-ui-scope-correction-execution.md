# Wireframe/UI scope correction execution

Status: all four stages of the [scope-correction plan](wireframe-ui-scope-correction-plan.md) are complete. Implementation began at 2026-10-01 01:29:58 UTC. No new UX/UI model run, live product mutation or model proxy was used. The previous full confirmation remains paused; its corrected inputs are ready.

## What changed

The shared wireframe store and normal MCP workflow now require an explicit, source-linked interface impact before dispatching an update. Related context remains readable without granting authority to edit it. Missing or conflicting impact becomes a local repair issue; independent valid work continues. An explicitly identified existing defect can justify repair even when its source requirement did not change.

Saved scope is bound to its baseline and current inputs. Stale scope is held for recomputation; decisions and drafts are preserved. Review acceptance depends on the interface's relevant packet, including component and state records, instead of unrelated document revisions. Wireframe acceptance before UI dispatch remains required.

The experiment harness uses the same selection path and no longer imports the old pilot scope by filename. UX input selection marks broader retrieved context as read context, not edit authorization. Agent instructions require preserving unaffected controls and using the parent's resolved source facts. No general dependency graph or new authoring/review stage was added.

## Source correction and Alexa inventory

Revision 6's description (`ae67c738…`, 31,279 bytes) became revision 7 (`5502890f…`, 31,919 bytes) by appending 640 bytes after `---`. The live description has the same revision-7 hash. The amendment expressly requires copying clips onto timelines, grouped assembly operations, inward/outward trim behavior, ungrouping visible parts, and no propagation of library updates to existing videos.

Independent-copy behavior is supported by the owner's change. The earlier diagnosis missed the amendment and incorrectly relied on older paragraphs. The selection error was treating a changed insertion result as sufficient reason to redesign the related Add dialog. Its controls do not promise live linking; the changed insertion result belongs on the timeline.

| Interface                | Decision | Concrete effect                                                                                                                  |
| ------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Update Named Clip dialog | Update   | Remove propagation/collision presentation; explain future additions use the updated library item.                                |
| Selection actions menu   | Update   | Add assembly Ungroup; preserve existing range actions and Update Named Clip entry.                                               |
| Timeline                 | Update   | Show independent insertion, grouped trim and visible-only ungroup results.                                                       |
| Add dialog               | Reuse    | Existing selection, crop, explicit Add and Cancel controls remain applicable. Preserve its existing partial-completeness status. |
| Save Clip dialog         | Reuse    | Existing inclusive range and retained-value behavior still apply.                                                                |
| Framing/background       | Reuse    | Removing a resolved question does not require redesign.                                                                          |

The [amendment convention](../../skills/refine-design/references/source-change-requests.md) keeps the human document freeform: later prose after a standalone `---` overrides applicable earlier requirements or answers questions; unrelated requirements remain in force. No IDs, status fields or required headings are imposed. Alexa already follows this convention and was not edited.

## Saved results and resumption

The product-specific [offline reconciliation](experiments/wireframe-ui-pilot/reconcile-alexa-scope.mjs) wrote `.codex-tmp/wireframe-ui-scope-correction-20261001/`:

- `inputs/context.json` and `inputs/scope.json`: resolved source evidence and six-interface inventory.
- `inputs/candidate-ux.json`: copied proposal with the unchanged Add frame and content-selection action restored from accepted prior UX. Insertion retains the amended semantics.
- `inputs/prior-ui.json`: unchanged prior UI, including the original Add dialog.
- `fixture.json`: context, corrected scope and design inputs for the existing isolated harness.
- `outputs/scope.json` and `report.json`: validated dispatch scope, provenance and protection checks.

These are disposable development artifacts; no migration support for old schemas was added. Public counts, hashes, decisions and retained measurements are in [scope-correction metrics](wireframe-ui-scope-correction-metrics.json).

Use this fixture when the previous plan resumes. Preserve candidates under `.codex-tmp/wireframe-ui-prevention-20260930/workspace/outputs/`:

| Element directory        | Saved wireframe      | Saved UI          | Reuse treatment                                                 |
| ------------------------ | -------------------- | ----------------- | --------------------------------------------------------------- |
| `clip-update-dialog`     | `wireframe-r8.json`  | `ui-r2.json`      | Retain candidate content and review evidence.                   |
| `selection-actions-menu` | `wireframe-r9.json`  | `ui-r2.json`      | Retain content; compare with the narrowed Ungroup scope.        |
| `timeline`               | `wireframe-r26.json` | `ui-r2.json`      | Retain candidate content and review evidence.                   |
| `timeline-add-dialog`    | Historical revisions | Historical drafts | Preserve as experiment evidence; use original prior UI instead. |

The first three candidates were accepted in the earlier experiment. Acceptance does not automatically transfer across changed packet/contract bindings. Compare saved content with the corrected packet; preserve compatible content and repair only necessary differences. Reuse acceptance only where its relevant binding matches; otherwise obtain current acceptance without recreating the design. Upstream candidate UX remains unreviewed. This scope correction does not promote it or complete the previous quality confirmation.

## Verification and measurements

Successful update/reuse cases were tested first, then the observed selection, stale-input and acceptance-binding failures. Shared-store, normal MCP and harness checks cover readable context without writes or author/reviewer dispatch, justified updates, explicit defect repair, local unresolved issues, preserved stale scope and relevant acceptance invalidation.

- Full package gate: **572 tests passed**, zero failures. Initial subprocess restrictions were resolved by an authorized local rerun; no assertions were suppressed.
- Experiment harness: **22 tests passed**. A new MCP test initially mistook a result handle for inline data; it was corrected to retrieve the existing file result.
- After the final packet-binding fix: **13 focused tests passed**. This overlaps the other suites; counts must not be added. The full package gate preceded that last fix.
- One bounded correctness review found missing component/state records in packets. The records and regression checks were added; targeted follow-up confirmed the fix with no remaining finding.
- Repository-wide `npm run format:check` and `git diff --check` passed.

| Measurement                                     | Observed result  | Interpretation                                                              |
| ----------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| First offline reconciliation                    | 46.6944 ms       | Deterministic script, including saved-file reads and writes.                |
| Second reconciliation after scope clarification | 63.4700 ms       | Separate run, retained in measurement history; not additive elapsed time.   |
| Candidates                                      | 6                | 3 updates, 3 reused, 0 unresolved.                                          |
| Previous updates → corrected updates            | 4 → 3            | One prospective interface pipeline avoided; model time saved is unmeasured. |
| UX/wireframe/UI author or reviewer calls        | 0                | Source investigation and local verification only. Code review is separate.  |
| Original source/context/UI                      | Hashes unchanged | Isolated copied inputs only. Add part hash remains `26a6ebf5…`.             |

Test process durations and local logs remain in `.codex-tmp/scope-correction-verification.json` and `.codex-tmp/scope-correction-*-tests.log`. Script timings exclude source interpretation, implementation and code review; they do not predict end-to-end UX/UI speed or first-review success. General fuzzing, live product reruns and new performance benchmarks were outside this prerequisite.

The overall observed implementation window was 01:29:58–02:04:54 UTC (34m56s),
including investigation, code generation, tests, review, reporting and gaps.
It is neither a product-run measurement nor a measure of pure reasoning.

## Questions and decisions

| Question                                              | Decision and reason                                                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Is the old/current human source available?            | Yes. Use exact saved sources and append-only diff; no product reparse or run.                                                          |
| Which clip behavior governs?                          | The later owner amendment. Correct the earlier diagnosis; retain valid independent-copy requirements.                                  |
| Does Add need redesign?                               | No visible change was established in its controls. Show insertion results on the timeline and preserve the original dialog.            |
| Should amendments require structured fields?          | No. Replace the initial structured proposal with the user's freeform `---` convention.                                                 |
| Does context retrieval authorize edits?               | No. Save semantic impact once with exact source references; readable context is separate.                                              |
| Can unchanged requirements justify repairs?           | Yes, for explicitly identified existing defects. Do not invent a source edit.                                                          |
| What about missing or ambiguous evidence?             | Save a local repair issue and withhold that update; continue independent valid work.                                                   |
| Should every document revision invalidate acceptance? | No. Recompute scope when inputs change, then bind acceptance to relevant records and evidence.                                         |
| What about component/state changes?                   | Include selected records in packets and acceptance bindings; the review exposed and verified this correction.                          |
| How should old schemas/data be handled?               | Preserve originals; reconcile disposable development copies only. No permanent backward-compatibility code.                            |
| Should generated work be discarded?                   | No. Retain candidates, drafts, measurements and receipts. Reuse compatible content; verify current acceptance separately.              |
| Is upstream UX accepted now?                          | No. Preserve its unreviewed status and the original Add scene's partial completeness.                                                  |
| Should the full Alexa run restart?                    | No. This prerequisite ends with corrected scope and a concrete handoff to the paused previous plan.                                    |
| How were verification errors handled?                 | Fix the test's result-handle assumption, rerun blocked subprocess checks with authorization, and address the actual review finding.    |
| How much review/checkpointing?                        | One bounded review with targeted confirmation, then checkpoint advice with the preapproved message; no repeated broad reviews or push. |
| How should model traffic be handled?                  | Normal Codex only; no model proxy. Local MCP data service remains allowed.                                                             |

## Checkpoint

The checkpoint adviser recommended this functional unit with the preapproved
message **Correct wireframe/UI impact selection**. The local checkpoint also
preserves the earlier authorized replay diagnostics and paginated screenshot
helper that the updated harness imports. No push. Remaining product confirmation
belongs to the previous plan; no scope-correction implementation blocker remains.
