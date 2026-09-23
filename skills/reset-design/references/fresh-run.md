# Fresh Design Reset Contract

This contract defines isolation and acceptance evidence for `reset-design`. It applies to the product/design pipeline only and does not authorize application implementation. Authority to update the human-owned description through fresh refinement is defined by the invocation section in `SKILL.md`; the exact starting bytes remain the sole initial product input.

## Boundary Inventory

The durable destination is `<repository-root>/product/<name>/`, established by
the refine-design [product location contract](../../refine-design/references/product-location.md).
The preserved description may be outside or inside it. When inside, target only
proven derived children (including files such as `current.json`) and retain the
description and owner resources. Never treat the repository-wide `product/`
folder as a purge target. Install fresh staged data back into the named root.

Before design work, classify paths into these sets.

### Preserved input

- One human-owned product description.
- Owner resources outside every inventoried prior-derived root that are explicitly named in the current reset request, or referenced by the description and independently established as human-owned.
- Current repository instructions and global, product-neutral contracts.

Do not infer that an adjacent image, note, prompt, prior report, or code file is an owner resource. A repository path mentioned as the implementation target is context, not permission to mine its UI for the fresh design. Nothing beneath a prior derived root qualifies, even when the description or current request links to it. Reusing such material is an ordinary refinement rather than a reset.

### Purged derived authority

Include every canonical location used by the target for:

- product models, source snapshots, artifact snapshots, current pointers, contexts, and artifact resources;
- UX specifications, UX review receipts, handoffs, and semantic wireframes;
- design-language and review-layout data plus generated specimens;
- UI compositions, component designs, comp media, and product-specific research;
- publication manifests, generated PRDs, render reports, and publication receipts.

Legacy derived files outside canonical locations are never inputs. Remove them when ownership is mechanically clear. Otherwise list them as excluded legacy material in the receipt so a later workflow cannot mistake them for authority; do not delete ambiguous human documentation.

### Untouched

Application code, repository infrastructure, unrelated topics, human documentation other than explicitly generated design output, and external systems remain untouched.

Resolve every path absolutely and verify that removal targets remain inside the named repository root. Reject symbolic-link or junction escapes. Never construct a recursive removal target from unverified text.

## Reset Helper

Use the bundled helper twice with an identical argument list:

```text
node scripts/reset-design.mjs \
  --root <repository-root> \
  --source <relative-human-product-description> \
  [--preserve <relative-owner-resource> ...] \
  --target <relative-derived-root> [--target <another-derived-root> ...]

node scripts/reset-design.mjs \
  --root <repository-root> \
  --source <relative-human-product-description> \
  [--preserve <relative-owner-resource> ...] \
  --target <relative-derived-root> [--target <another-derived-root> ...] \
  --apply \
  --expected-plan-sha256 <digest-from-plan>
```

The first call prints the complete deterministic plan, closed target inventory digests, and `planSha256` and changes nothing. The second acquires the helper's cooperative reset lock, repeats the full preflight, and must match the expected plan digest before removing only those explicit targets. Missing targets are valid so the operation is idempotent. The helper refuses paths outside the root, repository metadata, the preserved source, overlapping targets, links or reparse points, active product-store/reset locks, and unsafe entry types. It does not accept globs, create backups, migrate content, or discover targets heuristically.

If the process is interrupted after acquiring `.reset-design.lock`, do not delete that file manually. Read its opaque token and run:

```text
node scripts/reset-design.mjs \
  --root <repository-root> \
  --recover-stale-lock <exact-token>
```

Recovery succeeds only for a valid unchanged lock whose recorded process is no longer running. A live process, malformed lock, changed lock, or wrong token remains fail-closed. Because an interruption may have removed only part of the reviewed targets, generate and review a new plan after recovery; never reuse the prior digest.

Generate and review the plan, then apply it before spawning fresh specialists so prior derived artifacts are absent throughout reasoning. The current explicit reset request is the authorization to apply it. Stop other writers during apply; the cooperative lock prevents another reset process but is not an adversarial operating-system sandbox. Do not seek another confirmation unless the target product itself remains ambiguous or the plan contains a path whose ownership cannot be established.

## Reset Input Manifest

Create a machine-readable manifest before spawning specialists:

```json
{
  "schemaVersion": "1.0",
  "kind": "reset-design-input",
  "runId": "<new opaque id>",
  "sourceRoot": "<verified canonical root>",
  "productDescription": {
    "path": "<repository-relative path>",
    "sha256": "<lowercase digest>",
    "byteLength": 0
  },
  "resources": [],
  "excludedDerivedRoots": [],
  "requestedPublication": false
}
```

