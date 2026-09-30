# Wireframe/UI follow-ups

Living list from the [pilot](wireframe-ui-pilot-execution.md). Unchecked items
are proposed work; add findings here as they arise. Judge improvements by time
to accepted output and first-review pass rate, with rework measured separately.

Current confirmation: [wireframe and UI reliability execution](wireframe-ui-reliability-execution.md).
Wireframe acceptance before UI dispatch is implemented. Worker-pool parallelism
remains a later experiment.

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
- [ ] **Derive timeline geometry from times.** The reliability trial still found
      temporal alignment errors. A shared scale could prevent manual divergence.
- [ ] **Measure pre-review scope growth.** The timeline author expanded five
      required states to thirteen before submission; compare coverage gained with
      added authoring and inspection cost.
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
wireframe acceptance and normal MCP integration. Open items above are later
experiments, not prerequisites to the current workflow.
