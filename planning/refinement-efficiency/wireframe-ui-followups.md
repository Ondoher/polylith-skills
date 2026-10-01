# Wireframe/UI follow-ups

Living list from the [pilot](wireframe-ui-pilot-execution.md). Unchecked items
are proposed work; add findings here as they arise. Judge improvements by time
to accepted output and first-review pass rate, with rework measured separately.

Latest evidence: [complete baseline including rework](wireframe-ui-baseline-completion-20261001.md).
All three selected interfaces reached acceptance in 57m51s active elapsed time.
First reviews passed 2/6 times, none finding-free; five rejected reviews occurred
across the complete sequence. Matched agent work increased 22.1% versus the prior
three-interface results. The finding-free target remains unmet; no run is active.
Wireframe acceptance before UI dispatch is implemented. Worker-pool parallelism
remains a later experiment.

Completed prerequisite: [correct the wireframe/UI work list](wireframe-ui-scope-correction-execution.md).
The earlier [defect-prevention confirmation](wireframe-ui-defect-prevention-execution.md)
is preserved as historical evidence; the corrected-scope baseline is complete.
Component-state, generic-geometry and outcome exercises passed their first external
reviews. Product-specific rules remain input data; local corrections remain
separately measured.

- [x] **Correct interface selection before resuming.** Separate readable context
      from update scope, require a source-linked impact or explicit defect repair,
      and bind reused scope to its actual inputs. Preserve compatible saved work.

- [x] **Validate renderer capabilities.** Check template-specific states and
      supported visual treatments during authoring; return precise local repairs
      while retaining valid contributions. Test supported rendering states.
- [x] **Make usage coverage explicit.** Derive each element's required actions
      and outcomes from saved UX, and use existing references to connect them to
      controls and feedback. Avoid another manually authored requirements list.
- [x] **Separate preview from handoff.** Let the author inspect and correct the
      rendered element before marking it ready. In the reviewed pipeline, accept
      its wireframe before UI consumes it; continue independent elements meanwhile.
- [x] **Check clipping mechanically.** Detect text/control overflow while preserving
      intentional overlap, floating labels and scrolling.
- [x] **Derive geometry from a generic numeric scale.** Shared value-to-position
      mapping is implemented and verified at multiple widths. The full trial's
      timeline reviewer accepted its alignment. Units and product behavior remain
      supplied data; vertical layout still requires separate budgeting.
- [ ] **Keep selection distinct from keyboard focus during construction.** The
      full confirmation's first timeline review rejected several simultaneous
      focus targets. Its geometry and concrete outcomes passed. Capture one
      intended focus owner for each interaction scene without forbidding component
      state sheets that intentionally compare multiple examples. The minimal
      [reproduction](experiments/wireframe-ui-pilot/focus-ownership-reproduction.mjs)
      shows that both ambiguous and corrected declarations are structurally valid;
      this preserves the failure, not a completed production prevention mechanism.
- [ ] **Align consequential findings across the two review gates.** In the
      completed baseline, wireframe review flagged missing return focus and dual
      keyboard-focus cues as nonblocking; UI review rejected both. Establish
      consistent criteria without weakening review so known issues do not pass
      downstream merely to require the same repair later.
- [ ] **Construct controls in their required context.** UI review caught a
      persistent command whose supplied action required an open menu. Use source
      preconditions when placing controls and illustrating states; keep product
      specifics in the input packet.
- [ ] **Show resulting objects and interactions, not just claims about them.**
      Menu review rejected text saying objects were independently selectable
      without showing selection, and a middle-cut result omitting its two retained
      fragments. Preserve this evidence when improving initial construction.
- [ ] **Preserve state overrides when reusing a part.** A local timeline repair
      temporarily lost pending/failure messages and disabled controls while
      reusing the Add dialog. Prefer retaining existing overrides when changing
      only the reusable structure; measure this separately from external rework.
