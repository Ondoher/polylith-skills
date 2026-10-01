# Efficient refinement cycle

Interpret [freeform amendments](source-change-requests.md) during the source pass.
Text after a standalone `---` may override earlier requirements or answer earlier
questions; apply that later prose where relevant and retain unrelated facts.
Keep source references internally. Require no structured change-request template
and do not reread conflicting paragraphs independently in each downstream agent.

Across the full UX stage, use the shared MCP parallel-read waves and advertised
page window for the planner, corrections and reviewer. UX semantic output uses
[incremental contributions](ux-contributions.md), including initial authoring
and review-directed repairs. Review output uses
[saved fragments and mechanical assembly](ux-review.md#progressive-mcp-delivery).
Keep completed data by handle through validation, persistence and UI handoff;
never request another whole-document response to cross a stage boundary. Source
freeze, independent review and dependent mutations retain their serial order.

For the UX/UI stages, use [single-pass authoring](single-pass-design.md): one
forward authoring pass, optionally one issue-directed repair scan, and indexed
assembly. Persist each completed unit and reuse it during this run. Inline task
pruning replaces repeated whole-product rewrite passes; independent review remains.
Foundation work can overlap UX. Whole-artifact review still precedes composition.

Use this sequence for product refinement. It changes coordination, not the
current product, UX, review, or UI schemas. A whole-product request retains
whole-product coverage. Document hierarchy and page breaks belong to the later
`generate-prd` document-structure consultation.

| Stage                  | Inputs and output                                                                                                                                    | Reuse and invalidation                                                                                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interpret              | Complete current human description and latest owner input → product-model 2.0 proposal and validated store                                           | Read in source order; account for every line, including late constraints, references, and unclassified material. Reuse the current model only when exact source bytes and source identity match. Changed bytes require a complete bound proposal. |
| Plan UX                | Structured product authority, current UX, requested scope, reusable research → UX 0.4 candidate                                                      | Use `refinement-input.mjs` below. Preserve IDs and unaffected decisions. Consult source excerpts for ambiguity; do not commission a second general prose interpretation. Independent review still reads the original intent.                      |
| Consolidate and freeze | Selected product/UX decisions and settled visual defaults → one coordinated description writeback, formatted source, current product model, bound UX | Do this before review. Write only decisions that add or change intent; avoid cosmetic rewrites. A changed source still needs its complete model proposal. Reconcile affected UX and exact bindings; never just replace hashes on an old proposal. |
| Review                 | Exact final description, saved UX and scope → independently validated UX-review 0.2 receipt                                                          | Reuse only a still-current passing receipt for the exact scope. Changed source or UX bytes invalidate it. Corrections return to the smallest affected records, then freeze and review again.                                                      |
| Compose UI             | Current passing review, UX, settled design language → UI/component candidates                                                                        | Preserve unaffected designs and locks. Behavior changes return to UX; product-intent changes require another writeback and review. Do not schedule routine source formatting after review.                                                        |
| Assemble               | Accepted structured sources and explicit publication requests → immutable artifacts, manifest and detached context                                   | Use `refinement-assembly.mjs`; bookkeeping requires no specialist. Existing validators, resource checks, lock authority and snapshot compare-and-swap still apply.                                                                                |

Independent visual-foundation work can accompany UX when its inputs are settled.
Ask for decisions and design once, then use saved candidates for reconciliation
and assembly. Do not ask each specialist to restate the entire brief or rebuild
unchanged artifacts. A substantive review correction may require another pass;
record that cost instead of weakening the gate.

## Structured planner input

```text
node scripts/refinement-input.mjs --current <product/current.json> --source <description.md> [--ux <ux-spec.json>] [--use-cases <id,id>] [--claims <claim-id,claim-id>]
```

The read-only helper prints a packet from the verified store. It checks the
live description against its immutable source, supplies exact model bindings,
the complete structured model (including all rules, gaps, source accounting and
superseded identities), and optional use-case dependency references from the
existing composable handoff. Requested claim excerpts come from verified source
byte ranges. An initial pass omits UX; a scoped revisit supplies current UX and
use-case IDs. Supply the saved UX separately rather than duplicating it in the
packet. Stale UX must be reconciled before requesting a scoped handoff.

Keep the complete product authority even for a local focus: this conservative
first implementation avoids hiding a cross-cutting rule or a not-yet-traced
capability. Focus references guide attention; they do not declare the rest of
the product excluded. This removes repeated interpretation and manual handoff
assembly, not all input tokens. Do not describe it as aggressive context pruning.

## Run evidence and resume

Use `scripts/refinement-run.mjs` to save small immutable stage receipts under
`product/<name>/runs/<run-id>/`. Record exact input/output file hashes, stage,
scope, contract/request identity, start/end time, interpretation/writeback and
specialist/correction counts, assumptions and repair needs. Do not store prompts
or duplicate the product. Usage is either an explicitly sourced measurement or
`null`; unavailable credits and tokens are not zero.

The helper's `check` command rehashes current inputs and outputs. Only a completed
receipt with matching files, contract and request is a reuse candidate. Run the
owning artifact/review validator before consuming it; a receipt is neither
product authority nor an independent review. A changed dependency invalidates
only its consuming stage. Save a new receipt for a correction or retry, retaining
the failed attempt. The helper never starts agents or retries work itself.

The exported `captureFiles`, `createStageReceipt`, `saveStageReceipt` and
`assessStageReuse` functions also support direct orchestration. For command use:

```text
node scripts/refinement-run.mjs capture --repo <repository> --paths <relative-file,relative-file>
node scripts/refinement-run.mjs record --repo <repository> --product-root <product-root> --run <run-id> --input <receipt.json>
node scripts/refinement-run.mjs check --repo <repository> --input <receipt.json> --request-sha256 <hash> --contract-sha256 <hash>
```

Capture inputs before starting the stage and outputs after its checks. For a
writeback stage, reference immutable pre-writeback sources as inputs and the
final live files as outputs; an overwritten input cannot be reused. The request
hash includes the current instruction and exact scope; the contract hash covers
the stage's loaded instructions and validator code. Do not use constant hashes
in real runs. Receipts require `attemptId`, `stage`, `status`, `scopeRefs`, those
two hashes, `inputs` and `outputs` file identities (`path`, `sha256`, `byteLength`),
ISO start/end times and their elapsed milliseconds, counts, consultation role
and purpose, usage provenance, assumptions and issues. `createStageReceipt`
computes elapsed time and specialist-call count; it defaults unavailable usage
to null. Available usage names its unit, value, source and stage/aggregate scope.
Repair issues name a reference, problem and remedy. The validator rejects
incomplete stages without an issue and completed stages without saved outputs.

## Assembly and recovery

```text
node scripts/refinement-assembly.mjs --current <product/current.json> --input <requests.json> --source-root <structured-source-root> [--asset-root <image-root>]
```

`requests.json` is an array of the existing closed publication requests described
in [product-publication.md](product-publication.md). The caller still chooses
scope, status, gaps, IDs and manifest roles; code does not infer acceptance.
The assembler sorts requests by their declared artifact dependencies, obtains
fresh exact bindings for each commit, and resolves context only when every
requested unit succeeds. Existing exact replays remain no-ops.

Each request is attempted at most once. On failure, mark that unit `needs-repair`
with a remediation message, block its dependents, and continue independent
units. If no unit can proceed, report the unresolved dependency group and return
to the parent stage; do not loop, fabricate missing content or publish a complete
result. Successfully committed units survive for the next run. Canonical-store
integrity failures remain errors, not permission to consume unvalidated data.
A failed assembly returns a report and a nonzero exit code so a caller cannot
mistake partial progress for readiness. Continue other useful stages using the
report. No error outcome silently changes a lock or review verdict.

The current prose-writeback path intentionally retains semantic interpretation
when bytes change. There is no verified decision-patch-to-source mapping yet.
Measure future ordinary runs before claiming latency or billed-credit savings.
