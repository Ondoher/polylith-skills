# Multi-read skill versus inline contract

Status: complete. **Neither condition batched the eight requested native reads.**
The skill packaged a reusable contract and the agent reported its violation, but
skill invocation did not enforce parallel execution in this test. Stop after the
first matched pair under the agreed decision rule; no repeats or larger UX run.

## What ran

Two isolated CLI workers loaded the unchanged `ux-planner.toml` developer
instructions and their mandatory guidance. Each then resumed in a separate
collection turn. There was no extra model supervisor. Both workspaces contained
the same discoverable 1,248-byte `multi-read` skill. The inline arm received that
exact text in its assignment; the skill arm received the skill invocation and
path, and read the complete file once.

Each manifest requested the same eight known pages: four from saved Alexa facts
and four from saved UX, 28,000 bytes each, totaling 224,000 bytes. The supervisor
mechanically verified actual continuation offsets and expected bytes before
dispatch. Model, role, contract, inputs and page limits matched. Assigned
capabilities permitted result delivery and reading the supplied handles; there
was no canonical mutation authority.

Both workers recorded `ultra` from the UX role configuration. Outgoing selected
model requests reported `xhigh` for both. We preserve both observations rather
than claiming a different measured effort. Native tools were exposed and all
actual collection requests carried `parallel_tool_calls: true`.

This was collection only. No UX reasoning/authoring, independent review, rework,
assembly, persistence, UI or publication ran. All 611 protected live files were
unchanged in preflight and both trials.

## Results

| Measurement                                               | Inline contract | Skill-loaded contract |
| --------------------------------------------------------- | --------------: | --------------------: |
| Common-role preparation                                   |        92.551 s |             126.917 s |
| Preparation bounded-read calls                            |               9 |                    11 |
| Collection turn, including startup/loading/final response |        58.044 s |              68.210 s |
| Requested pages delivered                                 |          2 of 8 |                8 of 8 |
| Calls in each read-producing model response               |               1 |                     1 |
| Collection model generation requests                      |               4 |                    12 |
| Collection tool calls                                     |               2 |                    10 |
| Duplicate or unexpected product reads                     |               0 |                     0 |
| Exact returned-page verification                          |        2 passed |              8 passed |
| Parallel-contract result                                  |          Failed |                Failed |

The inline worker made two serial reads, then returned `NOT READY`, identified
the deviation and left six pages unread. It claimed native parallel launch was
unavailable. That claim is not established: the trace shows native reads and an
enabled outgoing parallel flag. It did not substitute another transport.

The skill worker read the complete contract once and delivered all eight pages
through eight separate model responses. It then stored its data-ready marker and
returned `READY` with an explicit serialization deviation. The external verifier
correctly recorded **contract failure despite complete data retrieval**.

Do not compare 58.044 versus 68.210 seconds as a speed ratio: one condition
stopped after two pages and the other collected eight. The independently
generated preparation histories also differed even though the same role and
required guidance governed both. One pair cannot establish a latency distribution.

## Skill-loading observations

The skill read required one `exec_command` call:

- Command arguments: 190 bytes; returned output: 1,354 bytes including the tool envelope.
- Observed command-output stream: **1.910 seconds**.
- Tool execution/return interval: **0.483 seconds**.
- Complete skill text was present in the returned output, with no second read.

These identify two measured pieces of loading cost, not its entire causal cost.
Dispatch to execution of the first data read took 17.858 seconds in the skill
arm, including client startup, the skill read, model processing, intervening gaps
and first-read command generation. The corresponding inline interval was 16.256
seconds, but a single unequal-work pair cannot attribute the difference solely
to skill loading. No separate agent was launched to execute the skill.

The eight data reads themselves totaled **5.376 milliseconds of internal MCP
service work**, while the interval from the first read's execution to the last
read's return spanned **42.112 seconds**. Most of that interval lies between
server operations, not inside the service. The raw observations and runtime
extract preserve command streams, tool intervals and model-response identities.

## Decisions and implementation notes

- Keep the skill as an experiment-owned prototype. It was staged only in each
  disposable workspace; no global installation or managed-package addition ran.
- Use the maintained native launcher and observation service. Do not change the
  model, client output limits, role instructions, authentication or production MCP.
- Separate preparation from the bounded collection turn so common instruction
  discovery is visible without being labeled skill overhead.
- The first harness treated an absent completion marker as a script error after
  the inline client exited normally. Its original error is retained. The recorded
  client phase already had an exact completion timestamp; that timestamp was
  copied to the overall timing boundary for analysis, explicitly annotated.
  The harness now records this expected negative test outcome as
  `collection-incomplete`; it does not launch repairs or hide the failed contract.
- Preserve the first pair and stop. The agreed follow-up condition was promising
  batching; neither arm met it. No extra paid trials or full UX pass were justified.

The outcome supports the skill as one maintained place for rules and deviation
reporting. It does **not** demonstrate stronger behavioral enforcement or a
batching speedup. Actual response grouping remains the pass/fail evidence; a
skill name, an enabled flag, or a `READY` message cannot replace that check.

## Evidence and verification

[Combined metrics](multi-read-skill-20260929-metrics.json) retain both outcomes,
page hashes, response groups, per-call timings, usage, markers, configuration
digests and local evidence paths. No capabilities, raw prompts or product
payloads are included. Raw evidence remains under
`.codex-tmp/multi-read-skill-20260929/`.

The [experiment README](experiments/multi-read-skill/README.md) documents the
reusable commands and test boundaries. The analyzer and summarizer regenerate
the report metadata from retained evidence without new model calls.

The skill validator and no-model MCP preflight passed. Both completed client
turns were analyzed, every returned data page was verified exactly, input/role/
contract identities matched, and live protection checks passed. Launcher syntax,
Python syntax, formatting and Git whitespace checks passed. No broad application
test or engineering-review pass was needed for these isolated experiment files.
