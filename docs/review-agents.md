# Working with review agents

Review agents inspect engineering work against the standards selected by your repository. They provide focused findings with source evidence, while the `review-standards` skill coordinates their setup, scope, independent audits, and final result. The main assistant owns implementation and fixes; the reviewers remain read-only.

This guide covers setting up a consuming project and maintaining its review configuration. For the command summary, see [review-standards](review-standards.md). The [canonical governance rules](../documentation/standards/documentation.md) and [operational skill](../skills/review-standards/SKILL.md) define the underlying contracts.

## The agents and their responsibilities

A reviewer lane is a specialist area. The workflow selects lanes from the standards assigned to the files under review, rather than sending every task to every agent.

| Agent | What it examines | Typical questions |
| --- | --- | --- |
| `architecture-reviewer` | Architecture, Polylith composition, REMVC responsibilities, server boundaries, and app shells | Does state have a clear owner? Do dependencies respect feature boundaries? Are startup and cleanup correctly paired? |
| `contracts-reviewer` | JavaScript types, JSDoc, public interfaces, and validation boundaries | Is the public contract explicit? Do callers and implementations agree? Is input validated at the appropriate boundary? |
| `ui-reviewer` | React, MUI, base components, accessibility, localization, and UI behavior | Are responsibilities placed correctly? Are interactions accessible? Does the UI follow the applicable component and localization rules? |
| `verification-reviewer` | Behavioral coverage, test ownership and placement, runners, and verification evidence | Do tests establish the required behavior? Are the right test lanes used? Does the reported validation support the change? |
| `privacy-security-reviewer` | Privacy, personal data, authorization, secrets, schemas, persistence, identity, and notifications | Are trust boundaries enforced? Is data handled according to the selected persistence and privacy rules? Could sensitive information escape? |
| `checkpoint-advisor` | Readiness of the complete repository state for a coherent commit | Is the work complete and verified? Are unrelated or partial changes mixed in? Is this a useful point to commit? |

REMVC stands for Registry, Executor, Model, View, Controller. Its standards define how those responsibilities are assigned and how they interact.

The first five lanes issue standards-review evidence. The checkpoint adviser is optional and provides advice only: it does not stage files, create commits, or start `check-point` for you.

The toolkit also contains planning and assessment specialists, including `ux-reviewer`, `ui-designer`, `system-architect`, and the model/controller/view agents. Those have different jobs. In particular, UX review evaluates product interaction design through the design workflow; it is not the engineering UI standards lane described here.

## When agents run

Installing the toolkit makes agent definitions available. Installation alone does not start a review session.

| Event | What happens |
| --- | --- |
| Standard `$bootstrap` | Loads instructions, synchronizes installed governance when applicable, checks eligibility, and initializes reviewers from the union of standards used by folder assignments. This establishes readiness, not repository-wide compliance. |
| A task review | Maps the declared task changes and explicitly selected paths to standards, runs applicable primary reviewers and independent audits, and validates the combined evidence. |
| An explicit review request | Uses the same eligibility gates and evidence requirements. Requesting an individual reviewer does not bypass them. |
| Active-topic or governing work-context change | Runs `topic-refresh` to reload context and invalidate stale results. File paths still determine standards applicability. |
| Changed manifest, overlay, assigned canonical rule, instructions, or review paths | Refreshes affected mappings, guide content, fingerprints, and reviewer context before relying on results again. |
| Opted-in checkpoint monitoring | Evaluates after coherent work slices, relevant verification, context transitions, before risky work, and before handoff; unchanged state does not generate duplicate advice. |

The main assistant drives these events. There is no background filesystem watcher, scheduled review, or automatic Git hook implied by installation.

Repository `AGENTS.md` can request bootstrap and task review. If you want that working convention, a repository instruction could say:

```text
Use bootstrap when beginning repository work. For implementation tasks, capture
the review baseline before edits and run review-standards before final handoff.
```

To opt into checkpoint monitoring during bootstrap, name it explicitly:

```text
During standard bootstrap, activate checkpoint-advisor monitoring through
review-standards.
```

These are workflow instructions. Keep repository engineering-rule additions and replacements in the overlay described below.

If root `AGENTS.md` contains the exact standalone directive `Bootstrap profile: instructions-only`, bootstrap skips reviewer startup, governance updates, and generated standards-guide checks. Choose that profile intentionally for a repository that does not use standard review startup. Explicit later reviews still require the usual gates.

## Set up a repository

