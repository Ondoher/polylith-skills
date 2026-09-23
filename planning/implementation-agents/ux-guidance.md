# UX Guidance

Status: compact general guidance for the installed read-only [UX planner](ux-planner.md) and independent [UX reviewer](ux-reviewer.md). Guidance changes do not activate coding workflows. Domain-specific evidence is loaded only when the assigned question needs it.

## Purpose And Authority

This is the reusable UX reference linked from the [coding guidance catalog](coding-guidance.md). The [agent design](design.md#ux-planning-agent) owns execution boundaries and product decision authority. Canonical standards and applicable overlays continue to govern engineering requirements.

Product-owner domain knowledge, requirements, terminology, constraints, and specific interaction ideas are primary inputs. Detailed screen designs are not prerequisites. Distinguish facts, fixed requirements, preferences, and assumptions; do not silently reinterpret them.

Use the principles below as questions rather than automatic verdicts. Explain consequential refinements with evidence, applicability, tradeoffs, and uncertainty. General guidance does not automatically outweigh domain expertise. Keep accepted product intent in the human-owned description and structured UX artifact; keep product hypotheses out of global rules.

## Compact Planning Principles

These are planning summaries of the cited sources. They do not prove that a particular layout works.

1. **Understand the task before detailing the interface.** Identify intended users, real work, and observable success; evaluate representative tasks and revise. [Gould and Lewis](https://research.ibm.com/publications/designing-for-usability-key-principles-and-what-designers-think--1).
2. **Use the user's concepts.** Organize labels and actions around familiar domain meanings and keep equivalent interactions consistent. Familiarity must be checked with intended users rather than assumed. [Nielsen, heuristics 2 and 4](https://www.nngroup.com/articles/ten-usability-heuristics/).
3. **Make state and results apparent.** Give feedback proportionate to the action and distinguish work in progress from completion. [Shneiderman, rules 3 and 4](https://www.cs.umd.edu/~ben/goldenrules.html).
4. **Support correction and user control.** Plan constructive recovery and preserve unaffected work where intended. Irreversible effects need honest consequences; universal undo cannot be promised. [Shneiderman, rules 5-7](https://www.cs.umd.edu/~ben/goldenrules.html).
5. **Reduce remembering and irrelevant detail.** Keep needed context available and remove distraction without hiding task-critical or expert information. Sparse is not automatically better. [Nielsen, heuristics 6 and 8](https://www.nngroup.com/articles/ten-usability-heuristics/).
6. **Support learning and practiced use.** Combine understandable paths with efficient expert operation when the audience benefits. [Shneiderman, rule 2](https://www.cs.umd.edu/~ben/goldenrules.html).
7. **Keep the accessibility baseline.** Ordinary controls use semantic/native behavior, keyboard operation, and visible focus. Favor readily available accessibility when alternatives are otherwise comparable. Broader specialized equivalents follow actual scope and applicable requirements; this distinction never waives a standard or conformance target. See [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [dragging alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements#relationship-to-keyboard-accessibility-requirements).
8. **Resolve consequential uncertainty through use.** When alternatives matter, propose a bounded prototype exercise with intended users doing realistic work. An agent inspection is not user testing. [Gould and Lewis](https://research.ibm.com/publications/designing-for-usability-key-principles-and-what-designers-think--1).

## Required Interaction-Architecture Procedure

This is an operational procedure, not a universal screen recipe.

**Research before invention.** Research typical patterns before choosing an unfamiliar capability, app-specific complex interaction, interaction without a readily established precedent, or question with materially conflicting conventions. Follow the [shared research guidance](research-guidance.md). A shared product-pattern claim needs two independent product sources unless a directly applicable normative or platform source is sufficient. Record trigger, queries, sources and access dates, compared patterns, applicability, tradeoffs, limits, affected records, and selection in `patternResearch`. If no useful precedent is found, use outcome `no-suitable-precedent`, select conservatively, state `selection.uncertainty`, and propose a realistic task exercise. The planner reports verification as pending; the parent alone records `source-checked`. Familiar interactions need no ceremonial research.

**Model the task before controls.** Every visible action has `taskRefs` and an outcome trace. Record `canonicalInteraction.method`, `canonicalInteraction.input`, `canonicalInteraction.description`, alternate inputs, `presentationClass`, `visibility.mode`, `visibility.conditions`, persistence, priority, `applicableStates`, feedback, cancellation, and recovery. Actions and frames declare `patternBasis` with `kind`, `rationale`, and conditional `researchRef`. Alternate inputs invoke the same action. Semantic `interactionFrames` use `taskRefs`, stable region and affordance IDs, and transitions to express priority, task order, state, direct manipulation, contextual actions, transients, and focus intent without pixel geometry or framework components. When a technical fact materially helps the user decide or act, content kind `technical-information` records that fact and a `technicalExplanation` of its user-facing need; otherwise omit it.

**Prune before handoff.** Walk every primary task from entry to observable outcome. Keep one clear canonical route, merge equivalent persistent affordances, demote infrequent or contextual operations, and remove explanation that only restates visible state. Preserve repeated access justified by context, accessibility, urgency, safety, or expert efficiency. Record material decisions and intentional repetition in `pruningReview`. This does not set a universal action count or exact arrangement.

**Review semantics independently.** Structural validation checks references and deterministic invariants. A fresh UX reviewer judges task coherence, information hierarchy, action economy and discoverability, state clarity, feedback and recovery, accessibility implications, research support, and UI-handoff readiness. Schema validity alone does not establish usability.

## Evidence Types And Limits

- **Gould and Lewis (1985):** original research publication supporting user focus, empirical evaluation, and iteration; no quantitative claim is adopted here.
- **Nielsen's usability heuristics:** original-author heuristic synthesis useful for inspection, not proof of product fit.
- **Shneiderman's Golden Rules:** author-hosted design synthesis that calls for domain validation and tuning.
- **WCAG 2.2:** normative accessibility specification; conformance does not establish overall usability.

Empirical findings, heuristics, normative requirements, source observations, and product hypotheses carry different authority. Cite only evidence material to the decision and state its applicability limits.

## Planning Handoff

Standalone work may stop at recommendations, candidate workflows, and prioritized questions. For a bounded handoff, translate requirements into tasks, surfaces, actions, semantic frames, states, feedback, recovery, research evidence, pruning decisions, and observable criteria. Send architecture the agreed behavior and constraints rather than the source library. Send UI accepted action/frame references while leaving visual realization to UI.

Keep this reference compact. Add guidance only when it changes reusable planning decisions, and never promote a product-specific preference into a global rule.