- [ ] **Derive adjacent ranges from explicit boundary semantics.** Visual review
      caught adjacent illustrative ranges that both included the same boundary
      value, despite correct coordinate alignment. Supply the discrete unit and
      inclusive/exclusive convention from source data; derive labels and rendered
      extents consistently. Keep these semantics out of generic numeric-position
      defaults. Wireframe review had missed this and UI correctly routed it back.
- [ ] **Budget vertical layout at first construction.** Isolated geometry and
      full dialog examples still required row/viewport corrections even when
      numeric positions and semantic outcomes were correct. Investigate intrinsic
      sizing and flex/grid guidance using the saved examples before another paid run.
- [ ] **Allow translated application text to expand.** Every interface element
      containing app-defined text must accommodate longer translations, including
      labels, buttons, menus, tabs, headings, helper text and status/error messages.
      Use flexible sizing, wrapping or reflow appropriate to the control and its
      surrounding layout; do not size only for the current language or fix overflow
      merely by shortening the sample copy. Preserve readability and access to
      actions without clipping or overlap. Apply this to wireframes and UI designs;
      verify representative longer translations in a later pass. Recorded as a
      general requirement for future work, not implemented in the current baseline.
- [ ] **Carry required result values into construction.** The full Add-dialog
      wireframe showed new saved-bundle identities but omitted staged duration
      and expanded item ranges. Source-to-node links alone did not establish the
      timing relationship required by the source. Preserve compact required
      values/relationships from supplied facts and show them in the relevant
      result, without duplicating every flow into another scene. See the
      [anonymized counterexample](experiments/wireframe-ui-pilot/prevention-reproductions.md).
- [ ] **Measure pre-review scope growth.** The timeline author expanded five
      required states to thirteen before submission, and the Add dialog expanded
      five to twenty. The new confirmation contains 52 scenes versus 30 in the
      preceding trial. Compare coverage gained with added authoring, inspection
      and review cost; reuse existing evidence when it already shows the required
      result. Large contact sheets also leave later scenes outside a screenshot
      viewer's visible portion, so record what was actually inspected.
- [ ] **Reuse consistent illustrative data across related elements.** The same
      inclusive-boundary defect appeared in both timeline and selection-menu
      examples, and the Add chooser initially disagreed with its result duration.
      Keep a small supplied example dataset with explicit units and conventions;
      derive repeated labels and values from it without adding product defaults
      to shared code or another requirements graph.
- [x] **Reduce structural rewrite work.** Support targeted component-structure
      edits so a local repair does not require resending a large part and its
      state variants. Measure author effort, not just payload size.
- [ ] **Later: test parallel UI authors.** Use clearly independent ready elements
      after reducing avoidable rework; measure elapsed time and credit use.
- [ ] **Verify repair-context reuse.** The timeline repair reread the same
      96,775-byte source packet in four calls. Replay wording now permits reusing
      retained unchanged facts; measure whether that prevents rereads in the
      next ordinary run before claiming a saving.
- [ ] **Separate preview capture from the mutation queue.** In the reliability
      trial, a browser capture took 26.876s while an unrelated timing marker took
      13.187s and completed immediately afterward. The experimental preview hook
      runs inside the workspace mutation queue. Keep source writes serialized,
      but investigate capturing immutable preview revisions outside that queue.
      Normal-host capture is already parent-owned; do not label this experiment's
      browser/queue delay as model reasoning.
- [ ] **Measure handoff after a saved review receipt.** The completed baseline's
      menu re-review saved a pass, then took 2m04.724s to finish its native turn
      without further tool calls. UI waited for turn completion. Investigate
      whether an exact validated receipt can release the next stage safely while
      the reviewer finishes; the cause of this one observed gap is unclassified.

Already corrected in the pilot: screenshot delivery, the observed renderer
styling defects, immutable revision handling, saved-review reuse, and acceptance
of repaired wireframes before their dependent UI updates. The reliability work adds source-bound packets, inspected submissions, early
wireframe acceptance and normal MCP integration. Scope correction is complete;
the other open items remain separate follow-up experiments.
