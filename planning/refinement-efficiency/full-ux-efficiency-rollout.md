# Apply measured improvements throughout UX

Status: implemented and locally verified, 2026-09-29. Scope: the maintained UX workflow through planning,
structural repair, independent review, review-directed correction and UI handoff.

The subsequently authorized [full UX rerun](full-ux-rerun-20260929.md) is now
complete through a fresh passing review. It exercised these changes with normal
Codex connectivity and no model-request observer, while preserving live Alexa.

## Completed work

1. Make the measured 28,000-byte MCP content window the default, retaining
   advertised bounds and explicit smaller configurations for constrained hosts.
   Keep parallel independent read waves and serial dependent mutations.
2. Make existing incremental contributions the standard MCP UX delivery for
   initial authoring, updates and repairs. Preserve saved units and receipts.
3. Let reviewers save completed coverage/findings/research in immutable parts.
   Assemble those handles mechanically into the existing review schema; retain
   exact subject binding, complete coverage, independent judgment and pass gates.
4. Update both UX roles, refinement routing and shared contracts consistently.
5. Verify a local full UX lifecycle and current MCP/single-pass suites, document
   decisions and limits, then use the checkpoint adviser with standing preapproval.

## Decisions

- Keep staged input delivery set aside. Larger windows reduce retrieval cycles;
  they do not introduce case-by-case input staging or omit review evidence.
- Use existing immutable result handles for review progress instead of another
  storage agent, mutable graph or compatibility layer. A small review may still
  fit one part; avoid one mandatory call per field or criterion.
- Verify the complete mechanical UX lifecycle with synthetic current-schema
  data. Do not mutate Alexa or launch another paid design benchmark to adopt
  the already measured transport improvements. Live review-stage savings will
  remain unmeasured until an ordinary refinement.

## Evidence

The standard MCP UX route now uses contributions for initial authoring, updates,
structural repairs and review-directed corrections. The parent opens the store,
imports an existing baseline when present, and assigns the author its records.
The author saves ready decisions in natural batches. Code materializes the saved
records and the parent persists them. Corrections reuse accepted work and receipt
revisions instead of asking for another complete document.

Reviewers have two new scoped operations. `ux-review.contribute` saves completed
coverage, findings, research checks and limits against the exact assigned subject.
`ux-review.assemble` accepts the saved part handles plus the reviewer's verdict and
summary. Code joins the parts into the existing schema 0.2 receipt and validates
it against current authoritative files. It accepts a valid `revise` receipt without
turning it into a pass. The parent still requires `ux-review.validate` before UI
handoff. A corrected UX artifact requires a fresh independent review.

`workflow_execute.inputHandles` now supports an ordered array of authorized,
same-run handles as one array argument. Results remain immutable and reusable;
exact duplicate rows are reused and conflicting identities require replacing the
affected part handle. Missing/invalid data cannot bypass the final review gate.
There is no new canonical product schema or compatibility conversion.

Both UX role definitions, their planning contracts, the refine-design entry point,
the cycle/authoring/contribution/review references and the shared MCP workflow now
describe this same route. Both installed agent files match the repository bytes;
the refine-design installation already points to this checkout. New role instances
load those instructions. A running service must restart to load the new operations
and default window; existing clients must refresh their tool catalog if cached.

## Local performance observations

[Raw local metrics](full-ux-efficiency-local-metrics.json) retain request byte counts,
HTTP handler durations, operation queue/execution durations and status from the
successful MCP suite. They contain no credentials or product payloads. These are
synthetic integration measurements, **not agent reasoning or complete live UX times**.

| Measurement                                               | Result                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| Identical escaped UTF-8 JSON fixture                      | 70,211 bytes, exact reconstructed hash verified                       |
| Default window versus 7,000-byte content cap              | 3 reads versus 11; 8 fewer calls (72.7%) for this fixture             |
| Synthetic author → revise → correct → pass lifecycle test | 484.386 ms, including setup, assertions and expected rejection probes |
| Successful review-part saves, including exact retries     | 6 calls, 2.485–4.471 ms operation time each                           |
| Successful review assembly with authoritative validation  | 2 calls, 9.501 and 10.857 ms operation time                           |
| Final passing gate                                        | 7.610 ms operation time                                               |
| Largest operation queue interval in that lifecycle        | 0.017 ms                                                              |

The lifecycle contains 32 HTTP requests, 24 successful domain operations and four
deliberately rejected operations: a revise receipt at the pass gate, a stale receipt,
parts from an older subject, and an unassigned subject. Their failure entries are
expected test evidence. HTTP handling includes operation work; those intervals
overlap and must not be added to test elapsed time.

The larger window reduces collection turns when the client budget permits it.
Incremental authoring and review parts avoid model-generated final copies. Parallel
reads remain an instructed behavior with observed variability; this change does
not guarantee that every agent batches. Cold-start UX, live review savings and the
full request-to-UI-handoff duration were not remeasured in this rollout.

## Verification

- `npm run test:mcp`: **17/17 passed**, test-runner duration 9.021 s. Includes the
  new full UX lifecycle, default window reconstruction, existing UI review gates,
  native read assignment, scoped delivery and canonical persistence.
- `npm --prefix skills/refine-design run test:single-pass`: **28/28 passed**, 1.989 s.
  Includes empty-store creation, forward references, resumable corrections,
  typo rejection, assembly and reuse.
- Focused `ux-review.test.mjs` and `ux-review-schema-contract.test.mjs`:
  **14/14 passed**, 0.264 s.
- Refine-design skill metadata validation passed. Both changed agent TOML files
  parsed successfully; installed bytes match.
- Repository-wide `npm run format:check` and `git diff --check` passed.

Sandboxed attempts initially blocked existing Git/Node fixture subprocesses with
`EPERM`. Rerunning the same suites with approved subprocess access passed; no test
expectation was weakened. Python 3.10 lacks `tomllib`, so TOML checking reused the
already installed `pip._vendor.tomli` parser without adding a dependency.

## Questions resolved during execution

| Question                                                    | Decision                                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Does full-stage adoption include independent review?        | Yes. Review gets progressive delivery and mechanical assembly; semantic judgment and complete scope stay independent.                                  |
| Should every small decision create a tool call?             | No. Save useful batches at natural boundaries; a small review may need only one part.                                                                  |
| Should repaired records or review output be regenerated?    | Retain accepted contributions and unaffected parts; change only affected meaning. Changed authoritative bytes still invalidate the old review subject. |
| Should larger windows override client limits?               | No. Advertise 28,000 content bytes by default, retain explicit smaller settings and honor each client/wrapper budget.                                  |
| Should staged inputs or the multi-read skill return?        | No. Preserve the owner's decision to set them aside.                                                                                                   |
| Is a new paid Alexa trial required to complete these edits? | No. Verify mechanics locally, retain measurements, and distinguish that evidence from unmeasured live model savings.                                   |

The checkpoint also retains the owner's already-written input-staging deferral
notes. The checkpoint adviser assesses the completed functionality as one unit
under the owner's standing commit-message preapproval. No push is authorized.
