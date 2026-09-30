# UX Review Gate

Run an independent qualitative UX review after the parent has structurally validated and persisted UX schema 0.4, and before any UI composition or component-design work for the reviewed scope. This is a product-design gate within `refine-design`; it is separate from engineering standards review and does not invoke `review-standards`.

## Serial Gate

Use this order:

1. A fresh `ux-planner`, or the parent with honest `parent-assessment` provenance when that planner is unavailable, produces the UX proposal.
2. The parent reconciles owner decisions and verifies material research sources, consolidates product-intent writeback and formatting, updates the model for any changed source, reconciles affected UX and exact bindings, persists `ux/ux-spec.json`, and confirms deterministic replay. Freeze these inputs before requesting review; follow [the efficient cycle](refinement-cycle.md).
3. A fresh `ux-reviewer` assesses the exact saved UX revision and requested scope without editing it.
4. UI work begins only when that reviewer returns `pass`.

A `revise` verdict returns the blocking findings to UX synthesis. Validate and persist the corrected UX, then use another fresh reviewer. Any byte change to the authoritative product description or saved UX artifact, or any change to the reviewed scope, makes the previous receipt stale. This includes a UX edit that retains the same document ID and revision.

If `ux-reviewer` is unavailable, product and UX refinement may continue, but dependent UI composition and component work remain gated. Do not label a parent reread as an independent review.

## Review Input

The parent computes the immutable `subject` with `createUxReviewSubject` from the exact authoritative product-description file, the exact saved UX bytes, an explicit canonical source root, and the requested scope, then supplies that subject to the reviewer unchanged. The selected UX source path must resolve below that root to the same real file as the supplied product-description path. Supply the reviewer with:

- the exact product-description content and its UX source identity;
- the exact saved UX artifact content, ID, and revision;
- the bounded `scopeRefs` being assessed;
- the relevant `patternResearch` records and parent source-check results;
- any prior blocking findings that the revision claims to resolve.

Do not provide a desired verdict or ask the reviewer to approve a predetermined UI direction. Evaluate the product's stated intent and users rather than importing rules from the fixture, a reference product, or the reviewer's preferred interface pattern.

## Reviewer Response Schema 0.2

The response schema is the final materialized receipt. With MCP, use progressive
delivery below so the reviewer does not repeat previously saved rows at the end.

Before reviewing, read [`ux-review-schema-0.2.json`](./ux-review-schema-0.2.json) as a mandatory input contract. Check authored rows as they are saved, then assess the complete coverage and every `x-semanticRules` entry before concluding. Progressive assembly validates the final object without a model-generated copy. For complete-file or inline delivery, self-check the complete object. The imperative validator remains authoritative for reference and cross-record checks that JSON Schema describes only as semantic rules.

The final materialized receipt is one JSON object with no Markdown fence or explanatory wrapper:

- `schemaVersion`: `"0.2"`.
- `subject`: `{ productDescription: { id, sha256 }, uxArtifact: { id, revision, sha256 }, scopeRefs }`, bound to both authoritative inputs and the reviewed scope. SHA-256 values are lowercase digests of the exact supplied file bytes.
- `verdict`: `pass` or `revise`.
- `summary`: a concise assessment of the reviewed scope.
- `coverage`: records shaped as `{ criterion, result, evidenceRefs, note }`, where `result` is `pass`, `finding`, or `not-applicable`. A `not-applicable` result explains why the criterion is outside the bounded scope.
- `findings`: records shaped as `{ id, severity, criteria, recordRefs, evidence, consequence, smallestRemedy, confidence }`, where `severity` is `blocking` or `advisory`, `criteria` is a nonempty unique array of affected coverage criteria, and `confidence` is `high`, `medium`, or `low`. Use one cross-cutting finding when a single defect causes consequences under multiple criteria rather than duplicating the finding.
- `researchChecks`: records shaped as `{ researchRef, result, sourceRefs, note }`, where `result` is `supported`, `unsupported`, `unverified`, or `not-required`.
- `limits`: evidence, scope, or inspection limits that bound the verdict.

Use exactly these coverage criteria:

- `product-intent`
- `task-coherence`
- `information-hierarchy`
- `action-economy-discoverability`
- `mode-state-clarity`
- `feedback-cancellation-recovery`
- `baseline-accessibility`
- `pattern-research`
- `ux-ui-boundary`
- `handoff-traceability`

