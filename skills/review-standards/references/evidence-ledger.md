# Evidence Ledger Protocol

Read this protocol for every task review, audit, and final handoff. The executable gate is `scripts/review-ledger.mjs`. Agent prose alone cannot establish a clean result.

## Rule identity and coverage

Canonical standards retain their prose. `<!-- rule: REACT-001 -->` markers supply permanent identities for individual prose paragraphs, list items, table blocks, and examples. A block can contain several connected obligations: the reviewer must evaluate all of them. Examples and explanatory context require an explicit contextual/not-applicable decision when they impose no additional obligation. No prose is silently classified away by a language model. `rule-inventory.mjs` rejects missing, duplicate, malformed, or empty markers. Preserve IDs through wording changes and reordering; assign unused IDs for additions. `--annotate` is an authoring operation, never automatic review remediation.

`prepare` resolves each path from the existing folder manifest parser and constructs every `(lane, path, rule ID)` obligation. It accumulates ADD entries and applies the most-specific REPLACE independently per canonical section. Unknown standard ownership or missing rule IDs blocks the review. A reviewer may explain non-applicability but may not remove rows. The complete canonical documents remain authority; the generated request is a snapshot, not another standards source.

This contract applies identically to architecture, contracts, UI, verification, and privacy/security. Architecture, REMVC and Polylith are first-class blocking review concerns, not optional background context or checks waived by a UI/test pass. No lane may substitute a standard-wide assertion for its rule rows. Equal enforcement does not mean every rule is lintable: ownership, dependency direction and feature-removal reasoning require source inspection and independent challenge.

## Running a review

1. At task start run `node <skill>/scripts/review-ledger.mjs create-session --repo <repo>`. Before baseline capture, it refreshes generated root `STANDARDS.md` from current hashes. The review workflow may also create `/.codex-tmp/` and append the exact `/.codex-tmp/` entry to the root `.gitignore` if Git does not already ignore it; this narrow setup authority permits no other repository edit. The helper returns a unique `.codex-tmp/review-standards/session-*` directory. Run `capture --repo <repo> --out <session>/baseline.json`. This records HEAD, Git state and hashes of tracked and visible untracked files, including pre-existing edits. Keep every review artifact beneath that session directory; never write review output outside the current repository or store raw credentials or private document contents in reports. Generated `STANDARDS.md` is excluded from review obligations because it is a projection rather than standards authority.
2. After implementation run `node <skill>/scripts/review-ledger.mjs prepare --repo <repo> --codex-root <codex> --baseline <session>/baseline.json --out <session>/request.json`. The helper runs infrastructure, normalization, standards-resolution, and artifact-root gates, diagnoses formatting without blocking preparation, and includes all paths changed since capture. Repeated `--path` additionally selects existing files; it never subtracts changed paths. If no baseline was captured, record that limitation and explicitly select the whole intended scope; never manufacture an earlier clean baseline.
3. Run every lane present in `request.lanes`. Supply the request and protocol, exact baseline, canonical documents and context inputs. Use independent agents with the configured lane model/effort. For the UI lane use medium effort. Runtime roles can be cached: if an existing UI role still pins low, spawn a fresh default agent with the installed UI instructions and explicit medium override. Do not represent changing a TOML file as changing a running agent's effort.
4. Each primary reviewer returns the JSON report below. The parent saves the returned report unchanged with the actual agent instance identity. Reviewers remain read-only. If a unit is too large, shard its obligations explicitly and recombine exact coverage; dropping rules is forbidden.
5. Start a separate agent for each lane audit, with the same model/effort and complete scope. Give it the source, request and primary report. It must challenge every compliant and not-applicable conclusion and inspect violations and uncertainty as well. It returns audit rows for every obligation. Agreement must explain the source evidence; merely repeating the primary conclusion is inadequate. Architecture/REMVC/Polylith primaries and audits trace related callers and ownership across files, not only changed lines. Follow shared facades and re-exports to their implementation owner; examine build inclusion versus runtime activation and paired startup/cleanup when those rules apply. Cite each relevant link in a cross-file ownership conclusion. Unavailable collaborators make the conclusion unable-to-determine, not compliant. Do not mark a rule not applicable solely because its owning layer was unchanged.
6. Save the returned reports unchanged as `<session>/reports.json`, then run `node <skill>/scripts/review-ledger.mjs validate --request <session>/request.json --reports <session>/reports.json --out <session>/validation.json`. Validation records formatting readiness. Only exit 0 with `CLEAN` permits a compliance handoff, and formatting must pass for that result. Semantic findings remain `FINDINGS_PRESENT` when formatting is not ready; an otherwise clean review becomes `INCOMPLETE`. Missing rows, evidence, audits, stale source/context, parse errors and uncertainty also block a clean result. Findings require fixes and fresh review of the changed unit. Do not reuse a result after editing a reviewed file.

