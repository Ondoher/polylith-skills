# Multi-read contract experiment

Compare the same 1,248-byte contract inline versus loaded from a local skill.
The prototype skill is experiment-owned; it is not a managed package or global
installation. Both isolated workspaces contain the same discoverable skill.

The harness configures one CLI worker from the unchanged `ux-planner.toml`
developer instructions, model and reasoning setting. It first loads mandatory
UX guidance and the single-pass route, then resumes the same thread with one
bounded wave. There is no model supervisor or extra worker. The recorded role
setting and actual outgoing reasoning setting are reported separately.

Each condition receives four mechanically verified pages from saved facts and
four from saved UX, totaling 224,000 bytes. Shared access is supplied once;
arguments and expected bytes match. The eight known offsets come from actual
service continuations. No product reasoning, output authoring, review, assembly,
persistence or live mutation is allowed in this collection test.

Success requires eight native reads in one model response, all expected pages
intact, no duplicate or unrelated calls, and an honest completion marker.
Incomplete and serialized executions are retained failures, not transport
successes. Skill loading and all collection-turn client overhead remain timed.

Run one matched pair first, sequentially. Repeat twice only if the skill shows
promising contract compliance; alternate order to limit simple order effects.
If both serialize, stop and report that packaging did not solve the problem.
Only consistent collection success justifies a subsequent first-pass UX trial;
that trial must stop at initial output delivery under the owner-selected scope.

Commands (choose new attempt names to preserve evidence):

```text
node --use-system-ca planning/refinement-efficiency/experiments/multi-read-skill/run.mjs --condition=inline --attempt=preflight-01 --smoke
node --use-system-ca planning/refinement-efficiency/experiments/multi-read-skill/run.mjs --condition=inline --attempt=inline-01
node --use-system-ca planning/refinement-efficiency/experiments/multi-read-skill/run.mjs --condition=skill --attempt=skill-01
python -X utf8 planning/refinement-efficiency/experiments/multi-read-skill/analyze.py inline-01
python -X utf8 planning/refinement-efficiency/experiments/multi-read-skill/analyze.py skill-01
```

This is a local evidence replay: it reuses the existing saved Alexa input
manifest, service observer and runtime collector under `.codex-tmp`, plus the
installed CLI. It is not a standalone benchmark package. Raw product data,
capabilities and prompts remain ignored. Public reports contain metadata only.

The two workers load the same governing instructions but can generate different
preparation histories. Report preparation separately; do not attribute every
elapsed-time difference to skill packaging. A single pair cannot establish a
stable latency distribution. A model's claim that batching is unavailable must
be checked against tool exposure and request flags rather than accepted as fact.
