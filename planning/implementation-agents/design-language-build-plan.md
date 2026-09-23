# Design-language and publication maintenance plan

Status: structured design refinement and compact/full static HTML PRD
publication are implemented. This document replaces the earlier HTML slice list.

## Current ownership

- refine-design interprets product intent and persists accepted, partial, and
  locked design decisions with exact upstream bindings.
- UX and UX review establish behavior before UI composition.
- The UI designer returns structured visual foundations, surface compositions,
  or focused component proposals; the parent validates and persists them.
- generate-prd consumes a frozen PRD context. A publication manifest selects the
  full site; absence of that manifest selects the compact product-model review.
- Bounded renderers in refinement support inspection. Final publication is a
  separate workflow and does not conduct research or make design decisions.

Current versions are product model/context 1.0; UX, UX review, UI composition,
and component design 0.2; design language 0.14; and review layout 7. The
[skill contract](../../skills/refine-design/SKILL.md#greenfield-artifact-policy)
is authoritative if these versions change.

## Maintained behavior

The full publication can include requirements, visual foundations, standard
components, surface and component comps, local fonts/media, and diagnostics.
Clean and annotated views derive from the same structured decisions. Partial
inputs expose gaps; unsupported components remain explicit placeholders.

Keep component research, template identity, parameter/state coverage,
accessibility intent, upstream UX change requests, and promotion candidates
separate from claims of implemented product behavior. Shared-library promotion
requires a separate authorized repository change.

Persist product data under product/<name>/ in the product repository. Keep
real product decisions and evaluation evidence out of reusable skill defaults.

## Verification and remaining work

Preserve deterministic rendering, contained resources, exact dependency hashes,
locks, output ownership, failure recovery, and unchanged-output replay tests.
The [evaluation summary](../../skills/refine-design/references/mvp-evaluation.md)
distinguishes reusable regression tests from live agent or usability evidence.
No retained test fixture proves fresh-agent convergence or reviewer quality.

New renderer capabilities need a demonstrated reusable requirement and current
schema/renderer tests. Interactive prototypes, live component-library
integration, and additional publication formats are not implied by static HTML
support. Implementation planning and coding remain separate deferred work in
the [pipeline plan](product-model-pipeline-plan.md).

See [rendering architecture](ui-rendering-design.md),
[handoff formats](ui-pipeline-format.md), and the
[publishing guide](../../docs/generate-prd.md).