Capture, prepare, and validation use new output paths and refuse to overwrite existing artifacts. Every artifact path is mechanically restricted to the repository-local, Git-ignored review temp root. `validate` regenerates the request from current source and context before evaluating reports, and reruns the event AST check for every applicable source path. A failed check cannot be waived by reviewer prose. These helpers do not stage, commit, or modify application source.

## Primary report

```json
{
	"kind": "primary",
	"lane": "ui-reviewer",
	"actor": "/root/actual-reviewer-instance",
	"fingerprint": "request.fingerprint",
	"entries": [
		{
			"path": "src/example.jsx",
			"ruleId": "REACT-EVENT-001",
			"status": "violation",
			"reason": "Explain how the cited source satisfies or violates this exact rule.",
			"evidence": [{"path": "src/example.jsx", "line": 10, "quote": "exact substring on that line"}],
			"severity": "important",
			"consequence": "Concrete effect of the violation.",
			"remedy": "Smallest compliant change."
		}
	]
}
```

Statuses are `compliant`, `violation`, `not-applicable`, `unable-to-determine`. Every row requires a substantive reason and an exact nonempty source quote with a 1-based line number. Include evidence from the reviewed file and relevant collaborators when ownership depends on them. Quote only necessary nonsensitive code. Deleted files use `{ "path": "...", "deleted": true }` and require a prior captured hash. Findings additionally require severity, consequence and remedy. Context/explanatory blocks may be `not-applicable` with the specific scope reason. Never replace a row with a standard-wide assertion.

## Audit report

The audit uses the same shape with `kind: "audit"`, a different actual `actor`, and `primaryDigest` equal to SHA-256 of `JSON.stringify(primary)`. Row statuses are `agree`, `disagree`, `unable-to-determine`; every row needs independent reasoning and source evidence. `disagree` or `unable-to-determine` makes the aggregate incomplete. Resolve it by correcting the implementation or primary reasoning and rerunning the affected audit; the parent cannot silently overrule it.

## Calibration and limits

Use `reviewer-calibration.mjs prepare <request.json>` to generate the synthetic exercise. Supply only its scope, sources and rules to fresh primary/audit agents, not the harness's expected answers. Save their exact reports and run `reviewer-calibration.mjs validate <request.json> <primary.json> <audit.json>`. After successful validation and helper tests, `seal` with the same three paths writes a new `calibration-record.json` containing the original reports and infrastructure hashes. `readiness` verifies this evidence against installed fixtures, reviewer contracts, runtime validator/calibration helpers, model pins, and the representative rule blocks embedded in the live request before real review can start. Installation may relocate the fixture directory without changing the reports. Changes to those inputs require renewed calibration; unrelated canonical-standard and test-file changes do not. Setup agents have a synthetic-fixture-only exception to the readiness gate. Preserve prior records when replacing them.

Run the helper tests whenever the parser, validator, rule routing, AST checks or report contract changes. Run the independent fixture exercise in `fixtures/` when reviewer instructions, model, reasoning effort or standards affecting those examples change. Include both violations and compliant controls, keep expected answers from the primary reviewer, and require every seeded violation to be found. Record misses as evaluation failures and do not claim reviewer readiness until remedied and retested.

The shared validator regression matrix exercises every reviewer lane. Semantic calibration currently samples React rendering/events, REMVC responsibility boundaries, cross-feature ownership hidden behind a shared re-export, Polylith activation, and cross-service startup/cleanup, with compliant controls. This measures those architectural and UI behaviors; it is not an exhaustive semantic benchmark of every rule or every lane.

The validator proves completeness, source freshness, evidence location and agreement structure. It cannot prove that an explanation is true or that two actor strings actually came from separate agents; the orchestrator owns real agent identity and independence. Independent auditing and positive/negative calibration measure reasoning quality but cannot guarantee every architectural defect will be found. Report this boundary accurately. Do not invent numeric render-size thresholds: purposeful semantic region extraction remains a reasoning obligation under the existing React rule.