Each resource records a repository-relative path, SHA-256 digest, byte length, media type, provenance classification, and the exact current instruction or human-source reference that authorized it. Sort resources and excluded roots by Unicode code point. Keep the manifest in clean staging and provide it to every fresh agent so the input boundary remains explicit.

## Stateless Specialist Runs

Create each specialist with no prior conversation or agent history. Its assignment contains:

- the reset-input manifest and permitted source bytes;
- the current product-neutral role and schema contracts;
- only fresh upstream artifacts required for its stage;
- the requested scope and output contract.

Never summarize an old design into the prompt. Never tell a specialist what the old result got wrong. A reviewer receives the fresh candidate and its fresh upstream authority, not earlier findings or expected corrections. Record the exact supplied input hashes. Because the shared agent workspace does not expose a read audit or per-agent filesystem allowlist, this demonstrates orchestrator input isolation rather than proving every possible filesystem read.

The minimum full-design sequence is:

1. fresh semantic interpretation and new product store;
2. fresh UX planning;
3. independent fresh UX review, with revise cycles until pass;
4. fresh design-language synthesis;
5. fresh whole-product UI composition;
6. fresh component-mode design for every specialized component required by the requested scope;
7. independent qualitative UI review of rendered surfaces and component states;
8. fresh publication artifacts and detached PRD context;
9. optional `generate-prd` publication from that context.

Unavailable required specialists or reviewers make the reset incomplete. A parent-authored fallback cannot satisfy an independent gate.

## UI Quality Gate

Run structural validators first. Then use a new independent UI-design assessment agent to inspect clean and annotated renders together with the exact fresh UX frame and design language. Supply the global `ui-designer-review.md` qualitative-review contract. The reviewer does not redesign the artifact.

A blocking review checks at least:

- recognizable platform controls and icon semantics;
- primary-task hierarchy and action economy;
- spacing, padding, target size, alignment, density, typography, and label fit;
- whether indicators, handles, playheads, menus, and other elements look and behave like valid UI;
- contextual controls appearing only where their owning state and selection justify them;
- representative content, meaningful state differences, overflow, focus, accessible naming, and non-color cues;
- honest comp versus wireframe classification;
- fresh bounded research for unfamiliar patterns.

Return `pass` only when the rendered result is credible implementation guidance for its declared scope. A `revise` result names stable scene and node IDs and returns to the fresh UI designer. Re-render and use another independent review turn after correction. Do not solve a behavioral finding in UI; route it through fresh UX and repeat the affected downstream stages.

Record the passing review against hashes of the UI/component source, UX source, design language, renderer version, and rendered file inventory. A review from a prior reset run is never reusable.

## Freshness Verification

Before completion, verify:

- no purged or excluded artifact was copied into staging or supplied to an agent;
- all model and artifact ancestry begins in this run;
- every dependency resolves within the fresh store;
- every published component comp has a passing fresh UI review;
- the detached context selects only fresh artifacts;
- repeated publication from the exact context is byte-identical.

For the repeat check, publish the exact detached context into two new empty staging directories. Compare the closed file inventories from their publication receipts by relative path, byte length, and SHA-256. Record the publisher and renderer versions, both receipt hashes, and the equality result. Browser inspection records the browser/version, viewport, inspected scene IDs, and resulting pass or blocking findings; it is qualitative evidence rather than a deterministic pixel claim.

## Reset Receipt

The final receipt contains:

```json
{
  "schemaVersion": "1.0",
  "kind": "reset-design-receipt",
  "runId": "<manifest run id>",
  "status": "complete",
  "authority": {
    "request": "<current explicit reset instruction>",
    "scopeRoot": "<repository-relative product root>",
    "discardedAcceptedAndLockedDerivedDesign": true
  },
  "inputManifestSha256": "<digest>",
  "productDescription": {
    "startingSha256": "<digest>",
    "resultingSha256": "<digest>"
  },
  "freshRuns": [],
  "research": [],
  "purgedRoots": [],
  "productSnapshot": {},
  "prdContext": {},
  "publicationReceipt": null,
  "unresolved": []
}
```

`freshRuns` records the stage, role, new agent/run identity, input hashes, output hashes, and result. `research` records new queries and checked public sources without copying full responses. Path records are relative to the verified root. The receipt contains hashes and provenance only; it never embeds the discarded designs.

Write `status: "complete"` only after the fresh artifact root and any requested PRD validate in their canonical locations. On failure after purge, keep a failure receipt in isolated staging with `status: "incomplete"`; prior derived design remains intentionally absent.
