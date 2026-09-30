# Wireframe/UI reliability execution

Status: running. Plan: [wireframe/UI reliability](wireframe-ui-reliability-plan.md).

## Progress

- [x] Shared behavior and renderer contract.
- [x] Reliable incremental authoring and preview inspection (local tests passed).
- [x] Wireframe review before UI dispatch (local tests passed).
- [ ] Isolated add-dialog acceptance trial.
- [ ] Four-element confirmation, reusing compatible completed work.
- [ ] Normal refinement integration, verification and final report.

## Decisions

1. Reuse the existing pilot and its saved original inputs. Corrected designs are
   regression evidence, not answers supplied to fresh authors.
2. Preserve the user's normal Codex connection; the local MCP data service is
   allowed, but no model proxy or redirect will be used.
3. Keep the upstream UX flow stage unchanged and preserve its unreviewed status.
   The new wireframe review cannot imply upstream approval.
4. Implement locally; invoke design/review agents for the planned trials and the
   checkpoint adviser for coherent commits. No additional coding workers are
   needed for initial implementation.
5. Reuse the original boundary inventory for the focused comparison. This avoids
   another model pass; scope selection is recorded as reused, not newly measured.
6. Move the shared preview/store implementation into refine-design helpers and
   keep small experiment imports. Normal MCP integration will use the same code.
7. Keep unsupported state values as explicit local errors; retain the saved draft
   for targeted correction. Rendering is distinct from inspected submission.
8. The sandbox initially prevented child-process launch (`spawn EPERM`). Automatic
   approval review then rejected the normal-client launch for ambiguous payload
   authorization. After inspecting the client and supplying the invoked plan's
   exact authorization, the retry was approved without changing the connection.
9. Which reviewer should assess comps? Add `ui-design-reviewer` alongside the
   requested wireframe roles. The existing `ui-reviewer` is a code-standards lane,
   so using it for qualitative comp review would conflate responsibilities.
10. Can the geometry check find the old defect? Its initial frame-only check
    missed it. Inspect painted text bounds too, excluding intentional floating
    field labels, clipping/scroll regions and visual overlays. Treat diagnostics
    as warnings for inspection, not proof of usability.
11. What if review discovers a renderer defect? The add-dialog UI review found
    missing choice focus styling. Its author correctly saved a draft instead of
    changing renderer code, but waited on a question outside its assignment.
    Stop that identified trial client, preserve the draft, fix the renderer and
    resume. Updated assignments explicitly return such blockers to the coordinator.
12. Are old passes valid after a renderer repair? No. Bind acceptance to the
    loaded preview/native renderer/parts code, rerender saved drafts and renew
    affected reviews. Record this extra tooling-recovery work separately.
13. How should retries and dependencies survive resume? Count up to three review
    revisions per element/role/current source-render contract from saved files.
    Schedule selected wireframe dependencies first; references outside a bounded
    trial retain their frozen source contract.
14. What about the broader gate's obsolete read-only requirement? Update the
    reviewer infrastructure check to require the already-authorized workspace
    write mode plus explicit scoped-delivery instructions. Do not revert agents'
    delivery permissions or suppress the failing check.

## Evidence and timing

Implementation, verification, trial timings, checkpoint hashes and any recovery
work will be recorded here as stages complete. Prior discussion documents remain
part of this work and will be retained in the next checkpoint.

- Implementation marker: 2026-09-30 19:17:01 UTC.
- Twenty focused tests passed: native client, existing renderer and store,
  analyzer, new source packet/dialog construction, targeted edits, inspected
  submission, exact acceptance, rejection preventing UI, and restart reuse.
- Local preparation retained unchanged protected inputs. The first failed launch
  produced no design results; it is setup evidence, not design-agent timing.
- Authorized add-dialog author started at 2026-09-30 19:32:00.749 UTC. Attempt:
  `.codex-tmp/wireframe-ui-reliability-20260930/`. All new artifacts remain there.
- Checkpoint adviser recommended: `Harden wireframe authoring handoffs`.
- Created checkpoint `bb9c3b1` with that preapproved message. No push.
- First wireframe author: 282.776s; first independent wireframe review: 97.893s,
  pass. Two draft previews and author inspection preceded submission; this is not
  zero local correction effort.
- First UI author: 228.204s; first visual review: 156.310s, revise for a renderer
  focus defect, with two nonblocking content/token observations. UI repair saved
  its draft, then waited for renderer ownership; the identified client was stopped
  after 197.373s and protected inputs remained unchanged.
- Renderer repair adds visible choice focus, disabled choice/icon behavior and
  explicit disabled foreground/background theme tokens. Twenty focused checks
  passed after the fix. Renewed wireframe inspection/submission: 80.334s; its
  independent recheck: 69.158s, pass. These are additional recovery windows.
