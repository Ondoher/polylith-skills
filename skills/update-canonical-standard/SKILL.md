---
name: update-canonical-standard
description: Update a global canonical engineering standard by promoting the active repository or folder override by default, or by using an explicitly supplied canonical rule when provided.
---

# Update Canonical Standard

Promote the repository's proven local rule into the global canonical standard unless the engineer supplies a different canonical change.

## Resolve The Promotion Source

1. Resolve the repository and Codex roots. Read canonical `documentation.md`, the complete target standard, the repository manifest, and the repository overlay.
2. Identify the repository-relative path or folder whose effective rule is being changed. Resolve its longest matching folder assignment, expanded standards set, and matching overlay entries with the shared folder-standards helper.
3. For the requested standard and section, select the active local rule by normal precedence: matching `ADD` entries accumulate, and the longest matching folder `REPLACE` wins over broader replacements and repository scope.
4. Unless the engineer provides different rule text or another source, use the active overlay entry's `Rule` as the semantic source for the new canonical rule. Promote its requirement, not its repository-specific heading, scope, or reason.
5. When the engineer supplies a new, unused canonical rule ID, add a separately annotated canonical rule with that exact ID. This is an additive instruction even when the promotion source is a `REPLACE`; do not rewrite an existing canonical rule instead.
6. When the engineer supplies an existing canonical rule ID, promote the active override into the canonical block governed by that ID and preserve the ID. This is the normal promotion workflow with an explicit existing-rule target.
7. Without a supplied rule ID, a promoted `REPLACE` revises the targeted canonical section. A promoted `ADD` is incorporated alongside the canonical section's retained requirements rather than replacing them.
8. Rewrite repository-specific names or paths into broadly reusable terms without weakening or expanding the override's behavior. If that cannot be done without a material policy choice, obtain the missing information.
9. If several requested paths resolve to different active entries, or no active override exists and no replacement rule was supplied, identify the missing promotion source rather than inventing one.

The current repository supplies promotion evidence; it does not limit the resulting canonical rule to that repository.

## Canonical Edit Contract

- Preserve an existing `<!-- rule: ... -->` identity when revising or moving its governed block.
- Assign a new, unused standard-specific rule ID to every new reviewable prose paragraph, list item, table block, or example.
- When the engineer supplies a rule ID, resolve it against the complete canonical inventory. If unused, add a new rule with that exact ID. If it exists in the target standard, update its governed rule through promotion while preserving the ID. If it belongs to another standard or conflicts with the requested target, report the mismatch and do not guess or create a duplicate.
- Remove an ID only when its governed rule is intentionally removed. Never renumber surviving rules for neatness.
- Do not remove another canonical rule merely because a promoted rule may supersede or conflict with it. Preserve that rule and report it as a possible later removal unless the engineer explicitly includes its removal in the current request.
- Update connected canonical rules and cross-references when the change would otherwise create contradictory or incomplete guidance.
- If adding a new canonical file, also define its reviewer-lane ownership and update documentation examples or inventories that enumerate canonical standards.
- Do not modify repository manifests merely to force adoption. Repositories select canonical standards through their own folder manifests.

Canonical changes belong only beneath `<codex-root>/documentation/standards`. Keep them broadly reusable and free of repository names, local paths, product decisions, temporary migration details, or one-project implementation choices.

## Complete The Promotion

- After the canonical document fully expresses the promoted requirement, remove the source `ADD` or `REPLACE` entry from `agents/topics/standards/overlay.md` because it is now redundant. A new additive canonical rule does not make a source `REPLACE` redundant when removing it would reactivate a conflicting canonical requirement; retain that override until the conflict is explicitly resolved.
- Preserve unrelated overlay entries exactly. If no entries remain, restore the canonical empty overlay form with `None.`.
- Keep the local entry only when the engineer explicitly requests it or part of its behavior remains intentionally repository-specific; explain the remaining difference.
- Do not refresh or recreate `normalization.json`.

## Validate And Refresh

1. For a canonical edit, run:

   ```text
   node <codex-root>/skills/review-standards/scripts/rule-inventory.mjs --check <codex-root>/documentation/standards
   ```

2. Run the folder-standards helper for an affected path and confirm which entry supplied the promotion, whether it was removed or retained, and which canonical and local rules now govern that path.
3. Run any focused tests for helpers or contracts changed with the standard.
4. Treat affected in-session reviewer results and context fingerprints as stale and refresh those reviewers before relying on them. Do not require repository renormalization. Reviewer recalibration is required only when the live calibration request changes, such as when the promotion changes one of its representative rule blocks; unrelated canonical edits do not invalidate calibration.
5. Run `write-standards-guide` in write mode for the current normalized repository so its `STANDARDS.md` records the new canonical and local-overlay hashes. Other normalized repositories refresh automatically during their next standard bootstrap or review preflight.
6. Report the promoted overlay entry and scope, canonical rule IDs preserved or added, whether the local entry was removed, any canonical rule preserved as a possible later removal, validation performed, and any related reviewer-infrastructure work still required. Never stage or commit unless separately requested.
