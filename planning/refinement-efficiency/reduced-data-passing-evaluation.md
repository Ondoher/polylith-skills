# Evaluation of reduced data passing

Recorded 2026-09-27. Scope: assess expansion of compact authoring and deterministic
conversion separately from the proposed granular monitoring and interruption work.
No production format, role instruction or live product data was changed. No new
agent run was commissioned.

**Recommendation: pursue compact authoring selectively, with explicit contracts
for the high-volume records. The flow trial warrants further use, but a generic
format conversion does not reproduce its savings across the whole pipeline.**

Follow-up [exact-repetition analysis](repetition-evaluation.md) found 671 extra
copies of long UX text values. A lossless shared-text probe saved 17.4% of canonical
UX bytes after reference overhead, while UI long-text savings were negligible.
These overlap the reductions below and must not be added. Actual UI part reuse is
also limited: only one of the 15 saved parts serves multiple scenes.

## Evidence

The [matched flow trial](authoring-format-comparison.md) measured 46.4% fewer
writing-response output tokens and 39.9% shorter time to file delivery. Its
tabular representation was 22.4% smaller than minified canonical JSON. That remains
the only measured authoring-speed comparison. It combined repeated-key removal,
explicit shared defaults and different syntax; it did not isolate a separator.

This evaluation reused the saved Alexa UX and UI schema 0.4 artifacts. Existing
`DesignAssembly.importUx` and `importUi` produced the current bounded records,
including their existing shared metadata, parts and scene references. The local
probe then tried a deliberately simple generic reduction: for arrays of objects
with identical field sets and order, emit one header, explicit identical-value
defaults and rows of values. Nested values remain JSON; heterogeneous arrays and
single objects retain their existing shape. Count the headers/defaults and use
the table only when its serialized bytes are smaller.

This is a lossless size probe, not a proposed production protocol. It neither
shortens prose or identifiers nor omits fields. Automatic packing of known data
does not establish how reliably or quickly an agent would author that encoding.

| Existing record kind                 |  Count | Minified bytes | Probe bytes | Reduction |
| ------------------------------------ | -----: | -------------: | ----------: | --------: |
| UX shared context                    |      1 |         45,863 |      40,478 |     11.7% |
| UX interaction elements and catalogs |      4 |        254,289 |     223,610 |     12.1% |
| UX flows                             |     11 |         85,922 |      82,556 |      3.9% |
| **UX total**                         | **16** |    **386,074** | **346,644** | **10.2%** |
| UI shared context                    |      1 |         27,147 |      24,565 |      9.5% |
| UI parts                             |     15 |         74,593 |      68,492 |      8.2% |
| UI scenes                            |     16 |         19,312 |      19,203 |      0.6% |
| **UI total**                         | **32** |    **121,052** | **112,260** |  **7.3%** |

These are UTF-8 bytes of minified per-record JSON, excluding file whitespace.
They are not token or timing measurements. All 48 decoded records exactly match
their originals, and existing assembly reconstructs both complete source artifacts
exactly, with zero assembly issues. Equality does not constitute a new design review.

The generic probe's flow result is smaller than the tailored trial's byte reduction
because the probe retains heterogeneous steps and their nested field names. The
trial used explicit flow/step/alternate columns and supplied shared metadata outside
the rows. This difference demonstrates why a single automatic table conversion is
not an adequate substitute for evaluating the actual authoring contract.

## Where the remaining data is

UX elements account for about 66% of the current UX record bytes; flows account for
22%. In canonical UX, actions contain 109,358 bytes and interaction frames 96,164,
compared with 84,972 for flows. A flow-only optimization leaves the largest
collections untouched. Within the existing packed catalogs, the generic probe
reduced actions by 10.8%, frames by 12.2%, and feedback by 21.9%.

UI parts account for about 62% of UI record bytes. Scenes already refer to parts
and changes instead of storing expanded copies. Shared UI context includes 14,858
bytes of `unspecifiedRequirements` and 5,412 bytes of templates. Field headings
alone cannot remove the content in those records. Whether requirements prose can
be shared or made more concise needs separate semantic evaluation.

Delivery envelopes outside `data` total only 1,206 bytes for UX (0.3%) and 2,202
bytes for UI (1.8%). Removing kind/ID/dependency wrappers is a small opportunity
and risks making delivery harder to identify. Keep those identities script-owned.

String values occupy about 72% of minified canonical UX and 52% of UI. These include
prose, identifiers, references, enums and repeated values; they are not all unique
or irreducible. Meaningful additional reductions may require explicit reuse of
common values and patterns, rather than only removing JSON field names.

## Assessment by boundary

| Boundary                                          | Assessment                                                                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Author to proposal file                           | Demonstrated benefit for one flow. Highest-confidence place to reduce generated output.                                                                                   |
| Proposal to canonical store                       | Deterministic conversion fits before existing delivery/validation. Scripts should expand once without another model reproducing JSON.                                     |
| Saved UX to UI or reviewer                        | Paths avoid copying into chat, but consumers still read the needed content. Existing dependency-scoped handoffs help; the trial did not measure reduced consumer reading. |
| UI author to parts/scenes                         | Existing reuse is valuable. Target part/node structure and repeated template/default values; keep scene-specific behavior bindings explicit.                              |
| Canonical data to product/technical documentation | Preserve canonical meaning and stable references. Compact transport does not need to change document organization or stored schemas.                                      |

The intended speed benefit comes from authoring fewer tokens. Compressing a file
after the model has already generated the complete JSON cannot recover that
generation time. Similarly, expanding a compact payload and asking a second agent
to reproduce the expanded document would lose part of the benefit.

## What consistent expansion should require

Use one versioned delivery mechanism with small type-specific mappings. Start with
the tested local-flow representation, then address action/frame catalogs and UI
parts because they dominate the saved data. Keep compact JSON for structures where
tables add complexity or produce negligible savings. Consistency requires a shared
contract, not one physical representation for every kind of information.

The current flow prototype is not sufficient for production: its supplied actor
and metadata apply to the saved example, and it supports only a subset of allowed
step fields. A generalized mapping must preserve optional targets, per-record
metadata, varying actors, empty versus absent values, escaped text and references.
Do not silently drop unfamiliar fields or invent defaults. Missing and conflicting
meaning remains a repair issue against the affected data.

Retain atomic files, stable IDs, existing revision checks and reuse of completed
units. Explicitly align UX/UI instructions with the selected proposal formats;
their current JSON-only proposal wording would otherwise conflict. Keep canonical
validation and independent review intact. No new assembly-agent role is needed for
mechanical conversion.

Before adopting each mapping, use saved representative records to verify exact
round trips, defaults and exceptions. Only a matched author trial or an ordinary
measured refinement can establish token, latency and correction costs for that
record type. This evaluation does not project the earlier 40% timing reduction
onto the full UX/UI workload and does not start the separate monitoring work.

## Reproducibility

[Metrics](reduced-data-passing-evaluation-metrics.json) retain source paths/hashes,
record counts, collection sizes, exact-reconstruction checks and the probe hash.
The disposable script is retained at
`.codex-tmp/reduced-passing-evaluation-20260927/evaluate.mjs`. The metrics contain
no product payloads. Inputs were read only, production code was unchanged, and
verification used exact reconstruction rather than a fresh paid design run.
