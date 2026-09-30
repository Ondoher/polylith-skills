# Wireframe/UI follow-ups

Living list from the [pilot](wireframe-ui-pilot-execution.md). Unchecked items
are proposed work; add findings here as they arise. Judge improvements by time
to accepted output and first-review pass rate, with rework measured separately.

Next priority: [wireframe and UI reliability plan](wireframe-ui-reliability-plan.md).
Prevent avoidable authoring failures and require wireframe acceptance before UI
dispatch. Worker-pool parallelism remains a later experiment.

- [ ] **Validate renderer capabilities.** Check template-specific states and
      supported visual treatments during authoring; return precise local repairs
      while retaining valid contributions. Test supported rendering states.
- [ ] **Make usage coverage explicit.** Derive each element's required actions
      and outcomes from saved UX, and use existing references to connect them to
      controls and feedback. Avoid another manually authored requirements list.
- [ ] **Separate preview from handoff.** Let the author inspect and correct the
      rendered element before marking it ready. In the reviewed pipeline, accept
      its wireframe before UI consumes it; continue independent elements meanwhile.
- [ ] **Check geometry mechanically.** Detect unintended clipping/overflow and
      investigate calculating timeline positions from time values. Preserve
      intentional overlap and scrolling.
- [ ] **Reduce structural rewrite work.** Support targeted component-structure
      edits so a local repair does not require resending a large part and its
      state variants. Measure author effort, not just payload size.
- [ ] **Later: test parallel UI authors.** Use clearly independent ready elements
      after reducing avoidable rework; measure elapsed time and credit use.

Already corrected in the pilot: screenshot delivery, the observed renderer
styling defects, immutable revision handling, saved-review reuse, and acceptance
of repaired wireframes before their dependent UI updates. Broader validation and
initial-handoff ordering remain covered by the open items above.
