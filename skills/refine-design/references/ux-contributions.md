# Incremental UX authoring

Use when the assignment grants `units.status`, `units.contribute`, and
`units.finish`. These are operations on the existing workflow MCP service.
Inspect their assigned catalog once and call through `workflow_execute` with
your assignment capability. The parent opens and seeds the bound UX store.
This route replaces complete-unit JSON delivery; UX meaning, provenance, locks,
research, and review requirements are unchanged.

## Author once and save useful decisions

Read the assigned current facts and baseline UX. Use the supplied `units.status`
result, or obtain it once for assigned references, to get opaque revisions and
record IDs. Keep existing data unchanged unless new meaning requires an edit.
Save nearby ready decisions in a batch at a natural stopping point. Do not pause
reasoning for every field, wait for the entire product, or introduce a compressed
notation that costs more thought than it saves.

Each batch names `stage: "ux"`, a unique `batchId`, `base` revisions for its
affected units, and `changes`. Copy revisions from the supplied status or last
receipt; do not compute them. Use `null` for a new unit. An exact retry with the
same batch ID reuses its receipt. Corrections use a new ID and current revisions.
Small operation results are returned in the tool receipt's `inline` field as
well as saved behind its handle. Use that inline receipt directly; do not read
the handle again merely to recover revisions. If `inline` is absent, read the
saved result using the existing bounded-read contract.

For example, an alternate outcome correction is:

```json
{
  "stage": "ux",
  "batchId": "resume-outcome",
  "base": { "flow:edit-video": "revision-from-receipt" },
  "changes": [{
    "unit": "flow:edit-video",
    "op": "set",
    "target": [{ "collection": "alternates", "id": "resume-follow" }],
    "fields": { "outcome": "Bring the resolved playhead into view and resume following." }
  }]
}
```

## Targets and operations

Units are `context:document`, `element:<existing-or-assigned-id>`, or
`flow:<existing-or-assigned-id>`. Every affected unit must be assigned.

- Omit `target` to edit flow metadata or context document fields. The context
  contains source/model bindings, features, questions, research and realizations.
- An element target starts with a named catalog: `surfaces`, `components`,
  `actions`, `interactionFrames`, `states`, or `feedback`.
- Each target selector identifies an item by `collection` and stable `id`.
  Additional selectors descend into identified records, such as an interaction
  frame's `regions`, then its `affordances`; or an alternate's `steps`.
  There are no positional indices or arbitrary JSON paths.
- `set` supplies `fields` using canonical UX field names. Supplied nested objects
  merge; omitted fields are retained. Supplied arrays replace those arrays.
  A missing ID-selected record is created partially. Use selectors to avoid
  resending unchanged arrays of identified records. `unset` explicitly removes
  named fields; identities cannot be renamed.
- Optional `before` on `set` inserts/moves the selected record before a sibling
  ID. `before: null` means first. New records otherwise append.
- `remove` deletes the ID-selected record. It does not silently remove references
  elsewhere; supply the associated changes or leave an explicit repair need.
- `order` names a `collection` at the selected parent and supplies `ids` in order,
  naming every current member exactly once. This is flow/content order, not
  publication numbering.
- `catalog-order` on `context:document` changes an imported document catalog's
  saved order (`collection`, `ids`). Use only when that order actually changes;
  this metadata never requires a complete context rewrite.

## Receipts and completion

All changes to the same unit in one batch succeed together or remain unapplied.
Valid independent unit groups are retained when another group fails. Inspect
`accepted` and `issues`; preserve accepted revisions. Related changes spanning
units can remain pending until their counterparts arrive. No receipt claims
that partial records are complete or semantically approved.
Rejected groups remain in the durable journal with their input and reason for
targeted recovery; they are never replayed as accepted edits.

Unknown fields and malformed supplied values produce targeted repair notices.
Required fields and cross-references may be supplied later. Keep contributing
independent work; do not regenerate accepted batches. If a turn is interrupted,
use the saved receipts/status and continue where it stopped.

Call `units.finish` with the assigned references once their first proposal is
delivered. Code expands metadata, packs catalogs, saves existing authoring units,
and reports structural/reference problems. Return that result handle and status;
do not write a final combined JSON document. `needs-repair` retains the units and
identifies the problem. In a first-round experiment, stop at this receipt and
report defects; do not begin a review or repair round. Canonical promotion and
semantic approval remain parent-owned.
