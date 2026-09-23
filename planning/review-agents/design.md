# Review Agents Design


## Goals

The review-agent system provides consistent, standards-driven review across repositories while preserving repository-specific decisions. It:

- selects canonical standards by repository folder rather than topic;
- supports reusable named sets and more-specific nested-folder assignments;
- applies repository and folder-scoped `ADD` and `REPLACE` entries;
- blocks reviewer startup until structural standards gates pass and reserves formatting as a clean-completion gate;
- divides review among focused read-only agents;
- initializes applicable reviewers on bootstrap;
- refreshes work context without allowing topics to alter standards; and
- reconstructs authority and scope from durable files after context loss.

## Non-goals

- Continuous filesystem monitoring.
- Editing code from reviewer threads.
- Topic-selected or topic-excluded standards.
- Glob-order or manifest-order precedence.
- Copying standards into prompts, agent definitions, or topics.
- Replacing formatting, tests, type checks, or security tooling.
- Auditing application code during standards normalization.

## Authority

Canonical [`documentation.md`](../../documentation/standards/documentation.md) exclusively defines folder manifests, set inheritance, overlay syntax, scope matching, and precedence. This design owns reviewer execution.

Each review reconstructs:

1. Applicable Codex and repository instructions.
2. Product/work context routed through the active topic.
3. The folder standards manifest.
4. The repository overlay.
5. Canonical standards selected for each reviewed path.
6. The review baseline and changed-file scope.

Topics are context and evidence only. They cannot select, exclude, add, or replace standards.

## Repository Configuration

```text
repository/
├── AGENTS.md
└── agents/topics/
    ├── active-topic.md
    └── standards/
        ├── manifest.md
        ├── overlay.md
        ├── reconciliation.md
        └── normalization.json
```

The manifest declares named standards sets and assigns them to directory prefixes. The root `.` assignment is mandatory. The longest matching folder assignment selects one set for each file; the set's inheritance chain supplies its complete canonical standard list.

The overlay uses only `repository` and `folder:<path>/` scopes. Additions accumulate. For one file and canonical target, the longest matching folder replacement wins. Duplicate equal-scope replacements and semantic conflicts block normalization.

## Deterministic Helpers

The shared `normalize-standards/scripts/standards-config.mjs` module parses manifests and overlays and owns path-resolution semantics. Other skills consume this module rather than independently interpreting prose.

`review-standards/scripts/folder-standards.mjs` returns:

- parsed named sets and inheritance;
- folder assignments;
- the winning assignment and expanded standards for every requested path; and
- matching additions and most-specific replacements per path and standard.

`review-standards/scripts/review-context-fingerprint.mjs` hashes the lane name and complete durable input list. Topics may be included because they affect product context, but they never affect standards resolution.

## Calibration gate

The active calibration-record.json binds saved primary and audit fixture reports
to the reviewer configuration and helper bytes. Readiness is checked at startup
and by review-ledger prepare and validate. Historical backup records have been
removed. The retained record passes readiness; its original execution provenance
has not been independently established in this cleanup and remains a separate
planned investigation. Do not rewrite its hashes to bypass the gate.

## First-Normalization Gate

Successful first reconciliation creates `agents/topics/standards/normalization.json`. It permanently records that the repository completed deliberate standards normalization. Initial input hashes may remain as provenance, but validation does not compare them with current files. Later instruction, manifest, overlay, or canonical-standard changes never make the marker stale.

First normalization requires:

- one valid root folder assignment;
- valid, acyclic set inheritance;
- canonical links that agree for repeated standards;
- existing assigned folders and overlay-scoped folders;
- no topic standards controls;
- valid section-specific overlay targets within the union of named sets;
- no unresolved divergence, ambiguity, or deferred decision; and
- no competing repository standards authorities.

Before spawning reviewers, preflight validates only the durable completion marker for normalization eligibility. It then parses the current folder configuration and resolves canonical links because those inputs are required to perform the review. A malformed current configuration blocks interpretation of that review but does not revoke normalization or require reconciliation.

There is no bypass for a repository that has never normalized. A directly invoked dedicated reviewer repeats the structural startup checks. Formatting does not block inspection.

