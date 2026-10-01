# Wireframe/UI follow-ups

Living list from the [pilot](wireframe-ui-pilot-execution.md). Unchecked items
are proposed work; add findings here as they arise. Judge improvements by time
to accepted output and first-review pass rate, with rework measured separately.

Latest evidence: [fresh first-review baseline](wireframe-ui-baseline-20261001.md).
It recorded zero finding-free results across three completed reviews. Focus
presentation, source-faithful trim examples, inclusive frame boundaries and a
button-outline discrepancy remain observed problems; further repair is not running.
Wireframe acceptance before UI dispatch is implemented. Worker-pool parallelism
remains a later experiment.

Completed prerequisite: [correct the wireframe/UI work list](wireframe-ui-scope-correction-execution.md).
The [defect-prevention confirmation](wireframe-ui-defect-prevention-execution.md)
remains paused, with corrected source-linked scope and saved inputs ready.
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

Already corrected in the pilot: screenshot delivery, the observed renderer
styling defects, immutable revision handling, saved-review reuse, and acceptance
of repaired wireframes before their dependent UI updates. The reliability work adds source-bound packets, inspected submissions, early
wireframe acceptance and normal MCP integration. Scope correction is complete;
the other open items remain separate follow-up experiments.
