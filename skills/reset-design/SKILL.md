---
name: reset-design
description: Rebuild one product's complete derived design from its current human-owned description without retaining prior product-model, UX, UI, component, research, context, or PRD decisions. Use only when the owner explicitly requests a clean design reset rather than an incremental refinement.
---

# Reset Design

Reinterpret one product from clean inputs. Preserve the current human-owned product description and explicitly supplied owner resources; discard every machine-derived design decision and rebuild the design through fresh, isolated agents. This is a reset of design authority, not a migration or an invitation to copy the previous result.

Read [the fresh-run contract](references/fresh-run.md) before changing files. Also read the current `refine-design` and `generate-prd` skill entrypoints from the resolved Codex root. Their current schemas and validation rules govern the new artifacts; this skill governs isolation, reset authority, and replacement.

## Invocation And Authority

Proceed only from an explicit request to reset, restart, or rebuild the complete design for an identified product. Ordinary refinement, a request to regenerate a PRD, dissatisfaction with one component, or an inferred opportunity to improve does not authorize this workflow.

An explicit whole-design reset authorizes replacement of all accepted and locked **derived** design artifacts within the identified target. Record that target-scoped authority in the reset receipt. It authorizes the normal `refine-design` workflow to reorganize and update the human-owned product description from fresh selected decisions, while preserving its exact starting bytes as the sole initial product input. It does not authorize application code, repository configuration, unrelated documentation, or external systems.

Resolve the target from the user's path or the active product topic. If the target remains genuinely ambiguous, do not delete or replace anything. Complete all safe inventory and staging work first, then ask one concise question.

Resolve the canonical data destination as `<repository-root>/product/<name>/`
using the sibling refine-design [product location contract](../refine-design/references/product-location.md).
Determine the name from the human description or the current explicit owner
answer; ask if it remains unclear. Fresh staging is temporary, and validated
data returns to this named root. Preserve an existing human description at its
source path. If it or preserved owner resources live inside the named root,
purge only inventoried derived files/subdirectories, never that containing root
or the shared repository `product/` directory. Location policy does not authorize
an implicit migration or deletion of ambiguous prior data.

## Sole Product Inputs

The fresh run may consume only:

- the exact current bytes of the human-owned `product-description.md`, or an explicitly named equivalent;
- owner resources outside every inventoried prior-derived root that are explicitly named in the current reset request, or both referenced by that source and independently established as human-owned;
- repository instructions and current global schemas, standards, role guidance, and skill contracts;
- primary or official external sources researched again during this reset.

Do not read prior derived artifacts for design meaning. This includes prior semantic models, snapshots, UX or UI specifications, design-language sources, component trees, comps, wireframes, research records, review receipts, PRDs, render reports, contexts, prompts, transcripts, evaluations, caches, IDs, bindings, layouts, or visual assets generated for an earlier design run. Filesystem metadata may be inspected only to establish safe replacement boundaries.

Do not migrate, re-encode, imitate, compare against, or use an old artifact as a reference. A new result may reach the same conclusion only through independent reasoning from the permitted inputs.

An item under any prior derived root is ineligible as a preserved resource, even when the description or current request links to it. Using such an item requires ordinary refinement rather than a clean reset. Record the path and starting hash of every allowed resource.

Text already present in the human-owned product description remains input, even if it originated in an earlier design discussion. Plain Markdown has no reliable authorship provenance. Report this limitation; never guess which sentences to remove. A fresh refinement may write a newly organized product description, but its source snapshot must retain the exact starting bytes and the receipt records both hashes.

## Clean Run

1. Resolve and verify the human source, canonical source root, derived artifact roots, generated publication roots, and explicitly allowed resources. Reject linked-path escapes and targets outside the named product scope. Mechanically inventory current artifact ownership and fail completion if any known derived authority is omitted or ambiguous.
2. Run `scripts/reset-design.mjs` without `--apply` using the repository root, preserved source, optional explicit preserved resources, and a repeated closed `--target` list. Save its deterministic plan and `planSha256`. Never use globs or infer a generic `ui`, `docs`, or topic directory as disposable.
3. Apply that exact reviewed plan with `--apply --expected-plan-sha256 <planSha256>` while the repository is quiescent. The helper must reject any source, resource, target inventory, or path identity change before removing anything. If an interrupted process leaves a reset lock, use the documented token-bound stale-lock recovery only after its recorded process is absent, then create and review a new plan for the remaining targets. Confirm every planned canonical and legacy derived root is absent. Do not retain a migration or rollback copy.
4. Create a new empty staging root that is neither inside nor copied from an existing derived root. Mirror only the relative paths needed for the permitted inputs.
5. Write a reset-input manifest containing hashes of every permitted input and the purged derived roots. It must contain no old design payload.
6. Start every planner, designer, and reviewer as a fresh stateless agent. Give it only the permitted inputs, applicable global contracts, and outputs created earlier in this same reset run. Do not fork conversation history containing the old design and do not reuse a previous agent thread.
7. Run the current `refine-design` schemas and producers as a cold start against the staging copy and a brand-new product store with no `current.json`. For this run its ordinary reuse and preservation clauses have no eligible prior product artifacts: parse the complete description, create a new product model, synthesize UX, obtain an independent UX review, synthesize the design language, compose whole-product UI, and design every specialized component required for the requested publication scope.
8. Research unfamiliar interactions and product-specific components again. Fresh research means new queries and source checks; an old product research record or its citations are not inputs unless the current reset request expressly supplies a qualifying human-owned source.
9. Validate and render each fresh UI composition and component. Before anything is classified as an implementation-ready comp, run the independent qualitative UI gate in the fresh-run contract. A failed or unavailable gate leaves the item a wireframe and prevents it from resolving a comp placeholder.
10. Create new structured publication artifacts, a new manifest, and a detached PRD context from the clean store. Run `generate-prd` only when the request includes PRD publication; it must consume that newly issued context and no older context.
11. Require structural validation, passing required reviews, byte-stable repeat publication, and successful browser inspection, then install the fresh product description and derived outputs at their canonical paths and verify their hashes.

The purge is the reset and is intentionally irreversible. If fresh refinement fails afterward, leave prior derived design absent, preserve only isolated fresh-run failure evidence, and report the rebuild as incomplete. Never reconstruct or reactivate the discarded design.

## Completion Evidence

Persist `reset-design-receipt.json` beside the new product store. It records the starting and resulting human-source hashes, permitted resource hashes, reset authority, purged roots, fresh run identity, specialist/reviewer run identities, research performed, new product snapshot and context hashes, publication receipt when produced, and final status. It must not embed or point to prior design payloads.

Report:

- what human input and resources were preserved;
- which derived roots were purged;
- which fresh agents and reviews ran;
- which items remain wireframes or unresolved;
- the new context and PRD locations, when applicable;
- the limitation that human-source text cannot be separated by historical authorship.

Do not claim completion merely because a new PRD rendered. Completion requires a closed purge inventory plus evidence that the orchestrator supplied only manifest-listed inputs to fresh agents and publishers. The current shared agent workspace does not provide an audited read-capability sandbox; record that limitation rather than claiming proof of every filesystem read.
