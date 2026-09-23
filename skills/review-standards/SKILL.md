---
name: review-standards
description: Initialize and run focused read-only review agents against normalized folder-mapped global and repository standards, including bootstrap/context refresh, formatting setup, and optional semantic checkpoint advice.
---

# Review Standards

Orchestrate standards reviewers without allowing reviewer threads to edit files or Git state. Read the approved [design](../../planning/review-agents/design.md) for detailed contracts and failure behavior.

## Select The Mode

- `bootstrap`: validate eligibility and initialize the reviewer roster from all folder assignments.
- `topic-refresh`: invalidate stale work context after an active-topic or explicit work-context change, then reload the roster. Topics do not change standards applicability.
- `review`: review the current task unit or engineer-selected paths using their folder mappings.
- `setup reviewers`: inspect and, after explicit authorization, install or repair global reviewer definitions.
- `setup formatting`: inspect and propose repository-local Prettier setup or repair.
- `checkpoint-advisor evaluate`: perform one checkpoint-readiness evaluation.
- `checkpoint-advisor monitor`: activate event-driven advice for this session.
- `checkpoint-advisor suspend`, `restart`, or `status`: control the active session adviser.

Ordinary installation does not activate reviewers. Bootstrap and review may be invoked by `AGENTS.md`. The checkpoint adviser additionally requires an explicit engineer request or a bootstrap instruction naming it.

## Load Authority And Resolve Paths

Resolve the Codex and repository roots. Read applicable `AGENTS.md`, work-context topics, `agents/topics/standards/manifest.md`, `agents/topics/standards/overlay.md`, and only the canonical standards required by the resolved paths and lanes.

Treat canonical `documentation.md` as the sole governance reference. Topics, reconciliation reports, `STANDARDS.md`, prompts, and agent memory never select or modify standards.

Validate and resolve the folder configuration with:

```text
node <this-skill>/scripts/folder-standards.mjs --repo <repository-root> [--path <repository-relative-file> ...]
```

The manifest defines named standards sets and folder assignments. For each file, the longest matching folder assignment selects one set; expand its inheritance chain. Apply every matching `ADD`. For a target with several matching `REPLACE` entries, use the longest folder scope; repository scope is least specific. A local rule applies only when the file's selected set contains its target standard.

Use the repository's declared folder configuration as authority. Reviewers do not infer additional standards from file contents or require reconciliation because a capability appears to be absent from a selected set. The engineer may edit the manifest or overlay directly when applicability should change.

## Define The Review Unit

Record the starting commit, initial staged/unstaged/untracked paths, initial patch fingerprint, task-modified paths, and current patch fingerprint. Pre-existing dirty work is the bootstrap baseline unless the engineer selects it. Supply identical baseline and explicit untracked-file scope to every reviewer.

Map every review-unit path independently. Group files by reviewer lane and applicable canonical standards. A standard assigned for one folder does not become applicable to unrelated paths merely because the same reviewer receives them; supply the per-path mapping.

## Reviewer Infrastructure Gate

Before repository eligibility checks, verify that the skill helpers and these global read-only definitions exist and identify their expected roles: `architecture-reviewer.toml`, `contracts-reviewer.toml`, `ui-reviewer.toml`, `verification-reviewer.toml`, `privacy-security-reviewer.toml`, and `checkpoint-advisor.toml`. Every definition must pin `model = "gpt-5.6-terra"`. Architecture, UI, and privacy/security must pin `model_reasoning_effort = "medium"`; contracts, verification, and checkpoint advice must pin `model_reasoning_effort = "low"`. Do not inherit either setting from the parent session. Missing, invalid, or differently configured infrastructure blocks startup. Validate these pins with the `infrastructure` function used by `review-ledger.mjs`; cached runtime roles must also use the requested effort.

`setup reviewers` inventories and proposes exact repairs, including the required model and reasoning pins. Obtain explicit authorization before writing outside the repository. Definitions contain durable role contracts, never copied repository standards. Validate them after installation.

## Startup Eligibility Gates

Before spawning any reviewer or checkpoint adviser:

Run `node <this-skill>/scripts/reviewer-calibration.mjs readiness` first. Missing or stale recorded calibration blocks startup. Setup calibration agents may run solely against synthetic fixtures to repair this gate; they cannot issue repository-compliance results.