Return `revise` when any finding is blocking or any required coverage is unavailable. Advisory findings may accompany `pass`; they do not authorize UI to change accepted behavior. A `pass` means the semantic UX contract is coherent enough for UI exploration in the reviewed scope. It is not usability validation, accessibility conformance, implementation approval, or permission to change locked content.

Every coverage row with result `finding` must be covered by at least one blocking finding whose `criteria` includes that criterion. Conversely, every criterion named by a blocking finding must have a coverage row with result `finding`. Advisory findings do not force a coverage row to `finding`.

## Progressive MCP delivery

The parent calls `ux-review.subject`, retains that handle, and assigns a fresh
reviewer `ux-review.contribute` and `ux-review.assemble`. Assign the subject and
all required data handles, exact `readPaths` for the persisted UX and product
description, and `scope: {reviewSubject: <computed subject>}`. Supply the file
locations, source root and scope for final assembly. Do not grant canonical writes.

Use the shared parallel input-collection contract for all independent known reads.
Use the advertised window (28,000 content bytes by default), preserving wrapper
and client return budgets. Follow actual continuations, retain successful pages,
and review all in-scope evidence; input staging and mandatory multi-read skills
are not part of this route.

Save completed semantic work at natural boundaries using `ux-review.contribute`:

```json
{
  "operation": "ux-review.contribute",
  "input": {"fragment": {"coverage": [], "findings": [], "researchChecks": [], "limits": []}},
  "inputHandles": {"subject": "<assigned subject handle>"}
}
```

Each supplied row uses its existing schema 0.2 shape; omit sections without ready
content. Code binds the immutable part to the subject. Keep the returned handle
without rereading or repeating its rows. A small review can use one part; do not
force one call per criterion or interrupt useful reasoning for every field.
Related findings can span criteria. Delay the final verdict until all coverage
and required research have been assessed.

Finish with `ux-review.assemble`, providing only `uxPath`,
`productDescriptionPath`, `sourceRoot`, `scopeRefs`, `verdict` and `summary` in
`input` (and `productDescriptionId` when required). Supply
`inputHandles: {subject: <subject handle>, parts: [<part handles in order>]}`.
The server authorizes every handle, joins rows, reuses exact duplicates, rejects
conflicting identities/subjects and runs the existing validator against current
authoritative files. It does not infer a verdict or treat incomplete coverage
as passing. Return the assembled receipt handle and concise status.

All completed parts survive an unsuccessful assembly or process restart. Resume
with newly issued access and the retained handles. Replace only an affected part
handle when correcting a fragment; retain unrelated parts, and do not silently
overwrite a conflicting finding. A changed source or UX needs a fresh subject
and independent review; prior-subject parts cannot be mixed into that receipt.
The parent still calls `ux-review.validate` for a passing UI gate and passes the
same assembled handle to subsequent consumers, without reconstructing JSON.

For an explicit file/host route, the parent may consume completed receipt files
directly. The final schema, exact validation and independence rules stay the same.

## Parent Handling

Validate the receipt against the exact artifact and scope before using its verdict:

```text
node scripts/ux-review.mjs --review <review.json> --ux <ux-spec.json> \
  --product-description <product-description.md> \
  --source-root <authoritative-source-root> \
  --scope <comma-separated-record-ids>
```

When the UX artifact lists more than one human-owned product-description source, select the authoritative identity explicitly with `--product-description-id <ux-source-id>`.

The validator reparses the persisted UX file, requires its bytes to equal the supplied UX source, resolves the selected product-description source path below `--source-root`, rejects linked-path escapes, and requires `--product-description` to resolve to that same real file. It reads the authoritative product bytes from that file, verifies any supplied in-memory bytes against them, recomputes both hashes, and then checks scope membership, the complete criterion set, bidirectional blocking-finding coverage, enums, referenced UX records, relevant research coverage, and verdict consistency. It deliberately does not judge the reviewer's qualitative conclusions. Reject simulated, stale, or malformed review evidence. Route each blocking finding to the smallest affected UX records; do not broaden a local defect into a whole-product redesign without evidence.

The UI and component writers consume the saved receipt directly. They refuse to persist when it is missing, has a `revise` verdict, no longer matches either authoritative file, or does not cover every UX dependency consumed by the proposed UI.

UI scenes may consume only accepted or locked actions and interaction frames within a current passing scope. If UI identifies missing or unsuitable behavior later, it records an explicit UX change request and waits for the revised UX to pass this gate before rendering that behavior.