## Formatting Diagnostic And Completion Gate

The repository root must provide:

1. A valid `package.json`.
2. Direct project `prettier` development dependency.
3. Installed project-local Prettier executable.
4. Explicit repository-owned configuration.
5. Exact `"format:check": "prettier --check ."` script.
6. A successful `npm run format:check`.

Bootstrap and topic refresh diagnose these requirements but do not block reviewer or opted-in checkpoint-adviser startup when they fail. Task review and evidence preparation also proceed so concrete findings are not lost behind formatting noise.

A final aggregate result may be `CLEAN` only when all six requirements pass. The checkpoint adviser returns `NOT_READY` when they fail. When semantic findings exist, validation retains `FINDINGS_PRESENT` and reports formatting separately; when semantic review is otherwise clean, formatting failure makes the result `INCOMPLETE`.

Setup and repository formatting require separate engineer authorization. Reviewers remain read-only and never perform remediation.

## Review Unit And Path Mapping

Review evidence is operational repository-local state. The review workflow has standing authority to create `/.codex-tmp/` and append the exact `/.codex-tmp/` entry to the root `.gitignore` when Git does not already ignore it. This authority permits no other repository mutation. Each task review creates a unique `.codex-tmp/review-standards/session-*` directory and keeps its baseline, request, primary and audit reports, and validation result there. Specialist reviewer agents remain read-only; the parent owns the narrow setup edit and ignored artifacts. Review output must not be written outside the current repository.

At task start, the parent records the starting commit, initial staged/unstaged/untracked paths, initial patch fingerprint, task-owned paths, and current fingerprint. A commit alone is insufficient for an already-dirty worktree.

Every review-unit file is mapped independently:

```text
file path
  → longest ancestor folder assignment
  → named set
  → expanded canonical standards
  → matching folder overlay rules
  → owning reviewer lanes
```

Moving a file can change its applicable standards without changing its contents. Deleted files retain their former repository-relative path for mapping. Untracked paths are supplied explicitly.

Reviewers may inspect full files and read-only Git state, but findings are attributable to the declared review unit. The parent usually supplies baseline and paths rather than copying large diffs.

## Reviewer Lanes

All reviewer lanes and the checkpoint adviser run on `gpt-5.6-terra`. Architecture, UI, and privacy/security use `medium` reasoning effort; contracts, verification, and checkpoint advice use `low`. Model and reasoning settings are pinned rather than inherited from the parent session. A missing or different pin is invalid reviewer infrastructure and blocks startup. Each audit runs in a separate instance with the same lane settings. Already-created agents retain their original settings and must be replaced when their configured effort changes.

### Coverage contract

The executable [evidence ledger protocol](../../skills/review-standards/references/evidence-ledger.md) governs review requests, per-rule evidence, independent audits and final validation. `review-ledger.mjs` generates obligations and rejects missing rows, unverified source citations, stale snapshots, missing audits and disagreement. Stable rule IDs reside in canonical Markdown comments; reviewers do not select their own checklist. The full source block, including every connected obligation, is evaluated. A second lane instance challenges the reasoning, and deliberate violation/control fixtures measure whether the reviewers actually detect representative failures.

Each request supplies complete canonical standard files plus a per-path applicability map. A reviewer reads each assigned standard completely, inventories actionable headings, and checks each path only against standards mapped to it.

Focus areas and previous findings increase scrutiny but never reduce coverage. A lane returns `CLEAN` only with evidence naming reviewed paths, their assigned sets, checked sections, and scope-based non-applicability decisions.

### Architecture reviewer

Reviews ownership, dependency direction, feature privacy, lifecycle, composition, Polylith, REMVC, server boundaries, and app shells.

### Contracts reviewer

Reviews public interfaces, ambient types, JSDoc, registry contracts, services, events, and data-shape boundaries.

### UI reviewer

Reviews React, MUI, base components, accessibility, localization, presentation ownership, and UI behavior.

### Verification reviewer

Reviews behavioral correctness, regression risk, error handling, lifecycle coverage, test placement, and verification evidence.

