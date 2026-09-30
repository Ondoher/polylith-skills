# Wireframe/UI pilot

Implements the [experiment plan](../../wireframe-ui-pilot-plan.md) using the saved
Alexa UX update. The two design authors have persistent native Codex threads:
wireframe Sol/medium and UI Astra/ultra. The coordinator resumes the UI thread for
each immutable ready wireframe while the wireframe author continues. Independent
wireframe and visual reviewers run only after the authoring happy path.

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

# Separate review and targeted rework after the happy path
node planning/refinement-efficiency/experiments/wireframe-ui-pilot/run.mjs --execute --review
```

`--attempt=<name>` selects a separate private experiment directory beneath
`.codex-tmp/`; the default is `wireframe-ui-pilot-20260930`. Check the saved state
and any still-running process before resuming. Run one coordinator per attempt.
All source artifacts and live Alexa files are hash-checked; new output remains
within the disposable workspace. Saved model transcripts, capabilities and input
contents are private and are not committed with the public report.

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
- `run.mjs`: independent authors, ready queue, screenshots and later exact-version
  review/rework. Successful completed reviews are reused on continuation.

[The rendering contract](render-contract.md) includes small examples. Mechanical
readiness never becomes a canonical UX review pass. All previews disclose that
the saved source UX remains unreviewed. Ordinary controls stay static examples;
the prototype is not implemented application behavior.

## Local verification

```powershell
node --test --test-isolation=none planning/refinement-efficiency/experiments/wireframe-ui-pilot/native-client.test.mjs planning/refinement-efficiency/experiments/wireframe-ui-pilot/render.test.mjs planning/refinement-efficiency/experiments/wireframe-ui-pilot/pilot.test.mjs
```

These tests exercise rendering, incremental storage, exact-handle handoff and
client lifecycle using local fixtures/mocked client processes. They do not
measure design-agent performance. Author/reviewer measurements come only from
the actual native sessions and append-only experiment events. Report shared
setup once, per-element work separately and overlap explicitly; neither model
wall time nor tool-command generation is a measurement of pure reasoning.
