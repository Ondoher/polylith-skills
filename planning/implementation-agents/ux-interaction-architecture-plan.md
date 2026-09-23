# UX interaction architecture maintenance plan

Status: the structured interaction architecture and review contracts are
implemented. UX, UX review, UI composition, and component design use schema 0.2.

## Current design

UX defines tasks, actions, canonical and alternate interactions, states,
feedback, recovery, interaction frames, regions, content, and affordances.
Pruning records why each retained action is necessary. Transient surfaces
record invocation, dismissal, focus, and return behavior.

The independent UX review binds its verdict to the exact product-description
and UX bytes and requested scope. Blocking findings map to explicit criteria
and records. The parent validates the receipt before dependent UI work. A
valid receipt is not usability certification or proof of reviewer independence.

UI maps visual nodes back to UX records. Behavior-changing ideas return as
upstream requests rather than unbound controls. Material comparison and impact
analysis distinguish changed behavior from explanatory prose and invalidate
only affected dependencies.

## Evidence retained here

Synthetic fixtures and sanitized regression cases exercise schema validity,
material equivalence, coherent/cluttered review receipts, hash binding, and
failure behavior. Their descriptions and expectations are test data.
Historical prompts, actor identities, product outputs, and fresh-agent run
archives are not retained in this repository. Earlier claims about their byte
counts, provenance, and product holdout outcomes are not current evidence.

See the [evaluation summary](../../skills/refine-design/references/mvp-evaluation.md)
and [sanitized fixtures](../../skills/refine-design/references/fixtures/ux-regression/README.md).

## Future evaluation

When evaluating live quality, use fresh bounded assignments across unrelated
products, inspect independence and supplied context, and retain exact evidence
in the owning product repository under product/<name>/evaluations/. Record
limits and available cost/latency rather than inferring them. Generalize a
product finding only after validating the underlying reusable principle.

Research generation and source verification remain distinct. Missing evidence
stays explicit, locked decisions remain protected, and semantic tests do not
replace browser, accessibility, or user evaluation.

The [UX/UI format](ui-pipeline-format.md) describes the
maintained handoff.
