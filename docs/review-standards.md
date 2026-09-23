# Review Standards

For a step-by-step setup and configuration walkthrough, see [Working with review agents](review-agents.md), including agent responsibilities, review timing, and worked local-rule examples.

Use this skill to coordinate specialist reviews of a task or selected paths against engineering rules assigned to their folders. It owns the dedicated standards reviewers and optional checkpoint adviser's lifecycle.

## Use it

```text
Use $review-standards to review the changes for the current task.
```

Name paths or an explicit scope when needed. Pre-existing dirty work is normally recorded as the baseline rather than silently included.

## Review process

The workflow resolves each file's canonical standards and overlays, then selects relevant lanes: architecture, contracts, UI, verification, and privacy/security. A rule assigned to one folder is not automatically applied to every other reviewed file.

Reviewers produce evidence against applicable rules, with independent lane audits. A deterministic ledger validator derives the aggregate result. Passing tests or reassuring reviewer prose cannot substitute for missing evidence.

Reviewer threads are read-only. The parent workflow may refresh `STANDARDS.md`, prepare the narrowly ignored review-artifact directory, and persist evidence under `.codex-tmp/review-standards/`.

## Prerequisites and modes

Startup requires valid installed reviewer definitions, current calibration, a durable initial normalization marker, and valid current mappings. Formatting problems do not prevent inspection, but prevent a final `CLEAN` result or positive checkpoint recommendation.

| Mode | Purpose |
| --- | --- |
| `bootstrap` | Initialize eligible reviewers from folder assignments. |
| `topic-refresh` | Reload context after the governing topic changes. |
| `review` | Review the task or selected paths. |
| `setup reviewers` | Inspect and propose reviewer installation or repair. |
| `setup formatting` | Inspect and propose formatting setup. |
| `checkpoint-advisor evaluate` | Assess checkpoint readiness. |
| `checkpoint-advisor monitor` | Enable session advice when explicitly requested. |

Setup changes require applicable authorization. Adviser monitoring can also be suspended, restarted, or queried for status. The adviser recommends checkpoints; `check-point` handles commit proposals and acceptance separately.

[Operational instructions](../skills/review-standards/SKILL.md) · [Normalization](normalize-standards.md) · [Checkpointing](check-point.md) · [All skills](../README.md)
