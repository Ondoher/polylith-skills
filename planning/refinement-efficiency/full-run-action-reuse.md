# Actual action reuse in the last completed Alexa refinement

Counted 2026-09-27 from the frozen output of
`run-20260927-160806-multitrack`, the latest completed product refinement. This is
the real run, not either shared-text experiment. Its final UX hash matches the
recorded assembly receipt. The run covered the full UX with explicitly partial
UI coverage, as described in its original report.

## Reuse within the resulting design

There are **79 distinct action definitions**, 29 interaction frames and 11 flows.

| Measure                                                |        Count |
| ------------------------------------------------------ | -----------: |
| Control placements referencing those actions in frames |      **132** |
| Distinct actions appearing in multiple frames          | **21 of 79** |
| Frame placements beyond each action's first use        |       **53** |
| Distinct actions appearing in multiple flows           |  **6 of 79** |
| Flow steps referencing actions, including alternates   |       **91** |
| Step references beyond each action's first use         |       **12** |

All 79 actions appear in both the frame inventory and the flow-step inventory.
The 91 step references comprise 35 primary steps and 56 alternate steps; another
17 steps have no `actionRef` and are not counted as action references. Frame and
flow counts describe overlapping views of behavior and must not be added as
unique user interactions.

Frame distribution: 58 actions appear in one frame, 11 in two frames, five in
four frames, four in six frames, and one in eight frames. The most reused is
`save-project`, appearing in eight frames. `navigate`, `new-project`,
`open-project` and `dismiss-editor` each appear in six. `dismiss-editor` is also
used by six steps across four distinct flows.

These placements already reference shared action definitions. They are not 132
copies of the complete action record, and cannot be claimed as new savings from
introducing action references. Repeated descriptions and surrounding frame
structures are separate opportunities measured in the
[repetition evaluation](repetition-evaluation.md).

## Reuse from the saved baseline

The run's reconciled baseline had 68 actions. Comparing each action's complete
JSON with the final artifact, ignoring object-key order but preserving array
order, gives:

| Disposition               | Actions |
| ------------------------- | ------: |
| Carried forward unchanged |  **50** |
| Existing actions changed  |  **18** |
| New actions added         |  **11** |
| Actions removed           |   **0** |

The 18 changed plus 11 new action IDs exactly match the independently recorded
`ux-changed-records.json` ledger. These counts therefore agree with the run's
saved change evidence, not merely its narrative summary.

The comparison is against `reconciled-base-ux.json`. The earlier raw artifact used
schema 0.3 and required reconciliation during this run; all 68 old action objects
differ from that raw artifact. Consequently, **50 unchanged actions** means
unchanged from the reconciled baseline, not byte-identical reuse of the old-schema
file. Neither equality nor references prove that an agent spent zero time reading
or reserializing those records.

## Method and evidence

Frame counts use only `interactionFrames[].regions[].affordances[].actionRef`.
Flow counts use only primary and alternate `steps[].actionRef`. Distinct frame
and flow IDs establish reuse across those units. Task indexes, feedback ownership,
pruning decisions, focus/trigger references and UI projections are excluded to
avoid inflating the count. Every counted reference resolves to an action definition.

[Metrics](full-run-action-reuse-metrics.json) retain the source hashes, complete
per-action use locations, count distributions, baseline classifications and ledger
comparison. The local read-only analysis is
`.codex-tmp/action-reuse-count-20260927/count.mjs`. No product mutation, new agent
run or new performance estimate was required.
