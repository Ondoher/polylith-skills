# Descriptive wireframe/UI experiment harness

This directory holds isolated experiment evidence and deterministic helpers for
the [test plan](../../descriptive-wireframe-ui-test-plan.md). The
[render contract](./render-contract.md) defines the shared author envelope,
supported scene vocabulary, marker commands, and render/capture commands.
It does not change production workflows or execute model calls.

Run focused verification from the repository root:

```powershell
node --test --test-isolation=none planning/refinement-efficiency/experiments/descriptive-wireframe-ui/harness.test.mjs
```

The browser case reuses installed Edge and skips explicitly when unavailable.
Capture output contains `preview.html`, `render.json`, bounded screenshot PNGs,
disposable inspection HTML, per-page geometry JSON, and `captures.json`. Inspect
all screenshot pages. Revision directories belong under
`.codex-tmp/descriptive-wireframe-ui-<run>/`; retained input manifests, source gaps,
review evidence, central `events.jsonl`, metrics and reports belong here.

Render and capture accept `--events <central-file> --run <run-id> --stage <stage>`.
Without `--events`, rendering saves events in its output directory. `mark` requires
an events path. Mark encompassing dispatch windows separately from agent stages;
use `details.actor` and `details.round` to distinguish nested authors/review rounds.
Custom phases are preserved in the raw evidence. Pair `start`/`end` (or
`start`/`authoring-end`) or
`dispatch`/`observed-completion` consistently when producing interval summaries.

After authoring, the `receipt` command saves mechanical provenance automatically:

```powershell
node planning/refinement-efficiency/experiments/descriptive-wireframe-ui/harness.mjs receipt --input <layout.md-or-scenes.json> --output-dir <author-directory> --events <central-events.jsonl> --run <run-id> --stage <author-stage> --requested-model <model> --requested-effort <effort> --notes <brief-notes.md>
```

`author-receipt.json` records exact artifact bytes/hash, matching UTC markers,
requested settings, notes reference, and the shared frozen manifest reference.
JSON artifacts also supply declared scene IDs/action count. Actual model/effort
remain null; receipts make no semantic approval claim. Keep author notes brief;
the helper supplies provenance so authors need not manually copy hashes or events.

```powershell
node planning/refinement-efficiency/experiments/descriptive-wireframe-ui/harness.mjs summarize --events <central-events.jsonl> --output-dir <metrics-directory>
```

`metrics.json` retains all markers, completed tool calls with durations and artifact
sizes, observed stage windows, overlaps and unclosed starts. It deliberately does
not add overlapping windows into an overall duration. Request-to-approval timing,
review results, dispatch settings, clarification counts, and unavailable host token
metrics must be recorded by the experiment coordinator from actual evidence.

Both final UI paths render through the same library. The candidate description
remains Markdown until its UI author constructs a final envelope. Store source
uncertainty and provisional decisions in the frozen packet and author/reviewer
notes; experiment labeling stays in preview-page chrome outside app canvases.
