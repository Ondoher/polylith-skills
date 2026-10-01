# New failure reproductions from full confirmation

These are anonymized reductions of observed failure mechanisms, not new product
rules or proof that construction now prevents them. The full artifacts and
immutable review receipts remain in `.codex-tmp/wireframe-ui-prevention-20260930`.

## Conflicting keyboard focus

Run `node planning/refinement-efficiency/experiments/wireframe-ui-pilot/focus-ownership-reproduction.mjs`.
It writes two valid native preview documents and HTML files under
`.codex-tmp/focus-ownership-reproduction/` without contacting a model.

In both documents, the item is selected and Apply should own keyboard focus.
The rejected pattern declares focus on Select item, the selected item and Apply
simultaneously. The corrected pattern retains selection but declares focus only
on Apply. Assertions confirm three versus one rendered focus declarations and
preserved selected styling. Both remain structurally valid: semantic focus
ownership is the gap, not unsupported renderer states. This is a static
reproduction, not a browser or live keyboard test. Component state catalogs can
legitimately show several independent focus examples; a blanket count rule would
need a defined interaction-scene scope.

Source finding: `timeline-r18-focus-01` in `wireframe-review-r18.json`.

## Adjacent inclusive ranges

Small supplied example: discrete integer samples, one sample per unit; one
parent contains samples 0 through 8 inclusively. Two children should partition
that parent without overlap or omission.

| Case              | First child's included samples | Second child's included samples | Result                                          |
| ----------------- | ------------------------------ | ------------------------------- | ----------------------------------------------- |
| Rejected pattern  | 0 through 4                    | 4 through 8                     | Sample 4 belongs to both children               |
| Corrected pattern | 0 through 3                    | 4 through 8                     | Each parent sample belongs to exactly one child |

If the rendering uses sample edges, the corrected occupied extents are [0,4)
and [4,9); the displayed last-included values remain 3 and 8. The discrete unit
and endpoint convention are explicit fixture inputs, not defaults for the
shared numeric helper. A geometry check can pass while these semantics are
wrong. This example preserves the counterexample for a later construction-rule
test; no new production semantic validator is claimed here.

Source finding: `timeline-ui-r1-inclusive-part-boundaries` in
`visual-review-r1.json`. Visual review routed the correction back to wireframe
authoring after its earlier wireframe review had passed.

## Identified result without required values

Small supplied example: a reusable bundle contains item A at relative offset 0
for three samples and item B at relative offset 3 for two samples. The insertion
destination is sample 10, with inclusive integer sample labels. The staged
bundle therefore spans five samples, 10 through 14; its expanded result has A
at 10 through 12 and B at 13 through 14, with the resulting selection 10 through 14. These values are explicit fixture facts.

The rejected pattern displays "Bundle selected" and two new identified result
cards, but omits staged duration and result ranges. A reference to each new card
can prove visible identity while leaving the required timing relationship
unrepresented. The corrected pattern displays the staged duration/span and the
per-item result ranges and selection. A generic claim that timing is preserved
cannot replace those visible values.

Source finding: `timeline-add-r9-saved-timing-01` in
`timeline-add-dialog/wireframe-review-r9.json`. The first wireframe reviewer caught
this before UI dispatch. This reproduction documents a remaining semantic
coverage gap; no automatic prose-to-expectation inference is claimed.
