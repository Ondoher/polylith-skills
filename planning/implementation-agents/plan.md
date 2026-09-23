# Implementation workflow roadmap

Status: design refinement and publication are implemented. Implementation planning
and coordinated coding remain deferred until the owner resumes them.

## Current baseline

- The installed catalog contains refine-design, reset-design, generate-prd,
  scaffolding, standards maintenance, review, and publishing workflows.
- Product design uses canonical models, specialty artifacts, snapshots, and PRD
  contexts under the owning repository's product/<name>/ folder.
- UX, UX review, UI, system architecture, and REMVC specialties have read-only
  planning or assessment contracts. Installed assessment roles do not authorize
  production-writing modes.
- Standards review remains the compliance authority, with primary/audit evidence,
  calibration, folder mappings, context refresh, and completion gates.
- No implementation-planning skill or coding orchestrator is in governance.json.

See the [skill catalog](../../README.md#installed-skills),
[product-design guide](../../docs/product-design.md), and
[review guide](../../docs/review-agents.md) for current operation.

## Remaining decisions and work

1. Extend the [product context pipeline](product-model-pipeline-plan.md) beyond
   the currently supported PRD consumer. Define technical-documentation and
   implementation-planning views before exposing them as working consumers.
2. Finalize the [implementation-planning skill](implementation-planning-skill.md):
   deliverable format, lifecycle, readiness, update behavior, and frozen handoff.
3. Review production-mode responsibilities for the Polylith architect, model,
   controller, and view specialties. Preserve canonical standards traceability.
4. Resolve private collaborator construction and test substitution before
   adopting a convention. The original external examples are not an authority.
5. Define independent unit/service-integration and UI test roles, including
   their authoring boundaries and use of each repository's existing test flow.
6. Finalize the coding orchestrator's assignments, disjoint file ownership,
   dependency sequencing, cancellation, stale results, correction limits,
   question routing, and handoff to the existing review workflow.
7. Decide repository opt-in syntax, disabled-state behavior, allowed roles, and
   its relationship to standard and instructions-only bootstrap.
8. Run an authorized bounded pilot and compare outcomes and cost against a
   comparable single-agent workflow before routine deployment.

The [detailed design](design.md) retains responsibility boundaries, contracts,
and proposed execution flows. These are design requirements for future work,
not instructions to start implementing during ordinary design refinement.

## Evaluation requirements

Use synthetic, unrelated products for reusable tests. Keep real product inputs,
agent outputs, and evaluation evidence in the owning product repository.
Sanitized fixtures can test schemas, binding, material equivalence, and failure
behavior; they cannot demonstrate fresh-agent independence or live quality.

Evaluate small tasks as well as cross-specialty changes. Record observable
acceptance, meaningful tests, review findings, corrective work, and available
latency or usage. Missing measurements remain unknown. Do not claim savings,
readiness, or compliance from a successful schema check alone.

## Deferred options

- A read-only installation profile needs explicit scope and enforceable tool
  restrictions; it is not an implemented installer option.
- Claude Code and GitHub Copilot adapters are deferred until the full feature
  set is complete.
- Calibration provenance and its validation limits need a separate deep dive.