### 1. Install the shared toolkit

Follow [Getting started](../README.md#getting-started) from the governance checkout. The local installer links managed skills, agent definitions, and canonical documentation into Codex home. Restart Codex when needed for discovery, then open the consuming project.

If reviewer definitions are missing or invalid, ask:

```text
Use $review-standards setup reviewers to inspect and propose the required repairs.
```

Review and authorize the proposed user-level changes. The current infrastructure contract pins all six definitions above to `gpt-5.6-terra`: architecture, UI, and privacy/security use medium reasoning; contracts, verification, and checkpoint advice use low reasoning. These are validated requirements of this toolkit, not per-repository tuning knobs. Changing a definition does not update an already-running agent.

Reviewer calibration is another startup requirement. It exercises fresh primary and audit agents against synthetic violations and compliant controls and records their evidence. If calibration is missing or stale, have the setup workflow diagnose it and follow the [calibration protocol](../skills/review-standards/references/evidence-ledger.md#calibration-and-limits). It must run the independent fixture exercise and validate the results before sealing a replacement record. Do not edit hashes or mark calibration successful merely to get past startup.

### 2. Normalize the project's standards once

For an existing project without a valid initial normalization record:

```text
Use $normalize-standards audit for this repository.
```

Read the reconciliation report and decide how each local difference should be handled. Once no decision remains pending or ambiguous, explicitly request reconciliation:

```text
Use $normalize-standards reconcile using the reviewed decisions.
```

Successful reconciliation establishes folder mappings, local overlays, a durable `normalization.json` marker, and a generated `STANDARDS.md`. Deferred decisions prevent completion. A project generated by `initialize-project` may already have the required marker; validate it rather than repeating normalization.

Do not hand-create a normalization marker to enable reviewers. It records completed initial review of the standards configuration. It does not certify application compliance.

### 3. Prepare formatting

Ask for an inspection and proposal:

```text
Use $review-standards setup formatting for this repository.
```

The required setup includes a direct root `prettier` dependency, repository-owned configuration, `.prettierignore`, and this exact package script:

```json
{
  "scripts": {
    "format:check": "prettier --check ."
  }
}
```

Approve proposed dependency or configuration changes before they are applied. Formatting writes are separate from the read-only check. Missing setup or a failed check does not prevent reviewers from inspecting code and reporting findings, but it prevents a final `CLEAN` result or positive checkpoint recommendation.

### 4. Bootstrap and request a review

```text
Use $bootstrap for this repository.
```

Standard bootstrap may update the governance checkout; a dirty checkout or failed trusted fast-forward stops that startup. It does not stash or discard changes. Other startup failures are reported with recovery steps, and no reviewer starts while a startup gate fails.

Before a task, ask the assistant to capture the review baseline. After implementation:

```text
Use $review-standards to review this task's changes, including its new tests.
```

For existing work without an earlier captured baseline, explicitly identify the complete intended scope. The workflow must report that limitation rather than invent an earlier clean state. Added review paths can broaden coverage; they do not subtract task changes already captured by the ledger.

## Configure which rules apply

There are three standards authorities:

| Location | What you control |
| --- | --- |
| Installed `documentation/standards/` | Shared canonical rules, maintained in the governance repository. |
| Project `agents/topics/standards/manifest.md` | Named standards sets and their folder assignments. |
| Project `agents/topics/standards/overlay.md` | Local additions and replacements of canonical sections. |

Topics supply product and work context. Root `STANDARDS.md` is a generated explanation. Neither selects rules or overrides the manifest and overlay. An independently rooted child repository owns its own configuration even when a host builds or serves its applications.

Generated `STANDARDS.md` links open the canonical documents on GitHub for human reading. The manifest and reviewers still resolve local files. Use [update-standards](update-standards.md) to checkpoint and publish the governance checkout; the same branch-based URLs then display the new published contents. Unpublished local edits can differ from those pages, and other installations still need to synchronize their local checkout.

### Example folder manifest

Suppose a project contains `src/`, `server/`, and `tests/`. The following illustrates a shared base and separate UI and server sets. It is a teaching example, not a complete recommended selection for every application: add architecture, REMVC, MUI, persistence, or other standards when appropriate to your project.

`CANONICAL_ROOT` below is a placeholder. Replace it with local links resolving to the installed canonical standards directory, using the same destination consistently for each standard. It is not an environment variable the Markdown parser expands. The current resolver requires local canonical files; GitHub links or bare standard identifiers are not substitutes. Have normalization establish the links for your checkout rather than copying another developer's machine paths.

```markdown
# Folder Standards Manifest

## Standards Sets

### `base`

Extends: none
Standards:

- [documentation.md](CANONICAL_ROOT/documentation.md) - Shared standards governance.
- [code-conventions.md](CANONICAL_ROOT/code-conventions.md) - Shared source conventions.
- [testing.md](CANONICAL_ROOT/testing.md) - Behavioral verification requirements.

### `browser-ui`

Extends: base
Standards:

- [react.md](CANONICAL_ROOT/react.md) - React presentation code.
- [accessibility.md](CANONICAL_ROOT/accessibility.md) - Accessible interfaces.

### `server`

Extends: base
Standards:

- [server.md](CANONICAL_ROOT/server.md) - Server routes and services.

## Folder Assignments

- `.` - `base` - Repository-wide fallback.
- `src/` - `browser-ui` - Browser application code.
- `server/` - `server` - Server implementation.
- `tests/` - `base` - Shared test support.
```

For `src/AccountPanel.jsx`, `src/` wins over `.`, selecting `browser-ui`. That set explicitly inherits the three base standards and adds React and accessibility. `server/accounts.js` selects the server set. A root file uses the `.` fallback.

An assignment selects exactly one set; it does not merge with ancestor assignments. Inheritance is what keeps base rules in the selected set. Set names use lowercase kebab-case, each set extends at most one parent, and children list only additions. Repeating an inherited standard or creating an inheritance cycle is invalid.

The root assignment is required. Other folder paths must exist, use `/` separators and a trailing `/`, and contain no globs or `..` segments. Each folder is assigned once. To give a subtree different standards, add a deeper folder assignment. To omit a parent's rule, define a sibling set from a smaller base; there is no set subtraction.

### Add a repository-specific requirement

An empty overlay is:

```markdown
# Repository Standards Overlay

None.
```

Replace `None.` with entries when you introduce local rules. For example, this adds a fixture-provenance requirement for `tests/` while preserving canonical testing rules:

```markdown
# Repository Standards Overlay

## ADD: Recorded protocol fixture provenance

Extends: testing.md#Durable Test Principles
Scope: folder:tests/
Rule: Every recorded protocol fixture must identify its source protocol version and capture date in an adjacent metadata file.
Reason: The integration tests compare behavior across externally versioned protocols.
```

Use `Scope: repository` for an addition wherever the target standard is selected in the repository. Repository scope does not force that standard onto files whose set omits it.

### Replace a canonical section locally

Use `REPLACE` when the local rule intentionally supersedes a canonical section. For example, a repository that deliberately chooses a different formatter policy could define:

```markdown
# Repository Standards Overlay

## REPLACE: Spaces in repository formatting

Replaces: code-conventions.md#Formatting
Scope: repository
Rule: Use repository-owned Prettier with two-space indentation and useTabs false. Declare prettier as a direct root devDependency, retain a lockfile, maintain an explicit root configuration and .prettierignore, and expose exactly "format:check": "prettier --check .". Root configuration governs workspaces; express package differences through root overrides. Formatting writes require separate authorization.
Reason: Existing source and editor tooling use a consistent two-space convention.
```

This is an example of an intentional policy replacement, not a required override: the canonical formatting standard already permits compatible existing configuration. Read the full target section before replacing it. A replacement supersedes that section, so stating only “use two spaces” could unintentionally discard its dependency and verification requirements. It also cannot waive the review skill's own formatting completion gate.

Both examples target real section headings. Targets use `filename.md#Section Heading`, not a whole document or an invented section. Keep `Rule` as the complete local requirement and `Reason` as its repository-specific justification. The current parser expects each field on one line.

### Precedence in practice

All matching `ADD` entries accumulate. For a single target section, the matching `REPLACE` with the longest folder scope wins; repository scope is least specific. File order does not change precedence.

For example, a repository replacement of `code-conventions.md#Formatting` applies to mapped files generally. A replacement of that same section scoped to `folder:server/` wins for `server/accounts.js`. Additions matching that file still apply. Duplicate entries for the same operation, target, and scope are rejected by the parser, and semantically conflicting rules must be resolved even if their syntax parses.

An overlay target must appear in at least one standards set and affects only files whose selected set includes it. Overlays do not add missing standards to a set. Prefer a narrow folder scope for a local exception; use `update-canonical-standard` when a rule should apply across projects.

## Validate and maintain the configuration

After the initial normalization, edit the manifest or overlay directly when your requirements change. You do not need a new normalization audit or renewed attestation merely because the rules changed. Validate the configuration, refresh the guide, and refresh affected reviewers before relying on earlier results.

To inspect the mapping mechanically, substitute actual paths in this command:

```text
node <codex-root>/skills/review-standards/scripts/folder-standards.mjs --repo <project-root> --path src/AccountPanel.jsx --path server/accounts.js
```

This helper checks parsing and reports sets and matching overlays for each path. Its success alone does not prove that every folder or canonical link exists, that a target section is valid, or that the rules are semantically coherent. Guide generation and review preflight perform additional validation.

Then ask:

```text
Use $write-standards-guide to update this repository's generated STANDARDS.md now.
```

Read the generated guide to confirm the intended selection. Do not hand-edit it or the historical normalization hashes. If the active topic changes during a bootstrapped session, use `$review-standards topic-refresh`; changed standards also require affected context and results to be refreshed.

## Understand the review result

The workflow records a baseline, generates obligations for each applicable file/rule pair, gathers primary findings and independent audits, and validates the evidence against current source. Reports live under the Git-ignored `.codex-tmp/review-standards/session-*` directory. The parent may create that directory and add the narrow ignore entry, as well as refresh `STANDARDS.md`; reviewers themselves do not edit code or Git state.

| Result | Meaning |
| --- | --- |
| `CLEAN` | All required mapped-rule evidence and independent audits validate against current source, with formatting passing. |
| `FINDINGS_PRESENT` | Validated violations remain; formatting problems are also reported when present. |
| `INCOMPLETE` | Evidence, coverage, agreement, freshness, or formatting is insufficient for a clean conclusion. |
| Blocked startup | A prerequisite such as infrastructure, calibration, normalization, or interpretable configuration prevents the run. |

Findings include severity, location, canonical authority, the considered overlay, evidence, consequence, the smallest compliant remedy, and confidence. The assistant consolidates duplicates and prioritizes blocking, important, then advisory issues. After fixes, affected review and audit evidence must be refreshed; results from before an edit cannot certify the new source.

`CLEAN` is a conclusion about the declared scope and mapped rules. It is not a guarantee that no defect exists. The validator checks evidence completeness, source freshness, and agreement structure; it cannot prove that every explanation is correct. Independent audits and calibration strengthen that evidence without making judgment infallible.

## Use checkpoint advice separately

For a one-time assessment:

```text
Use $review-standards checkpoint-advisor evaluate.
```

For session monitoring, use `checkpoint-advisor monitor`; use `suspend`, `restart`, or `status` to control it. Restart applies after suspension in the current session and creates fresh adviser context.

The adviser reports `NOT_READY`, `CHECKPOINT_RECOMMENDED`, or `CHECKPOINT_URGENT`. It considers the entire repository because `check-point` stages all changes, including work outside a narrow task review. It inspects existing verification evidence and runs the required formatting checks rather than independently running builds or tests. A covered task needs a current validated clean review before a positive recommendation.

When you decide to commit, invoke [check-point](check-point.md). Advice does not authorize a commit or push.

## Troubleshooting

| Symptom | Next step |
| --- | --- |
| Reviewer definitions are missing or have unexpected model settings | Run `$review-standards setup reviewers`; inspect and authorize the proposed repair. |
| Calibration is missing or stale | Follow the synthetic primary/audit calibration protocol; do not bypass readiness. |
| The repository has never normalized or its marker is invalid | Audit, manually review decisions, then explicitly reconcile before bootstrapping again. |
| A folder mapping or canonical link is invalid after an edit | Repair the current manifest or overlay, refresh the guide, and rerun preflight. Prior normalization does not need to be repeated. |
| A local rule seems ignored | Check the file's longest folder assignment, whether its set contains the target standard, the exact section heading, and the overlay scope. |
| A review reports findings despite passing tests | Inspect the cited rule; behavioral test success does not establish architectural or other standards compliance. |
| Review is otherwise clean but formatting fails | Repair formatting setup or apply authorized fixes, then rerun the check and affected review validation. |
| Bootstrap loads instructions but starts no reviewers | Check for the instructions-only profile or reported startup failures. Readiness and an actual task review are separate steps. |

[Review skill reference](review-standards.md) · [Normalization guide](normalize-standards.md) · [Canonical governance](../documentation/standards/documentation.md) · [All skills](../README.md)