1. Run `node <codex-root>/skills/normalize-standards/scripts/standards-attestation.mjs validate --repo <repository-root>`. This verifies only that the repository successfully normalized at least once; it does not compare current standards files with their historical contents.
2. Run the folder helper without paths to validate sets, assignments, and overlay syntax.
3. Validate that every canonical link used by any set resolves beneath `<codex-root>/documentation/standards` as part of resolving current review inputs. A malformed current mapping blocks that review because it cannot be interpreted, but it does not revoke prior normalization or require reconciliation.
4. Run `write-standards-guide` in write mode. The review workflow has standing authority to create or refresh only root `STANDARDS.md` from current repository and canonical hashes.
5. Run `node <this-skill>/scripts/review-ledger.mjs setup-artifact-root --repo <repository-root>`. The review workflow has standing authority to create `/.codex-tmp/` and, when it is not already ignored, append the exact `/.codex-tmp/` entry to the root `.gitignore`. Do not make any other repository edit under this authority.

Any startup-gate failure blocks the entire run. There is no bypass. Directly requested reviewers repeat the startup gates before inspection.

## Formatting Diagnostic And Completion Gate

During bootstrap and topic refresh, run `node <this-skill>/scripts/format-preflight.mjs --repo <repository-root>`. When setup is valid, also run `npm run format:check` from the repository root with `NPM_CONFIG_OFFLINE=false` and applicable trust-store instructions. Report either failure as a formatting warning and continue starting reviewers and the opted-in checkpoint adviser.

Formatting does not block reviewer inspection, evidence preparation, findings, or readiness. It is required only for a final aggregate `CLEAN` result and for `CHECKPOINT_RECOMMENDED` or `CHECKPOINT_URGENT`. `review-ledger.mjs prepare` diagnoses formatting without failing. `review-ledger.mjs validate` records formatting state; when semantic review is otherwise clean, formatting failure changes the aggregate result to `INCOMPLETE`. When validated review findings exist, retain `FINDINGS_PRESENT` and report the formatting failure separately.

At task start, create a unique evidence directory with `review-ledger.mjs create-session --repo <repository-root>`. It performs the same narrow ignore/root repair when necessary. Store the baseline, generated request, primary reports, audit reports, and optional validation result only beneath that returned repository-local `.codex-tmp/review-standards/session-*` directory. Never place review artifacts outside the current repository or elsewhere in the working tree. The helpers reject other artifact paths. Specialist reviewer threads remain read-only; the parent orchestrator owns this setup mutation and artifact persistence.

During bootstrap, report all independently detectable startup failures, state that no reviewer started when any exists, and print only applicable blocking recovery commands in this order:

1. `$review-standards setup reviewers`
2. `$normalize-standards audit`, manual divergence review, then `$normalize-standards reconcile` only when the repository has never normalized or its durable marker is invalid
3. `$bootstrap`

Do not suggest reconciliation without audit and manual review.

Report formatting recovery separately without calling it a bootstrap blocker: use `$review-standards setup formatting` for missing or invalid setup, or `npm run format:check` for a failed check, with `npm run format` offered only as a separately authorized write.

Formatting setup inventories package, lock, Prettier, EditorConfig, ignores, generated paths, and dirty work before proposing exact changes. Obtain authorization before installation, configuration, or formatting. Require direct root `prettier`, repository-owned configuration, `.prettierignore`, and exact `"format:check": "prettier --check ."`. Never modify Git state. After remediation, rerun the diagnostic; recapture the review baseline only when remediation changed repository files.

## Select And Run Reviewers

Use installed agents by coherent concern:

- `architecture-reviewer`: architecture, Polylith, ReMVC, server boundaries, and app shells.
- `contracts-reviewer`: types, JSDoc, public contracts, and validation boundaries.
- `ui-reviewer`: React, MUI, base components, accessibility, localization, and UI behavior.
- `verification-reviewer`: behavioral coverage, test placement, runners, and verification evidence.
- `privacy-security-reviewer`: privacy, PII, authorization, secrets, schema, persistence, identity, notifications, and `data-persistence.md`.

At bootstrap, initialize lanes from the union of standards used by all folder assignments and wait for readiness. This is not a repository-wide audit.

