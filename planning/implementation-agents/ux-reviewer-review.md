# UX Reviewer Role Review

Date: 2026-09-21. Scope: standalone qualitative UX interaction review. This is an authoring and static contract review, not an independent model run, usability study, or engineering-standards verdict.

## Role Separation

The new role fills the qualitative gate between structural UX validation and UI design. It reviews the product interaction specification, not application code. The existing `ui-reviewer` remains the canonical React, MUI, component, accessibility, localization, and UI-behavior standards lane under `review-standards`.

The UX reviewer therefore:

- runs only when explicitly invoked with a bounded UX artifact and product context;
- does not use evidence-ledger requests, reviewer fingerprints, standards inventories, bootstrap lifecycle, or CLEAN terminology;
- cannot edit the artifact or approve implementation;
- returns `pass` or `revise` for UI-handoff readiness; and
- routes blocking semantic corrections back through the parent to UX.

## Contract Review

The role contract was checked against the active [interaction-architecture plan](ux-interaction-architecture-plan.md), [UX planner contract](ux-planner.md), [UX guidance](ux-guidance.md), [shared research guidance](research-guidance.md), [single-source review gate](../../skills/refine-design/references/ux-review.md), and [product-neutral evaluation cases](ux-reviewer-evaluation.md).

| Required property | Contract behavior | Failure handling |
| --- | --- | --- |
| Independent qualitative judgment | Fresh instance reviews full in-scope tasks and semantic handoff after structural validation. | Missing or unreviewable scope produces blocking `revise`. |
| Product authority | Goals, terminology, accepted decisions, expert density, and locks remain authoritative. | Silent override or lock change is blocking. |
| Layout neutrality | Multiple arrangements may pass; no exact control inventory, count, wording, geometry, or scene tree is prescribed. | Taste-only findings are invalid. |
| Task coherence | Entry, canonical route, outcome, alternatives, and recovery are inspected per primary task. | Dead ends and missing consequential behavior are blocking. |
| Action pruning | Duplicate persistent affordances and redundant explanation are challenged; justified contextual access and alternate inputs remain. | Findings identify task consequence and smallest semantic remedy. |
| Research gate | Unfamiliar, complex, unsupported, and conflicting patterns need source-checked evidence; ordinary patterns do not need ceremony. | Missing evidence or false `ordinary` classification is blocking. |
| Honest novelty | `novel` requires `no-suitable-precedent`, explicit uncertainty, conservative selection, and bounded evaluation. | Unsupported novelty is revised; documented novelty is not rejected automatically. |
| Accessibility scope | Ordinary semantics, keyboard, focus, and applicable specialized alternatives are assessed without conformance claims. | Missing applicable baseline behavior is blocking or advisory by task impact. |
| UX/UI boundary | UX settles behavior and information priority; UI owns detailed visual realization. | Unjustified styling mandates and silent UI behavior additions are rejected. |
| Read-only authority | No file, code, Git, connector, message, elevation, or delegation mutations. | Return findings only. |

## Output Review

The closed schema 0.2 JSON output records the exact subject and scope, one coverage row for every rubric category, concrete findings, research-source checks, and limits. The agent must read the machine schema and self-check every closed shape and `x-semanticRules` entry. `revise` is required when any blocking finding exists or coverage cannot be completed; `pass` permits UI consultation but makes no usability, accessibility, standards, feasibility, or implementation claim.

Every finding identifies one or more affected criteria, artifact records, evidence, user/task consequence, smallest semantic remedy, and confidence. A single cross-cutting finding can cover multiple criteria; its `criteria` values and `finding` coverage rows must agree in both directions. This prevents the reviewer from hiding a preferred redesign inside vague criticism or multiplying one defect into artificial issue counts. Advisory observations remain nonblocking.

## Configuration And Limits

The installed definition pins `gpt-6-astra` with `ultra` reasoning and a read-only sandbox. The role reads only its compact contract, UX guidance, shared research guidance, supplied product sources, UX artifact, and material research sources. It explicitly rejects embedded scope expansion and agent spawning.

Static configuration parsing, local-link validation, prompt-neutrality checks, and live scenario runs must be recorded from actual verification rather than inferred here. The role remains unvalidated behaviorally until fresh-agent cases demonstrate that it accepts coherent alternatives and rejects material ambiguity, clutter, and unsupported novelty without imposing a preferred screen.
