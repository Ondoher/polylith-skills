---
name: check-point
description: Propose, approve, and create a Git commit containing the entire current repository state. Use when the user asks to checkpoint, check in, or commit all changed and new files through an explicit message-review flow.
---

# Check Point

Create one deliberate Git checkpoint containing the complete current repository state. The proposal phase is read-only. Do not stage or commit until the engineer accepts the latest proposed message and reviewed scope.

## Load instructions

1. Resolve the Codex root from `CODEX_HOME`, or use `~/.codex` when it is unset. Read and follow its `AGENTS.md` when present, including routed files.
2. Resolve the repository root with read-only Git inspection. Read and follow the repository's `AGENTS.md` and routed instructions.
3. Repository instructions that reserve Git writes for the developer are satisfied only by the engineer's explicit acceptance in this workflow. Higher-priority prohibitions still apply.
4. Stop clearly if the current directory is not in a Git repository, the repository is mid-merge or otherwise unsafe to commit, or no changes exist.

## Inspect and propose

Inspect the complete state from the repository root without changing the index:

- current branch and `HEAD`;
- staged, unstaged, deleted, renamed, copied, conflicted, submodule, and untracked paths;
- staged and unstaged diffs;
- relevant contents of untracked files; and
- any repository-required pre-commit validation.

Ignored untracked files are outside the checkpoint unless they are already tracked. Treat tracked deletions and submodule pointer changes as part of the current state. Do not use a path-limited view that could omit changes elsewhere in the repository.

Before proposing a commit, call out likely secrets, credentials, private keys, personal data, unexpectedly large or binary artifacts, dependency directories, generated output, or other files that appear unsafe or accidental. Do not proceed past the proposal until each material concern is removed, ignored, or explicitly confirmed by the engineer with awareness of the identified risk.

### Large data warning

Measure the byte size of every changed or untracked file that would be committed without loading an entire large file into context. Unless repository instructions define stricter thresholds, warn about:

- any likely data file at least 1 MiB;
- likely data files whose combined checkpoint size is at least 10 MiB; and
- any individual file at least 10 MiB, even when its type is uncertain.

Treat structured datasets, database files and dumps, serialized arrays or models, geospatial data, and tabular exports as likely data. Common signals include `.csv`, `.tsv`, `.json`, `.jsonl`, `.ndjson`, `.geojson`, `.xml`, `.sql`, `.dump`, `.db`, `.sqlite`, `.sqlite3`, `.parquet`, `.arrow`, `.avro`, `.orc`, `.feather`, `.pkl`, `.pickle`, `.npy`, `.npz`, `.h5`, and `.hdf5`, but use content and repository context rather than relying only on extensions. Compressed archives containing data remain data candidates.

For each warning, report the repository-relative path, human-readable size, tracked or untracked status, and why it appears to be data. Also report the aggregate size when the combined threshold is reached. Explain whether the file appears intentional, generated, replaceable, sensitive, or more suitable for `.gitignore`, external storage, or Git LFS. Do not modify ignore rules, enable Git LFS, delete, move, or truncate a file automatically.

A large-data warning is a material concern. The engineer must explicitly confirm that the identified file or set belongs in this commit after seeing the warning, or remove or exclude it and request a new proposal. Generic acceptance of the commit message is insufficient when an unresolved large-data warning exists.

Create a snapshot fingerprint covering `HEAD`, index contents, tracked worktree changes, untracked paths, and untracked file contents. Use it only to detect drift before staging; do not write it into the repository.

Suggest a commit message in exactly this shape:

```text
Single-line imperative summary

- Concrete change or outcome
- Concrete change or outcome
```

The header is one line, concise, and describes the checkpoint as a whole. Bullets summarize material outcomes rather than listing filenames or implementation minutiae. Include documentation, tests, configuration, deletions, and generated artifacts when materially relevant. Do not claim validation that was not run successfully.

Present the proposed message together with a concise scope summary and any risks or validation results. Then stop. The engineer may request wording changes or explicitly accept the proposal. Revise and present the complete message again after requested changes; do not infer acceptance from silence, an unrelated reply, or approval of an earlier version.

## Commit after acceptance

Acceptance authorizes one commit using the latest displayed message and the exact reviewed repository snapshot. It does not authorize a push, tag, branch operation, amend, history rewrite, hook bypass, or later commit.

Immediately before staging:

1. Reinspect the complete repository state and recompute the snapshot fingerprint.
2. If it differs from the accepted snapshot, do not stage. Explain what changed, update the proposed message and scope, and request acceptance again.
3. If it matches, stage the complete repository state from the repository root with `git add -A`.
4. Inspect the staged paths and diff. Verify that they match the accepted snapshot and that no unresolved conflict or newly discovered sensitive artifact is present.

If verification after staging fails, stop and report the exact staged state. Do not automatically reset or otherwise reconstruct the prior index, because that could destroy pre-existing staging choices.

Run `git diff --cached --check` and any validation required by applicable repository instructions. Do not invent a test requirement, weaken a required check, use `--no-verify`, or silently change files to make validation pass. If a hook or validation fails or changes the worktree, report the failure and leave the resulting state visible for the engineer.

Write the accepted multiline message through a temporary file outside tracked repository content and create the commit from that file. Remove the temporary file afterward. Never place the message file in the repository.

## Verify and report

After a successful commit, verify the new commit identifier, committed message, committed path summary, and remaining worktree state. Report:

- the commit hash and header;
- the committed change summary;
- validation that ran and its result; and
- any remaining staged, unstaged, or untracked files.

Never push automatically. If the commit fails, report why and whether changes remain staged; do not retry with altered flags or a different message without new engineer direction.