### Privacy and security reviewer

Reviews privacy, PII, authorization, secrets, trust boundaries, schema, persistence, identity, and notifications. Any path mapped to `data-persistence.md` routes that standard to this lane.

Overlapping concerns intentionally route to multiple lanes. A lane receives only paths and standards relevant to its concern.

## Bootstrap

Standard bootstrap first performs eligible governance synchronization and reloads changed instructions. The explicit instructions-only profile skips synchronization and reviewer startup. After instructions load and all review gates pass, standard bootstrap:

1. Parses every named set and folder assignment.
2. Builds the reviewer roster from the union of standards actually assigned to repository folders.
3. Records the baseline and configuration fingerprints.
4. Starts each applicable reviewer and waits for readiness.
5. Starts the checkpoint adviser only when repository instructions explicitly opt in.

Initialization is not a repository-wide audit. Reviewers remain addressable, but their memory is a cache; later requests always supply durable paths and fingerprints.

## Context And Configuration Lifecycle

The parent refreshes affected reviewers when:

- the manifest, overlay, or applicable instruction changes;
- a canonical standard assigned to a lane changes;
- the task adds or moves paths into a different folder assignment;
- active product/work context changes; or
- context compaction or agent restart invalidates cached state.

An active-topic change refreshes contextual sources but never selects a standards set. A manifest, overlay, or canonical-standard change refreshes the generated guide and affected reviewer context without changing the durable normalization marker. A newly changed path is resolved during the next review request and may activate another lane without changing the manifest.

There is no background watcher. The parent performs event-driven refresh at bootstrap, recognized configuration/context changes, meaningful implementation checkpoints, and final handoff.

## Reviewer Results

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

Coverage includes complete reviewed paths with their named sets, canonical files and sections checked, and non-applicability reasons. Missing coverage, stale fingerprints, ambiguous mapping, unread standards, or a failed lane make the aggregate incomplete or blocked rather than clean.

The parent deduplicates by standard, file, symbol/location, and violation kind, orders findings by severity, owns fixes, and reruns affected lanes.

## Checkpoint Adviser

`checkpoint-advisor` is optional and read-only. It reports exactly `NOT_READY`, `CHECKPOINT_RECOMMENDED`, or `CHECKPOINT_URGENT`. It evaluates the complete repository state, semantic coherence, verification evidence, unresolved findings, unrelated changes, and next-operation risk.

It never invokes `$check-point`, drafts the final commit message, stages, commits, or requests Git-write approval. Activation requires an explicit engineer request or repository bootstrap instruction.

Monitoring is event-driven after coherent slices, relevant verification, context transitions, before risky work, and before final handoff. Duplicate advice for an unchanged repository fingerprint is suppressed.

Session states are `inactive`, `active`, `suspended`, `restarting`, and `blocked`. Restart after suspension reruns gates, reloads current folder mappings and context, creates a fresh thread, and evaluates immediately.

## Failure Behavior

- Missing reviewer infrastructure: report `$review-standards setup reviewers`.
- Missing or structurally invalid ever-normalized marker: block before agent startup and require first normalization.
- Invalid set, folder assignment, or overlay: block because current standards cannot be resolved; repair the configuration directly without renewed normalization.
- Capability absent from a file's assigned set: follow the declared set; reviewers do not infer or force a broader selection.
- Missing or failing formatting: warn at startup, continue review, prevent aggregate `CLEAN`, and make checkpoint advice `NOT_READY`.
- Broken canonical link: block affected review.
- Ambiguous review unit: require the parent to define it.
- Reviewer failure or stale result: report the missing lane; never claim clean.
- Concurrent changes: invalidate and rerun affected lanes.
- Context transition: refresh context and fingerprints, retaining path-based standards mappings.

## Generated Developer Guide

Root `STANDARDS.md` is generated by `write-standards-guide`. It displays named sets, folder assignments, GitHub canonical links, overlay entries, and separate repository-configuration, local-overlay, selected-canonical, and combined hashes. It is developer reference only and never reviewer authority. Bootstrap and reviewer preflight automatically refresh it after the repository has normalized once.
