# UI Designer Review

UI review is an independent qualitative check after schema validation and before a comp is treated as implementation guidance. It does not replace UX review, source validation, accessibility testing, or view-code review.

## Structural Gate

The parent first validates schema 0.2. Review stops on invalid source identities, dangling references, unbound or duplicate affordances, action mismatches, deferred affordances in complete scenes, unsafe output paths, or nondeterministic publication. These are contract failures rather than matters of taste.

## Qualitative Review

Review the clean and annotated renderings plus their exact UX frame and design-language sources. Check:

- The visual hierarchy makes the primary task and current state apparent.
- Required information is present once, without permanent prose that merely restates visible state.
- Controls correspond to UX affordances, labels fit, and repeated ways to invoke one action are justified.
- Spacing, typography, alignment, density, and grouping follow the design language and remain coherent at the declared viewport.
- Content expansion, overflow, focus order, accessible names, non-color cues, target size, and visible focus have usable treatments.
- Placeholders and partial scenes are labeled honestly; wireframes are not called comps.
- Unfamiliar patterns have bounded evidence and do not copy another product's trade dress.

Return `pass` only when the artifact is credible implementation guidance for its stated scope. Return `revise` with blocking findings tied to stable scene/node IDs when hierarchy, clutter, fit, interaction communication, or accessibility presentation is materially deficient. Advisory findings may suggest polish that does not block the current scope.

## Authority Boundary

The reviewer may identify a behavior problem but cannot revise UX or authorize a new control. Route that finding through `uxChangeRequests`. Review does not reject a faithful UI simply because the reviewer prefers a different workflow.

Shared review criteria and examples remain product-neutral. Holdout results do not become reusable rules unless the finding is restated without product vocabulary and confirmed on unrelated cases.
