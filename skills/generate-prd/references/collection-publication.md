# Product document collection publication

Run this collection publisher after the current UI composition pass. The
operational command requires a publication manifest selecting current UX 0.4
and UI 0.4 artifacts, at least one source-bound scene, and a plan that selects
every scene. A partial pass may retain explicit missing-coverage gaps; a scene
still needs visual inspection before it is called a finished comp.

The current publication input is the exact validated PRD context, information
outline, weight assessment, and structure plan. The publisher recomputes the
source index from the context, validates all four bindings and complete
canonical source placement, then renders without an agent. A source or plan
change requires a new preview and publication. It does not convert old context
schemas or invent missing UX, UI, or product facts.

The structure plan supplies stable document and page IDs. IDs use lowercase
letters, digits, periods, hyphens, or underscores, cannot use Windows device
names, and cannot claim the independently owned `technical` document. Page
`index` is reserved for each document's standalone entry page. Each planned
page is `<document-id>/<page-id>.html`; the document's `index.html` introduces
its audience, scope, terms, behavior, questions, and page links. Every page
links to its document entry and sibling pages. Explicit plan cross-links and
source relations connect related pages and documents. Sources appear in one
canonical group and page, with exact source IDs and relevant linked details.
Proposed or partial sources retain their status. Missing comps remain absent;
the publisher does not synthesize visual evidence.

When a plan selects current UI scenes or render requests, the context must
contain their bound rich publication package. The existing UI renderer
validates and renders the supplied scene, local image resources, and full-size
comp outputs. The collection embeds each selected scene as native markup near
its owning content, copies the rich renderer's supporting pages and assets
into that document, and offers a separate full-size link. It does not
use an iframe or read arbitrary asset paths. Each document receipt records
the context, outline, weights, and plan hashes, all emitted file paths and
byte hashes, and selected resource descriptors.

`--preview` creates a **new** directory beneath `product/<name>/`. It contains
the planned document directories, a collection entry page, per-document
receipts, and a preview receipt covering every generated file. It does not
replace the current documents. Inspect this output before publishing.

`--output` names the shared `documents/<name>` root. Publication recognizes
and validates receipt-owned product document directories before changing them.
It may also retire the former combined `prd/` only when that directory's
existing generate-prd receipt and every file validate. It stages all new
documents, backs up owned product directories, installs the new set, and
restores the backups if the operation fails before completion. It refuses an
unowned collision or modified owned output. It never claims or removes
`technical/` or another unowned sibling. Publication does not replace the
shared root itself. Run one writer for a product at a time.

A hard process interruption can leave hidden `.generate-prd-` stage or backup
directories. A later run fails closed until those directories are inspected
and reconciled; it does not guess which version should win. Receipts are
integrity records, not proof of authorship. Generated HTML should be changed
through current source artifacts or a revised plan and republished.
