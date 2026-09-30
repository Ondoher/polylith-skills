# Wireframe/UI pilot

Implements the [reliability plan](../../wireframe-ui-reliability-plan.md) using the
saved Alexa UX update. Persistent native Codex threads are wireframe Sol/medium
and UI/reviewers Astra/ultra. Authors preview, inspect and submit. Independent
wireframe acceptance is mandatory before UI dispatch. Independent element
pipelines overlap through one queue per role; selected dependencies go first.

The localhost service is the repository MCP **data service**, not a model proxy.
No model endpoint override or request-observer proxy is used. Launches go through
the installed Codex executable and its normal authentication. Role instructions
are bounded experiment assignments; global agent configurations are unchanged.

## Run and resume

From the repository root:

```powershell
# Local preparation only, without model calls
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/run.mjs

# Wireframes and UI for the complete affected set, with early per-element output
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/run.mjs --execute

# Resume saved authors and completed previews after a repair/interruption
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/run.mjs --execute --resume

# Run one bounded acceptance trial, then reuse it in the complete set
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/run.mjs --execute --attempt=wireframe-ui-reliability-20260930 --elements=timeline-add-dialog
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/run.mjs --execute --resume --attempt=wireframe-ui-reliability-20260930 --elements=all
```

`--attempt=<name>` selects a separate private experiment directory beneath
`.codex-tmp/`; the default is `wireframe-ui-pilot-20260930`. Check the saved state
and any still-running process before resuming. Run one coordinator per attempt.
All source artifacts and live Alexa files are hash-checked; new output remains
within the disposable workspace. Saved model transcripts, capabilities and input
contents are private and are not committed with the public report.

Review continuation reuses exact-version findings. Repaired wireframes are
reviewed before updating their dependent UI. Three distinct review revisions per
element, role and source/render contract bound the experiment across resumes;
unresolved findings produce an explicit
`review-incomplete` result, never an approval. Later independent elements still
continue. The parent returns a screenshot with a ready contribution when capture
succeeds, so authors inspect it without creating browser scripts.

## Small contract

- `prepare.mjs`: assemble saved UX units; derive changed flows, actions and frames;
  preserve original/current inputs and the authoritative design-language JSON.
- `PilotStore.mjs`: experiment operations registered in the existing scoped MCP
  service. Authors submit changed parts, scenes or node fields progressively.
  Code assigns revisions and materializes the complete preview.
- `render.mjs`: adapt native UI parts, scenes, layout primitives and inline
  rendering to neutral wireframes and designed component previews.
- `native-client.mjs`: normal client launch/resume, role ownership, private logs,
  elapsed timings and available usage/settings metadata.
- `run.mjs` and `reviewed-pipeline.mjs`: progressive drafts, inspected submissions,
  screenshots and exact-version review before UI dispatch. Matching reviews are
  reused on continuation; contract changes require renewed inspection/review.
- `analyze.mjs`: derive phase, overlap, queue, contribution and review measurements
  from saved events. Usage remains per-invocation snapshots because cumulative
  thread-count semantics have not been established.
- `gallery.mjs`: link the saved wireframes and comps without regenerating them.
- `analyze-reviewed.mjs`: report the revised pipeline's invocations, nested input
  windows, local previews, submissions, review findings and contract-refresh work.

After an execution or continuation:

```powershell
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/analyze.mjs --attempt=wireframe-ui-pilot-20260930
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/gallery.mjs .codex-tmp/wireframe-ui-pilot-20260930
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/analyze-reviewed.mjs .codex-tmp/wireframe-ui-reliability-20260930 planning/refinement-efficiency/wireframe-ui-reliability-20260930-metrics.json
```

The analysis writes `metrics.json` and `report.md` inside the private attempt;
the gallery writes its `index.html`. The committed execution report distinguishes
first previews from later corrections and review outcomes.

[The rendering contract](render-contract.md) includes small examples. Mechanical
readiness never becomes a canonical UX review pass. All previews disclose that
the saved source UX remains unreviewed. Ordinary controls stay static examples;
the prototype is not implemented application behavior.

## Local verification

```powershell
node --test --test-isolation=none planning/refinement-efficiency/experiments/wireframe-ui-pilot/native-client.test.mjs planning/refinement-efficiency/experiments/wireframe-ui-pilot/render.test.mjs planning/refinement-efficiency/experiments/wireframe-ui-pilot/pilot.test.mjs planning/refinement-efficiency/experiments/wireframe-ui-pilot/analyze.test.mjs
```

These tests exercise rendering, incremental storage, exact-handle handoff and
client lifecycle using local fixtures/mocked client processes. They do not
measure design-agent performance. Author/reviewer measurements come only from
the actual native sessions and append-only experiment events. Report shared
setup once, per-element work separately and overlap explicitly; neither model
wall time nor tool-command generation is a measurement of pure reasoning.