For every task review and final handoff, read and execute [the evidence ledger protocol](references/evidence-ledger.md). Capture the task baseline, generate the complete per-path rule inventory with `review-ledger.mjs prepare`, collect each required primary ledger and independent lane audit, and run `review-ledger.mjs validate`. Missing or rejected evidence blocks a compliance handoff. A test-suite pass is not a substitute. The gate, not a reviewer's prose, derives the aggregate status. Explicit user-directed stopping still permits an honest incomplete handoff.

Apply that contract equally to every lane. Architecture, REMVC and Polylith require the same complete evidence and independent audit as React; UI or verification success cannot compensate for an incomplete architecture review. Reasoning-based boundaries remain mandatory even when no static checker can decide them.

For review, assign complete canonical files and the exact paths to which each applies. Reviewers read assigned standards completely, inventory actionable sections, and evaluate every in-scope path against its mapped rules. Focus areas and prior findings add emphasis but never narrow coverage. Overlapping concerns intentionally run in each owning lane.

Run independent lanes concurrently when capacity permits. A missing, failed, stale, or blocked lane makes the aggregate incomplete or blocked. Consolidate duplicate findings by standard, file, symbol/location, and violation kind. Sort blocking, important, then advisory. The parent owns fixes and reruns affected lanes.

## Context Fingerprints And Lifecycle

Compute fingerprints only with:

```text
node <this-skill>/scripts/review-context-fingerprint.mjs --lane <agent-name> --repo <repository-root> --codex-root <codex-root> [--repo-input <path> ...] [--codex-input <path> ...]
```

Inputs include applicable `AGENTS.md`, work-context routing and routed topics, the manifest, overlay, and every canonical standard assigned to the lane. The fingerprint protects both work context and folder standards configuration; it does not give topics standards authority.

A manifest, overlay, assigned canonical standard, instruction, or review-unit path change invalidates affected in-session readiness and results. Refresh `STANDARDS.md`, remap paths, recompute lanes and fingerprints, refresh applicable agents, and stop routing to removed lanes. These changes do not invalidate the repository's one-time normalization marker.

On an active-topic or explicit work-context change, use `topic-refresh`: invalidate context fingerprints, reload routed context, rerun gates, and refresh agents. Standards mappings still come only from file paths. With no task changes, return readiness without findings.

There is no filesystem watcher. Lifecycle behavior is event-driven by the parent.

## Checkpoint Adviser

The adviser returns exactly `NOT_READY`, `CHECKPOINT_RECOMMENDED`, or `CHECKPOINT_URGENT`, with reasoning, semantic scope, blockers or unrelated changes, verification evidence, and repository fingerprint. It evaluates the complete repository state because `$check-point` stages all changes. It never invokes `$check-point`, drafts the final message, stages, commits, or requests Git-write approval.

At initialization it may run startup eligibility helpers and receive formatting diagnostics without blocking activation. At each checkpoint evaluation it must run the formatting preflight and `format:check`; either failure returns `NOT_READY`. It inspects existing evidence but does not run builds, tests, generators, installers, or other commands that can write files.

One-shot `evaluate` ends after its result. Monitoring consults it after coherent slices, relevant verification, context transitions, before risky work, and before final handoff, suppressing duplicate advice for an unchanged fingerprint.

Track `inactive`, `active`, `suspended`, `restarting`, or `blocked`. Suspension interrupts and invalidates an in-flight adviser and ignores events without queueing. Restart is valid only after suspension in this session: rerun gates, reload durable context and folder mappings, create a fresh thread, and evaluate immediately. Status reports state without spawning. Session suspension does not alter durable bootstrap opt-in.

## Finding Contract

Each finding contains:

```text
Severity:
Location:
Standard:
Repository overlay considered:
Evidence:
Consequence:
Smallest compliant remedy:
Confidence:
```

Clean and findings-present results also contain:

```text
Coverage:
- Reviewed paths and folder sets: <complete supplied mapping>
- Standards checked: <canonical file and section list>
- Not applicable: <section and scope-based reason, or none>
```

A `CLEAN` result is valid only after complete mapped-rule evaluation, independent audit, and exit-0 validation of the generated request and report ledgers. The prose finding and coverage fields supplement the machine-readable evidence ledger; they cannot replace it. Report aggregate state as clean, findings-present, incomplete, or blocked.
